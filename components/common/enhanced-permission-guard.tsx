"use client"

import type React from "react"
import { useFirebaseAuth as useAuth } from "@/contexts/firebase-auth-context"
import type { Permission } from "@/types/auth"
import type { EnhancedUser } from "@/types/rbac"
import { createEnhancedRBACManager } from "@/lib/enhanced-rbac-utils"

interface EnhancedPermissionGuardProps {
  module: string
  permission: Permission
  children: React.ReactNode
  fallback?: React.ReactNode
  dataField?: string
  requiredAccess?: "FULL" | "READ_ONLY" | "RESTRICTED"
  recordOwnerId?: string
  merchant?: string
  currency?: string
  memberType?: "NORMAL" | "VIP"
}

export default function EnhancedPermissionGuard({
  module,
  permission,
  children,
  fallback = null,
  dataField,
  requiredAccess = "READ_ONLY",
  recordOwnerId,
  merchant,
  currency,
  memberType,
}: EnhancedPermissionGuardProps) {
  const { user } = useAuth()

  if (!user) return <>{fallback}</>

  const rbacManager = createEnhancedRBACManager(user as EnhancedUser)

  // Check basic permission
  if (!rbacManager.hasPermission(module, permission)) {
    return <>{fallback}</>
  }

  // Check data field access if specified
  if (dataField) {
    const dataAccess = rbacManager.canAccessDataField(module, dataField)
    const accessLevels = ["HIDDEN", "RESTRICTED", "READ_ONLY", "FULL"]
    const currentLevel = accessLevels.indexOf(dataAccess)
    const requiredLevel = accessLevels.indexOf(requiredAccess)

    if (currentLevel < requiredLevel) {
      return <>{fallback}</>
    }
  }

  // Check record ownership if specified
  if (recordOwnerId && !rbacManager.canAccessRecord(recordOwnerId, module)) {
    return <>{fallback}</>
  }

  // Check merchant access if specified
  if (merchant && !rbacManager.canAccessMerchant(merchant)) {
    return <>{fallback}</>
  }

  // Check currency access if specified
  if (currency && !rbacManager.canAccessCurrency(currency)) {
    return <>{fallback}</>
  }

  // Check member type access if specified
  if (memberType && !rbacManager.canAccessMemberType(memberType)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
