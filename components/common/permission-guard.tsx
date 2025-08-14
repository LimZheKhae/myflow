"use client"

import type React from "react"

import { useFirebaseAuth as useAuth } from "@/contexts/firebase-auth-context"
import type { Permission } from "@/types/auth"

interface PermissionGuardProps {
  module: string
  permission: Permission
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function PermissionGuard({ module, permission, children, fallback = null }: PermissionGuardProps) {
  const { hasPermission } = useAuth()

  if (!hasPermission(module, permission)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
