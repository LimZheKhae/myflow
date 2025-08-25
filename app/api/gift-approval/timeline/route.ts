import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake/config'

// Type definitions for timeline data
interface TimelineEvent {
  WORKFLOW_ID: number
  GIFT_ID: number
  FROM_STATUS: string | null
  TO_STATUS: string
  UPDATE_DATE: string
  UPDATE_TIME: string
  REMARK: string | null
}

interface TimelineResponse {
  success: boolean
  timeline: TimelineEvent[]
  count: number
  message?: string
}

export async function GET(request: NextRequest): Promise<NextResponse<TimelineResponse>> {
  try {
    const { searchParams } = new URL(request.url)
    const giftId = searchParams.get('giftId')

    if (!giftId) {
      return NextResponse.json(
        { 
          success: false, 
          timeline: [], 
          count: 0,
          message: 'Gift ID is required' 
        },
        { status: 400 }
      )
    }

    // Query the workflow timeline view
    const query = `
      SELECT 
        WORKFLOW_ID,
        GIFT_ID,
        FROM_STATUS,
        TO_STATUS,
        UPDATE_DATE,
        UPDATE_TIME,
        REMARK
      FROM MY_FLOW.PRESENTATION.VIEW_GIF_WORKFLOW_TIMELINE
      WHERE GIFT_ID = ?
      ORDER BY WORKFLOW_ID ASC
    `

    const timeline = await executeQuery(query, [giftId]) as TimelineEvent[]

    return NextResponse.json({
      success: true,
      timeline: timeline,
      count: timeline.length
    })

  } catch (error) {
    console.error('Error fetching timeline:', error)
    return NextResponse.json(
      { 
        success: false, 
        timeline: [], 
        count: 0,
        message: 'Internal server error' 
      },
      { status: 500 }
    )
  }
}
