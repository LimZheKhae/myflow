// Gift Module Types - Based on MY_FLOW.PUBLIC.GIFT_DETAILS table

import { z } from 'zod'

// Zod schema for gift request form validation
export const giftRequestFormSchema = z.object({
  merchant: z.string().min(1, 'Merchant is required'),
  memberName: z.string().min(1, 'Member name is required'),
  memberLogin: z.string().min(1, 'Member login is required'),
  memberId: z.number().min(1, 'Member ID is required'),
  giftItem: z.string().min(1, 'Gift item is required'),
  rewardName: z.string().min(1, 'Reward name is required')
    .refine((val) => REWARD_NAME_OPTIONS.includes(val as RewardName), 'Please select a valid reward name'),
  rewardClubOrder: z.string().optional(),
  value: z
    .string()
    .min(1, 'Gift cost is required')
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Gift cost must be a positive number'),
  currency: z.string().min(1, 'Currency is required'),
  description: z.string().optional(),
  category: z
    .string()
    .min(1, 'Category is required')
    .refine((val) => ['Birthday Gift', 'Offline Campaign', 'Online Campaign', 'Festival Gift', 'Leaderboard', 'Loyalty Gift', 'Rewards Club', 'Others'].includes(val), 'Please select a valid category'),
})

export type GiftRequestFormSchema = z.infer<typeof giftRequestFormSchema>

export type WorkflowStatus =
  | 'KAM_Request'
  | 'Manager_Review'
  | 'MKTOps_Processing'
  | 'KAM_Proof'
  | 'SalesOps_Audit'
  | 'Completed'
  | 'Rejected'

export type TrackingStatus =
  | 'Pending'
  | 'In_Transit'
  | 'Delivered'
  | 'Failed'
  | 'Returned'

export type GiftCategory =
  | 'Birthday Gift'
  | 'Offline Campaign'
  | 'Online Campaign'
  | 'Festival Gift'
  | 'Leaderboard'
  | 'Loyalty Gift'
  | 'Rewards Club'
  | 'Others'

// Base gift details interface (raw table data)
export interface GiftRequestDetailsTable {
  giftId: number
  memberId: string | null
  merchantName: string | null
  kamRequestedBy: string | null // User ID
  createdDate: Date | null
  workflowStatus: WorkflowStatus | null
  memberLogin: string | null
  fullName: string | null
  phone: string | null
  address: string | null
  rewardName: string | null
  giftItem: string | null
  giftCost: number | null
  currency: string | null
  description: string | null
  rewardClubOrder: string | null
  category: GiftCategory | null
  approvalReviewedBy: string | null // User ID
  dispatcher: string | null
  trackingCode: string | null
  trackingStatus: TrackingStatus | null
  purchasedBy: string | null // User ID
  mktPurchaseDate: Date | null
  uploadedBo: string | null
  mktProof: string | null
  kamProof: string | null
  kamProofBy: string | null // User ID
  giftFeedback: string | null

  // Audit Information (from base table)
  auditedBy: string | null // AUDITED_BY from base table (user ID)
  auditDate: Date | null
  auditRemark: string | null
  rejectReason: string | null
  lastModifiedDate: Date | null
}

// Gift details from database view (with resolved names)
export interface GiftRequestDetailsView {
  giftId: number
  merchantName?: string | null
  kamRequestedBy: string | null // KAM_NAME from view (resolved name)
  kamEmail?: string | null
  memberId: string | null
  createdDate: Date | null
  workflowStatus: WorkflowStatus | null
  memberLogin?: string | null
  fullName?: string | null
  phone?: string | null
  address?: string | null
  rewardName?: string | null
  giftItem?: string | null
  giftCost?: number | null
  currency?: string | null
  description?: string | null
  rewardClubOrder?: string | null
  category?: GiftCategory | null
  approvalReviewedBy?: string | null // MANAGER_NAME from view (resolved name)
  managerEmail?: string | null
  dispatcher?: string | null
  trackingCode?: string | null
  trackingStatus?: TrackingStatus | null
  purchasedBy?: string | null // MKTOPS_NAME from view (resolved name)
  mktOpsEmail?: string | null
  mktPurchaseDate?: Date | null
  uploadedBo?: string | null
  mktProof?: string | null
  kamProof?: string | null
  kamProofBy?: string | null // KAM_PROOF_NAME from view (resolved name)
  kamProofEmail?: string | null
  giftFeedback?: string | null

  // Audit Information (from view)
  auditorName: string | null // AUDITER_NAME from view (resolved name)
  auditorEmail?: string | null
  auditDate: Date | null
  auditRemark?: string | null
  rejectReason?: string | null
  lastModifiedDate: Date | null
}

// Legacy type - keeping for backward compatibility
// This maps to GiftRequestDetailsView for now
export interface GiftRequestDetails extends GiftRequestDetailsView { }

// Enums for better type safety
export enum WorkflowStatusEnum {
  KAM_REQUEST = 'KAM_Request',
  MANAGER_REVIEW = 'Manager_Review',
  MKTOPS_PROCESSING = 'MKTOps_Processing',
  KAM_PROOF = 'KAM_Proof',
  SALESOPS_AUDIT = 'SalesOps_Audit',
  COMPLETED = 'Completed',
  REJECTED = 'Rejected'
}

export enum TrackingStatusEnum {
  PENDING = 'Pending',
  IN_TRANSIT = 'In_Transit',
  DELIVERED = 'Delivered',
  FAILED = 'Failed',
  RETURNED = 'Returned'
}

export enum GiftCategoryEnum {
  BIRTHDAY_GIFT = 'Birthday Gift',
  OFFLINE_CAMPAIGN = 'Offline Campaign',
  ONLINE_CAMPAIGN = 'Online Campaign',
  FESTIVAL_GIFT = 'Festival Gift',
  LEADERBOARD = 'Leaderboard',
  LOYALTY_GIFT = 'Loyalty Gift',
  REWARDS_CLUB = 'Rewards Club',
  OTHERS = 'Others'
}

// Reward name options for dropdown
export const REWARD_NAME_OPTIONS = [
  'Alcohol & Beverages',
  'Concerts',
  'Electronics Devices',
  'Flight',
  'Fine-Dining',
  'Hotel Staycation',
  'Luxury Gifts',
  'Special Events',
  'Voucher & Coupons',
  'Festival Gifts',
  'Others'
] as const

export type RewardName = typeof REWARD_NAME_OPTIONS[number]

// Category options for dropdown
export const CATEGORY_OPTIONS = [
  'Birthday Gift',
  'Offline Campaign',
  'Online Campaign',
  'Festival Gift',
  'Leaderboard',
  'Loyalty Gift',
  'Rewards Club',
  'Others'
] as const

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
  cost: number | null
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
  merchant: string // Required: Merchant selection
  memberName: string // Required: VIP Member Name
  memberLogin: string // Required: VIP Member Login
  memberId?: number // Optional: Member ID from member profile
  giftItem: string // Required: Gift item description
  rewardName?: string // Optional: Reward name
  rewardClubOrder?: string // Optional: Reward club order
  value: string // Required: Gift cost (will be stored as GIFT_COST)
  currency: string // Required: Currency
  description?: string // Optional: Additional description (was remark)
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
  averageCost: number
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
