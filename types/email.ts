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

export interface GiftEmailData {
  giftId: number
  fullName: string
  memberLogin: string
  giftItem: string
  cost: number
  category: string
  kamRequestedBy: string
  kamEmail: string
  approvalReviewedBy?: string
  managerEmail?: string
  rejectReason?: string
  trackingStatus?: string
  dispatcher?: string
  trackingCode?: string
  mktOpsUpdatedBy?: string
  auditorName?: string // This maps to auditorName from the gift data
  auditorEmail?: string // This maps to auditorEmail from the gift data
  kamProofBy?: string
  kamProofEmail?: string
  giftFeedback?: string
  auditRemark?: string
  createdDate?: Date
  lastModifiedDate?: Date
}
