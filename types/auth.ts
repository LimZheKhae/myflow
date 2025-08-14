export type UserRole = "KAM" | "MANAGER" | "PROCUREMENT" | "AUDIT" | "ADMIN"

export type Permission = "VIEW" | "SEARCH" | "EDIT" | "ADD" | "DELETE" | "IMPORT" | "EXPORT"

export type MemberType = "NORMAL" | "VIP"

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  merchants: string[]
  currencies: string[]
  memberAccess: MemberType[]
  permissions: Record<string, Permission[]>
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface AuthContext {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  hasPermission: (module: string, permission: Permission) => boolean
  canAccessMerchant: (merchant: string) => boolean
  canAccessCurrency: (currency: string) => boolean
  canAccessMemberType: (memberType: MemberType) => boolean
}

export interface RBACRule {
  role: UserRole
  module: string
  permissions: Permission[]
  conditions?: {
    merchantRestricted?: boolean
    currencyRestricted?: boolean
    memberTypeRestricted?: boolean
    ownerOnly?: boolean
  }
}
