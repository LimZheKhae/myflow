import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake/config'

interface RollbackRequest {
  transactionId?: string
  batchId?: string
  rollbackReason?: string
}

interface RollbackResult {
  success: boolean
  message: string
  rolledBackCount: number
  transactionId: string
  batchId: string
  rollbackType: 'transaction' | 'batch'
  affectedGifts?: string[]
}

export async function POST(request: NextRequest) {
  try {
    const { transactionId, batchId, rollbackReason }: RollbackRequest = await request.json()

    if (!transactionId && !batchId) {
      return NextResponse.json({
        success: false,
        message: "Either transactionId or batchId is required",
        rolledBackCount: 0,
        transactionId: "unknown",
        batchId: "unknown",
        rollbackType: 'transaction'
      } as RollbackResult)
    }

    // Start transaction
    await executeQuery("BEGIN TRANSACTION")

    try {
      let targetBatchId = batchId
      let targetTransactionId = transactionId
      let rollbackType: 'transaction' | 'batch' = 'transaction'
      let affectedGifts: string[] = []

      // If only transactionId provided, find the batch
      if (!batchId && transactionId) {
        const findBatchSQL = `
          SELECT BATCH_ID FROM MY_FLOW.PUBLIC.BULK_IMPORT_BATCHES 
          WHERE TRANSACTION_ID = ? AND STATUS = 'COMPLETED'
        `
        const batchResult = await executeQuery(findBatchSQL, [transactionId])
        if (batchResult.length > 0) {
          targetBatchId = batchResult[0].BATCH_ID
          rollbackType = 'transaction'
        } else {
          throw new Error("Transaction not found or already rolled back")
        }
             } else if (batchId) {
         targetTransactionId = undefined
         rollbackType = 'batch'
       }

      // Get the batch details
      const batchSQL = `
        SELECT * FROM MY_FLOW.PUBLIC.BULK_IMPORT_BATCHES 
        WHERE BATCH_ID = ? AND STATUS = 'COMPLETED'
      `
      const batchResult = await executeQuery(batchSQL, [targetBatchId])

      if (batchResult.length === 0) {
        throw new Error("Batch not found or already rolled back")
      }

      const batch = batchResult[0]
      let rolledBackCount = 0

      // Get affected gift IDs for this batch
      const affectedGiftsSQL = `
        SELECT ID FROM MY_FLOW.PUBLIC.GIFT_REQUESTS 
        WHERE BATCH_ID = ?
      `
      const giftsResult = await executeQuery(affectedGiftsSQL, [targetBatchId])
      affectedGifts = giftsResult.map((gift: any) => gift.ID)

      // Rollback based on the tab that was imported
      switch (batch.TAB) {
        case "pending":
          // Delete newly created gift requests
          const deletePendingSQL = `
            DELETE FROM MY_FLOW.PUBLIC.GIFT_REQUESTS 
            WHERE BATCH_ID = ? AND WORKFLOW_STATUS = 'KAM_Request'
          `
          const deleteResult = await executeQuery(deletePendingSQL, [targetBatchId])
          rolledBackCount = (deleteResult as any).affectedRows || 0
          break

        case "processing":
          // Revert MKTOps updates
          const revertProcessingSQL = `
            UPDATE MY_FLOW.PUBLIC.GIFT_REQUESTS 
            SET 
              WORKFLOW_STATUS = 'KAM_Request',
              MKTOPS_DISPATCHER = NULL,
              MKTOPS_TRACKING_CODE = NULL,
              MKTOPS_STATUS = NULL,
              TRANSACTION_ID = NULL,
              BATCH_ID = NULL,
              UPLOADED_BY = NULL,
              UPLOADED_AT = NULL
            WHERE BATCH_ID = ?
          `
          const revertResult = await executeQuery(revertProcessingSQL, [targetBatchId])
          rolledBackCount = (revertResult as any).affectedRows || 0
          break

        case "kam-proof":
          // Revert KAM proof updates
          const revertKAMProofSQL = `
            UPDATE MY_FLOW.PUBLIC.GIFT_REQUESTS 
            SET 
              WORKFLOW_STATUS = 'MKTOps_Processing',
              KAM_PROOF_FILE = NULL,
              KAM_RECEIVER_FEEDBACK = NULL,
              KAM_UPLOADED_BY = NULL,
              KAM_UPLOADED_DATE = NULL,
              TRANSACTION_ID = NULL,
              BATCH_ID = NULL,
              UPLOADED_BY = NULL,
              UPLOADED_AT = NULL
            WHERE BATCH_ID = ?
          `
          const revertKAMResult = await executeQuery(revertKAMProofSQL, [targetBatchId])
          rolledBackCount = (revertKAMResult as any).affectedRows || 0
          break

        case "audit":
          // Revert audit updates
          const revertAuditSQL = `
            UPDATE MY_FLOW.PUBLIC.GIFT_REQUESTS 
            SET 
              WORKFLOW_STATUS = 'KAM_Proof',
              SALESOPS_CHECKER_NAME = NULL,
              SALESOPS_REMARK = NULL,
              SALESOPS_CHECKED_DATE = NULL,
              TRANSACTION_ID = NULL,
              BATCH_ID = NULL,
              UPLOADED_BY = NULL,
              UPLOADED_AT = NULL
            WHERE BATCH_ID = ?
          `
          const revertAuditResult = await executeQuery(revertAuditSQL, [targetBatchId])
          rolledBackCount = (revertAuditResult as any).affectedRows || 0
          break

        default:
          throw new Error(`Unsupported tab for rollback: ${batch.TAB}`)
      }

      // Update the batch record to mark as rolled back
      const updateBatchSQL = `
        UPDATE MY_FLOW.PUBLIC.BULK_IMPORT_BATCHES 
        SET 
          STATUS = 'ROLLED_BACK',
          ROLLBACK_DATE = CURRENT_TIMESTAMP(),
          ROLLED_BACK_ROWS = ?,
          ROLLBACK_REASON = ?
        WHERE BATCH_ID = ?
      `
      await executeQuery(updateBatchSQL, [rolledBackCount, rollbackReason || 'Manual rollback', targetBatchId])

      // Update the import log to mark as rolled back
      const updateLogSQL = `
        UPDATE MY_FLOW.PUBLIC.BULK_IMPORT_LOGS 
        SET 
          STATUS = 'ROLLED_BACK',
          ROLLBACK_DATE = CURRENT_TIMESTAMP(),
          ROLLED_BACK_ROWS = ?
        WHERE BATCH_ID = ?
      `
      await executeQuery(updateLogSQL, [rolledBackCount, targetBatchId])

      // Log the rollback action
      const rollbackLogSQL = `
        INSERT INTO MY_FLOW.PUBLIC.BULK_ROLLBACK_LOGS (
          ID, TRANSACTION_ID, BATCH_ID, MODULE, TAB, ROLLED_BACK_BY, ROLLED_BACK_ROWS, 
          ORIGINAL_TOTAL_ROWS, ORIGINAL_SUCCESSFUL_ROWS, ROLLBACK_REASON, CREATED_AT
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP())
      `
      await executeQuery(rollbackLogSQL, [
        `RLB${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        targetTransactionId,
        targetBatchId,
        batch.TAB,
        "system", // This would come from auth context
        rolledBackCount,
        batch.TOTAL_ROWS,
        batch.SUCCESSFUL_ROWS,
        rollbackReason || 'Manual rollback'
      ])

      // Commit rollback transaction
      await executeQuery("COMMIT")

      return NextResponse.json({
        success: true,
        message: `Successfully rolled back ${rolledBackCount} records`,
        rolledBackCount,
        transactionId: targetTransactionId || "unknown",
        batchId: targetBatchId,
        rollbackType,
        affectedGifts
      } as RollbackResult)

    } catch (error) {
      // Rollback the rollback transaction on error
      await executeQuery("ROLLBACK")
      throw error
    }

  } catch (error) {
    console.error('Bulk rollback error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json({
      success: false,
      message: errorMessage || "Bulk rollback failed",
      rolledBackCount: 0,
      transactionId: "unknown",
      batchId: "unknown",
      rollbackType: 'transaction'
    } as RollbackResult, { status: 500 })
  }
}
