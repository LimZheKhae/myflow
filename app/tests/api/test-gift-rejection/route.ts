import { NextRequest, NextResponse } from 'next/server'
import { IntegratedNotificationService } from '@/services/integratedNotificationService'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { userEmail, giftId, fullName, memberLogin, giftItem, costMyr, category, kamRequestedBy, kamEmail, rejectReason } = body

        console.log('🧪 [TEST API] Received gift rejection test request:', {
            userEmail,
            giftId,
            fullName,
            giftItem,
            rejectReason
        })

        // Test the integrated notification service with Brevo
        const result = await IntegratedNotificationService.sendGiftRejectionNotification(
            {
                giftId: parseInt(giftId),
                fullName,
                memberLogin,
                giftItem,
                costMyr: parseFloat(costMyr),
                category,
                kamRequestedBy,
                kamEmail: userEmail,
                rejectReason
            },
            [] // Empty array - will use role-based targeting with Brevo fallback
        )

        console.log('🧪 [TEST API] Gift rejection test result:', result)

        return NextResponse.json({
            success: true,
            notificationSuccess: result.notification.success,
            emailSuccess: result.email.success,
            notificationId: result.notification.id,
            emailMessage: result.email.error || 'Email sent successfully',
            message: 'Gift rejection test completed successfully'
        })

    } catch (error) {
        console.error('🧪 [TEST API] Gift rejection test error:', error)
        
        return NextResponse.json({
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error occurred',
            error: error instanceof Error ? error.stack : undefined
        }, { status: 500 })
    }
}
