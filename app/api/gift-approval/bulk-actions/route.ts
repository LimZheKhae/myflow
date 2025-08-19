import { NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/snowflake/config";
import { WorkflowStatus, TrackingStatus } from "@/types/gift";

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      action,
      giftIds,
      workflowStatus,
      trackingStatus,
      dispatcher,
      trackingCode,
      kamProof,
      giftFeedback,
      auditRemark,
      uploadedBy,
      reason, // for rejections
    } = body;

    // Validate required fields
    if (!action || !giftIds || !Array.isArray(giftIds) || giftIds.length === 0) {
      return NextResponse.json({ success: false, message: "Action, giftIds array, and uploadedBy are required" }, { status: 400 });
    }

    if (!uploadedBy) {
      return NextResponse.json({ success: false, message: "uploadedBy is required for audit trail" }, { status: 400 });
    }

    // Validate action types
    const validActions = ["approve", "reject", "process", "upload_proof", "complete_audit", "update_tracking", "bulk_status_change"];

    if (!validActions.includes(action)) {
      return NextResponse.json({ success: false, message: `Invalid action. Must be one of: ${validActions.join(", ")}` }, { status: 400 });
    }

    // Validate required fields based on action
    if (action === "approve" && !workflowStatus) {
      return NextResponse.json({ success: false, message: "workflowStatus is required for approve action" }, { status: 400 });
    }

    if (action === "reject" && !reason) {
      return NextResponse.json({ success: false, message: "reason is required for reject action" }, { status: 400 });
    }

    if (action === "process" && (!dispatcher || !trackingCode || !trackingStatus)) {
      return NextResponse.json({ success: false, message: "dispatcher, trackingCode, and trackingStatus are required for process action" }, { status: 400 });
    }

    if (action === "complete_audit" && !auditRemark) {
      return NextResponse.json({ success: false, message: "auditRemark is required for complete_audit action" }, { status: 400 });
    }

    // Build update fields based on action
    let updateFields: string[] = [];
    let updateParams: any[] = [];

    switch (action) {
      case "approve":
        updateFields.push("WORKFLOW_STATUS = ?");
        updateParams.push(workflowStatus);
        updateFields.push("APPROVAL_REVIEWED_BY = ?");
        updateParams.push(uploadedBy);
        break;

      case "reject":
        updateFields.push("WORKFLOW_STATUS = ?");
        updateParams.push("Rejected");
        updateFields.push("AUDIT_REMARK = ?");
        updateParams.push(reason);
        updateFields.push("AUDITED_BY = ?");
        updateParams.push(uploadedBy);
        updateFields.push("AUDIT_DATE = CURRENT_TIMESTAMP()");
        break;

      case "process":
        updateFields.push("WORKFLOW_STATUS = ?");
        updateParams.push("MKTOps_Processing");
        updateFields.push("DISPATCHER = ?");
        updateParams.push(dispatcher);
        updateFields.push("TRACKING_CODE = ?");
        updateParams.push(trackingCode);
        updateFields.push("TRACKING_STATUS = ?");
        updateParams.push(trackingStatus);
        updateFields.push("PURCHASED_BY = ?");
        updateParams.push(uploadedBy);
        updateFields.push("MKT_PURCHASE_DATE = CURRENT_TIMESTAMP()");
        break;

      case "upload_proof":
        updateFields.push("WORKFLOW_STATUS = ?");
        updateParams.push("KAM_Proof");
        if (kamProof !== undefined) {
          updateFields.push("KAM_PROOF = ?");
          updateParams.push(kamProof);
        }
        if (giftFeedback !== undefined) {
          updateFields.push("GIFT_FEEDBACK = ?");
          updateParams.push(giftFeedback);
        }
        updateFields.push("KAM_PROOF_BY = ?");
        updateParams.push(uploadedBy);
        break;

      case "complete_audit":
        updateFields.push("WORKFLOW_STATUS = ?");
        updateParams.push("Completed");
        updateFields.push("AUDIT_REMARK = ?");
        updateParams.push(auditRemark);
        updateFields.push("AUDITED_BY = ?");
        updateParams.push(uploadedBy);
        updateFields.push("AUDIT_DATE = CURRENT_TIMESTAMP()");
        break;

      case "update_tracking":
        if (trackingStatus) {
          updateFields.push("TRACKING_STATUS = ?");
          updateParams.push(trackingStatus);
        }
        if (dispatcher) {
          updateFields.push("DISPATCHER = ?");
          updateParams.push(dispatcher);
        }
        if (trackingCode) {
          updateFields.push("TRACKING_CODE = ?");
          updateParams.push(trackingCode);
        }
        break;

      case "bulk_status_change":
        if (workflowStatus) {
          updateFields.push("WORKFLOW_STATUS = ?");
          updateParams.push(workflowStatus);
        }
        if (trackingStatus) {
          updateFields.push("TRACKING_STATUS = ?");
          updateParams.push(trackingStatus);
        }
        break;
    }

    // Always update last modified date
    updateFields.push("LAST_MODIFIED_DATE = CURRENT_TIMESTAMP()");

    if (updateFields.length === 0) {
      return NextResponse.json({ success: false, message: "No fields to update" }, { status: 400 });
    }

    // Build the WHERE clause for multiple gift IDs
    const placeholders = giftIds.map(() => "?").join(",");
    const whereClause = `GIFT_ID IN (${placeholders}) AND (BATCH_ID IS NULL OR BATCH_ID IN (SELECT BATCH_ID FROM MY_FLOW.PUBLIC.BULK_IMPORT_BATCHES WHERE STATUS != 'INACTIVE'))`;

    const sql = `
      UPDATE MY_FLOW.PUBLIC.GIFT_DETAILS
      SET ${updateFields.join(", ")}
      WHERE ${whereClause}
    `;

    // Add gift IDs to parameters
    const allParams = [...updateParams, ...giftIds];

    const result = await executeQuery(sql, allParams);
    const affectedRows = (result as any).affectedRows || 0;

    if (affectedRows === 0) {
      return NextResponse.json({ success: false, message: "No gifts found or no changes made" }, { status: 404 });
    }

    // Get updated gift details for response
    const updatedGiftsSQL = `
      SELECT GIFT_ID, WORKFLOW_STATUS, TRACKING_STATUS, LAST_MODIFIED_DATE
      FROM MY_FLOW.PUBLIC.GIFT_DETAILS
      WHERE GIFT_ID IN (${placeholders})
      ORDER BY GIFT_ID
    `;

    const updatedGiftsResult = await executeQuery(updatedGiftsSQL, giftIds);
    const updatedGifts = updatedGiftsResult as any[];

    return NextResponse.json({
      success: true,
      message: `Bulk ${action} completed successfully`,
      data: {
        action,
        totalRequested: giftIds.length,
        affectedRows,
        updatedGifts: updatedGifts.map((gift) => ({
          giftId: gift.GIFT_ID,
          workflowStatus: gift.WORKFLOW_STATUS,
          trackingStatus: gift.TRACKING_STATUS,
          lastModified: gift.LAST_MODIFIED_DATE,
        })),
      },
    });
  } catch (error) {
    console.error("Error performing bulk action:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to perform bulk action",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
