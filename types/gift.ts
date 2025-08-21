// Gift Module Types - Based on MY_FLOW.PUBLIC.GIFT_DETAILS table

import { z } from 'zod'

// Zod schema for gift request form validation
export const giftRequestFormSchema = z.object({
  vipId: z.string().min(1, 'VIP Player is required'),
  memberName: z.string().min(1, 'Member name is required'),
  memberLogin: z.string().min(1, 'Member login is required'),
  giftItem: z.string().min(1, 'Gift item is required'),
  rewardName: z.string().optional(),
  rewardClubOrder: z.string().optional(),
  value: z
    .string()
    .min(1, 'Value is required')
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Value must be a positive number'),
  remark: z.string().optional(),
  category: z
    .string()
    .min(1, 'Category is required')
    .refine((val) => ['Birthday', 'Retention', 'High Roller', 'Promotion', 'Other'].includes(val), 'Please select a valid category'),
})

export type GiftRequestFormSchema = z.infer<typeof giftRequestFormSchema>

export interface GiftRequestDetails {
  // Primary Key
  giftId: number

  // Basic Information
  vipId: number | null
  batchId: number | null
  kamRequestedBy: string | null
  createdDate: Date | null
  workflowStatus: WorkflowStatus | null

  // Player Information
  memberLogin: string | null
  fullName: string | null
  phone: string | null
  address: string | null

  // Gift Information
  rewardName: string | null
  giftItem: string | null
  costMyr: number | null
  costVnd: number | null
  remark: string | null
  rewardClubOrder: string | null
  category: GiftCategory | null

  // Approval Information
  approvalReviewedBy: number | null

  // MKTOps Information
  dispatcher: string | null
  trackingCode: string | null
  trackingStatus: TrackingStatus | null
  purchasedBy: number | null
  mktPurchaseDate: Date | null
  uploadedBo: boolean | null
  mktProof: string | null

  // KAM Proof Information
  kamProof: string | null
  kamProofBy: number | null
  giftFeedback: string | null

  // Audit Information
  auditedBy: number | null
  auditDate: Date | null
  auditRemark: string | null

  // Rejection Information
  rejectReason: string | null

  // System Information
  lastModifiedDate: Date | null
}

// Enums for better type safety
export type GiftCategory = 'Birthday' | 'Retention' | 'High Roller' | 'Promotion' | 'Other'

export type TrackingStatus = 'Pending' | 'In Transit' | 'Delivered' | 'Failed' | 'Returned'

export type WorkflowStatus = 'KAM_Request' | 'Manager_Review' | 'MKTOps_Processing' | 'KAM_Proof' | 'SalesOps_Audit' | 'Completed' | 'Rejected'

// Bulk Import Types
export interface BulkImportBatch {
  BATCH_ID: number
  BATCH_NAME: string
  UPLOADED_BY: string
  TOTAL_ROWS: number
  CREATED_DATE: string
  COMPLETED_AT: string | null
  IS_ACTIVE: boolean
}

// CSV Import Types for different tabs
export interface PendingTabRow {
  memberLogin: string
  fullName: string
  phone: string
  address: string
  rewardName: string
  giftItem: string
  costMyr: number | null
  costVnd: number | null
  remark: string | null
  rewardClubOrder: string | null
  category: GiftCategory
}

export interface ProcessingTabRow {
  giftId: number
  dispatcher: string
  trackingCode: string
  trackingStatus: TrackingStatus
  mktOpsProof?: File | string // Image file for MKTOps proof
}

export interface KamProofTabRow {
  giftId: number
  kamProof?: string // Optional field
  giftFeedback?: string // Optional field
}

export interface AuditTabRow {
  giftId: number
  auditRemark: string
}

// Form Types for UI
export interface GiftRequestForm {
  vipId: string // Required: VIP Player ID
  memberName: string // Required: VIP Member Name
  memberLogin: string // Required: VIP Member Login
  giftItem: string // Required: Gift item description
  rewardName?: string // Optional: Reward name
  rewardClubOrder?: string // Optional: Reward club order
  value: string // Required: Gift value (will be stored as costMyr)
  remark?: string // Optional: Additional remarks
  category: GiftCategory | '' // Required: Gift category
}

// API Response Types
export interface BulkImportResult {
  success: boolean
  message: string
  importedCount: number
  failedCount: number
  batchId: string
  createdGiftIds?: number[] // Array of created gift IDs for logging
  failedRows?: Array<{
    row: any
    error: string
  }>
  totalValue?: number
}

// Update API Types
export interface GiftUpdateRequest {
  giftId: number
  tab: string
  action: string
  userId: string
  userRole?: string
  userPermissions?: Record<string, string[]>
  // Tab-specific fields
  rejectReason?: string
  dispatcher?: string
  trackingCode?: string
  trackingStatus?: string
  kamProof?: string
  giftFeedback?: string
  auditRemark?: string
}

export interface GiftUpdateResult {
  success: boolean
  message: string
  data?: {
    giftId: number
    newStatus: string
    updatedBy: string
    updatedAt: string
  }
  error?: string
}

// Tab-specific update types
export interface PendingUpdateData {
  rejectReason?: string
}

export interface ProcessingUpdateData {
  dispatcher?: string
  trackingCode?: string
  trackingStatus?: string
}

export interface KamProofUpdateData {
  kamProof?: string
  giftFeedback?: string
}

export interface AuditUpdateData {
  auditRemark?: string
}

// Filter and Search Types
export interface GiftFilters {
  dateRange?: {
    from: Date
    to: Date
  }
  category?: GiftCategory
  workflowStatus?: WorkflowStatus
  kamRequestedBy?: string
  memberLogin?: string
  costRange?: {
    min: number
    max: number
  }
}

// Statistics Types
export interface GiftStatistics {
  totalGifts: number
  totalValueMyr: number
  totalValueVnd: number
  pendingCount: number
  processingCount: number
  completedCount: number
  rejectedCount: number
  averageCostMyr: number
  averageCostVnd: number
  categoryBreakdown: Record<GiftCategory, number>
  statusBreakdown: Record<WorkflowStatus, number>
}

// Timeline Types
export interface GiftTimelineEvent {
  ID: number
  GIFT_ID: number
  FROM_STATUS: string | null
  TO_STATUS: string
  CHANGED_BY: string
  CHANGED_AT: string
  REMARK: string | null
}

export interface GiftTimelineResponse {
  success: boolean
  data: GiftTimelineEvent[]
  message: string
}
