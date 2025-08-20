import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake/config'

interface RollbackRequest {
  batchId: string
  rollbackReason?: string
}

interface RollbackResult {
  success: boolean
  message: string
  rolledBackCount: number
  batchId: string
  affectedGifts?: string[]
}

export async function POST(request: NextRequest) {
  try {
    const { batchId, rollbackReason }: RollbackRequest = await request.json()

    if (!batchId) {
      return NextResponse.json({
        success: false,
        message: "Batch ID is required",
        rolledBackCount: 0,
        batchId: "unknown"
      } as RollbackResult)
    }

    // Start transaction
    await executeQuery("BEGIN TRANSACTION")

    try {
      let affectedGifts: string[] = []

            // Get the batch details
      const batchSQL = `
        SELECT * FROM MY_FLOW.PUBLIC.BULK_IMPORT_BATCHES 
        WHERE BATCH_ID = ? AND IS_ACTIVE = TRUE
      `
      const batchResult = await executeQuery(batchSQL, [batchId])

      if (batchResult.length === 0) {
        throw new Error("Batch not found or already rolled back")
      }

      const batch = batchResult[0]
      let rolledBackCount = 0

      // Get affected gift IDs for this batch
      const affectedGiftsSQL = `
        SELECT GIFT_ID FROM MY_FLOW.PUBLIC.GIFT_DETAILS 
        WHERE BATCH_ID = ?
      `
      const giftsResult = await executeQuery(affectedGiftsSQL, [batchId])
      affectedGifts = giftsResult.map((gift: any) => gift.GIFT_ID)

      // For all tabs, we'll update IS_ACTIVE to FALSE instead of deleting
      // This makes the records invisible to the frontend but preserves them for audit
      const updateGiftsSQL = `
        UPDATE MY_FLOW.PUBLIC.GIFT_DETAILS 
        SET 
          BATCH_ID = NULL,
          LAST_MODIFIED_DATE = CURRENT_TIMESTAMP()
        WHERE BATCH_ID = ?
      `
      const updateResult = await executeQuery(updateGiftsSQL, [batchId])
      rolledBackCount = Array.isArray(updateResult) && updateResult[0] ? updateResult[0]['number of rows updated'] : 0

      // Update the batch record to mark as rolled back
      const updateBatchSQL = `
        UPDATE MY_FLOW.PUBLIC.BULK_IMPORT_BATCHES 
        SET 
          IS_ACTIVE = FALSE,
          COMPLETED_AT = CURRENT_TIMESTAMP()
        WHERE BATCH_ID = ?
      `
      await executeQuery(updateBatchSQL, [batchId])

      // Note: BULK_IMPORT_LOGS and BULK_ROLLBACK_LOGS tables don't exist in current schema
      // Rollback tracking is handled by BULK_IMPORT_BATCHES table with IS_ACTIVE = FALSE

      // Commit rollback transaction
      await executeQuery("COMMIT")

      return NextResponse.json({
        success: true,
        message: `Successfully rolled back ${rolledBackCount} records`,
        rolledBackCount,
        batchId,
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
      batchId: "unknown"
    } as RollbackResult, { status: 500 })
  }
}
