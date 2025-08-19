// Gift Module Types - Based on MY_FLOW.PRESENTATION.GIFT_REQUEST_DETAILS table

export interface GiftRequestDetails {
  // Primary Key
  giftId: number;

  // Basic Information
  vipId: number | null;
  batchId: number | null;
  kamRequestedBy: string | null;
  createdDate: Date | null;
  workflowStatus: WorkflowStatus | null;

  // Player Information
  memberLogin: string | null;
  fullName: string | null;
  phone: string | null;
  address: string | null;

  // Gift Information
  rewardName: string | null;
  giftItem: string | null;
  costMyr: number | null;
  costVnd: number | null;
  remark: string | null;
  rewardClubOrder: string | null;
  category: GiftCategory | null;

  // Approval Information
  approvalReviewedBy: number | null;

  // MKTOps Information
  dispatcher: string | null;
  trackingCode: string | null;
  trackingStatus: TrackingStatus | null;
  purchasedBy: number | null;
  mktPurchaseDate: Date | null;
  uploadedBo: boolean | null;
  mktProof: string | null;
  mktProofBy: number | null;

  // KAM Proof Information
  kamProof: string | null;
  kamProofBy: number | null;
  giftFeedback: string | null;

  // Audit Information
  auditedBy: number | null;
  auditDate: Date | null;
  auditRemark: string | null;

  // System Information
  lastModifiedDate: Date | null;
}

// Enums for better type safety
export type GiftCategory = "Birthday" | "Retention" | "High Roller" | "Promotion" | "Other";

export type TrackingStatus = "Pending" | "In Transit" | "Delivered" | "Failed" | "Returned";

export type WorkflowStatus = "KAM_Request" | "Manager_Review" | "MKTOps_Processing" | "KAM_Proof" | "SalesOps_Audit" | "Completed" | "Rejected";

// Bulk Import Types
export interface BulkImportBatch {
  batchId: string;
  batchName: string;
  uploadedBy: string;
  totalRows: number;
  status: BatchStatus;
  createdAt: Date;
  completedAt?: Date;
}

export type BatchStatus = "ACTIVE" | "INACTIVE";

// CSV Import Types for different tabs
export interface PendingTabRow {
  memberLogin: string;
  fullName: string;
  phone: string;
  address: string;
  rewardName: string;
  giftItem: string;
  costMyr: number | null;
  costVnd: number | null;
  remark: string | null;
  rewardClubOrder: string | null;
  category: GiftCategory;
}

export interface ProcessingTabRow {
  giftId: number;
  dispatcher: string;
  trackingCode: string;
  trackingStatus: TrackingStatus;
  mktOpsProof?: File | string; // Image file for MKTOps proof
}

export interface KamProofTabRow {
  giftId: number;
  kamProof?: string; // Optional field
  giftFeedback?: string; // Optional field
}

export interface AuditTabRow {
  giftId: number;
  auditRemark: string;
}

// Form Types for UI
export interface GiftRequestForm {
  vipId: string;
  giftItem: string;
  rewardName: string;
  rewardClubOrder: string;
  value: string;
  remark: string;
  category: GiftCategory | "";
}

// API Response Types
export interface BulkImportResult {
  success: boolean;
  message: string;
  importedCount: number;
  failedCount: number;
  batchId: string;
  failedRows?: Array<{
    row: any;
    error: string;
  }>;
  totalValue?: number;
}

// Filter and Search Types
export interface GiftFilters {
  dateRange?: {
    from: Date;
    to: Date;
  };
  category?: GiftCategory;
  workflowStatus?: WorkflowStatus;
  kamRequestedBy?: string;
  memberLogin?: string;
  costRange?: {
    min: number;
    max: number;
  };
}

// Statistics Types
export interface GiftStatistics {
  totalGifts: number;
  totalValueMyr: number;
  totalValueVnd: number;
  pendingCount: number;
  processingCount: number;
  completedCount: number;
  rejectedCount: number;
  averageCostMyr: number;
  averageCostVnd: number;
  categoryBreakdown: Record<GiftCategory, number>;
  statusBreakdown: Record<WorkflowStatus, number>;
}
