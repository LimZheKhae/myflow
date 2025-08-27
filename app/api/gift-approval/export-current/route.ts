import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake/config'
import { debugSQL } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tab = searchParams.get('tab')

    if (!tab) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required parameter: tab',
        },
        { status: 400 }
      )
    }

    // Define the query based on the tab
    let selectSQL = ''
    let params: any[] = []

    switch (tab) {
      case 'processing':
        selectSQL = `
          SELECT 
            GIFT_ID,
            GIFT_ITEM,
            COST_BASE,
            MEMBER_LOGIN,
            DISPATCHER,
            TRACKING_CODE,
            TRACKING_STATUS,
            UPLOADED_BO,
            WORKFLOW_STATUS
          FROM MY_FLOW.PUBLIC.GIFT_DETAILS
          WHERE WORKFLOW_STATUS = 'MKTOps_Processing'
            AND (BATCH_ID IS NULL OR BATCH_ID IN (SELECT BATCH_ID FROM MY_FLOW.PUBLIC.BULK_IMPORT_BATCHES WHERE IS_ACTIVE = TRUE))
          ORDER BY GIFT_ID
        `
        break

      case 'kam-proof':
        selectSQL = `
          SELECT 
            GIFT_ID,
            GIFT_ITEM,
            COST_BASE,
            MEMBER_LOGIN,
            GIFT_FEEDBACK,
            WORKFLOW_STATUS
          FROM MY_FLOW.PUBLIC.GIFT_DETAILS
          WHERE WORKFLOW_STATUS = 'KAM_Proof'
            AND (BATCH_ID IS NULL OR BATCH_ID IN (SELECT BATCH_ID FROM MY_FLOW.PUBLIC.BULK_IMPORT_BATCHES WHERE IS_ACTIVE = TRUE))
          ORDER BY GIFT_ID
        `
        break

      case 'audit':
        selectSQL = `
          SELECT 
            GIFT_ID,
            GIFT_ITEM,
            MEMBER_LOGIN,
            AUDIT_REMARK,
            WORKFLOW_STATUS
          FROM MY_FLOW.PUBLIC.GIFT_DETAILS
          WHERE WORKFLOW_STATUS = 'SalesOps_Audit'
            AND (BATCH_ID IS NULL OR BATCH_ID IN (SELECT BATCH_ID FROM MY_FLOW.PUBLIC.BULK_IMPORT_BATCHES WHERE IS_ACTIVE = TRUE))
          ORDER BY GIFT_ID
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

    debugSQL(selectSQL, params, 'Export Current Gifts')
    const result = await executeQuery(selectSQL, params)

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
