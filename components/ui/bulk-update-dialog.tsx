'use client'

import React, { useState, useCallback } from 'react'
import { useMemberProfiles } from '@/contexts/member-profile-context'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FileUploader } from '@/components/ui/file-uploader'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle, Download, Eye, Database, Loader2, ChevronDown } from 'lucide-react'
import Papa from 'papaparse'

interface BulkUpdateDialogProps {
  module: string
  tab: string
  trigger: React.ReactNode
  onUpdateComplete?: (data: any[]) => void
  user?: {
    id: string
    name?: string
    email?: string
    role?: string
    permissions?: Record<string, string[]>
    merchants?: string[]
    currencies?: string[]
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

interface UpdateResult {
  success: boolean
  message: string
  updatedCount: number
  failedCount: number
  batchId?: string
  failedRows?: Array<{
    giftId: string
    error: string
    rowData?: any
  }>
}

interface AutoFillOptions {
  dispatcher?: string
  trackingCode?: string
  status?: string
  feedback?: string
  remark?: string
  decision?: string
  rejectReason?: string
}

export function BulkUpdateDialog({ module, tab, trigger, onUpdateComplete, user }: BulkUpdateDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [updateResult, setUpdateResult] = useState<UpdateResult | null>(null)
  const [activeTab, setActiveTab] = useState('upload')
  const [autoFillOptions, setAutoFillOptions] = useState<AutoFillOptions>({})

  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [originalCsvData, setOriginalCsvData] = useState<any[]>([]) // Store original CSV data
  const [isExporting, setIsExporting] = useState(false) // Loading state for export
  const [isValidating, setIsValidating] = useState(false) // Loading state for validation
  const [selectedExportMerchant, setSelectedExportMerchant] = useState<string>('all') // Selected merchant for export

  // Member profile hooks for validation
  const { memberProfiles } = useMemberProfiles()

  // Member and Gift validation function using cached member profiles
  const validateMemberAndGift = (giftId: string, memberLogin: string, merchant: string, currency: string) => {
    try {
      // Validate giftId format
      if (!giftId || giftId.trim() === '') {
        return {
          valid: false,
          error: `Gift ID is required`
        }
      }

      // Validate giftId is numeric
      if (isNaN(Number(giftId))) {
        return {
          valid: false,
          error: `Gift ID "${giftId}" must be a number`
        }
      }

      // Find member in cached profiles
      const member = memberProfiles.find((profile) =>
        profile.memberLogin.toLowerCase() === memberLogin.trim().toLowerCase()
      )

      if (!member) {
        return {
          valid: false,
          error: `Member login "${memberLogin.trim()}" not found in member database`
        }
      }

      // Validate merchant matches
      if (member.merchantName && member.merchantName !== merchant.trim()) {
        return {
          valid: false,
          error: `Member "${memberLogin.trim()}" belongs to merchant "${member.merchantName}", not "${merchant.trim()}"`
        }
      }

      // Validate currency matches
      if (member.currency && member.currency !== currency.trim()) {
        return {
          valid: false,
          error: `Member "${memberLogin.trim()}" has currency "${member.currency}", not "${currency.trim()}"`
        }
      }

      // Note: Full gift ownership validation (checking if giftId exists and belongs to member) 
      // will be performed server-side during the actual update since cached profiles
      // don't contain gift information. Server-side validation ensures:
      // 1. GiftId exists in database
      // 2. GiftId belongs to the specified member login
      // 3. Member's merchant and currency match from database

      // All validations passed
      return { valid: true }
    } catch (error) {
      console.error('Member validation error:', error)
      return { valid: false, error: 'Validation failed' }
    }
  }

  // Enhanced CSV validation with member and gift validation
  const validateCSVWithMemberValidation = (csvData: any[]): ValidationResult => {
    const config = getTemplateConfig()
    const errors: string[] = []
    const warnings: string[] = []
    const validData: any[] = []
    const giftIdSet = new Set<string>()

    // Process each row with member and gift validation
    for (let index = 0; index < csvData.length; index++) {
      const row = csvData[index]
      const rowNumber = index + 2 // +2 because index starts at 0 and we skip header
      let rowValid = true

      // Trim all string values
      Object.keys(row).forEach((key) => {
        if (typeof row[key] === 'string') {
          row[key] = row[key].trim()
        }
      })

      // Check required fields
      config.requiredFields?.forEach((field: string) => {
        if (!row[field] || row[field].toString().trim() === '') {
          errors.push(`Row ${rowNumber}: Missing required field "${field}"`)
          rowValid = false
        }
      })

      // Validate giftId is numeric
      if (row.giftId && isNaN(Number(row.giftId))) {
        errors.push(`Row ${rowNumber}: giftId must be a number`)
        rowValid = false
      }

      // Check for duplicate giftId
      if (row.giftId) {
        const giftIdStr = row.giftId.toString()
        if (giftIdSet.has(giftIdStr)) {
          errors.push(`Row ${rowNumber}: Duplicate giftId "${giftIdStr}" found`)
          rowValid = false
        } else {
          giftIdSet.add(giftIdStr)
        }
      }

      // Validate merchant and currency permissions for all tabs
      if (row.merchant && user?.permissions) {
        const userMerchants = user.permissions['merchants'] || []
        if (userMerchants.length > 0 && !userMerchants.includes(row.merchant.trim())) {
          errors.push(`Row ${rowNumber}: Uploader does not have permission to access merchant "${row.merchant.trim()}"`)
          rowValid = false
        }
      }

      if (row.currency && user?.permissions) {
        const userCurrencies = user.permissions['currencies'] || []
        if (userCurrencies.length > 0 && !userCurrencies.includes(row.currency.trim())) {
          errors.push(`Row ${rowNumber}: Uploader does not have permission to access currency "${row.currency.trim()}"`)
          rowValid = false
        }
      }

      // Validate member login, merchant, currency match
      if (row.memberLogin && row.merchant && row.currency) {
        console.log(`🔍 Validating row ${rowNumber}:`, {
          memberLogin: row.memberLogin,
          merchant: row.merchant,
          currency: row.currency,
          availableMembers: memberProfiles.length
        })

        const validationResult = validateMemberAndGift(
          row.giftId?.toString() || '',
          row.memberLogin,
          row.merchant,
          row.currency
        )

        if (!validationResult.valid) {
          errors.push(`Row ${rowNumber}: ${validationResult.error || 'Member validation failed'}`)
          rowValid = false
        }
      }

      // Note: Gift ID validation will be done server-side during the actual update
      // No need to show warnings to the user about this

      // Validate status options for processing tab
      if (tab === 'processing' && row.status && !config.statusOptions.includes(row.status)) {
        errors.push(`Row ${rowNumber}: Invalid status. Expected one of: ${config.statusOptions.join(', ')}`)
        rowValid = false
      }

      // Validate boolean fields
      config.booleanFields?.forEach((field: string) => {
        if (row[field] && !['TRUE', 'FALSE', 'true', 'false', '1', '0'].includes(row[field].toString())) {
          errors.push(`Row ${rowNumber}: ${field} must be TRUE/FALSE, true/false, or 1/0`)
          rowValid = false
        }
      })

      if (rowValid) {
        validData.push({
          ...row,
          _rowNumber: rowNumber,
          _uploadDate: new Date().toISOString(),
          _uploadedBy: user?.id!,
        })
      }
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

  // Get template and validation rules based on tab
  const getTemplateConfig = () => {
    const configs: Record<string, any> = {
      processing: {
        template: 'giftId,merchant,memberLogin,currency,giftItem,giftCost,dispatcher,trackingCode,status,decision,rejectReason',
        requiredFields: ['giftId', 'dispatcher', 'trackingCode'],
        readOnlyFields: ['giftId', 'merchant', 'memberLogin', 'currency', 'giftItem', 'giftCost'],
        autoFillFields: ['status', 'decision', 'rejectReason'],
        statusOptions: ['Pending', 'In Transit', 'Delivered', 'Failed'],
        decisionOptions: ['proceed', 'stay', 'reject'],
      },
      'kam-proof': {
        template: 'giftId,merchant,memberLogin,currency,giftItem,giftCost,feedback,decision',
        requiredFields: ['giftId', 'feedback'],
        readOnlyFields: ['giftId', 'merchant', 'memberLogin', 'currency', 'giftItem', 'giftCost'],
        autoFillFields: ['feedback', 'decision'],
        decisionOptions: ['proceed', 'stay', 'revert'],
      },
      audit: {
        template: 'giftId,merchant,memberLogin,currency,giftItem,remark,decision',
        requiredFields: ['giftId', 'remark'],
        readOnlyFields: ['giftId', 'merchant', 'memberLogin', 'currency', 'giftItem'],
        autoFillFields: ['remark', 'decision'],
        decisionOptions: ['completed', 'issue', 'stay'],
      },
    }
    return configs[tab] || {}
  }

  const validateCSV = useCallback(
    (csvData: any[]): ValidationResult => {
      const config = getTemplateConfig()
      const errors: string[] = []
      const warnings: string[] = []
      const validData: any[] = []
      const giftIdSet = new Set<string>()

      csvData.forEach((row, index) => {
        const rowNumber = index + 2 // +2 because index starts at 0 and we skip header
        let rowValid = true

        // Trim all string values
        Object.keys(row).forEach((key) => {
          if (typeof row[key] === 'string') {
            row[key] = row[key].trim()
          }
        })

        // Check required fields
        config.requiredFields?.forEach((field: string) => {
          if (!row[field] || row[field].toString().trim() === '') {
            errors.push(`Row ${rowNumber}: Missing required field "${field}"`)
            rowValid = false
          }
        })

        // Validate giftId is numeric
        if (row.giftId && isNaN(Number(row.giftId))) {
          errors.push(`Row ${rowNumber}: giftId must be a number`)
          rowValid = false
        }

        // Check for duplicate giftId
        if (row.giftId) {
          const giftIdStr = row.giftId.toString()
          if (giftIdSet.has(giftIdStr)) {
            errors.push(`Row ${rowNumber}: Duplicate giftId "${giftIdStr}" found`)
            rowValid = false
          } else {
            giftIdSet.add(giftIdStr)
          }
        }

        // Validate merchant and currency permissions for all tabs
        if (row.merchant && user?.permissions) {
          const userMerchants = user.permissions['merchants'] || []
          if (userMerchants.length > 0 && !userMerchants.includes(row.merchant.trim())) {
            errors.push(`Row ${rowNumber}: Uploader does not have permission to access merchant "${row.merchant.trim()}"`)
            rowValid = false
          }
        }

        if (row.currency && user?.permissions) {
          const userCurrencies = user.permissions['currencies'] || []
          if (userCurrencies.length > 0 && !userCurrencies.includes(row.currency.trim())) {
            errors.push(`Row ${rowNumber}: Uploader does not have permission to access currency "${row.currency.trim()}"`)
            rowValid = false
          }
        }

        // Validate member login with merchant and currency match (read-only fields for validation only)
        if (row.memberLogin && row.merchant && row.currency) {
          // These fields are read-only and used only for validation
          // The actual validation will be performed server-side to ensure the gift belongs to the correct member
          warnings.push(`Row ${rowNumber}: Member validation will be performed during update to ensure memberLogin "${row.memberLogin}" exists with merchant "${row.merchant}" and currency "${row.currency}"`)
        }

        // Validate status options for processing tab
        if (tab === 'processing' && row.status && !config.statusOptions.includes(row.status)) {
          errors.push(`Row ${rowNumber}: Invalid status. Expected one of: ${config.statusOptions.join(', ')}`)
          rowValid = false
        }

        // Validate boolean fields
        config.booleanFields?.forEach((field: string) => {
          if (row[field] && !['TRUE', 'FALSE', 'true', 'false', '1', '0'].includes(row[field].toString())) {
            errors.push(`Row ${rowNumber}: ${field} must be TRUE/FALSE, true/false, or 1/0`)
            rowValid = false
          }
        })

        // Validate decision options
        if (row.decision && config.decisionOptions && !config.decisionOptions.includes(row.decision)) {
          errors.push(`Row ${rowNumber}: Invalid decision. Expected one of: ${config.decisionOptions.join(', ')}`)
          rowValid = false
        }

        // Validate processing tab proceed requirements
        if (tab === 'processing' && row.decision === 'proceed') {
          if (!row.dispatcher || row.dispatcher.toString().trim() === '') {
            errors.push(`Row ${rowNumber}: Dispatcher is required when decision is 'proceed'`)
            rowValid = false
          }
          if (!row.trackingCode || row.trackingCode.toString().trim() === '') {
            errors.push(`Row ${rowNumber}: Tracking Code is required when decision is 'proceed'`)
            rowValid = false
          }
          if (!row.status || row.status.toString().trim() !== 'Delivered') {
            errors.push(`Row ${rowNumber}: Status must be 'Delivered' when decision is 'proceed'`)
            rowValid = false
          }
        }

        // Validate processing tab reject requirements
        if (tab === 'processing' && row.decision === 'reject') {
          if (!row.rejectReason || row.rejectReason.toString().trim() === '') {
            errors.push(`Row ${rowNumber}: Reject Reason is required when decision is 'reject'`)
            rowValid = false
          }
          // When rejecting, status should not be a normal delivery status
          if (row.status && ['Pending', 'In Transit', 'Delivered'].includes(row.status.toString().trim())) {
            errors.push(`Row ${rowNumber}: Status cannot be '${row.status}' when decision is 'reject'. Use 'Failed' or leave empty.`)
            rowValid = false
          }
        }

        if (rowValid) {
          validData.push({
            ...row,
            _rowNumber: rowNumber,
            _uploadDate: new Date().toISOString(),
            _uploadedBy: user?.id!,
          })
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
    [tab, user]
  )

  const handleFileUpload = useCallback(
    async (file: File | null) => {
      if (!file) return

      setUploadedFile(file)
      setIsValidating(true)

      try {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: async (results) => {
            if (results.errors.length > 0) {
              toast.error('CSV parsing failed', {
                description: results.errors.map((err) => err.message).join(', '),
              })
              setIsValidating(false)
              return
            }

            // Store the original CSV data for auto-fill functionality
            setOriginalCsvData(results.data as any[])

            // First, do basic CSV validation
            const basicValidation = validateCSV(results.data as any[])

            // If basic validation passes, do member and gift validation
            if (basicValidation.isValid) {
              const enhancedValidation = validateCSVWithMemberValidation(results.data as any[])
              setValidationResult(enhancedValidation)

              if (enhancedValidation.isValid) {
                toast.success(`CSV validated successfully`, {
                  description: `${enhancedValidation.validRows} rows ready for update`,
                })
                setActiveTab('preview')
              } else {
                console.log('🔍 Enhanced validation errors:', enhancedValidation.errors)
                toast.error(`CSV validation failed`, {
                  description: `${enhancedValidation.errors.length} errors found. Check the preview tab for details.`,
                })
                setActiveTab('preview')
              }
            } else {
              setValidationResult(basicValidation)
              console.log('🔍 Basic validation errors:', basicValidation.errors)
              toast.error(`CSV validation failed`, {
                description: `${basicValidation.errors.length} errors found. Check the preview tab for details.`,
              })
              setActiveTab('preview')
            }

            setIsValidating(false)
          },
          error: (error) => {
            toast.error('Failed to parse CSV file', {
              description: error.message,
            })
            setIsValidating(false)
          },
        })
      } catch (error) {
        toast.error('Failed to process file')
        setIsValidating(false)
      }
    },
    [validateCSV]
  )

  const applyAutoFill = () => {
    if (!originalCsvData.length) return

    // Apply auto-fill to the original CSV data, not just the valid rows
    const updatedData = originalCsvData.map((row) => {
      const newRow = { ...row }

      // Apply auto-fill for null/empty values
      Object.entries(autoFillOptions).forEach(([field, value]) => {
        if (value && (!newRow[field] || newRow[field].toString().trim() === '')) {
          newRow[field] = value
        }
      })

      return newRow
    })

    // Re-run validation on the complete updated dataset
    const revalidatedResult = validateCSV(updatedData)
    setValidationResult(revalidatedResult)

    if (revalidatedResult.isValid) {
      toast.success('Auto-fill applied and validation passed', {
        description: `${revalidatedResult.validRows} rows ready for update`,
      })
    } else {
      toast.success('Auto-fill applied successfully', {
        description: `${revalidatedResult.validRows} valid rows, ${revalidatedResult.errors.length} errors remain`,
      })
    }
  }

  const handleBulkUpdate = async () => {
    if (!validationResult || !validationResult.isValid) {
      toast.error('Cannot update: Validation errors exist')
      return
    }

    setIsUpdating(true)
    setActiveTab('result')

    try {
      const response = await fetch('/api/gift-approval/bulk-update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tab: tab,
          data: validationResult.data,
          uploadedBy: user?.email || user?.id || 'unknown',
          userDisplayName: user?.name || user?.email || 'unknown',
          userId: user?.id || 'unknown',
          userRole: user?.role || '',
          userPermissions: user?.permissions || {},
          autoFillOptions: autoFillOptions,
        }),
      })

      const result = await response.json()

      setUpdateResult(result)

      if (result.success) {
        const successMessage = 'Bulk update completed successfully!'
        const description = `Updated ${result.updatedCount} records`

        toast.success(successMessage, {
          description: description,
        })
        onUpdateComplete?.(validationResult.data)
      } else {
        toast.error('Bulk update failed', {
          description: result.message,
        })
      }
    } catch (error) {
      console.error('Bulk update error:', error)
      const errorResult: UpdateResult = {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        updatedCount: 0,
        failedCount: validationResult.data.length,
      }
      setUpdateResult(errorResult)
      toast.error('Bulk update failed', {
        description: 'Network or server error',
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const downloadTemplate = () => {
    const config = getTemplateConfig()
    const csvContent = config.template
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bulk-update-${tab}-template.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    toast.success('Template downloaded', {
      description: 'Fill in the template with your data',
    })
  }

  const downloadCurrentGifts = async (selectedMerchant?: string) => {
    if (isExporting) return // Prevent multiple clicks

    setIsExporting(true)
    try {
      // Build query parameters
      const params = new URLSearchParams({
        tab: tab,
        userPermissions: JSON.stringify(user?.permissions || {})
      })

      // Add merchant filter if specified
      if (selectedMerchant && selectedMerchant !== 'all') {
        params.append('merchant', selectedMerchant)
      }

      const response = await fetch(`/api/gift-approval/export-current?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to export current gifts')
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || 'Export failed')
      }

      // Convert the data to CSV
      const config = getTemplateConfig()
      const csvData = result.data.map((gift: any) => {
        const row: any = {}

        // Map database fields to CSV columns based on template (reordered)
        if (tab === 'processing') {
          row.giftId = gift.GIFT_ID
          row.merchant = gift.MERCHANT_NAME || ''
          row.memberLogin = gift.MEMBER_LOGIN
          row.currency = gift.CURRENCY || ''
          row.giftItem = gift.GIFT_ITEM
          row.giftCost = gift.GIFT_COST
          row.dispatcher = gift.DISPATCHER || ''
          row.trackingCode = gift.TRACKING_CODE || ''
          row.status = gift.TRACKING_STATUS || ''
          row.decision = gift.DECISION || ''
          row.rejectReason = gift.REJECT_REASON || ''
        } else if (tab === 'kam-proof') {
          row.giftId = gift.GIFT_ID
          row.merchant = gift.MERCHANT_NAME || ''
          row.memberLogin = gift.MEMBER_LOGIN
          row.currency = gift.CURRENCY || ''
          row.giftItem = gift.GIFT_ITEM
          row.giftCost = gift.GIFT_COST
          row.feedback = gift.GIFT_FEEDBACK || ''
          row.decision = gift.DECISION || ''
        } else if (tab === 'audit') {
          row.giftId = gift.GIFT_ID
          row.merchant = gift.MERCHANT_NAME || ''
          row.memberLogin = gift.MEMBER_LOGIN
          row.currency = gift.CURRENCY || ''
          row.giftItem = gift.GIFT_ITEM
          row.remark = gift.AUDIT_REMARK || ''
          row.decision = gift.DECISION || ''
        }

        return row
      })

      // Convert to CSV
      const csvContent = Papa.unparse(csvData)
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `current-gifts-${tab}-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      const exportDescription = selectedMerchant && selectedMerchant !== 'all'
        ? `${csvData.length} gifts exported for ${selectedMerchant} in ${tab} stage`
        : `${csvData.length} gifts exported for ${tab} stage`

      toast.success('Current gifts exported successfully!', {
        description: exportDescription,
      })
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export current gifts', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsExporting(false)
    }
  }

  const resetDialog = () => {
    setValidationResult(null)
    setUpdateResult(null)
    setActiveTab('upload')
    setAutoFillOptions({})
    setUploadedFile(null)
    setOriginalCsvData([]) // Reset original CSV data
    setIsExporting(false) // Reset export loading state
    setIsValidating(false) // Reset validation loading state
  }

  const config = getTemplateConfig()

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
      <DialogContent className="!max-w-none w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Bulk Update - {tab.charAt(0).toUpperCase() + tab.slice(1)} Stage
          </DialogTitle>
          <DialogDescription>Export current gifts, make changes in Excel/CSV, then upload to update multiple records at once</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload">Upload CSV</TabsTrigger>
            <TabsTrigger value="preview" disabled={!validationResult}>
              {validationResult?.isValid ? 'Preview & Options' : 'Validation Results'}
            </TabsTrigger>
            <TabsTrigger value="result" disabled={!updateResult}>
              Results
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Step 1: Export Current Gifts (Optional)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">Export Current {tab.charAt(0).toUpperCase() + tab.slice(1)} Gifts</h4>
                    <p className="text-sm text-gray-600 mt-1">Download all current gifts in this stage to make changes directly</p>
                    <div className="text-xs text-gray-500 mt-2">
                      <strong>Includes:</strong> All gifts currently in {tab} stage with their current values (filtered by your permissions)
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      <strong>Workflow:</strong> Export (All or by Merchant) → Edit in Excel → Upload modified CSV
                    </div>
                  </div>
                  <div className="flex items-center">
                    {/* Single Export Button with Dropdown */}
                    <div className="relative inline-flex">
                      <Button
                        onClick={() => downloadCurrentGifts()}
                        disabled={isExporting}
                        className="bg-green-600 hover:bg-green-700 text-white rounded-r-none border-r-0"
                      >
                        {isExporting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Exporting...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-2" />
                            Export All Gifts
                          </>
                        )}
                      </Button>

                      {/* Dropdown Arrow Button */}
                      {user?.merchants && user.merchants.length > 0 && (
                        <Select value={selectedExportMerchant} onValueChange={(value) => {
                          setSelectedExportMerchant(value);
                          if (value === 'all') {
                            downloadCurrentGifts();
                          } else {
                            downloadCurrentGifts(value);
                          }
                        }}>
                          <SelectTrigger className="border-l-0 rounded-l-none bg-green-600 hover:bg-green-700 text-white border-green-600 hover:border-green-700 px-1 [&>svg:not(.h-3)]:hidden">
                            <ChevronDown className="h-3 w-3 text-white" />
                          </SelectTrigger>
                          <SelectContent align="end" side="bottom" className="w-48">
                            <SelectItem value="all">
                              Export All Gifts
                            </SelectItem>
                            <div className="border-t border-gray-200 my-1"></div>
                            {user.merchants.map((merchant) => (
                              <SelectItem
                                key={merchant}
                                value={merchant}
                              >
                                Export {merchant} Gifts
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {/* Info message for users without merchant permissions */}
                    {(!user?.merchants || user.merchants.length === 0) && (
                      <div className="ml-2 text-xs text-gray-500">
                        ℹ️ Merchant-specific export options will appear if you have access to multiple merchants
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Step 2: Download Template</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">CSV Template for {tab.charAt(0).toUpperCase() + tab.slice(1)}</h4>
                    <p className="text-sm text-gray-600 mt-1">Download the template and fill in your data</p>
                    <div className="text-xs text-gray-500 mt-2">
                      <strong>Template columns:</strong> {config.template}
                    </div>
                    {config.readOnlyFields && (
                      <div className="text-xs text-orange-600 mt-1">
                        <strong>Read-only fields:</strong> {config.readOnlyFields.join(', ')} (for verification only)
                      </div>
                    )}

                    {/* Enhanced Field Guidance */}
                    <div className="mt-3 p-3 bg-blue-50 rounded-md border border-blue-200">
                      <h4 className="text-sm font-medium text-blue-800 mb-2">📋 Field Value Guidelines</h4>

                      {tab === 'processing' && (
                        <div className="space-y-2 text-xs text-blue-700">
                          <div><strong>status:</strong> Pending | In Transit | Delivered | Failed</div>
                          <div><strong>decision:</strong> proceed | stay | reject</div>
                          <div><strong>rejectReason:</strong> Reason for rejection (required when decision="reject")</div>
                          <div className="mt-2 space-y-2">
                            <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
                              <strong>⚠️ Proceed Requirements:</strong> To use decision="proceed", you must have:
                              <ul className="ml-4 mt-1 list-disc">
                                <li>dispatcher: Not empty</li>
                                <li>trackingCode: Not empty</li>
                                <li>status: Must be "Delivered"</li>
                              </ul>
                            </div>
                            <div className="p-2 bg-red-50 border border-red-200 rounded">
                              <strong>⚠️ Reject Requirements:</strong> To use decision="reject", you must have:
                              <ul className="ml-4 mt-1 list-disc">
                                <li>rejectReason: Not empty (reason for rejection)</li>
                                <li>status: Cannot be 'Pending', 'In Transit', or 'Delivered' (use 'Failed' or leave empty)</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}

                      {tab === 'kam-proof' && (
                        <div className="space-y-2 text-xs text-blue-700">
                          <div><strong>feedback:</strong> Any text (customer feedback or revert reason) <span className="text-red-600 font-semibold">*Required</span></div>
                          <div><strong>decision:</strong> proceed | stay | revert</div>
                          <div className="mt-2 space-y-1">
                            <div>• <strong>proceed:</strong> Move to Audit stage</div>
                            <div>• <strong>stay:</strong> Update feedback only, remain in KAM Proof</div>
                            <div>• <strong>revert:</strong> Return to MKTOps Processing (delivery issue)</div>
                          </div>
                        </div>
                      )}

                      {tab === 'audit' && (
                        <div className="space-y-2 text-xs text-blue-700">
                          <div><strong>remark:</strong> Audit notes/comments (required)</div>
                          <div><strong>decision:</strong> completed | issue | stay</div>
                          <div className="mt-2 space-y-1">
                            <div>• <strong>completed:</strong> Mark as final completion</div>
                            <div>• <strong>issue:</strong> Return to KAM Proof for review</div>
                            <div>• <strong>stay:</strong> Update remark only, remain in Audit</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button onClick={downloadTemplate} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Step 3: Upload CSV File</CardTitle>
              </CardHeader>
              <CardContent>
                <FileUploader
                  acceptedTypes=".csv,text/csv"
                  maxSize={10 * 1024 * 1024} // 10MB
                  onFileSelect={handleFileUpload}
                  placeholder="Upload your CSV file (max 10MB)"
                  disabled={isValidating}
                />

                {isValidating && (
                  <div className="space-y-2 mt-4">
                    <Progress value={50} />
                    <p className="text-sm text-gray-600">Validating member and gift data...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            {validationResult && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {validationResult.isValid ? <Eye className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                      {validationResult.isValid ? 'Validation Results' : 'Validation Errors'}
                    </CardTitle>
                    {uploadedFile && (
                      <CardDescription>
                        File: {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)} KB)
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 mb-4">
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
                      <Alert className="mb-4 border-red-200 bg-red-50">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <AlertDescription>
                          <div className="font-semibold mb-2 text-red-800">Validation Errors:</div>
                          <ul className="list-disc list-inside space-y-1">
                            {validationResult.errors.slice(0, 10).map((error, index) => (
                              <li key={index} className="text-sm text-red-700">
                                {error}
                              </li>
                            ))}
                            {validationResult.errors.length > 10 && <li className="text-sm text-red-600">... and {validationResult.errors.length - 10} more errors</li>}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    {validationResult.warnings.length > 0 && (
                      <Alert className="mb-4 border-yellow-200 bg-yellow-50">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <AlertDescription>
                          <div className="font-semibold mb-2 text-yellow-800">Warnings:</div>
                          <ul className="list-disc list-inside space-y-1">
                            {validationResult.warnings.map((warning, index) => (
                              <li key={index} className="text-sm text-yellow-700">
                                {warning}
                              </li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>

                {validationResult && (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle>Auto-Fill Options</CardTitle>
                        <CardDescription>Fill empty values with default options</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {config.autoFillFields?.map((field: string) => (
                          <div key={field} className="space-y-2">
                            <Label htmlFor={field}>{field.charAt(0).toUpperCase() + field.slice(1)}</Label>
                            {field === 'status' && tab === 'processing' ? (
                              <Select value={autoFillOptions[field as keyof AutoFillOptions] || ''} onValueChange={(value) => setAutoFillOptions((prev) => ({ ...prev, [field]: value }))}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select default status" />
                                </SelectTrigger>
                                <SelectContent>
                                  {config.statusOptions?.map((option: string) => (
                                    <SelectItem key={option} value={option}>
                                      {option}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                            ) : field === 'decision' && config.decisionOptions ? (
                              <Select value={autoFillOptions[field as keyof AutoFillOptions] || ''} onValueChange={(value) => setAutoFillOptions((prev) => ({ ...prev, [field]: value }))}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select default decision" />
                                </SelectTrigger>
                                <SelectContent>
                                  {config.decisionOptions?.map((option: string) => (
                                    <SelectItem key={option} value={option}>
                                      {option}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input id={field} placeholder={`Default ${field}`} value={autoFillOptions[field as keyof AutoFillOptions] || ''} onChange={(e) => setAutoFillOptions((prev) => ({ ...prev, [field]: e.target.value }))} />
                            )}
                          </div>
                        ))}

                        <Button onClick={applyAutoFill} variant="outline" className="w-full">
                          Apply Auto-Fill to Empty Values
                        </Button>
                      </CardContent>
                    </Card>



                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setActiveTab('upload')}>
                        Back to Upload
                      </Button>
                      <Button
                        onClick={handleBulkUpdate}
                        disabled={isUpdating || !validationResult.isValid || validationResult.errors.length > 0}
                      >
                        {isUpdating ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            {`Update ${validationResult.validRows} Records`}
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="result" className="space-y-4">
            {updateResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {updateResult.success ? <CheckCircle className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
                    Update Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{updateResult.updatedCount}</div>
                      <div className="text-sm text-gray-600">Updated</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{updateResult.failedCount}</div>
                      <div className="text-sm text-gray-600">Failed</div>
                    </div>
                  </div>

                  <Alert className={updateResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                    <AlertDescription>
                      <div className="font-semibold mb-1">{updateResult.success ? 'Update Successful!' : 'Update Failed'}</div>
                      <div className="text-sm">{updateResult.message}</div>
                      {updateResult.batchId && <div className="text-xs text-gray-600 mt-2">Batch ID: {updateResult.batchId}</div>}
                    </AlertDescription>
                  </Alert>

                  {/* Display detailed error messages for failed rows */}
                  {updateResult.failedRows && updateResult.failedRows.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-red-800 mb-2">Failed Records Details:</h4>
                      <div className="max-h-60 overflow-y-auto border border-red-200 rounded-lg p-3 bg-red-50">
                        {updateResult.failedRows.map((failedRow, index) => (
                          <div key={index} className="mb-2 p-2 bg-white rounded border-l-4 border-red-500">
                            <div className="font-medium text-red-800">
                              Gift ID: {failedRow.giftId}
                            </div>
                            <div className="text-sm text-red-700 mt-1">
                              {failedRow.error}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end space-x-2 mt-4">
                    <Button variant="outline" onClick={resetDialog}>
                      Update More Records
                    </Button>
                    <Button onClick={() => setIsOpen(false)}>Close</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {isUpdating && (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Processing Bulk Update...</h3>
                    <p className="text-gray-600">Please wait while we update your records</p>
                    <Progress value={undefined} className="mt-4" />
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
