"use client"

import type React from "react"
import { useFirebaseAuth as useAuth } from "@/contexts/firebase-auth-context"
import type { Permission } from "@/types/auth"

interface RoleBasedActionPermissionProps {
  allowedRoles: string[]
  children: React.ReactNode
  fallback?: React.ReactNode
  disabledFallback?: React.ReactNode
  action?: string
  module?: string
  showDisabled?: boolean
  permission?: Permission
  alwaysShow?: boolean
}

export default function RoleBasedActionPermission({
  allowedRoles,
  children,
  fallback = null,
  disabledFallback = null,
  action,
  module,
  showDisabled = false,
  permission,
  alwaysShow = false,
}: RoleBasedActionPermissionProps) {
  const { user, hasPermission } = useAuth()

  // If no user, show fallback
  if (!user) {
    return <>{fallback}</>
  }

  // Check if user's role is in the allowed roles
  const hasRolePermission = allowedRoles.includes(user.role)

  // Check if user has the required permission (if specified)
  // Admin role bypasses permission checks
  const hasActionPermission = user.role === 'ADMIN' ? true : (permission ? hasPermission(module || "", permission) : true)

  // If user doesn't have role permission
  if (!hasRolePermission) {
    if (alwaysShow) {
      // Show disabled version of the action even without role permission
      return <>{disabledFallback || children}</>
    } else {
      // Hide the action completely
      return <>{fallback}</>
    }
  }

  // If user doesn't have action permission
  if (!hasActionPermission) {
    if (alwaysShow) {
      // Show disabled version of the action
      return <>{disabledFallback || children}</>
    } else {
      // Hide the action completely
      return <>{fallback}</>
    }
  }

  // If showDisabled is true and we want to show disabled state
  if (showDisabled) {
    return <>{disabledFallback || children}</>
  }

  // User has both role and action permission, show the action
  return <>{children}</>
}

// Helper function to create role-based action components
export function createRoleBasedAction(allowedRoles: string[]) {
  return function RoleBasedAction({
    children,
    fallback,
    disabledFallback,
    showDisabled = false,
    permission,
    module,
    alwaysShow = false,
  }: Omit<RoleBasedActionPermissionProps, 'allowedRoles'>) {
    return (
      <RoleBasedActionPermission
        allowedRoles={allowedRoles}
        fallback={fallback}
        disabledFallback={disabledFallback}
        showDisabled={showDisabled}
        permission={permission}
        module={module}
        alwaysShow={alwaysShow}
      >
        {children}
      </RoleBasedActionPermission>
    )
  }
}

// Pre-configured role-based action components
export const KAMOnlyAction = createRoleBasedAction(['KAM'])
export const AdminOnlyAction = createRoleBasedAction(['ADMIN'])
export const KAMAndAdminAction = createRoleBasedAction(['KAM', 'ADMIN'])
export const ManagerAndAboveAction = createRoleBasedAction(['ADMIN', 'MANAGER'])
export const AuditAndAboveAction = createRoleBasedAction(['ADMIN', 'AUDIT'])
export const ProcurementAndAboveAction = createRoleBasedAction(['ADMIN', 'PROCUREMENT'])

// Enhanced role-based action components with permission support
// These components ALWAYS show the action (enabled or disabled) instead of hiding it
// - If user has role AND permission: Shows enabled action
// - If user lacks role OR permission: Shows disabled action (disabledFallback)
export function KAMOnlyActionWithPermission({ 
  children, 
  fallback, 
  disabledFallback, 
  permission, 
  module 
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
  disabledFallback?: React.ReactNode
  permission: Permission
  module: string
}) {
  return (
    <RoleBasedActionPermission
      allowedRoles={['KAM']}
      permission={permission}
      module={module}
      alwaysShow={true}
      fallback={fallback}
      disabledFallback={disabledFallback}
    >
      {children}
    </RoleBasedActionPermission>
  )
}

export function ManagerAndAboveActionWithPermission({ 
  children, 
  fallback, 
  disabledFallback, 
  permission, 
  module 
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
  disabledFallback?: React.ReactNode
  permission: Permission
  module: string
}) {
  return (
    <RoleBasedActionPermission
      allowedRoles={['ADMIN', 'MANAGER']}
      permission={permission}
      module={module}
      alwaysShow={true}
      fallback={fallback}
      disabledFallback={disabledFallback}
    >
      {children}
    </RoleBasedActionPermission>
  )
}

export function AuditAndAboveActionWithPermission({ 
  children, 
  fallback, 
  disabledFallback, 
  permission, 
  module 
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
  disabledFallback?: React.ReactNode
  permission: Permission
  module: string
}) {
  return (
    <RoleBasedActionPermission
      allowedRoles={['ADMIN', 'AUDIT']}
      permission={permission}
      module={module}
      alwaysShow={true}
      fallback={fallback}
      disabledFallback={disabledFallback}
    >
      {children}
    </RoleBasedActionPermission>
  )
}

export function KAMAndAdminActionWithPermission({ 
  children, 
  fallback, 
  disabledFallback, 
  permission, 
  module 
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
  disabledFallback?: React.ReactNode
  permission: Permission
  module: string
}) {
  return (
    <RoleBasedActionPermission
      allowedRoles={['KAM', 'ADMIN']}
      permission={permission}
      module={module}
      alwaysShow={true}
      fallback={fallback}
      disabledFallback={disabledFallback}
    >
      {children}
    </RoleBasedActionPermission>
  )
}
