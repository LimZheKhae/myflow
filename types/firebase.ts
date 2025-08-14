import { Timestamp } from 'firebase/firestore'
import { UserRole, Permission, MemberType } from './auth'

// Base Firebase document interface
export interface FirebaseDocument {
  id: string
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy?: string
  updatedBy?: string
}

// User document in Firestore
export interface FirebaseUser extends FirebaseDocument {
  email: string
  name: string
  role: UserRole
  merchants: string[]
  currencies: string[]
  memberAccess: MemberType[]
  permissions: Record<string, Permission[]>
  isActive: boolean
  isArchived?: boolean
  archivedAt?: Timestamp
  archivedBy?: string
  department?: string
  region?: string
  supervisor?: string
  lastLogin?: Timestamp
  lastPermissionUpdate?: Timestamp
  additionalData: Record<string, any>
}

// VIP Profile document
export interface FirebaseVIPProfile extends FirebaseDocument {
  name: string
  email: string
  phone: string
  merchant: string
  currency: string
  memberType: MemberType
  totalDeposit: number
  lastActivity: Timestamp
  status: 'Active' | 'Inactive' | 'Suspended'
  assignedKAM: string
  playerNotes: VIPNote[]
  giftHistory: string[] // References to gift documents
  campaignHistory: string[] // References to campaign participations
  customFields: Record<string, any>
}

// VIP Notes sub-collection
export interface VIPNote extends FirebaseDocument {
  vipProfileId: string
  content: string
  type: 'General' | 'Call' | 'Meeting' | 'Gift' | 'Complaint'
  isPrivate: boolean
  attachments?: string[]
}

// Campaign document
export interface FirebaseCampaign extends FirebaseDocument {
  name: string
  type: 'Reactivation' | 'Retention' | 'Acquisition' | 'VIP'
  status: 'Draft' | 'Active' | 'Paused' | 'Completed' | 'Cancelled'
  targetCount: number
  completedCalls: number
  merchant: string
  currency: string
  description?: string
  startDate: Timestamp
  endDate?: Timestamp
  targetCriteria: CampaignCriteria
  assignedUsers: string[]
  targets: CampaignTarget[]
  results: CampaignResults
}

// Campaign criteria for targeting
export interface CampaignCriteria {
  memberTypes: MemberType[]
  depositRange?: {
    min: number
    max: number
  }
  lastActivityDays?: number
  merchants?: string[]
  currencies?: string[]
  customFilters?: Record<string, any>
}

// Campaign target (individual player in campaign)
export interface CampaignTarget {
  vipProfileId: string
  playerName: string
  status: 'Pending' | 'Called' | 'Contacted' | 'Converted' | 'Not Interested'
  callDate?: Timestamp
  notes?: string
  outcome?: string
  assignedTo?: string
}

// Campaign results tracking
export interface CampaignResults {
  totalCalls: number
  successfulContacts: number
  conversions: number
  totalRevenue?: number
  notes?: string
}

// Gift Request document
export interface FirebaseGiftRequest extends FirebaseDocument {
  playerName: string
  vipProfileId: string
  requestedBy: string
  requestedByName: string
  giftType: 'Cash Bonus' | 'Free Spins' | 'Physical Gift' | 'Discount' | 'Other'
  amount: number
  currency: string
  merchant: string
  reason: string
  description?: string
  status: 'Pending' | 'Approved' | 'Rejected' | 'Processing' | 'Completed' | 'Cancelled'
  approvedBy?: string
  approvedAt?: Timestamp
  rejectedBy?: string
  rejectedAt?: Timestamp
  rejectionReason?: string
  procurementStatus?: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Failed'
  procurementNotes?: string
  deliveryDate?: Timestamp
  attachments?: string[]
  approvalWorkflow: GiftApprovalStep[]
}

// Gift approval workflow tracking
export interface GiftApprovalStep {
  step: number
  role: UserRole
  userId?: string
  userName?: string
  action: 'Pending' | 'Approved' | 'Rejected'
  timestamp?: Timestamp
  comments?: string
}

// Activity Log for audit trail
export interface FirebaseActivityLog extends FirebaseDocument {
  userId: string
  userName: string
  action: string
  module: string
  entityType: string
  entityId: string
  details: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

// System Settings document
export interface FirebaseSystemSettings extends FirebaseDocument {
  setting: string
  value: any
  category: 'auth' | 'permissions' | 'workflow' | 'notifications' | 'general'
  description?: string
  isActive: boolean
}

// Notification document
export interface FirebaseNotification extends FirebaseDocument {
  userId: string
  title: string
  message: string
  type: 'info' | 'warning' | 'error' | 'success'
  isRead: boolean
  module?: string
  entityId?: string
  actionUrl?: string
  readAt?: Timestamp
}

// Permission matrix for complex RBAC
export interface FirebasePermissionMatrix extends FirebaseDocument {
  role: UserRole
  module: string
  permissions: Permission[]
  conditions: {
    merchantRestricted?: boolean
    currencyRestricted?: boolean
    memberTypeRestricted?: boolean
    ownerOnly?: boolean
    regionRestricted?: boolean
    departmentRestricted?: boolean
  }
  dataAccess: {
    [field: string]: 'FULL' | 'READ_ONLY' | 'RESTRICTED' | 'HIDDEN'
  }
}

// File upload metadata
export interface FirebaseFileMetadata extends FirebaseDocument {
  fileName: string
  originalName: string
  mimeType: string
  size: number
  uploadedBy: string
  module: string
  entityId: string
  downloadURL: string
  storagePath: string
}

// Export/Import job tracking
export interface FirebaseDataJob extends FirebaseDocument {
  type: 'export' | 'import'
  module: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  requestedBy: string
  fileName?: string
  downloadURL?: string
  progress: number
  totalRecords?: number
  processedRecords?: number
  errorMessage?: string
  filters?: Record<string, any>
} 