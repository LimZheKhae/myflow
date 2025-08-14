import type { User, Permission, MemberType } from "@/types/auth"
import { RBAC_RULES } from "./rbac-config"

export class RBACManager {
  private user: User

  constructor(user: User) {
    this.user = user
  }

  hasPermission(module: string, permission: Permission): boolean {
    // Admin has all permissions
    if (this.user.role === "ADMIN") {
      return true
    }

    // Check user's specific permissions
    const modulePermissions = this.user.permissions[module] || []
    if (!modulePermissions.includes(permission)) {
      return false
    }

    // Check RBAC rules for additional conditions
    const rule = RBAC_RULES.find((r) => r.role === this.user.role && r.module === module)
    if (!rule) {
      return false
    }

    return rule.permissions.includes(permission)
  }

  canAccessMerchant(merchant: string): boolean {
    if (this.user.role === "ADMIN" || this.user.role === "AUDIT") {
      return true
    }
    return this.user.merchants.includes(merchant)
  }

  canAccessCurrency(currency: string): boolean {
    if (this.user.role === "ADMIN" || this.user.role === "AUDIT") {
      return true
    }
    return this.user.currencies.includes(currency)
  }

  canAccessMemberType(memberType: MemberType): boolean {
    if (this.user.role === "ADMIN") {
      return true
    }
    return this.user.memberAccess.includes(memberType)
  }

  canAccessRecord(recordOwnerId: string, module: string): boolean {
    const rule = RBAC_RULES.find((r) => r.role === this.user.role && r.module === module)

    if (!rule?.conditions?.ownerOnly) {
      return true
    }

    // For owner-only modules, check if user owns the record
    return recordOwnerId === this.user.id
  }

  getAccessibleModules(): string[] {
    if (this.user.role === "ADMIN") {
      return ["vip-profile", "campaign", "gift-approval", "user-management"]
    }

    return RBAC_RULES.filter((rule) => rule.role === this.user.role).map((rule) => rule.module)
  }
}

export const createRBACManager = (user: User) => new RBACManager(user)
