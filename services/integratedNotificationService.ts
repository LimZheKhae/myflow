import { adminDb } from '@/lib/firebase-admin'
import { Notification } from '@/types/notification'
import { Timestamp } from 'firebase-admin/firestore'
import { BrevoService } from './brevoService'
import { EmailTemplates } from '@/templates/emailTemplates'

export interface IntegratedNotificationData {
  // Targeting (same as notification system)
  userId: string | null // Specific user or null for global
  targetUserIds: string[] | null // Pre-filtered user list
  roles: string[] // Role-based targeting

  // Content
  module: string // Module name (e.g., "gift-approval")
  type: string // Notification type
  title: string // Notification title
  message: string // Notification message
  action: string // Action identifier

  // Email specific
  emailTemplate?: string // Email template to use
  emailData?: Record<string, any> // Data for email template
  sendEmail?: boolean // Whether to send email (default: true)

  // Notification specific
  sendNotification?: boolean // Whether to send notification (default: true)

  // Metadata
  priority: 'low' | 'medium' | 'high' | 'critical'
  data: Record<string, any> // Additional context data
  actions?: Array<{
    label: string
    action: 'navigate' | 'mark_read' | 'dismiss'
    url?: string
  }>
}

export class IntegratedNotificationService {
  private static brevoService = BrevoService

  // Main method to send both notification and email
  static async sendIntegratedNotification(notificationData: IntegratedNotificationData) {
    console.log('🚀 [INTEGRATED] Starting integrated notification process:', {
      title: notificationData.title,
      type: notificationData.type,
      module: notificationData.module,
      sendNotification: notificationData.sendNotification,
      sendEmail: notificationData.sendEmail,
      hasEmailTemplate: !!notificationData.emailTemplate
    })

    const results = {
      notification: { success: false, id: null as string | null, error: null as string | null },
      email: { success: false, error: null as string | null }
    }

    try {
      // Send notification if enabled
      if (notificationData.sendNotification !== false) {
        console.log('🔔 [INTEGRATED] Sending in-app notification...')
        try {
          const notificationId = await this.createNotification(notificationData)
          results.notification.success = true
          results.notification.id = notificationId
          console.log(`✅ [INTEGRATED] Notification sent successfully: ${notificationId}`)
        } catch (error) {
          results.notification.error = error instanceof Error ? error.message : 'Unknown error'
          console.error('❌ [INTEGRATED] Notification failed:', error)
        }
      } else {
        console.log('⏭️ [INTEGRATED] In-app notification disabled - skipping')
      }

      // Send email if enabled
      if (notificationData.sendEmail !== false && notificationData.emailTemplate) {
        console.log('📧 [INTEGRATED] Sending email notification...')
        try {
          await this.sendEmail(notificationData)
          results.email.success = true
          console.log(`✅ [INTEGRATED] Email sent successfully`)
        } catch (error) {
          results.email.error = error instanceof Error ? error.message : 'Unknown error'
          console.error('❌ [INTEGRATED] Email failed:', error)
        }
      } else {
        console.log('⏭️ [INTEGRATED] Email disabled or no template - skipping')
      }

      console.log('🏁 [INTEGRATED] Final results:', results)
      return results
    } catch (error) {
      console.error('❌ [INTEGRATED] Integrated notification failed:', error)
      throw error
    }
  }

  // Create notification (server-side)
  private static async createNotification(data: IntegratedNotificationData): Promise<string> {
    try {
      console.log('🔔 [NOTIFICATION] Creating notification with data:', {
        userId: data.userId,
        targetUserIds: data.targetUserIds,
        roles: data.roles,
        module: data.module,
        type: data.type,
        title: data.title,
        message: data.message,
        action: data.action,
        priority: data.priority
      })

      const notification: Omit<Notification, 'id' | 'createdAt'> = {
        userId: data.userId,
        targetUserIds: data.targetUserIds,
        roles: data.roles,
        module: data.module,
        type: data.type,
        title: data.title,
        message: data.message,
        action: data.action,
        priority: data.priority,
        read: false,
        readAt: null,
        readBy: null,
        expiresAt: null,
        data: data.data,
        actions: data.actions || []
      }

      console.log('🔔 [NOTIFICATION] Notification object before saving:', notification)

      const docRef = await adminDb.collection('notifications').add({
        ...notification,
        createdAt: Timestamp.now(),
      })

      console.log('🔔 [NOTIFICATION] Notification created successfully with ID:', docRef.id)
      return docRef.id
    } catch (error) {
      console.error('❌ [NOTIFICATION] Error creating notification:', error)
      console.error('❌ [NOTIFICATION] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        data: data
      })
      throw error
    }
  }

  // Send email using Resend
  private static async sendEmail(data: IntegratedNotificationData) {
    if (!data.emailTemplate || !data.emailData) {
      console.error('❌ Email template and data are required for email sending')
      throw new Error('Email template and data are required for email sending')
    }

    console.log('📧 Starting email send process...', {
      template: data.emailTemplate,
      hasEmailData: !!data.emailData,
      emailDataKeys: Object.keys(data.emailData || {}),
      targetUserIds: data.targetUserIds,
      roles: data.roles,
      userId: data.userId
    })

    // Check if email service is enabled
    if (!this.brevoService.isEnabled()) {
      console.log('📧 Email service disabled - skipping email')
      return
    }

    console.log('📧 Email service enabled, getting target users...')

    // Get target users for email
    const targetUsers = await this.getTargetUsers(data)
    console.log(`📧 Found ${targetUsers.length} target users for email:`, targetUsers.map((u: { id: string; email: string; name: string; role: string }) => ({ id: u.id, email: u.email, role: u.role })))

    if (targetUsers.length === 0) {
      console.log('📧 No target users found for email')
      return
    }

    // Generate email template
    let emailTemplate
    try {
      console.log(`📧 Generating email template: ${data.emailTemplate}`)
      switch (data.emailTemplate) {
        case 'gift_rejected':
          console.log('📧 Using gift_rejected template with data:', data.emailData)
          emailTemplate = EmailTemplates.giftRejected(data.emailData as any)
          break
        case 'bulk_action':
          console.log('📧 Using bulk_action template with data:', {
            giftIds: data.emailData.giftIds?.length || 0,
            action: data.emailData.action,
            userEmail: data.emailData.userEmail
          })
          emailTemplate = EmailTemplates.bulkActionNotification(
            data.emailData.giftIds || [],
            data.emailData.action || '',
            data.emailData.userEmail || ''
          )
          break
        case 'bulk_gift_rejected':
          console.log('📧 Using bulk_gift_rejected template with data:', {
            giftCount: data.emailData.giftDataArray?.length || 0,
            rejectedBy: data.emailData.rejectedBy,
            rejectReason: data.emailData.rejectReason
          })
          emailTemplate = EmailTemplates.bulkGiftRejected(
            data.emailData.giftDataArray || [],
            data.emailData.rejectedBy || '',
            data.emailData.rejectReason || ''
          )
          break
        case 'workflow_update':
          console.log('📧 Using workflow_update template with data:', data.emailData)
          emailTemplate = EmailTemplates.workflowUpdate(data.emailData as any)
          break
        case 'gift_delivered':
          console.log('📧 Using gift_delivered template with data:', data.emailData)
          emailTemplate = EmailTemplates.giftDelivered(data.emailData as any)
          break
        case 'bulk_gift_delivered':
          console.log('📧 Using bulk_gift_delivered template with data:', {
            giftCount: data.emailData.giftDataArray?.length || 0,
            updatedBy: data.emailData.updatedBy
          })
          emailTemplate = EmailTemplates.bulkGiftDelivered(data.emailData.giftDataArray || [])
          break
        default:
          console.error(`❌ Unknown email template: ${data.emailTemplate}`)
          throw new Error(`Unknown email template: ${data.emailTemplate}`)
      }
      console.log('📧 Email template generated successfully')
    } catch (templateError) {
      console.error('❌ Error generating email template:', templateError)
      throw new Error(`Failed to generate email template: ${templateError instanceof Error ? templateError.message : 'Unknown error'}`)
    }

    // Send email to all target users using bulk email method
    const recipientEmails = targetUsers.map((user: { id: string; email: string; name: string; role: string }) => user.email).filter((email: string) => email && email.trim() !== '')

    console.log('📧 Email sending details:', {
      totalTargetUsers: targetUsers.length,
      validEmails: recipientEmails.length,
      recipientEmails: recipientEmails,
      emailTemplateSubject: emailTemplate.subject,
      emailTemplateTo: emailTemplate.to
    })

    if (recipientEmails.length === 0) {
      console.log('📧 No valid email addresses found for recipients')
      console.log('📧 Target users:', targetUsers.map((u: { id: string; email: string; name: string; role: string }) => ({ id: u.id, email: u.email, name: u.name, role: u.role })))
      return
    }

    console.log(`📧 Sending bulk email to ${recipientEmails.length} recipients:`, recipientEmails)

    // Send email using Brevo service
    console.log('📧 Calling Brevo service with:', {
      to: recipientEmails,
      subject: emailTemplate.subject,
      htmlLength: emailTemplate.html?.length || 0
    })

    const result = await this.brevoService.sendEmailToMultipleRecipients(emailTemplate, recipientEmails)

    console.log('📧 Email send result:', result)

    if (result.success) {
      console.log(`✅ Bulk email sent successfully to ${recipientEmails.length} users`)
    } else {
      console.error(`❌ Bulk email failed:`, result.error)
    }
  }

  // Get target users based on targeting criteria
  private static async getTargetUsers(data: IntegratedNotificationData) {
    const users: Array<{ id: string; email: string; name: string; role: string }> = []

    try {
      console.log('🔍 Getting target users with criteria:', {
        userId: data.userId,
        targetUserIds: data.targetUserIds,
        roles: data.roles
      })

      // Get users collection reference
      const usersRef = adminDb.collection('users')

      // Targeting Logic:
      // 1. If all are null -> Global notification (send to all users)
      // 2. If userId is not null -> Send to specific user
      // 3. If targetUserIds is not null -> Send to specific users
      // 4. If roles is not null -> Send to users with these roles
      // 5. If multiple are not null -> Send to all specified targets

      // Check if this is a global notification (all targeting fields are null/empty)
      const isGlobalNotification = !data.userId &&
        (!data.targetUserIds || data.targetUserIds.length === 0) &&
        (!data.roles || data.roles.length === 0)

      if (isGlobalNotification) {
        console.log('🌍 Global notification - sending to all users')
        try {
          // Get all users for global notification
          const allUsersSnapshot = await usersRef.get()
          allUsersSnapshot.docs.forEach(doc => {
            const userData = doc.data()
            users.push({
              id: doc.id,
              email: userData?.email || '',
              name: userData?.name || '',
              role: userData?.role || ''
            })
            console.log(`✅ Global user: ${doc.id} (${userData?.email})`)
          })
          console.log(`🌍 Found ${users.length} users for global notification`)
          return users
        } catch (firebaseError) {
          console.error('❌ Firebase permission error for global users. Using fallback.')
          return this.getFallbackUsers(data)
        }
      }

      // Handle specific user targeting
      if (data.userId && data.userId.trim() !== '') {
        console.log(`🔍 Looking for specific user: ${data.userId}`)
        try {
          const userDoc = await usersRef.doc(data.userId).get()
          if (userDoc.exists) {
            const userData = userDoc.data()
            users.push({
              id: userDoc.id,
              email: userData?.email || '',
              name: userData?.name || '',
              role: userData?.role || ''
            })
            console.log(`✅ Found user: ${userDoc.id}`)
          } else {
            console.log(`❌ User not found: ${data.userId}`)
            // Don't use fallback for specific user targeting - just skip notification
            console.log(`⚠️ Skipping notification for non-existent user: ${data.userId}`)
          }
        } catch (firebaseError) {
          console.error(`❌ Firebase permission error for user ${data.userId}`)
          // Don't use fallback for specific user targeting - just skip notification
          console.log(`⚠️ Skipping notification due to Firebase error for user: ${data.userId}`)
        }
      }

      // Handle specific user list targeting
      if (data.targetUserIds && data.targetUserIds.length > 0) {
        // Filter out empty or invalid user IDs
        const validUserIds = data.targetUserIds.filter(id => id && id.trim() !== '')
        console.log(`🔍 Looking for specific users: ${validUserIds.join(', ')}`)

        if (validUserIds.length === 0) {
          console.log('⚠️ No valid user IDs provided for targeting')
          return users
        }

        try {
          const userDocs = await Promise.all(
            validUserIds.map(id => usersRef.doc(id).get())
          )
          userDocs.forEach(doc => {
            if (doc.exists) {
              const userData = doc.data()
              users.push({
                id: doc.id,
                email: userData?.email || '',
                name: userData?.name || '',
                role: userData?.role || ''
              })
              console.log(`✅ Found user: ${doc.id}`)
            } else {
              console.log(`❌ User not found: ${doc.id}`)
            }
          })
        } catch (firebaseError) {
          console.error('❌ Firebase permission error for specific user list')
        }
      }

      // Handle role-based targeting
      if (data.roles && data.roles.length > 0) {
        console.log(`🔍 Looking for users with roles: ${data.roles.join(', ')}`)

        try {
          // Try both exact case and uppercase matching for roles
          const rolesToSearch = data.roles.flatMap(role => [role, role.toUpperCase()])
          console.log(`🔍 Searching for roles (including uppercase): ${rolesToSearch.join(', ')}`)

          const roleQueries = rolesToSearch.map(role =>
            usersRef.where('role', '==', role).get()
          )
          const roleResults = await Promise.all(roleQueries)

          roleResults.forEach((snapshot, index) => {
            const searchedRole = rolesToSearch[index]
            console.log(`🔍 Found ${snapshot.docs.length} users with role: ${searchedRole}`)
            snapshot.docs.forEach(doc => {
              const userData = doc.data()
              users.push({
                id: doc.id,
                email: userData?.email || '',
                name: userData?.name || '',
                role: userData?.role || ''
              })
              console.log(`✅ Found user: ${doc.id} (${userData?.email}) with role: ${userData?.role}`)
            })
          })
        } catch (firebaseError) {
          console.error('❌ Firebase permission error for role-based targeting. Using fallback.')
          return this.getFallbackUsers(data)
        }
      }

      // Brevo allows sending to any email address, so we don't need to check for verified emails
      // The fallback is only used when Firebase permissions fail

      // Remove duplicates based on user ID
      const uniqueUsers = users.filter((user, index, self) =>
        index === self.findIndex(u => u.id === user.id)
      )

      return uniqueUsers
    } catch (error: any) {
      console.error('Error getting target users:', error)
      return []
    }
  }

  // Convenience methods for common notification types
  static async sendGiftRejectionNotification(giftData: any, targetUsers: string[]) {
    // Map the database field names to the expected format
    const mappedGiftData = {
      giftId: giftData.GIFT_ID || giftData.giftId,
      fullName: giftData.fullName || giftData.FULL_NAME,
      memberLogin: giftData.memberLogin || giftData.MEMBER_LOGIN,
      giftItem: giftData.giftItem || giftData.GIFT_ITEM,
      cost: giftData.cost || giftData.GIFT_COST,
      category: giftData.category || giftData.CATEGORY,
      kamRequestedBy: giftData.kamRequestedBy || giftData.KAM_NAME,
      kamEmail: giftData.kamEmail || giftData.KAM_EMAIL,
      approvalReviewedBy: giftData.approvalReviewedBy, // This should now contain the actual name
      rejectReason: giftData.rejectReason || giftData.REJECT_REASON
    }

    return this.sendIntegratedNotification({
      userId: null,
      targetUserIds: targetUsers.length > 0 ? targetUsers : null,
      roles: targetUsers.length === 0 ? ['KAM', 'ADMIN'] : [], // Use role-based targeting if no specific users
      module: 'gift-approval',
      type: 'rejection',
      title: 'Gift Request Rejected',
      message: `Gift request #${mappedGiftData.giftId} has been rejected`,
      action: 'gift_rejected',
      priority: 'high',
      data: { giftId: mappedGiftData.giftId, reason: mappedGiftData.rejectReason },
      emailTemplate: 'gift_rejected',
      emailData: mappedGiftData,
      sendEmail: true,
      sendNotification: true
    })
  }

  // New convenience methods for different targeting scenarios
  static async sendGlobalNotification(title: string, message: string, module: string = 'gift-approval') {
    return this.sendIntegratedNotification({
      userId: null,
      targetUserIds: null,
      roles: [], // Empty array for global notification
      module,
      type: 'global',
      title,
      message,
      action: 'global_notification',
      priority: 'medium',
      data: {},
      sendEmail: false, // Global notifications typically don't send emails
      sendNotification: true
    })
  }

  static async sendToSpecificUser(
    userId: string,
    title: string,
    message: string,
    module: string = 'gift-approval',
    sendEmail: boolean = true,
    sendNotification: boolean = true
  ) {
    return this.sendIntegratedNotification({
      userId,
      targetUserIds: null,
      roles: [],
      module,
      type: 'user_specific',
      title,
      message,
      action: 'user_notification',
      priority: 'medium',
      data: { targetUserId: userId },
      sendEmail,
      sendNotification
    })
  }

  static async sendToSpecificUsers(
    targetUserIds: string[],
    title: string,
    message: string,
    module: string = 'gift-approval',
    sendEmail: boolean = true,
    sendNotification: boolean = true
  ) {
    return this.sendIntegratedNotification({
      userId: null,
      targetUserIds,
      roles: [],
      module,
      type: 'users_specific',
      title,
      message,
      action: 'users_notification',
      priority: 'medium',
      data: { targetUserIds },
      sendEmail,
      sendNotification
    })
  }

  static async sendToRoles(
    roles: string[],
    title: string,
    message: string,
    module: string = 'gift-approval',
    sendEmail: boolean = true,
    sendNotification: boolean = true
  ) {
    return this.sendIntegratedNotification({
      userId: null,
      targetUserIds: null,
      roles,
      module,
      type: 'role_based',
      title,
      message,
      action: 'role_notification',
      priority: 'medium',
      data: { targetRoles: roles },
      sendEmail,
      sendNotification
    })
  }

  static async sendToMultipleTargets(userId: string | null, targetUserIds: string[] | null, roles: string[], title: string, message: string, module: string = 'gift-approval') {
    return this.sendIntegratedNotification({
      userId,
      targetUserIds,
      roles,
      module,
      type: 'multi_target',
      title,
      message,
      action: 'multi_notification',
      priority: 'medium',
      data: { userId, targetUserIds, roles },
      sendEmail: true,
      sendNotification: true
    })
  }

  static async sendBulkActionNotification(action: string, giftIds: number[], userEmail: string, targetRoles: string[]) {
    return this.sendIntegratedNotification({
      userId: null,
      targetUserIds: null,
      roles: targetRoles,
      module: 'gift-approval',
      type: 'bulk_action',
      title: 'Bulk Action Completed',
      message: `Bulk action "${action}" completed for ${giftIds.length} gifts`,
      action: 'bulk_action',
      priority: 'medium',
      data: { action, giftIds, count: giftIds.length },
      emailTemplate: 'bulk_action',
      emailData: { giftIds, action, userEmail },
      sendEmail: true,
      sendNotification: true
    })
  }

  // Dedicated method for bulk gift rejections with detailed gift data
  static async sendBulkGiftRejectionNotification(giftDataArray: any[], rejectedBy: string, rejectReason: string, targetRoles: string[]) {
    console.log('🚀 [BULK REJECTION] Starting bulk gift rejection notification:', {
      giftCount: giftDataArray.length,
      rejectedBy,
      rejectReason,
      targetRoles
    })

    return this.sendIntegratedNotification({
      userId: null,
      targetUserIds: null,
      roles: targetRoles,
      module: 'gift-approval',
      type: 'bulk_rejection',
      title: 'Bulk Gift Rejection',
      message: `${giftDataArray.length} gift(s) have been rejected`,
      action: 'bulk_gift_rejected',
      priority: 'high',
      data: {
        giftCount: giftDataArray.length,
        rejectedBy,
        rejectReason,
        giftIds: giftDataArray.map(gift => gift.giftId)
      },
      emailTemplate: 'bulk_gift_rejected',
      emailData: {
        giftDataArray,
        rejectedBy,
        rejectReason,
        giftCount: giftDataArray.length
      },
      sendEmail: true,
      sendNotification: true
    })
  }

  // New method for delivery status notifications
  static async sendGiftDeliveryNotification(giftData: any, updatedBy: string, targetRoles: string[]) {
    console.log('🚀 [DELIVERY] Starting gift delivery notification:', {
      giftId: giftData.giftId,
      updatedBy,
      targetRoles
    })

    return this.sendIntegratedNotification({
      userId: null,
      targetUserIds: null,
      roles: targetRoles,
      module: 'gift-approval',
      type: 'delivery_status',
      title: 'Gift Delivered',
      message: `Gift #${giftData.giftId} has been marked as delivered`,
      action: 'gift_delivered',
      priority: 'medium',
      data: {
        giftId: giftData.giftId,
        updatedBy,
        trackingCode: giftData.trackingCode,
        dispatcher: giftData.dispatcher
      },
      emailTemplate: 'gift_delivered',
      emailData: {
        ...giftData,
        updatedBy
      },
      sendEmail: true,
      sendNotification: true
    })
  }

  // New method for bulk delivery status notifications
  static async sendBulkGiftDeliveryNotification(giftDataArray: any[], updatedBy: string, targetRoles: string[]) {
    console.log('🚀 [BULK DELIVERY] Starting bulk gift delivery notification:', {
      giftCount: giftDataArray.length,
      updatedBy,
      targetRoles
    })

    return this.sendIntegratedNotification({
      userId: null,
      targetUserIds: null,
      roles: targetRoles,
      module: 'gift-approval',
      type: 'bulk_delivery_status',
      title: 'Multiple Gifts Delivered',
      message: `${giftDataArray.length} gift(s) have been marked as delivered`,
      action: 'bulk_gift_delivered',
      priority: 'medium',
      data: {
        giftCount: giftDataArray.length,
        updatedBy,
        giftIds: giftDataArray.map(gift => gift.giftId)
      },
      emailTemplate: 'bulk_gift_delivered',
      emailData: {
        giftDataArray,
        updatedBy,
        giftCount: giftDataArray.length
      },
      sendEmail: true,
      sendNotification: true
    })
  }

  static async sendWorkflowUpdateNotification(giftData: any, fromStatus: string, toStatus: string, targetRoles: string[]) {
    return this.sendIntegratedNotification({
      userId: null,
      targetUserIds: null,
      roles: targetRoles,
      module: 'gift-approval',
      type: 'workflow_update',
      title: 'Workflow Status Updated',
      message: `Gift #${giftData.giftId} moved from ${fromStatus} to ${toStatus}`,
      action: 'workflow_update',
      priority: 'medium',
      data: { giftId: giftData.giftId, fromStatus, toStatus },
      emailTemplate: 'workflow_update',
      emailData: { ...giftData, fromStatus, toStatus },
      sendEmail: true,
      sendNotification: true
    })
  }

  // Fallback method when Firebase permissions fail
  private static getFallbackUsers(data: IntegratedNotificationData): Array<{ id: string; email: string; name: string; role: string }> {
    console.log('🔄 Using fallback user targeting method')

    // For gift rejection notifications, we can use a hardcoded list of admin emails
    // This is a temporary solution until Firebase permissions are fixed
    // Note: Brevo allows sending to any email address, so we can use any valid email
    const fallbackUsers = [
      {
        id: 'fallback-admin-1',
        email: process.env.ADMIN_EMAIL_1 || 'dsa.dev24@gmail.com',
        name: 'ZK Admin',
        role: 'ADMIN'
      }
    ]

    console.log(`🔄 Fallback users before filtering:`, fallbackUsers.map((u: { id: string; email: string; name: string; role: string }) => ({ id: u.id, email: u.email, name: u.name, role: u.role })))

    // Filter out any empty emails and default placeholder emails
    const filteredUsers = fallbackUsers.filter((user: { id: string; email: string; name: string; role: string }) =>
      user.email &&
      user.email.trim() !== '' &&
      user.email !== 'admin@company.com' &&
      user.email !== 'admin2@company.com'
    )

    console.log(`🔄 Fallback users after filtering:`, filteredUsers.map((u: { id: string; email: string; name: string; role: string }) => ({ id: u.id, email: u.email, name: u.name, role: u.role })))

    return filteredUsers
  }
}
