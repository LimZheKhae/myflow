'use client'

import type React from 'react'
import { createContext, useContext, useState, useEffect } from 'react'
import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
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

// Helper function to set cookie
const setCookie = (name: string, value: string, days: number = 7) => {
  const expires = new Date()
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict`
}

// Helper function to get cookie
const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null
  return null
}

// Helper function to delete cookie
const deleteCookie = (name: string) => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`
}

export function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    console.log('Setting up direct Firebase auth state listener...')
    let mounted = true

    // Use direct Firebase auth instead of FirebaseAuthService
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (!mounted) return

      console.log('Direct auth state changed:', { firebaseUser: !!firebaseUser })

      setFirebaseUser(firebaseUser)

      if (firebaseUser) {
        // For now, create a simple user object
        const simpleUser: FirebaseUser = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          role: 'ADMIN' as any, // Default role
          merchants: ['MERCHANT_A'],
          currencies: ['USD'],
          memberAccess: ['VIP'],
          permissions: {},
          isActive: true,
          department: 'IT',
          region: 'Global',
          createdAt: new Date() as any,
          updatedAt: new Date() as any,
          lastLogin: new Date() as any,
          additionalData: {},
        }

        setUser(simpleUser)

        // Store auth token in cookie for middleware
        firebaseUser
          .getIdToken()
          .then((token) => {
            setCookie('firebase-auth-token', token, 7)
            console.log('Auth token stored in cookie')
          })
          .catch((error) => {
            console.error('Error getting auth token:', error)
          })
      } else {
        setUser(null)
        deleteCookie('firebase-auth-token')
        console.log('Auth token cleared from cookie')
      }

      if (mounted) {
        setLoading(false)
        setError(null)
      }
    })

    // Set a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (mounted) {
        console.log('Auth state listener timeout - setting loading to false')
        setLoading(false)
      }
    }, 3000) // 3 seconds timeout

    return () => {
      mounted = false
      unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const login = async (email: string, password: string) => {
    try {
      setError(null)

      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const firebaseUser = userCredential.user

      // Store the token in cookie
      const token = await firebaseUser.getIdToken()
      setCookie('firebase-auth-token', token, 7)
    } catch (error: any) {
      setError(error.message)
      throw error
    }
  }

  const logout = async () => {
    try {
      setError(null)
      await signOut(auth)
      deleteCookie('firebase-auth-token')
      window.location.href = '/login'
    } catch (error: any) {
      setError(error.message)
      throw error
    }
  }

  const hasPermission = (module: string, permission: Permission): boolean => {
    if (!user) return false
    // Simplified permission check
    return user.role === 'ADMIN' || user.permissions[module]?.includes(permission) || false
  }

  const canAccessMerchant = (merchant: string): boolean => {
    if (!user) return false
    return user.merchants.includes(merchant) || user.role === 'ADMIN'
  }

  const canAccessCurrency = (currency: string): boolean => {
    if (!user) return false
    return user.currencies.includes(currency) || user.role === 'ADMIN'
  }

  const canAccessMemberType = (memberType: MemberType): boolean => {
    if (!user) return false
    return user.memberAccess.includes(memberType) || user.role === 'ADMIN'
  }

  const getUserDataField = (fieldName: string): any => {
    if (!user) return null
    return user.additionalData[fieldName]
  }

  const hasEnhancedPermission = (module: string, permission: Permission): boolean => {
    return hasPermission(module, permission)
  }

  // Additional Firebase-specific methods
  const updateUserProfile = async (updates: Partial<FirebaseUser>) => {
    if (!user) throw new Error('No authenticated user')
    // Simplified implementation
    setUser({ ...user, ...updates })
  }

  const updatePassword = async (newPassword: string) => {
    // Simplified implementation
    console.log('Password update not implemented in simplified version')
  }

  const refreshUserData = async () => {
    // Simplified implementation
    console.log('User data refresh not implemented in simplified version')
  }

  // Check if user can manage another user (for user management module)
  const canManageUser = (targetUser: FirebaseUser): boolean => {
    if (!user) return false
    return user.role === 'ADMIN' || user.id === targetUser.id
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
    console.log('Activity logged:', { action, module, entityType, entityId, details })
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
