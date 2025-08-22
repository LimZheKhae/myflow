import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake/config'
import { debugSQL } from '@/lib/utils'
import { logWorkflowTimeline } from '@/lib/workflow-timeline'

interface UpdateRequest {
  giftId: number
  tab: string
  action: string
  userId: string
  userRole?: string
  userPermissions?: Record<string, string[]>
  // New field for target workflow status
  targetStatus?: string
  // Tab-specific fields
  rejectReason?: string
  dispatcher?: string
  trackingCode?: string
  trackingStatus?: string
  kamProof?: string
  mktProof?: string // New field for MKTOps proof image URL
  giftFeedback?: string
  auditRemark?: string
  // For structured data updates
  data?: {
    dispatcher?: string
    trackingCode?: string
    trackingStatus?: string
    kamProof?: string
    mktProof?: string
    giftFeedback?: string
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { giftId, tab, action, userId, userRole, userPermissions, targetStatus, rejectReason, dispatcher, trackingCode, trackingStatus, kamProof, mktProof, giftFeedback, auditRemark, data }: UpdateRequest = await request.json()

    console.log('🔍 [SINGLE UPDATE] Request Debug Info:', {
      giftId,
      tab,
      action,
      userId,
      userRole,
      userPermissions,
      targetStatus,
      rejectReason,
      dispatcher,
      trackingCode,
      trackingStatus,
      kamProof,
      mktProof,
      giftFeedback,
      auditRemark,
      data,
      isBOAction: action === 'toggle-bo',
    })

    // Validate required fields
    if (!giftId || !tab || !action || !userId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Gift ID, tab, action, and user ID are required',
        },
        { status: 400 }
      )
    }

    // Validate user role and permissions based on tab
    const validationResult = validateTabPermissions(tab, action, userRole, userPermissions)
    if (!validationResult.isValid) {
      return NextResponse.json(
        {
          success: false,
          message: validationResult.message,
        },
        { status: 403 }
      )
    }

    // Get current gift status to validate workflow progression
    const currentGift = await getCurrentGiftStatus(giftId)
    if (!currentGift) {
      return NextResponse.json(
        {
          success: false,
          message: 'Gift not found',
        },
        { status: 404 }
      )
    }

    // Validate workflow progression
    const workflowValidation = validateWorkflowProgression(tab, action, currentGift.workflowStatus)
    if (!workflowValidation.isValid) {
      return NextResponse.json(
        {
          success: false,
          message: workflowValidation.message,
        },
        { status: 400 }
      )
    }

    // Perform the update based on tab and action
    const updateResult = await performUpdate(tab, action, {
      giftId,
      userId,
      targetStatus,
      rejectReason,
      dispatcher: data?.dispatcher || dispatcher,
      trackingCode: data?.trackingCode || trackingCode,
      trackingStatus: data?.trackingStatus || trackingStatus,
      kamProof: data?.kamProof || kamProof,
      mktProof: data?.mktProof || mktProof,
      giftFeedback: data?.giftFeedback || giftFeedback,
      auditRemark,
    })

    console.log('🔍 [SINGLE UPDATE] Update Result:', {
      tab,
      action,
      updateResult,
      isBOAction: action === 'toggle-bo',
      success: updateResult.success,
      message: updateResult.message,
      newStatus: updateResult.newStatus,
    })

    if (!updateResult.success) {
      console.log('🔍 [SINGLE UPDATE] Update Failed:', {
        tab,
        action,
        error: updateResult.message,
        isBOAction: action === 'toggle-bo',
      })
      return NextResponse.json(
        {
          success: false,
          message: updateResult.message,
        },
        { status: 500 }
      )
    }

    // Log workflow timeline if status changed
    if (updateResult.newStatus) {
      console.log('🔍 [SINGLE UPDATE] Logging Timeline:', {
        tab,
        action,
        giftId,
        fromStatus: currentGift.workflowStatus,
        toStatus: updateResult.newStatus,
        changedBy: userId,
        remark: `Single update: ${action} action`,
        isBOAction: action === 'toggle-bo',
      })

      await logWorkflowTimeline({
        giftId,
        fromStatus: currentGift.workflowStatus,
        toStatus: updateResult.newStatus,
        changedBy: userId,
        remark: `Single update: ${action} action`,
      })
    }

    // BO toggle actions do NOT log timeline entries since workflow status doesn't change
    if (action === 'toggle-bo') {
      console.log('🔍 [SINGLE UPDATE] BO Toggle Complete (No Timeline Logging):', {
        tab,
        action,
        giftId,
        currentStatus: currentGift.workflowStatus,
        message: 'BO toggle actions do not create timeline entries',
        isBOAction: true,
      })
    }

    const responseData = {
      success: true,
      message: `Gift ${action} successful`,
      data: {
        giftId,
        newStatus: updateResult.newStatus,
        updatedBy: userId,
        updatedAt: new Date().toISOString(),
      },
    }

    console.log('🔍 [SINGLE UPDATE] Final Response:', {
      tab,
      action,
      responseData,
      isBOAction: action === 'toggle-bo',
    })

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Error updating gift:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to update gift',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// Validate tab-specific permissions
function validateTabPermissions(tab: string, action: string, userRole?: string, userPermissions?: Record<string, string[]>): { isValid: boolean; message: string } {
  if (!userRole) {
    return { isValid: false, message: 'User role is required' }
  }

  if (!userPermissions || !userPermissions['gift-approval']) {
    return { isValid: false, message: 'Gift approval permissions are required' }
  }

  const hasEditPermission = userPermissions['gift-approval'].includes('EDIT')

  switch (tab) {
    case 'pending':
      // Pending tab: Manager or Admin can approve/reject
      if (!['MANAGER', 'ADMIN'].includes(userRole)) {
        return {
          isValid: false,
          message: 'Only Manager and Admin users can approve/reject gift requests',
        }
      }
      if (!hasEditPermission) {
        return {
          isValid: false,
          message: 'EDIT permission required for gift-approval module',
        }
      }
      if (!['approve', 'reject'].includes(action)) {
        return {
          isValid: false,
          message: "Invalid action for pending tab. Use 'approve' or 'reject'",
        }
      }
      break

    case 'processing':
      // Processing tab: MKTOps, Manager, Admin can update tracking info or reject
      if (!['MKTOPS', 'MANAGER', 'ADMIN'].includes(userRole)) {
        return {
          isValid: false,
          message: 'Only MKTOps, Manager, and Admin users can update processing information',
        }
      }
      if (!hasEditPermission) {
        return {
          isValid: false,
          message: 'EDIT permission required for gift-approval module',
        }
      }
      if (!['update', 'update-mktops', 'reject', 'toggle-bo', 'proceed'].includes(action)) {
        return {
          isValid: false,
          message: "Invalid action for processing tab. Use 'update', 'update-mktops', 'reject', 'toggle-bo', or 'proceed'",
        }
      }
      break

    case 'kam-proof':
      // KAM Proof tab: KAM role can submit proof
      if (!['KAM', 'ADMIN'].includes(userRole)) {
        return {
          isValid: false,
          message: 'Only KAM and Admin users can submit proof',
        }
      }
      if (!hasEditPermission) {
        return {
          isValid: false,
          message: 'EDIT permission required for gift-approval module',
        }
      }
      if (action !== 'submit') {
        return {
          isValid: false,
          message: "Invalid action for kam-proof tab. Use 'submit'",
        }
      }
      break

    case 'audit':
      // Audit tab: Audit role can audit gifts
      if (!['AUDIT', 'ADMIN'].includes(userRole)) {
        return {
          isValid: false,
          message: 'Only Audit and Admin users can audit gifts',
        }
      }
      if (!hasEditPermission) {
        return {
          isValid: false,
          message: 'EDIT permission required for gift-approval module',
        }
      }
      if (!['complete', 'mark-issue'].includes(action)) {
        return {
          isValid: false,
          message: "Invalid action for audit tab. Use 'complete' or 'mark-issue'",
        }
      }
      break

    default:
      return {
        isValid: false,
        message: `Unsupported tab: ${tab}`,
      }
  }

  return { isValid: true, message: 'Permission validation passed' }
}

// Get current gift status
async function getCurrentGiftStatus(giftId: number): Promise<{ workflowStatus: string } | null> {
  try {
    const result = await executeQuery('SELECT WORKFLOW_STATUS FROM MY_FLOW.PUBLIC.GIFT_DETAILS WHERE GIFT_ID = ?', [giftId])

    if (Array.isArray(result) && result.length > 0) {
      return { workflowStatus: result[0].WORKFLOW_STATUS }
    }
    return null
  } catch (error) {
    console.error('Error fetching gift status:', error)
    return null
  }
}

// Validate workflow progression
function validateWorkflowProgression(tab: string, action: string, currentStatus: string): { isValid: boolean; message: string } {
  const validTransitions: Record<string, Record<string, string[]>> = {
    pending: {
      approve: ['KAM_Request', 'Manager_Review'],
      reject: ['KAM_Request', 'Manager_Review'],
    },
    processing: {
      update: ['Manager_Review'],
      'update-mktops': ['MKTOps_Processing'],
      reject: ['MKTOps_Processing'],
      'toggle-bo': ['MKTOps_Processing'],
      proceed: ['MKTOps_Processing'],
    },
    'kam-proof': {
      submit: ['KAM_Proof'],
    },
    audit: {
      complete: ['SalesOps_Audit'],
      'mark-issue': ['SalesOps_Audit'],
    },
  }

  const allowedStatuses = validTransitions[tab]?.[action]
  if (!allowedStatuses) {
    return {
      isValid: false,
      message: `Invalid action '${action}' for tab '${tab}'`,
    }
  }

  if (!allowedStatuses.includes(currentStatus)) {
    return {
      isValid: false,
      message: `Cannot perform '${action}' on gift with status '${currentStatus}'. Allowed statuses: ${allowedStatuses.join(', ')}`,
    }
  }

  return { isValid: true, message: 'Workflow validation passed' }
}

// Perform the actual update
async function performUpdate(
  tab: string,
  action: string,
  data: {
    giftId: number
    userId: string
    targetStatus?: string
    rejectReason?: string
    dispatcher?: string
    trackingCode?: string
    trackingStatus?: string
    kamProof?: string
    mktProof?: string
    giftFeedback?: string
    auditRemark?: string
    checkerName?: string
  }
): Promise<{ success: boolean; message: string; newStatus?: string }> {
  try {
    let updateSQL = ''
    let updateParams: any[] = []
    let newStatus = ''

    switch (tab) {
      case 'pending':
        if (action === 'approve' || action === 'reject') {
          // Use targetStatus from frontend instead of hardcoding
          newStatus = data.targetStatus || (action === 'approve' ? 'MKTOps_Processing' : 'Rejected')
          updateSQL = `
             UPDATE MY_FLOW.PUBLIC.GIFT_DETAILS 
             SET WORKFLOW_STATUS = ?, APPROVAL_REVIEWED_BY = ?, REJECT_REASON = ?, LAST_MODIFIED_DATE = CURRENT_TIMESTAMP()
             WHERE GIFT_ID = ?
           `
          updateParams = [newStatus, data.userId, data.rejectReason || null, data.giftId]
        }
        break

      case 'processing':
        if (action === 'update-mktops') {
          // Update MKTOps information without changing workflow status
          updateSQL = `
            UPDATE MY_FLOW.PUBLIC.GIFT_DETAILS 
            SET 
              DISPATCHER = ?,
              TRACKING_CODE = ?,
              TRACKING_STATUS = ?,
              MKT_PROOF = ?,
              GIFT_FEEDBACK = ?,
              PURCHASED_BY = ?,
              MKT_PURCHASE_DATE = CURRENT_TIMESTAMP(),
              LAST_MODIFIED_DATE = CURRENT_TIMESTAMP()
            WHERE GIFT_ID = ?
          `
          updateParams = [data.dispatcher || null, data.trackingCode || null, data.trackingStatus || null, data.mktProof || null, data.giftFeedback || null, data.userId, data.giftId]
        } else if (action === 'reject') {
          // Reject from processing tab (e.g., item sold out)
          newStatus = data.targetStatus || 'Rejected'
          updateSQL = `
            UPDATE MY_FLOW.PUBLIC.GIFT_DETAILS 
            SET 
              WORKFLOW_STATUS = ?,
              APPROVAL_REVIEWED_BY = ?,
              REJECT_REASON = ?,
              LAST_MODIFIED_DATE = CURRENT_TIMESTAMP()
            WHERE GIFT_ID = ?
          `
          updateParams = [newStatus, data.userId, data.rejectReason || null, data.giftId]
        } else if (action === 'toggle-bo') {
          console.log('🔍 [SINGLE UPDATE - TOGGLE BO] Debug Info:', {
            action: 'toggle-bo',
            giftId: data.giftId,
            userId: data.userId,
            tab,
            updateSQL: 'Will check current UPLOADED_BO and toggle appropriately',
          })

          // First, get the current UPLOADED_BO value to handle NULL properly
          const currentBoQuery = 'SELECT UPLOADED_BO FROM MY_FLOW.PUBLIC.GIFT_DETAILS WHERE GIFT_ID = ?'
          const currentBoResult = (await executeQuery(currentBoQuery, [data.giftId])) as any[]
          const currentBoValue = currentBoResult[0]?.UPLOADED_BO

          console.log('🔍 [SINGLE UPDATE - TOGGLE BO] Current BO Value:', {
            currentBoValue,
            currentBoType: typeof currentBoValue,
            isNull: currentBoValue === null,
            isUndefined: currentBoValue === undefined,
            isTruthy: !!currentBoValue,
          })

          // Determine the new value: NULL/FALSE -> TRUE, TRUE -> FALSE
          const newBoValue = currentBoValue === true ? false : true

          console.log('🔍 [SINGLE UPDATE - TOGGLE BO] Toggle Logic:', {
            currentBoValue,
            newBoValue,
            logic: `${currentBoValue} -> ${newBoValue}`,
          })

          // Toggle UPLOADED_BO status with explicit value (handles NULL properly)
          updateSQL = `
            UPDATE MY_FLOW.PUBLIC.GIFT_DETAILS 
            SET 
              UPLOADED_BO = ?,
              LAST_MODIFIED_DATE = CURRENT_TIMESTAMP()
            WHERE GIFT_ID = ?
          `
          updateParams = [newBoValue, data.giftId]

          console.log('🔍 [SINGLE UPDATE - TOGGLE BO] SQL and Params:', {
            updateSQL,
            updateParams,
            newBoValue,
            newBoValueType: typeof newBoValue,
            giftId: data.giftId,
          })
        } else if (action === 'proceed') {
          // Proceed to next step (KAM_Proof)
          newStatus = data.targetStatus || 'KAM_Proof'
          updateSQL = `
            UPDATE MY_FLOW.PUBLIC.GIFT_DETAILS 
            SET 
              WORKFLOW_STATUS = ?,
              LAST_MODIFIED_DATE = CURRENT_TIMESTAMP()
            WHERE GIFT_ID = ?
          `
          updateParams = [newStatus, data.giftId]
        } else {
          // Standard processing update - move to KAM_Proof
          newStatus = data.targetStatus || 'KAM_Proof'
          updateSQL = `
            UPDATE MY_FLOW.PUBLIC.GIFT_DETAILS 
            SET 
              WORKFLOW_STATUS = ?,
              DISPATCHER = ?,
              TRACKING_CODE = ?,
              TRACKING_STATUS = ?,
              LAST_MODIFIED_DATE = CURRENT_TIMESTAMP()
            WHERE GIFT_ID = ?
          `
          updateParams = [newStatus, data.dispatcher || null, data.trackingCode || null, data.trackingStatus || null, data.giftId]
        }
        break

      case 'kam-proof':
        newStatus = data.targetStatus || 'SalesOps_Audit'
        updateSQL = `
          UPDATE MY_FLOW.PUBLIC.GIFT_DETAILS 
          SET 
            WORKFLOW_STATUS = ?,
            KAM_PROOF = ?,
            GIFT_FEEDBACK = ?,
            KAM_PROOF_BY = ?,
            AUDIT_REMARK = NULL,
            LAST_MODIFIED_DATE = CURRENT_TIMESTAMP()
          WHERE GIFT_ID = ?
        `
        updateParams = [newStatus, data.kamProof || null, data.giftFeedback || null, data.userId, data.giftId]
        break

      case 'audit':
        if (action === 'complete' || action === 'mark-issue') {
          newStatus = data.targetStatus || '' // Use targetStatus from frontend
          if (action === 'complete') {
            // Mark as completed - clear AUDIT_REMARK
            updateSQL = `
              UPDATE MY_FLOW.PUBLIC.GIFT_DETAILS 
              SET 
                WORKFLOW_STATUS = ?,
                AUDITED_BY = ?,
                AUDIT_REMARK = NULL,
                AUDIT_DATE = CURRENT_TIMESTAMP(),
                LAST_MODIFIED_DATE = CURRENT_TIMESTAMP()
              WHERE GIFT_ID = ?
            `
            updateParams = [newStatus, data.checkerName || data.userId, data.giftId]
          } else {
            // Mark as issue - set AUDIT_REMARK and move back to KAM_Proof
            updateSQL = `
              UPDATE MY_FLOW.PUBLIC.GIFT_DETAILS 
              SET 
                WORKFLOW_STATUS = ?,
                AUDITED_BY = ?,
                AUDIT_REMARK = ?,
                AUDIT_DATE = CURRENT_TIMESTAMP(),
                LAST_MODIFIED_DATE = CURRENT_TIMESTAMP()
              WHERE GIFT_ID = ?
            `
            updateParams = [newStatus, data.checkerName || data.userId, data.auditRemark || 'Audit found compliance issues requiring KAM review', data.giftId]
          }
        }
        break

      default:
        return {
          success: false,
          message: `Unsupported tab: ${tab}`,
        }
    }

    if (!updateSQL) {
      return {
        success: false,
        message: `No update SQL generated for tab: ${tab}, action: ${action}`,
      }
    }

    // Debug the SQL query
    debugSQL(updateSQL, updateParams, `Gift Update - ${tab} ${action}`)

    console.log('🔍 [SINGLE UPDATE] Executing Query:', {
      tab,
      action,
      updateSQL,
      updateParams,
      isBOAction: action === 'toggle-bo',
    })

    // Execute the update
    const result = await executeQuery(updateSQL, updateParams)

    console.log('🔍 [SINGLE UPDATE] Query Result:', {
      tab,
      action,
      result,
      resultType: typeof result,
      isArray: Array.isArray(result),
      resultLength: Array.isArray(result) ? result.length : 'N/A',
    })

    // Check if update was successful
    const rowsUpdated = Array.isArray(result) && result[0] ? result[0]['number of rows updated'] : 0

    console.log('🔍 [SINGLE UPDATE] Rows Updated:', {
      tab,
      action,
      rowsUpdated,
      rowsUpdatedType: typeof rowsUpdated,
      isBOAction: action === 'toggle-bo',
    })

    if (rowsUpdated === 0) {
      console.log('🔍 [SINGLE UPDATE] No Rows Updated Warning:', {
        tab,
        action,
        giftId: data.giftId,
        updateSQL,
        updateParams,
      })
      return {
        success: false,
        message: 'No rows were updated. Gift may not exist or already be in the target status.',
      }
    }

    return {
      success: true,
      message: `Gift ${action} successful`,
      newStatus,
    }
  } catch (error) {
    console.error('Error performing update:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error during update',
    }
  }
}
