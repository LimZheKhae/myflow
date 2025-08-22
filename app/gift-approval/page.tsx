'use client'
import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import { useFirebaseAuth as useAuth } from '@/contexts/firebase-auth-context'
import FirebaseLoginForm from '@/components/auth/firebase-login-form'
import Sidebar from '@/components/layout/sidebar'
import Header from '@/components/layout/header'
import PermissionGuard from '@/components/common/permission-guard'
import RoleBasedActionPermission, { KAMOnlyAction, KAMAndAdminAction, AuditAndAboveAction, ManagerAndAboveAction, ManagerAndAboveActionWithPermission, KAMAndAdminActionWithPermission, AuditAndAboveActionWithPermission } from '@/components/common/role-based-action-permission'
import { BulkUploadDialog } from '@/components/ui/bulk-upload-dialog'
import { BulkUpdateDialog } from '@/components/ui/bulk-update-dialog'
import AccessDenied from '@/components/common/access-denied'
import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus, Eye, Upload, CheckCircle, XCircle, Clock, Search, FileText, Truck, Shield, Calendar, User, Package, CheckSquare, Download, ArrowRight, ClipboardCheck, Edit, Users, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { exportToCSV, formatMoney, getImageProxyUrl, getImageDownloadUrl } from '@/lib/utils'
import { FileUploader } from '@/components/ui/file-uploader'

import type { GiftRequestDetails, GiftCategory, WorkflowStatus, TrackingStatus, GiftRequestForm } from '@/types/gift'
import { assignedVIPPlayers, getVIPPlayerById } from '@/lib/vip-players'
import { useMemberProfiles, useMemberValidation } from '@/contexts/member-profile-context'

// Helper function to convert date strings to Date objects
const convertDatesInGifts = (gifts: any[]): GiftRequestDetails[] => {
  return gifts.map((gift: any) => ({
    ...gift,
    createdDate: gift.createdDate ? new Date(gift.createdDate) : null,
    mktPurchaseDate: gift.mktPurchaseDate ? new Date(gift.mktPurchaseDate) : null,
    auditDate: gift.auditDate ? new Date(gift.auditDate) : null,
    lastModifiedDate: gift.lastModifiedDate ? new Date(gift.lastModifiedDate) : null,
  }))
}

// Global activity logging function - uses server-side API to avoid ad blocker issues
const logActivity = async (action: string, userId: string, userName: string, userEmail: string, details: Record<string, any>) => {
  try {
    // Log to global activity logs
    await fetch('/api/activity-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        module: 'GIFT_APPROVAL',
        action: action.toUpperCase().replace(/[-\s]/g, '_'), // Convert to uppercase with underscores
        userId: userId,
        userName: userName,
        userEmail: userEmail,
        details: details,
      }),
    })
  } catch (error) {
    console.error('Error logging activity:', error)
    // Don't throw error to avoid breaking the main workflow
  }
}

// API functions
const fetchGifts = async (params?: { workflowStatus?: WorkflowStatus; category?: GiftCategory; kamRequestedBy?: string; memberLogin?: string; dateFrom?: string; dateTo?: string; search?: string }) => {
  try {
    const searchParams = new URLSearchParams()
    // Remove pagination parameters - we'll fetch all data
    if (params?.workflowStatus) searchParams.append('workflowStatus', params.workflowStatus)
    if (params?.category) searchParams.append('category', params.category)
    if (params?.kamRequestedBy) searchParams.append('kamRequestedBy', params.kamRequestedBy)
    if (params?.memberLogin) searchParams.append('memberLogin', params.memberLogin)
    if (params?.dateFrom) searchParams.append('dateFrom', params.dateFrom)
    if (params?.dateTo) searchParams.append('dateTo', params.dateTo)
    if (params?.search) searchParams.append('search', params.search)

    const response = await fetch(`/api/gift-approval?${searchParams.toString()}`)
    const data = await response.json()

    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch gifts')
    }

    return data
  } catch (error) {
    console.error('Error fetching gifts:', error)
    throw error
  }
}

const performBulkAction = async (action: string, giftIds: number[], params: any, userId: string) => {
  try {
    const response = await fetch('/api/gift-approval/bulk-actions', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        giftIds,
        uploadedBy: userId,
        ...params,
      }),
    })

    const data = await response.json()

    console.log('🔍 [FRONTEND] Bulk Action API Response:', {
      action,
      success: data.success,
      message: data.message,
      status: response.status,
      data,
    })

    if (!data.success) {
      throw new Error(data.message || 'Failed to perform bulk action')
    }

    return data
  } catch (error) {
    console.error('Error performing bulk action:', error)
    throw error
  }
}

interface TimelineEvent {
  id: string
  title: string
  description: string
  date: string
  time: string
  status: 'completed' | 'pending' | 'current' | 'rejected'
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
}

export default function Gifts() {
  const [gifts, setGifts] = useState<GiftRequestDetails[]>([])
  const [apiLoading, setApiLoading] = useState(true)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  })
  const [activeTab, setActiveTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isAnimating, setIsAnimating] = useState(false)
  const [selectedGift, setSelectedGift] = useState<GiftRequestDetails | null>(null)
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})

  // Modal states
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [isMKTOpsModalOpen, setIsMKTOpsModalOpen] = useState(false)
  const [isKAMProofModalOpen, setIsKAMProofModalOpen] = useState(false)
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false)

  // Loading states for API actions
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false)
  const [isApprovingGift, setIsApprovingGift] = useState<number | null>(null)
  const [isRejectingGift, setIsRejectingGift] = useState<number | null>(null)
  const [isUpdatingMKTOps, setIsUpdatingMKTOps] = useState<number | null>(null)
  const [isSubmittingKAMProof, setIsSubmittingKAMProof] = useState<number | null>(null)
  const [isSubmittingAudit, setIsSubmittingAudit] = useState<number | null>(null)
  const [isBulkActioning, setIsBulkActioning] = useState(false)
  const [isTogglingBO, setIsTogglingBO] = useState<number | null>(null)
  const [isProceedingToNext, setIsProceedingToNext] = useState<number | null>(null)

  // Modal form states
  const [rejectingGiftId, setRejectingGiftId] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [mkTOpsGiftId, setMKTOpsGiftId] = useState<number | null>(null)
  const [mkTOpsForm, setMKTOpsForm] = useState({
    dispatcher: '',
    trackingCode: '',
    trackingStatus: 'Pending',
    mktOpsProof: null as File | null,
    existingMktProofUrl: null as string | null,
  })
  const [kamProofGiftId, setKAMProofGiftId] = useState<number | null>(null)
  const [kamProofForm, setKAMProofForm] = useState({
    kamProof: null as File | null,
    giftFeedback: '',
    existingKamProofUrl: null as string | null,
  })
  const [auditGiftId, setAuditGiftId] = useState<number | null>(null)
  const [auditRemark, setAuditRemark] = useState('')
  const [auditCheckerName, setAuditCheckerName] = useState('')

  const [auditForm, setAuditForm] = useState({
    checkerName: '',
    remark: '',
  })

  const [requestForm, setRequestForm] = useState<GiftRequestForm>({
    vipId: '',
    memberName: '',
    memberLogin: '',
    giftItem: '',
    rewardName: '',
    rewardClubOrder: '',
    value: '',
    valueLocal: '',
    remark: '',
    category: '',
  })

  // State for dropdown visibility
  const [showMemberDropdown, setShowMemberDropdown] = useState(false)
  const memberLoginInputRef = useRef<HTMLInputElement>(null)

  const { user, loading, hasPermission } = useAuth()

  // Member profile hooks for validation
  const { memberProfiles, isLoading: memberProfilesLoading, lastUpdated, refreshCache } = useMemberProfiles()
  const { validateMember, getMemberDetails } = useMemberValidation()

  // Permission checks
  const canViewGifts = hasPermission('gift-approval', 'VIEW')
  const canAddGifts = hasPermission('gift-approval', 'ADD')
  const canEditGifts = hasPermission('gift-approval', 'EDIT')
  const canImportGifts = hasPermission('gift-approval', 'IMPORT')
  const canExportGifts = hasPermission('gift-approval', 'EXPORT')

  // Reusable function to refresh the gifts data
  const refreshGiftsData = async () => {
    try {
      setApiLoading(true) // Show skeleton animation during refresh
      const result = await fetchGifts({
        search: searchTerm,
        // Remove workflowStatus filter - fetch all data
      })
      setGifts(convertDatesInGifts(result.data))
      // Update pagination info based on new data
      setPagination((prev) => ({
        ...prev,
        total: result.data.length,
        totalPages: Math.ceil(result.data.length / prev.limit),
        page: 1, // Reset to first page when data changes
      }))
    } catch (error) {
      console.error('Error refreshing gifts data:', error)
      toast.error('Failed to refresh data')
    } finally {
      setApiLoading(false) // Hide skeleton animation after refresh
    }
  }

  // Load gifts data - fetch all data once, then filter client-side
  useEffect(() => {
    const loadGifts = async () => {
      if (!user) return

      try {
        setApiLoading(true)
        // Always fetch all gifts without pagination limits
        // When searching, we want to search across all workflow statuses
        const result = await fetchGifts({
          search: searchTerm,
          // Never send workflowStatus filter - always fetch all data
          // This allows searching across all tabs and workflow statuses
        })

        setGifts(convertDatesInGifts(result.data))
        setPagination((prev) => ({
          ...prev,
          total: result.data.length, // Use actual data length instead of pagination total
          totalPages: Math.ceil(result.data.length / prev.limit),
          page: 1, // Reset to first page when data changes
        }))
      } catch (error) {
        console.error('Error loading gifts:', error)
        toast.error('Failed to load gifts')
      } finally {
        setApiLoading(false)
      }
    }

    loadGifts()
  }, [user, searchTerm]) // Removed pagination.page, pagination.limit, and activeTab dependencies

  // Clear row selection when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    setRowSelection({})
    // Reset to first page when changing tabs
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }))
  }

  // Handle page size change
  const handlePageSizeChange = (newLimit: number) => {
    setPagination((prev) => ({
      ...prev,
      limit: newLimit,
      page: 1, // Reset to first page when changing page size
      totalPages: Math.ceil(prev.total / newLimit),
    }))
  }

  // Handle workflow step clicks with toast guidance
  const handleWorkflowClick = (workflowStep: string) => {
    setIsAnimating(true)

    setTimeout(() => {
      switch (workflowStep) {
        case 'KAM_Request':
          // Scroll to Request Gift button
          const requestButton = document.querySelector('[href="/gifts/new"]')
          if (requestButton) {
            requestButton.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
          toast('💡 KAM Request', {
            description: "Click the 'Request Gift' button above to create a new gift request",
            action: {
              label: 'Got it',
              onClick: () => console.log('User acknowledged KAM request tip'),
            },
            position: 'top-center',
          })
          break
        case 'Manager_Review':
          setActiveTab('pending')
          // Scroll to tabs section
          const tabsSection = document.getElementById('gift-tabs-section')
          if (tabsSection) {
            tabsSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
          toast('💡 Manager Review', {
            description: "Review pending gift requests in the 'Pending' tab below",
            action: {
              label: 'Got it',
              onClick: () => console.log('User acknowledged Manager review tip'),
            },
            position: 'top-center',
          })
          break
        case 'MKTOps_Processing':
          setActiveTab('processing')
          // Scroll to tabs section
          const tabsSection2 = document.getElementById('gift-tabs-section')
          if (tabsSection2) {
            tabsSection2.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
          toast('💡 MKTOps Processing', {
            description: "Check processing requests in the 'Processing' tab below",
            action: {
              label: 'Got it',
              onClick: () => console.log('User acknowledged MKTOps tip'),
            },
            position: 'top-center',
          })
          break
        case 'KAM_Proof':
          setActiveTab('kam-proof')
          // Scroll to tabs section
          const tabsSection3 = document.getElementById('gift-tabs-section')
          if (tabsSection3) {
            tabsSection3.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
          toast('💡 KAM Proof', {
            description: "Upload delivery proof in the 'KAM Proof' tab below",
            action: {
              label: 'Got it',
              onClick: () => console.log('User acknowledged KAM proof tip'),
            },
            position: 'top-center',
          })
          break
        case 'SalesOps_Audit':
          setActiveTab('audit')
          // Scroll to tabs section
          const tabsSection4 = document.getElementById('gift-tabs-section')
          if (tabsSection4) {
            tabsSection4.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
          toast('💡 SalesOps Audit', {
            description: "Review audit requests in the 'Audit' tab below",
            action: {
              label: 'Got it',
              onClick: () => console.log('User acknowledged SalesOps tip'),
            },
            position: 'top-center',
          })
          break
      }
      setIsAnimating(false)
    }, 300)
  }

  // Handle form changes
  const handleFormChange = (field: string, value: string) => {
    setRequestForm((prev) => {
      const newForm = { ...prev, [field]: value }

      // If memberLogin is being changed, validate and auto-populate memberName and vipId
      if (field === 'memberLogin') {
        // Only try to validate if member profiles are loaded
        if (!memberProfilesLoading && memberProfiles.length > 0) {
          const selectedMember = memberProfiles.find((member) => member.memberLogin.toLowerCase() === value.toLowerCase())
          if (selectedMember) {
            newForm.memberName = selectedMember.memberName || ''
            newForm.vipId = selectedMember.memberId.toString()

            // Handle currency logic for valueLocal
            if (selectedMember.currency === 'MYR') {
              // For MYR players, valueLocal should match value (MYR)
              newForm.valueLocal = prev.value || ''
            } else {
              // For non-MYR players, keep existing valueLocal or clear it
              // Don't auto-fill as they may need to enter exchange rate
            }
          } else {
            // Clear memberName and vipId if member login is invalid or not exact match
            newForm.memberName = ''
            newForm.vipId = ''
            newForm.valueLocal = '' // Clear local value too
          }
        }
        // If profiles are still loading, don't modify other fields
      }

      // If vipId is being changed, automatically populate memberName and memberLogin
      if (field === 'vipId' && value) {
        const selectedMember = memberProfiles.find((member) => member.memberId.toString() === value)
        if (selectedMember) {
          newForm.memberName = selectedMember.memberName || ''
          newForm.memberLogin = selectedMember.memberLogin || ''

          // Handle currency logic for valueLocal
          if (selectedMember.currency === 'MYR') {
            newForm.valueLocal = prev.value || ''
          }
        }
      }

      // If value (MYR) is being changed and member is MYR, update valueLocal automatically
      if (field === 'value' && !memberProfilesLoading && prev.memberLogin && validateMember(prev.memberLogin)) {
        const memberDetails = getMemberDetails(prev.memberLogin)
        if (memberDetails?.currency === 'MYR') {
          newForm.valueLocal = value // Auto-sync for MYR players
        }
      }

      return newForm
    })
  }

  // Handle gift request submission
  const handleSubmitRequest = async () => {
    if (!canAddGifts) {
      toast.error("You don't have permission to submit gift requests")
      return
    }

    // Validate all required fields
    if (!requestForm.memberLogin || !requestForm.giftItem || !requestForm.value || !requestForm.category) {
      toast.error('Please fill in all required fields')
      return
    }

    // Validate member login exists
    if (!validateMember(requestForm.memberLogin)) {
      toast.error('Please enter a valid member login')
      return
    }

    // Validate value is a number
    const numericValue = parseFloat(requestForm.value)
    if (isNaN(numericValue) || numericValue <= 0) {
      toast.error('Please enter a valid value amount')
      return
    }

    setIsSubmittingRequest(true)
    try {
      // Get the validated member details
      const validatedMember = getMemberDetails(requestForm.memberLogin)
      if (!validatedMember) {
        toast.error('Member validation failed. Please try again.')
        return
      }

      // Parse local value
      const numericLocalValue = requestForm.valueLocal ? parseFloat(requestForm.valueLocal) : null

      const response = await fetch('/api/gift-approval/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vipId: validatedMember.memberId,
          memberName: validatedMember.memberName,
          memberLogin: validatedMember.memberLogin,
          giftItem: requestForm.giftItem,
          rewardName: requestForm.rewardName || null,
          rewardClubOrder: requestForm.rewardClubOrder || null,
          costMyr: numericValue,
          costLocal: numericLocalValue,
          currency: validatedMember.currency || 'MYR',
          remark: requestForm.remark,
          category: requestForm.category,
          userId: user?.id!,
          userRole: user?.role!,
          userPermissions: user?.permissions!,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message || 'Failed to create gift request')
      }

      toast.success('Gift request submitted successfully!', {
        description: `Gift request has been created and moved to Manager Review.`,
      })

      // console.log("Checking data", data)
      // Log activity using the returned gift ID
      if (data.data?.giftId) {
        await logActivity('CREATE_REQUEST', user?.id || 'unknown', user?.name || user?.email || 'unknown', user?.email || 'unknown', {
          giftId: data.data.giftId,
          fromStatus: '',
          toStatus: 'KAM_Request',
          giftItem: requestForm.giftItem,
          memberName: requestForm.memberName,
          memberLogin: requestForm.memberLogin,
          costMyr: parseFloat(requestForm.value),
          category: requestForm.category,
          remark: `Gift request created: ${requestForm.giftItem} for ${requestForm.memberName}`,
        })
      }

      // Reset form
      setRequestForm({
        vipId: '',
        memberName: '',
        memberLogin: '',
        giftItem: '',
        rewardName: '',
        rewardClubOrder: '',
        value: '',
        valueLocal: '',
        remark: '',
        category: '',
      })
      setShowMemberDropdown(false)

      // Close modal
      setIsRequestModalOpen(false)

      await refreshGiftsData()
    } catch (error) {
      console.error('Error creating gift request:', error)
      toast.error('Failed to create gift request')
    } finally {
      setIsSubmittingRequest(false)
    }
  }

  // VIP players assigned to this KAM account (using hardcoded data until database is ready)
  // const assignedVIPPlayers is now imported from lib/vip-players.ts

  // Helper function to get selected gift IDs from row selection
  const getSelectedGiftIds = () => {
    const selectedRows = Object.keys(rowSelection)
    const currentTabGifts = getPaginatedGifts(activeTab)
    return selectedRows
      .map((rowId) => {
        const rowIndex = parseInt(rowId)
        return currentTabGifts[rowIndex]?.giftId
      })
      .filter(Boolean) as number[]
  }

  // Enhanced bulk action handlers with better naming and workflow integration
  const handleBulkApproveToProcessing = async () => {
    if (!canEditGifts) {
      toast.error("You don't have permission to approve gifts")
      return
    }

    const selectedRows = Object.keys(rowSelection)
    if (selectedRows.length === 0) {
      toast.error('Please select at least one gift to approve')
      return
    }

    const selectedGiftIds = getSelectedGiftIds()

    setIsBulkActioning(true)
    try {
      const data = await performBulkAction(
        'bulk_approve_to_processing',
        selectedGiftIds,
        {
          tab: activeTab,
        },
        user?.id || 'unknown'
      )

      toast.success(`Successfully approved ${selectedGiftIds.length} gift(s) to processing stage`)

      // Activity logging is now handled automatically by the API
      setRowSelection({})
      await refreshGiftsData()
    } catch (error) {
      toast.error('Failed to approve gifts')
    } finally {
      setIsBulkActioning(false)
    }
  }

  const handleBulkRejectWithReason = async (reason: string) => {
    if (!canEditGifts) {
      toast.error("You don't have permission to reject gifts")
      return
    }

    const selectedRows = Object.keys(rowSelection)
    if (selectedRows.length === 0) {
      toast.error('Please select at least one gift to reject')
      return
    }

    const selectedGiftIds = getSelectedGiftIds()

    setIsBulkActioning(true)
    try {
      const data = await performBulkAction(
        'bulk_reject_with_reason',
        selectedGiftIds,
        {
          reason: reason,
          tab: activeTab,
        },
        user?.id || 'unknown'
      )

      toast.success(`Successfully rejected ${selectedGiftIds.length} gift(s): ${reason}`)

      // Activity logging is now handled automatically by the API
      setRowSelection({})
      await refreshGiftsData()
    } catch (error) {
      toast.error('Failed to reject gifts')
    } finally {
      setIsBulkActioning(false)
    }
  }

  // Processing tab specific actions
  const handleBulkSetBOUploaded = async () => {
    if (!canEditGifts) {
      toast.error("You don't have permission to update BO status")
      return
    }

    const selectedRows = Object.keys(rowSelection)
    if (selectedRows.length === 0) {
      toast.error('Please select at least one gift')
      return
    }

    const selectedGiftIds = getSelectedGiftIds()
    console.log('🔍 [BULK BO] Row Selection Debug:', {
      selectedRows,
      selectedRowsCount: selectedRows.length,
      activeTab,
      selectedGiftIds,
      selectedGiftIdsCount: selectedGiftIds.length,
    })
    setIsBulkActioning(true)
    try {
      const data = await performBulkAction(
        'bulk_set_bo_uploaded',
        selectedGiftIds,
        {
          uploadedBo: true,
          tab: activeTab,
        },
        user?.id || 'unknown'
      )

      toast.success(`Successfully marked BO as uploaded for ${selectedGiftIds.length} gift(s)`)

      setRowSelection({})
      await refreshGiftsData()
    } catch (error) {
      toast.error('Failed to update BO status')
    } finally {
      setIsBulkActioning(false)
    }
  }

  const handleBulkProceedToKAMProof = async () => {
    if (!canEditGifts) {
      toast.error("You don't have permission to proceed gifts")
      return
    }

    const selectedRows = Object.keys(rowSelection)
    if (selectedRows.length === 0) {
      toast.error('Please select at least one gift')
      return
    }

    const selectedGiftIds = getSelectedGiftIds()
    console.log('🔍 [FRONTEND] Selected Gift IDs:', selectedGiftIds)
    setIsBulkActioning(true)
    try {
      const data = await performBulkAction(
        'bulk_proceed_to_kam_proof',
        selectedGiftIds,
        {
          tab: activeTab,
        },
        user?.id || 'unknown'
      )

      toast.success(`Successfully moved ${selectedGiftIds.length} gift(s) to KAM Proof stage`)

      setRowSelection({})
      await refreshGiftsData()
    } catch (error: any) {
      console.log('🔍 [FRONTEND] KAM Proof Validation Error:', {
        error,
        errorMessage: error.message,
        errorType: typeof error,
        hasValidationError: error.message?.includes('do not meet requirements'),
      })

      // Show detailed validation errors if available
      if (error.message && error.message.includes('do not meet requirements')) {
        toast.error(error.message, {
          description: 'Please check the validation requirements and try again',
        })
      } else {
        toast.error('Failed to proceed gifts to KAM Proof', {
          description: error.message || 'Unknown error occurred',
        })
      }
    } finally {
      setIsBulkActioning(false)
    }
  }

  // KAM Proof tab specific actions
  const handleBulkFillFeedback = async (feedback: string, proceedToAudit: boolean = false) => {
    if (!canEditGifts) {
      toast.error("You don't have permission to fill feedback")
      return
    }

    const selectedRows = Object.keys(rowSelection)
    if (selectedRows.length === 0) {
      toast.error('Please select at least one gift')
      return
    }

    const selectedGiftIds = getSelectedGiftIds()

    const action = proceedToAudit ? 'bulk_fill_feedback_and_proceed' : 'bulk_fill_feedback_only'

    setIsBulkActioning(true)
    try {
      const data = await performBulkAction(
        action,
        selectedGiftIds,
        {
          receiverFeedback: feedback,
          tab: activeTab,
        },
        user?.id || 'unknown'
      )

      const message = proceedToAudit ? `Successfully added feedback and moved ${selectedGiftIds.length} gift(s) to audit stage` : `Successfully added feedback to ${selectedGiftIds.length} gift(s)`

      toast.success(message)

      setRowSelection({})
      await refreshGiftsData()
    } catch (error) {
      toast.error('Failed to fill feedback')
    } finally {
      setIsBulkActioning(false)
    }
  }

  // Audit tab specific actions
  const handleBulkMarkCompleted = async (auditRemark?: string) => {
    if (!canEditGifts) {
      toast.error("You don't have permission to complete audit")
      return
    }

    const selectedRows = Object.keys(rowSelection)
    if (selectedRows.length === 0) {
      toast.error('Please select at least one gift')
      return
    }

    const selectedGiftIds = getSelectedGiftIds()

    setIsBulkActioning(true)
    try {
      const data = await performBulkAction(
        'bulk_mark_completed',
        selectedGiftIds,
        {
          checkerName: user?.name || user?.email || 'Unknown',
          auditRemark: auditRemark,
          tab: activeTab,
        },
        user?.id || 'unknown'
      )

      toast.success(`Successfully marked ${selectedGiftIds.length} gift(s) as completed`)

      setRowSelection({})
      await refreshGiftsData()
    } catch (error) {
      toast.error('Failed to mark gifts as completed')
    } finally {
      setIsBulkActioning(false)
    }
  }

  const handleBulkMarkAsIssue = async (auditRemark: string) => {
    if (!canEditGifts) {
      toast.error("You don't have permission to mark as issue")
      return
    }

    const selectedRows = Object.keys(rowSelection)
    if (selectedRows.length === 0) {
      toast.error('Please select at least one gift')
      return
    }

    const selectedGiftIds = getSelectedGiftIds()

    setIsBulkActioning(true)
    try {
      const data = await performBulkAction(
        'bulk_mark_as_issue',
        selectedGiftIds,
        {
          checkerName: user?.name || user?.email || 'Unknown',
          auditRemark: auditRemark,
          tab: activeTab,
        },
        user?.id || 'unknown'
      )

      toast.success(`Successfully marked ${selectedGiftIds.length} gift(s) as issue and returned to KAM Proof`)

      setRowSelection({})
      await refreshGiftsData()
    } catch (error) {
      toast.error('Failed to mark gifts as issue')
    } finally {
      setIsBulkActioning(false)
    }
  }

  const handleBulkRejectFromProcessing = async (reason: string) => {
    if (!canEditGifts) {
      toast.error("You don't have permission to reject gifts")
      return
    }

    const selectedRows = Object.keys(rowSelection)
    if (selectedRows.length === 0) {
      toast.error('Please select at least one gift to reject')
      return
    }

    const selectedGiftIds = getSelectedGiftIds()

    setIsBulkActioning(true)
    try {
      const data = await performBulkAction(
        'bulk_reject_with_reason_from_processing',
        selectedGiftIds,
        {
          reason: reason,
          tab: activeTab,
        },
        user?.id || 'unknown'
      )

      toast.success(`Successfully rejected ${selectedGiftIds.length} gift(s) from processing`)

      setRowSelection({})
      setRejectReason('')
      await refreshGiftsData()
    } catch (error) {
      toast.error('Failed to reject gifts from processing')
    } finally {
      setIsBulkActioning(false)
    }
  }

  const handleBulkProceedToAudit = async () => {
    if (!canEditGifts) {
      toast.error("You don't have permission to proceed gifts to audit")
      return
    }

    const selectedRows = Object.keys(rowSelection)
    if (selectedRows.length === 0) {
      toast.error('Please select at least one gift to proceed')
      return
    }

    const selectedGiftIds = getSelectedGiftIds()

    setIsBulkActioning(true)
    try {
      const data = await performBulkAction(
        'bulk_proceed_to_audit',
        selectedGiftIds,
        {
          tab: activeTab,
        },
        user?.id || 'unknown'
      )

      toast.success(`Successfully moved ${selectedGiftIds.length} gift(s) to audit stage`)

      setRowSelection({})
      await refreshGiftsData()
    } catch (error: any) {
      // Check if this is a validation error requiring modal
      if (error.message && error.message.includes('do not have feedback')) {
        toast.error("Some gifts are missing feedback. Please fill feedback first or use 'Fill Feedback and Proceed' action.")
      } else {
        toast.error('Failed to proceed gifts to audit')
      }
    } finally {
      setIsBulkActioning(false)
    }
  }

  // Individual action handlers
  const handleApproveGift = async (giftId: number) => {
    if (!canEditGifts) {
      toast.error("You don't have permission to approve gifts")
      return
    }

    setIsApprovingGift(giftId)
    try {
      const response = await fetch('/api/gift-approval/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          giftId,
          tab: 'pending',
          action: 'approve',
          targetStatus: 'MKTOps_Processing', // Pass target status from frontend
          userId: user?.id || 'unknown',
          userRole: user?.role || '',
          userPermissions: user?.permissions || {},
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message || 'Failed to approve gift')
      }

      toast.success('Gift approved successfully')

      // Log activity
      await logActivity('APPROVE', user?.id || 'unknown', user?.name || user?.email || 'unknown', user?.email || 'unknown', {
        giftId: giftId,
        fromStatus: 'Manager_Review',
        toStatus: 'MKTOps_Processing',
        remark: 'Gift approved by manager',
      })

      await refreshGiftsData()
    } catch (error) {
      toast.error('Failed to approve gift')
    } finally {
      setIsApprovingGift(null)
    }
  }

  const handleRejectGift = async (giftId: number, reason: string) => {
    if (!canEditGifts) {
      toast.error("You don't have permission to reject gifts")
      return
    }

    setIsRejectingGift(giftId)
    try {
      const response = await fetch('/api/gift-approval/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          giftId,
          tab: 'pending',
          action: 'reject',
          targetStatus: 'Rejected', // Pass target status from frontend
          userId: user?.id || 'unknown',
          userRole: user?.role || '',
          userPermissions: user?.permissions || {},
          rejectReason: reason,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message || 'Failed to reject gift')
      }

      toast.success('Gift rejected successfully')

      // Log activity
      await logActivity('REJECT', user?.id || 'unknown', user?.name || user?.email || 'unknown', user?.email || 'unknown', {
        giftId: giftId,
        fromStatus: 'Manager_Review',
        toStatus: 'Rejected',
        remark: `Gift rejected: ${reason}`,
      })

      setRejectReason('')
      setIsRejectModalOpen(false)
      setRejectingGiftId(null)
      await refreshGiftsData()
    } catch (error) {
      toast.error('Failed to reject gift')
    } finally {
      setIsRejectingGift(null)
    }
  }

  const handleMKTOpsUpdate = async (giftId: number, dispatcher: string, trackingCode: string, trackingStatus: string, mktOpsProof: File | null) => {
    if (!canEditGifts) {
      toast.error("You don't have permission to update MKTOps information")
      return
    }

    setIsUpdatingMKTOps(giftId)
    try {
      // If there's an image file, upload it using the API endpoint
      let mktProofUrl = null
      if (mktOpsProof) {
        toast.info('Uploading image to Snowflake...')

        const formData = new FormData()
        formData.append('file', mktOpsProof)
        formData.append('giftId', giftId.toString())
        formData.append('uploadType', 'mkt-proof')

        const uploadResponse = await fetch('/api/gift-approval/upload-image', {
          method: 'POST',
          body: formData,
        })

        const uploadData = await uploadResponse.json()
        if (!uploadData.success) {
          throw new Error(uploadData.message || 'Failed to upload image')
        }

        mktProofUrl = uploadData.data.imageUrl
      } else {
        // Keep existing image URL if no new image is uploaded
        // We need to get the original Snowflake URL, not the proxy URL
        const currentGift = gifts.find((g) => g.giftId === giftId)
        mktProofUrl = currentGift?.mktProof || null
      }

      // Update gift details using the new unified API
      const response = await fetch(`/api/gift-approval/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          giftId,
          tab: 'processing',
          action: 'update-mktops',
          userId: user?.id || 'unknown',
          userRole: user?.role,
          userPermissions: user?.permissions,
          data: {
            dispatcher: dispatcher.trim(),
            trackingCode: trackingCode.trim(),
            trackingStatus: trackingStatus.trim(),
            mktProof: mktProofUrl,
            giftFeedback: null, // Optional field for MKTOps updates
          },
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message || 'Failed to update MKTOps information')
      }

      toast.success('MKTOps information updated successfully')

      // Log activity
      await logActivity('UPDATE_MKTOPS', user?.id || 'unknown', user?.name || user?.email || 'unknown', user?.email || 'unknown', {
        giftId: giftId,
        dispatcher: dispatcher,
        trackingCode: trackingCode,
        trackingStatus: trackingStatus,
        remark: `MKTOps info updated: ${dispatcher}, ${trackingCode}, ${trackingStatus}`,
      })

      setIsMKTOpsModalOpen(false)
      await refreshGiftsData()
    } catch (error) {
      console.error('Error updating MKTOps information:', error)
      toast.error('Failed to update MKTOps information')
    } finally {
      setIsUpdatingMKTOps(null)
    }
  }

  const handleSubmitKAMProof = async (giftId: number, kamProof: File | null, giftFeedback: string) => {
    if (!canEditGifts) {
      toast.error("You don't have permission to submit KAM proof")
      return
    }

    setIsSubmittingKAMProof(giftId)
    try {
      // If there's an image file, upload it using the API endpoint
      let kamProofUrl = null
      if (kamProof) {
        toast.info('Uploading image to Snowflake...')

        const formData = new FormData()
        formData.append('file', kamProof)
        formData.append('giftId', giftId.toString())
        formData.append('uploadType', 'kam-proof')

        const uploadResponse = await fetch('/api/gift-approval/upload-image', {
          method: 'POST',
          body: formData,
        })

        const uploadData = await uploadResponse.json()
        if (!uploadData.success) {
          throw new Error(uploadData.message || 'Failed to upload image')
        }

        kamProofUrl = uploadData.data.imageUrl
      } else {
        // Keep existing image URL if no new image is uploaded
        // We need to get the original Snowflake URL, not the proxy URL
        const currentGift = gifts.find((g) => g.giftId === giftId)
        kamProofUrl = currentGift?.kamProof || null
      }

      // Update gift details using the new unified API
      const response = await fetch(`/api/gift-approval/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          giftId,
          tab: 'kam-proof',
          action: 'submit',
          userId: user?.id || 'unknown',
          userRole: user?.role,
          userPermissions: user?.permissions,
          data: {
            kamProof: kamProofUrl,
            giftFeedback: giftFeedback.trim() || null,
          },
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message || 'Failed to submit KAM proof')
      }

      // Check if this was a resubmission (gift had audit remark)
      const currentGift = gifts.find((g) => g.giftId === giftId)
      const wasResubmission = currentGift?.auditRemark

      const successMessage = wasResubmission ? 'KAM proof resubmitted successfully - audit issue addressed' : 'KAM proof submitted successfully'

      toast.success(successMessage)

      // Log activity
      await logActivity('SUBMIT_KAM_PROOF', user?.id || 'unknown', user?.name || user?.email || 'unknown', user?.email || 'unknown', {
        giftId: giftId,
        fromStatus: 'KAM_Proof',
        toStatus: 'SalesOps_Audit',
        giftFeedback: giftFeedback,
        remark: `KAM proof submitted${giftFeedback ? ': ' + giftFeedback : ''}`,
      })

      setIsKAMProofModalOpen(false)
      await refreshGiftsData()
    } catch (error) {
      console.error('Error submitting KAM proof:', error)
      toast.error('Failed to submit KAM proof')
    } finally {
      setIsSubmittingKAMProof(null)
    }
  }

  const handleRejectFromProcessing = async (giftId: number, reason: string) => {
    if (!canEditGifts) {
      toast.error("You don't have permission to reject gifts")
      return
    }

    try {
      const response = await fetch('/api/gift-approval/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          giftId,
          tab: 'processing',
          action: 'reject',
          targetStatus: 'Rejected', // Pass target status from frontend
          userId: user?.id || 'unknown',
          userRole: user?.role || '',
          userPermissions: user?.permissions || {},
          rejectReason: reason,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message || 'Failed to reject gift')
      }

      toast.success('Gift rejected from processing successfully')
      setRejectReason('')
      setIsRejectModalOpen(false)
      setRejectingGiftId(null)
      await refreshGiftsData()
    } catch (error) {
      toast.error('Failed to reject gift from processing')
    }
  }

  const handleToggleBO = async (giftId: number) => {
    if (!canEditGifts) {
      toast.error("You don't have permission to update BO status")
      return
    }

    setIsTogglingBO(giftId)
    try {
      const response = await fetch('/api/gift-approval/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          giftId,
          tab: 'processing',
          action: 'toggle-bo',
          userId: user?.id || 'unknown',
          userRole: user?.role || '',
          userPermissions: user?.permissions || {},
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message || 'Failed to toggle BO status')
      }

      toast.success('BO status updated successfully')
      await refreshGiftsData()
    } catch (error) {
      toast.error('Failed to toggle BO status')
    } finally {
      setIsTogglingBO(null)
    }
  }

  const handleProceedToNext = async (giftId: number) => {
    if (!canEditGifts) {
      toast.error("You don't have permission to proceed to next step")
      return
    }

    setIsProceedingToNext(giftId)
    try {
      const response = await fetch('/api/gift-approval/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          giftId,
          tab: 'processing',
          action: 'proceed',
          targetStatus: 'KAM_Proof', // Move to KAM Proof step
          userId: user?.id || 'unknown',
          userRole: user?.role || '',
          userPermissions: user?.permissions || {},
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message || 'Failed to proceed to next step')
      }

      toast.success('Gift moved to KAM Proof step successfully')

      // Log activity
      await logActivity('PROCEED_TO_KAM_PROOF', user?.id || 'unknown', user?.name || user?.email || 'unknown', user?.email || 'unknown', {
        giftId: giftId,
        fromStatus: 'MKTOps_Processing',
        toStatus: 'KAM_Proof',
        remark: 'Gift moved to KAM Proof stage',
      })

      await refreshGiftsData()
    } catch (error) {
      toast.error('Failed to proceed to next step')
    } finally {
      setIsProceedingToNext(null)
    }
  }

  const handleSubmitAudit = async (giftId: number, auditRemark: string, checkerName: string, action: 'complete' | 'mark-issue') => {
    if (!canEditGifts) {
      toast.error("You don't have permission to submit audit")
      return
    }

    setIsSubmittingAudit(giftId)
    try {
      const response = await fetch(`/api/gift-approval/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          giftId,
          tab: 'audit',
          action: action,
          targetStatus: action === 'complete' ? 'Completed' : 'KAM_Proof', // Pass target status from frontend
          userId: user?.id || 'unknown',
          userRole: user?.role,
          userPermissions: user?.permissions,
          auditRemark: auditRemark.trim() || null,
          checkerName: checkerName.trim() || null,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message || 'Failed to submit audit')
      }

      const successMessage = action === 'complete' ? 'Gift marked as completed successfully' : 'Gift marked as issue and returned to KAM Proof'

      toast.success(successMessage)

      // Log activity
      await logActivity(action === 'complete' ? 'AUDIT_COMPLETE' : 'AUDIT_ISSUE', user?.id || 'unknown', user?.name || user?.email || 'unknown', user?.email || 'unknown', {
        giftId: giftId,
        fromStatus: 'SalesOps_Audit',
        toStatus: action === 'complete' ? 'Completed' : 'KAM_Proof',
        auditRemark: auditRemark,
        checkerName: checkerName,
        remark: `Audit ${action}: ${auditRemark}`,
      })

      setIsAuditModalOpen(false)
      await refreshGiftsData()
    } catch (error) {
      console.error('Error submitting audit:', error)
      const errorMessage = action === 'complete' ? 'Failed to mark gift as completed' : 'Failed to mark gift as issue'
      toast.error(errorMessage)
    } finally {
      setIsSubmittingAudit(null)
    }
  }

  const handleBulkExport = async () => {
    if (!canExportGifts) {
      toast.error("You don't have permission to export gifts")
      return
    }

    const selectedRows = Object.keys(rowSelection)
    if (selectedRows.length === 0) {
      toast.error('Please select at least one gift to export')
      return
    }

    const selectedGifts = gifts.filter((_, index) => selectedRows.includes(index.toString()))

    // Format data according to the specification
    const formattedData = selectedGifts.map((gift) => ({
      Date: gift.createdDate ? gift.createdDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '',
      PIC: gift.kamRequestedBy || '',
      'Member Login': gift.memberLogin || '',
      'Full Name': gift.fullName || '',
      'HP Number': gift.phone || '',
      Address: gift.address || '',
      'Reward Name': gift.rewardName || '',
      'Gift Cost (MYR)': gift.costMyr ? gift.costMyr.toString() : '',
      'Cost (VND)': gift.costVnd ? gift.costVnd.toString() : '',
      Remark: gift.remark || '',
      'Reward Club Order': gift.rewardClubOrder || '',
      Category: gift.category || '',
      Dispatcher: gift.dispatcher || '',
      'Tracking Code': gift.trackingCode || '',
      Status: gift.trackingStatus || '',
      'Uploaded BO': gift.uploadedBo ? 'Yes' : 'No',
      'MKTOps Proof': gift.mktProof || '',
      'KAM Proof': gift.kamProof || '',
      'Checker Name': gift.auditedBy || '',
      'Checked Date': gift.auditDate ? gift.auditDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long' }) : '',
      'Audit Remark': gift.auditRemark || '',
    }))

    exportToCSV(formattedData, `bulk_gifts_${new Date().toISOString().split('T')[0]}`)
    toast.success(`Exported ${selectedRows.length} gifts to CSV`)

    // Log export activity
    await logActivity('BULK_EXPORT', user?.id || 'unknown', user?.name || user?.email || 'unknown', user?.email || 'unknown', {
      exportedCount: selectedRows.length,
      exportType: 'csv',
      activeTab: activeTab,
      remark: `Exported ${selectedRows.length} gifts to CSV`,
    })
  }

  // Get filtered gifts based on active tab - now handles client-side filtering
  const getFilteredGifts = (status: string) => {
    let filtered = gifts

    // Apply workflow status filter based on active tab
    if (status !== 'all') {
      if (status === 'pending') {
        filtered = gifts.filter((gift) => gift.workflowStatus === 'KAM_Request' || gift.workflowStatus === 'Manager_Review')
      } else if (status === 'rejected') {
        filtered = gifts.filter((gift) => gift.workflowStatus === 'Rejected')
      } else if (status === 'processing') {
        filtered = gifts.filter((gift) => gift.workflowStatus === 'MKTOps_Processing')
      } else if (status === 'kam-proof') {
        filtered = gifts.filter((gift) => gift.workflowStatus === 'KAM_Proof')
      } else if (status === 'audit') {
        filtered = gifts.filter((gift) => gift.workflowStatus === 'SalesOps_Audit')
      } else if (status === 'completed') {
        filtered = gifts.filter((gift) => gift.workflowStatus === 'Completed')
      }
    }

    // Apply search filter if search term exists
    if (searchTerm) {
      filtered = filtered.filter((gift) => gift.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || gift.giftItem?.toLowerCase().includes(searchTerm.toLowerCase()) || gift.giftId?.toString().includes(searchTerm.toLowerCase()) || gift.memberLogin?.toLowerCase().includes(searchTerm.toLowerCase()))
    }

    return filtered
  }

  // Get paginated gifts for the current page
  const getPaginatedGifts = (status: string) => {
    const filtered = getFilteredGifts(status)
    const startIndex = (pagination.page - 1) * pagination.limit
    const endIndex = startIndex + pagination.limit
    return filtered.slice(startIndex, endIndex)
  }

  // Get workflow status badge
  const getWorkflowStatusBadge = (status: string) => {
    const colors = {
      KAM_Request: 'bg-blue-100 text-blue-800 border-blue-200',
      Manager_Review: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      MKTOps_Processing: 'bg-purple-100 text-purple-800 border-purple-200',
      KAM_Proof: 'bg-orange-100 text-orange-800 border-orange-200',
      SalesOps_Audit: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      Completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      Rejected: 'bg-red-100 text-red-800 border-red-200',
    }
    return <Badge className={`${colors[status as keyof typeof colors]} border`}>{status.replace('_', ' ')}</Badge>
  }

  // Table columns
  const columns: ColumnDef<GiftRequestDetails>[] = [
    {
      id: 'select',
      header: ({ table }) => {
        const allSelected = table.getRowModel().rows.every((row) => rowSelection[row.id])
        const someSelected = table.getRowModel().rows.some((row) => rowSelection[row.id])

        return (
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected && !allSelected
              }}
              onChange={(value) => {
                const newSelection: Record<string, boolean> = {}
                if (value.target.checked) {
                  table.getRowModel().rows.forEach((row) => {
                    newSelection[row.id] = true
                  })
                }
                setRowSelection(newSelection)
              }}
              className="rounded"
            />
          </div>
        )
      },
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={rowSelection[row.id] || false}
            onChange={(value) => {
              const newSelection = { ...rowSelection }
              if (value.target.checked) {
                newSelection[row.id] = true
              } else {
                delete newSelection[row.id]
              }
              setRowSelection(newSelection)
            }}
            className="rounded"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'giftId',
      header: 'Gift ID',
      cell: ({ row }) => <div className="font-mono text-sm">{row.getValue('giftId')}</div>,
    },
    {
      accessorKey: 'fullName',
      header: 'Player',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.getValue('fullName') || 'N/A'}</div>
          <div className="text-sm text-slate-500">{row.original.memberLogin || 'N/A'}</div>
        </div>
      ),
    },
    {
      accessorKey: 'giftItem',
      header: 'Gift Item',
      cell: ({ row }) => (
        <div className="max-w-xs">
          <div className="font-medium truncate">{row.getValue('giftItem') || 'N/A'}</div>
          <div className="text-xs text-slate-500">{row.original.category || 'N/A'}</div>
        </div>
      ),
    },
    {
      accessorKey: 'rewardName',
      header: 'Reward Name',
      cell: ({ row }) => (
        <div className="max-w-xs">
          <div className="font-medium truncate">{row.original.rewardName || '-'}</div>
        </div>
      ),
    },
    {
      accessorKey: 'rewardClubOrder',
      header: 'Reward Club Order',
      cell: ({ row }) => (
        <div className="max-w-xs">
          <div className="font-mono text-sm text-slate-600">{row.original.rewardClubOrder || '-'}</div>
        </div>
      ),
    },
    {
      accessorKey: 'costMyr',
      header: 'Value (MYR)',
      cell: ({ row }) => {
        const amount = Number.parseFloat(row.getValue('costMyr') || '0')
        const formatted = formatMoney(amount, { currency: 'MYR' })
        return <div className="font-medium">{formatted}</div>
      },
    },
    {
      accessorKey: 'workflowStatus',
      header: 'Workflow Status',
      cell: ({ row }) => {
        const status = row.getValue('workflowStatus') as string
        const gift = row.original

        return (
          <div className="flex items-center gap-2">
            {getWorkflowStatusBadge(status)}
            {status === 'Rejected' && gift.rejectReason && (
              <div className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full border border-red-200">
                <XCircle className="h-3 w-3" />
                <span>Has Reason</span>
              </div>
            )}
            {(status === 'KAM_Request' || status === 'Manager_Review' || status === 'MKTOps_Processing' || status === 'KAM_Proof') && gift.auditRemark && (
              <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full border border-orange-200">
                <XCircle className="h-3 w-3" />
                <span>Has Issue</span>
              </div>
            )}
            {status === 'MKTOps_Processing' && gift.uploadedBo && (
              <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-200">
                <CheckSquare className="h-3 w-3" />
                <span>BO Uploaded</span>
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'createdDate',
      header: 'Request Date',
      cell: ({ row }) => {
        const date = row.getValue('createdDate') as Date | null
        return <div className="text-sm">{date ? date.toLocaleDateString() : 'N/A'}</div>
      },
    },
    {
      accessorKey: 'kamRequestedBy',
      header: 'KAM',
      cell: ({ row }) => <div className="text-sm">{row.getValue('kamRequestedBy') || 'N/A'}</div>,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const gift = row.original
        return (
          <div className="flex space-x-2">
            {/* View Action - Always available */}
            <PermissionGuard module="gift-approval" permission="VIEW">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-pointer" onClick={() => setSelectedGift(gift)} title={gift.workflowStatus === 'Rejected' ? 'View Gift Details & Rejection Reason' : 'View Gift Details'}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Gift Timeline - {gift.giftId}
                    </DialogTitle>
                    <DialogDescription>Complete workflow history for {gift.fullName}'s gift request</DialogDescription>
                  </DialogHeader>

                  <div className="space-y-6">
                    {/* Gift Details */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Gift Details</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-slate-600">Player</p>
                            <p className="text-base">
                              {gift.fullName || 'N/A'} ({gift.memberLogin || 'N/A'})
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-600">Gift Item</p>
                            <p className="text-base">{gift.giftItem || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-600">Reward Name</p>
                            <p className="text-base">{gift.rewardName || '-'}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-600">Reward Club Order</p>
                            <p className="text-base font-mono text-sm">{gift.rewardClubOrder || '-'}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-600">Value (MYR)</p>
                            <p className="text-base">{formatMoney(gift.costMyr || 0, { currency: 'MYR' })}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-600">Category</p>
                            <p className="text-base">{gift.category || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-600">KAM</p>
                            <p className="text-base">{gift.kamRequestedBy || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-600">Current Status</p>
                            <div className="mt-1">{getWorkflowStatusBadge(gift.workflowStatus || 'Unknown')}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Rejection Reason - Prominently displayed for rejected gifts */}
                    {gift.workflowStatus === 'Rejected' && gift.rejectReason && (
                      <Card className="border-red-200 bg-red-50">
                        <CardHeader>
                          <CardTitle className="text-lg text-red-800 flex items-center gap-2">
                            <XCircle className="h-5 w-5" />
                            Rejection Reason
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="bg-white p-4 rounded-lg border border-red-200">
                            <p className="text-red-800 font-medium mb-2">Reason for Rejection:</p>
                            <p className="text-red-700">{gift.rejectReason}</p>
                            <div className="mt-3 text-sm text-red-600">
                              <p>
                                <span className="font-medium">Rejected by:</span> {gift.approvalReviewedBy || 'Unknown'}
                              </p>
                              <p>
                                <span className="font-medium">Date:</span> {gift.lastModifiedDate ? gift.lastModifiedDate.toLocaleDateString() : 'Unknown'}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Audit Issue - Prominently displayed for gifts returned from audit */}
                    {gift.workflowStatus === 'KAM_Proof' && gift.auditRemark && (
                      <Card className="border-orange-200 bg-orange-50">
                        <CardHeader>
                          <CardTitle className="text-lg text-orange-800 flex items-center gap-2">
                            <XCircle className="h-5 w-5" />
                            Audit Issue - Requires KAM Review
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="bg-white p-4 rounded-lg border border-orange-200">
                            <p className="text-orange-800 font-medium mb-2">Issue Found During Audit:</p>
                            <p className="text-orange-700">{gift.auditRemark}</p>
                            <div className="mt-3 text-sm text-orange-600">
                              <p>
                                <span className="font-medium">Audited by:</span> {gift.auditedBy || 'Unknown'}
                              </p>
                              <p>
                                <span className="font-medium">Date:</span> {gift.auditDate ? gift.auditDate.toLocaleDateString() : 'Unknown'}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Additional Details */}
                    {(gift.dispatcher || gift.trackingCode || gift.kamProof || gift.auditRemark) && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Additional Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {gift.dispatcher && (
                              <div>
                                <h5 className="font-medium text-slate-700 mb-2">Shipping Information</h5>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-slate-600">Courier:</span> {gift.dispatcher}
                                  </div>
                                  <div>
                                    <span className="text-slate-600">Tracking:</span> {gift.trackingCode || 'N/A'}
                                  </div>
                                  <div>
                                    <span className="text-slate-600">Status:</span> {gift.trackingStatus || 'N/A'}
                                  </div>
                                  <div>
                                    <span className="text-slate-600">BO Uploaded:</span> {gift.uploadedBo ? 'Yes' : 'No'}
                                  </div>
                                </div>
                              </div>
                            )}

                            {gift.kamProof && (
                              <div>
                                <h5 className="font-medium text-slate-700 mb-2">Delivery Proof</h5>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-slate-600">Proof File:</span> {gift.kamProof}
                                  </div>
                                  <div>
                                    <span className="text-slate-600">Uploaded By:</span> {gift.kamProofBy || 'Unknown'}
                                  </div>
                                  <div>
                                    <span className="text-slate-600">Feedback:</span> {gift.giftFeedback || 'No feedback provided'}
                                  </div>
                                </div>
                              </div>
                            )}

                            {gift.auditRemark && gift.workflowStatus !== 'Rejected' && gift.workflowStatus !== 'KAM_Proof' && (
                              <div>
                                <h5 className="font-medium text-slate-700 mb-2">Audit Information</h5>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-slate-600">Checker:</span> {gift.auditedBy || 'Unknown'}
                                  </div>
                                  <div>
                                    <span className="text-slate-600">Checked Date:</span> {gift.auditDate ? gift.auditDate.toLocaleDateString() : 'Unknown'}
                                  </div>
                                  <div className="col-span-2">
                                    <span className="text-slate-600">Remark:</span> {gift.auditRemark}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </PermissionGuard>

            {/* Tab-specific actions based on workflow status */}
            {gift.workflowStatus === 'Manager_Review' && (
              <>
                <RoleBasedActionPermission
                  allowedRoles={['MANAGER', 'ADMIN']}
                  permission="EDIT"
                  module="gift-approval"
                  alwaysShow={true}
                  disabledFallback={
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-not-allowed text-gray-400" disabled title="Manager role and EDIT permission required">
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  }
                >
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-pointer text-green-600 hover:text-green-700" onClick={() => handleApproveGift(gift.giftId)} title="Approve Gift" disabled={isApprovingGift === gift.giftId}>
                    {isApprovingGift === gift.giftId ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  </Button>
                </RoleBasedActionPermission>

                <RoleBasedActionPermission
                  allowedRoles={['MANAGER', 'ADMIN']}
                  permission="EDIT"
                  module="gift-approval"
                  alwaysShow={true}
                  disabledFallback={
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-not-allowed text-gray-400" disabled title="Manager role and EDIT permission required">
                      <XCircle className="h-4 w-4" />
                    </Button>
                  }
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 cursor-pointer text-red-600 hover:text-red-700"
                    onClick={() => {
                      setRejectingGiftId(gift.giftId)
                      setIsRejectModalOpen(true)
                    }}
                    title="Reject Gift"
                    disabled={isRejectingGift === gift.giftId}
                  >
                    {isRejectingGift === gift.giftId ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                  </Button>
                </RoleBasedActionPermission>
              </>
            )}

            {gift.workflowStatus === 'MKTOps_Processing' && (
              <>
                <RoleBasedActionPermission
                  allowedRoles={['MKTOPS', 'MANAGER', 'ADMIN']}
                  permission="EDIT"
                  module="gift-approval"
                  alwaysShow={true}
                  disabledFallback={
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-not-allowed text-gray-400" disabled title="MKTOps/Manager role and EDIT permission required">
                      <Truck className="h-4 w-4" />
                    </Button>
                  }
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 cursor-pointer text-blue-600 hover:text-blue-700"
                    onClick={() => {
                      setMKTOpsGiftId(gift.giftId)
                      setMKTOpsForm({
                        dispatcher: gift.dispatcher || '',
                        trackingCode: gift.trackingCode || '',
                        trackingStatus: gift.trackingStatus || 'Pending',
                        mktOpsProof: null,
                        existingMktProofUrl: getImageProxyUrl(gift.mktProof),
                      })
                      setIsMKTOpsModalOpen(true)
                    }}
                    title="Update MKTOps Info"
                    disabled={isUpdatingMKTOps === gift.giftId}
                  >
                    {isUpdatingMKTOps === gift.giftId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
                  </Button>
                </RoleBasedActionPermission>

                <RoleBasedActionPermission
                  allowedRoles={['MKTOPS', 'MANAGER', 'ADMIN']}
                  permission="EDIT"
                  module="gift-approval"
                  alwaysShow={true}
                  disabledFallback={
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-not-allowed text-gray-400" disabled title="MKTOps/Manager role and EDIT permission required">
                      <XCircle className="h-4 w-4" />
                    </Button>
                  }
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 cursor-pointer text-red-600 hover:text-red-700"
                    onClick={() => {
                      setRejectingGiftId(gift.giftId)
                      setIsRejectModalOpen(true)
                    }}
                    title="Reject from Processing (e.g., item sold out)"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </RoleBasedActionPermission>

                <RoleBasedActionPermission
                  allowedRoles={['MKTOPS', 'MANAGER', 'ADMIN']}
                  permission="EDIT"
                  module="gift-approval"
                  alwaysShow={true}
                  disabledFallback={
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-not-allowed text-gray-400" disabled title="MKTOps/Manager role and EDIT permission required">
                      <CheckSquare className="h-4 w-4" />
                    </Button>
                  }
                >
                  <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 cursor-pointer ${gift.uploadedBo ? 'text-green-600 hover:text-green-700' : 'text-gray-600 hover:text-gray-700'}`} onClick={() => handleToggleBO(gift.giftId)} title={`Toggle BO Upload Status (Currently: ${gift.uploadedBo ? 'Uploaded' : 'Not Uploaded'})`} disabled={isTogglingBO === gift.giftId}>
                    {isTogglingBO === gift.giftId ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckSquare className="h-4 w-4" />}
                  </Button>
                </RoleBasedActionPermission>

                <RoleBasedActionPermission
                  allowedRoles={['MKTOPS', 'MANAGER', 'ADMIN']}
                  permission="EDIT"
                  module="gift-approval"
                  alwaysShow={true}
                  disabledFallback={
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-not-allowed text-gray-400" disabled title="MKTOps/Manager role and EDIT permission required">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  }
                >
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-pointer text-purple-600 hover:text-purple-700" onClick={() => handleProceedToNext(gift.giftId)} title="Proceed to KAM Proof Step" disabled={isProceedingToNext === gift.giftId}>
                    {isProceedingToNext === gift.giftId ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  </Button>
                </RoleBasedActionPermission>
              </>
            )}

            {gift.workflowStatus === 'KAM_Proof' && (
              <RoleBasedActionPermission
                allowedRoles={['KAM', 'ADMIN']}
                permission="EDIT"
                module="gift-approval"
                alwaysShow={true}
                disabledFallback={
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-not-allowed text-gray-400" disabled title="KAM role and EDIT permission required">
                    <Upload className="h-4 w-4" />
                  </Button>
                }
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 cursor-pointer text-orange-600 hover:text-orange-700"
                  onClick={() => {
                    setKAMProofGiftId(gift.giftId)
                    setKAMProofForm({
                      kamProof: null, // Reset to null since we're uploading a new file
                      giftFeedback: gift.giftFeedback || '',
                      existingKamProofUrl: getImageProxyUrl(gift.kamProof),
                    })
                    setIsKAMProofModalOpen(true)
                  }}
                  title="Submit KAM Proof"
                  disabled={isSubmittingKAMProof === gift.giftId}
                >
                  {isSubmittingKAMProof === gift.giftId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                </Button>
              </RoleBasedActionPermission>
            )}

            {gift.workflowStatus === 'SalesOps_Audit' && (
              <RoleBasedActionPermission
                allowedRoles={['AUDIT', 'ADMIN']}
                permission="EDIT"
                module="gift-approval"
                alwaysShow={true}
                disabledFallback={
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-not-allowed text-gray-400" disabled title="Audit role and EDIT permission required">
                    <ClipboardCheck className="h-4 w-4" />
                  </Button>
                }
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 cursor-pointer text-indigo-600 hover:text-indigo-700"
                  onClick={() => {
                    setAuditGiftId(gift.giftId)
                    setAuditRemark(gift.auditRemark || '')
                    setAuditCheckerName(user?.name || user?.email || '')
                    setIsAuditModalOpen(true)
                  }}
                  title="Audit Gift Request"
                  disabled={isSubmittingAudit === gift.giftId}
                >
                  {isSubmittingAudit === gift.giftId ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
                </Button>
              </RoleBasedActionPermission>
            )}
          </div>
        )
      },
    },
  ]

  // Get tab counts - now works with client-side filtering and search
  const getTabCounts = () => {
    // Use the filtered gifts for counts
    const filteredGifts = getFilteredGifts('all')

    return {
      all: filteredGifts.length,
      pending: filteredGifts.filter((g) => g.workflowStatus === 'KAM_Request' || g.workflowStatus === 'Manager_Review').length,
      rejected: filteredGifts.filter((g) => g.workflowStatus === 'Rejected').length,
      processing: filteredGifts.filter((g) => g.workflowStatus === 'MKTOps_Processing').length,
      kamProof: filteredGifts.filter((g) => g.workflowStatus === 'KAM_Proof').length,
      audit: filteredGifts.filter((g) => g.workflowStatus === 'SalesOps_Audit').length,
      completed: filteredGifts.filter((g) => g.workflowStatus === 'Completed').length,
    }
  }

  const tabCounts = getTabCounts()

  // Stats - now works with filtered data
  const stats = [
    {
      title: 'Pending Review',
      value: tabCounts.pending,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      title: 'In Processing',
      value: tabCounts.processing,
      icon: Truck,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Completed',
      value: tabCounts.completed,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Total Value',
      value: formatMoney(
        getFilteredGifts('all').reduce((sum, g) => sum + (g.costMyr || 0), 0),
        { currency: 'MYR' }
      ),
      icon: null,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <FirebaseLoginForm />
  }

  if (!canViewGifts) {
    return <AccessDenied moduleName="Gift Approval System" />
  }

  // Skeleton loader component for the data table
  const DataTableSkeleton = () => (
    <div className="space-y-4">
      {/* Table header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-32" />
      </div>

      {/* Table rows skeleton */}
      {Array.from({ length: 10 }).map((_, index) => (
        <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-16" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Gift Approval System" description="Manage gift requests and approval workflow" />

        <div className="flex-1 p-6 overflow-y-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-slate-900 mb-2">Gift & Approval Module</h1>
                <p className="text-slate-600">Workflow for managing gift requests and approvals</p>
              </div>
              <RoleBasedActionPermission
                allowedRoles={['KAM', 'ADMIN']}
                permission="ADD"
                module="gift-approval"
                alwaysShow={true}
                disabledFallback={
                  <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <Package className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">KAM role and ADD permission required to request gifts</p>
                  </div>
                }
              >
                <Dialog open={isRequestModalOpen} onOpenChange={setIsRequestModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-green-600 hover:bg-green-700 cursor-pointer transition-all duration-500">
                      <Plus className="h-4 w-4 mr-2" />
                      Request Gift
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Request New Gift
                      </DialogTitle>
                      <DialogDescription>Submit a new gift request for VIP player approval</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="memberLogin" className="text-sm font-medium">
                          Member Login <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            ref={memberLoginInputRef}
                            id="memberLogin"
                            placeholder="Enter member login to search..."
                            value={requestForm.memberLogin}
                            onChange={(e) => {
                              handleFormChange('memberLogin', e.target.value)
                              setShowMemberDropdown(true)
                            }}
                            onFocus={() => setShowMemberDropdown(true)}
                            onBlur={() => {
                              // Delay hiding dropdown to allow for clicks
                              setTimeout(() => setShowMemberDropdown(false), 200)
                            }}
                            className={`pr-10 ${requestForm.memberLogin && !validateMember(requestForm.memberLogin) ? 'border-red-500 focus:border-red-500' : ''}`}
                            required
                          />
                          {requestForm.memberLogin && <div className="absolute right-3 top-1/2 transform -translate-y-1/2">{validateMember(requestForm.memberLogin) ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}</div>}

                          {/* Dropdown suggestions */}
                          {showMemberDropdown && requestForm.memberLogin && requestForm.memberLogin.length >= 2 && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                              {memberProfilesLoading ? (
                                <div className="px-3 py-2 text-sm text-gray-500 flex items-center">
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  Loading member profiles...
                                </div>
                              ) : memberProfiles.length > 0 ? (
                                memberProfiles
                                  .filter((member) => member.memberLogin.toLowerCase().includes(requestForm.memberLogin.toLowerCase()) || member.memberName.toLowerCase().includes(requestForm.memberLogin.toLowerCase()))
                                  .slice(0, 10) // Limit to 10 suggestions
                                  .map((member) => (
                                    <div
                                      key={member.memberId}
                                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                                      onClick={() => {
                                        setRequestForm((prev) => ({
                                          ...prev,
                                          memberLogin: member.memberLogin,
                                          memberName: member.memberName || '',
                                          vipId: member.memberId.toString(),
                                        }))
                                        setShowMemberDropdown(false)
                                      }}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <div className="font-medium text-sm">{member.memberLogin}</div>
                                          <div className="text-xs text-gray-500">{member.memberName}</div>
                                        </div>
                                        <div className="text-xs text-gray-400">{member.currency && `${member.currency}`}</div>
                                      </div>
                                    </div>
                                  ))
                              ) : (
                                <div className="px-3 py-2 text-sm text-gray-500">No member profiles loaded yet</div>
                              )}
                              {memberProfiles.length > 0 && memberProfiles.filter((member) => member.memberLogin.toLowerCase().includes(requestForm.memberLogin.toLowerCase()) || member.memberName.toLowerCase().includes(requestForm.memberLogin.toLowerCase())).length === 0 && <div className="px-3 py-2 text-sm text-gray-500">No members found matching "{requestForm.memberLogin}"</div>}
                            </div>
                          )}
                        </div>
                        {memberProfilesLoading && <p className="text-xs text-blue-500">Loading member profiles...</p>}
                        {!memberProfilesLoading && memberProfiles.length === 0 && (
                          <p className="text-xs text-red-500">
                            No member profiles loaded.
                            <button onClick={() => refreshCache()} className="ml-2 text-blue-500 hover:text-blue-700 underline" title="Try to reload member cache">
                              Try Again
                            </button>
                          </p>
                        )}
                        {!memberProfilesLoading && memberProfiles.length > 0 && (
                          <p className="text-xs text-green-600">
                            ✅ {memberProfiles.length} members loaded • Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Unknown'}
                            <button onClick={() => refreshCache()} className="ml-2 text-blue-500 hover:text-blue-700 underline" title="Refresh member cache">
                              Refresh
                            </button>
                          </p>
                        )}
                        {!memberProfilesLoading && requestForm.memberLogin && !validateMember(requestForm.memberLogin) && <p className="text-xs text-red-500">Member login not found. Please enter a valid member login.</p>}
                        {!memberProfilesLoading && requestForm.memberLogin && validateMember(requestForm.memberLogin) && <p className="text-xs text-green-500">✓ Valid member: {getMemberDetails(requestForm.memberLogin)?.memberName}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="giftItem" className="text-sm font-medium">
                          Gift Item <span className="text-red-500">*</span>
                        </Label>
                        <Input id="giftItem" placeholder="Enter gift item description" value={requestForm.giftItem} onChange={(e) => handleFormChange('giftItem', e.target.value)} required />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="rewardName" className="text-sm font-medium">
                            Reward Name
                          </Label>
                          <Input id="rewardName" placeholder="Enter reward name (optional)" value={requestForm.rewardName} onChange={(e) => handleFormChange('rewardName', e.target.value)} />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="rewardClubOrder" className="text-sm font-medium">
                            Reward Club Order
                          </Label>
                          <Input id="rewardClubOrder" placeholder="Enter reward club order (optional)" value={requestForm.rewardClubOrder} onChange={(e) => handleFormChange('rewardClubOrder', e.target.value)} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="value" className="text-sm font-medium">
                            Value (MYR) <span className="text-red-500">*</span>
                          </Label>
                          <Input id="value" type="number" step="0.01" placeholder="Enter MYR amount" value={requestForm.value} onChange={(e) => handleFormChange('value', e.target.value)} required />
                          <p className="text-xs text-gray-500">Always enter the MYR equivalent amount</p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="valueLocal" className="text-sm font-medium">
                            Value (Local Currency)
                          </Label>
                          <div className="relative">
                            <Input id="valueLocal" type="number" step="0.01" placeholder={!memberProfilesLoading && requestForm.memberLogin && validateMember(requestForm.memberLogin) ? `Enter ${getMemberDetails(requestForm.memberLogin)?.currency || 'Local'} amount` : 'Enter local currency amount'} value={requestForm.valueLocal || ''} onChange={(e) => handleFormChange('valueLocal', e.target.value)} disabled={Boolean(!memberProfilesLoading && requestForm.memberLogin && validateMember(requestForm.memberLogin) && getMemberDetails(requestForm.memberLogin)?.currency === 'MYR')} />
                            {!memberProfilesLoading && requestForm.memberLogin && validateMember(requestForm.memberLogin) && <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">{getMemberDetails(requestForm.memberLogin)?.currency || 'N/A'}</div>}
                          </div>
                          <p className="text-xs text-gray-500">{!memberProfilesLoading && requestForm.memberLogin && validateMember(requestForm.memberLogin) && getMemberDetails(requestForm.memberLogin)?.currency === 'MYR' ? 'Auto-filled for MYR players (same as MYR value)' : "Optional: Enter amount in member's local currency if different from MYR"}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="category" className="text-sm font-medium">
                          Category <span className="text-red-500">*</span>
                        </Label>
                        <Select value={requestForm.category} onValueChange={(value) => handleFormChange('category', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Birthday">Birthday</SelectItem>
                            <SelectItem value="Retention">Retention</SelectItem>
                            <SelectItem value="High Roller">High Roller</SelectItem>
                            <SelectItem value="Promotion">Promotion</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="remark" className="text-sm font-medium">
                          Remark
                        </Label>
                        <Textarea id="remark" placeholder="Enter detailed remarks about this gift request (optional)" value={requestForm.remark} onChange={(e) => handleFormChange('remark', e.target.value)} rows={4} />
                      </div>

                      <div className="flex justify-end space-x-3 pt-4">
                        <Button variant="outline" onClick={() => setIsRequestModalOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSubmitRequest} className="bg-green-600 hover:bg-green-700" disabled={isSubmittingRequest}>
                          {isSubmittingRequest ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            'Submit Request'
                          )}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </RoleBasedActionPermission>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <Card key={index} className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600 mb-1">{stat.title}</p>
                      <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                    </div>
                    {stat.icon && (
                      <div className={`p-3 ${stat.bgColor} rounded-full`}>
                        <stat.icon className={`h-6 w-6 ${stat.color}`} />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Gift Workflow Diagram */}
          <Card className="mb-8 border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Gift Approval Workflow</CardTitle>
              <CardDescription>Track the complete gift request and delivery process</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-6 bg-gradient-to-r from-green-50 via-blue-50 to-purple-50 rounded-lg">
                <div className="flex items-center justify-between relative">
                  {/* Connecting line */}
                  <div className="absolute top-15 left-0 right-0 h-0.5 bg-gradient-to-r from-green-300 via-blue-300 to-purple-300 z-0"></div>

                  <div className="flex items-center justify-between w-full relative z-10">
                    <div className={`text-center bg-white rounded-lg p-3 shadow-sm border border-green-200 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-md ${isAnimating ? 'animate-pulse' : ''}`} onClick={() => handleWorkflowClick('KAM_Request')}>
                      <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold mb-2 mx-auto">1</div>
                      <p className="text-sm font-semibold text-green-700 mb-1">KAM Request</p>
                      <p className="text-xs text-green-600">Submit gift request</p>
                    </div>

                    <div className={`text-center bg-white rounded-lg p-3 shadow-sm border border-blue-200 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-md ${isAnimating ? 'animate-pulse' : ''}`} onClick={() => handleWorkflowClick('Manager_Review')}>
                      <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold mb-2 mx-auto">2</div>
                      <p className="text-sm font-semibold text-blue-700 mb-1">Manager Review</p>
                      <p className="text-xs text-blue-600">Approve/Reject</p>
                    </div>

                    <div className={`text-center bg-white rounded-lg p-3 shadow-sm border border-purple-200 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-md ${isAnimating ? 'animate-pulse' : ''}`} onClick={() => handleWorkflowClick('MKTOps_Processing')}>
                      <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold mb-2 mx-auto">3</div>
                      <p className="text-sm font-semibold text-purple-700 mb-1">MKTOps</p>
                      <p className="text-xs text-purple-600">Purchase & track</p>
                    </div>

                    <div className={`text-center bg-white rounded-lg p-3 shadow-sm border border-orange-200 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-md ${isAnimating ? 'animate-pulse' : ''}`} onClick={() => handleWorkflowClick('KAM_Proof')}>
                      <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold mb-2 mx-auto">4</div>
                      <p className="text-sm font-semibold text-orange-700 mb-1">KAM Proof</p>
                      <p className="text-xs text-orange-600">Upload delivery proof</p>
                    </div>

                    <div className={`text-center bg-white rounded-lg p-3 shadow-sm border border-emerald-200 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-md ${isAnimating ? 'animate-pulse' : ''}`} onClick={() => handleWorkflowClick('SalesOps_Audit')}>
                      <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold mb-2 mx-auto">5</div>
                      <p className="text-sm font-semibold text-emerald-700 mb-1">SalesOps</p>
                      <p className="text-xs text-emerald-600">Final audit</p>
                    </div>
                  </div>
                </div>

                {/* Additional workflow details */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-3 gap-4 text-xs text-gray-600">
                    <div>
                      <span className="font-medium">Steps 1-2:</span> Request & Approval Phase
                    </div>
                    <div>
                      <span className="font-medium">Steps 3-4:</span> Purchase & Delivery Phase
                    </div>
                    <div>
                      <span className="font-medium">Step 5:</span> Audit & Compliance Phase
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gift Requests with Tabs */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Gift Requests</CardTitle>
              <CardDescription>Complete workflow for managing gift requests, approvals, and delivery tracking</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Search Bar */}
              <div className="flex items-center gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input placeholder="Search by player name, gift item, or request ID... (searches across all tabs)" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>

                {/* Bulk Upload Button */}
                {/* Bulk Upload Button - Only show for "Pending" tab for creating new gifts */}
                {activeTab === 'pending' && (
                  <KAMAndAdminActionWithPermission
                    module="gift-approval"
                    permission="IMPORT"
                    disabledFallback={
                      <Button size="sm" variant="outline" disabled className="opacity-50 cursor-not-allowed" title="KAM role and IMPORT permission required">
                        <Upload className="h-4 w-4 mr-2" />
                        Bulk Import
                      </Button>
                    }
                  >
                    <BulkUploadDialog
                      module="gift-approval"
                      tab={activeTab}
                      trigger={
                        <Button size="sm" variant="outline">
                          <Upload className="h-4 w-4 mr-2" />
                          Bulk Import
                        </Button>
                      }
                      onUploadComplete={async (data) => {
                        console.log('Bulk upload completed:', data)

                        // Log activity for each created gift ID
                        if (data?.createdGiftIds && Array.isArray(data.createdGiftIds)) {
                          for (const giftId of data.createdGiftIds) {
                            await logActivity('BULK_IMPORT', user?.id || 'unknown', user?.name || user?.email || 'unknown', user?.email || 'unknown', {
                              giftId: giftId,
                              fromStatus: '',
                              toStatus: 'Manager_Review',
                              remark: `Bulk import: Gift created via CSV upload`,
                            })
                          }
                        }

                        refreshGiftsData()
                      }}
                      user={{
                        id: user?.id || '',
                        name: user?.name || '',
                        email: user?.email || '',
                        role: user?.role || '',
                        permissions: user?.permissions || {},
                      }}
                    />
                  </KAMAndAdminActionWithPermission>
                )}

                {/* Bulk Update Button - Only show for processing, kam-proof, and audit tabs */}
                {['processing', 'kam-proof', 'audit'].includes(activeTab) && (
                  <RoleBasedActionPermission
                    allowedRoles={activeTab === 'processing' ? ['MKTOPS', 'MANAGER', 'ADMIN'] : activeTab === 'kam-proof' ? ['KAM', 'ADMIN'] : ['AUDIT', 'ADMIN']}
                    permission="EDIT"
                    module="gift-approval"
                    alwaysShow={true}
                    disabledFallback={
                      <Button size="sm" variant="outline" disabled className="opacity-50 cursor-not-allowed" title="Insufficient permissions for bulk update">
                        <Edit className="h-4 w-4 mr-2" />
                        Bulk Update
                      </Button>
                    }
                  >
                    <BulkUpdateDialog
                      module="gift-approval"
                      tab={activeTab}
                      trigger={
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4 mr-2" />
                          Bulk Update
                        </Button>
                      }
                      onUpdateComplete={(data) => {
                        console.log('Bulk update completed:', data)
                        refreshGiftsData()
                      }}
                      user={{
                        id: user?.id || '',
                        name: user?.name || '',
                        email: user?.email || '',
                        role: user?.role || '',
                        permissions: user?.permissions || {},
                      }}
                    />
                  </RoleBasedActionPermission>
                )}
              </div>

              {/* Enhanced Bulk Actions with Tab-Specific Actions */}
              {Object.keys(rowSelection).length > 0 && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200 transition-all duration-300 ease-in-out animate-in slide-in-from-top-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        <Users className="h-3 w-3 mr-1" />
                        {Object.keys(rowSelection).length} gift(s) selected
                      </Badge>
                      <span className="text-xs text-blue-600">Tab: {activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace('-', ' ')}</span>
                    </div>
                    <div className="flex items-center space-x-2 flex-wrap">
                      {/* PENDING TAB ACTIONS */}
                      {activeTab === 'pending' && (
                        <>
                          <ManagerAndAboveActionWithPermission
                            module="gift-approval"
                            permission="EDIT"
                            disabledFallback={
                              <Button size="sm" variant="outline" disabled className="bg-gray-400 text-white opacity-50 cursor-not-allowed" title="Manager role and EDIT permission required">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve to Processing ({Object.keys(rowSelection).length})
                              </Button>
                            }
                          >
                            <Button size="sm" variant="outline" onClick={handleBulkApproveToProcessing} className="bg-green-600 text-white hover:bg-green-700" disabled={isBulkActioning} title="Approve selected gifts and move to MKTOps Processing stage">
                              {isBulkActioning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                              Approve to Processing ({Object.keys(rowSelection).length})
                            </Button>
                          </ManagerAndAboveActionWithPermission>

                          <ManagerAndAboveActionWithPermission
                            module="gift-approval"
                            permission="EDIT"
                            disabledFallback={
                              <Button size="sm" variant="outline" disabled className="bg-gray-400 text-white opacity-50 cursor-not-allowed" title="Manager role and EDIT permission required">
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject with Reason ({Object.keys(rowSelection).length})
                              </Button>
                            }
                          >
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline" className="bg-red-600 text-white hover:bg-red-700" disabled={isBulkActioning} title="Reject selected gifts with reason">
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Reject with Reason ({Object.keys(rowSelection).length})
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md">
                                <DialogHeader>
                                  <DialogTitle className="flex items-center gap-2">
                                    <XCircle className="h-5 w-5 text-red-600" />
                                    Reject Selected Gifts
                                  </DialogTitle>
                                  <DialogDescription>Please provide a reason for rejecting these {Object.keys(rowSelection).length} gift request(s). This reason will be applied to all selected gifts.</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor="bulkRejectReason">
                                      Rejection Reason <span className="text-red-500">*</span>
                                    </Label>
                                    <Textarea id="bulkRejectReason" placeholder="Enter the reason for rejection..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} className="mt-1" />
                                  </div>
                                  <div className="flex justify-end space-x-2">
                                    <DialogTrigger asChild>
                                      <Button variant="outline">Cancel</Button>
                                    </DialogTrigger>
                                    <Button
                                      onClick={() => {
                                        if (rejectReason.trim()) {
                                          handleBulkRejectWithReason(rejectReason.trim())
                                          setRejectReason('')
                                        }
                                      }}
                                      disabled={!rejectReason.trim() || isBulkActioning}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      {isBulkActioning ? (
                                        <>
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                          Rejecting...
                                        </>
                                      ) : (
                                        <>
                                          <XCircle className="h-4 w-4 mr-2" />
                                          Reject {Object.keys(rowSelection).length} Gift(s)
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </ManagerAndAboveActionWithPermission>
                        </>
                      )}

                      {/* PROCESSING TAB ACTIONS */}
                      {activeTab === 'processing' && (
                        <>
                          <RoleBasedActionPermission
                            allowedRoles={['MKTOPS', 'MANAGER', 'ADMIN']}
                            permission="EDIT"
                            module="gift-approval"
                            alwaysShow={true}
                            disabledFallback={
                              <Button size="sm" variant="outline" disabled className="bg-gray-400 text-white opacity-50 cursor-not-allowed" title="MKTOps/Manager role and EDIT permission required">
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject with Reason ({Object.keys(rowSelection).length})
                              </Button>
                            }
                          >
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline" className="bg-red-600 text-white hover:bg-red-700" disabled={isBulkActioning} title="Reject selected gifts with reason">
                                  {isBulkActioning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                                  Reject with Reason ({Object.keys(rowSelection).length})
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Bulk Reject from Processing</DialogTitle>
                                  <DialogDescription>Provide a reason for rejecting {Object.keys(rowSelection).length} selected gift(s)</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor="bulkProcessingRejectReason">
                                      Rejection Reason <span className="text-red-500">*</span>
                                    </Label>
                                    <Textarea id="bulkProcessingRejectReason" placeholder="Enter reason for rejection..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="min-h-[100px]" />
                                  </div>
                                  <div className="flex justify-end space-x-2">
                                    <Button variant="outline" onClick={() => setRejectReason('')}>
                                      Cancel
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      onClick={() => {
                                        handleBulkRejectFromProcessing(rejectReason.trim())
                                      }}
                                      disabled={!rejectReason.trim() || isBulkActioning}
                                    >
                                      {isBulkActioning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                                      Reject Gifts
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </RoleBasedActionPermission>

                          <RoleBasedActionPermission
                            allowedRoles={['MKTOPS', 'MANAGER', 'ADMIN']}
                            permission="EDIT"
                            module="gift-approval"
                            alwaysShow={true}
                            disabledFallback={
                              <Button size="sm" variant="outline" disabled className="bg-gray-400 text-white opacity-50 cursor-not-allowed" title="MKTOps/Manager role and EDIT permission required">
                                <Upload className="h-4 w-4 mr-2" />
                                Set BO Uploaded ({Object.keys(rowSelection).length})
                              </Button>
                            }
                          >
                            <Button size="sm" variant="outline" onClick={handleBulkSetBOUploaded} className="bg-blue-600 text-white hover:bg-blue-700" disabled={isBulkActioning} title="Mark all selected gifts as BO uploaded">
                              {isBulkActioning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                              Set BO Uploaded ({Object.keys(rowSelection).length})
                            </Button>
                          </RoleBasedActionPermission>

                          <RoleBasedActionPermission
                            allowedRoles={['MKTOPS', 'MANAGER', 'ADMIN']}
                            permission="EDIT"
                            module="gift-approval"
                            alwaysShow={true}
                            disabledFallback={
                              <Button size="sm" variant="outline" disabled className="bg-gray-400 text-white opacity-50 cursor-not-allowed" title="MKTOps/Manager role and EDIT permission required">
                                <ArrowRight className="h-4 w-4 mr-2" />
                                Proceed to KAM Proof ({Object.keys(rowSelection).length})
                              </Button>
                            }
                          >
                            <Button size="sm" variant="outline" onClick={handleBulkProceedToKAMProof} className="bg-purple-600 text-white hover:bg-purple-700" disabled={isBulkActioning} title="Move all selected gifts to KAM Proof stage (validates required fields)">
                              {isBulkActioning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                              Proceed to KAM Proof ({Object.keys(rowSelection).length})
                            </Button>
                          </RoleBasedActionPermission>
                        </>
                      )}

                      {/* KAM PROOF TAB ACTIONS */}
                      {activeTab === 'kam-proof' && (
                        <>
                          <RoleBasedActionPermission
                            allowedRoles={['KAM', 'ADMIN']}
                            permission="EDIT"
                            module="gift-approval"
                            alwaysShow={true}
                            disabledFallback={
                              <Button size="sm" variant="outline" disabled className="bg-gray-400 text-white opacity-50 cursor-not-allowed" title="KAM role and EDIT permission required">
                                <FileText className="h-4 w-4 mr-2" />
                                Fill Feedback ({Object.keys(rowSelection).length})
                              </Button>
                            }
                          >
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline" className="bg-orange-600 text-white hover:bg-orange-700" disabled={isBulkActioning} title="Add receiver feedback to selected gifts">
                                  <FileText className="h-4 w-4 mr-2" />
                                  Fill Feedback ({Object.keys(rowSelection).length})
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md">
                                <DialogHeader>
                                  <DialogTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-orange-600" />
                                    Fill Receiver Feedback
                                  </DialogTitle>
                                  <DialogDescription>Add feedback for all {Object.keys(rowSelection).length} selected gift(s). Choose whether to save feedback only or proceed to audit.</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor="bulkFeedback">
                                      Receiver Feedback <span className="text-red-500">*</span>
                                    </Label>
                                    <Textarea id="bulkFeedback" placeholder="Enter feedback about the gift delivery..." value={kamProofForm.giftFeedback} onChange={(e) => setKAMProofForm((prev) => ({ ...prev, giftFeedback: e.target.value }))} rows={3} className="mt-1" />
                                  </div>
                                  <div className="flex justify-end space-x-2">
                                    <DialogTrigger asChild>
                                      <Button variant="outline">Cancel</Button>
                                    </DialogTrigger>
                                    <Button
                                      onClick={() => {
                                        if (kamProofForm.giftFeedback.trim()) {
                                          handleBulkFillFeedback(kamProofForm.giftFeedback.trim(), false)
                                          setKAMProofForm((prev) => ({ ...prev, giftFeedback: '' }))
                                        }
                                      }}
                                      disabled={!kamProofForm.giftFeedback.trim() || isBulkActioning}
                                      className="bg-orange-600 hover:bg-orange-700"
                                    >
                                      {isBulkActioning ? (
                                        <>
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                          Saving...
                                        </>
                                      ) : (
                                        <>
                                          <FileText className="h-4 w-4 mr-2" />
                                          Save Feedback Only
                                        </>
                                      )}
                                    </Button>
                                    <Button
                                      onClick={() => {
                                        if (kamProofForm.giftFeedback.trim()) {
                                          handleBulkFillFeedback(kamProofForm.giftFeedback.trim(), true)
                                          setKAMProofForm((prev) => ({ ...prev, giftFeedback: '' }))
                                        }
                                      }}
                                      disabled={!kamProofForm.giftFeedback.trim() || isBulkActioning}
                                      className="bg-indigo-600 hover:bg-indigo-700"
                                    >
                                      {isBulkActioning ? (
                                        <>
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                          Processing...
                                        </>
                                      ) : (
                                        <>
                                          <ArrowRight className="h-4 w-4 mr-2" />
                                          Proceed to Audit
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </RoleBasedActionPermission>

                          <RoleBasedActionPermission
                            allowedRoles={['KAM', 'ADMIN']}
                            permission="EDIT"
                            module="gift-approval"
                            alwaysShow={true}
                            disabledFallback={
                              <Button size="sm" variant="outline" disabled className="bg-gray-400 text-white opacity-50 cursor-not-allowed" title="KAM role and EDIT permission required">
                                <ArrowRight className="h-4 w-4 mr-2" />
                                Proceed to Audit ({Object.keys(rowSelection).length})
                              </Button>
                            }
                          >
                            <Button size="sm" variant="outline" onClick={handleBulkProceedToAudit} className="bg-purple-600 text-white hover:bg-purple-700" disabled={isBulkActioning} title="Move selected gifts to audit stage (validates feedback exists)">
                              {isBulkActioning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                              Proceed to Audit ({Object.keys(rowSelection).length})
                            </Button>
                          </RoleBasedActionPermission>
                        </>
                      )}

                      {/* AUDIT TAB ACTIONS */}
                      {activeTab === 'audit' && (
                        <>
                          <RoleBasedActionPermission
                            allowedRoles={['AUDIT', 'ADMIN']}
                            permission="EDIT"
                            module="gift-approval"
                            alwaysShow={true}
                            disabledFallback={
                              <Button size="sm" variant="outline" disabled className="bg-gray-400 text-white opacity-50 cursor-not-allowed" title="Audit role and EDIT permission required">
                                <ClipboardCheck className="h-4 w-4 mr-2" />
                                Mark as Completed ({Object.keys(rowSelection).length})
                              </Button>
                            }
                          >
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline" className="bg-green-600 text-white hover:bg-green-700" disabled={isBulkActioning} title="Mark all selected gifts as completed">
                                  <ClipboardCheck className="h-4 w-4 mr-2" />
                                  Mark as Completed ({Object.keys(rowSelection).length})
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md">
                                <DialogHeader>
                                  <DialogTitle className="flex items-center gap-2">
                                    <ClipboardCheck className="h-5 w-5 text-green-600" />
                                    Mark as Completed
                                  </DialogTitle>
                                  <DialogDescription>Mark all {Object.keys(rowSelection).length} selected gift(s) as completed. This will finalize the gift delivery process.</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor="checkerName">Checker Name</Label>
                                    <Input id="checkerName" value={user?.name || user?.email || 'Unknown'} disabled className="bg-gray-50 cursor-not-allowed" />
                                  </div>
                                  <div>
                                    <Label htmlFor="completionRemark">Audit Remark (Optional)</Label>
                                    <Textarea id="completionRemark" placeholder="Enter completion remarks..." value={auditRemark} onChange={(e) => setAuditRemark(e.target.value)} rows={3} className="mt-1" />
                                  </div>
                                  <div className="flex justify-end space-x-2">
                                    <DialogTrigger asChild>
                                      <Button variant="outline">Cancel</Button>
                                    </DialogTrigger>
                                    <Button
                                      onClick={() => {
                                        handleBulkMarkCompleted(auditRemark.trim() || undefined)
                                        setAuditRemark('')
                                      }}
                                      disabled={isBulkActioning}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      {isBulkActioning ? (
                                        <>
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                          Completing...
                                        </>
                                      ) : (
                                        <>
                                          <ClipboardCheck className="h-4 w-4 mr-2" />
                                          Complete {Object.keys(rowSelection).length} Gift(s)
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </RoleBasedActionPermission>

                          <RoleBasedActionPermission
                            allowedRoles={['AUDIT', 'ADMIN']}
                            permission="EDIT"
                            module="gift-approval"
                            alwaysShow={true}
                            disabledFallback={
                              <Button size="sm" variant="outline" disabled className="bg-gray-400 text-white opacity-50 cursor-not-allowed" title="Audit role and EDIT permission required">
                                <AlertCircle className="h-4 w-4 mr-2" />
                                Mark as Issue ({Object.keys(rowSelection).length})
                              </Button>
                            }
                          >
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline" className="bg-orange-600 text-white hover:bg-orange-700" disabled={isBulkActioning} title="Mark all selected gifts as having issues">
                                  <AlertCircle className="h-4 w-4 mr-2" />
                                  Mark as Issue ({Object.keys(rowSelection).length})
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md">
                                <DialogHeader>
                                  <DialogTitle className="flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5 text-orange-600" />
                                    Mark as Issue
                                  </DialogTitle>
                                  <DialogDescription>Mark all {Object.keys(rowSelection).length} selected gift(s) as having issues and return them to KAM Proof stage for review.</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor="checkerNameIssue">Checker Name</Label>
                                    <Input id="checkerNameIssue" value={user?.name || user?.email || 'Unknown'} disabled className="bg-gray-50 cursor-not-allowed" />
                                  </div>
                                  <div>
                                    <Label htmlFor="issueRemark">Issue Details *</Label>
                                    <Textarea id="issueRemark" placeholder="Enter details about the issue..." value={auditRemark} onChange={(e) => setAuditRemark(e.target.value)} rows={3} className="mt-1" />
                                  </div>
                                  <div className="flex justify-end space-x-2">
                                    <DialogTrigger asChild>
                                      <Button variant="outline">Cancel</Button>
                                    </DialogTrigger>
                                    <Button
                                      onClick={() => {
                                        if (auditRemark.trim()) {
                                          handleBulkMarkAsIssue(auditRemark.trim())
                                          setAuditRemark('')
                                        }
                                      }}
                                      disabled={!auditRemark.trim() || isBulkActioning}
                                      className="bg-orange-600 hover:bg-orange-700"
                                    >
                                      {isBulkActioning ? (
                                        <>
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                          Processing...
                                        </>
                                      ) : (
                                        <>
                                          <AlertCircle className="h-4 w-4 mr-2" />
                                          Mark as Issue {Object.keys(rowSelection).length} Gift(s)
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </RoleBasedActionPermission>
                        </>
                      )}

                      {/* EXPORT ACTION - Available for all tabs */}
                      <ManagerAndAboveActionWithPermission
                        module="gift-approval"
                        permission="EXPORT"
                        disabledFallback={
                          <Button size="sm" variant="outline" disabled className="bg-gray-400 text-white opacity-50 cursor-not-allowed" title="Manager role and EXPORT permission required">
                            <FileText className="h-4 w-4 mr-2" />
                            Export ({Object.keys(rowSelection).length})
                          </Button>
                        }
                      >
                        <Button size="sm" variant="outline" onClick={handleBulkExport} className="bg-purple-600 text-white hover:bg-purple-700">
                          <FileText className="h-4 w-4 mr-2" />
                          Export ({Object.keys(rowSelection).length})
                        </Button>
                      </ManagerAndAboveActionWithPermission>
                    </div>
                  </div>
                </div>
              )}

              <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-8">
                <div id="gift-tabs-section" className="scroll-mt-8">
                  <TabsList className="flex w-full justify-between mb-8 bg-gray-50 p-1 rounded-lg">
                    <TabsTrigger value="all" className="relative cursor-pointer flex-1 mx-1 px-4 py-2 rounded-md transition-all duration-200 hover:bg-white hover:shadow-sm">
                      <span className="font-medium">All</span>
                      <Badge variant="secondary" className="ml-2 text-xs bg-gray-200 text-gray-700">
                        {tabCounts.all}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="pending" className="relative cursor-pointer flex-1 mx-1 px-4 py-2 rounded-md transition-all duration-200 hover:bg-white hover:shadow-sm">
                      <span className="font-medium">Pending</span>
                      <Badge variant="secondary" className="ml-2 text-xs bg-yellow-100 text-yellow-800">
                        {tabCounts.pending}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="rejected" className="relative cursor-pointer flex-1 mx-1 px-4 py-2 rounded-md transition-all duration-200 hover:bg-white hover:shadow-sm">
                      <span className="font-medium">Rejected</span>
                      <Badge variant="secondary" className="ml-2 text-xs bg-red-100 text-red-800">
                        {tabCounts.rejected}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="processing" className="relative cursor-pointer flex-1 mx-1 px-4 py-2 rounded-md transition-all duration-200 hover:bg-white hover:shadow-sm">
                      <span className="font-medium">Processing</span>
                      <Badge variant="secondary" className="ml-2 text-xs bg-purple-100 text-purple-800">
                        {tabCounts.processing}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="kam-proof" className="relative cursor-pointer flex-1 mx-1 px-4 py-2 rounded-md transition-all duration-200 hover:bg-white hover:shadow-sm">
                      <span className="font-medium">KAM Proof</span>
                      <Badge variant="secondary" className="ml-2 text-xs bg-orange-100 text-orange-800">
                        {tabCounts.kamProof}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="audit" className="relative cursor-pointer flex-1 mx-1 px-4 py-2 rounded-md transition-all duration-200 hover:bg-white hover:shadow-sm">
                      <span className="font-medium">Audit</span>
                      <Badge variant="secondary" className="ml-2 text-xs bg-indigo-100 text-indigo-800">
                        {tabCounts.audit}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="completed" className="relative cursor-pointer flex-1 mx-1 px-4 py-2 rounded-md transition-all duration-200 hover:bg-white hover:shadow-sm">
                      <span className="font-medium">Completed</span>
                      <Badge variant="secondary" className="ml-2 text-xs bg-emerald-100 text-emerald-800">
                        {tabCounts.completed}
                      </Badge>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="all">{apiLoading ? <DataTableSkeleton /> : <DataTable columns={columns} data={getPaginatedGifts('all')} />}</TabsContent>

                  <TabsContent value="pending">{apiLoading ? <DataTableSkeleton /> : <DataTable columns={columns} data={getPaginatedGifts('pending')} />}</TabsContent>

                  <TabsContent value="rejected">{apiLoading ? <DataTableSkeleton /> : <DataTable columns={columns} data={getPaginatedGifts('rejected')} />}</TabsContent>

                  <TabsContent value="processing">{apiLoading ? <DataTableSkeleton /> : <DataTable columns={columns} data={getPaginatedGifts('processing')} />}</TabsContent>

                  <TabsContent value="kam-proof">{apiLoading ? <DataTableSkeleton /> : <DataTable columns={columns} data={getPaginatedGifts('kam-proof')} />}</TabsContent>

                  <TabsContent value="audit">{apiLoading ? <DataTableSkeleton /> : <DataTable columns={columns} data={getPaginatedGifts('audit')} />}</TabsContent>

                  <TabsContent value="completed">{apiLoading ? <DataTableSkeleton /> : <DataTable columns={columns} data={getPaginatedGifts('completed')} />}</TabsContent>
                </div>

                {/* Pagination Controls */}
                {!apiLoading && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center space-x-4">
                      <div className="text-sm text-gray-600">
                        Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, getFilteredGifts(activeTab).length)} of {getFilteredGifts(activeTab).length} results
                      </div>

                      {/* Page Size Dropdown */}
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="pageSize" className="text-sm text-gray-600">
                          Rows per page:
                        </Label>
                        <Select value={pagination.limit.toString()} onValueChange={(value) => handlePageSizeChange(parseInt(value))}>
                          <SelectTrigger className="w-20 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                            <SelectItem value="250">250</SelectItem>
                            <SelectItem value="500">500</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Pagination Navigation - Only show if there are multiple pages */}
                    {pagination.totalPages > 1 && (
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1}>
                          Previous
                        </Button>
                        <span className="text-sm">
                          Page {pagination.page} of {pagination.totalPages}
                        </span>
                        <Button variant="outline" size="sm" onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}>
                          Next
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reject Gift Modal */}
      <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Gift Request</DialogTitle>
            <DialogDescription>Please provide a reason for rejecting this gift request.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejectReason">Rejection Reason</Label>
              <Textarea id="rejectReason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Enter the reason for rejection..." rows={4} />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsRejectModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (rejectingGiftId) {
                    // Check if the gift is in processing tab or pending tab
                    const gift = gifts.find((g) => g.giftId === rejectingGiftId)
                    if (gift?.workflowStatus === 'MKTOps_Processing') {
                      handleRejectFromProcessing(rejectingGiftId, rejectReason)
                    } else {
                      handleRejectGift(rejectingGiftId, rejectReason)
                    }
                  }
                }}
                disabled={!rejectReason.trim() || isRejectingGift === rejectingGiftId}
                className="bg-red-600 hover:bg-red-700"
              >
                {isRejectingGift === rejectingGiftId ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  'Reject Gift'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MKTOps Update Modal */}
      <Dialog open={isMKTOpsModalOpen} onOpenChange={setIsMKTOpsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update MKTOps Information</DialogTitle>
            <DialogDescription>Update shipping and tracking information for this gift.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="dispatcher">
                Courier/Dispatcher <span className="text-red-500">*</span>
              </Label>
              <Input id="dispatcher" value={mkTOpsForm.dispatcher} onChange={(e) => setMKTOpsForm((prev) => ({ ...prev, dispatcher: e.target.value }))} placeholder="Enter courier name..." />
            </div>
            <div>
              <Label htmlFor="trackingCode">
                Tracking Code <span className="text-red-500">*</span>
              </Label>
              <Input id="trackingCode" value={mkTOpsForm.trackingCode} onChange={(e) => setMKTOpsForm((prev) => ({ ...prev, trackingCode: e.target.value }))} placeholder="Enter tracking code..." />
            </div>
            <div>
              <Label htmlFor="trackingStatus">Tracking Status</Label>
              <Select value={mkTOpsForm.trackingStatus} onValueChange={(value) => setMKTOpsForm((prev) => ({ ...prev, trackingStatus: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="In Transit">In Transit</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                  <SelectItem value="Failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="mktOpsProof">MKTOps Proof (Image)</Label>

              {/* Show existing image if available */}
              {mkTOpsForm.existingMktProofUrl && !mkTOpsForm.mktOpsProof && (
                <div className="mb-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <p className="text-sm text-gray-600 mb-2">Previously uploaded image:</p>
                  <div className="relative">
                    <img src={mkTOpsForm.existingMktProofUrl} alt="Existing MKTOps proof" className="max-w-full h-auto max-h-32 rounded border" />
                    {/* Download button */}
                    {selectedGift?.mktProof && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute top-2 right-2 bg-white/90 hover:bg-white"
                        onClick={() => {
                          const downloadUrl = getImageDownloadUrl(selectedGift.mktProof)
                          if (downloadUrl) {
                            window.open(downloadUrl, '_blank')
                          }
                        }}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Upload a new image to replace this one</p>
                </div>
              )}

              <FileUploader
                acceptedTypes="image/*"
                maxSize={20 * 1024 * 1024} // 20MB
                onFileSelect={(file) => setMKTOpsForm((prev) => ({ ...prev, mktOpsProof: file }))}
                placeholder="Upload MKTOps proof image (receipt, invoice, etc.) - Max 20MB"
                className="mt-1"
              />
              {mkTOpsForm.mktOpsProof && <div className="mt-2 text-sm text-green-600">✓ {mkTOpsForm.mktOpsProof.name} selected</div>}
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsMKTOpsModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => mkTOpsGiftId && handleMKTOpsUpdate(mkTOpsGiftId, mkTOpsForm.dispatcher, mkTOpsForm.trackingCode, mkTOpsForm.trackingStatus, mkTOpsForm.mktOpsProof)} disabled={!mkTOpsForm.dispatcher.trim() || !mkTOpsForm.trackingCode.trim() || isUpdatingMKTOps === mkTOpsGiftId} className="bg-blue-600 hover:bg-blue-700">
                {isUpdatingMKTOps === mkTOpsGiftId ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update MKTOps Info'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* KAM Proof Modal */}
      <Dialog open={isKAMProofModalOpen} onOpenChange={setIsKAMProofModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit KAM Proof</DialogTitle>
            <DialogDescription>Upload delivery proof and provide feedback for this gift.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="kamProof">KAM Proof (Image)</Label>

              {/* Show existing image if available */}
              {kamProofForm.existingKamProofUrl && !kamProofForm.kamProof && (
                <div className="mb-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <p className="text-sm text-gray-600 mb-2">Previously uploaded image:</p>
                  <div className="relative">
                    <img src={kamProofForm.existingKamProofUrl} alt="Existing KAM proof" className="max-w-full h-auto max-h-32 rounded border" />
                    {/* Download button */}
                    {selectedGift?.kamProof && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute top-2 right-2 bg-white/90 hover:bg-white"
                        onClick={() => {
                          const downloadUrl = getImageDownloadUrl(selectedGift.kamProof)
                          if (downloadUrl) {
                            window.open(downloadUrl, '_blank')
                          }
                        }}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Upload a new image to replace this one</p>
                </div>
              )}

              <FileUploader
                acceptedTypes="image/*"
                maxSize={20 * 1024 * 1024} // 20MB
                onFileSelect={(file) => setKAMProofForm((prev) => ({ ...prev, kamProof: file }))}
                placeholder="Upload delivery proof image (delivery photo, signature, etc.) - Max 20MB"
                className="mt-1"
              />
              {kamProofForm.kamProof && typeof kamProofForm.kamProof === 'object' && <div className="mt-2 text-sm text-green-600">✓ {kamProofForm.kamProof.name} selected</div>}
            </div>
            <div>
              <Label htmlFor="giftFeedback">Gift Feedback</Label>
              <Textarea id="giftFeedback" value={kamProofForm.giftFeedback} onChange={(e) => setKAMProofForm((prev) => ({ ...prev, giftFeedback: e.target.value }))} placeholder="Enter feedback about the gift delivery..." rows={3} />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsKAMProofModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => kamProofGiftId && handleSubmitKAMProof(kamProofGiftId, kamProofForm.kamProof, kamProofForm.giftFeedback)} disabled={!kamProofForm.giftFeedback.trim() || isSubmittingKAMProof === kamProofGiftId} className="bg-orange-600 hover:bg-orange-700">
                {isSubmittingKAMProof === kamProofGiftId ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit KAM Proof'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Audit Modal */}
      <Dialog open={isAuditModalOpen} onOpenChange={setIsAuditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Audit Gift Request
            </DialogTitle>
            <DialogDescription>Review and complete audit for {selectedGift?.fullName}'s gift request</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Gift Details Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">Gift Request Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Player:</span> {selectedGift?.fullName} ({selectedGift?.memberLogin})
                </div>
                <div>
                  <span className="text-gray-600">Gift:</span> {selectedGift?.giftItem}
                </div>
                <div>
                  <span className="text-gray-600">Value:</span> {selectedGift?.costMyr ? formatMoney(selectedGift.costMyr, { currency: selectedGift.currency || 'MYR' }) : 'N/A'}
                </div>
                <div>
                  <span className="text-gray-600">Category:</span> {selectedGift?.category}
                </div>
                <div>
                  <span className="text-gray-600">KAM:</span> {selectedGift?.kamRequestedBy}
                  {selectedGift?.kamEmail && <div className="text-xs text-gray-500">({selectedGift.kamEmail})</div>}
                </div>
                <div>
                  <span className="text-gray-600">Request Date:</span> {selectedGift?.createdDate ? selectedGift.createdDate.toLocaleDateString() : 'N/A'}
                </div>
                <div>
                  <span className="text-gray-600">Merchant:</span> {selectedGift?.merchantName || 'N/A'}
                </div>
                <div>
                  <span className="text-gray-600">Manager:</span> {selectedGift?.approvalReviewedBy || 'N/A'}
                  {selectedGift?.managerEmail && <div className="text-xs text-gray-500">({selectedGift.managerEmail})</div>}
                </div>
              </div>
            </div>

            {/* KAM Proof Summary */}
            {selectedGift?.kamProof && (
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900 mb-3">Delivery Proof</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-green-600">Proof File:</span> {selectedGift.kamProof}
                  </div>
                  <div>
                    <span className="text-green-600">Receiver Feedback:</span> {selectedGift.giftFeedback || 'No feedback provided'}
                  </div>
                  <div>
                    <span className="text-green-600">Uploaded By:</span> {selectedGift.kamProofBy || 'Unknown'}
                    {selectedGift.kamProofEmail && <div className="text-xs text-green-500">({selectedGift.kamProofEmail})</div>}
                  </div>
                  <div>
                    <span className="text-green-600">Date:</span> {selectedGift.lastModifiedDate ? selectedGift.lastModifiedDate.toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              </div>
            )}

            {/* MKTOps Summary */}
            {selectedGift?.dispatcher && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-3">Shipping Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-600">Dispatcher:</span> {selectedGift.dispatcher}
                  </div>
                  <div>
                    <span className="text-blue-600">Tracking Code:</span> {selectedGift.trackingCode || 'N/A'}
                  </div>
                  <div>
                    <span className="text-blue-600">Status:</span> {selectedGift.trackingStatus || 'N/A'}
                  </div>
                  <div>
                    <span className="text-blue-600">BO Uploaded:</span> {selectedGift.uploadedBo ? 'Yes' : 'No'}
                  </div>
                  <div>
                    <span className="text-blue-600">MKTOps:</span> {selectedGift.purchasedBy || 'N/A'}
                    {selectedGift.mktOpsEmail && <div className="text-xs text-blue-500">({selectedGift.mktOpsEmail})</div>}
                  </div>
                  <div>
                    <span className="text-blue-600">Purchase Date:</span> {selectedGift.mktPurchaseDate ? selectedGift.mktPurchaseDate.toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              </div>
            )}

            {/* Audit Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="auditCheckerName" className="text-sm font-medium">
                  Checker Name <span className="text-red-500">*</span>
                </Label>
                <Input id="auditCheckerName" value={auditCheckerName} readOnly className="bg-gray-50" />
                <p className="text-xs text-gray-500">Auto-filled from logged-in user</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="auditRemark" className="text-sm font-medium">
                  Audit Remark
                </Label>
                <Textarea id="auditRemark" placeholder="Enter any audit remarks or observations..." value={auditRemark} onChange={(e) => setAuditRemark(e.target.value)} rows={4} />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsAuditModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => auditGiftId && handleSubmitAudit(auditGiftId, auditRemark, auditCheckerName, 'mark-issue')} disabled={!auditRemark.trim() || isSubmittingAudit === auditGiftId} className="bg-orange-600 hover:bg-orange-700">
                  {isSubmittingAudit === auditGiftId ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Mark as Issue'
                  )}
                </Button>
                <Button onClick={() => auditGiftId && handleSubmitAudit(auditGiftId, auditRemark, auditCheckerName, 'complete')} disabled={!auditRemark.trim() || isSubmittingAudit === auditGiftId} className="bg-indigo-600 hover:bg-indigo-700">
                  {isSubmittingAudit === auditGiftId ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Mark as Completed'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
