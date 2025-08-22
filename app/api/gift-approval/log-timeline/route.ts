import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake/config'
import { debugSQL } from '@/lib/utils'

interface TimelineLogRequest {
  giftId: number
  fromStatus: string
  toStatus: string
  changedBy: string
  remark?: string
}

// POST - Insert timeline event (DEPRECATED - timeline logging now handled automatically in each API)
export async function POST(request: NextRequest) {
  try {
    console.warn('⚠️ DEPRECATED: Direct timeline logging via /api/gift-approval/log-timeline is deprecated. Timeline events are now automatically logged in each API endpoint.')

    const { giftId, fromStatus, toStatus, changedBy, remark }: TimelineLogRequest = await request.json()

    // Return deprecation notice instead of processing
    return NextResponse.json(
      {
        success: false,
        message: 'DEPRECATED: Direct timeline logging is no longer supported. Timeline events are automatically logged in each API endpoint.',
        deprecated: true,
      },
      { status: 410 }
    ) // 410 Gone - indicates the resource is no longer available
  } catch (error) {
    console.error('Error in deprecated timeline endpoint:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'DEPRECATED: This endpoint is no longer supported',
        deprecated: true,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 410 }
    )
  }
}

// GET - Fetch timeline events for a specific gift (for View modal)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const giftId = searchParams.get('giftId')

    if (!giftId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required parameter: giftId',
        },
        { status: 400 }
      )
    }

    // Fetch timeline events for the specific gift
    const selectSQL = `
      SELECT 
        ID,
        GIFT_ID,
        FROM_STATUS,
        TO_STATUS,
        CHANGED_BY,
        CHANGED_AT,
        REMARK
      FROM MY_FLOW.PUBLIC.GIFT_WORKFLOW_TIMELINE
      WHERE GIFT_ID = ?
      ORDER BY CHANGED_AT DESC
    `

    const params = [parseInt(giftId)]
    debugSQL(selectSQL, params, 'Gift Workflow Timeline Fetch')
    const result = await executeQuery(selectSQL, params)

    return NextResponse.json({
      success: true,
      data: result || [],
      message: 'Timeline events fetched successfully',
    })
  } catch (error) {
    console.error('Error fetching timeline events:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch timeline events',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
