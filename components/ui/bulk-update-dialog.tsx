"use client"

import React, { useState, useCallback } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { FileUploader } from "@/components/ui/file-uploader"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle, Download, Eye, Database, Loader2 } from "lucide-react"
import Papa from "papaparse"

interface BulkUpdateDialogProps {
  module: string
  tab: string
  trigger: React.ReactNode
  onUpdateComplete?: (data: any[]) => void
  user?: {
    id: string;
    name?: string;
    email?: string;
    role?: string;
    permissions?: Record<string, string[]>;
  } | null;
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
}

interface AutoFillOptions {
  dispatcher?: string
  trackingCode?: string
  status?: string
  uploadedBo?: string
  receiverFeedback?: string
  remark?: string
}

export function BulkUpdateDialog({ module, tab, trigger, onUpdateComplete, user }: BulkUpdateDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [updateResult, setUpdateResult] = useState<UpdateResult | null>(null)
  const [activeTab, setActiveTab] = useState("upload")
  const [autoFillOptions, setAutoFillOptions] = useState<AutoFillOptions>({})
  const [advanceWorkflow, setAdvanceWorkflow] = useState(false)
  const [auditDecision, setAuditDecision] = useState<'completed' | 'issue'>('completed')

  // Get template and validation rules based on tab
  const getTemplateConfig = () => {
    const configs: Record<string, any> = {
      processing: {
        template: "giftId,giftItem,costMyr,memberLogin,dispatcher,trackingCode,status,uploadedBo",
        requiredFields: ["giftId", "dispatcher", "trackingCode"],
        readOnlyFields: ["giftId", "giftItem", "costMyr", "memberLogin"],
        autoFillFields: ["dispatcher", "trackingCode", "status", "uploadedBo"],
        statusOptions: ["Pending", "In Transit", "Delivered", "Failed"],
        booleanFields: ["uploadedBo"]
      },
      "kam-proof": {
        template: "giftId,giftItem,costMyr,memberLogin,receiverFeedback",
        requiredFields: ["giftId"],
        readOnlyFields: ["giftId", "giftItem", "costMyr", "memberLogin"],
        autoFillFields: ["receiverFeedback"],
        canAdvanceWorkflow: true
      },
      audit: {
        template: "giftId,giftItem,memberLogin,remark",
        requiredFields: ["giftId", "remark"],
        readOnlyFields: ["giftId", "giftItem", "memberLogin"],
        autoFillFields: ["remark"],
        canAdvanceWorkflow: true
      }
    }
    return configs[tab] || {}
  }

  const validateCSV = useCallback((csvData: any[]): ValidationResult => {
    const config = getTemplateConfig()
    const errors: string[] = []
    const warnings: string[] = []
    const validData: any[] = []

    csvData.forEach((row, index) => {
      const rowNumber = index + 2 // +2 because index starts at 0 and we skip header
      let rowValid = true

      // Trim all string values
      Object.keys(row).forEach(key => {
        if (typeof row[key] === 'string') {
          row[key] = row[key].trim()
        }
      })

      // Check required fields
      config.requiredFields?.forEach((field: string) => {
        if (!row[field] || row[field].toString().trim() === "") {
          errors.push(`Row ${rowNumber}: Missing required field "${field}"`)
          rowValid = false
        }
      })

      // Validate giftId is numeric
      if (row.giftId && isNaN(Number(row.giftId))) {
        errors.push(`Row ${rowNumber}: giftId must be a number`)
        rowValid = false
      }

      // Validate status options for processing tab
      if (tab === "processing" && row.status && !config.statusOptions.includes(row.status)) {
        errors.push(`Row ${rowNumber}: Invalid status. Expected one of: ${config.statusOptions.join(", ")}`)
        rowValid = false
      }

      // Validate boolean fields
      config.booleanFields?.forEach((field: string) => {
        if (row[field] && !["Yes", "No", "true", "false", "1", "0"].includes(row[field].toString())) {
          errors.push(`Row ${rowNumber}: ${field} must be Yes/No, true/false, or 1/0`)
          rowValid = false
        }
      })

      if (rowValid) {
        validData.push({
          ...row,
          _rowNumber: rowNumber,
          _uploadDate: new Date().toISOString(),
          _uploadedBy: user?.id!
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
      invalidRows: csvData.length - validData.length
    }
  }, [tab, user])

  const handleFileUpload = useCallback((file: File | null) => {
    if (!file) return

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          toast.error("CSV parsing failed", {
            description: results.errors.map(err => err.message).join(", ")
          })
          return
        }

        const validation = validateCSV(results.data as any[])
        setValidationResult(validation)
        setActiveTab("preview")

        if (validation.isValid) {
          toast.success(`CSV validated successfully`, {
            description: `${validation.validRows} rows ready for update`
          })
        } else {
          toast.error(`CSV validation failed`, {
            description: `${validation.errors.length} errors found`
          })
        }
      },
      error: (error) => {
        toast.error("Failed to parse CSV file", {
          description: error.message
        })
      }
    })
  }, [validateCSV])

  const applyAutoFill = () => {
    if (!validationResult) return

    const updatedData = validationResult.data.map(row => {
      const newRow = { ...row }
      
      // Apply auto-fill for null/empty values
      Object.entries(autoFillOptions).forEach(([field, value]) => {
        if (value && (!newRow[field] || newRow[field].toString().trim() === "")) {
          newRow[field] = value
        }
      })

      return newRow
    })

    setValidationResult({
      ...validationResult,
      data: updatedData
    })

    toast.success("Auto-fill applied successfully")
  }

  const handleBulkUpdate = async () => {
    if (!validationResult || !validationResult.isValid) {
      toast.error("Cannot update: Validation errors exist")
      return
    }

    setIsUpdating(true)
    setActiveTab("result")

    try {
      const response = await fetch("/api/gift-approval/bulk-update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tab: tab,
          data: validationResult.data,
          uploadedBy: user?.email || user?.id || "unknown",
          userDisplayName: user?.name || user?.email || "unknown",
          userId: user?.id || "unknown",
          userRole: user?.role || "",
          userPermissions: user?.permissions || {},
          advanceWorkflow: advanceWorkflow,
          autoFillOptions: autoFillOptions,
          auditDecision: tab === 'audit' ? auditDecision : undefined
        }),
      })

      const result = await response.json()

      setUpdateResult(result)

      if (result.success) {
        const successMessage = tab === 'audit' 
          ? `Bulk ${auditDecision === 'completed' ? 'completion' : 'issue marking'} completed successfully!`
          : "Bulk update completed successfully!"
        const description = tab === 'audit'
          ? `${result.updatedCount} records ${auditDecision === 'completed' ? 'completed' : 'marked as issue'}`
          : `Updated ${result.updatedCount} records`
        
        toast.success(successMessage, {
          description: description
        })
        onUpdateComplete?.(validationResult.data)
      } else {
        toast.error("Bulk update failed", {
          description: result.message
        })
      }
    } catch (error) {
      console.error("Bulk update error:", error)
      const errorResult: UpdateResult = {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
        updatedCount: 0,
        failedCount: validationResult.data.length
      }
      setUpdateResult(errorResult)
      toast.error("Bulk update failed", {
        description: "Network or server error"
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
    
    toast.success("Template downloaded", {
      description: "Fill in the template with your data"
    })
  }

  const downloadCurrentGifts = async () => {
    try {
      const response = await fetch(`/api/gift-approval/export-current?tab=${tab}`, {
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
        
        // Map database fields to CSV columns based on template
        if (tab === "processing") {
          row.giftId = gift.GIFT_ID
          row.giftItem = gift.GIFT_ITEM
          row.costMyr = gift.COST_MYR
          row.memberLogin = gift.MEMBER_LOGIN
          row.dispatcher = gift.DISPATCHER || ""
          row.trackingCode = gift.TRACKING_CODE || ""
          row.status = gift.TRACKING_STATUS || ""
          row.uploadedBo = gift.UPLOADED_BO ? "Yes" : "No"
        } else if (tab === "kam-proof") {
          row.giftId = gift.GIFT_ID
          row.giftItem = gift.GIFT_ITEM
          row.costMyr = gift.COST_MYR
          row.memberLogin = gift.MEMBER_LOGIN
          row.receiverFeedback = gift.GIFT_FEEDBACK || ""
        } else if (tab === "audit") {
          row.giftId = gift.GIFT_ID
          row.giftItem = gift.GIFT_ITEM
          row.memberLogin = gift.MEMBER_LOGIN
          row.remark = gift.AUDIT_REMARK || ""
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
      
      toast.success("Current gifts exported successfully!", {
        description: `${csvData.length} gifts exported for ${tab} stage`
      })
    } catch (error) {
      console.error("Export error:", error)
      toast.error("Failed to export current gifts", {
        description: error instanceof Error ? error.message : "Unknown error"
      })
    }
  }

  const resetDialog = () => {
    setValidationResult(null)
    setUpdateResult(null)
    setActiveTab("upload")
    setAutoFillOptions({})
    setAdvanceWorkflow(false)
    setAuditDecision('completed')
  }

  const config = getTemplateConfig()

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open)
      if (!open) {
        resetDialog()
      }
    }}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="!max-w-none w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Bulk Update - {tab.charAt(0).toUpperCase() + tab.slice(1)} Stage
          </DialogTitle>
          <DialogDescription>
            Export current gifts, make changes in Excel/CSV, then upload to update multiple records at once
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload">Upload CSV</TabsTrigger>
            <TabsTrigger value="preview" disabled={!validationResult}>Preview & Options</TabsTrigger>
            <TabsTrigger value="result" disabled={!updateResult}>Results</TabsTrigger>
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
                    <p className="text-sm text-gray-600 mt-1">
                      Download all current gifts in this stage to make changes directly
                    </p>
                    <div className="text-xs text-gray-500 mt-2">
                      <strong>Includes:</strong> All gifts currently in {tab} stage with their current values
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      <strong>Workflow:</strong> Export → Edit in Excel → Upload modified CSV
                    </div>
                  </div>
                  <Button onClick={downloadCurrentGifts} variant="outline" className="bg-green-50 border-green-200 hover:bg-green-100">
                    <Download className="h-4 w-4 mr-2" />
                    Export Current Gifts
                  </Button>
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
                    <p className="text-sm text-gray-600 mt-1">
                      Download the template and fill in your data
                    </p>
                    <div className="text-xs text-gray-500 mt-2">
                      <strong>Template columns:</strong> {config.template}
                    </div>
                    {config.readOnlyFields && (
                      <div className="text-xs text-orange-600 mt-1">
                        <strong>Read-only fields:</strong> {config.readOnlyFields.join(", ")} (for verification only)
                      </div>
                    )}
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
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            {validationResult && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Validation Results
                    </CardTitle>
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
                      <Alert className="mb-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="font-semibold mb-2">Validation Errors:</div>
                          <ul className="list-disc list-inside space-y-1">
                            {validationResult.errors.slice(0, 10).map((error, index) => (
                              <li key={index} className="text-sm">{error}</li>
                            ))}
                            {validationResult.errors.length > 10 && (
                              <li className="text-sm text-gray-600">
                                ... and {validationResult.errors.length - 10} more errors
                              </li>
                            )}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    {validationResult.warnings.length > 0 && (
                      <Alert className="mb-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="font-semibold mb-2">Warnings:</div>
                          <ul className="list-disc list-inside space-y-1">
                            {validationResult.warnings.map((warning, index) => (
                              <li key={index} className="text-sm text-yellow-600">{warning}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>

                {validationResult.isValid && (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle>Auto-Fill Options</CardTitle>
                        <CardDescription>
                          Fill empty values with default options
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {config.autoFillFields?.map((field: string) => (
                          <div key={field} className="space-y-2">
                            <Label htmlFor={field}>{field.charAt(0).toUpperCase() + field.slice(1)}</Label>
                            {field === "status" && tab === "processing" ? (
                              <Select
                                value={autoFillOptions[field as keyof AutoFillOptions] || ""}
                                onValueChange={(value) => setAutoFillOptions(prev => ({ ...prev, [field]: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select default status" />
                                </SelectTrigger>
                                <SelectContent>
                                  {config.statusOptions?.map((option: string) => (
                                    <SelectItem key={option} value={option}>{option}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : field === "uploadedBo" ? (
                              <Select
                                value={autoFillOptions[field as keyof AutoFillOptions] || ""}
                                onValueChange={(value) => setAutoFillOptions(prev => ({ ...prev, [field]: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select default BO status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Yes">Yes</SelectItem>
                                  <SelectItem value="No">No</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                id={field}
                                placeholder={`Default ${field}`}
                                value={autoFillOptions[field as keyof AutoFillOptions] || ""}
                                onChange={(e) => setAutoFillOptions(prev => ({ ...prev, [field]: e.target.value }))}
                              />
                            )}
                          </div>
                        ))}
                        
                        <Button onClick={applyAutoFill} variant="outline" className="w-full">
                          Apply Auto-Fill to Empty Values
                        </Button>
                      </CardContent>
                    </Card>

                    {config.canAdvanceWorkflow && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Workflow Options</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {tab === 'audit' ? (
                            <div className="space-y-3">
                              <div className="text-sm font-medium text-gray-700">Audit Decision:</div>
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    id="audit-completed"
                                    name="auditDecision"
                                    value="completed"
                                    checked={auditDecision === 'completed'}
                                    onChange={(e) => setAuditDecision(e.target.value as 'completed' | 'issue')}
                                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                  />
                                  <Label htmlFor="audit-completed" className="text-sm font-normal">
                                    Mark as Completed - Move to final stage
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    id="audit-issue"
                                    name="auditDecision"
                                    value="issue"
                                    checked={auditDecision === 'issue'}
                                    onChange={(e) => setAuditDecision(e.target.value as 'completed' | 'issue')}
                                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                  />
                                  <Label htmlFor="audit-issue" className="text-sm font-normal">
                                    Mark as Issue - Return to KAM Proof stage
                                  </Label>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="advanceWorkflow"
                                checked={advanceWorkflow}
                                onCheckedChange={(checked) => setAdvanceWorkflow(checked === true)}
                              />
                              <Label htmlFor="advanceWorkflow">
                                Advance all records to next workflow stage after update
                              </Label>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setActiveTab("upload")}>
                        Back to Upload
                      </Button>
                      <Button onClick={handleBulkUpdate} disabled={isUpdating}>
                        {isUpdating ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            {tab === 'audit' 
                              ? `${auditDecision === 'completed' ? 'Complete' : 'Mark as Issue'} ${validationResult.validRows} Records`
                              : `Update ${validationResult.validRows} Records`
                            }
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
                    {updateResult.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
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

                  <Alert className={updateResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                    <AlertDescription>
                      <div className="font-semibold mb-1">
                        {updateResult.success ? "Update Successful!" : "Update Failed"}
                      </div>
                      <div className="text-sm">{updateResult.message}</div>
                      {updateResult.batchId && (
                        <div className="text-xs text-gray-600 mt-2">
                          Batch ID: {updateResult.batchId}
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>

                  <div className="flex justify-end space-x-2 mt-4">
                    <Button variant="outline" onClick={resetDialog}>
                      Update More Records
                    </Button>
                    <Button onClick={() => setIsOpen(false)}>
                      Close
                    </Button>
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
