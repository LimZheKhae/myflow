'use client'

import type React from 'react'
import { createContext, useContext, useState, useEffect } from 'react'
import { User } from 'firebase/auth'
import { FirebaseAuthService } from '@/lib/firebase-auth'
import type { AuthContext, Permission, MemberType } from '@/types/auth'
import type { FirebaseUser } from '@/types/firebase'

interface FirebaseAuthContext {
  user: FirebaseUser | null
  firebaseUser: User | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  hasPermission: (module: string, permission: Permission) => boolean
  canAccessMerchant: (merchant: string) => boolean
  canAccessCurrency: (currency: string) => boolean
  canAccessMemberType: (memberType: MemberType) => boolean
  getUserDataField: (fieldName: string) => any
  hasEnhancedPermission: (module: string, permission: Permission) => boolean
  // Additional Firebase-specific methods
  updateUserProfile: (updates: Partial<FirebaseUser>) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
  refreshUserData: () => Promise<void>
  canManageUser: (targetUser: FirebaseUser) => boolean
  isResourceOwner: (resourceCreatorId: string) => boolean
  getAccessSummary: () => any
  logActivity: (action: string, module: string, entityType: string, entityId: string, details: Record<string, any>) => Promise<void>
}

const FirebaseAuthContextProvider = createContext<FirebaseAuthContext | null>(null)

export function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Set up auth state listener
    const unsubscribe = FirebaseAuthService.onAuthStateChanged((firebaseUser: User | null, userData: FirebaseUser | null) => {
      setFirebaseUser(firebaseUser)
      setUser(userData)
      setLoading(false)
      setError(null)
    })

    return () => unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      setLoading(true)
      setError(null)

      const { user: firebaseUser, userData } = await FirebaseAuthService.signIn(email, password)

      if (!userData.isActive) {
        await FirebaseAuthService.signOut()
        throw new Error('Your account has been deactivated. Please contact your administrator.')
      }

      setFirebaseUser(firebaseUser)
      setUser(userData)
    } catch (error: any) {
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      setError(null)
      await FirebaseAuthService.signOut()
      setUser(null)
      setFirebaseUser(null)
    } catch (error: any) {
      setError(error.message)
      throw error
    }
  }

  const hasPermission = (module: string, permission: Permission): boolean => {
    if (!user) return false
    return FirebaseAuthService.hasPermission(user, module, permission)
  }

  const canAccessMerchant = (merchant: string): boolean => {
    if (!user) return false
    return FirebaseAuthService.canAccessMerchant(user, merchant)
  }

  const canAccessCurrency = (currency: string): boolean => {
    if (!user) return false
    return FirebaseAuthService.canAccessCurrency(user, currency)
  }

  const canAccessMemberType = (memberType: MemberType): boolean => {
    if (!user) return false
    return FirebaseAuthService.canAccessMemberType(user, memberType)
  }

  const getUserDataField = (fieldName: string): any => {
    if (!user) return null
    return user.additionalData[fieldName]
  }

  const hasEnhancedPermission = (module: string, permission: Permission): boolean => {
    // For now, use the same logic as hasPermission
    // Can be extended for more complex permission logic
    return hasPermission(module, permission)
  }

  // Additional Firebase-specific methods
  const updateUserProfile = async (updates: Partial<FirebaseUser>) => {
    if (!user) throw new Error('No authenticated user')

    try {
      setError(null)
      await FirebaseAuthService.updateUserData(user.id, updates, user.id)

      // Update local state
      const updatedUser = { ...user, ...updates }
      setUser(updatedUser)
    } catch (error: any) {
      setError(error.message)
      throw error
    }
  }

  const updatePassword = async (newPassword: string) => {
    try {
      setError(null)
      await FirebaseAuthService.updateUserPassword(newPassword)
    } catch (error: any) {
      setError(error.message)
      throw error
    }
  }

  const refreshUserData = async () => {
    if (!firebaseUser) return

    try {
      const userData = await FirebaseAuthService.getUserData(firebaseUser.uid)
      setUser(userData)
    } catch (error: any) {
      console.error('Error refreshing user data:', error)
    }
  }

  // Check if user can manage another user (for user management module)
  const canManageUser = (targetUser: FirebaseUser): boolean => {
    if (!user) return false

    // Admin can manage all users
    if (user.role === 'ADMIN') return true

    // Manager can manage users in same merchants/region (excluding admins)
    if (user.role === 'MANAGER' && targetUser.role !== 'ADMIN') {
      const hasCommonMerchant = user.merchants.some((merchant) => targetUser.merchants.includes(merchant))
      return hasCommonMerchant || targetUser.region === user.region
    }

    // Users can only manage themselves for profile updates
    return user.id === targetUser.id
  }

  // Check if user owns a resource
  const isResourceOwner = (resourceCreatorId: string): boolean => {
    return user?.id === resourceCreatorId
  }

  // Get user's access scope summary
  const getAccessSummary = () => {
    if (!user) return null

    return {
      role: user.role,
      merchants: user.merchants,
      currencies: user.currencies,
      memberAccess: user.memberAccess,
      department: user.department,
      region: user.region,
      isActive: user.isActive,
      permissions: Object.keys(user.permissions || {}),
    }
  }

  // Log user activity (convenience method)
  const logActivity = async (action: string, module: string, entityType: string, entityId: string, details: Record<string, any>) => {
    if (!user) return

    try {
      await FirebaseAuthService.logActivity(user.id, action, module, entityType, entityId, details)
    } catch (error) {
      console.error('Error logging activity:', error)
    }
  }

  const value: FirebaseAuthContext = {
    user,
    firebaseUser,
    loading,
    error,
    login,
    logout,
    hasPermission,
    canAccessMerchant,
    canAccessCurrency,
    canAccessMemberType,
    getUserDataField,
    hasEnhancedPermission,
    updateUserProfile,
    updatePassword,
    refreshUserData,
    canManageUser,
    isResourceOwner,
    getAccessSummary,
    logActivity,
  }

  return <FirebaseAuthContextProvider.Provider value={value}>{children}</FirebaseAuthContextProvider.Provider>
}

export const useFirebaseAuth = () => {
  const context = useContext(FirebaseAuthContextProvider)
  if (!context) {
    throw new Error('useFirebaseAuth must be used within a FirebaseAuthProvider')
  }
  return context
}

// Alias for backward compatibility
export const useAuth = useFirebaseAuth
