import { GiftUpdateRequest, GiftUpdateResult } from "@/types/gift";

// Utility function to update gift requests
export async function updateGiftRequest(
  request: GiftUpdateRequest
): Promise<GiftUpdateResult> {
  try {
    const response = await fetch("/api/gift-approval/update", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    const result: GiftUpdateResult = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.message || `HTTP ${response.status}: ${response.statusText}`,
        error: result.error,
      };
    }

    return result;
  } catch (error) {
    console.error("Error updating gift request:", error);
    return {
      success: false,
      message: "Failed to update gift request",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Helper functions for specific tab updates
export async function approveGift(
  giftId: number,
  userId: string,
  userRole: string,
  userPermissions: Record<string, string[]>
): Promise<GiftUpdateResult> {
  return updateGiftRequest({
    giftId,
    tab: "pending",
    action: "approve",
    userId,
    userRole,
    userPermissions,
  });
}

export async function rejectGift(
  giftId: number,
  userId: string,
  userRole: string,
  userPermissions: Record<string, string[]>,
  rejectReason?: string
): Promise<GiftUpdateResult> {
  return updateGiftRequest({
    giftId,
    tab: "pending",
    action: "reject",
    userId,
    userRole,
    userPermissions,
    rejectReason,
  });
}

export async function updateProcessingInfo(
  giftId: number,
  userId: string,
  userRole: string,
  userPermissions: Record<string, string[]>,
  processingData: {
    dispatcher?: string;
    trackingCode?: string;
    trackingStatus?: string;
  }
): Promise<GiftUpdateResult> {
  return updateGiftRequest({
    giftId,
    tab: "processing",
    action: "update",
    userId,
    userRole,
    userPermissions,
    ...processingData,
  });
}

export async function submitKamProof(
  giftId: number,
  userId: string,
  userRole: string,
  userPermissions: Record<string, string[]>,
  proofData: {
    kamProof?: string;
    giftFeedback?: string;
  }
): Promise<GiftUpdateResult> {
  return updateGiftRequest({
    giftId,
    tab: "kam-proof",
    action: "submit",
    userId,
    userRole,
    userPermissions,
    ...proofData,
  });
}

export async function auditGift(
  giftId: number,
  userId: string,
  userRole: string,
  userPermissions: Record<string, string[]>,
  action: "approve" | "reject",
  auditRemark?: string
): Promise<GiftUpdateResult> {
  return updateGiftRequest({
    giftId,
    tab: "audit",
    action,
    userId,
    userRole,
    userPermissions,
    auditRemark,
  });
}
