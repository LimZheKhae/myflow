// Enhanced RBAC types with granular permissions
import type { UserRole, User } from "./user" // Assuming UserRole and User are declared in another file

export type ModulePermission = {
  module: string
  actions: ActionPermission[]
  dataAccess: DataAccessRule[]
  conditions: AccessCondition[]
}

export type ActionPermission = {
  action: "VIEW" | "SEARCH" | "EDIT" | "ADD" | "DELETE" | "IMPORT" | "EXPORT" | "APPROVE" | "CALL" | "ASSIGN"
  allowed: boolean
  conditions?: string[]
}

export type DataAccessRule = {
  field: string
  access: "FULL" | "READ_ONLY" | "RESTRICTED" | "HIDDEN"
  conditions?: string[]
}

export type AccessCondition = {
  type: "MERCHANT" | "CURRENCY" | "MEMBER_TYPE" | "OWNER_ONLY" | "DEPARTMENT" | "REGION"
  values: string[]
  required: boolean
}

export type RoleDefinition = {
  role: UserRole
  name: string
  description: string
  level: number // Hierarchy level (1 = highest)
  modules: ModulePermission[]
  globalConditions: AccessCondition[]
}

export type PermissionMatrix = {
  [key: string]: {
    [key: string]: boolean
  }
}

export interface EnhancedUser extends User {
  department?: string
  region?: string
  supervisor?: string
  lastPermissionUpdate?: Date
  permissionMatrix?: PermissionMatrix
}
