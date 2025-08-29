'use client'

import React, { useState, useCallback } from 'react'
import { useMemberProfiles, useMemberValidation } from '@/contexts/member-profile-context'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FileUploader } from '@/components/ui/file-uploader'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle, Download, Eye, Database } from 'lucide-react'
import Papa from 'papaparse'
import { giftRequestFormSchema, REWARD_NAME_OPTIONS, CATEGORY_OPTIONS } from '@/types/gift'

interface BulkUploadDialogProps {
  module: string
  tab: string
  trigger: React.ReactNode
  onUploadComplete?: (data: any) => void // Changed from any[] to any to support result object
  user?: {
    id: string
    name?: string
    email?: string
    role?: string
    permissions?: Record<string, string[]>
  } | null
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  data: any[]
  totalRows: number
  validRows: number
  invalidRows: number
}

interface UploadResult {
  success: boolean
  message: string
  importedCount: number
  failedCount: number
  batchId?: string
}

interface CorrectionSuggestion {
  rowNumber: number
  field: string
  currentValue: string
  suggestedValue: string
  reason: string
  memberOptions?: Array<{
    memberLogin: string
    memberName: string
    merchant: string
    currency: string
    memberId: number
  }>
}

interface CorrectedRow {
  rowNumber: number
  originalData: any
  correctedData: any
  suggestions: CorrectionSuggestion[]
}

export function BulkUploadDialog({ module, tab, trigger, onUploadComplete, user }: BulkUploadDialogProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Member profile hooks for validation
  const { memberProfiles, validateMemberLogins } = useMemberProfiles()
  const [isUploading, setIsUploading] = useState(false)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [activeTab, setActiveTab] = useState('upload')
  const [fileUploaderReset, setFileUploaderReset] = useState(false)

  // Correction feature state
  const [correctionSuggestions, setCorrectionSuggestions] = useState<CorrectionSuggestion[]>([])
  const [correctedRows, setCorrectedRows] = useState<CorrectedRow[]>([])
  const [showCorrectionDialog, setShowCorrectionDialog] = useState(false)
  const [originalCSVData, setOriginalCSVData] = useState<any[]>([])

  // Reset function to clear all state when dialog closes
  const resetDialog = () => {
    setValidationResult(null)
    setUploadResult(null)
    setActiveTab('upload')
    setIsUploading(false)
    setFileUploaderReset(true)
    setCorrectionSuggestions([])
    setCorrectedRows([])
    setShowCorrectionDialog(false)
    setOriginalCSVData([])

    // Reset the file uploader reset flag after a short delay
    setTimeout(() => {
      setFileUploaderReset(false)
    }, 100)
  }

  // Generate correction suggestions based on validation errors
  const generateCorrectionSuggestions = (csvData: any[], errors: string[]) => {
    const suggestions: CorrectionSuggestion[] = []
    const correctedRows: CorrectedRow[] = []

    // Parse errors to extract row numbers and field information
    errors.forEach(error => {
      const rowMatch = error.match(/Row (\d+):/)
      if (!rowMatch) return

      const rowNumber = parseInt(rowMatch[1])
      const rowIndex = rowNumber - 2 // Convert to 0-based index
      const rowData = csvData[rowIndex]

      if (!rowData) return

      // Handle member login not found
      if (error.includes('not found in member database')) {
        const memberLoginMatch = error.match(/Member login "([^"]+)"/)
        if (memberLoginMatch) {
          const memberLogin = memberLoginMatch[1]
          const similarMembers = memberProfiles.filter(member =>
            member.memberLogin.toLowerCase().includes(memberLogin.toLowerCase()) ||
            member.memberName.toLowerCase().includes(memberLogin.toLowerCase())
          )

          if (similarMembers.length > 0) {
            suggestions.push({
              rowNumber,
              field: 'memberLogin',
              currentValue: memberLogin,
              suggestedValue: similarMembers[0].memberLogin,
              reason: 'Member login not found. Similar members found.',
              memberOptions: similarMembers.map(member => ({
                memberLogin: member.memberLogin,
                memberName: member.memberName,
                merchant: member.merchantName || '',
                currency: member.currency || '',
                memberId: member.memberId
              }))
            })
          }
        }
      }

      // Handle merchant mismatch
      if (error.includes('does not exist within the selected merchant')) {
        const memberLoginMatch = error.match(/Member "([^"]+)"/)
        const csvMerchantMatch = error.match(/merchant "([^"]+)"/)
        const actualMerchantMatch = error.match(/belongs to merchant "([^"]+)"/)

        if (memberLoginMatch && csvMerchantMatch && actualMerchantMatch) {
          const memberLogin = memberLoginMatch[1]
          const csvMerchant = csvMerchantMatch[1]
          const actualMerchant = actualMerchantMatch[1]

          suggestions.push({
            rowNumber,
            field: 'merchant',
            currentValue: csvMerchant,
            suggestedValue: actualMerchant,
            reason: `Member "${memberLogin}" belongs to merchant "${actualMerchant}", not "${csvMerchant}"`
          })
        }
      }

      // Handle currency mismatch
      if (error.includes('currency mismatch')) {
        const memberLoginMatch = error.match(/Member "([^"]+)"/)
        const csvCurrencyMatch = error.match(/CSV shows "([^"]+)"/)
        const actualCurrencyMatch = error.match(/actual currency is "([^"]+)"/)

        if (memberLoginMatch && csvCurrencyMatch && actualCurrencyMatch) {
          const memberLogin = memberLoginMatch[1]
          const csvCurrency = csvCurrencyMatch[1]
          const actualCurrency = actualCurrencyMatch[1]

          suggestions.push({
            rowNumber,
            field: 'currency',
            currentValue: csvCurrency,
            suggestedValue: actualCurrency,
            reason: `Member "${memberLogin}" has currency "${actualCurrency}", not "${csvCurrency}"`
          })
        }
      }

      // Handle invalid category
      if (error.includes('Invalid category')) {
        const categoryMatch = error.match(/Invalid category "([^"]+)"/)
        if (categoryMatch) {
          const invalidCategory = categoryMatch[1]
          const normalizedCategory = CATEGORY_OPTIONS.find(option =>
            option.toLowerCase() === invalidCategory.toLowerCase()
          )

          if (normalizedCategory) {
            suggestions.push({
              rowNumber,
              field: 'category',
              currentValue: invalidCategory,
              suggestedValue: normalizedCategory,
              reason: 'Category case correction'
            })
          }
        }
      }

      // Handle invalid reward name
      if (error.includes('Invalid reward name')) {
        const rewardMatch = error.match(/Invalid reward name "([^"]+)"/)
        if (rewardMatch) {
          const invalidReward = rewardMatch[1]
          const normalizedReward = REWARD_NAME_OPTIONS.find(option =>
            option.toLowerCase() === invalidReward.toLowerCase()
          )

          if (normalizedReward) {
            suggestions.push({
              rowNumber,
              field: 'rewardName',
              currentValue: invalidReward,
              suggestedValue: normalizedReward,
              reason: 'Reward name case correction'
            })
          }
        }
      }
    })

    // Group suggestions by row
    const suggestionsByRow = suggestions.reduce((acc, suggestion) => {
      if (!acc[suggestion.rowNumber]) {
        acc[suggestion.rowNumber] = []
      }
      acc[suggestion.rowNumber].push(suggestion)
      return acc
    }, {} as Record<number, CorrectionSuggestion[]>)

    // Create corrected rows
    Object.entries(suggestionsByRow).forEach(([rowNumberStr, rowSuggestions]) => {
      const rowNumber = parseInt(rowNumberStr)
      const rowIndex = rowNumber - 2
      const originalData = csvData[rowIndex]
      const correctedData = { ...originalData }

      rowSuggestions.forEach(suggestion => {
        correctedData[suggestion.field] = suggestion.suggestedValue
      })

      correctedRows.push({
        rowNumber,
        originalData,
        correctedData,
        suggestions: rowSuggestions
      })
    })

    return { suggestions, correctedRows }
  }

  // Apply corrections to CSV data
  const applyCorrections = (csvData: any[], correctedRows: CorrectedRow[]) => {
    const correctedCSV = [...csvData]

    correctedRows.forEach(correctedRow => {
      const rowIndex = correctedRow.rowNumber - 2
      if (rowIndex >= 0 && rowIndex < correctedCSV.length) {
        correctedCSV[rowIndex] = correctedRow.correctedData
      }
    })

    return correctedCSV
  }

  // Download corrected CSV
  const downloadCorrectedCSV = (csvData: any[], filename: string) => {
    const csv = Papa.unparse(csvData)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // CSV validation rules based on module and tab
  const getValidationRules = () => {
    const rules: Record<string, Record<string, any>> = {
      'gift-approval': {
        pending: {
          requiredFields: ['merchant', 'memberLogin', 'currency', 'giftItem', 'category', 'giftCost', 'rewardName'],
          optionalFields: ['rewardClubOrder', 'description'],
          fieldTypes: {
            giftCost: 'number',
            category: CATEGORY_OPTIONS,
            rewardName: REWARD_NAME_OPTIONS,
          },
        },
        processing: {
          requiredFields: ['giftId', 'dispatcher', 'trackingCode', 'status'],
          fieldTypes: {
            status: ['In Transit', 'Delivered', 'Failed'],
          },
        },
        'kam-proof': {
          requiredFields: ['giftId', 'proofFile', 'receiverFeedback'],
          optionalFields: ['uploadedBy'],
        },
        audit: {
          requiredFields: ['giftId', 'checkerName', 'remark'],
          fieldTypes: {
            checkerName: 'string',
          },
        },
      },
    }
    return rules[module]?.[tab] || {}
  }

  // Get member data from memberLogin (using cached member profiles)
  const getMemberFromMemberLogin = (memberLogin: string) => {
    // Trim the memberLogin to handle whitespace
    const trimmedMemberLogin = memberLogin.trim()

    if (trimmedMemberLogin && trimmedMemberLogin.length > 0) {
      // Find member in cached profiles
      const member = memberProfiles.find((profile) => profile.memberLogin.toLowerCase() === trimmedMemberLogin.toLowerCase())

      if (member) {
        return {
          memberName: member.memberName,
          memberLogin: member.memberLogin,
          memberId: member.memberId,
        }
      }
    }

    return null
  }

  // Bulk validate member logins using cached member profiles
  const bulkValidateMemberLogins = async (memberLogins: string[]) => {
    try {
      console.log('🚀 Validating', memberLogins.length, 'member logins using cached profiles...')

      // Use the cached member profiles for validation
      const validation = validateMemberLogins(memberLogins)

      console.log('✅ Cache validation completed:', validation.valid.length, 'valid,', validation.invalid.length, 'invalid')

      return {
        valid: validation.validMembers.map((member) => ({
          memberLogin: member.memberLogin,
          memberName: member.memberName,
          memberId: member.memberId,
          currency: member.currency,
          merchant: member.merchantName, // Add merchant name from member profile (not merchant code)
          merchantName: member.merchantName, // Include for debugging
        })),
        invalid: validation.invalid,
      }
    } catch (error) {
      console.error('❌ Bulk validation error:', error)
      return null
    }
  }

  // Enhanced CSV validation with bulk member login validation
  const validateCSVWithBulkValidation = async (csvData: any[]): Promise<ValidationResult> => {
    const rules = getValidationRules()
    const errors: string[] = []
    const warnings: string[] = []
    const validData: any[] = []

    if (tab === 'pending') {
      // Step 1: Extract all member logins for bulk validation
      const memberLogins = csvData.map((row) => row.memberLogin?.toString().trim()).filter((login) => login && login.length > 0)

      // Step 2: Bulk validate member logins if we have any
      let validationMap: Map<string, any> = new Map()

      if (memberLogins.length > 0) {
        console.log(`🚀 Bulk validating ${memberLogins.length} member logins against member database...`)
        const startTime = Date.now()

        const bulkValidationResult = await bulkValidateMemberLogins(memberLogins)

        if (bulkValidationResult) {
          // Debug: Log the member data being retrieved
          console.log('🔍 Member data from bulk validation:', bulkValidationResult.valid.map(member => ({
            memberLogin: member.memberLogin,
            merchantCode: member.merchant,
            merchantName: member.merchantName,
            currency: member.currency
          })))

          // Create a map for fast lookup
          bulkValidationResult.valid.forEach((player: any) => {
            validationMap.set(player.memberLogin.toLowerCase(), {
              memberName: player.memberName,
              memberLogin: player.memberLogin,
              memberId: player.memberId,
              currency: player.currency,
              merchant: player.merchant, // Add merchant from member profile
            })
          })

          const endTime = Date.now()
          console.log(`✅ Member validation completed: ${bulkValidationResult.valid.length} valid, ${bulkValidationResult.invalid.length} invalid in ${endTime - startTime}ms`)

          if (bulkValidationResult.invalid.length > 0) {
            warnings.push(`⚠️ Found ${bulkValidationResult.invalid.length} invalid member logins that will be flagged during row validation`)
          }
        } else {
          // Fall back to individual validation
          console.log('❌ Bulk validation failed, falling back to individual validation')
          memberLogins.forEach((login) => {
            const member = getMemberFromMemberLogin(login)
            if (member) {
              validationMap.set(login.toLowerCase(), member)
            }
          })
        }
      }

      // Step 3: Validate each row using the validation map
      csvData.forEach((row, index) => {
        const rowNumber = index + 2 // +2 because index starts at 0 and we skip header
        let rowValid = true

        try {
          // Trim all string values first
          Object.keys(row).forEach((key) => {
            if (typeof row[key] === 'string') {
              row[key] = row[key].trim()
            }
          })

          // Validate memberLogin exists and get VIP player data
          if (!row.memberLogin || row.memberLogin.toString().trim() === '') {
            errors.push(`Row ${rowNumber}: Missing required field "memberLogin"`)
            rowValid = false
          } else {
            const trimmedLogin = row.memberLogin.toString().trim().toLowerCase()
            const memberData = validationMap.get(trimmedLogin)

            if (!memberData) {
              errors.push(`Row ${rowNumber}: Member login "${row.memberLogin.trim()}" not found in member database`)
              rowValid = false
            } else {
              // Validate giftItem is required
              if (!row.giftItem || row.giftItem.toString().trim() === '') {
                errors.push(`Row ${rowNumber}: Missing required field "giftItem"`)
                rowValid = false
              }

              // Validate category is required
              if (!row.category || row.category.toString().trim() === '') {
                errors.push(`Row ${rowNumber}: Missing required field "category"`)
                rowValid = false
              } else {
                const normalizedCategory = row.category.trim()
                const isValidCategory = CATEGORY_OPTIONS.some(option =>
                  option.toLowerCase() === normalizedCategory.toLowerCase()
                )
                if (!isValidCategory) {
                  errors.push(`Row ${rowNumber}: Invalid category "${normalizedCategory}". Expected one of: ${CATEGORY_OPTIONS.join(', ')}`)
                  rowValid = false
                }
              }

              // Validate rewardName is required
              if (!row.rewardName || row.rewardName.toString().trim() === '') {
                errors.push(`Row ${rowNumber}: Missing required field "rewardName"`)
                rowValid = false
              } else {
                const normalizedRewardName = row.rewardName.trim()
                const isValidRewardName = REWARD_NAME_OPTIONS.some(option =>
                  option.toLowerCase() === normalizedRewardName.toLowerCase()
                )
                if (!isValidRewardName) {
                  errors.push(`Row ${rowNumber}: Invalid reward name "${normalizedRewardName}". Expected one of: ${REWARD_NAME_OPTIONS.join(', ')}`)
                  rowValid = false
                }
              }

              // Validate merchant and currency fields
              if (!row.merchant || row.merchant.toString().trim() === '') {
                errors.push(`Row ${rowNumber}: Missing required field "merchant"`)
                rowValid = false
              }

              if (!row.currency || row.currency.toString().trim() === '') {
                errors.push(`Row ${rowNumber}: Missing required field "currency"`)
                rowValid = false
              }

              // Validate uploader has permission to access the selected merchant & currency
              if (user?.permissions) {
                const userMerchants = user.permissions['merchants'] || []
                const userCurrencies = user.permissions['currencies'] || []

                if (userMerchants.length > 0 && !userMerchants.includes(row.merchant.trim())) {
                  errors.push(`Row ${rowNumber}: Uploader does not have permission to access merchant "${row.merchant.trim()}"`)
                  rowValid = false
                }

                if (userCurrencies.length > 0 && !userCurrencies.includes(row.currency.trim())) {
                  errors.push(`Row ${rowNumber}: Uploader does not have permission to access currency "${row.currency.trim()}"`)
                  rowValid = false
                }
              }

              // Validate that the merchant and currency in CSV match the member's actual merchant and currency
              console.log(`Row ${rowNumber} - Merchant comparison:`, {
                csvMerchant: row.merchant.trim(),
                memberMerchant: memberData.merchant,
                match: memberData.merchant === row.merchant.trim()
              })

              if (memberData.merchant && memberData.merchant !== row.merchant.trim()) {
                errors.push(`Row ${rowNumber}: Member "${row.memberLogin.trim()}" does not exist within the selected merchant "${row.merchant.trim()}". Member belongs to merchant "${memberData.merchant}"`)
                rowValid = false
              }

              if (memberData.currency && memberData.currency !== row.currency.trim()) {
                errors.push(`Row ${rowNumber}: Member "${row.memberLogin.trim()}" currency mismatch. CSV shows "${row.currency.trim()}" but member's actual currency is "${memberData.currency}"`)
                rowValid = false
              }

              // Validate giftCost (required)
              const giftCost = row.giftCost ? parseFloat(row.giftCost) : null

              if (giftCost === null || isNaN(giftCost) || giftCost <= 0) {
                errors.push(`Row ${rowNumber}: giftCost is required and must be a positive number`)
                rowValid = false
              }

              if (rowValid) {
                // Use member's actual merchant and currency (strict validation - no fallbacks)
                const memberMerchant = memberData.merchant
                const memberCurrency = memberData.currency

                // Additional validation to ensure member data has valid merchant and currency
                if (!memberMerchant || memberMerchant.trim() === '') {
                  errors.push(`Row ${rowNumber}: Member "${row.memberLogin.trim()}" has no merchant information in the database`)
                  rowValid = false
                }

                if (!memberCurrency || memberCurrency.trim() === '') {
                  errors.push(`Row ${rowNumber}: Member "${row.memberLogin.trim()}" has no currency information in the database`)
                  rowValid = false
                }

                // Normalize category and rewardName to proper case
                const normalizedCategory = CATEGORY_OPTIONS.find(option =>
                  option.toLowerCase() === row.category.trim().toLowerCase()
                ) || row.category.trim()

                const normalizedRewardName = REWARD_NAME_OPTIONS.find(option =>
                  option.toLowerCase() === row.rewardName?.trim().toLowerCase()
                ) || row.rewardName?.trim() || ''

                // Transform CSV row to match Zod schema format with the member data
                const giftRequestData = {
                  merchant: memberMerchant, // Use member's actual merchant
                  memberName: memberData.memberName || row.memberLogin.trim(),
                  memberLogin: row.memberLogin.trim(),
                  memberId: memberData.memberId,
                  giftItem: row.giftItem.trim(),
                  rewardName: normalizedRewardName,
                  rewardClubOrder: row.rewardClubOrder?.trim() || '',
                  value: giftCost ? giftCost.toString() : '',
                  currency: memberCurrency, // Use member's actual currency
                  description: (row.description || row.remark)?.trim() || '', // Handle both 'description' and 'remark' fields
                  category: normalizedCategory,
                }

                // Debug: Log the data being passed to Zod schema
                console.log(`Row ${rowNumber} - giftRequestData:`, {
                  merchant: giftRequestData.merchant,
                  currency: giftRequestData.currency,
                  memberLogin: giftRequestData.memberLogin,
                  memberId: giftRequestData.memberId
                })

                // Validate using Zod schema
                const validatedData = giftRequestFormSchema.parse(giftRequestData)

                validData.push({
                  ...validatedData,
                  memberLogin: row.memberLogin.trim(),
                  memberId: memberData.memberId,
                  giftCost: giftCost,
                  currency: memberCurrency, // Use member's actual currency
                  merchant: memberMerchant, // Use member's actual merchant
                  remark: (row.description || row.remark)?.trim() || '', // Keep original description/remark for frontend display
                  description: (row.description || row.remark)?.trim() || '', // Use description for backend
                  _rowNumber: rowNumber,
                  _uploadDate: new Date().toISOString(),
                  _uploadedBy: user?.id!, // Keep ID for backend
                  _uploadedByName: user?.name || user?.email || user?.id || 'Unknown User', // Add name for frontend display
                })
              }
            }
          }
        } catch (zodError: any) {
          // Handle Zod validation errors
          if (zodError.issues) {
            zodError.issues.forEach((issue: any) => {
              const fieldName = issue.path.join('.')
              errors.push(`Row ${rowNumber}: ${issue.message} (field: ${fieldName})`)
            })
          } else {
            errors.push(`Row ${rowNumber}: Validation error - ${zodError.message}`)
          }
          rowValid = false
        }
      })
    } else {
      // Use existing validation for non-pending tabs
      return validateCSV(csvData)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      data: validData,
      totalRows: csvData.length,
      validRows: validData.length,
      invalidRows: csvData.length - validData.length,
    }
  }

  const validateCSV = useCallback(
    (csvData: any[]): ValidationResult => {
      const rules = getValidationRules()
      const errors: string[] = []
      const warnings: string[] = []
      const validData: any[] = []

      csvData.forEach((row, index) => {
        const rowNumber = index + 2 // +2 because index starts at 0 and we skip header
        let rowValid = true

        // Special validation for pending tab (gift requests)
        if (tab === 'pending') {
          try {
            // Trim all string values first
            Object.keys(row).forEach((key) => {
              if (typeof row[key] === 'string') {
                row[key] = row[key].trim()
              }
            })

            // First, validate memberLogin exists and get VIP player data
            if (!row.memberLogin || row.memberLogin.toString().trim() === '') {
              errors.push(`Row ${rowNumber}: Missing required field "memberLogin"`)
              rowValid = false
            } else {
              const member = getMemberFromMemberLogin(row.memberLogin)
              if (!member) {
                errors.push(`Row ${rowNumber}: Member login "${row.memberLogin.trim()}" not found in member database`)
                rowValid = false
              } else {
                // Validate giftItem is required
                if (!row.giftItem || row.giftItem.toString().trim() === '') {
                  errors.push(`Row ${rowNumber}: Missing required field "giftItem"`)
                  rowValid = false
                }

                // Validate category is required
                if (!row.category || row.category.toString().trim() === '') {
                  errors.push(`Row ${rowNumber}: Missing required field "category"`)
                  rowValid = false
                } else {
                  const normalizedCategory = row.category.trim()
                  const isValidCategory = CATEGORY_OPTIONS.some(option =>
                    option.toLowerCase() === normalizedCategory.toLowerCase()
                  )
                  if (!isValidCategory) {
                    errors.push(`Row ${rowNumber}: Invalid category "${normalizedCategory}". Expected one of: ${CATEGORY_OPTIONS.join(', ')}`)
                    rowValid = false
                  }
                }

                // Validate rewardName is required
                if (!row.rewardName || row.rewardName.toString().trim() === '') {
                  errors.push(`Row ${rowNumber}: Missing required field "rewardName"`)
                  rowValid = false
                } else {
                  const normalizedRewardName = row.rewardName.trim()
                  const isValidRewardName = REWARD_NAME_OPTIONS.some(option =>
                    option.toLowerCase() === normalizedRewardName.toLowerCase()
                  )
                  if (!isValidRewardName) {
                    errors.push(`Row ${rowNumber}: Invalid reward name "${normalizedRewardName}". Expected one of: ${REWARD_NAME_OPTIONS.join(', ')}`)
                    rowValid = false
                  }
                }

                // Validate giftCost (required)
                const giftCost = row.giftCost ? parseFloat(row.giftCost) : null

                if (giftCost === null || isNaN(giftCost) || giftCost <= 0) {
                  errors.push(`Row ${rowNumber}: giftCost is required and must be a positive number`)
                  rowValid = false
                }

                if (rowValid) {
                  // Normalize category and rewardName to proper case
                  const normalizedCategory = CATEGORY_OPTIONS.find(option =>
                    option.toLowerCase() === row.category.trim().toLowerCase()
                  ) || row.category.trim()

                  const normalizedRewardName = REWARD_NAME_OPTIONS.find(option =>
                    option.toLowerCase() === row.rewardName?.trim().toLowerCase()
                  ) || row.rewardName?.trim() || ''

                  // Transform CSV row to match Zod schema format with the member data
                  const giftRequestData = {
                    merchant: row.merchant?.trim() || 'Unknown', // Use CSV merchant
                    memberName: row.memberLogin.trim(), // Use memberLogin as memberName for now
                    memberLogin: row.memberLogin.trim(),
                    giftItem: row.giftItem.trim(),
                    rewardName: normalizedRewardName,
                    rewardClubOrder: row.rewardClubOrder?.trim() || '',
                    value: giftCost ? giftCost.toString() : '',
                    currency: row.currency?.trim() || 'MYR', // Use CSV currency
                    description: (row.description || row.remark)?.trim() || '', // Handle both 'description' and 'remark' fields
                    category: normalizedCategory,
                  }

                  // Validate using Zod schema
                  const validatedData = giftRequestFormSchema.parse(giftRequestData)

                  validData.push({
                    ...validatedData,
                    memberLogin: row.memberLogin.trim(),
                    giftCost: giftCost,
                    currency: 'MYR', // Default currency when member validation fails
                    remark: (row.description || row.remark)?.trim() || '', // Keep original description/remark for frontend display
                    description: (row.description || row.remark)?.trim() || '', // Use description for backend
                    _rowNumber: rowNumber,
                    _uploadDate: new Date().toISOString(),
                    _uploadedBy: user?.id!, // Keep ID for backend
                    _uploadedByName: user?.name || user?.email || user?.id || 'Unknown User', // Add name for frontend display
                  })
                }
              }
            }
          } catch (zodError: any) {
            // Handle Zod validation errors
            if (zodError.issues) {
              zodError.issues.forEach((issue: any) => {
                const fieldName = issue.path.join('.')
                errors.push(`Row ${rowNumber}: ${issue.message} (field: ${fieldName})`)
              })
            } else {
              errors.push(`Row ${rowNumber}: Validation error - ${zodError.message}`)
            }
            rowValid = false
          }
        } else {
          // Original validation for other tabs
          // Check required fields
          rules.requiredFields?.forEach((field: string) => {
            if (!row[field] || row[field].toString().trim() === '') {
              errors.push(`Row ${rowNumber}: Missing required field "${field}"`)
              rowValid = false
            }
          })

          // Check field types
          if (rules.fieldTypes) {
            Object.entries(rules.fieldTypes).forEach(([field, expectedType]) => {
              if (row[field]) {
                if (Array.isArray(expectedType)) {
                  if (!expectedType.includes(row[field])) {
                    errors.push(`Row ${rowNumber}: Invalid value for "${field}". Expected one of: ${expectedType.join(', ')}`)
                    rowValid = false
                  }
                } else if (expectedType === 'number') {
                  if (isNaN(Number(row[field]))) {
                    errors.push(`Row ${rowNumber}: "${field}" must be a number`)
                    rowValid = false
                  }
                }
              }
            })
          }

          // Check for duplicate gift IDs in processing tab
          if (tab === 'processing' && row.giftId) {
            const existingGift = validData.find((item) => item.giftId === row.giftId)
            if (existingGift) {
              warnings.push(`Row ${rowNumber}: Duplicate gift ID "${row.giftId}"`)
            }
          }

          if (rowValid) {
            validData.push({
              ...row,
              _rowNumber: rowNumber,
              _uploadDate: new Date().toISOString(),
              _uploadedBy: user?.id!, // Keep ID for backend
              _uploadedByName: user?.name || user?.email || user?.id || 'Unknown User', // Add name for frontend display
            })
          }
        }
      })

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        data: validData,
        totalRows: csvData.length,
        validRows: validData.length,
        invalidRows: csvData.length - validData.length,
      }
    },
    [module, tab]
  )

  const handleFileUpload = async (file: File | null) => {
    if (!file) return
    await processCSVData(file)
  }

  const processCSVData = async (file: File | { data: any[] }) => {
    try {
      setIsUploading(true)
      setValidationResult(null)
      setUploadResult(null)

      let result: Papa.ParseResult<any>

      // Check if it's a File object or data object
      if (file instanceof File) {
        // Parse CSV from file
        const text = await file.text()
        result = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          transform: (value) => value.trim(),
        })
      } else {
        // Use provided data directly
        result = {
          data: file.data,
          errors: [],
          meta: {
            delimiter: ',',
            linebreak: '\n',
            aborted: false,
            truncated: false,
            cursor: 0,
            fields: Object.keys(file.data[0] || {})
          }
        }
      }

      if (result.errors.length > 0) {
        toast.error('CSV parsing failed')
        return
      }

      // Validate data (use bulk validation for pending tab)
      let validation: ValidationResult
      if (tab === 'pending') {
        setIsUploading(true)
        try {
          validation = await validateCSVWithBulkValidation(result.data)
        } catch (error) {
          console.error('Bulk validation failed, falling back to standard validation:', error)
          validation = validateCSV(result.data)
        } finally {
          setIsUploading(false)
        }
      } else {
        validation = validateCSV(result.data)
      }
      setValidationResult(validation)

      if (validation.isValid) {
        toast.success(`Validation successful! ${validation.validRows} rows ready for import`)
        setActiveTab('preview')
      } else {
        toast.error(`Validation failed! ${validation.errors.length} errors found`)

        // Generate correction suggestions
        const { suggestions, correctedRows: newCorrectedRows } = generateCorrectionSuggestions(result.data, validation.errors)
        setCorrectionSuggestions(suggestions)
        setCorrectedRows(newCorrectedRows)
        setOriginalCSVData(result.data)

        if (suggestions.length > 0) {
          setShowCorrectionDialog(true)
        }

        setActiveTab('validation')
      }
    } catch (error) {
      toast.error('Failed to process file')
      console.error('File processing error:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const handleImport = async () => {
    if (!validationResult?.isValid) return

    try {
      setIsUploading(true)

      // Start database transaction
      const response = await fetch(`/api/${module}/bulk-import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tab,
          data: validationResult.data,
          batchId: `bulk_${Date.now()}`,
          uploadedBy: user?.id || 'unknown-user',
          userDisplayName: user?.name || user?.email || user?.id || 'unknown-user',
          userId: user?.id || 'unknown-user',
          userRole: user?.role || 'unknown-role',
          userPermissions: user?.permissions || {},
        }),
      })

      const result: UploadResult = await response.json()

      if (result.success) {
        setUploadResult(result)
        toast.success(`Successfully imported ${result.importedCount} records`)
        onUploadComplete?.(result) // Pass the full result object instead of just the data
        setActiveTab('result')
      } else {
        toast.error(`Import failed: ${result.message}`)
      }
    } catch (error) {
      toast.error('Import failed')
      console.error('Import error:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const handleRollback = async () => {
    if (!uploadResult?.batchId) return

    try {
      setIsUploading(true)

      const response = await fetch(`/api/${module}/bulk-rollback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          batchId: uploadResult.batchId,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Rollback successful')
        setUploadResult(null)
        setValidationResult(null)
        setIsOpen(false)
      } else {
        toast.error('Rollback failed')
      }
    } catch (error) {
      toast.error('Rollback failed')
      console.error('Rollback error:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const downloadTemplate = () => {
    const rules = getValidationRules()

    let template: any = {
      headers: [...(rules.requiredFields || []), ...(rules.optionalFields || [])],
      sample: {},
    }

    // Special template for pending tab (gift requests)
    // Note: CSV uses 'description' as header (handles both 'description' and 'remark' for backward compatibility)
    if (tab === 'pending') {
      template = {
        headers: ['merchant', 'memberLogin', 'currency', 'giftItem', 'category', 'giftCost', 'rewardName', 'rewardClubOrder', 'description'],
        sample: {
          merchant: 'Merchant A',
          memberLogin: 'john.doe',
          currency: 'MYR',
          giftItem: 'Gift Card',
          category: 'Birthday Gift',
          giftCost: '100',
          rewardName: 'Luxury Gifts',
          rewardClubOrder: 'RCO-001',
          description: 'Pokemon Gift Card',
        },
      }
    } else {
      // Default template for other tabs
      template.sample =
        rules.requiredFields?.reduce((acc: any, field: string) => {
          acc[field] = `Sample ${field}`
          return acc
        }, {}) || {}
    }

    const csv = Papa.unparse([template.sample])
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${module}-${tab}-template.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open)
        if (!open) {
          resetDialog()
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className=" min-w-[75vw] max-w-[95vw] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Bulk Upload - {tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
          </DialogTitle>
          <DialogDescription>Upload CSV file to bulk import {tab} data. All data will be validated before import.</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="validation" disabled={!validationResult}>
              Validation
            </TabsTrigger>
            <TabsTrigger value="preview" disabled={!validationResult?.isValid}>
              Preview
            </TabsTrigger>
            <TabsTrigger value="result" disabled={!uploadResult}>
              Result
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Upload CSV File</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Button variant="outline" onClick={downloadTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                  <span className="text-sm text-gray-600">Use the template to ensure correct format</span>
                </div>

                <FileUploader
                  onFileSelect={handleFileUpload}
                  acceptedTypes=".csv"
                  maxSize={5} // 5MB
                  disabled={isUploading}
                  reset={fileUploaderReset}
                />

                {isUploading && (
                  <div className="space-y-2">
                    <Progress value={50} />
                    <p className="text-sm text-gray-600">Processing file...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="validation" className="space-y-4">
            {validationResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5" />
                    <span>Validation Results</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{validationResult.totalRows}</div>
                      <div className="text-sm text-gray-600">Total Rows</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{validationResult.validRows}</div>
                      <div className="text-sm text-gray-600">Valid Rows</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{validationResult.invalidRows}</div>
                      <div className="text-sm text-gray-600">Invalid Rows</div>
                    </div>
                  </div>

                  {validationResult.errors.length > 0 && (
                    <Alert>
                      <XCircle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-2">
                          <p className="font-semibold">Errors ({validationResult.errors.length}):</p>
                          <div className="max-h-40 overflow-y-auto space-y-1">
                            {validationResult.errors.map((error, index) => (
                              <p key={index} className="text-sm text-red-600">
                                • {error}
                              </p>
                            ))}
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {validationResult.warnings.length > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-2">
                          <p className="font-semibold">Warnings ({validationResult.warnings.length}):</p>
                          <div className="max-h-40 overflow-y-auto space-y-1">
                            {validationResult.warnings.map((warning, index) => (
                              <p key={index} className="text-sm text-yellow-600">
                                • {warning}
                              </p>
                            ))}
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Correction Assistant Button */}
                  {correctionSuggestions.length > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        <span className="text-sm text-gray-600">
                          {correctionSuggestions.length} issues can be automatically corrected
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setShowCorrectionDialog(true)}
                        className="flex items-center space-x-2"
                      >
                        <AlertTriangle className="h-4 w-4" />
                        <span>View Correction Assistant</span>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            {validationResult?.isValid && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Eye className="h-5 w-5" />
                    <span>Preview Data</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Preview of first 5 rows to be imported:</p>
                    <div className="max-h-60 overflow-x-auto border rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            {Object.keys(validationResult.data[0] || {}).map((header) => {
                              // Map backend field names to user-friendly display names
                              const displayName = (() => {
                                switch (header) {
                                  case 'memberName': return 'Member Name'
                                  case 'memberLogin': return 'Member Login'
                                  case 'memberId': return 'Member ID'
                                  case 'giftItem': return 'Gift Item'
                                  case 'rewardName': return 'Reward Name'
                                  case 'rewardClubOrder': return 'Reward Club Order'
                                  case 'giftCost': return 'Gift Cost'
                                  case 'costLocal': return 'Cost (Local)'
                                  case 'category': return 'Category'
                                  case 'description': return 'Description'
                                  case 'remark': return 'Description'
                                  case '_uploadedByName': return 'Uploaded By'
                                  case '_uploadDate': return 'Upload Date'
                                  case '_rowNumber': return 'Row #'
                                  case '_uploadedBy': return 'Uploaded By ID'
                                  case 'currency': return 'Currency'
                                  default: return header
                                }
                              })()

                              // Skip showing internal fields in preview
                              if (['_uploadedBy', 'memberId', 'description'].includes(header)) {
                                return null
                              }

                              return (
                                <th key={header} className="px-3 py-2 text-left font-medium whitespace-nowrap min-w-[120px]">
                                  {displayName}
                                </th>
                              )
                            }).filter(Boolean)}
                          </tr>
                        </thead>
                        <tbody>
                          {validationResult.data.slice(0, 5).map((row, index) => (
                            <tr key={index} className="border-t">
                              {Object.entries(row).map(([key, value], cellIndex) => {
                                // Skip showing internal fields in preview
                                if (['_uploadedBy', 'memberId', 'description'].includes(key)) {
                                  return null
                                }

                                // Format the display value
                                let displayValue = String(value)
                                if (key === '_uploadDate') {
                                  displayValue = new Date(value as string).toLocaleString()
                                } else if (key === 'giftCost') {
                                  displayValue = value ? parseFloat(value as string).toFixed(2) : ''
                                }

                                return (
                                  <td key={cellIndex} className="px-3 py-2 whitespace-nowrap min-w-[120px]">
                                    {displayValue}
                                  </td>
                                )
                              }).filter(Boolean)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">Total rows to import: {validationResult.data.length}</p>
                    <Button onClick={handleImport} disabled={isUploading}>
                      {isUploading ? (
                        <>
                          <Database className="h-4 w-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Import Data
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="result" className="space-y-4">
            {uploadResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5" />
                    <span>Import Result</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{uploadResult.importedCount}</div>
                      <div className="text-sm text-gray-600">Successfully Imported</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{uploadResult.failedCount}</div>
                      <div className="text-sm text-gray-600">Failed</div>
                    </div>
                  </div>

                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <p className="font-semibold">Batch ID: {uploadResult.batchId}</p>
                      <p className="text-sm text-gray-600 mt-1">Keep this ID for rollback purposes if needed.</p>
                    </AlertDescription>
                  </Alert>

                  <div className="flex items-center justify-between">
                    <Button variant="outline" onClick={handleRollback} disabled={isUploading}>
                      {isUploading ? 'Rolling back...' : 'Rollback Import'}
                    </Button>
                    <div className="flex space-x-2">
                      <Button variant="outline" onClick={resetDialog}>
                        Import More
                      </Button>
                      <Button onClick={() => setIsOpen(false)}>Close</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* Correction Dialog */}
      <Dialog open={showCorrectionDialog} onOpenChange={setShowCorrectionDialog}>
        <DialogContent className="w-[90vw] min-w-[50vw] max-w-[90vw] max-h-[90vh] overflow-y-auto p-4">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Data Correction Assistant</span>
            </DialogTitle>
            <DialogDescription>
              We found {correctionSuggestions.length} issues that can be automatically corrected.
              Review the suggestions below and apply corrections.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Correction Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{correctionSuggestions.length}</div>
                    <div className="text-sm text-gray-600">Total Suggestions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{correctedRows.length}</div>
                    <div className="text-sm text-gray-600">Rows to Correct</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{validationResult?.validRows || 0}</div>
                    <div className="text-sm text-gray-600">Already Valid</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Correction Details */}
            <Card>
              <CardHeader>
                <CardTitle>Correction Details</CardTitle>
              </CardHeader>
              <CardContent className="px-4">
                <div className="space-y-6">
                  {correctedRows.map((correctedRow) => (
                    <div key={correctedRow.rowNumber} className="border rounded-lg p-4 sm:p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-lg">Row {correctedRow.rowNumber}</h4>
                        <Badge variant="outline" className="text-xs">
                          {correctedRow.suggestions.length} corrections
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        <div className="min-w-0">
                          <h5 className="font-medium text-sm text-gray-700 mb-2">Original Data</h5>
                          <div className="space-y-1 text-sm bg-gray-50 p-3 rounded-lg max-h-40 overflow-y-auto">
                            {Object.entries(correctedRow.originalData).map(([key, value]) => (
                              <div key={key} className="flex flex-col sm:flex-row gap-1 items-start">
                                <span className="font-medium text-gray-800 text-xs min-w-[80px] sm:min-w-[100px]">{key}:</span>
                                <span className="text-gray-600 break-words text-xs flex-1">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="min-w-0">
                          <h5 className="font-medium text-sm text-gray-700 mb-2">Corrected Data</h5>
                          <div className="space-y-1 text-sm bg-gray-50 p-3 rounded-lg max-h-40 overflow-y-auto">
                            {Object.entries(correctedRow.correctedData).map(([key, value]) => {
                              const suggestion = correctedRow.suggestions.find(s => s.field === key)
                              const isCorrected = suggestion !== undefined

                              return (
                                <div key={key} className={`flex flex-col sm:flex-row gap-1 items-start ${isCorrected ? 'bg-green-100 p-1 rounded' : ''}`}>
                                  <span className="font-medium text-gray-800 text-xs min-w-[80px] sm:min-w-[100px]">{key}:</span>
                                  <span className={`break-words text-xs flex-1 ${isCorrected ? 'text-green-700 font-medium' : 'text-gray-600'}`}>
                                    {String(value)}
                                    {isCorrected && <span className="ml-1 text-xs">✓</span>}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Suggestions */}
                      <div>
                        <h5 className="font-medium text-sm text-gray-700 mb-2">Corrections Applied</h5>
                        <div className="space-y-3">
                          {correctedRow.suggestions.map((suggestion, index) => (
                            <div key={index} className="bg-blue-50 p-3 rounded-lg">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                <span className="font-medium text-sm">{suggestion.field}</span>
                                <Badge variant="secondary" className="text-xs whitespace-nowrap">
                                  {suggestion.currentValue} → {suggestion.suggestedValue}
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-600 break-words">{suggestion.reason}</p>

                              {/* Member options for memberLogin corrections */}
                              {suggestion.memberOptions && suggestion.memberOptions.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs font-medium text-gray-700 mb-1">Available members with similar names:</p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
                                    {suggestion.memberOptions.slice(0, 3).map((option, optIndex) => (
                                      <div key={optIndex} className="text-xs bg-white p-2 rounded border hover:bg-gray-50">
                                        <div className="font-medium text-gray-900 truncate">{option.memberLogin}</div>
                                        <div className="text-gray-600 mt-1">
                                          <div className="truncate text-xs">{option.memberName}</div>
                                          <div className="flex justify-between mt-1 text-xs">
                                            <span className="text-blue-600 truncate">{option.merchant}</span>
                                            <span className="text-green-600 ml-1">{option.currency}</span>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => downloadCorrectedCSV(originalCSVData, `original-${module}-${tab}-data.csv`)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Original
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const correctedCSV = applyCorrections(originalCSVData, correctedRows)
                    downloadCorrectedCSV(correctedCSV, `corrected-${module}-${tab}-data.csv`)
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Corrected
                </Button>
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCorrectionDialog(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    const correctedCSV = applyCorrections(originalCSVData, correctedRows)
                    // Re-validate with corrected data
                    processCSVData({ data: correctedCSV })
                    setShowCorrectionDialog(false)
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Apply Corrections & Re-validate
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
