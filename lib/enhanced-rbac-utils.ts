import type { EnhancedUser } from "@/types/rbac"
import type { Permission, MemberType } from "@/types/auth"
import { ENHANCED_RBAC_ROLES, PERMISSION_MATRIX, DATA_ACCESS_MATRIX } from "./enhanced-rbac-config"

export class EnhancedRBACManager {
  private user: EnhancedUser
  private roleDefinition: any

  constructor(user: EnhancedUser) {
    this.user = user
    this.roleDefinition = ENHANCED_RBAC_ROLES.find((role) => role.role === user.role)
  }

  // Check if user has permission for specific action on module
  hasPermission(module: string, action: Permission): boolean {
    if (this.user.role === "ADMIN") return true

    const permissions = (PERMISSION_MATRIX as any)[this.user.role]?.[module] || []
    return permissions.includes(action)
  }

  // Check if user can access specific data field
  canAccessDataField(module: string, field: string): "FULL" | "READ_ONLY" | "RESTRICTED" | "HIDDEN" {
    if (this.user.role === "ADMIN") return "FULL"

    const dataAccess = (DATA_ACCESS_MATRIX as any)[this.user.role]?.[module]?.[field]
    return dataAccess || "HIDDEN"
  }

  // Check merchant access
  canAccessMerchant(merchant: string): boolean {
    if (this.user.role === "ADMIN" || this.user.role === "AUDIT") return true
    return this.user.merchants.includes(merchant)
  }

  // Check currency access
  canAccessCurrency(currency: string): boolean {
    if (this.user.role === "ADMIN" || this.user.role === "AUDIT") return true
    return this.user.currencies.includes(currency)
  }

  // Check member type access
  canAccessMemberType(memberType: MemberType): boolean {
    if (this.user.role === "ADMIN") return true
    return this.user.memberAccess.includes(memberType)
  }

  // Check if user can access specific record (ownership check)
  canAccessRecord(recordOwnerId: string, module: string): boolean {
    const moduleConfig = this.roleDefinition?.modules.find((m: any) => m.module === module)
    if (!moduleConfig) return false

    const hasOwnerOnlyCondition = moduleConfig.conditions.some((c: any) => c.type === "OWNER_ONLY")
    if (!hasOwnerOnlyCondition) return true

    return recordOwnerId === this.user.id
  }

  // Check if user can access department data
  canAccessDepartment(department: string): boolean {
    if (this.user.role === "ADMIN") return true
    return this.user.department === department
  }

  // Check if user can access region data
  canAccessRegion(region: string): boolean {
    if (this.user.role === "ADMIN") return true
    return this.user.region === region
  }

  // Get accessible modules for user
  getAccessibleModules(): string[] {
    if (this.user.role === "ADMIN") {
      return ["vip-profile", "campaign", "gift-approval", "user-management"]
    }

    return this.roleDefinition?.modules.map((m: any) => m.module) || []
  }

  // Get user's permission matrix
  getPermissionMatrix(): any {
    return PERMISSION_MATRIX[this.user.role] || {}
  }

  // Get user's data access matrix
  getDataAccessMatrix(): any {
    return DATA_ACCESS_MATRIX[this.user.role] || {}
  }

  // Check if user can perform bulk operations
  canPerformBulkOperation(module: string, action: Permission): boolean {
    if (!this.hasPermission(module, action)) return false

    // Additional checks for bulk operations
    if (this.user.role === "KAM" && action === "DELETE") return false
    if (this.user.role === "PROCUREMENT" && action !== "EDIT") return false

    return true
  }

  // Get filtered data based on user permissions
  filterDataByPermissions(module: string, data: any[]): any[] {
    return data.filter((item) => {
      // Check merchant access
      if (item.merchant && !this.canAccessMerchant(item.merchant)) return false

      // Check currency access
      if (item.currency && !this.canAccessCurrency(item.currency)) return false

      // Check member type access
      if (item.memberType && !this.canAccessMemberType(item.memberType)) return false

      // Check ownership
      if (item.ownerId && !this.canAccessRecord(item.ownerId, module)) return false

      // Check department access
      if (item.department && !this.canAccessDepartment(item.department)) return false

      // Check region access
      if (item.region && !this.canAccessRegion(item.region)) return false

      return true
    })
  }

  // Get user's role hierarchy level
  getRoleLevel(): number {
    return this.roleDefinition?.level || 999
  }

  // Check if user can manage another user
  canManageUser(targetUser: EnhancedUser): boolean {
    if (this.user.role === "ADMIN") return true

    // Can only manage users with lower hierarchy level
    const targetRoleDefinition = ENHANCED_RBAC_ROLES.find((role) => role.role === targetUser.role)
    const targetLevel = targetRoleDefinition?.level || 999

    return this.getRoleLevel() < targetLevel
  }

  // Generate permission summary for user
  getPermissionSummary(): any {
    return {
      role: this.user.role,
      level: this.getRoleLevel(),
      modules: this.getAccessibleModules(),
      permissions: this.getPermissionMatrix(),
      dataAccess: this.getDataAccessMatrix(),
      conditions: {
        merchants: this.user.merchants,
        currencies: this.user.currencies,
        memberAccess: this.user.memberAccess,
        department: this.user.department,
        region: this.user.region,
      },
    }
  }
}

export const createEnhancedRBACManager = (user: EnhancedUser) => new EnhancedRBACManager(user)
