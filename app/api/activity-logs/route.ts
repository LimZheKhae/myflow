import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake/config'
import { adminDb } from '@/lib/firebase-admin'

interface ActivityLogRequest {
  module: string // e.g., 'GIFT_APPROVAL', 'USER_MANAGEMENT', 'VIP_PROFILE'
  action: string // e.g., 'CREATE_REQUEST', 'BULK_APPROVE', 'UPDATE_STATUS' (uppercase, underscores)
  userId: string
  userName?: string
  userEmail: string
  details: Record<string, any> // All action-specific details go here
}

export async function POST(request: NextRequest) {
  try {
    const { module, action, userId, userName, userEmail, details }: ActivityLogRequest = await request.json()

    // Validate required fields
    if (!module || !action || !userId || !userEmail || !details) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required fields: module, action, userId, userEmail, details',
        },
        { status: 400 }
      )
    }

    // Log to Firebase activity_logs using Admin SDK (server-side to avoid ad blocker)
    try {
      await adminDb.collection('activity_logs').add({
        module: module.toUpperCase(), // Ensure uppercase
        action: action.toUpperCase(), // Ensure uppercase
        userId: userId,
        userName: userName || null,
        userEmail: userEmail,
        details: details, // All action-specific data goes here
        createdAt: new Date().toISOString(),
        timestamp: new Date(), // Admin SDK uses regular Date objects
      })
    } catch (firebaseError) {
      console.warn('Firebase logging failed (possibly due to permissions):', firebaseError)
      // Continue execution - don't fail the entire request if Firebase fails
    }

    // Special handling for GIFT_APPROVAL module - also log to Snowflake timeline if it's a status change
    if (module.toUpperCase() === 'GIFT_APPROVAL' && details.giftId && details.fromStatus && details.toStatus && details.fromStatus !== details.toStatus) {
      try {
        const insertSQL = `
          INSERT INTO MY_FLOW.PUBLIC.GIFT_WORKFLOW_TIMELINE (
            GIFT_ID, FROM_STATUS, TO_STATUS, CHANGED_BY, CHANGED_AT, REMARK
          ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP(), ?)
        `
        const params = [details.giftId, details.fromStatus, details.toStatus, userId, details.remark || null]
        await executeQuery(insertSQL, params)
      } catch (snowflakeError) {
        console.warn('Snowflake timeline logging failed:', snowflakeError)
        // Continue execution - don't fail the entire request if Snowflake fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Activity logged successfully',
    })
  } catch (error) {
    console.error('Error logging activity:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to log activity',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
