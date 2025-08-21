import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake/config'
import { GiftRequestDetails, GiftFilters, WorkflowStatus, GiftCategory } from '@/types/gift'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Extract query parameters
    const page = parseInt(searchParams.get('page') || '1')

    // Filter parameters
    const workflowStatus = searchParams.get('workflowStatus') as WorkflowStatus | null
    const category = searchParams.get('category') as GiftCategory | null
    const kamRequestedBy = searchParams.get('kamRequestedBy')
    const memberLogin = searchParams.get('memberLogin')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const search = searchParams.get('search')

    // Build WHERE clause
    const whereConditions: string[] = ['1=1'] // Always true condition to start
    const params: any[] = []

    // Only apply workflow status filter if there's no search term
    // This allows searching across all workflow statuses
    if (workflowStatus && !search) {
      whereConditions.push('WORKFLOW_STATUS = ?')
      params.push(workflowStatus)
    }

    if (category) {
      whereConditions.push('CATEGORY = ?')
      params.push(category)
    }

    if (kamRequestedBy) {
      whereConditions.push('KAM_REQUESTED_BY ILIKE ?')
      params.push(`%${kamRequestedBy}%`)
    }

    if (memberLogin) {
      whereConditions.push('MEMBER_LOGIN ILIKE ?')
      params.push(`%${memberLogin}%`)
    }

    if (dateFrom) {
      whereConditions.push('CREATED_DATE >= ?')
      params.push(dateFrom)
    }

    if (dateTo) {
      whereConditions.push('CREATED_DATE <= ?')
      params.push(dateTo)
    }

    if (search) {
      whereConditions.push(`(
        MEMBER_LOGIN ILIKE ? OR 
        FULL_NAME ILIKE ? OR 
        GIFT_ITEM ILIKE ? OR 
        REWARD_NAME ILIKE ? OR
        TRACKING_CODE ILIKE ?
      )`)
      const searchTerm = `%${search}%`
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm)
    }

    // Show gifts from ACTIVE batches or manual gifts (no batch)
    whereConditions.push('(BATCH_ID IS NULL OR BATCH_ID IN (SELECT BATCH_ID FROM MY_FLOW.PUBLIC.BULK_IMPORT_BATCHES WHERE IS_ACTIVE = TRUE))')

    const whereClause = whereConditions.join(' AND ')

    // Count total records
    const countSQL = `
      SELECT COUNT(*) as total
      FROM MY_FLOW.PUBLIC.GIFT_DETAILS
      WHERE ${whereClause}
    `

    const countResult = await executeQuery(countSQL, params)
    const total = (countResult as any[])[0]?.total || 0

    // Fetch paginated data
    const dataSQL = `
             SELECT 
         GIFT_ID,
         VIP_ID,
         BATCH_ID,
         KAM_REQUESTED_BY,
         CREATED_DATE,
         WORKFLOW_STATUS,
         MEMBER_LOGIN,
         FULL_NAME,
         PHONE,
         ADDRESS,
         REWARD_NAME,
         GIFT_ITEM,
         COST_MYR,
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
      WHERE ${whereClause}
      ORDER BY CREATED_DATE DESC, GIFT_ID DESC
    `

    const result = await executeQuery(dataSQL, params)

    // Transform the data to match our TypeScript interface
    const gifts: GiftRequestDetails[] = (result as any[]).map((row: any) => ({
      giftId: row.GIFT_ID,
      vipId: row.VIP_ID,
      batchId: row.BATCH_ID,
      kamRequestedBy: row.KAM_REQUESTED_BY,
      createdDate: row.CREATED_DATE ? new Date(row.CREATED_DATE) : null,
      workflowStatus: row.WORKFLOW_STATUS,
      memberLogin: row.MEMBER_LOGIN,
      fullName: row.FULL_NAME,
      phone: row.PHONE,
      address: row.ADDRESS,
      rewardName: row.REWARD_NAME,
      giftItem: row.GIFT_ITEM,
      costMyr: row.COST_MYR,
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
    }))

    return NextResponse.json({
      success: true,
      data: gifts,
      pagination: {
        page,
        total,
        totalPages: Math.ceil(total / 50),
      },
    })
  } catch (error) {
    console.error('Error fetching gifts:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch gifts',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
