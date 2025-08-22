import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake/config'
import { debugSQL } from '@/lib/utils'
import { logWorkflowTimeline } from '@/lib/workflow-timeline'

interface BulkUpdateRequest {
  tab: string
  data: any[]
  uploadedBy: string
  userDisplayName: string
  userId: string
  userRole?: string
  userPermissions?: Record<string, string[]>
  advanceWorkflow?: boolean
  autoFillOptions?: Record<string, any>
  auditDecision?: 'completed' | 'issue'
}

interface BulkUpdateResult {
  success: boolean
  message: string
  updatedCount: number
  failedCount: number
  batchId?: string
}

export async function PUT(request: NextRequest) {
  try {
    const { tab, data, uploadedBy, userDisplayName, userId, userRole, userPermissions, advanceWorkflow, autoFillOptions, auditDecision }: BulkUpdateRequest = await request.json()

    if (!data || data.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No data provided for update',
        updatedCount: 0,
        failedCount: 0,
      } as BulkUpdateResult)
    }

    // Validate user permissions
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Invalid user ID format',
        updatedCount: 0,
        failedCount: 0,
      } as BulkUpdateResult)
    }

    // Role-based permission validation
    const allowedRoles: Record<string, string[]> = {
      processing: ['MKTOPS', 'MANAGER', 'ADMIN'],
      'kam-proof': ['KAM', 'ADMIN'],
      audit: ['AUDIT', 'ADMIN'],
    }

    if (!userRole || !allowedRoles[tab]?.includes(userRole)) {
      return NextResponse.json({
        success: false,
        message: `Insufficient role permissions. ${allowedRoles[tab]?.join(', ')} role required for ${tab} updates.`,
        updatedCount: 0,
        failedCount: 0,
      } as BulkUpdateResult)
    }

    // Check module permissions
    if (!userPermissions || !userPermissions['gift-approval'] || !userPermissions['gift-approval'].includes('EDIT')) {
      return NextResponse.json({
        success: false,
        message: 'Insufficient module permissions. EDIT permission required for gift-approval module.',
        updatedCount: 0,
        failedCount: 0,
      } as BulkUpdateResult)
    }

    let updatedCount = 0
    let failedCount = 0
    const failedRows: any[] = []

    // Start transaction
    await executeQuery('BEGIN TRANSACTION')

    try {
      // Process updates based on tab
      for (const row of data) {
        try {
          let updateSQL = ''
          let updateParams: any[] = []
          let targetStatus = ''

          switch (tab) {
            case 'processing':
              // Convert uploadedBo to boolean - expecting TRUE or FALSE
              const uploadedBo = row.uploadedBo === true || row.uploadedBo === 'TRUE'

              updateSQL = `
                UPDATE MY_FLOW.PUBLIC.GIFT_DETAILS 
                SET 
                  DISPATCHER = ?, 
                  TRACKING_CODE = ?, 
                  TRACKING_STATUS = ?,
                  UPLOADED_BO = ?,
                  LAST_MODIFIED_DATE = CURRENT_TIMESTAMP()
                WHERE GIFT_ID = ? AND WORKFLOW_STATUS = 'MKTOps_Processing'
              `

              updateParams = [row.dispatcher?.trim() || null, row.trackingCode?.trim() || null, row.status?.trim() || 'Pending', uploadedBo, parseInt(row.giftId)]

              // Check if we should advance workflow
              if (advanceWorkflow) {
                updateSQL = `
                  UPDATE MY_FLOW.PUBLIC.GIFT_DETAILS 
                  SET 
                    DISPATCHER = ?, 
                    TRACKING_CODE = ?, 
                    TRACKING_STATUS = ?,
                    UPLOADED_BO = ?,
                    WORKFLOW_STATUS = 'KAM_Proof',
                    LAST_MODIFIED_DATE = CURRENT_TIMESTAMP()
                  WHERE GIFT_ID = ? AND WORKFLOW_STATUS = 'MKTOps_Processing'
                `
                targetStatus = 'KAM_Proof'
              }
              break

            case 'kam-proof':
              updateSQL = `
                UPDATE MY_FLOW.PUBLIC.GIFT_DETAILS 
                SET 
                  GIFT_FEEDBACK = ?,
                  KAM_PROOF_BY = ?,
                  LAST_MODIFIED_DATE = CURRENT_TIMESTAMP()
                WHERE GIFT_ID = ? AND WORKFLOW_STATUS = 'KAM_Proof'
              `

              updateParams = [row.receiverFeedback?.trim() || null, userId, parseInt(row.giftId)]

              // Check if we should advance workflow
              if (advanceWorkflow) {
                updateSQL = `
                  UPDATE MY_FLOW.PUBLIC.GIFT_DETAILS 
                  SET 
                    GIFT_FEEDBACK = ?,
                    KAM_PROOF_BY = ?,
                    WORKFLOW_STATUS = 'SalesOps_Audit',
                    LAST_MODIFIED_DATE = CURRENT_TIMESTAMP()
                  WHERE GIFT_ID = ? AND WORKFLOW_STATUS = 'KAM_Proof'
                `
                targetStatus = 'SalesOps_Audit'
              }
              break

            case 'audit':
              // Determine target status based on audit decision
              const targetAuditStatus = auditDecision === 'issue' ? 'KAM_Proof' : 'Completed'

              updateSQL = `
                UPDATE MY_FLOW.PUBLIC.GIFT_DETAILS 
                SET 
                  AUDIT_REMARK = ?,
                  AUDITED_BY = ?,
                  AUDIT_DATE = CURRENT_TIMESTAMP(),
                  WORKFLOW_STATUS = ?,
                  LAST_MODIFIED_DATE = CURRENT_TIMESTAMP()
                WHERE GIFT_ID = ? AND WORKFLOW_STATUS = 'SalesOps_Audit'
              `

              updateParams = [row.remark?.trim() || null, userId, targetAuditStatus, parseInt(row.giftId)]

              targetStatus = targetAuditStatus
              break

            default:
              throw new Error(`Unsupported tab: ${tab}`)
          }

          debugSQL(updateSQL, updateParams, 'Bulk Update 123')
          // Execute the update
          const result = await executeQuery(updateSQL, updateParams)

          // Check if any rows were affected
          if ((result as any)?.rowsAffected === 0) {
            failedRows.push({
              giftId: row.giftId,
              error: 'Gift not found or not in correct workflow status',
            })
            failedCount++
          } else {
            updatedCount++

            // Log to timeline if workflow status changed
            if (targetStatus) {
              const fromStatus = tab === 'processing' ? 'MKTOps_Processing' : tab === 'kam-proof' ? 'KAM_Proof' : 'SalesOps_Audit'

              await logWorkflowTimeline({
                giftId: parseInt(row.giftId),
                fromStatus: fromStatus,
                toStatus: targetStatus,
                changedBy: userId,
                remark: `Bulk update: ${tab} stage`,
              })
            }
          }
        } catch (rowError) {
          console.error(`Error updating row ${row.giftId}:`, rowError)
          failedRows.push({
            giftId: row.giftId,
            error: rowError instanceof Error ? rowError.message : 'Unknown error',
          })
          failedCount++
        }
      }

      // Commit transaction
      await executeQuery('COMMIT')

      const result: BulkUpdateResult = {
        success: failedCount === 0,
        message: failedCount === 0 ? `Successfully updated ${updatedCount} records` : `Updated ${updatedCount} records, ${failedCount} failed`,
        updatedCount,
        failedCount,
      }

      return NextResponse.json(result)
    } catch (error) {
      // Rollback transaction on error
      await executeQuery('ROLLBACK')
      throw error
    }
  } catch (error) {
    console.error('Bulk update error:', error)
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      updatedCount: 0,
      failedCount: 0,
    } as BulkUpdateResult)
  }
}
