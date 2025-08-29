import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake/config'
import { debugSQL } from '@/lib/utils'
import { logWorkflowTimeline } from '@/lib/workflow-timeline'
import { IntegratedNotificationService } from '@/services/integratedNotificationService'

/**
 * SECURITY MODEL FOR GIFT APPROVAL UPDATE ROUTE
 * 
 * This route implements role-based access control (RBAC) with the following security requirements:
 * 
 * 1. AUTHENTICATION: User must be authenticated and provide valid userId
 * 2. AUTHORIZATION: User must have specific role and permissions for each tab
 * 3. PERMISSIONS: User must have both VIEW and EDIT permissions for gift-approval module
 * 4. ROLE-BASED ACCESS: Each tab has specific role requirements
 * 
 * TAB-SPECIFIC SECURITY RULES:
 * 
 * PENDING TAB:
 * - Roles: MANAGER, ADMIN
 * - Permissions: VIEW, EDIT (gift-approval module)
 * - Actions: approve, reject
 * 
 * PROCESSING TAB:
 * - Roles: MKTOPS, MANAGER, ADMIN
 * - Permissions: VIEW, EDIT (gift-approval module)
 * - Actions: update, update-mktops, reject, toggle-bo, proceed
 * 
 * KAM_PROOF TAB:
 * - Roles: KAM, ADMIN
 * - Permissions: VIEW, EDIT (gift-approval module)
 * - Actions: submit
 * 
 * AUDIT TAB:
 * - Roles: AUDIT, ADMIN
 * - Permissions: VIEW, EDIT (gift-approval module)
 * - Actions: complete, mark-issue
 * 
 * SECURITY VALIDATION FLOW:
 * 1. Validate required fields (giftId, tab, action, userId)
 * 2. Validate user role and permissions exist
 * 3. Validate gift-approval module permissions
 * 4. Validate tab-specific role requirements
 * 5. Validate tab-specific action requirements
 * 6. Validate workflow progression
 * 7. Perform database update
 * 8. Log workflow timeline
 * 9. Create notifications
 */

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
  revertReason?: string
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
    revertReason?: string
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { giftId, tab, action, userId, userRole, userPermissions, targetStatus, rejectReason, revertReason, dispatcher, trackingCode, trackingStatus, kamProof, mktProof, giftFeedback, auditRemark, data }: UpdateRequest = await request.json()

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

    // Security validation - ensure user has required permissions
    if (!userRole || !userPermissions) {
      return NextResponse.json(
        {
          success: false,
          message: 'User role and permissions are required for security validation',
        },
        { status: 403 }
      )
    }

    // Validate that user has gift-approval module permissions
    if (!userPermissions['gift-approval'] || !Array.isArray(userPermissions['gift-approval'])) {
      return NextResponse.json(
        {
          success: false,
          message: 'Gift approval module permissions are required',
        },
        { status: 403 }
      )
    }

    // Validate user role and permissions based on tab
    // Validate tab-specific permissions
    console.log('🔍 [PERMISSION VALIDATION] Starting validation:', {
      tab,
      action,
      userRole,
      userPermissions: userPermissions ? Object.keys(userPermissions) : 'none',
      giftApprovalPermissions: userPermissions?.['gift-approval']
    })

    const validationResult = validateTabPermissions(tab, action, userRole, userPermissions)
    console.log('🔍 [PERMISSION VALIDATION] Validation result:', validationResult)

    if (!validationResult.isValid) {
      console.log('❌ [PERMISSION VALIDATION] Validation failed:', validationResult.message)
      return NextResponse.json(
        {
          success: false,
          message: validationResult.message,
        },
        { status: 403 }
      )
    }

    console.log('✅ [PERMISSION VALIDATION] Validation passed')

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

    // Additional validation for proceed action in processing tab
    if (tab === 'processing' && action === 'proceed') {
      const processingValidation = await validateProcessingRequirements(giftId)
      if (!processingValidation.isValid) {
        return NextResponse.json(
          {
            success: false,
            message: processingValidation.message,
          },
          { status: 400 }
        )
      }
    }

    // Additional validation for reject action in processing tab
    if (tab === 'processing' && action === 'reject') {
      const rejectionValidation = await validateProcessingRejection(giftId)
      if (!rejectionValidation.isValid) {
        return NextResponse.json(
          {
            success: false,
            message: rejectionValidation.message,
          },
          { status: 400 }
        )
      }
    }

    // Perform the update based on tab and action
    const updateResult = await performUpdate(tab, action, {
      giftId,
      userId,
      userRole,
      targetStatus,
      rejectReason,
      revertReason: data?.revertReason || revertReason,
      dispatcher: data?.dispatcher || dispatcher,
      trackingCode: data?.trackingCode || trackingCode,
      trackingStatus: data?.trackingStatus || trackingStatus,
      kamProof: data?.kamProof || kamProof,
      mktProof: data?.mktProof || mktProof,
      giftFeedback: data?.giftFeedback || giftFeedback,
      auditRemark,
      currentGift, // Pass current gift information for delivery notification logic
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
  console.log('🔍 [PERMISSION VALIDATION] Starting validation:', {
    tab,
    action,
    userRole,
    userPermissions: userPermissions ? Object.keys(userPermissions) : 'none',
    giftApprovalPermissions: userPermissions?.['gift-approval']
  })

  // Basic validation
  if (!userRole) {
    console.log('❌ [PERMISSION VALIDATION] No user role provided')
    return { isValid: false, message: 'User role is required' }
  }

  if (!userPermissions || !userPermissions['gift-approval']) {
    console.log('❌ [PERMISSION VALIDATION] No gift-approval permissions found')
    return { isValid: false, message: 'Gift approval permissions are required' }
  }

  // Check for required permissions
  const hasViewPermission = userPermissions['gift-approval'].includes('VIEW')
  const hasEditPermission = userPermissions['gift-approval'].includes('EDIT')

  console.log('🔍 [PERMISSION VALIDATION] Permission checks:', {
    hasViewPermission,
    hasEditPermission,
    availablePermissions: userPermissions['gift-approval']
  })

  if (!hasViewPermission) {
    console.log('❌ [PERMISSION VALIDATION] Missing VIEW permission')
    return { isValid: false, message: 'VIEW permission required for gift-approval module' }
  }

  if (!hasEditPermission) {
    console.log('❌ [PERMISSION VALIDATION] Missing EDIT permission')
    return { isValid: false, message: 'EDIT permission required for gift-approval module' }
  }

  // Tab-specific role and action validation
  switch (tab) {
    case 'pending':
      console.log('🔍 [PERMISSION VALIDATION] Pending tab validation:', {
        userRole,
        allowedRoles: ['MANAGER', 'ADMIN'],
        userRoleIncluded: ['MANAGER', 'ADMIN'].includes(userRole),
        action,
        allowedActions: ['approve', 'reject'],
        actionIncluded: ['approve', 'reject'].includes(action)
      })

      // Pending tab: Only Manager and Admin can approve/reject
      if (!['MANAGER', 'ADMIN'].includes(userRole)) {
        console.log('❌ [PERMISSION VALIDATION] User role not allowed for pending tab')
        return {
          isValid: false,
          message: 'Only Manager and Admin users can approve/reject gift requests',
        }
      }
      if (!['approve', 'reject'].includes(action)) {
        console.log('❌ [PERMISSION VALIDATION] Invalid action for pending tab')
        return {
          isValid: false,
          message: "Invalid action for pending tab. Use 'approve' or 'reject'",
        }
      }
      console.log('✅ [PERMISSION VALIDATION] Pending tab validation passed')
      break

    case 'processing':
      // Processing tab: MKTOps, Manager, Admin can update tracking info or reject
      if (!['MKTOPS', 'MANAGER', 'ADMIN'].includes(userRole)) {
        return {
          isValid: false,
          message: 'Only MKTOps, Manager, and Admin users can update processing information',
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
      // KAM Proof tab: Only KAM and Admin can submit proof or revert to MKTOps
      if (!['KAM', 'ADMIN'].includes(userRole)) {
        return {
          isValid: false,
          message: 'Only KAM and Admin users can submit proof or revert to MKTOps',
        }
      }
      if (!['submit', 'revert-to-mktops'].includes(action)) {
        return {
          isValid: false,
          message: "Invalid action for kam-proof tab. Use 'submit' or 'revert-to-mktops'",
        }
      }
      break

    case 'audit':
      // Audit tab: Only Audit and Admin can audit gifts
      if (!['AUDIT', 'ADMIN'].includes(userRole)) {
        return {
          isValid: false,
          message: 'Only Audit and Admin users can audit gifts',
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
async function getCurrentGiftStatus(giftId: number): Promise<{ workflowStatus: string; trackingStatus?: string } | null> {
  try {
    const result = await executeQuery('SELECT WORKFLOW_STATUS, TRACKING_STATUS FROM MY_FLOW.PUBLIC.GIFT_DETAILS WHERE GIFT_ID = ?', [giftId])

    if (Array.isArray(result) && result.length > 0) {
      return {
        workflowStatus: result[0].WORKFLOW_STATUS,
        trackingStatus: result[0].TRACKING_STATUS
      }
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
      'revert-to-mktops': ['KAM_Proof'],
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

// Validate processing requirements for proceed action
async function validateProcessingRequirements(giftId: number): Promise<{ isValid: boolean; message: string }> {
  try {
    const result = await executeQuery(
      `SELECT DISPATCHER, TRACKING_CODE, TRACKING_STATUS, UPLOADED_BO 
       FROM MY_FLOW.PUBLIC.GIFT_DETAILS 
       WHERE GIFT_ID = ?`,
      [giftId]
    )

    if (!Array.isArray(result) || result.length === 0) {
      return {
        isValid: false,
        message: 'Gift not found',
      }
    }

    const gift = result[0]
    const missingFields: string[] = []

    // Check required fields
    if (!gift.DISPATCHER || gift.DISPATCHER.trim() === '') {
      missingFields.push('Dispatcher')
    }

    if (!gift.TRACKING_CODE || gift.TRACKING_CODE.trim() === '') {
      missingFields.push('Tracking Code')
    }

    if (!gift.TRACKING_STATUS || gift.TRACKING_STATUS.trim() === '') {
      missingFields.push('Tracking Status')
    } else if (gift.TRACKING_STATUS !== 'Delivered') {
      return {
        isValid: false,
        message: 'Tracking Status must be "Delivered" to proceed to KAM Proof',
      }
    }

    if (missingFields.length > 0) {
      return {
        isValid: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
      }
    }

    return { isValid: true, message: 'Processing requirements validation passed' }
  } catch (error) {
    console.error('Error validating processing requirements:', error)
    return {
      isValid: false,
      message: 'Error validating processing requirements',
    }
  }
}

// Validate processing rejection requirements
async function validateProcessingRejection(giftId: number): Promise<{ isValid: boolean; message: string }> {
  try {
    const result = await executeQuery(
      `SELECT TRACKING_STATUS 
       FROM MY_FLOW.PUBLIC.GIFT_DETAILS 
       WHERE GIFT_ID = ?`,
      [giftId]
    )

    if (!Array.isArray(result) || result.length === 0) {
      return {
        isValid: false,
        message: 'Gift not found',
      }
    }

    const gift = result[0]
    const trackingStatus = gift.TRACKING_STATUS

    // Check if tracking status is set to any delivery-related status
    if (trackingStatus && ['Pending', 'In Transit', 'Delivered'].includes(trackingStatus)) {
      return {
        isValid: false,
        message: `Cannot reject gift with tracking status "${trackingStatus}". Gift is already in the delivery process.`,
      }
    }

    return { isValid: true, message: 'Processing rejection validation passed' }
  } catch (error) {
    console.error('Error validating processing rejection:', error)
    return {
      isValid: false,
      message: 'Error validating processing rejection',
    }
  }
}

// Perform the actual update
async function performUpdate(
  tab: string,
  action: string,
  data: {
    giftId: number
    userId: string
    userRole?: string
    targetStatus?: string
    rejectReason?: string
    revertReason?: string
    dispatcher?: string
    trackingCode?: string
    trackingStatus?: string
    kamProof?: string
    mktProof?: string
    giftFeedback?: string
    auditRemark?: string
    checkerName?: string
    currentGift?: { workflowStatus: string; trackingStatus?: string }
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
          // Auto-set MKT_DELIVERED_DATE when tracking status changes to "Delivered"
          // Set MKT_DELIVERED_DATE to NULL when tracking status changes from "Delivered" to other status
          let mktDeliveredDate = 'MKT_DELIVERED_DATE' // Keep current value by default

          if (data.trackingStatus === 'Delivered' && data.currentGift?.trackingStatus !== 'Delivered') {
            // Changing TO delivered from non-delivered
            mktDeliveredDate = 'CURRENT_TIMESTAMP()'
          } else if (data.trackingStatus !== 'Delivered' && data.currentGift?.trackingStatus === 'Delivered') {
            // Changing FROM delivered to non-delivered
            mktDeliveredDate = 'NULL'
          }

          updateSQL = `
            UPDATE MY_FLOW.PUBLIC.GIFT_DETAILS 
            SET 
              DISPATCHER = ?,
              TRACKING_CODE = ?,
              TRACKING_STATUS = ?,
              MKT_PROOF = ?,
              GIFT_FEEDBACK = NULL,
              PURCHASED_BY = ?,
              MKT_PURCHASE_DATE = CURRENT_TIMESTAMP(),
              MKT_DELIVERED_DATE = ${mktDeliveredDate},
              LAST_MODIFIED_DATE = CURRENT_TIMESTAMP()
            WHERE GIFT_ID = ?
          `
          updateParams = [data.dispatcher || null, data.trackingCode || null, data.trackingStatus || null, data.mktProof || null, data.userId, data.giftId]
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
          // Proceed to next step (KAM_Proof) - Reset feedback to NULL
          newStatus = data.targetStatus || 'KAM_Proof'
          updateSQL = `
            UPDATE MY_FLOW.PUBLIC.GIFT_DETAILS 
            SET 
              WORKFLOW_STATUS = ?,
              GIFT_FEEDBACK = NULL,
              LAST_MODIFIED_DATE = CURRENT_TIMESTAMP()
            WHERE GIFT_ID = ?
          `
          updateParams = [newStatus, data.giftId]
        } else {
          // Standard processing update - move to KAM_Proof - Reset feedback to NULL
          newStatus = data.targetStatus || 'KAM_Proof'
          updateSQL = `
            UPDATE MY_FLOW.PUBLIC.GIFT_DETAILS 
            SET 
              WORKFLOW_STATUS = ?,
              DISPATCHER = ?,
              TRACKING_CODE = ?,
              TRACKING_STATUS = ?,
              GIFT_FEEDBACK = NULL,
              LAST_MODIFIED_DATE = CURRENT_TIMESTAMP()
            WHERE GIFT_ID = ?
          `
          updateParams = [newStatus, data.dispatcher || null, data.trackingCode || null, data.trackingStatus || null, data.giftId]
        }
        break

      case 'kam-proof':
        if (action === 'revert-to-mktops') {
          // Revert to MKTOps Processing due to delivery issues
          newStatus = 'MKTOps_Processing'
          updateSQL = `
            UPDATE MY_FLOW.PUBLIC.GIFT_DETAILS 
            SET 
              WORKFLOW_STATUS = ?,
              TRACKING_STATUS = 'Failed',
              MKT_DELIVERED_DATE = NULL,
              GIFT_FEEDBACK = ?,
              KAM_PROOF_BY = ?,
              LAST_MODIFIED_DATE = CURRENT_TIMESTAMP()
            WHERE GIFT_ID = ?
          `
          updateParams = [newStatus, data.revertReason || null, data.userId, data.giftId]
        } else {
          // Standard KAM Proof submission
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
        }
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
            updateParams = [newStatus, data.userId, data.giftId] // Always store userId for consistency
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
            updateParams = [newStatus, data.userId, data.auditRemark || 'Audit found compliance issues requiring KAM review', data.giftId] // Always store userId for consistency
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

    // Send integrated notification and email for reject actions only
    if (action === 'reject') {
      console.log("🔍 [GIFT REJECTION] Reject action detected")
      try {
        // Get gift data for integrated notification using the view table
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
            REJECT_REASON,
            CREATED_DATE,
            LAST_MODIFIED_DATE
          FROM MY_FLOW.PRESENTATION.VIEW_GIFT_DETAILS 
          WHERE GIFT_ID = ?
        `
        const giftDataResult = await executeQuery(giftDataQuery, [data.giftId])
        console.log("🔍 [GIFT REJECTION] Gift data result:", giftDataResult)
        if (Array.isArray(giftDataResult) && giftDataResult.length > 0) {
          const giftData = giftDataResult[0]

          // Get the user's name who performed the rejection
          let rejectedByName = data.userId // Default to userId if we can't get the name
          try {
            const userQuery = `
              SELECT NAME, ROLE 
              FROM MY_FLOW.GLOBAL_CONFIG.SYS_USER_INFO 
              WHERE USER_ID = ?
            `
            const userResult = await executeQuery(userQuery, [data.userId])
            if (Array.isArray(userResult) && userResult.length > 0) {
              const user = userResult[0]
              rejectedByName = user.NAME || data.userId
            }
          } catch (userError) {
            console.log('⚠️ Could not fetch user name, using userId:', data.userId)
          }

          // Map the view fields to the expected format for the notification service
          const mappedGiftData = {
            giftId: giftData.GIFT_ID,
            fullName: giftData.FULL_NAME,
            memberLogin: giftData.MEMBER_LOGIN,
            giftItem: giftData.GIFT_ITEM,
            cost: giftData.GIFT_COST,
            category: giftData.CATEGORY,
            kamRequestedBy: giftData.KAM_NAME,
            kamEmail: giftData.KAM_EMAIL,
            approvalReviewedBy: rejectedByName, // Use the actual name of who rejected it
            rejectReason: data.rejectReason
          }

          console.log('🔍 [GIFT REJECTION] Gift data for notification:', {
            giftId: mappedGiftData.giftId,
            kamEmail: mappedGiftData.kamEmail,
            kamRequestedBy: mappedGiftData.kamRequestedBy,
            rejectReason: mappedGiftData.rejectReason,
            rejectedBy: data.userId
          })

          console.log('🔍 [GIFT REJECTION] Sending Integrated Notification:', {
            giftId: data.giftId,
            targetUserIds: [], // Empty array means use role-based targeting
            kamEmail: mappedGiftData.kamEmail,
            rejectReason: mappedGiftData.rejectReason,
            rejectedBy: data.userId
          })

          // Send integrated notification (both notification and email)
          // Pass empty array to use role-based targeting (KAM and ADMIN users)
          await IntegratedNotificationService.sendGiftRejectionNotification(
            mappedGiftData,
            [] // Empty array will trigger role-based targeting
          )

          console.log('✅ [GIFT REJECTION] Integrated notification sent successfully')
        }
      } catch (notificationError) {
        console.error('❌ [GIFT REJECTION] Error sending integrated notification:', notificationError)
        // Don't fail the request if notification/email sending fails
      }
    }

    // Send integrated notification for revert-to-mktops action
    if (action === 'revert-to-mktops') {
      console.log("🔍 [GIFT REVERT] Revert-to-mktops action detected")
      try {
        // Get gift data to find the PURCHASED_BY user
        const giftDataQuery = `
          SELECT 
            GD.GIFT_ID,
            GD.MEMBER_LOGIN,
            GD.GIFT_ITEM,
            GD.GIFT_COST,
            GD.CATEGORY,
            GD.PURCHASED_BY,
            GD.CREATED_DATE,
            GD.LAST_MODIFIED_DATE
          FROM MY_FLOW.PUBLIC.GIFT_DETAILS GD
          WHERE GD.GIFT_ID = ?
        `
        console.log("🔍 [GIFT REVERT] Gift data query:", giftDataQuery)
        const giftDataResult = await executeQuery(giftDataQuery, [data.giftId])
        console.log("🔍 [GIFT REVERT] Gift data result:", giftDataResult)

        if (Array.isArray(giftDataResult) && giftDataResult.length > 0) {
          const giftData = giftDataResult[0]
          const purchasedBy = giftData.PURCHASED_BY // This is the Firebase user ID

          if (purchasedBy) {
            console.log('🔍 [GIFT REVERT] Sending notification to purchaser:', {
              giftId: data.giftId,
              purchasedBy: purchasedBy,
              revertReason: data.revertReason
            })

            // Send notification to the user who purchased the gift
            // Both sendEmail and sendNotification are true by default
            await IntegratedNotificationService.sendToSpecificUser(
              purchasedBy, // Use the Firebase user ID
              'Gift Reverted to MKTOps Processing',
              `Gift #${giftData.GIFT_ID} has been reverted to MKTOps Processing due to delivery issues. Reason: ${data.revertReason || 'Delivery issue detected'}`,
              'gift-approval',
              true, // sendEmail: true for revert-to-mktops
              true  // sendNotification: true for revert-to-mktops
            )

            console.log('✅ [GIFT REVERT] Notification sent successfully to purchaser')
          } else {
            console.log('⚠️ [GIFT REVERT] No PURCHASED_BY found for gift:', data.giftId)
          }
        }
      } catch (notificationError) {
        console.error('❌ [GIFT REVERT] Error sending notification:', notificationError)
        // Don't fail the request if notification sending fails
      }
    }

    // Send integrated notification and email for delivery status updates
    // Only send if tracking status changes TO 'Delivered' from a different status
    if (data.trackingStatus === 'Delivered' && data.currentGift?.trackingStatus !== 'Delivered') {
      console.log("🔍 [GIFT DELIVERY] Delivery status change detected (from non-delivered to delivered)")
      console.log("🔍 [GIFT DELIVERY] Previous tracking status:", data.currentGift?.trackingStatus)
      try {
        // Get gift data for delivery notification using the view table
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
          WHERE GIFT_ID = ?
        `
        const giftDataResult = await executeQuery(giftDataQuery, [data.giftId])
        console.log("🔍 [GIFT DELIVERY] Gift data result:", giftDataResult)
        if (Array.isArray(giftDataResult) && giftDataResult.length > 0) {
          const giftData = giftDataResult[0]

          // Get the user's name who performed the delivery update
          let updatedByName = data.userId // Default to userId if we can't get the name
          try {
            const userQuery = `
              SELECT NAME, ROLE 
              FROM MY_FLOW.GLOBAL_CONFIG.SYS_USER_INFO 
              WHERE USER_ID = ?
            `
            const userResult = await executeQuery(userQuery, [data.userId])
            if (Array.isArray(userResult) && userResult.length > 0) {
              const user = userResult[0]
              updatedByName = user.NAME || data.userId
            }
          } catch (userError) {
            console.log('⚠️ Could not fetch user name, using userId:', data.userId)
          }

          // Map the view fields to the expected format for the notification service
          const mappedGiftData = {
            giftId: giftData.GIFT_ID,
            fullName: giftData.FULL_NAME,
            memberLogin: giftData.MEMBER_LOGIN,
            giftItem: giftData.GIFT_ITEM,
            cost: giftData.GIFT_COST,
            category: giftData.CATEGORY,
            kamRequestedBy: giftData.KAM_NAME,
            kamEmail: giftData.KAM_EMAIL,
            dispatcher: giftData.DISPATCHER,
            trackingCode: giftData.TRACKING_CODE,
            trackingStatus: giftData.TRACKING_STATUS,
            updatedBy: updatedByName
          }

          console.log('🔍 [GIFT DELIVERY] Gift data for notification:', {
            giftId: mappedGiftData.giftId,
            fullName: mappedGiftData.fullName,
            trackingCode: mappedGiftData.trackingCode,
            dispatcher: mappedGiftData.dispatcher,
            updatedBy: data.userId
          })

          console.log('🔍 [GIFT DELIVERY] Sending Integrated Notification:', {
            giftId: data.giftId,
            targetRoles: ['MKTOPS', 'ADMIN'],
            updatedBy: data.userId
          })

          // Send integrated notification (both notification and email) to MKTOPS and ADMIN
          await IntegratedNotificationService.sendGiftDeliveryNotification(
            mappedGiftData,
            data.userId,
            ['MKTOPS', 'ADMIN']
          )

          console.log('✅ [GIFT DELIVERY] Integrated notification sent successfully')
        }
      } catch (notificationError) {
        console.error('❌ [GIFT DELIVERY] Error sending integrated notification:', notificationError)
        // Don't fail the request if notification/email sending fails
      }
    } else if (data.trackingStatus === 'Delivered' && data.currentGift?.trackingStatus === 'Delivered') {
      console.log("🔍 [GIFT DELIVERY] Delivery status unchanged (already delivered) - skipping notification")
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


