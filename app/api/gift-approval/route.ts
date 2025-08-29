import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake/config'
import { GiftRequestDetails, GiftRequestDetailsView, GiftFilters, WorkflowStatus, GiftCategory } from '@/types/gift'
import { debugSQL } from '@/lib/utils'

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
        CAST(GIFT_ID AS VARCHAR) ILIKE ? OR
        MEMBER_LOGIN ILIKE ? OR 
        FULL_NAME ILIKE ? OR 
        GIFT_ITEM ILIKE ? OR 
        REWARD_NAME ILIKE ? OR
        TRACKING_CODE ILIKE ? OR
        KAM_NAME ILIKE ? OR
        KAM_EMAIL ILIKE ?
      )`)
      const searchTerm = `%${search}%`
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm)
    }

    const whereClause = whereConditions.join(' AND ')

    // Count total records using the view
    const countSQL = `
      SELECT COUNT(*) as total
      FROM MY_FLOW.PRESENTATION.VIEW_GIFT_DETAILS
      WHERE ${whereClause}
    `

    const countResult = await executeQuery(countSQL, params)
    const total = (countResult as any[])[0]?.total || 0

    // Fetch paginated data using the view for display
    const dataSQL = `
      SELECT 
        GIFT_ID,
        MERCHANT_NAME,
        KAM_NAME,
        KAM_EMAIL,
        CREATED_DATE,
        WORKFLOW_STATUS,
        MEMBER_ID,
        MEMBER_LOGIN,
        FULL_NAME,
        PHONE,
        ADDRESS,
        REWARD_NAME,
        GIFT_ITEM,
        GIFT_COST,
        CURRENCY,
        DESCRIPTION,
        REWARD_CLUB_ORDER,
        CATEGORY,
        MANAGER_NAME,
        MANAGER_EMAIL,
        REJECT_REASON,
        DISPATCHER,
        TRACKING_CODE,
        TRACKING_STATUS,
        MKTOPS_NAME,
        MKTOPS_EMAIL,
        MKT_PURCHASE_DATE,
        UPLOADED_BO,
        MKT_PROOF,
        KAM_PROOF,
        KAM_PROOF_NAME,
        KAM_PROOF_EMAIL,
        GIFT_FEEDBACK,
        AUDITER_NAME,
        AUDITER_EMAIL,
        AUDIT_DATE,
        AUDIT_REMARK,
        LAST_MODIFIED_DATE
      FROM MY_FLOW.PRESENTATION.VIEW_GIFT_DETAILS
      WHERE ${whereClause}
      ORDER BY CREATED_DATE DESC, GIFT_ID DESC
    `
    debugSQL(dataSQL, params)

    const result = await executeQuery(dataSQL, params)

    // Transform the data to match our TypeScript interface using view data
    const gifts: GiftRequestDetailsView[] = (result as any[]).map((row: any) => ({
      giftId: row.GIFT_ID,
      merchantName: row.MERCHANT_NAME,
      kamRequestedBy: row.KAM_NAME,
      kamEmail: row.KAM_EMAIL,
      memberId: row.MEMBER_ID,
      createdDate: row.CREATED_DATE ? new Date(row.CREATED_DATE) : null,
      workflowStatus: row.WORKFLOW_STATUS,
      memberLogin: row.MEMBER_LOGIN,
      fullName: row.FULL_NAME,
      phone: row.PHONE,
      address: row.ADDRESS,
      rewardName: row.REWARD_NAME,
      giftItem: row.GIFT_ITEM,
      giftCost: row.GIFT_COST,
      currency: row.CURRENCY,
      description: row.DESCRIPTION,
      rewardClubOrder: row.REWARD_CLUB_ORDER,
      category: row.CATEGORY,
      approvalReviewedBy: row.MANAGER_NAME,
      managerEmail: row.MANAGER_EMAIL,
      dispatcher: row.DISPATCHER,
      trackingCode: row.TRACKING_CODE,
      trackingStatus: row.TRACKING_STATUS,
      purchasedBy: row.MKTOPS_NAME,
      mktOpsEmail: row.MKTOPS_EMAIL,
      mktPurchaseDate: row.MKT_PURCHASE_DATE ? new Date(row.MKT_PURCHASE_DATE) : null,
      uploadedBo: row.UPLOADED_BO,
      mktProof: row.MKT_PROOF,
      kamProof: row.KAM_PROOF,
      kamProofBy: row.KAM_PROOF_NAME,
      kamProofEmail: row.KAM_PROOF_EMAIL,
      giftFeedback: row.GIFT_FEEDBACK,
      auditorName: row.AUDITER_NAME,
      auditorEmail: row.AUDITER_EMAIL,
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
        totalPages: Math.ceil(total / 25), // Updated to match frontend default
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
