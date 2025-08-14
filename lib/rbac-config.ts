import type { RBACRule, UserRole, Permission } from "@/types/auth"

// RBAC Configuration - Clear rules for each role and module
export const RBAC_RULES: RBACRule[] = [
  // KAM Rules
  {
    role: "KAM",
    module: "vip-profile",
    permissions: ["VIEW", "SEARCH", "EDIT", "ADD"],
    conditions: {
      merchantRestricted: true,
      currencyRestricted: true,
      memberTypeRestricted: true,
      ownerOnly: true,
    },
  },
  {
    role: "KAM",
    module: "campaign",
    permissions: ["VIEW", "SEARCH", "EDIT", "ADD", "DELETE"],
    conditions: {
      merchantRestricted: true,
      currencyRestricted: true,
      ownerOnly: true,
    },
  },
  {
    role: "KAM",
    module: "gift-approval",
    permissions: ["VIEW", "ADD"],
    conditions: {
      merchantRestricted: true,
      currencyRestricted: true,
      ownerOnly: true,
    },
  },

  // Manager Rules
  {
    role: "MANAGER",
    module: "vip-profile",
    permissions: ["VIEW", "SEARCH"],
    conditions: {
      merchantRestricted: true,
      currencyRestricted: true,
      memberTypeRestricted: true,
    },
  },
  {
    role: "MANAGER",
    module: "campaign",
    permissions: ["VIEW", "SEARCH"],
    conditions: {
      merchantRestricted: true,
      currencyRestricted: true,
    },
  },
  {
    role: "MANAGER",
    module: "gift-approval",
    permissions: ["VIEW", "SEARCH", "EDIT"],
    conditions: {
      merchantRestricted: true,
      currencyRestricted: true,
    },
  },
  {
    role: "MANAGER",
    module: "user-management",
    permissions: ["VIEW", "SEARCH", "EDIT"],
    conditions: {
      merchantRestricted: true,
    },
  },

  // Procurement Rules
  {
    role: "PROCUREMENT",
    module: "gift-approval",
    permissions: ["VIEW", "SEARCH", "EDIT"],
    conditions: {
      merchantRestricted: true,
      currencyRestricted: true,
    },
  },

  // Audit Rules
  {
    role: "AUDIT",
    module: "vip-profile",
    permissions: ["VIEW", "SEARCH", "EXPORT"],
    conditions: {
      memberTypeRestricted: true,
    },
  },
  {
    role: "AUDIT",
    module: "gift-approval",
    permissions: ["VIEW", "SEARCH", "EXPORT"],
  },
  {
    role: "AUDIT",
    module: "campaign",
    permissions: ["VIEW", "SEARCH", "EXPORT"],
  },

  // Admin Rules
  {
    role: "ADMIN",
    module: "user-management",
    permissions: ["VIEW", "SEARCH", "EDIT", "ADD", "DELETE", "IMPORT", "EXPORT"],
  },
  {
    role: "ADMIN",
    module: "vip-profile",
    permissions: ["VIEW", "SEARCH", "EDIT", "ADD", "DELETE", "IMPORT", "EXPORT"],
  },
  {
    role: "ADMIN",
    module: "campaign",
    permissions: ["VIEW", "SEARCH", "EDIT", "ADD", "DELETE", "IMPORT", "EXPORT"],
  },
  {
    role: "ADMIN",
    module: "gift-approval",
    permissions: ["VIEW", "SEARCH", "EDIT", "ADD", "DELETE", "IMPORT", "EXPORT"],
  },
]

export const DEFAULT_PERMISSIONS: Record<UserRole, Record<string, Permission[]>> = {
  KAM: {
    "vip-profile": ["VIEW", "SEARCH", "EDIT", "ADD"],
    campaign: ["VIEW", "SEARCH", "EDIT", "ADD", "DELETE"],
    "gift-approval": ["VIEW", "ADD"],
  },
  MANAGER: {
    "vip-profile": ["VIEW", "SEARCH"],
    campaign: ["VIEW", "SEARCH"],
    "gift-approval": ["VIEW", "SEARCH", "EDIT"],
    "user-management": ["VIEW", "SEARCH", "EDIT"],
  },
  PROCUREMENT: {
    "gift-approval": ["VIEW", "SEARCH", "EDIT"],
  },
  AUDIT: {
    "vip-profile": ["VIEW", "SEARCH", "EXPORT"],
    "gift-approval": ["VIEW", "SEARCH", "EXPORT"],
    campaign: ["VIEW", "SEARCH", "EXPORT"],
  },
  ADMIN: {
    "user-management": ["VIEW", "SEARCH", "EDIT", "ADD", "DELETE", "IMPORT", "EXPORT"],
    "vip-profile": ["VIEW", "SEARCH", "EDIT", "ADD", "DELETE", "IMPORT", "EXPORT"],
    campaign: ["VIEW", "SEARCH", "EDIT", "ADD", "DELETE", "IMPORT", "EXPORT"],
    "gift-approval": ["VIEW", "SEARCH", "EDIT", "ADD", "DELETE", "IMPORT", "EXPORT"],
  },
}
