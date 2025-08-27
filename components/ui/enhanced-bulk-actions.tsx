"use client"

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, CheckCircle, XCircle, FileText, Upload, ClipboardCheck, AlertCircle, Users, ArrowRight } from "lucide-react"

interface BulkActionProps {
  selectedCount: number
  tab: string
  onActionComplete: (result: any) => void
  user: {
    id: string
    name: string
    email: string
    role: string
    permissions: Record<string, any>
  }
}

interface BulkActionModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  action: string
  selectedGiftIds: number[]
  onConfirm: (data: any) => Promise<void>
  children: React.ReactNode
  confirmText: string
  confirmVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  icon: React.ComponentType<{ className?: string }>
}

const BulkActionModal: React.FC<BulkActionModalProps> = ({
  isOpen,
  onOpenChange,
  title,
  description,
  action,
  selectedGiftIds,
  onConfirm,
  children,
  confirmText,
  confirmVariant = "default",
  icon: Icon
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<Record<string, any>>({})

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      await onConfirm(formData)
      onOpenChange(false)
      setFormData({})
    } catch (error) {
      console.error(`Error performing ${action}:`, error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
            <div className="mt-2 p-2 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-800">
                <Users className="h-4 w-4 inline mr-1" />
                This will affect <span className="font-semibold">{selectedGiftIds.length}</span> selected gift(s)
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {React.Children.map(children, (child) => 
            React.isValidElement(child) 
              ? React.cloneElement(child, { formData, setFormData } as any)
              : child
          )}
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              variant={confirmVariant}
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Icon className="h-4 w-4 mr-2" />
                  {confirmText}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const EnhancedBulkActions: React.FC<BulkActionProps> = ({
  selectedCount,
  tab,
  onActionComplete,
  user
}) => {
  const [selectedGiftIds, setSelectedGiftIds] = useState<number[]>([])
  const [isModalOpen, setIsModalOpen] = useState<Record<string, boolean>>({})

  // Helper function to perform bulk action API call
  const performBulkAction = async (action: string, additionalData: any = {}) => {
    try {
      const response = await fetch("/api/gift-approval/bulk-actions", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          giftIds: selectedGiftIds,
          uploadedBy: user.id,
          tab,
          ...additionalData,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message || "Failed to perform bulk action")
      }

      toast.success(data.message || `Successfully performed ${action}`)
      onActionComplete(data)
      return data
    } catch (error) {
      toast.error(`Failed to perform ${action}`)
      throw error
    }
  }

  const openModal = (modalName: string) => {
    setIsModalOpen(prev => ({ ...prev, [modalName]: true }))
  }

  const closeModal = (modalName: string) => {
    setIsModalOpen(prev => ({ ...prev, [modalName]: false }))
  }

  // Update selected gift IDs (this should be passed from parent)
  React.useEffect(() => {
    // This would normally be passed from parent component
    // For now, we'll use a placeholder
    setSelectedGiftIds([])
  }, [selectedCount])

  // Tab-specific bulk actions based on BULK_ACTION_SYSTEM
  const getBulkActionsForTab = () => {
    switch (tab) {
      case 'pending':
        return (
          <>
            {/* Approve All to Processing */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => performBulkAction('bulk_approve_to_processing')}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve All ({selectedCount})
            </Button>

            {/* Reject with Reason */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => openModal('reject')}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject All ({selectedCount})
            </Button>

            <BulkActionModal
              isOpen={isModalOpen.reject || false}
              onOpenChange={(open) => open ? openModal('reject') : closeModal('reject')}
              title="Reject Selected Gifts"
              description="Please provide a reason for rejecting these gift requests. This reason will be applied to all selected gifts."
              action="bulk_reject_with_reason"
              selectedGiftIds={selectedGiftIds}
              onConfirm={(data) => performBulkAction('bulk_reject_with_reason', { reason: data.reason })}
              confirmText={`Reject ${selectedCount} Gift(s)`}
              confirmVariant="destructive"
              icon={XCircle}
            >
              <RejectForm />
            </BulkActionModal>
          </>
        )

      case 'processing':
        return (
          <>
            {/* Set All BO as Uploaded */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => performBulkAction('bulk_set_bo_uploaded', { uploadedBo: true })}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Upload className="h-4 w-4 mr-2" />
              Mark BO Uploaded ({selectedCount})
            </Button>

            {/* Proceed All to KAM Proof */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => openModal('proceedToKam')}
              className="bg-purple-600 text-white hover:bg-purple-700"
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Proceed to KAM Proof ({selectedCount})
            </Button>

            {/* Reject from Processing */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => openModal('rejectProcessing')}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject from Processing ({selectedCount})
            </Button>

            <BulkActionModal
              isOpen={isModalOpen.proceedToKam || false}
              onOpenChange={(open) => open ? openModal('proceedToKam') : closeModal('proceedToKam')}
              title="Proceed to KAM Proof Stage"
              description="This will move all selected gifts to the KAM Proof stage. Please ensure all required fields are completed."
              action="bulk_proceed_to_kam_proof"
              selectedGiftIds={selectedGiftIds}
              onConfirm={() => performBulkAction('bulk_proceed_to_kam_proof')}
              confirmText={`Proceed ${selectedCount} Gift(s)`}
              icon={ArrowRight}
            >
              <ProceedConfirmation />
            </BulkActionModal>

            <BulkActionModal
              isOpen={isModalOpen.rejectProcessing || false}
              onOpenChange={(open) => open ? openModal('rejectProcessing') : closeModal('rejectProcessing')}
              title="Reject from Processing"
              description="Please provide a reason for rejecting these gifts from processing (e.g., item sold out, supplier issues)."
              action="bulk_reject_from_processing"
              selectedGiftIds={selectedGiftIds}
              onConfirm={(data) => performBulkAction('bulk_reject_from_processing', { reason: data.reason })}
              confirmText={`Reject ${selectedCount} Gift(s)`}
              confirmVariant="destructive"
              icon={XCircle}
            >
              <RejectForm />
            </BulkActionModal>
          </>
        )

      case 'kam-proof':
        return (
          <>
            {/* Fill Feedback Only */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => openModal('fillFeedback')}
              className="bg-orange-600 text-white hover:bg-orange-700"
            >
              <FileText className="h-4 w-4 mr-2" />
              Fill Feedback ({selectedCount})
            </Button>

            {/* Fill Feedback & Proceed to Audit */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => openModal('fillFeedbackProceed')}
              className="bg-indigo-600 text-white hover:bg-indigo-700"
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Fill Feedback & Proceed ({selectedCount})
            </Button>

            {/* Direct Proceed to Audit */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => performBulkAction('bulk_proceed_to_audit')}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Proceed to Audit ({selectedCount})
            </Button>

            <BulkActionModal
              isOpen={isModalOpen.fillFeedback || false}
              onOpenChange={(open) => open ? openModal('fillFeedback') : closeModal('fillFeedback')}
              title="Fill Receiver Feedback"
              description="Add feedback for all selected gifts. This will not change the workflow status."
              action="bulk_fill_feedback_only"
              selectedGiftIds={selectedGiftIds}
              onConfirm={(data) => performBulkAction('bulk_fill_feedback_only', { receiverFeedback: data.feedback })}
              confirmText={`Save Feedback for ${selectedCount} Gift(s)`}
              icon={FileText}
            >
              <FeedbackForm />
            </BulkActionModal>

            <BulkActionModal
              isOpen={isModalOpen.fillFeedbackProceed || false}
              onOpenChange={(open) => open ? openModal('fillFeedbackProceed') : closeModal('fillFeedbackProceed')}
              title="Fill Feedback & Proceed to Audit"
              description="Add feedback for all selected gifts and move them to the audit stage."
              action="bulk_fill_feedback_and_proceed"
              selectedGiftIds={selectedGiftIds}
              onConfirm={(data) => performBulkAction('bulk_fill_feedback_and_proceed', { receiverFeedback: data.feedback })}
              confirmText={`Add Feedback & Proceed ${selectedCount} Gift(s)`}
              icon={ArrowRight}
            >
              <FeedbackForm />
            </BulkActionModal>
          </>
        )

      case 'audit':
        return (
          <>
            {/* Mark All as Completed */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => openModal('markCompleted')}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Mark as Completed ({selectedCount})
            </Button>

            {/* Mark All as Issue */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => openModal('markIssue')}
              className="bg-orange-600 text-white hover:bg-orange-700"
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Mark as Issue ({selectedCount})
            </Button>

            <BulkActionModal
              isOpen={isModalOpen.markCompleted || false}
              onOpenChange={(open) => open ? openModal('markCompleted') : closeModal('markCompleted')}
              title="Mark as Completed"
              description="Mark all selected gifts as completed. This will finalize the gift delivery process."
              action="bulk_mark_completed"
              selectedGiftIds={selectedGiftIds}
              onConfirm={(data) => performBulkAction('bulk_mark_completed', { 
                checkerName: user.name || user.email,
                auditRemark: data.remark 
              })}
              confirmText={`Complete ${selectedCount} Gift(s)`}
              icon={ClipboardCheck}
            >
              <AuditForm checkerName={user.name || user.email} />
            </BulkActionModal>

            <BulkActionModal
              isOpen={isModalOpen.markIssue || false}
              onOpenChange={(open) => open ? openModal('markIssue') : closeModal('markIssue')}
              title="Mark as Issue"
              description="Mark all selected gifts as having issues and return them to KAM Proof stage for review."
              action="bulk_mark_as_issue"
              selectedGiftIds={selectedGiftIds}
              onConfirm={(data) => performBulkAction('bulk_mark_as_issue', { 
                checkerName: user.name || user.email,
                auditRemark: data.remark 
              })}
              confirmText={`Mark as Issue ${selectedCount} Gift(s)`}
              confirmVariant="destructive"
              icon={AlertCircle}
            >
              <AuditForm checkerName={user.name || user.email} required />
            </BulkActionModal>
          </>
        )

      default:
        return null
    }
  }

  if (selectedCount === 0) return null

  return (
    <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200 transition-all duration-300 ease-in-out animate-in slide-in-from-top-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            <Users className="h-3 w-3 mr-1" />
            {selectedCount} gift(s) selected
          </Badge>
        </div>
        <div className="flex items-center space-x-2">
          {getBulkActionsForTab()}
          
          {/* Export Action - Available for all tabs */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => performBulkAction('export', {})}
            className="bg-purple-600 text-white hover:bg-purple-700"
          >
            <FileText className="h-4 w-4 mr-2" />
            Export ({selectedCount})
          </Button>
        </div>
      </div>
    </div>
  )
}

// Form Components for Modals
const RejectForm: React.FC<{ formData?: any; setFormData?: any }> = ({ formData, setFormData }) => (
  <div className="space-y-3">
    <div>
      <Label htmlFor="reason">Rejection Reason <span className="text-red-500">*</span></Label>
      <Textarea
        id="reason"
        placeholder="Enter the reason for rejection..."
        value={formData?.reason || ''}
        onChange={(e) => setFormData?.((prev: any) => ({ ...prev, reason: e.target.value }))}
        rows={3}
        className="mt-1"
      />
    </div>
  </div>
)

const FeedbackForm: React.FC<{ formData?: any; setFormData?: any }> = ({ formData, setFormData }) => (
  <div className="space-y-3">
    <div>
      <Label htmlFor="feedback">Receiver Feedback *</Label>
      <Textarea
        id="feedback"
        placeholder="Enter feedback about the gift delivery..."
        value={formData?.feedback || ''}
        onChange={(e) => setFormData?.((prev: any) => ({ ...prev, feedback: e.target.value }))}
        rows={3}
        className="mt-1"
      />
    </div>
  </div>
)

const AuditForm: React.FC<{ formData?: any; setFormData?: any; checkerName: string; required?: boolean }> = ({ 
  formData, 
  setFormData, 
  checkerName,
  required = false 
}) => (
  <div className="space-y-3">
    <div>
      <Label htmlFor="checkerName">Checker Name</Label>
      <Input
        id="checkerName"
        value={checkerName}
        disabled
        className="bg-gray-50 cursor-not-allowed"
      />
    </div>
    <div>
      <Label htmlFor="remark">Audit Remark {required && '*'}</Label>
      <Textarea
        id="remark"
        placeholder={required ? "Enter issue details..." : "Enter audit remarks (optional)..."}
        value={formData?.remark || ''}
        onChange={(e) => setFormData?.((prev: any) => ({ ...prev, remark: e.target.value }))}
        rows={3}
        className="mt-1"
      />
    </div>
  </div>
)

const ProceedConfirmation: React.FC<{ formData?: any; setFormData?: any }> = () => (
  <div className="space-y-3">
    <div className="p-3 bg-yellow-50 rounded-md border border-yellow-200">
      <div className="flex items-start">
        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
        <div className="text-sm text-yellow-800">
          <p className="font-medium">Validation Requirements</p>
          <p>Please ensure all selected gifts have:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Dispatcher assigned</li>
            <li>Tracking code provided</li>
            <li>Tracking status is "Completed"</li>
            <li>BO upload status is "TRUE"</li>
          </ul>
        </div>
      </div>
    </div>
    <p className="text-sm text-gray-600">
      Gifts that don't meet these requirements will be skipped.
    </p>
  </div>
)

export default EnhancedBulkActions
