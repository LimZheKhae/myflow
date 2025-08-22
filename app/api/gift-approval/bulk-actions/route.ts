import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake/config'
import { WorkflowStatus, TrackingStatus } from '@/types/gift'
import { logBulkWorkflowTimeline } from '@/lib/workflow-timeline'

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      action,
      giftIds,
      workflowStatus,
      targetStatus,
      trackingStatus,
      dispatcher,
      trackingCode,
      kamProof,
      giftFeedback,
      auditRemark,
      uploadedBy,
      reason, // for rejections
      checkerName, // for audit actions
      receiverFeedback, // for KAM proof feedback
      uploadedBo, // for BO status toggle
      tab, // current tab context for better validation
    } = body

    // Validate required fields
    if (!action || !giftIds || !Array.isArray(giftIds) || giftIds.length === 0) {
      return NextResponse.json({ success: false, message: 'Action, giftIds array are required' }, { status: 400 })
    }

    if (!uploadedBy) {
      return NextResponse.json({ success: false, message: 'uploadedBy (user ID) is required for audit trail' }, { status: 400 })
    }

    // Enhanced action types based on BULK_ACTION_SYSTEM document
    const validActions = [
      // Pending tab actions
      'bulk_approve_to_processing',
      'bulk_reject_with_reason',

      // Processing tab actions
      'bulk_reject_from_processing',
      'bulk_reject_with_reason_from_processing', // alias for consistency
      'bulk_set_bo_uploaded',
      'bulk_proceed_to_kam_proof',

      // KAM Proof tab actions
      'bulk_fill_feedback_only',
      'bulk_fill_feedback_and_proceed',
      'bulk_proceed_to_audit',

      // Audit tab actions
      'bulk_mark_completed',
      'bulk_mark_as_issue',

      // Legacy actions (for backward compatibility)
      'approve',
      'reject',
      'process',
      'upload_proof',
      'complete_audit',
      'update_tracking',
      'bulk_status_change',
    ]

    if (!validActions.includes(action)) {
      return NextResponse.json({ success: false, message: `Invalid action. Must be one of: ${validActions.join(', ')}` }, { status: 400 })
    }

    // Enhanced validation based on action type
    const actionValidations: Record<string, () => NextResponse | null> = {
      bulk_reject_with_reason: () => (!reason ? NextResponse.json({ success: false, message: 'Rejection reason is required' }, { status: 400 }) : null),

      bulk_reject_from_processing: () => (!reason ? NextResponse.json({ success: false, message: 'Rejection reason is required' }, { status: 400 }) : null),

      bulk_reject_with_reason_from_processing: () => (!reason ? NextResponse.json({ success: false, message: 'Rejection reason is required' }, { status: 400 }) : null),

      bulk_proceed_to_kam_proof: () => {
        // Validation will be done at application level for required fields
        // We need to check DISPATCHER, TRACKING_CODE, TRACKING_STATUS='Delivered', UPLOADED_BO=TRUE
        return null
      },

      bulk_fill_feedback_only: () => (!receiverFeedback ? NextResponse.json({ success: false, message: 'Receiver feedback is required' }, { status: 400 }) : null),

      bulk_fill_feedback_and_proceed: () => (!receiverFeedback ? NextResponse.json({ success: false, message: 'Receiver feedback is required' }, { status: 400 }) : null),

      bulk_mark_completed: () => (!checkerName ? NextResponse.json({ success: false, message: 'Checker name is required for audit completion' }, { status: 400 }) : null),

      bulk_mark_as_issue: () => (!checkerName ? NextResponse.json({ success: false, message: 'Checker name is required for marking as issue' }, { status: 400 }) : null),

      // Legacy validations
      approve: () => (!targetStatus ? NextResponse.json({ success: false, message: 'targetStatus is required for approve action' }, { status: 400 }) : null),

      reject: () => (!reason ? NextResponse.json({ success: false, message: 'reason is required for reject action' }, { status: 400 }) : null),

      process: () => (!dispatcher || !trackingCode || !trackingStatus ? NextResponse.json({ success: false, message: 'dispatcher, trackingCode, and trackingStatus are required for process action' }, { status: 400 }) : null),

      complete_audit: () => (!auditRemark ? NextResponse.json({ success: false, message: 'auditRemark is required for complete_audit action' }, { status: 400 }) : null),
    }

    const validationError = actionValidations[action]?.()
    if (validationError) return validationError

    // Get current gift statuses before update for timeline logging
    const currentGiftsSQL = `
      SELECT GIFT_ID, WORKFLOW_STATUS
      FROM MY_FLOW.PUBLIC.GIFT_DETAILS
      WHERE GIFT_ID IN (${giftIds.map(() => '?').join(',')})
    `

    const currentGiftsResult = (await executeQuery(currentGiftsSQL, giftIds)) as any[]
    const currentGiftsMap = new Map(currentGiftsResult.map((g) => [g.GIFT_ID, g.WORKFLOW_STATUS]))

    // Build update fields based on action
    let updateFields: string[] = []
    let updateParams: any[] = []
    let timelineEntries: Array<{
      giftId: number
      fromStatus: string | null
      toStatus: string
      changedBy: string
      remark?: string
    }> = []

    const userId = uploadedBy

    // Enhanced action handling based on BULK_ACTION_SYSTEM
    switch (action) {
      // PENDING TAB ACTIONS
      case 'bulk_approve_to_processing':
        updateFields.push('WORKFLOW_STATUS = ?', 'APPROVAL_REVIEWED_BY = ?', 'REJECT_REASON = ?')
        updateParams.push('MKTOps_Processing', userId, null)
        giftIds.forEach((giftId) => {
          timelineEntries.push({
            giftId,
            fromStatus: currentGiftsMap.get(giftId) || null,
            toStatus: 'MKTOps_Processing',
            changedBy: userId,
            remark: 'Bulk approved by manager',
          })
        })
        break

      case 'bulk_reject_with_reason':
        updateFields.push('WORKFLOW_STATUS = ?', 'APPROVAL_REVIEWED_BY = ?', 'REJECT_REASON = ?')
        updateParams.push('Rejected', userId, reason)
        giftIds.forEach((giftId) => {
          timelineEntries.push({
            giftId,
            fromStatus: currentGiftsMap.get(giftId) || null,
            toStatus: 'Rejected',
            changedBy: userId,
            remark: `Bulk rejected: ${reason}`,
          })
        })
        break

      // PROCESSING TAB ACTIONS
      case 'bulk_reject_from_processing':
        updateFields.push('WORKFLOW_STATUS = ?', 'PURCHASED_BY = ?', 'REJECT_REASON = ?')
        updateParams.push('Rejected', userId, reason)
        giftIds.forEach((giftId) => {
          timelineEntries.push({
            giftId,
            fromStatus: currentGiftsMap.get(giftId) || null,
            toStatus: 'Rejected',
            changedBy: userId,
            remark: `Rejected from processing: ${reason}`,
          })
        })
        break

      case 'bulk_set_bo_uploaded':
        console.log('🔍 [BULK SET BO UPLOADED] Debug Info:', {
          action: 'bulk_set_bo_uploaded',
          giftIds,
          giftIdsCount: giftIds.length,
          uploadedBo,
          uploadedBoType: typeof uploadedBo,
          userId,
          currentGiftsMap: Object.fromEntries(currentGiftsMap),
          updateFields: [...updateFields],
          updateParams: [...updateParams],
        })

        updateFields.push('UPLOADED_BO = ?')
        const boValue = uploadedBo !== undefined ? uploadedBo : true
        console.log('BO Value:', boValue)
        updateParams.push(boValue)

        console.log('🔍 [BULK SET BO UPLOADED] Update Parameters:', {
          boValue,
          boValueType: typeof boValue,
          finalUpdateFields: [...updateFields],
          finalUpdateParams: [...updateParams],
        })

        // BO upload actions do NOT create timeline entries since workflow status doesn't change
        console.log("🔍 [BULK SET BO UPLOADED] No Timeline Entries (BO actions don't change workflow):", {
          giftIds,
          giftIdsCount: giftIds.length,
          message: 'BO upload actions only update UPLOADED_BO field, not workflow status',
        })
        break

      case 'bulk_proceed_to_kam_proof':
        // First validate required fields for all selected gifts
        const validationSQL = `
          SELECT GIFT_ID, DISPATCHER, TRACKING_CODE, TRACKING_STATUS, UPLOADED_BO
          FROM MY_FLOW.PUBLIC.GIFT_DETAILS
          WHERE GIFT_ID IN (${giftIds.map(() => '?').join(',')})
        `
        const validationResult = (await executeQuery(validationSQL, giftIds)) as any[]

        const invalidGifts = validationResult.filter((gift) => !gift.DISPATCHER || !gift.TRACKING_CODE || gift.TRACKING_STATUS !== 'Delivered' || gift.UPLOADED_BO !== true)
        console.log('🔍 [BULK PROCEED TO KAM PROOF] Invalid Gifts:', {
          invalidGifts,
          invalidGiftsCount: invalidGifts.length,
          validationResult,
          validationResultCount: validationResult.length,
        })
        if (invalidGifts.length > 0) {
          const invalidDetails = invalidGifts.map((gift) => ({
            giftId: gift.GIFT_ID,
            issues: [!gift.DISPATCHER ? 'Missing DISPATCHER' : null, !gift.TRACKING_CODE ? 'Missing TRACKING_CODE' : null, gift.TRACKING_STATUS !== 'Delivered' ? `TRACKING_STATUS must be 'Delivered' (current: ${gift.TRACKING_STATUS})` : null, gift.UPLOADED_BO !== true ? 'UPLOADED_BO must be TRUE' : null].filter(Boolean),
          }))

          return NextResponse.json(
            {
              success: false,
              message: `${invalidGifts.length} gift(s) do not meet requirements for proceeding to KAM Proof`,
              invalidGifts: invalidDetails,
            },
            { status: 400 }
          )
        }

        updateFields.push('WORKFLOW_STATUS = ?', 'PURCHASED_BY = ?')
        updateParams.push('KAM_Proof', userId)
        giftIds.forEach((giftId) => {
          timelineEntries.push({
            giftId,
            fromStatus: currentGiftsMap.get(giftId) || null,
            toStatus: 'KAM_Proof',
            changedBy: userId,
            remark: 'Bulk proceeded to KAM Proof stage (validated)',
          })
        })
        break

      case 'bulk_reject_with_reason_from_processing':
        updateFields.push('WORKFLOW_STATUS = ?', 'PURCHASED_BY = ?', 'REJECT_REASON = ?')
        updateParams.push('Rejected', userId, reason)
        giftIds.forEach((giftId) => {
          timelineEntries.push({
            giftId,
            fromStatus: currentGiftsMap.get(giftId) || null,
            toStatus: 'Rejected',
            changedBy: userId,
            remark: `Rejected from processing: ${reason}`,
          })
        })
        break

      // KAM PROOF TAB ACTIONS
      case 'bulk_fill_feedback_only':
        updateFields.push('GIFT_FEEDBACK = ?', 'KAM_PROOF_BY = ?')
        updateParams.push(receiverFeedback, userId)
        giftIds.forEach((giftId) => {
          timelineEntries.push({
            giftId,
            fromStatus: currentGiftsMap.get(giftId) || null,
            toStatus: currentGiftsMap.get(giftId) || 'KAM_Proof',
            changedBy: userId,
            remark: `Bulk feedback added: ${receiverFeedback}`,
          })
        })
        break

      case 'bulk_fill_feedback_and_proceed':
        updateFields.push('GIFT_FEEDBACK = ?', 'KAM_PROOF_BY = ?', 'WORKFLOW_STATUS = ?')
        updateParams.push(receiverFeedback, userId, 'SalesOps_Audit')
        giftIds.forEach((giftId) => {
          timelineEntries.push({
            giftId,
            fromStatus: currentGiftsMap.get(giftId) || null,
            toStatus: 'SalesOps_Audit',
            changedBy: userId,
            remark: `Bulk feedback added and proceeded to audit: ${receiverFeedback}`,
          })
        })
        break

      case 'bulk_proceed_to_audit':
        // First validate that all selected gifts have feedback
        const feedbackValidationSQL = `
          SELECT GIFT_ID, GIFT_FEEDBACK
          FROM MY_FLOW.PUBLIC.GIFT_DETAILS
          WHERE GIFT_ID IN (${giftIds.map(() => '?').join(',')})
        `
        const feedbackValidationResult = (await executeQuery(feedbackValidationSQL, giftIds)) as any[]

        const giftsWithoutFeedback = feedbackValidationResult.filter((gift) => !gift.GIFT_FEEDBACK || gift.GIFT_FEEDBACK.trim() === '')

        if (giftsWithoutFeedback.length > 0) {
          return NextResponse.json(
            {
              success: false,
              message: `${giftsWithoutFeedback.length} gift(s) do not have feedback`,
              invalidGifts: giftsWithoutFeedback.map((gift) => ({
                giftId: gift.GIFT_ID,
                issues: ['Missing or empty GIFT_FEEDBACK'],
              })),
              requiresModal: true, // Signal frontend to show feedback modal
            },
            { status: 400 }
          )
        }

        updateFields.push('WORKFLOW_STATUS = ?', 'KAM_PROOF_BY = ?')
        updateParams.push('SalesOps_Audit', userId)
        giftIds.forEach((giftId) => {
          timelineEntries.push({
            giftId,
            fromStatus: currentGiftsMap.get(giftId) || null,
            toStatus: 'SalesOps_Audit',
            changedBy: userId,
            remark: 'Bulk proceeded to audit stage (validated)',
          })
        })
        break

      // AUDIT TAB ACTIONS
      case 'bulk_mark_completed':
        updateFields.push('WORKFLOW_STATUS = ?', 'AUDITED_BY = ?', 'AUDIT_DATE = CURRENT_TIMESTAMP()')
        updateParams.push('Completed', checkerName)
        if (auditRemark) {
          updateFields.push('AUDIT_REMARK = ?')
          updateParams.push(auditRemark)
        }
        giftIds.forEach((giftId) => {
          timelineEntries.push({
            giftId,
            fromStatus: currentGiftsMap.get(giftId) || null,
            toStatus: 'Completed',
            changedBy: userId,
            remark: `Bulk marked as completed by ${checkerName}${auditRemark ? ': ' + auditRemark : ''}`,
          })
        })
        break

      case 'bulk_mark_as_issue':
        updateFields.push('WORKFLOW_STATUS = ?', 'AUDITED_BY = ?')
        updateParams.push('KAM_Proof', checkerName)
        if (auditRemark) {
          updateFields.push('AUDIT_REMARK = ?')
          updateParams.push(auditRemark)
        }
        giftIds.forEach((giftId) => {
          timelineEntries.push({
            giftId,
            fromStatus: currentGiftsMap.get(giftId) || null,
            toStatus: 'KAM_Proof',
            changedBy: userId,
            remark: `Bulk marked as issue by ${checkerName}${auditRemark ? ': ' + auditRemark : ''}`,
          })
        })
        break

      // LEGACY ACTIONS (for backward compatibility)
      case 'approve':
        updateFields.push('WORKFLOW_STATUS = ?', 'APPROVAL_REVIEWED_BY = ?', 'REJECT_REASON = ?')
        updateParams.push(targetStatus || workflowStatus, userId, null)
        giftIds.forEach((giftId) => {
          timelineEntries.push({
            giftId,
            fromStatus: currentGiftsMap.get(giftId) || null,
            toStatus: targetStatus || workflowStatus || 'Manager_Review',
            changedBy: userId,
            remark: 'Legacy bulk approve',
          })
        })
        break

      case 'reject':
        updateFields.push('WORKFLOW_STATUS = ?', 'APPROVAL_REVIEWED_BY = ?', 'REJECT_REASON = ?')
        updateParams.push(targetStatus || 'Rejected', userId, reason)
        giftIds.forEach((giftId) => {
          timelineEntries.push({
            giftId,
            fromStatus: currentGiftsMap.get(giftId) || null,
            toStatus: targetStatus || 'Rejected',
            changedBy: userId,
            remark: `Legacy bulk reject: ${reason}`,
          })
        })
        break

      case 'process':
        updateFields.push('WORKFLOW_STATUS = ?', 'DISPATCHER = ?', 'TRACKING_CODE = ?', 'TRACKING_STATUS = ?', 'PURCHASED_BY = ?', 'MKT_PURCHASE_DATE = CURRENT_TIMESTAMP()')
        updateParams.push('MKTOps_Processing', dispatcher, trackingCode, trackingStatus, userId)
        giftIds.forEach((giftId) => {
          timelineEntries.push({
            giftId,
            fromStatus: currentGiftsMap.get(giftId) || null,
            toStatus: 'MKTOps_Processing',
            changedBy: userId,
            remark: `Legacy bulk process: ${dispatcher}, ${trackingCode}`,
          })
        })
        break

      case 'upload_proof':
        updateFields.push('WORKFLOW_STATUS = ?', 'KAM_PROOF_BY = ?')
        updateParams.push('KAM_Proof', userId)
        if (kamProof !== undefined) {
          updateFields.push('KAM_PROOF = ?')
          updateParams.push(kamProof)
        }
        if (giftFeedback !== undefined) {
          updateFields.push('GIFT_FEEDBACK = ?')
          updateParams.push(giftFeedback)
        }
        giftIds.forEach((giftId) => {
          timelineEntries.push({
            giftId,
            fromStatus: currentGiftsMap.get(giftId) || null,
            toStatus: 'KAM_Proof',
            changedBy: userId,
            remark: 'Legacy bulk proof upload',
          })
        })
        break

      case 'complete_audit':
        updateFields.push('WORKFLOW_STATUS = ?', 'AUDIT_REMARK = ?', 'AUDITED_BY = ?', 'AUDIT_DATE = CURRENT_TIMESTAMP()')
        updateParams.push('Completed', auditRemark, userId)
        giftIds.forEach((giftId) => {
          timelineEntries.push({
            giftId,
            fromStatus: currentGiftsMap.get(giftId) || null,
            toStatus: 'Completed',
            changedBy: userId,
            remark: `Legacy bulk audit complete: ${auditRemark}`,
          })
        })
        break

      case 'update_tracking':
        if (trackingStatus) {
          updateFields.push('TRACKING_STATUS = ?')
          updateParams.push(trackingStatus)
        }
        if (dispatcher) {
          updateFields.push('DISPATCHER = ?')
          updateParams.push(dispatcher)
        }
        if (trackingCode) {
          updateFields.push('TRACKING_CODE = ?')
          updateParams.push(trackingCode)
        }
        giftIds.forEach((giftId) => {
          timelineEntries.push({
            giftId,
            fromStatus: currentGiftsMap.get(giftId) || null,
            toStatus: currentGiftsMap.get(giftId) || 'MKTOps_Processing',
            changedBy: userId,
            remark: 'Legacy bulk tracking update',
          })
        })
        break

      case 'bulk_status_change':
        if (workflowStatus) {
          updateFields.push('WORKFLOW_STATUS = ?')
          updateParams.push(workflowStatus)
        }
        if (trackingStatus) {
          updateFields.push('TRACKING_STATUS = ?')
          updateParams.push(trackingStatus)
        }
        giftIds.forEach((giftId) => {
          timelineEntries.push({
            giftId,
            fromStatus: currentGiftsMap.get(giftId) || null,
            toStatus: workflowStatus || currentGiftsMap.get(giftId) || 'Unknown',
            changedBy: userId,
            remark: 'Legacy bulk status change',
          })
        })
        break
    }

    // Always update last modified date
    updateFields.push('LAST_MODIFIED_DATE = CURRENT_TIMESTAMP()')

    if (updateFields.length === 0) {
      return NextResponse.json({ success: false, message: 'No fields to update' }, { status: 400 })
    }

    // Execute the update in a transaction
    try {
      console.log('🔍 [BULK ACTIONS] Starting Transaction:', {
        action,
        giftIds,
        giftIdsCount: giftIds.length,
        updateFields,
        updateParams,
        isBOAction: action === 'bulk_set_bo_uploaded',
      })

      await executeQuery('BEGIN TRANSACTION')

      // Build the WHERE clause for multiple gift IDs
      const placeholders = giftIds.map(() => '?').join(',')
      const whereClause = `GIFT_ID IN (${placeholders})`

      const sql = `
        UPDATE MY_FLOW.PUBLIC.GIFT_DETAILS
        SET ${updateFields.join(', ')}
        WHERE ${whereClause}
      `

      // Add gift IDs to parameters
      const allParams = [...updateParams, ...giftIds]

      console.log('🔍 [BULK ACTIONS] Executing SQL:', {
        action,
        sql,
        allParams,
        allParamsLength: allParams.length,
        isBOAction: action === 'bulk_set_bo_uploaded',
      })

      const result = await executeQuery(sql, allParams)

      console.log('🔍 [BULK ACTIONS] SQL Result:', {
        action,
        result,
        resultType: typeof result,
        isArray: Array.isArray(result),
        resultLength: Array.isArray(result) ? result.length : 'N/A',
        isBOAction: action === 'bulk_set_bo_uploaded',
      })

      // Snowflake returns affected rows in a specific format
      const affectedRows = (result as any[])[0]?.['number of rows updated'] || 0

      console.log('🔍 [BULK ACTIONS] Affected Rows:', {
        action,
        affectedRows,
        affectedRowsType: typeof affectedRows,
        isBOAction: action === 'bulk_set_bo_uploaded',
      })

      if (affectedRows === 0) {
        console.log('🔍 [BULK ACTIONS] No Rows Affected - Rolling Back:', {
          action,
          giftIds,
          giftIdsLength: giftIds.length,
          currentGiftsFound: currentGiftsResult.length,
          sql,
          allParams,
          isBOAction: action === 'bulk_set_bo_uploaded',
        })
        await executeQuery('ROLLBACK')
        return NextResponse.json(
          {
            success: false,
            message: 'No gifts found or no changes made',
            debug: {
              action,
              giftIds,
              giftIdsLength: giftIds.length,
              currentGiftsFound: currentGiftsResult.length,
              sql,
              allParams,
            },
          },
          { status: 404 }
        )
      }

      // Log workflow timeline entries
      if (timelineEntries.length > 0) {
        console.log('🔍 [BULK ACTIONS] Logging Timeline Entries:', {
          action,
          timelineEntriesCount: timelineEntries.length,
          timelineEntries,
          isBOAction: action === 'bulk_set_bo_uploaded',
        })
        await logBulkWorkflowTimeline(timelineEntries)
      }

      // Commit the transaction
      console.log('🔍 [BULK ACTIONS] Committing Transaction:', {
        action,
        affectedRows,
        timelineEntriesCount: timelineEntries.length,
        isBOAction: action === 'bulk_set_bo_uploaded',
      })
      await executeQuery('COMMIT')

      // Get updated gift details for response
      const updatedGiftsSQL = `
        SELECT GIFT_ID, WORKFLOW_STATUS, TRACKING_STATUS, LAST_MODIFIED_DATE
        FROM MY_FLOW.PUBLIC.GIFT_DETAILS
        WHERE GIFT_ID IN (${placeholders})
        ORDER BY GIFT_ID
      `

      const updatedGiftsResult = await executeQuery(updatedGiftsSQL, giftIds)
      const updatedGifts = updatedGiftsResult as any[]

      const responseData = {
        success: true,
        message: `Bulk ${action} completed successfully`,
        data: {
          action,
          totalRequested: giftIds.length,
          affectedRows,
          timelineEntriesLogged: timelineEntries.length,
          updatedGifts: updatedGifts.map((gift) => ({
            giftId: gift.GIFT_ID,
            workflowStatus: gift.WORKFLOW_STATUS,
            trackingStatus: gift.TRACKING_STATUS,
            lastModified: gift.LAST_MODIFIED_DATE,
          })),
        },
      }

      console.log('🔍 [BULK ACTIONS] Final Response:', {
        action,
        responseData,
        isBOAction: action === 'bulk_set_bo_uploaded',
      })

      return NextResponse.json(responseData)
    } catch (transactionError) {
      // Rollback on any error
      try {
        await executeQuery('ROLLBACK')
      } catch (rollbackError) {
        console.error('Error rolling back transaction:', rollbackError)
      }
      throw transactionError
    }
  } catch (error) {
    console.error('Error performing bulk action:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to perform bulk action',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
