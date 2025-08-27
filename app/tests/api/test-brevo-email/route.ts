import { NextRequest, NextResponse } from 'next/server'
import { BrevoService } from '@/services/brevoService'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { toEmail, subject, message } = body

        console.log('🧪 [BREVO TEST] Testing Brevo email to:', toEmail)

        // Test Brevo email sending
        const result = await BrevoService.sendEmail({
            to: toEmail,
            subject: subject || 'Test Email from Brevo',
            html: message || `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #2563eb;">Test Email from Brevo</h1>
                    <p>This is a test email sent using Brevo email service.</p>
                    <p>If you receive this, Brevo is working correctly!</p>
                    <p>Sent at: ${new Date().toLocaleString()}</p>
                </div>
            `
        })

        console.log('🧪 [BREVO TEST] Result:', result)

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: 'Brevo email test successful!',
                data: result.data
            })
        } else {
            return NextResponse.json({
                success: false,
                message: 'Brevo email test failed',
                error: result.error
            }, { status: 400 })
        }

    } catch (error) {
        console.error('🧪 [BREVO TEST] Error:', error)
        
        return NextResponse.json({
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error occurred',
            error: error instanceof Error ? error.stack : undefined
        }, { status: 500 })
    }
}
