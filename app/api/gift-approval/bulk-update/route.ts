import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake/config'
import { debugSQL } from '@/lib/utils'
import { logWorkflowTimeline } from '@/lib/workflow-timeline'
import { NotificationService } from '@/services/notificationService'
import { ServerNotificationService } from '@/services/serverNotificationService'
import { IntegratedNotificationService } from '@/services/integratedNotificationService'

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

      // Create notification for audit rejections (mark as issue)
      if (tab === 'audit' && auditDecision === 'issue') {
        try {
          const rejectedGiftIds = data.map(row => parseInt(row.giftId))
          await createBulkUpdateRejectNotification(rejectedGiftIds, userId)
        } catch (notificationError) {
          console.error('Error creating bulk update reject notification:', notificationError)
          // Don't fail the request if notification creation fails
        }
      }

      // Create notification for delivery status updates
      if (tab === 'processing') {
        const deliveredGifts = data.filter(row => row.status === 'Delivered')
        if (deliveredGifts.length > 0) {
          try {
            // Get current tracking statuses to check which gifts are actually changing to delivered
            const giftIds = deliveredGifts.map(row => parseInt(row.giftId))
            const placeholders = giftIds.map(() => '?').join(',')

            const currentTrackingQuery = `
              SELECT GIFT_ID, TRACKING_STATUS
              FROM MY_FLOW.PUBLIC.GIFT_DETAILS
              WHERE GIFT_ID IN (${placeholders})
            `
            const currentTrackingResult = await executeQuery(currentTrackingQuery, giftIds) as any[]
            const currentTrackingMap = new Map(currentTrackingResult.map(g => [g.GIFT_ID, g.TRACKING_STATUS]))

            // Filter gifts that are changing from non-delivered to delivered
            const giftsChangingToDelivered = deliveredGifts.filter(row => {
              const giftId = parseInt(row.giftId)
              const previousTrackingStatus = currentTrackingMap.get(giftId)
              return previousTrackingStatus !== 'Delivered'
            })

            if (giftsChangingToDelivered.length > 0) {
              console.log('🚀 [BULK UPDATE DELIVERY] Processing delivery notification for gifts changing to delivered:', {
                totalDelivered: deliveredGifts.length,
                changingToDelivered: giftsChangingToDelivered.length,
                giftIds: giftsChangingToDelivered.map(row => row.giftId)
              })
              await createBulkDeliveryNotification(giftsChangingToDelivered, userId)
            } else {
              console.log('🚀 [BULK UPDATE DELIVERY] All gifts already delivered - skipping notification')
            }
          } catch (notificationError) {
            console.error('Error creating bulk delivery notification:', notificationError)
            // Don't fail the request if notification creation fails
          }
        }
      }

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

// Helper function to create bulk update reject notifications (audit mark as issue)
async function createBulkUpdateRejectNotification(giftIds: number[], userId: string) {
  try {
    await ServerNotificationService.createNotification({
      userId: null, // Global notification
      targetUserIds: null,
      roles: ['KAM', 'ADMIN'], // KAM and Admin should be notified of audit rejections
      module: 'gift-approval',
      type: 'audit_rejection',
      title: 'Audit Issues Found',
      message: `${giftIds.length} gift(s) have been marked as issues during audit and returned to KAM Proof`,
      action: 'bulk_audit_reject',
      priority: 'high',
      read: false,
      readAt: null,
      readBy: null,
      data: {
        giftIds,
        rejectedBy: userId,
        rejectedCount: giftIds.length,
        auditAction: 'mark_as_issue',
      },
      actions: [
        {
          label: 'View Gifts',
          action: 'navigate',
          url: '/gift-approval',
        },
      ],
      expiresAt: null,
    })

    console.log(`✅ Bulk update reject notification created for ${giftIds.length} gifts`)
  } catch (error) {
    console.error('Error creating bulk update reject notification:', error)
    throw error
  }
}

// Helper function to create bulk delivery notifications
async function createBulkDeliveryNotification(deliveredGifts: any[], userId: string) {
  try {
    // Get gift data for delivery notification using the view table
    const giftIds = deliveredGifts.map(row => parseInt(row.giftId))
    const placeholders = giftIds.map(() => '?').join(',')

    const giftDataQuery = `
      SELECT 
        GIFT_ID,
        FULL_NAME,
        MEMBER_LOGIN,
        GIFT_ITEM,
        GIFT_COST,
        CATEGORY,
        KAM_NAME,
        KAM_EMAIL,
        MANAGER_NAME,
        DISPATCHER,
        TRACKING_CODE,
        TRACKING_STATUS,
        CREATED_DATE,
        LAST_MODIFIED_DATE
      FROM MY_FLOW.PRESENTATION.VIEW_GIFT_DETAILS 
      WHERE GIFT_ID IN (${placeholders})
    `
    const giftDataResult = await executeQuery(giftDataQuery, giftIds)

    if (Array.isArray(giftDataResult) && giftDataResult.length > 0) {
      // Get the user's name who performed the delivery update
      let updatedByName = userId // Default to userId if we can't get the name
      try {
        const userQuery = `
          SELECT NAME, ROLE 
          FROM MY_FLOW.GLOBAL_CONFIG.SYS_USER_INFO 
          WHERE USER_ID = ?
        `
        const userResult = await executeQuery(userQuery, [userId])
        if (Array.isArray(userResult) && userResult.length > 0) {
          const user = userResult[0]
          updatedByName = user.NAME || userId
        }
      } catch (userError) {
        console.log('⚠️ Could not fetch user name, using userId:', userId)
      }

      // Map the view fields to the expected format for the notification service
      const giftDataArray = giftDataResult.map(gift => ({
        giftId: gift.GIFT_ID,
        fullName: gift.FULL_NAME,
        memberLogin: gift.MEMBER_LOGIN,
        giftItem: gift.GIFT_ITEM,
        giftCost: gift.GIFT_COST,
        category: gift.CATEGORY,
        kamRequestedBy: gift.KAM_NAME,
        kamEmail: gift.KAM_EMAIL,
        dispatcher: gift.DISPATCHER,
        trackingCode: gift.TRACKING_CODE,
        trackingStatus: gift.TRACKING_STATUS,
        updatedBy: updatedByName
      }))

      console.log('🚀 [BULK DELIVERY] Sending bulk delivery notification:', {
        giftCount: giftDataArray.length,
        updatedBy: userId
      })

      // Send integrated notification (both notification and email) to MKTOPS and ADMIN
      await IntegratedNotificationService.sendBulkGiftDeliveryNotification(
        giftDataArray,
        userId,
        ['MKTOPS', 'ADMIN']
      )

      console.log(`✅ Bulk delivery notification created for ${giftDataArray.length} gifts`)
    }
  } catch (error) {
    console.error('Error creating bulk delivery notification:', error)
    throw error
  }
}
