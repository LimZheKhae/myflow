import { NextRequest, NextResponse } from 'next/server'
import { IntegratedNotificationService } from '@/services/integratedNotificationService'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { testType, giftData, targetUserIds } = body

    console.log('🧪 [TEST INTEGRATED NOTIFICATIONS] Request:', {
      testType,
      giftData,
      targetUserIds
    })

    let notificationResult

    switch (testType) {
      case 'gift_rejection':
        console.log('🧪 [TEST] Testing gift rejection notification')
        notificationResult = await IntegratedNotificationService.sendGiftRejectionNotification(
          giftData,
          targetUserIds || []
        )
        break

      default:
        return NextResponse.json(
          {
            success: false,
            message: `Unknown notification type: ${testType}`,
          },
          { status: 400 }
        )
    }

    console.log('🧪 [TEST] Notification result:', notificationResult)

    return NextResponse.json({
      success: true,
      message: 'Test completed successfully',
      notificationResult
    })

  } catch (error) {
    console.error('❌ [TEST] Error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Test failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

