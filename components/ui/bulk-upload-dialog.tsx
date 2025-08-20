"use client"

import React, { useState, useCallback } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { FileUploader } from "@/components/ui/file-uploader"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle, Download, Eye, Database } from "lucide-react"
import Papa from "papaparse"
import { giftRequestFormSchema } from "@/types/gift"
import { getVIPPlayerByLogin } from "@/lib/vip-players"

interface BulkUploadDialogProps {
  module: string
  tab: string
  trigger: React.ReactNode
  onUploadComplete?: (data: any[]) => void
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

interface UploadResult {
  success: boolean
  message: string
  importedCount: number
  failedCount: number
  batchId?: string
}

export function BulkUploadDialog({ module, tab, trigger, onUploadComplete, user }: BulkUploadDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [activeTab, setActiveTab] = useState("upload")

  // CSV validation rules based on module and tab
  const getValidationRules = () => {
    const rules: Record<string, Record<string, any>> = {
      "gift-approval": {
        pending: {
          requiredFields: ["memberLogin", "giftItem", "costMyr", "category"],
          optionalFields: ["rewardName", "rewardClubOrder", "remark"],
          fieldTypes: {
            costMyr: "number",
            category: ["Birthday", "Retention", "High Roller", "Promotion", "Other"]
          }
        },
        processing: {
          requiredFields: ["giftId", "dispatcher", "trackingCode", "status"],
          fieldTypes: {
            status: ["In Transit", "Delivered", "Failed"]
          }
        },
        "kam-proof": {
          requiredFields: ["giftId", "proofFile", "receiverFeedback"],
          optionalFields: ["uploadedBy"]
        },
        audit: {
          requiredFields: ["giftId", "checkerName", "remark"],
          fieldTypes: {
            checkerName: "string"
          }
        }
      }
    }
    return rules[module]?.[tab] || {}
  }

  // Get VIP player data from memberLogin (using hardcoded data until database is ready)
  const getVIPPlayerFromMemberLogin = (memberLogin: string) => {
    // Trim the memberLogin to handle whitespace
    const trimmedMemberLogin = memberLogin.trim()
    
    if (trimmedMemberLogin && trimmedMemberLogin.length > 0) {
      return getVIPPlayerByLogin(trimmedMemberLogin)
    }
    
    return null
  }

  const validateCSV = useCallback((csvData: any[]): ValidationResult => {
    const rules = getValidationRules()
    const errors: string[] = []
    const warnings: string[] = []
    const validData: any[] = []

    csvData.forEach((row, index) => {
      const rowNumber = index + 2 // +2 because index starts at 0 and we skip header
      let rowValid = true

             // Special validation for pending tab (gift requests)
       if (tab === "pending") {
         try {
                       // First, validate memberLogin exists and get VIP player data
            if (!row.memberLogin || row.memberLogin.toString().trim() === "") {
              errors.push(`Row ${rowNumber}: Missing required field "memberLogin"`)
              rowValid = false
            } else {
              const vipPlayer = getVIPPlayerFromMemberLogin(row.memberLogin)
              if (!vipPlayer) {
                errors.push(`Row ${rowNumber}: Member login "${row.memberLogin.trim()}" not found in database`)
                rowValid = false
              } else {
                // Now transform CSV row to match Zod schema format with the VIP player data
                const giftRequestData = {
                  vipId: vipPlayer.vipId,
                  memberName: vipPlayer.memberName,
                  memberLogin: vipPlayer.memberLogin,
                  giftItem: row.giftItem || "",
                  rewardName: row.rewardName || "",
                  rewardClubOrder: row.rewardClubOrder || "",
                  value: row.costMyr?.toString() || "",
                  remark: row.remark || "",
                  category: row.category || "",
                }

               // Validate using Zod schema
               const validatedData = giftRequestFormSchema.parse(giftRequestData)

               if (rowValid) {
                 validData.push({
                   ...validatedData,
                   memberLogin: row.memberLogin.trim(), // Keep original memberLogin for reference
                   _rowNumber: rowNumber,
                   _uploadDate: new Date().toISOString(),
                   _uploadedBy: user?.id! // This would come from auth context
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
          if (!row[field] || row[field].toString().trim() === "") {
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
                  errors.push(`Row ${rowNumber}: Invalid value for "${field}". Expected one of: ${expectedType.join(", ")}`)
                  rowValid = false
                }
              } else if (expectedType === "number") {
                if (isNaN(Number(row[field]))) {
                  errors.push(`Row ${rowNumber}: "${field}" must be a number`)
                  rowValid = false
                }
              }
            }
          })
        }

        // Check for duplicate gift IDs in processing tab
        if (tab === "processing" && row.giftId) {
          const existingGift = validData.find(item => item.giftId === row.giftId)
          if (existingGift) {
            warnings.push(`Row ${rowNumber}: Duplicate gift ID "${row.giftId}"`)
          }
        }

        if (rowValid) {
          validData.push({
            ...row,
            _rowNumber: rowNumber,
            _uploadDate: new Date().toISOString(),
            _uploadedBy: user?.id! // This would come from auth context
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
      invalidRows: csvData.length - validData.length
    }
  }, [module, tab])

  const handleFileUpload = async (file: File | null) => {
    if (!file) return;
    try {
      setIsUploading(true)
      setValidationResult(null)
      setUploadResult(null)

      // Parse CSV
      const text = await file.text()
      const result = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transform: (value) => value.trim()
      })

      if (result.errors.length > 0) {
        toast.error("CSV parsing failed")
        return
      }

      // Validate data
      const validation = validateCSV(result.data)
      setValidationResult(validation)

      if (validation.isValid) {
        toast.success(`Validation successful! ${validation.validRows} rows ready for import`)
        setActiveTab("preview")
      } else {
        toast.error(`Validation failed! ${validation.errors.length} errors found`)
        setActiveTab("validation")
      }
    } catch (error) {
      toast.error("Failed to process file")
      console.error("File processing error:", error)
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
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tab,
          data: validationResult.data,
          batchId: `bulk_${Date.now()}`,
          uploadedBy: user?.id || "unknown-user",
          userDisplayName: user?.name || user?.email || user?.id || "unknown-user",
          userId: user?.id || "unknown-user",
          userRole: user?.role || "unknown-role",
          userPermissions: user?.permissions || {}
        }),
      })

      const result: UploadResult = await response.json()

      if (result.success) {
        setUploadResult(result)
        toast.success(`Successfully imported ${result.importedCount} records`)
        onUploadComplete?.(validationResult.data)
        setActiveTab("result")
      } else {
        toast.error(`Import failed: ${result.message}`)
      }
    } catch (error) {
      toast.error("Import failed")
      console.error("Import error:", error)
    } finally {
      setIsUploading(false)
    }
  }

  const handleRollback = async () => {
          if (!uploadResult?.batchId) return

    try {
      setIsUploading(true)

      const response = await fetch(`/api/${module}/bulk-rollback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          batchId: uploadResult.batchId
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success("Rollback successful")
        setUploadResult(null)
        setValidationResult(null)
        setIsOpen(false)
      } else {
        toast.error("Rollback failed")
      }
    } catch (error) {
      toast.error("Rollback failed")
      console.error("Rollback error:", error)
    } finally {
      setIsUploading(false)
    }
  }

  const downloadTemplate = () => {
    const rules = getValidationRules()
    
    let template: any = {
      headers: [...(rules.requiredFields || []), ...(rules.optionalFields || [])],
      sample: {}
    }

         // Special template for pending tab (gift requests)
     if (tab === "pending") {
       template = {
         headers: ["memberLogin", "giftItem", "costMyr", "category", "rewardName", "rewardClubOrder", "remark"],
         sample: {
           memberLogin: "user123",
           giftItem: "Gift Card",
           costMyr: "100",
           category: "Birthday",
           rewardName: "Birthday Reward",
           rewardClubOrder: "RCO-001",
           remark: "VIP birthday gift"
         }
       }
    } else {
      // Default template for other tabs
      template.sample = rules.requiredFields?.reduce((acc: any, field: string) => {
        acc[field] = `Sample ${field}`
        return acc
      }, {}) || {}
    }

    const csv = Papa.unparse([template.sample])
    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${module}-${tab}-template.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
             <DialogContent className="w-[98vw] max-w-none max-h-[95vh] overflow-y-auto min-w-[1200px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Bulk Upload - {tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
          </DialogTitle>
          <DialogDescription>
            Upload CSV file to bulk import {tab} data. All data will be validated before import.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="validation" disabled={!validationResult}>Validation</TabsTrigger>
            <TabsTrigger value="preview" disabled={!validationResult?.isValid}>Preview</TabsTrigger>
            <TabsTrigger value="result" disabled={!uploadResult}>Result</TabsTrigger>
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
                  <span className="text-sm text-gray-600">
                    Use the template to ensure correct format
                  </span>
                </div>

                <FileUploader
                  onFileSelect={handleFileUpload}
                  acceptedTypes=".csv"
                  maxSize={5} // 5MB
                  disabled={isUploading}
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
                              <p key={index} className="text-sm text-red-600">• {error}</p>
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
                              <p key={index} className="text-sm text-yellow-600">• {warning}</p>
                            ))}
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
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
                    <p className="text-sm text-gray-600">
                      Preview of first 5 rows to be imported:
                    </p>
                                         <div className="max-h-60 overflow-x-auto border rounded-lg">
                       <table className="w-full text-sm">
                         <thead className="bg-gray-50 sticky top-0">
                           <tr>
                             {Object.keys(validationResult.data[0] || {}).map((header) => (
                               <th key={header} className="px-3 py-2 text-left font-medium whitespace-nowrap min-w-[120px]">
                                 {header}
                               </th>
                             ))}
                           </tr>
                         </thead>
                         <tbody>
                           {validationResult.data.slice(0, 5).map((row, index) => (
                             <tr key={index} className="border-t">
                               {Object.values(row).map((value, cellIndex) => (
                                 <td key={cellIndex} className="px-3 py-2 whitespace-nowrap min-w-[120px]">
                                   {String(value)}
                                 </td>
                               ))}
                             </tr>
                           ))}
                         </tbody>
                       </table>
                     </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Total rows to import: {validationResult.data.length}
                    </p>
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
                      <p className="text-sm text-gray-600 mt-1">
                        Keep this ID for rollback purposes if needed.
                      </p>
                    </AlertDescription>
                  </Alert>

                  <div className="flex items-center justify-between">
                    <Button variant="outline" onClick={handleRollback} disabled={isUploading}>
                      {isUploading ? "Rolling back..." : "Rollback Import"}
                    </Button>
                    <Button onClick={() => setIsOpen(false)}>
                      Close
                    </Button>
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
