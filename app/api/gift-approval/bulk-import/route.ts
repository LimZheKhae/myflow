import { NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/snowflake/config";
import type { BulkImportResult, PendingTabRow, ProcessingTabRow, KamProofTabRow, AuditTabRow } from "@/types/gift";

interface BulkImportRequest {
  tab: string;
  data: any[];
  uploadedBy: string;
  batchName?: string;
  description?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { tab, data, uploadedBy, batchName: requestBatchName, description }: BulkImportRequest = await request.json();

    if (!data || data.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No data provided for import",
        importedCount: 0,
        failedCount: 0,
        batchId: "",
      } as BulkImportResult);
    }

    // Generate unique batch name
    const batchName = `BATCH_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    let importedCount = 0;
    let failedCount = 0;
    const failedRows: any[] = [];
    let totalValue = 0;
    let batchId: number | undefined;

    // Start transaction
    await executeQuery("BEGIN TRANSACTION");

    try {
      // Create batch record first
      const batchSQL = `
        INSERT INTO MY_FLOW.PUBLIC.BULK_IMPORT_BATCHES (
          BATCH_NAME, UPLOADED_BY, TOTAL_ROWS, STATUS, CREATED_DATE
        ) VALUES (?, ?, ?, 'ACTIVE', CURRENT_TIMESTAMP())
      `;

      await executeQuery(batchSQL, [requestBatchName || `Bulk Import ${tab}`, uploadedBy, data.length]);

      // Get the generated batch ID
      const batchIdResult = await executeQuery(
        `
        SELECT BATCH_ID 
        FROM MY_FLOW.PUBLIC.BULK_IMPORT_BATCHES 
        WHERE BATCH_NAME = ? AND UPLOADED_BY = ? 
        ORDER BY CREATED_DATE DESC 
        LIMIT 1
      `,
        [requestBatchName || `Bulk Import ${tab}`, uploadedBy]
      );

      batchId = (batchIdResult as any[])[0]?.BATCH_ID;

      // NOTE: This implementation assumes all rows are pre-validated on frontend
      // Alternative approach: Attempt import of all rows and handle failures individually
      // This would allow partial imports where some rows succeed and others fail

      switch (tab) {
        case "pending":
          // Import gift requests with batch tracking
          for (const row of data) {
            try {
              const insertSQL = `
                INSERT INTO MY_FLOW.PUBLIC.GIFT_DETAILS (
                  VIP_ID, BATCH_ID, KAM_REQUESTED_BY, CREATED_DATE, WORKFLOW_STATUS,
                  MEMBER_LOGIN, FULL_NAME, PHONE, ADDRESS, REWARD_NAME, GIFT_ITEM,
                  COST_MYR, COST_VND, REMARK, REWARD_CLUB_ORDER, CATEGORY,
                  LAST_MODIFIED_DATE
                ) VALUES (?, ?, ?, CURRENT_TIMESTAMP(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP())
              `;

              const costMyr = row.costMyr ? parseFloat(row.costMyr) : null;
              const costVnd = row.costVnd ? parseFloat(row.costVnd) : null;
              if (costMyr) totalValue += costMyr;

              await executeQuery(insertSQL, [row.vipId || null, batchId, uploadedBy, "KAM_Request", row.memberLogin, row.fullName, row.phone, row.address, row.rewardName, row.giftItem, costMyr, costVnd, row.remark, row.rewardClubOrder, row.category]);

              importedCount++;
            } catch (error) {
              failedCount++;
              const errorMessage = error instanceof Error ? error.message : "Unknown error";
              failedRows.push({ row, error: errorMessage });
            }
          }
          break;

        case "processing":
          // Update existing gifts with MKTOps data and batch tracking
          for (const row of data) {
            try {
              const updateSQL = `
                UPDATE MY_FLOW.PUBLIC.GIFT_DETAILS 
                SET 
                  WORKFLOW_STATUS = 'MKTOps_Processing',
                  DISPATCHER = ?,
                  TRACKING_CODE = ?,
                  TRACKING_STATUS = ?,
                  BATCH_ID = ?,
                  LAST_MODIFIED_DATE = CURRENT_TIMESTAMP()
                WHERE GIFT_ID = ?
              `;

              const result = await executeQuery(updateSQL, [row.dispatcher, row.trackingCode, row.trackingStatus, batchId, row.giftId]);

              if ((result as any).affectedRows > 0) {
                importedCount++;
              } else {
                failedCount++;
                failedRows.push({ row, error: "Gift ID not found" });
              }
            } catch (error) {
              failedCount++;
              const errorMessage = error instanceof Error ? error.message : "Unknown error";
              failedRows.push({ row, error: errorMessage });
            }
          }
          break;

        case "kam-proof":
          // Update gifts with KAM proof data and batch tracking
          for (const row of data) {
            try {
              const updateSQL = `
                UPDATE MY_FLOW.PUBLIC.GIFT_DETAILS 
                SET 
                  WORKFLOW_STATUS = 'KAM_Proof',
                  KAM_PROOF = ?,
                  GIFT_FEEDBACK = ?,
                  KAM_PROOF_BY = ?,
                  BATCH_ID = ?,
                  LAST_MODIFIED_DATE = CURRENT_TIMESTAMP()
                WHERE GIFT_ID = ?
              `;

              const result = await executeQuery(updateSQL, [row.kamProof, row.giftFeedback, uploadedBy, batchId, row.giftId]);

              if ((result as any).affectedRows > 0) {
                importedCount++;
              } else {
                failedCount++;
                failedRows.push({ row, error: "Gift ID not found" });
              }
            } catch (error) {
              failedCount++;
              const errorMessage = error instanceof Error ? error.message : "Unknown error";
              failedRows.push({ row, error: errorMessage });
            }
          }
          break;

        case "audit":
          // Update gifts with audit data and batch tracking
          for (const row of data) {
            try {
              const updateSQL = `
                UPDATE MY_FLOW.PUBLIC.GIFT_DETAILS 
                SET 
                  WORKFLOW_STATUS = 'SalesOps_Audit',
                  AUDITED_BY = ?,
                  AUDIT_REMARK = ?,
                  AUDIT_DATE = CURRENT_TIMESTAMP(),
                  BATCH_ID = ?,
                  LAST_MODIFIED_DATE = CURRENT_TIMESTAMP()
                WHERE GIFT_ID = ?
              `;

              const result = await executeQuery(updateSQL, [uploadedBy, row.auditRemark, batchId, row.giftId]);

              if ((result as any).affectedRows > 0) {
                importedCount++;
              } else {
                failedCount++;
                failedRows.push({ row, error: "Gift ID not found" });
              }
            } catch (error) {
              failedCount++;
              const errorMessage = error instanceof Error ? error.message : "Unknown error";
              failedRows.push({ row, error: errorMessage });
            }
          }
          break;

        default:
          throw new Error(`Unsupported tab: ${tab}`);
      }

      // Update batch record with final status
      const updateBatchSQL = `
        UPDATE MY_FLOW.PUBLIC.BULK_IMPORT_BATCHES 
        SET 
          STATUS = 'ACTIVE',
          COMPLETED_AT = CURRENT_TIMESTAMP()
        WHERE BATCH_ID = ?
      `;

      await executeQuery(updateBatchSQL, [batchId]);

      // Log the transaction
      const logSQL = `
        INSERT INTO MY_FLOW.PUBLIC.BULK_IMPORT_LOGS (
          BATCH_ID, MODULE, TAB, UPLOADED_BY, TOTAL_ROWS, 
          SUCCESSFUL_ROWS, FAILED_ROWS, STATUS, CREATED_AT
        ) VALUES (?, 'gift-approval', ?, ?, ?, ?, ?, 'COMPLETED', CURRENT_TIMESTAMP())
      `;

      await executeQuery(logSQL, [batchId, tab, uploadedBy, data.length, importedCount, failedCount]);

      // Commit transaction
      await executeQuery("COMMIT");

      return NextResponse.json({
        success: true,
        message: `Successfully imported ${importedCount} records`,
        importedCount,
        failedCount,
        batchId: batchId?.toString() || "",
        totalValue,
        failedRows: failedRows.length > 0 ? failedRows : undefined,
      } as BulkImportResult);
    } catch (error) {
      // Rollback transaction on error
      await executeQuery("ROLLBACK");

      // Update batch record to failed status
      const updateBatchSQL = `
        UPDATE MY_FLOW.PUBLIC.BULK_IMPORT_BATCHES 
        SET 
          STATUS = 'INACTIVE',
          COMPLETED_AT = CURRENT_TIMESTAMP()
        WHERE BATCH_ID = ?
      `;

      await executeQuery(updateBatchSQL, [batchId]);

      // Log failed transaction
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Bulk import failed:", errorMessage);

      throw error;
    }
  } catch (error) {
    console.error("Bulk import error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        message: errorMessage || "Bulk import failed",
        importedCount: 0,
        failedCount: 0,
        batchId: "unknown",
      } as BulkImportResult,
      { status: 500 }
    );
  }
}
