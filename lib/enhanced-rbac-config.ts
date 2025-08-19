import type { RoleDefinition } from "@/types/rbac";

// Enhanced RBAC Configuration with granular permissions
export const ENHANCED_RBAC_ROLES: RoleDefinition[] = [
  {
    role: "ADMIN",
    name: "System Administrator",
    description: "Full system access with all permissions",
    level: 1,
    modules: [
      {
        module: "vip-profile",
        actions: [
          { action: "VIEW", allowed: true },
          { action: "SEARCH", allowed: true },
          { action: "EDIT", allowed: true },
          { action: "ADD", allowed: true },
          { action: "DELETE", allowed: true },
          { action: "IMPORT", allowed: true },
          { action: "EXPORT", allowed: true },
        ],
        dataAccess: [
          { field: "personal_info", access: "FULL" },
          { field: "financial_data", access: "FULL" },
          { field: "activity_logs", access: "FULL" },
          { field: "notes", access: "FULL" },
        ],
        conditions: [],
      },
      {
        module: "campaign",
        actions: [
          { action: "VIEW", allowed: true },
          { action: "SEARCH", allowed: true },
          { action: "EDIT", allowed: true },
          { action: "ADD", allowed: true },
          { action: "DELETE", allowed: true },
          { action: "IMPORT", allowed: true },
          { action: "EXPORT", allowed: true },
        ],
        dataAccess: [
          { field: "campaign_data", access: "FULL" },
          { field: "performance_metrics", access: "FULL" },
          { field: "target_lists", access: "FULL" },
        ],
        conditions: [],
      },
      {
        module: "gift-approval",
        actions: [
          { action: "VIEW", allowed: true },
          { action: "SEARCH", allowed: true },
          { action: "EDIT", allowed: true },
          { action: "ADD", allowed: true },
          { action: "DELETE", allowed: true },
          { action: "IMPORT", allowed: true },
          { action: "EXPORT", allowed: true },
        ],
        dataAccess: [
          { field: "gift_requests", access: "FULL" },
          { field: "approval_history", access: "FULL" },
          { field: "financial_details", access: "FULL" },
        ],
        conditions: [],
      },
      {
        module: "user-management",
        actions: [
          { action: "VIEW", allowed: true },
          { action: "SEARCH", allowed: true },
          { action: "EDIT", allowed: true },
          { action: "ADD", allowed: true },
          { action: "DELETE", allowed: true },
          { action: "IMPORT", allowed: true },
          { action: "EXPORT", allowed: true },
        ],
        dataAccess: [
          { field: "user_profiles", access: "FULL" },
          { field: "permission_settings", access: "FULL" },
          { field: "audit_logs", access: "FULL" },
        ],
        conditions: [],
      },
    ],
    globalConditions: [],
  },
  {
    role: "MANAGER",
    name: "Department Manager",
    description: "Manage team members and approve requests",
    level: 2,
    modules: [
      {
        module: "vip-profile",
        actions: [
          { action: "VIEW", allowed: true },
          { action: "SEARCH", allowed: true },
          { action: "EDIT", allowed: false },
          { action: "ADD", allowed: false },
          { action: "DELETE", allowed: false },
          { action: "EXPORT", allowed: true },
        ],
        dataAccess: [
          { field: "personal_info", access: "READ_ONLY" },
          { field: "financial_data", access: "READ_ONLY" },
          { field: "activity_logs", access: "READ_ONLY" },
          { field: "notes", access: "READ_ONLY" },
        ],
        conditions: [
          { type: "MERCHANT", values: [], required: true },
          { type: "CURRENCY", values: [], required: true },
          { type: "MEMBER_TYPE", values: ["VIP"], required: true },
        ],
      },
      {
        module: "campaign",
        actions: [
          { action: "VIEW", allowed: true },
          { action: "SEARCH", allowed: true },
          { action: "EDIT", allowed: true, conditions: ["own_department"] },
          { action: "ADD", allowed: true },
          { action: "DELETE", allowed: false },
          { action: "EXPORT", allowed: true },
        ],
        dataAccess: [
          { field: "campaign_data", access: "FULL", conditions: ["own_department"] },
          { field: "performance_metrics", access: "READ_ONLY" },
          { field: "target_lists", access: "READ_ONLY" },
        ],
        conditions: [
          { type: "MERCHANT", values: [], required: true },
          { type: "CURRENCY", values: [], required: true },
        ],
      },
      {
        module: "gift-approval",
        actions: [
          { action: "VIEW", allowed: true },
          { action: "SEARCH", allowed: true },
          { action: "EDIT", allowed: true },

          { action: "IMPORT", allowed: true },
          { action: "EXPORT", allowed: true },
        ],
        dataAccess: [
          { field: "gift_requests", access: "FULL" },
          { field: "approval_history", access: "READ_ONLY" },
          { field: "financial_details", access: "READ_ONLY" },
        ],
        conditions: [
          { type: "MERCHANT", values: [], required: true },
          { type: "CURRENCY", values: [], required: true },
        ],
      },
      {
        module: "user-management",
        actions: [
          { action: "VIEW", allowed: true },
          { action: "SEARCH", allowed: true },
          { action: "EDIT", allowed: true, conditions: ["subordinates_only"] },
          { action: "ADD", allowed: false },
          { action: "DELETE", allowed: false },
        ],
        dataAccess: [
          { field: "user_profiles", access: "READ_ONLY" },
          { field: "permission_settings", access: "RESTRICTED", conditions: ["subordinates_only"] },
          { field: "audit_logs", access: "HIDDEN" },
        ],
        conditions: [{ type: "DEPARTMENT", values: [], required: true }],
      },
    ],
    globalConditions: [
      { type: "MERCHANT", values: [], required: true },
      { type: "CURRENCY", values: [], required: true },
    ],
  },
  {
    role: "KAM",
    name: "Key Account Manager",
    description: "Manage VIP players and campaigns",
    level: 3,
    modules: [
      {
        module: "vip-profile",
        actions: [
          { action: "VIEW", allowed: true },
          { action: "SEARCH", allowed: true },
          { action: "EDIT", allowed: true },
          { action: "ADD", allowed: true },
        ],
        dataAccess: [
          { field: "personal_info", access: "FULL" },
          { field: "financial_data", access: "READ_ONLY" },
          { field: "activity_logs", access: "FULL" },
          { field: "notes", access: "FULL" },
        ],
        conditions: [
          { type: "MERCHANT", values: [], required: true },
          { type: "CURRENCY", values: [], required: true },
          { type: "MEMBER_TYPE", values: ["VIP"], required: true },
          { type: "OWNER_ONLY", values: [], required: true },
        ],
      },
      {
        module: "campaign",
        actions: [
          { action: "VIEW", allowed: true },
          { action: "SEARCH", allowed: true },
          { action: "EDIT", allowed: true },
          { action: "ADD", allowed: true },
          { action: "DELETE", allowed: true, conditions: ["own_campaigns"] },
        ],
        dataAccess: [
          { field: "campaign_data", access: "FULL", conditions: ["own_campaigns"] },
          { field: "performance_metrics", access: "READ_ONLY" },
          { field: "target_lists", access: "FULL", conditions: ["own_campaigns"] },
        ],
        conditions: [
          { type: "MERCHANT", values: [], required: true },
          { type: "CURRENCY", values: [], required: true },
          { type: "OWNER_ONLY", values: [], required: true },
        ],
      },
      {
        module: "gift-approval",
        actions: [
          { action: "VIEW", allowed: true },
          { action: "SEARCH", allowed: true },
          { action: "ADD", allowed: true },
          { action: "IMPORT", allowed: true },
        ],
        dataAccess: [
          { field: "gift_requests", access: "FULL", conditions: ["own_requests"] },
          { field: "approval_history", access: "READ_ONLY" },
          { field: "financial_details", access: "HIDDEN" },
        ],
        conditions: [
          { type: "MERCHANT", values: [], required: true },
          { type: "CURRENCY", values: [], required: true },
          { type: "OWNER_ONLY", values: [], required: true },
        ],
      },
    ],
    globalConditions: [
      { type: "MERCHANT", values: [], required: true },
      { type: "CURRENCY", values: [], required: true },
      { type: "MEMBER_TYPE", values: ["VIP"], required: true },
    ],
  },
  {
    role: "PROCUREMENT",
    name: "Procurement Officer",
    description: "Handle gift procurement and tracking",
    level: 4,
    modules: [
      {
        module: "gift-approval",
        actions: [
          { action: "VIEW", allowed: true },
          { action: "SEARCH", allowed: true },
          { action: "EDIT", allowed: true, conditions: ["procurement_fields_only"] },
        ],
        dataAccess: [
          { field: "gift_requests", access: "READ_ONLY" },
          { field: "approval_history", access: "READ_ONLY" },
          { field: "financial_details", access: "FULL" },
          { field: "procurement_status", access: "FULL" },
          { field: "tracking_info", access: "FULL" },
        ],
        conditions: [
          { type: "MERCHANT", values: [], required: true },
          { type: "CURRENCY", values: [], required: true },
        ],
      },
    ],
    globalConditions: [
      { type: "MERCHANT", values: [], required: true },
      { type: "CURRENCY", values: [], required: true },
    ],
  },
  {
    role: "AUDIT",
    name: "Audit Officer",
    description: "Review and audit system activities",
    level: 5,
    modules: [
      {
        module: "vip-profile",
        actions: [
          { action: "VIEW", allowed: true },
          { action: "SEARCH", allowed: true },
          { action: "EXPORT", allowed: true },
        ],
        dataAccess: [
          { field: "personal_info", access: "READ_ONLY" },
          { field: "financial_data", access: "READ_ONLY" },
          { field: "activity_logs", access: "READ_ONLY" },
          { field: "notes", access: "HIDDEN" },
        ],
        conditions: [],
      },
      {
        module: "campaign",
        actions: [
          { action: "VIEW", allowed: true },
          { action: "SEARCH", allowed: true },
          { action: "EXPORT", allowed: true },
        ],
        dataAccess: [
          { field: "campaign_data", access: "READ_ONLY" },
          { field: "performance_metrics", access: "READ_ONLY" },
          { field: "target_lists", access: "READ_ONLY" },
        ],
        conditions: [],
      },
      {
        module: "gift-approval",
        actions: [
          { action: "VIEW", allowed: true },
          { action: "SEARCH", allowed: true },
          { action: "EXPORT", allowed: true },
        ],
        dataAccess: [
          { field: "gift_requests", access: "READ_ONLY" },
          { field: "approval_history", access: "READ_ONLY" },
          { field: "financial_details", access: "READ_ONLY" },
        ],
        conditions: [],
      },
      {
        module: "user-management",
        actions: [
          { action: "VIEW", allowed: true },
          { action: "SEARCH", allowed: true },
          { action: "EXPORT", allowed: true },
        ],
        dataAccess: [
          { field: "user_profiles", access: "READ_ONLY" },
          { field: "permission_settings", access: "READ_ONLY" },
          { field: "audit_logs", access: "READ_ONLY" },
        ],
        conditions: [],
      },
    ],
    globalConditions: [],
  },
];

// Permission matrix for quick lookups
export const PERMISSION_MATRIX = {
  ADMIN: {
    "vip-profile": ["VIEW", "SEARCH", "EDIT", "ADD", "DELETE", "IMPORT", "EXPORT"],
    campaign: ["VIEW", "SEARCH", "EDIT", "ADD", "DELETE", "IMPORT", "EXPORT"],
    "gift-approval": ["VIEW", "SEARCH", "EDIT", "ADD", "DELETE", "IMPORT", "EXPORT"],
    "user-management": ["VIEW", "SEARCH", "EDIT", "ADD", "DELETE", "IMPORT", "EXPORT"],
  },
  MANAGER: {
    "vip-profile": ["VIEW", "SEARCH", "EXPORT"],
    campaign: ["VIEW", "SEARCH", "EDIT", "ADD", "EXPORT"],
    "gift-approval": ["VIEW", "SEARCH", "EDIT", "IMPORT", "EXPORT"],
    "user-management": ["VIEW", "SEARCH", "EDIT"],
  },
  KAM: {
    "vip-profile": ["VIEW", "SEARCH", "EDIT", "ADD"],
    campaign: ["VIEW", "SEARCH", "EDIT", "ADD", "DELETE"],
    "gift-approval": ["VIEW", "SEARCH", "ADD", "IMPORT"],
  },
  PROCUREMENT: {
    "gift-approval": ["VIEW", "SEARCH", "EDIT"],
  },
  AUDIT: {
    "vip-profile": ["VIEW", "SEARCH", "EXPORT"],
    campaign: ["VIEW", "SEARCH", "EXPORT"],
    "gift-approval": ["VIEW", "SEARCH", "EXPORT"],
    "user-management": ["VIEW", "SEARCH", "EXPORT"],
  },
};

// Data access matrix
export const DATA_ACCESS_MATRIX = {
  ADMIN: {
    "vip-profile": {
      personal_info: "FULL",
      financial_data: "FULL",
      activity_logs: "FULL",
      notes: "FULL",
    },
    campaign: {
      campaign_data: "FULL",
      performance_metrics: "FULL",
      target_lists: "FULL",
    },
    "gift-approval": {
      gift_requests: "FULL",
      approval_history: "FULL",
      financial_details: "FULL",
    },
    "user-management": {
      user_profiles: "FULL",
      permission_settings: "FULL",
      audit_logs: "FULL",
    },
  },
  MANAGER: {
    "vip-profile": {
      personal_info: "READ_ONLY",
      financial_data: "READ_ONLY",
      activity_logs: "READ_ONLY",
      notes: "READ_ONLY",
    },
    campaign: {
      campaign_data: "FULL",
      performance_metrics: "READ_ONLY",
      target_lists: "READ_ONLY",
    },
    "gift-approval": {
      gift_requests: "FULL",
      approval_history: "READ_ONLY",
      financial_details: "READ_ONLY",
    },
    "user-management": {
      user_profiles: "READ_ONLY",
      permission_settings: "RESTRICTED",
      audit_logs: "HIDDEN",
    },
  },
  KAM: {
    "vip-profile": {
      personal_info: "FULL",
      financial_data: "READ_ONLY",
      activity_logs: "FULL",
      notes: "FULL",
    },
    campaign: {
      campaign_data: "FULL",
      performance_metrics: "READ_ONLY",
      target_lists: "FULL",
    },
    "gift-approval": {
      gift_requests: "FULL",
      approval_history: "READ_ONLY",
      financial_details: "HIDDEN",
    },
  },
  PROCUREMENT: {
    "gift-approval": {
      gift_requests: "READ_ONLY",
      approval_history: "READ_ONLY",
      financial_details: "FULL",
      procurement_status: "FULL",
      tracking_info: "FULL",
    },
  },
  AUDIT: {
    "vip-profile": {
      personal_info: "READ_ONLY",
      financial_data: "READ_ONLY",
      activity_logs: "READ_ONLY",
      notes: "HIDDEN",
    },
    campaign: {
      campaign_data: "READ_ONLY",
      performance_metrics: "READ_ONLY",
      target_lists: "READ_ONLY",
    },
    "gift-approval": {
      gift_requests: "READ_ONLY",
      approval_history: "READ_ONLY",
      financial_details: "READ_ONLY",
    },
    "user-management": {
      user_profiles: "READ_ONLY",
      permission_settings: "READ_ONLY",
      audit_logs: "READ_ONLY",
    },
  },
};
