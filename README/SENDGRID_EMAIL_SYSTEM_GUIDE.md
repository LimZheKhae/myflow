# 📧 SendGrid Email System Implementation Guide

## Table of Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [SendGrid Account Setup](#sendgrid-account-setup)
- [Domain Authentication](#domain-authentication)
- [API Key Configuration](#api-key-configuration)
- [Implementation Steps](#implementation-steps)
- [Email Templates](#email-templates)
- [Integration with Gift Approval System](#integration-with-gift-approval-system)
- [Testing & Monitoring](#testing--monitoring)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Overview

This guide provides step-by-step instructions for implementing SendGrid email notifications in the Gift Approval System. SendGrid will handle automated email notifications for workflow status changes, approvals, rejections, and other important events.

## Prerequisites

- Node.js 18+ installed
- Next.js project setup
- SendGrid account (free tier available)
- Domain ownership for email authentication
- Environment variables configured

## SendGrid Account Setup

### Step 1: Create SendGrid Account

1. **Visit SendGrid Website**
   - Go to [sendgrid.com](https://sendgrid.com)
   - Click "Start for Free" or "Sign Up"

2. **Account Registration**
   - Fill in your business information
   - Choose a plan (Free tier allows 100 emails/day)
   - Verify your email address

3. **Account Verification**
   - Complete phone verification
   - Verify your business domain (optional but recommended)

### Step 2: Navigate to Dashboard

1. **Access SendGrid Dashboard**
   - Login to your SendGrid account
   - Navigate to the main dashboard

2. **Key Dashboard Sections**
   - **Settings** → API Keys, Sender Authentication
   - **Email API** → Integration guides
   - **Activity** → Email delivery monitoring
   - **Templates** → Email template management

## Domain Authentication

### Step 1: Sender Authentication

1. **Navigate to Settings**
   - Go to Settings → Sender Authentication
   - Choose "Single Sender Verification" or "Domain Authentication"

2. **Single Sender Verification (Quick Setup)**
   ```
   From Email: noreply@yourcompany.com
   From Name: Gift Approval System
   Company: Your Company Name
   Address: Your Business Address
   City: Your City
   Country: Your Country
   ```

3. **Domain Authentication (Recommended)**
   - Click "Authenticate Your Domain"
   - Enter your domain (e.g., `yourcompany.com`)
   - Follow DNS configuration instructions
   - Add CNAME records to your DNS provider

### Step 2: DNS Configuration

Add these CNAME records to your domain's DNS:

```
Type: CNAME
Name: s1._domainkey
Value: s1.domainkey.u12345678.wl123.sendgrid.net

Type: CNAME
Name: s2._domainkey
Value: s2.domainkey.u12345678.wl123.sendgrid.net
```

**Verification Process:**
- Wait 24-48 hours for DNS propagation
- Check authentication status in SendGrid dashboard
- Ensure all records show "Valid" status

## API Key Configuration

### Step 1: Generate API Key

1. **Navigate to API Keys**
   - Go to Settings → API Keys
   - Click "Create API Key"

2. **API Key Settings**
   ```
   API Key Name: Gift Approval System
   API Key Permissions: Full Access (or Restrict to Mail Send)
   ```

3. **Save API Key**
   - Copy the generated API key immediately
   - Store it securely (you won't see it again)
   - Add to your environment variables

### Step 2: Environment Variables

Add to your `.env.local` file:

```env
# SendGrid Configuration
SENDGRID_API_KEY=SG.your_api_key_here
SENDGRID_FROM_EMAIL=noreply@yourcompany.com
SENDGRID_FROM_NAME=Gift Approval System
SENDGRID_TEMPLATE_ID=your_template_id_here

# Email Configuration
EMAIL_ENABLED=true
EMAIL_DEBUG_MODE=false
```

## Implementation Steps

### Step 1: Install Dependencies

```bash
# Install SendGrid Node.js library
npm install @sendgrid/mail

# Install additional dependencies for email templates
npm install handlebars
npm install @types/nodemailer --save-dev
```

### Step 2: Create Email Service

```typescript
// services/sendgridService.ts
import sgMail from '@sendgrid/mail'
import { EmailTemplate } from '@/types/email'

export class SendGridService {
  private static instance: SendGridService
  private isInitialized = false

  private constructor() {
    this.initialize()
  }

  public static getInstance(): SendGridService {
    if (!SendGridService.instance) {
      SendGridService.instance = new SendGridService()
    }
    return SendGridService.instance
  }

  private initialize(): void {
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SENDGRID_API_KEY is not configured')
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    this.isInitialized = true
    console.log('✅ SendGrid service initialized')
  }

  public async sendEmail(template: EmailTemplate): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isInitialized) {
      throw new Error('SendGrid service not initialized')
    }

    try {
      const msg = {
        to: template.to,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL!,
          name: process.env.SENDGRID_FROM_NAME!
        },
        subject: template.subject,
        html: template.html,
        text: template.text,
        templateId: template.templateId,
        dynamicTemplateData: template.dynamicTemplateData,
        attachments: template.attachments,
        trackingSettings: {
          clickTracking: { enable: true, enableText: true },
          openTracking: { enable: true },
          subscriptionTracking: { enable: false }
        }
      }

      const response = await sgMail.send(msg)
      console.log(`✅ Email sent successfully to ${template.to}`)
      
      return {
        success: true,
        messageId: response[0]?.headers['x-message-id'] || undefined
      }
    } catch (error: any) {
      console.error('❌ Email sending failed:', error)
      
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      }
    }
  }

  public async sendBulkEmails(templates: EmailTemplate[]): Promise<{ success: boolean; results: any[] }> {
    try {
      const results = await Promise.allSettled(
        templates.map(template => this.sendEmail(template))
      )

      const successful = results.filter(result => 
        result.status === 'fulfilled' && result.value.success
      ).length

      const failed = results.length - successful

      console.log(`📧 Bulk email results: ${successful} successful, ${failed} failed`)

      return {
        success: failed === 0,
        results: results.map(result => 
          result.status === 'fulfilled' ? result.value : { success: false, error: 'Promise rejected' }
        )
      }
    } catch (error: any) {
      console.error('❌ Bulk email sending failed:', error)
      return {
        success: false,
        results: []
      }
    }
  }

  public async validateEmail(email: string): Promise<boolean> {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
}
```

### Step 3: Create Email Types

```typescript
// types/email.ts
export interface EmailTemplate {
  to: string
  subject: string
  html: string
  text?: string
  templateId?: string
  dynamicTemplateData?: Record<string, any>
  attachments?: Array<{
    content: string
    filename: string
    type: string
    disposition: string
  }>
}

export interface EmailPreferences {
  userId: string
  emailNotifications: {
    giftSubmitted: boolean
    giftApproved: boolean
    giftRejected: boolean
    deliveryUpdates: boolean
    proofRequired: boolean
    auditComplete: boolean
    bulkActions: boolean
  }
  emailFrequency: 'immediate' | 'daily' | 'weekly'
  emailFormat: 'html' | 'text'
  timezone: string
}

export interface EmailLog {
  id: string
  giftId?: number
  recipient: string
  subject: string
  template: string
  sentAt: Date
  status: 'sent' | 'failed' | 'pending'
  messageId?: string
  error?: string
  retryCount: number
  maxRetries: number
}
```

### Step 4: Create Email Templates

```typescript
// templates/emailTemplates.ts
import { EmailTemplate } from '@/types/email'

export class EmailTemplates {
  private static baseTemplate(content: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Gift Approval System</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
          .footer { background: #f8fafc; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #6b7280; }
          .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
          .status-pending { background: #fef3c7; color: #92400e; }
          .status-approved { background: #d1fae5; color: #065f46; }
          .status-rejected { background: #fee2e2; color: #991b1b; }
          .status-delivered { background: #dbeafe; color: #1e40af; }
          .info-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px; background: #f9fafb; border-radius: 4px; }
          .info-label { font-weight: bold; color: #374151; }
          .info-value { color: #6b7280; }
          .action-button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
          .action-button:hover { background: #1d4ed8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">🎁 Gift Approval System</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Automated Workflow Notifications</p>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p>This is an automated email from the Gift Approval System.</p>
            <p>Please do not reply to this email. Contact support if you have questions.</p>
            <p>&copy; ${new Date().getFullYear()} Your Company. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  static giftRequestSubmitted(giftData: any): EmailTemplate {
    const content = `
      <h2 style="color: #2563eb; margin-top: 0;">🎁 New Gift Request Submitted</h2>
      
      <div class="info-row">
        <span class="info-label">Gift ID:</span>
        <span class="info-value">#${giftData.giftId}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Player:</span>
        <span class="info-value">${giftData.fullName} (${giftData.memberLogin})</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Gift Item:</span>
        <span class="info-value">${giftData.giftItem}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Value:</span>
        <span class="info-value">${giftData.costMyr} MYR</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Submitted by:</span>
        <span class="info-value">${giftData.kamRequestedBy}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Date:</span>
        <span class="info-value">${new Date().toLocaleDateString()}</span>
      </div>
      
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
      
      <p><strong>Status:</strong> <span class="status-badge status-pending">Pending Manager Review</span></p>
      
      <p>This gift request has been submitted and is awaiting manager approval. You will receive an update once the request has been reviewed.</p>
      
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/gift-approval?giftId=${giftData.giftId}" class="action-button">
        View Gift Request
      </a>
    `

    return {
      to: giftData.kamEmail,
      subject: `Gift Request Submitted - #${giftData.giftId}`,
      html: this.baseTemplate(content),
      text: `Gift Request #${giftData.giftId} has been submitted for ${giftData.fullName}. Status: Pending Manager Review.`
    }
  }

  static giftApproved(giftData: any): EmailTemplate {
    const content = `
      <h2 style="color: #059669; margin-top: 0;">✅ Gift Request Approved</h2>
      
      <div class="info-row">
        <span class="info-label">Gift ID:</span>
        <span class="info-value">#${giftData.giftId}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Player:</span>
        <span class="info-value">${giftData.fullName}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Gift Item:</span>
        <span class="info-value">${giftData.giftItem}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Approved by:</span>
        <span class="info-value">${giftData.approvalReviewedBy}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Date:</span>
        <span class="info-value">${new Date().toLocaleDateString()}</span>
      </div>
      
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
      
      <p><strong>Status:</strong> <span class="status-badge status-approved">Approved</span></p>
      
      <p>Congratulations! Your gift request has been approved and is now in processing. The MKTOps team will handle the procurement and delivery.</p>
      
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/gift-approval?giftId=${giftData.giftId}" class="action-button">
        View Gift Details
      </a>
    `

    return {
      to: giftData.kamEmail,
      subject: `Gift Request Approved - #${giftData.giftId}`,
      html: this.baseTemplate(content),
      text: `Gift Request #${giftData.giftId} has been approved for ${giftData.fullName}. Status: Approved.`
    }
  }

  static giftRejected(giftData: any): EmailTemplate {
    const content = `
      <h2 style="color: #dc2626; margin-top: 0;">❌ Gift Request Rejected</h2>
      
      <div class="info-row">
        <span class="info-label">Gift ID:</span>
        <span class="info-value">#${giftData.giftId}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Player:</span>
        <span class="info-value">${giftData.fullName}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Gift Item:</span>
        <span class="info-value">${giftData.giftItem}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Rejected by:</span>
        <span class="info-value">${giftData.approvalReviewedBy}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Date:</span>
        <span class="info-value">${new Date().toLocaleDateString()}</span>
      </div>
      
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
      
      <p><strong>Status:</strong> <span class="status-badge status-rejected">Rejected</span></p>
      
      <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <h4 style="margin: 0 0 10px 0; color: #991b1b;">Rejection Reason:</h4>
        <p style="margin: 0; color: #7f1d1d;">${giftData.rejectReason || 'No reason provided'}</p>
      </div>
      
      <p>Please review the rejection reason and take necessary action. You may need to modify the request or provide additional information.</p>
      
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/gift-approval?giftId=${giftData.giftId}" class="action-button">
        Review Gift Request
      </a>
    `

    return {
      to: giftData.kamEmail,
      subject: `Gift Request Rejected - #${giftData.giftId}`,
      html: this.baseTemplate(content),
      text: `Gift Request #${giftData.giftId} has been rejected for ${giftData.fullName}. Reason: ${giftData.rejectReason || 'No reason provided'}.`
    }
  }

  static deliveryStatusUpdate(giftData: any): EmailTemplate {
    const content = `
      <h2 style="color: #7c3aed; margin-top: 0;">📦 Delivery Status Update</h2>
      
      <div class="info-row">
        <span class="info-label">Gift ID:</span>
        <span class="info-value">#${giftData.giftId}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Player:</span>
        <span class="info-value">${giftData.fullName}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Gift Item:</span>
        <span class="info-value">${giftData.giftItem}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Status:</span>
        <span class="info-value"><span class="status-badge status-delivered">${giftData.trackingStatus}</span></span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Courier:</span>
        <span class="info-value">${giftData.dispatcher}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Tracking Code:</span>
        <span class="info-value">${giftData.trackingCode}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Updated by:</span>
        <span class="info-value">${giftData.mktOpsUpdatedBy}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Date:</span>
        <span class="info-value">${new Date().toLocaleDateString()}</span>
      </div>
      
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
      
      <p>The delivery status for this gift has been updated. Please check the tracking information above for the latest status.</p>
      
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/gift-approval?giftId=${giftData.giftId}" class="action-button">
        View Delivery Details
      </a>
    `

    return {
      to: giftData.kamEmail,
      subject: `Delivery Status Update - #${giftData.giftId}`,
      html: this.baseTemplate(content),
      text: `Delivery status updated for Gift #${giftData.giftId}. Status: ${giftData.trackingStatus}.`
    }
  }

  static kamProofRequired(giftData: any): EmailTemplate {
    const content = `
      <h2 style="color: #ea580c; margin-top: 0;">📸 KAM Proof Required</h2>
      
      <div class="info-row">
        <span class="info-label">Gift ID:</span>
        <span class="info-value">#${giftData.giftId}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Player:</span>
        <span class="info-value">${giftData.fullName}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Gift Item:</span>
        <span class="info-value">${giftData.giftItem}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">KAM:</span>
        <span class="info-value">${giftData.kamRequestedBy}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Delivery Date:</span>
        <span class="info-value">${new Date().toLocaleDateString()}</span>
      </div>
      
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
      
      <div style="background: #fffbeb; border: 1px solid #fcd34d; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <h4 style="margin: 0 0 10px 0; color: #92400e;">Action Required:</h4>
        <p style="margin: 0; color: #78350f;">The gift has been delivered successfully. Please upload proof of delivery in the system.</p>
      </div>
      
      <p>Please log into the system and upload the delivery proof (photo/signature) to complete the gift delivery process.</p>
      
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/gift-approval?giftId=${giftData.giftId}" class="action-button">
        Upload Delivery Proof
      </a>
    `

    return {
      to: giftData.kamEmail,
      subject: `KAM Proof Required - #${giftData.giftId}`,
      html: this.baseTemplate(content),
      text: `KAM proof required for Gift #${giftData.giftId}. Please upload delivery proof.`
    }
  }

  static auditComplete(giftData: any): EmailTemplate {
    const content = `
      <h2 style="color: #059669; margin-top: 0;">✅ Audit Complete</h2>
      
      <div class="info-row">
        <span class="info-label">Gift ID:</span>
        <span class="info-value">#${giftData.giftId}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Player:</span>
        <span class="info-value">${giftData.fullName}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Gift Item:</span>
        <span class="info-value">${giftData.giftItem}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Audited by:</span>
        <span class="info-value">${giftData.auditedBy}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Date:</span>
        <span class="info-value">${new Date().toLocaleDateString()}</span>
      </div>
      
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
      
      <p><strong>Status:</strong> <span class="status-badge status-approved">Completed</span></p>
      
      <p>Congratulations! The gift request has been successfully audited and completed. The entire workflow is now finished.</p>
      
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/gift-approval?giftId=${giftData.giftId}" class="action-button">
        View Completed Gift
      </a>
    `

    return {
      to: giftData.kamEmail,
      subject: `Audit Complete - #${giftData.giftId}`,
      html: this.baseTemplate(content),
      text: `Audit completed for Gift #${giftData.giftId}. Status: Completed.`
    }
  }

  static bulkActionNotification(giftIds: number[], action: string, userEmail: string): EmailTemplate {
    const content = `
      <h2 style="color: #2563eb; margin-top: 0;">🔄 Bulk Action Completed</h2>
      
      <div class="info-row">
        <span class="info-label">Action:</span>
        <span class="info-value">${action}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Gifts Affected:</span>
        <span class="info-value">${giftIds.length} gift(s)</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Gift IDs:</span>
        <span class="info-value">${giftIds.map(id => `#${id}`).join(', ')}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Date:</span>
        <span class="info-value">${new Date().toLocaleDateString()}</span>
      </div>
      
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
      
      <p>The bulk action has been completed successfully. All affected gifts have been updated accordingly.</p>
      
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/gift-approval" class="action-button">
        View Gift Approval System
      </a>
    `

    return {
      to: userEmail,
      subject: `Bulk Action Completed - ${action}`,
      html: this.baseTemplate(content),
      text: `Bulk action "${action}" completed for ${giftIds.length} gift(s).`
    }
  }
}
```

## Integration with Gift Approval System

### Step 1: Update API Routes

```typescript
// app/api/gift-approval/update/route.ts
import { SendGridService } from '@/services/sendgridService'
import { EmailTemplates } from '@/templates/emailTemplates'

// Add to existing update function
const sendWorkflowEmail = async (giftData: any, action: string) => {
  try {
    const sendGridService = SendGridService.getInstance()
    let emailTemplate

    switch (action) {
      case 'approve':
        emailTemplate = EmailTemplates.giftApproved(giftData)
        break
      case 'reject':
        emailTemplate = EmailTemplates.giftRejected(giftData)
        break
      case 'delivery_update':
        emailTemplate = EmailTemplates.deliveryStatusUpdate(giftData)
        break
      case 'kam_proof_required':
        emailTemplate = EmailTemplates.kamProofRequired(giftData)
        break
      case 'audit_complete':
        emailTemplate = EmailTemplates.auditComplete(giftData)
        break
      default:
        console.log('No email template for action:', action)
        return
    }

    const result = await sendGridService.sendEmail(emailTemplate)
    
    if (result.success) {
      console.log(`✅ Workflow email sent for Gift #${giftData.giftId}, Action: ${action}`)
    } else {
      console.error(`❌ Email sending failed for Gift #${giftData.giftId}:`, result.error)
    }
  } catch (error) {
    console.error('Email sending error:', error)
    // Don't fail the main request if email fails
  }
}

// In your existing update logic
if (action === 'approve') {
  // ... existing approval logic
  await sendWorkflowEmail(giftData, 'approve')
}

if (action === 'reject') {
  // ... existing rejection logic
  await sendWorkflowEmail(giftData, 'reject')
}
```

### Step 2: Bulk Actions Integration

```typescript
// app/api/gift-approval/bulk-actions/route.ts
import { SendGridService } from '@/services/sendgridService'
import { EmailTemplates } from '@/templates/emailTemplates'

const sendBulkActionEmails = async (giftIds: number[], action: string, userEmail: string) => {
  try {
    const sendGridService = SendGridService.getInstance()
    
    // Send bulk action notification
    const bulkTemplate = EmailTemplates.bulkActionNotification(giftIds, action, userEmail)
    await sendGridService.sendEmail(bulkTemplate)
    
    // Send individual emails for each gift (if needed)
    const giftDataPromises = giftIds.map(giftId => fetchGiftData(giftId))
    const giftDataArray = await Promise.all(giftDataPromises)
    
    const emailTemplates = giftDataArray.map(giftData => {
      switch (action) {
        case 'approve':
          return EmailTemplates.giftApproved(giftData)
        case 'reject':
          return EmailTemplates.giftRejected(giftData)
        default:
          return null
      }
    }).filter(template => template !== null)
    
    if (emailTemplates.length > 0) {
      await sendGridService.sendBulkEmails(emailTemplates)
    }
    
  } catch (error) {
    console.error('Bulk email sending failed:', error)
  }
}
```

### Step 3: Email Preferences Integration

```typescript
// services/emailPreferencesService.ts
import { EmailPreferences } from '@/types/email'

export class EmailPreferencesService {
  static async getUserPreferences(userId: string): Promise<EmailPreferences | null> {
    // Fetch from database or Firebase
    // Implementation depends on your data storage
  }

  static async updatePreferences(userId: string, preferences: Partial<EmailPreferences>): Promise<void> {
    // Update in database or Firebase
  }

  static async shouldSendEmail(userId: string, emailType: string): Promise<boolean> {
    const preferences = await this.getUserPreferences(userId)
    if (!preferences) return true // Default to sending if no preferences
    
    return preferences.emailNotifications[emailType as keyof typeof preferences.emailNotifications] || false
  }
}
```

## Testing & Monitoring

### Step 1: Test Email Endpoint

```typescript
// app/api/test-email/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { SendGridService } from '@/services/sendgridService'
import { EmailTemplates } from '@/templates/emailTemplates'

export async function POST(request: NextRequest) {
  try {
    const { to, template, giftData } = await request.json()
    
    const sendGridService = SendGridService.getInstance()
    
    let emailTemplate
    switch (template) {
      case 'giftSubmitted':
        emailTemplate = EmailTemplates.giftRequestSubmitted(giftData)
        break
      case 'giftApproved':
        emailTemplate = EmailTemplates.giftApproved(giftData)
        break
      case 'giftRejected':
        emailTemplate = EmailTemplates.giftRejected(giftData)
        break
      case 'deliveryUpdate':
        emailTemplate = EmailTemplates.deliveryStatusUpdate(giftData)
        break
      case 'kamProofRequired':
        emailTemplate = EmailTemplates.kamProofRequired(giftData)
        break
      case 'auditComplete':
        emailTemplate = EmailTemplates.auditComplete(giftData)
        break
      default:
        return NextResponse.json({ success: false, error: 'Invalid template' })
    }
    
    // Override recipient for testing
    emailTemplate.to = to
    
    const result = await sendGridService.sendEmail(emailTemplate)
    
    return NextResponse.json({ success: true, result })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message })
  }
}
```

### Step 2: Email Logging

```typescript
// services/emailLoggingService.ts
import { EmailLog } from '@/types/email'

export class EmailLoggingService {
  static async logEmail(log: Omit<EmailLog, 'id'>): Promise<void> {
    // Log to database or Firebase
    // Implementation depends on your data storage
  }

  static async getEmailLogs(filters?: {
    giftId?: number
    recipient?: string
    status?: string
    dateRange?: { start: Date; end: Date }
  }): Promise<EmailLog[]> {
    // Fetch logs from database or Firebase
    // Implementation depends on your data storage
  }

  static async retryFailedEmails(): Promise<void> {
    // Retry failed emails
    const failedLogs = await this.getEmailLogs({ status: 'failed' })
    
    for (const log of failedLogs) {
      if (log.retryCount < log.maxRetries) {
        // Retry sending email
        // Implementation depends on your retry logic
      }
    }
  }
}
```

### Step 3: SendGrid Dashboard Monitoring

1. **Activity Feed**
   - Monitor email delivery status
   - Track bounces, opens, clicks
   - View delivery rates

2. **Statistics**
   - Daily/monthly email volume
   - Delivery success rates
   - Geographic distribution

3. **Bounce Management**
   - Handle hard/soft bounces
   - Suppression list management
   - Email validation

## Troubleshooting

### Common Issues

1. **API Key Issues**
   ```
   Error: Unauthorized
   Solution: Verify API key is correct and has proper permissions
   ```

2. **Domain Authentication**
   ```
   Error: Sender not verified
   Solution: Complete domain authentication in SendGrid dashboard
   ```

3. **Rate Limiting**
   ```
   Error: Rate limit exceeded
   Solution: Upgrade plan or implement rate limiting in code
   ```

4. **Email Content Issues**
   ```
   Error: Invalid email content
   Solution: Validate HTML content and remove invalid characters
   ```

### Debug Mode

```typescript
// Enable debug mode in development
if (process.env.NODE_ENV === 'development') {
  console.log('📧 Email Debug Mode Enabled')
  // Log email content without sending
}
```

## Best Practices

### 1. Email Content
- Use responsive design
- Include plain text alternatives
- Optimize for mobile devices
- Keep subject lines under 50 characters

### 2. Delivery Optimization
- Implement proper error handling
- Use retry mechanisms
- Monitor bounce rates
- Clean email lists regularly

### 3. Security
- Validate email addresses
- Sanitize HTML content
- Use HTTPS for all links
- Implement rate limiting

### 4. Performance
- Send emails asynchronously
- Use bulk sending for multiple emails
- Implement queuing for high volume
- Cache email templates

### 5. Compliance
- Include unsubscribe links
- Respect email preferences
- Follow CAN-SPAM guidelines
- Maintain audit logs

## Environment Variables Checklist

```env
# Required
SENDGRID_API_KEY=SG.your_api_key_here
SENDGRID_FROM_EMAIL=noreply@yourcompany.com
SENDGRID_FROM_NAME=Gift Approval System

# Optional
EMAIL_ENABLED=true
EMAIL_DEBUG_MODE=false
EMAIL_RETRY_ATTEMPTS=3
EMAIL_RETRY_DELAY=5000
NEXT_PUBLIC_APP_URL=https://your-app.com
```

## Next Steps

1. **Setup SendGrid Account** and configure domain authentication
2. **Install Dependencies** and configure environment variables
3. **Implement Email Service** with proper error handling
4. **Create Email Templates** for all workflow stages
5. **Integrate with API Routes** for automated sending
6. **Test Email System** thoroughly in development
7. **Monitor Email Delivery** and performance in production
8. **Implement Email Preferences** for user control

This comprehensive guide will help you implement a robust email notification system using SendGrid for your Gift Approval System! 🚀
