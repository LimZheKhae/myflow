import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake/config'
import { debugSQL } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tab = searchParams.get('tab')
    const merchant = searchParams.get('merchant') // Optional merchant filter
    const userPermissions = searchParams.get('userPermissions') // User permissions for filtering

    if (!tab) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required parameter: tab',
        },
        { status: 400 }
      )
    }

    // Parse user permissions if provided
    let parsedUserPermissions: Record<string, string[]> = {}
    if (userPermissions) {
      try {
        parsedUserPermissions = JSON.parse(userPermissions)
      } catch (error) {
        console.warn('Failed to parse user permissions:', error)
      }
    }

    // Build permission-based WHERE clauses
    const permissionConditions: string[] = []
    const permissionParams: any[] = []

    // Add merchant permission filter if user has merchant restrictions
    if (parsedUserPermissions.merchants && parsedUserPermissions.merchants.length > 0) {
      const merchantPlaceholders = parsedUserPermissions.merchants.map(() => '?').join(',')
      permissionConditions.push(`REF.DESCRIPTION IN (${merchantPlaceholders})`)
      permissionParams.push(...parsedUserPermissions.merchants)
    }

    // Add currency permission filter if user has currency restrictions
    if (parsedUserPermissions.currencies && parsedUserPermissions.currencies.length > 0) {
      const currencyPlaceholders = parsedUserPermissions.currencies.map(() => '?').join(',')
      permissionConditions.push(`GD.CURRENCY IN (${currencyPlaceholders})`)
      permissionParams.push(...parsedUserPermissions.currencies)
    }

    // Add specific merchant filter if requested
    if (merchant && merchant !== 'all') {
      permissionConditions.push('REF.DESCRIPTION = ?')
      permissionParams.push(merchant)
    }

    const permissionWhereClause = permissionConditions.length > 0 ? `AND ${permissionConditions.join(' AND ')}` : ''

    // Define the query based on the tab
    let selectSQL = ''
    let params: any[] = []

    switch (tab) {
      case 'processing':
        selectSQL = `
          SELECT 
            GD.GIFT_ID,
            GD.GIFT_ITEM,
            GD.GIFT_COST,
            GD.MEMBER_LOGIN,
            GD.DISPATCHER,
            GD.TRACKING_CODE,
            GD.TRACKING_STATUS,
            GD.WORKFLOW_STATUS,
            GD.CURRENCY,
            GD.REJECT_REASON,
            REF.DESCRIPTION AS MERCHANT_NAME,
            '' AS DECISION
          FROM MY_FLOW.PUBLIC.GIFT_DETAILS GD
          LEFT JOIN MY_FLOW.MART.ALL_MEMBER_PROFILE MP ON GD.MEMBER_ID = MP.MEMBER_ID
          LEFT JOIN MY_FLOW.GLOBAL_CONFIG.REFERENCE_TABLE REF ON MP.MERCHANT_ID = REF.CODE
          WHERE GD.WORKFLOW_STATUS = 'MKTOps_Processing'
            AND (GD.BATCH_ID IS NULL OR GD.BATCH_ID IN (SELECT BATCH_ID FROM MY_FLOW.PUBLIC.BULK_IMPORT_BATCHES WHERE IS_ACTIVE = TRUE))
            ${permissionWhereClause}
          ORDER BY GD.GIFT_ID
        `
        break

      case 'kam-proof':
        selectSQL = `
          SELECT 
            GD.GIFT_ID,
            GD.GIFT_ITEM,
            GD.GIFT_COST,
            GD.MEMBER_LOGIN,
            GD.GIFT_FEEDBACK,
            GD.WORKFLOW_STATUS,
            GD.CURRENCY,
            REF.DESCRIPTION AS MERCHANT_NAME,
            '' AS DECISION
          FROM MY_FLOW.PUBLIC.GIFT_DETAILS GD
          LEFT JOIN MY_FLOW.MART.ALL_MEMBER_PROFILE MP ON GD.MEMBER_ID = MP.MEMBER_ID
          LEFT JOIN MY_FLOW.GLOBAL_CONFIG.REFERENCE_TABLE REF ON MP.MERCHANT_ID = REF.CODE
          WHERE GD.WORKFLOW_STATUS = 'KAM_Proof'
            AND (GD.BATCH_ID IS NULL OR GD.BATCH_ID IN (SELECT BATCH_ID FROM MY_FLOW.PUBLIC.BULK_IMPORT_BATCHES WHERE IS_ACTIVE = TRUE))
            ${permissionWhereClause}
          ORDER BY GD.GIFT_ID
        `
        break

      case 'audit':
        selectSQL = `
          SELECT 
            GD.GIFT_ID,
            GD.GIFT_ITEM,
            GD.MEMBER_LOGIN,
            GD.AUDIT_REMARK,
            GD.WORKFLOW_STATUS,
            GD.CURRENCY,
            REF.DESCRIPTION AS MERCHANT_NAME,
            '' AS DECISION
          FROM MY_FLOW.PUBLIC.GIFT_DETAILS GD
          LEFT JOIN MY_FLOW.MART.ALL_MEMBER_PROFILE MP ON GD.MEMBER_ID = MP.MEMBER_ID
          LEFT JOIN MY_FLOW.GLOBAL_CONFIG.REFERENCE_TABLE REF ON MP.MERCHANT_ID = REF.CODE
          WHERE GD.WORKFLOW_STATUS = 'SalesOps_Audit'
            AND (GD.BATCH_ID IS NULL OR GD.BATCH_ID IN (SELECT BATCH_ID FROM MY_FLOW.PUBLIC.BULK_IMPORT_BATCHES WHERE IS_ACTIVE = TRUE))
            ${permissionWhereClause}
          ORDER BY GD.GIFT_ID
        `
        break

      default:
        return NextResponse.json(
          {
            success: false,
            message: 'Invalid tab parameter. Must be one of: processing, kam-proof, audit',
          },
          { status: 400 }
        )
    }

    // Combine base params with permission params
    const allParams = [...params, ...permissionParams]

    debugSQL(selectSQL, allParams, 'Export Current Gifts')
    const result = await executeQuery(selectSQL, allParams)

    return NextResponse.json({
      success: true,
      data: result || [],
      message: `Successfully exported ${Array.isArray(result) ? result.length : 0} gifts from ${tab} stage`,
    })
  } catch (error) {
    console.error('Error exporting current gifts:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to export current gifts',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
