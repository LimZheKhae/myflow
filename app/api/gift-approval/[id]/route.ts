import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake/config'
import { GiftRequestDetails, WorkflowStatus, TrackingStatus } from '@/types/gift'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const giftId = parseInt(params.id)

    if (isNaN(giftId)) {
      return NextResponse.json({ success: false, message: 'Invalid gift ID' }, { status: 400 })
    }

    const sql = `
      SELECT 
        GIFT_ID,
        VIP_ID,
        BATCH_ID,
        KAM_REQUESTED_BY,
        CREATED_DATE,
        WORKFLOW_STATUS,
        MEMBER_ID,
        MEMBER_LOGIN,
        FULL_NAME,
        PHONE,
        ADDRESS,
        REWARD_NAME,
        GIFT_ITEM,
        COST_BASE,
        COST_VND,
        REMARK,
        REWARD_CLUB_ORDER,
        CATEGORY,
        APPROVAL_REVIEWED_BY,
        DISPATCHER,
        TRACKING_CODE,
        TRACKING_STATUS,
        PURCHASED_BY,
        MKT_PURCHASE_DATE,
        UPLOADED_BO,
        MKT_PROOF,
        KAM_PROOF,
        KAM_PROOF_BY,
        GIFT_FEEDBACK,
        AUDITED_BY,
        AUDIT_DATE,
        AUDIT_REMARK,
        REJECT_REASON,
        LAST_MODIFIED_DATE
      FROM MY_FLOW.PUBLIC.GIFT_DETAILS
      WHERE GIFT_ID = ?
        AND (BATCH_ID IS NULL OR BATCH_ID IN (SELECT BATCH_ID FROM MY_FLOW.PUBLIC.BULK_IMPORT_BATCHES WHERE IS_ACTIVE = TRUE))
    `

    const result = await executeQuery(sql, [giftId])
    const rows = result as any[]

    if (rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Gift not found' }, { status: 404 })
    }

    const row = rows[0]
    const gift: GiftRequestDetails = {
      giftId: row.GIFT_ID,
      memberId: row.MEMBER_ID?.toString() || null,
      kamRequestedBy: row.KAM_REQUESTED_BY,
      createdDate: row.CREATED_DATE ? new Date(row.CREATED_DATE) : null,
      workflowStatus: row.WORKFLOW_STATUS,
      memberLogin: row.MEMBER_LOGIN,
      fullName: row.FULL_NAME,
      phone: row.PHONE,
      address: row.ADDRESS,
      rewardName: row.REWARD_NAME,
      giftItem: row.GIFT_ITEM,
      costMyr: row.COST_BASE,
      costVnd: row.COST_VND,
      remark: row.REMARK,
      rewardClubOrder: row.REWARD_CLUB_ORDER,
      category: row.CATEGORY,
      approvalReviewedBy: row.APPROVAL_REVIEWED_BY,
      dispatcher: row.DISPATCHER,
      trackingCode: row.TRACKING_CODE,
      trackingStatus: row.TRACKING_STATUS,
      purchasedBy: row.PURCHASED_BY,
      mktPurchaseDate: row.MKT_PURCHASE_DATE ? new Date(row.MKT_PURCHASE_DATE) : null,
      uploadedBo: row.UPLOADED_BO,
      mktProof: row.MKT_PROOF,
      kamProof: row.KAM_PROOF,
      kamProofBy: row.KAM_PROOF_BY,
      giftFeedback: row.GIFT_FEEDBACK,
      auditedBy: row.AUDITED_BY,
      auditDate: row.AUDIT_DATE ? new Date(row.AUDIT_DATE) : null,
      auditRemark: row.AUDIT_REMARK,
      rejectReason: row.REJECT_REASON,
      lastModifiedDate: row.LAST_MODIFIED_DATE ? new Date(row.LAST_MODIFIED_DATE) : null,
    }

    return NextResponse.json({
      success: true,
      data: gift,
    })
  } catch (error) {
    console.error('Error fetching gift details:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch gift details',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const giftId = parseInt(params.id)

    if (isNaN(giftId)) {
      return NextResponse.json({ success: false, message: 'Invalid gift ID' }, { status: 400 })
    }

    const body = await request.json()
    const { workflowStatus, trackingStatus, dispatcher, trackingCode, kamProof, giftFeedback, auditRemark, uploadedBy } = body

    // Validate required fields based on workflow status
    if (workflowStatus === 'MKTOps_Processing') {
      if (!dispatcher || !trackingCode || !trackingStatus) {
        return NextResponse.json({ success: false, message: 'Dispatcher, tracking code, and tracking status are required for MKTOps processing' }, { status: 400 })
      }
    }

    if (workflowStatus === 'SalesOps_Audit') {
      if (!auditRemark) {
        return NextResponse.json({ success: false, message: 'Audit remark is required for SalesOps audit' }, { status: 400 })
      }
    }

    // Build update fields based on workflow status
    let updateFields: string[] = []
    let updateParams: any[] = []

    if (workflowStatus) {
      updateFields.push('WORKFLOW_STATUS = ?')
      updateParams.push(workflowStatus)
    }

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

    if (kamProof !== undefined) {
      updateFields.push('KAM_PROOF = ?')
      updateParams.push(kamProof)
    }

    if (giftFeedback !== undefined) {
      updateFields.push('GIFT_FEEDBACK = ?')
      updateParams.push(giftFeedback)
    }

    if (auditRemark) {
      updateFields.push('AUDIT_REMARK = ?')
      updateParams.push(auditRemark)
    }

    // Set appropriate user fields based on workflow status
    if (workflowStatus === 'MKTOps_Processing') {
      updateFields.push('PURCHASED_BY = ?')
      updateParams.push(uploadedBy)
      updateFields.push('MKT_PURCHASE_DATE = CURRENT_TIMESTAMP()')
    }

    if (workflowStatus === 'KAM_Proof') {
      updateFields.push('KAM_PROOF_BY = ?')
      updateParams.push(uploadedBy)
    }

    if (workflowStatus === 'SalesOps_Audit') {
      updateFields.push('AUDITED_BY = ?')
      updateParams.push(uploadedBy)
      updateFields.push('AUDIT_DATE = CURRENT_TIMESTAMP()')
    }

    // Always update last modified date
    updateFields.push('LAST_MODIFIED_DATE = CURRENT_TIMESTAMP()')

    if (updateFields.length === 0) {
      return NextResponse.json({ success: false, message: 'No fields to update' }, { status: 400 })
    }

    const sql = `
      UPDATE MY_FLOW.PUBLIC.GIFT_DETAILS
      SET ${updateFields.join(', ')}
      WHERE GIFT_ID = ?
        AND (BATCH_ID IS NULL OR BATCH_ID IN (SELECT BATCH_ID FROM MY_FLOW.PUBLIC.BULK_IMPORT_BATCHES WHERE IS_ACTIVE = TRUE))
    `

    updateParams.push(giftId)

    const result = await executeQuery(sql, updateParams)
    const affectedRows = (result as any).affectedRows || 0

    if (affectedRows === 0) {
      return NextResponse.json({ success: false, message: 'Gift not found or no changes made' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Gift updated successfully',
      data: {
        giftId: giftId, // Return the gift ID for logging
        affectedRows,
      },
    })
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
