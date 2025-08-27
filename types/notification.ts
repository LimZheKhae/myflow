// Notification Type Constants - Module-Specific Types
export const NOTIFICATION_TYPES = {
  // Common types (used across modules)
  COMMON: {
    WORKFLOW: 'workflow',
    SYSTEM: 'system',
    ERROR: 'error',
    BULK: 'bulk',
    MAINTENANCE: 'maintenance',
  },
  
  // Gift Approval Module
  GIFT_APPROVAL: {
    WORKFLOW: 'workflow',
    APPROVAL: 'approval',
    REJECTION: 'rejection',
    BULK_IMPORT: 'bulk_import',
    VALIDATION_ERROR: 'validation_error',
    PROCEED_TO_NEXT: 'proceed_to_next',
    BO_UPLOAD: 'bo_upload',
  },
  
  // VIP Profile Module (future)
  VIP_PROFILE: {
    PROFILE_UPDATE: 'profile_update',
    VIP_CREATION: 'vip_creation',
    STATUS_CHANGE: 'status_change',
    IMPORT_ERROR: 'import_error',
    BULK_UPDATE: 'bulk_update',
  },
  
  // Campaign Module (future)
  CAMPAIGN: {
    CAMPAIGN_LAUNCH: 'campaign_launch',
    CAMPAIGN_PAUSE: 'campaign_pause',
    PERFORMANCE_ALERT: 'performance_alert',
    BUDGET_WARNING: 'budget_warning',
    TARGET_REACHED: 'target_reached',
  },
  
  // User Management Module (future)
  USER_MANAGEMENT: {
    USER_CREATED: 'user_created',
    PERMISSION_CHANGE: 'permission_change',
    ROLE_UPDATE: 'role_update',
    LOGIN_ALERT: 'login_alert',
    ACCOUNT_LOCKED: 'account_locked',
  },
  
  // Reports Module (future)
  REPORTS: {
    REPORT_GENERATED: 'report_generated',
    EXPORT_COMPLETE: 'export_complete',
    SCHEDULED_REPORT: 'scheduled_report',
    DATA_ANALYSIS: 'data_analysis',
  },
} as const

// Type helper for getting all possible notification types
export type NotificationType = 
  | typeof NOTIFICATION_TYPES.COMMON[keyof typeof NOTIFICATION_TYPES.COMMON]
  | typeof NOTIFICATION_TYPES.GIFT_APPROVAL[keyof typeof NOTIFICATION_TYPES.GIFT_APPROVAL]
  | typeof NOTIFICATION_TYPES.VIP_PROFILE[keyof typeof NOTIFICATION_TYPES.VIP_PROFILE]
  | typeof NOTIFICATION_TYPES.CAMPAIGN[keyof typeof NOTIFICATION_TYPES.CAMPAIGN]
  | typeof NOTIFICATION_TYPES.USER_MANAGEMENT[keyof typeof NOTIFICATION_TYPES.USER_MANAGEMENT]
  | typeof NOTIFICATION_TYPES.REPORTS[keyof typeof NOTIFICATION_TYPES.REPORTS]
  | string // Allow any string for future flexibility

export interface Notification {
  id?: string

  // Targeting
  userId: string | null // Specific user or null for global
  targetUserIds: string[] | null // Pre-filtered user list
  roles: string[] // Role-based targeting

  // Content
  module: string // Module name (e.g., "gift-approval")
  type: NotificationType // Flexible type with constants for better organization
  title: string // Notification title
  message: string // Notification message
  action: string // Action identifier

  // Metadata
  priority: 'low' | 'medium' | 'high' | 'critical'
  read: boolean // Read status
  readAt: Date | null // When read
  readBy: string | null // Who read it

  // Timestamps
  createdAt: Date
  expiresAt: Date | null // Optional expiration

  // Context and Actions
  data: Record<string, any> // Additional context data
  actions: NotificationAction[] // Interactive actions
}

export interface NotificationAction {
  label: string
  action: 'navigate' | 'mark_read' | 'dismiss'
  url?: string // For navigate action
}

export interface NotificationSettings {
  userId: string

  // Channel preferences
  email: boolean
  push: boolean
  inApp: boolean

  // Module preferences (only modules user has VIEW permission for)
  modules: {
    'gift-approval': boolean
    'vip-profile': boolean
    'campaign': boolean
    'reports': boolean
    'user-management': boolean
    // Additional modules can be added dynamically
    [key: string]: boolean
  }

  // Timestamps
  createdAt: Date
  updatedAt: Date
}

// Firebase document data (without id and auto-generated fields)
export type NotificationData = Omit<Notification, 'id' | 'read' | 'readAt' | 'readBy' | 'createdAt'>
export type NotificationSettingsData = Omit<NotificationSettings, 'userId'>
