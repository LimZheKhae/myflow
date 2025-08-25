import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake/config'
import { debugSQL } from '@/lib/utils'
import { logBulkWorkflowTimeline } from '@/lib/workflow-timeline'
import type { BulkImportResult } from '@/types/gift'

interface BulkImportRequest {
  tab: string
  data: any[]
  uploadedBy: string
  userDisplayName: string
  userId: string
  userRole?: string
  userPermissions?: Record<string, string[]>
  batchName?: string
  description?: string
}

export async function POST(request: NextRequest) {
  try {
    const { tab, data, uploadedBy, userDisplayName, userId, userRole, userPermissions, batchName: requestBatchName, description }: BulkImportRequest = await request.json()

    if (!data || data.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No data provided for import',
        importedCount: 0,
        failedCount: 0,
        batchId: '',
      } as BulkImportResult)
    }

    // Validate required user information
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Invalid user ID format',
        importedCount: 0,
        failedCount: 0,
        batchId: '',
      } as BulkImportResult)
    }

    // Server-side role validation using client-provided data
    if (!userRole) {
      return NextResponse.json({
        success: false,
        message: 'User role is required',
        importedCount: 0,
        failedCount: 0,
        batchId: '',
      } as BulkImportResult)
    }

    // Check if user has KAM or Admin role
    if (!['KAM', 'ADMIN'].includes(userRole)) {
      return NextResponse.json({
        success: false,
        message: 'Insufficient role permissions. Only KAM and Admin users can perform bulk imports.',
        importedCount: 0,
        failedCount: 0,
        batchId: '',
      } as BulkImportResult)
    }

    // Check if user has ADD permission for gift-approval module
    if (!userPermissions || !userPermissions['gift-approval'] || !userPermissions['gift-approval'].includes('ADD')) {
      return NextResponse.json({
        success: false,
        message: 'Insufficient module permissions. ADD permission required for gift-approval module.',
        importedCount: 0,
        failedCount: 0,
        batchId: '',
      } as BulkImportResult)
    }

    // Generate batch name with format: BATCH_{user display name}_{date time}
    const currentDate = new Date()
      .toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
      .replace(/[/,]/g, '-')
      .replace(/\s/g, ' ')
    const uploaderName = userDisplayName || uploadedBy || userId
    const batchName = `BATCH_${uploaderName}_${currentDate}`

    let importedCount = 0
    let failedCount = 0
    const failedRows: any[] = []
    let totalValue = 0
    let batchId: number | undefined
    let workflowRowsUpdated = 0

    // Start transaction with higher isolation level to prevent race conditions
    await executeQuery('BEGIN TRANSACTION')

    try {
      // Create batch record first
      const batchSQL = `
        INSERT INTO MY_FLOW.PUBLIC.BULK_IMPORT_BATCHES (
          BATCH_NAME, UPLOADED_BY, TOTAL_ROWS, IS_ACTIVE, CREATED_DATE
        ) VALUES (?, ?, ?, TRUE, CURRENT_TIMESTAMP())
      `

      const batchParams = [requestBatchName || batchName, userId, data.length]
      // debugSQL(batchSQL, batchParams, "Bulk Import Batch Creation");
      await executeQuery(batchSQL, batchParams)

      // Get the generated batch ID
      const batchIdResult = await executeQuery(
        `
        SELECT BATCH_ID 
        FROM MY_FLOW.PUBLIC.BULK_IMPORT_BATCHES 
        WHERE BATCH_NAME = ? AND UPLOADED_BY = ? 
        ORDER BY CREATED_DATE DESC 
        LIMIT 1
      `,
        [requestBatchName || batchName, userId]
      )

      batchId = (batchIdResult as any[])[0]?.BATCH_ID

      // NOTE: This implementation assumes all rows are pre-validated on frontend
      // Alternative approach: Attempt import of all rows and handle failures individually
      // This would allow partial imports where some rows succeed and others fail

      switch (tab) {
        case 'pending':
          // Import gift requests with batch tracking and duplicate prevention
          for (const row of data) {
            let retryCount = 0
            const maxRetries = 3

            while (retryCount < maxRetries) {
              try {
                // Use sequence for GIFT_ID generation to ensure uniqueness
                const insertSQL = `
                  INSERT INTO MY_FLOW.PUBLIC.GIFT_DETAILS (
                    BATCH_ID, KAM_REQUESTED_BY, CREATED_DATE, WORKFLOW_STATUS,
                    MEMBER_ID, MEMBER_LOGIN, REWARD_NAME, GIFT_ITEM,
                    COST_BASE, CURRENCY, COST_LOCAL, REMARK, REWARD_CLUB_ORDER, CATEGORY,
                    LAST_MODIFIED_DATE
                  ) VALUES (?, ?, CURRENT_TIMESTAMP(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP())
                `

                // Use the validated data structure from frontend validation
                const costMyr = parseFloat(row.value) || 0
                const costLocal = row.valueLocal ? parseFloat(row.valueLocal) : null
                const currency = row.currency || 'MYR'
                if (costMyr) totalValue += costMyr

                const insertParams = [
                  batchId,
                  userId, // KAM_REQUESTED_BY - Use user ID from request body
                  'Manager_Review', // All bulk imports start at Manager_Review
                  row.memberId, // MEMBER_ID from validated member data
                  row.memberLogin.trim(), // MEMBER_LOGIN from CSV
                  row.rewardName?.trim() || null, // REWARD_NAME
                  row.giftItem.trim(), // GIFT_ITEM
                  costMyr, // COST_BASE (always in MYR)
                  currency, // CURRENCY (from member profile or default MYR)
                  costLocal, // COST_LOCAL (local currency amount, can be null)
                  row.remark?.trim() || null, // REMARK
                  row.rewardClubOrder?.trim() || null, // REWARD_CLUB_ORDER
                  row.category.trim(), // CATEGORY
                ]

                // debugSQL(insertSQL, insertParams, `Bulk Import Pending Row ${row._rowNumber || 'unknown'}`);
                await executeQuery(insertSQL, insertParams)

                importedCount++
                break // Success, exit retry loop
              } catch (error) {
                retryCount++
                const errorMessage = error instanceof Error ? error.message : 'Unknown error'

                // Check if it's a duplicate key error
                if (errorMessage.includes('duplicate') || errorMessage.includes('unique constraint') || errorMessage.includes('already exists')) {
                  if (retryCount >= maxRetries) {
                    failedCount++
                    failedRows.push({ row, error: `Failed after ${maxRetries} retries: ${errorMessage}` })
                  } else {
                    // Wait a bit before retrying to avoid race conditions
                    await new Promise((resolve) => setTimeout(resolve, 100 * retryCount))
                    continue
                  }
                } else {
                  // Non-duplicate error, don't retry
                  failedCount++
                  failedRows.push({ row, error: errorMessage })
                  break
                }
              }
            }
          }

          // Update workflow status for all KAM_Request gifts created today by this user
          if (importedCount > 0) {
            const updateWorkflowSQL = `
              UPDATE MY_FLOW.PUBLIC.GIFT_DETAILS 
              SET WORKFLOW_STATUS = ?, LAST_MODIFIED_DATE = CURRENT_TIMESTAMP()
              WHERE KAM_REQUESTED_BY = ? 
                AND WORKFLOW_STATUS = 'KAM_Request'
                AND DATE(CREATED_DATE) = CURRENT_DATE()
            `
            const updateWorkflowParams = ['Manager_Review', userId]
            // debugSQL(updateWorkflowSQL, updateWorkflowParams, "Bulk Import Workflow Status Update");
            const updateResult = await executeQuery(updateWorkflowSQL, updateWorkflowParams)

            workflowRowsUpdated = Array.isArray(updateResult) && updateResult[0] ? updateResult[0]['number of rows updated'] : 0
            if (workflowRowsUpdated === 0) {
              console.warn('⚠️ Warning: Bulk import completed but workflow status update failed - no KAM_Request records found for today')
            } else {
              console.log(`✅ Successfully updated ${workflowRowsUpdated} gift request(s) to Manager_Review status from bulk import`)
            }
          }
          break

        case 'processing':
          // Update existing gifts with MKTOps data and batch tracking
          const processingUpdatedGifts: number[] = []
          for (const row of data) {
            try {
              const updateSQL = `
                UPDATE MY_FLOW.PUBLIC.GIFT_DETAILS 
                SET 
                  WORKFLOW_STATUS = 'MKTOps_Processing',
                  DISPATCHER = ?,
                  TRACKING_CODE = ?,
                  TRACKING_STATUS = ?,
                  BATCH_ID = ?,
                  LAST_MODIFIED_DATE = CURRENT_TIMESTAMP()
                WHERE GIFT_ID = ?
              `

              const result = await executeQuery(updateSQL, [row.dispatcher, row.trackingCode, row.trackingStatus, batchId, row.giftId])

              if ((result as any).affectedRows > 0) {
                importedCount++
                processingUpdatedGifts.push(parseInt(row.giftId))
              } else {
                failedCount++
                failedRows.push({ row, error: 'Gift ID not found' })
              }
            } catch (error) {
              failedCount++
              const errorMessage = error instanceof Error ? error.message : 'Unknown error'
              failedRows.push({ row, error: errorMessage })
            }
          }

          // Log workflow timeline for processing updates
          if (processingUpdatedGifts.length > 0) {
            const timelineEntries = processingUpdatedGifts.map((giftId) => ({
              giftId,
              fromStatus: 'Manager_Review',
              toStatus: 'MKTOps_Processing',
              changedBy: userId,
              remark: 'Bulk import: Updated with MKTOps data',
            }))
            await logBulkWorkflowTimeline(timelineEntries)
          }
          break

        case 'kam-proof':
          // Update gifts with KAM proof data and batch tracking
          const kamProofUpdatedGifts: number[] = []
          for (const row of data) {
            try {
              const updateSQL = `
                UPDATE MY_FLOW.PUBLIC.GIFT_DETAILS 
                SET 
                  WORKFLOW_STATUS = 'KAM_Proof',
                  KAM_PROOF = ?,
                  GIFT_FEEDBACK = ?,
                  KAM_PROOF_BY = ?,
                  BATCH_ID = ?,
                  LAST_MODIFIED_DATE = CURRENT_TIMESTAMP()
                WHERE GIFT_ID = ?
              `

              const result = await executeQuery(updateSQL, [row.kamProof, row.giftFeedback, userId, batchId, row.giftId])

              if ((result as any).affectedRows > 0) {
                importedCount++
                kamProofUpdatedGifts.push(parseInt(row.giftId))
              } else {
                failedCount++
                failedRows.push({ row, error: 'Gift ID not found' })
              }
            } catch (error) {
              failedCount++
              const errorMessage = error instanceof Error ? error.message : 'Unknown error'
              failedRows.push({ row, error: errorMessage })
            }
          }

          // Log workflow timeline for KAM proof updates
          if (kamProofUpdatedGifts.length > 0) {
            const timelineEntries = kamProofUpdatedGifts.map((giftId) => ({
              giftId,
              fromStatus: 'MKTOps_Processing',
              toStatus: 'KAM_Proof',
              changedBy: userId,
              remark: 'Bulk import: Updated with KAM proof data',
            }))
            await logBulkWorkflowTimeline(timelineEntries)
          }
          break

        case 'audit':
          // Update gifts with audit data and batch tracking
          const auditUpdatedGifts: number[] = []
          for (const row of data) {
            try {
              const updateSQL = `
                UPDATE MY_FLOW.PUBLIC.GIFT_DETAILS 
                SET 
                  WORKFLOW_STATUS = 'SalesOps_Audit',
                  AUDITED_BY = ?,
                  AUDIT_REMARK = ?,
                  AUDIT_DATE = CURRENT_TIMESTAMP(),
                  BATCH_ID = ?,
                  LAST_MODIFIED_DATE = CURRENT_TIMESTAMP()
                WHERE GIFT_ID = ?
              `

              const result = await executeQuery(updateSQL, [userId, row.auditRemark, batchId, row.giftId])

              if ((result as any).affectedRows > 0) {
                importedCount++
                auditUpdatedGifts.push(parseInt(row.giftId))
              } else {
                failedCount++
                failedRows.push({ row, error: 'Gift ID not found' })
              }
            } catch (error) {
              failedCount++
              const errorMessage = error instanceof Error ? error.message : 'Unknown error'
              failedRows.push({ row, error: errorMessage })
            }
          }

          // Log workflow timeline for audit updates
          if (auditUpdatedGifts.length > 0) {
            const timelineEntries = auditUpdatedGifts.map((giftId) => ({
              giftId,
              fromStatus: 'KAM_Proof',
              toStatus: 'SalesOps_Audit',
              changedBy: userId,
              remark: 'Bulk import: Updated with audit data',
            }))
            await logBulkWorkflowTimeline(timelineEntries)
          }
          break

        default:
          throw new Error(`Unsupported tab: ${tab}`)
      }

      // Update batch record with final status
      const updateBatchSQL = `
        UPDATE MY_FLOW.PUBLIC.BULK_IMPORT_BATCHES 
        SET 
          IS_ACTIVE = TRUE,
          COMPLETED_AT = CURRENT_TIMESTAMP()
        WHERE BATCH_ID = ?
      `

      const updateBatchParams = [batchId]
      // debugSQL(updateBatchSQL, updateBatchParams, "Bulk Import Batch Update");
      await executeQuery(updateBatchSQL, updateBatchParams)

      // Note: BULK_IMPORT_LOGS table removed as it doesn't exist in the current schema
      // Batch tracking is handled by BULK_IMPORT_BATCHES table

      // Get the created gift IDs for logging
      let createdGiftIds: number[] = []
      if (tab === 'pending' && importedCount > 0) {
        const getGiftIdsSQL = `
          SELECT GIFT_ID 
          FROM MY_FLOW.PUBLIC.GIFT_DETAILS 
          WHERE BATCH_ID = ?
          ORDER BY GIFT_ID
        `
        const giftIdsResult = await executeQuery(getGiftIdsSQL, [batchId])
        createdGiftIds = Array.isArray(giftIdsResult) ? giftIdsResult.map((row: any) => row.GIFT_ID) : []

        // Log workflow timeline for bulk created gifts
        if (createdGiftIds.length > 0) {
          const timelineEntries = []

          // Log initial creation for each gift
          for (const giftId of createdGiftIds) {
            timelineEntries.push({
              giftId,
              fromStatus: null,
              toStatus: 'KAM_Request',
              changedBy: userId,
              remark: `Bulk import: Gift request created`,
            })
          }

          // Log automatic progression to Manager_Review if update was successful
          if (workflowRowsUpdated > 0) {
            for (const giftId of createdGiftIds) {
              timelineEntries.push({
                giftId,
                fromStatus: 'KAM_Request',
                toStatus: 'Manager_Review',
                changedBy: userId,
                remark: 'Bulk import: Automatically moved to Manager Review',
              })
            }
          }

          // Log all timeline entries in bulk
          await logBulkWorkflowTimeline(timelineEntries)
        }
      }

      // Commit transaction
      await executeQuery('COMMIT')

      return NextResponse.json({
        success: true,
        message: `Successfully imported ${importedCount} records`,
        importedCount,
        failedCount,
        batchId: batchId?.toString() || '',
        totalValue,
        createdGiftIds: createdGiftIds, // Return created gift IDs for logging
        failedRows: failedRows.length > 0 ? failedRows : undefined,
      } as BulkImportResult)
    } catch (error) {
      // Rollback transaction on error
      await executeQuery('ROLLBACK')

      // Update batch record to failed status
      const updateBatchSQL = `
        UPDATE MY_FLOW.PUBLIC.BULK_IMPORT_BATCHES 
        SET 
          IS_ACTIVE = FALSE,
          COMPLETED_AT = CURRENT_TIMESTAMP()
        WHERE BATCH_ID = ? AND
      `

      const updateBatchParams = [batchId]
      // debugSQL(updateBatchSQL, updateBatchParams, "Bulk Import Batch Failed Update");
      await executeQuery(updateBatchSQL, updateBatchParams)

      // Log failed transaction
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Bulk import failed:', errorMessage)

      throw error
    }
  } catch (error) {
    console.error('Bulk import error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      {
        success: false,
        message: errorMessage || 'Bulk import failed',
        importedCount: 0,
        failedCount: 0,
        batchId: 'unknown',
      } as BulkImportResult,
      { status: 500 }
    )
  }
}
