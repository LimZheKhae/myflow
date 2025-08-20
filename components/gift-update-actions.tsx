"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle, XCircle, Truck, Camera, ClipboardCheck, AlertTriangle } from "lucide-react";
import { approveGift, rejectGift, updateProcessingInfo, submitKamProof, auditGift } from "@/lib/gift-update";
import { useAuth } from "@/contexts/firebase-auth-context";

interface GiftUpdateActionsProps {
  giftId: number;
  tab: string;
  currentStatus: string;
  onUpdateComplete?: () => void;
}

export function GiftUpdateActions({ giftId, tab, currentStatus, onUpdateComplete }: GiftUpdateActionsProps) {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [action, setAction] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Form states for different actions
  const [rejectReason, setRejectReason] = useState("");
  const [dispatcher, setDispatcher] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [trackingStatus, setTrackingStatus] = useState("");
  const [kamProof, setKamProof] = useState("");
  const [giftFeedback, setGiftFeedback] = useState("");
  const [auditRemark, setAuditRemark] = useState("");

  const handleAction = async () => {
    if (!user) {
      toast.error("User not authenticated");
      return;
    }

    setIsLoading(true);
    try {
      let result;

      switch (tab) {
        case "pending":
          if (action === "approve") {
            result = await approveGift(giftId, user.id, user.role, user.permissions);
          } else if (action === "reject") {
            result = await rejectGift(giftId, user.id, user.role, user.permissions, rejectReason);
          }
          break;

        case "processing":
          result = await updateProcessingInfo(giftId, user.id, user.role, user.permissions, {
            dispatcher,
            trackingCode,
            trackingStatus,
          });
          break;

        case "kam-proof":
          result = await submitKamProof(giftId, user.id, user.role, user.permissions, {
            kamProof,
            giftFeedback,
          });
          break;

        case "audit":
          result = await auditGift(giftId, user.id, user.role, user.permissions, action as "approve" | "reject", auditRemark);
          break;

        default:
          toast.error(`Unsupported tab: ${tab}`);
          return;
      }

      if (result?.success) {
        toast.success(result.message);
        setIsDialogOpen(false);
        onUpdateComplete?.();
        // Reset form
        setRejectReason("");
        setDispatcher("");
        setTrackingCode("");
        setTrackingStatus("");
        setKamProof("");
        setGiftFeedback("");
        setAuditRemark("");
        setAction("");
      } else {
        toast.error(result?.message || "Failed to update gift");
      }
    } catch (error) {
      toast.error("Failed to update gift");
      console.error("Update error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderActionButtons = () => {
    switch (tab) {
      case "pending":
        return (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAction("approve");
                setIsDialogOpen(true);
              }}
              disabled={!["KAM_Request", "Manager_Review"].includes(currentStatus)}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAction("reject");
                setIsDialogOpen(true);
              }}
              disabled={!["KAM_Request", "Manager_Review"].includes(currentStatus)}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
          </div>
        );

      case "processing":
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setAction("update");
              setIsDialogOpen(true);
            }}
            disabled={currentStatus !== "Manager_Review"}
          >
            <Truck className="h-4 w-4 mr-2" />
            Update Processing
          </Button>
        );

      case "kam-proof":
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setAction("submit");
              setIsDialogOpen(true);
            }}
            disabled={currentStatus !== "MKTOps_Processing"}
          >
            <Camera className="h-4 w-4 mr-2" />
            Submit Proof
          </Button>
        );

      case "audit":
        return (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAction("approve");
                setIsDialogOpen(true);
              }}
              disabled={currentStatus !== "KAM_Proof"}
            >
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Approve
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAction("reject");
                setIsDialogOpen(true);
              }}
              disabled={currentStatus !== "KAM_Proof"}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Reject
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  const renderDialogContent = () => {
    switch (tab) {
      case "pending":
        if (action === "reject") {
          return (
            <div className="space-y-4">
              <div>
                <Label htmlFor="rejectReason">Rejection Reason (Optional)</Label>
                <Textarea
                  id="rejectReason"
                  placeholder="Enter reason for rejection..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>
            </div>
          );
        }
        return (
          <div className="space-y-4">
            <p>Are you sure you want to approve this gift request?</p>
          </div>
        );

      case "processing":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="dispatcher">Dispatcher</Label>
              <Input
                id="dispatcher"
                placeholder="Enter dispatcher name"
                value={dispatcher}
                onChange={(e) => setDispatcher(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="trackingCode">Tracking Code</Label>
              <Input
                id="trackingCode"
                placeholder="Enter tracking code"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="trackingStatus">Tracking Status</Label>
              <Select value={trackingStatus} onValueChange={setTrackingStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="In Transit">In Transit</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                  <SelectItem value="Failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case "kam-proof":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="kamProof">KAM Proof</Label>
              <Textarea
                id="kamProof"
                placeholder="Enter proof details..."
                value={kamProof}
                onChange={(e) => setKamProof(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="giftFeedback">Gift Feedback</Label>
              <Textarea
                id="giftFeedback"
                placeholder="Enter gift feedback..."
                value={giftFeedback}
                onChange={(e) => setGiftFeedback(e.target.value)}
              />
            </div>
          </div>
        );

      case "audit":
        if (action === "reject") {
          return (
            <div className="space-y-4">
              <div>
                <Label htmlFor="auditRemark">Audit Remark (Optional)</Label>
                <Textarea
                  id="auditRemark"
                  placeholder="Enter audit remark..."
                  value={auditRemark}
                  onChange={(e) => setAuditRemark(e.target.value)}
                />
              </div>
            </div>
          );
        }
        return (
          <div className="space-y-4">
            <p>Are you sure you want to approve this gift?</p>
          </div>
        );

      default:
        return null;
    }
  };

  const getDialogTitle = () => {
    switch (tab) {
      case "pending":
        return action === "approve" ? "Approve Gift Request" : "Reject Gift Request";
      case "processing":
        return "Update Processing Information";
      case "kam-proof":
        return "Submit KAM Proof";
      case "audit":
        return action === "approve" ? "Approve Gift" : "Reject Gift";
      default:
        return "Update Gift";
    }
  };

  const getDialogDescription = () => {
    switch (tab) {
      case "pending":
        return action === "approve" 
          ? "This will approve the gift request and move it to processing."
          : "This will reject the gift request.";
      case "processing":
        return "Update the processing and tracking information for this gift.";
      case "kam-proof":
        return "Submit proof and feedback for the delivered gift.";
      case "audit":
        return action === "approve"
          ? "This will complete the gift approval process."
          : "This will reject the gift and require rework.";
      default:
        return "Update gift information.";
    }
  };

  return (
    <>
      {renderActionButtons()}
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
            <DialogDescription>{getDialogDescription()}</DialogDescription>
          </DialogHeader>
          
          {renderDialogContent()}
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleAction} disabled={isLoading}>
              {isLoading ? "Updating..." : action === "approve" ? "Approve" : action === "reject" ? "Reject" : "Update"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
