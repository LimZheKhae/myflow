'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { toast } from 'sonner'

// Member Profile interface based on ALL_MEMBER_PROFILE table
export interface MemberProfile {
  memberId: number
  memberLogin: string
  memberName: string
  birthday?: string
  registrationDate?: Date
  lastLoginDate?: Date
  currency?: string
  memberGroup?: string
  status?: string
  merchant?: string // MERCHANT_ID from database
  merchantName?: string // MERCHANT_NAME from database
  ftdAmount?: number
  totalWinLoss?: number
  totalDeposit?: number
  totalWithdrawal?: number
  totalPromoTurnOver?: number
  totalValidBetAmount?: number
  totalGgr?: number
  totalNgr?: number
  ngrDepositPct?: number
  profitMargin?: number
  prefProvider?: string
  prefGames?: string
  monthlyDeposit?: number
  playFrequency?: string
  averageBet?: number
  createdAt?: Date
  lastModifiedDate?: Date
}

interface MemberProfileContextType {
  // Cache state
  memberProfiles: MemberProfile[]
  isLoading: boolean
  lastUpdated: Date | null

  // Cache operations
  refreshCache: () => Promise<void>
  findMemberByLogin: (memberLogin: string) => MemberProfile | null
  findMemberById: (memberId: number) => MemberProfile | null
  validateMemberExists: (memberLogin: string) => boolean

  // Bulk validation
  validateMemberLogins: (memberLogins: string[]) => {
    valid: string[]
    invalid: string[]
    validMembers: MemberProfile[]
  }
}

const MemberProfileContext = createContext<MemberProfileContextType | undefined>(undefined)

interface MemberProfileProviderProps {
  children: ReactNode
}

export const MemberProfileProvider: React.FC<MemberProfileProviderProps> = ({ children }) => {
  const [memberProfiles, setMemberProfiles] = useState<MemberProfile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Fetch member profiles from API
  const fetchMemberProfiles = async (): Promise<MemberProfile[]> => {
    const response = await fetch('/api/member-profiles', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch member profiles: ${response.statusText}`)
    }

    const data = await response.json()
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch member profiles')
    }

    return data.data
  }

  // Refresh cache
  const refreshCache = async () => {
    try {
      setIsLoading(true)
      const profiles = await fetchMemberProfiles()
      setMemberProfiles(profiles)
      setLastUpdated(new Date())

      console.log(`✅ Member profiles cache updated: ${profiles.length} profiles loaded`)
    } catch (error) {
      console.error('Error refreshing member profiles cache:', error)
      toast.error('Failed to update member profiles cache')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Initialize cache on mount
  useEffect(() => {
    refreshCache().catch(console.error)
  }, [])

  // Auto-refresh cache every 30 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing member profiles cache...')
      refreshCache().catch(console.error)
    }, 30 * 60 * 1000) // 30 minutes

    return () => clearInterval(interval)
  }, [])

  // Find member by login (case-insensitive)
  const findMemberByLogin = (memberLogin: string): MemberProfile | null => {
    if (!memberLogin?.trim()) return null

    return memberProfiles.find((profile) => profile.memberLogin?.toLowerCase() === memberLogin.toLowerCase()) || null
  }

  // Find member by ID
  const findMemberById = (memberId: number): MemberProfile | null => {
    if (!memberId) return null

    return memberProfiles.find((profile) => profile.memberId === memberId) || null
  }

  // Validate if member exists
  const validateMemberExists = (memberLogin: string): boolean => {
    return findMemberByLogin(memberLogin) !== null
  }

  // Bulk validation for multiple member logins
  const validateMemberLogins = (memberLogins: string[]) => {
    const valid: string[] = []
    const invalid: string[] = []
    const validMembers: MemberProfile[] = []

    memberLogins.forEach((login) => {
      const member = findMemberByLogin(login)
      if (member) {
        valid.push(login)
        validMembers.push(member)
      } else {
        invalid.push(login)
      }
    })

    return { valid, invalid, validMembers }
  }

  const contextValue: MemberProfileContextType = {
    memberProfiles,
    isLoading,
    lastUpdated,
    refreshCache,
    findMemberByLogin,
    findMemberById,
    validateMemberExists,
    validateMemberLogins,
  }

  return <MemberProfileContext.Provider value={contextValue}>{children}</MemberProfileContext.Provider>
}

// Custom hook to use member profile context
export const useMemberProfiles = (): MemberProfileContextType => {
  const context = useContext(MemberProfileContext)
  if (!context) {
    throw new Error('useMemberProfiles must be used within a MemberProfileProvider')
  }
  return context
}

// Utility hook for member validation with debouncing
export const useMemberValidation = () => {
  const { validateMemberExists, findMemberByLogin } = useMemberProfiles()
  const [validationCache, setValidationCache] = useState<Record<string, boolean>>({})

  const validateMemberWithCache = (memberLogin: string): boolean => {
    if (!memberLogin?.trim()) return false

    const cacheKey = memberLogin.toLowerCase()

    // Check cache first
    if (cacheKey in validationCache) {
      return validationCache[cacheKey]
    }

    // Validate and cache result
    const isValid = validateMemberExists(memberLogin)
    setValidationCache((prev) => ({ ...prev, [cacheKey]: isValid }))

    return isValid
  }

  const getMemberDetails = (memberLogin: string): MemberProfile | null => {
    return findMemberByLogin(memberLogin)
  }

  return {
    validateMember: validateMemberWithCache,
    getMemberDetails,
  }
}
