import { EmailTemplate } from '@/types/email'

export class BrevoService {
  private static apiKey = process.env.BREVO_API_KEY
  private static fromEmail = process.env.BREVO_FROM_EMAIL || 'dsa.dev24@gmail.com'
  private static fromName = process.env.BREVO_FROM_NAME || 'ZK Admin'

  static isEnabled(): boolean {
    return !!this.apiKey && process.env.EMAIL_ENABLED === 'true'
  }

  static async sendEmail(params: {
    to: string | string[]
    subject: string
    html: string
    text?: string
  }): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      if (!this.isEnabled()) {
        throw new Error('Brevo service is not enabled')
      }

      console.log('📧 [BREVO] Sending email:', {
        to: params.to,
        subject: params.subject,
        from: `${this.fromName} <${this.fromEmail}>`
      })

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey!,
        },
        body: JSON.stringify({
          sender: {
            name: this.fromName,
            email: this.fromEmail
          },
          to: Array.isArray(params.to) 
            ? params.to.map(email => ({ email }))
            : [{ email: params.to }],
          subject: params.subject,
          htmlContent: params.html,
          textContent: params.text || this.stripHtml(params.html)
        })
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('❌ [BREVO] Email send failed:', result)
        return {
          success: false,
          error: result.message || 'Failed to send email',
          data: result
        }
      }

      console.log('✅ [BREVO] Email sent successfully:', result)
      return {
        success: true,
        data: result
      }

    } catch (error) {
      console.error('❌ [BREVO] Email send error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  static async sendEmailToMultipleRecipients(
    emailTemplate: EmailTemplate, 
    recipientEmails: string[]
  ): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      console.log('📧 [BREVO] Sending bulk email to:', recipientEmails.length, 'recipients')

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey!,
        },
        body: JSON.stringify({
          sender: {
            name: this.fromName,
            email: this.fromEmail
          },
          to: recipientEmails.map(email => ({ email })),
          subject: emailTemplate.subject,
          htmlContent: emailTemplate.html,
          textContent: emailTemplate.text || this.stripHtml(emailTemplate.html)
        })
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('❌ [BREVO] Bulk email send failed:', result)
        return {
          success: false,
          error: result.message || 'Failed to send bulk email',
          data: result
        }
      }

      console.log('✅ [BREVO] Bulk email sent successfully to', recipientEmails.length, 'recipients')
      return {
        success: true,
        data: result
      }

    } catch (error) {
      console.error('❌ [BREVO] Bulk email send error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private static stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
  }
}
