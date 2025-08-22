import { NextRequest, NextResponse } from 'next/server'
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

    // Note: Timeline logging is now handled automatically in each API endpoint
    // This prevents duplicate timeline entries

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
