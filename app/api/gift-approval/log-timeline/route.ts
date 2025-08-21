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

// POST - Insert timeline event (for logging status changes)
export async function POST(request: NextRequest) {
  try {
    const { giftId, fromStatus, toStatus, changedBy, remark }: TimelineLogRequest = await request.json()

    // Validate required fields
    if (!giftId || !toStatus || !changedBy) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields: giftId, toStatus, changedBy',
      })
    }

    // Insert into GIFT_WORKFLOW_TIMELINE table
    const insertSQL = `
      INSERT INTO MY_FLOW.PUBLIC.GIFT_WORKFLOW_TIMELINE (
        GIFT_ID, FROM_STATUS, TO_STATUS, CHANGED_BY, CHANGED_AT, REMARK
      ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP(), ?)
    `

    const params = [giftId, fromStatus || null, toStatus, changedBy, remark || null]
    debugSQL(insertSQL, params, 'Gift Workflow Timeline Insert')
    await executeQuery(insertSQL, params)

    return NextResponse.json({
      success: true,
      message: 'Timeline event logged successfully',
    })
  } catch (error) {
    console.error('Error logging timeline event:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to log timeline event',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
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
