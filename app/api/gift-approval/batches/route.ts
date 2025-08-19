import { NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/snowflake/config";
import { BulkImportBatch, BatchStatus } from "@/types/gift";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract query parameters
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;
    const status = searchParams.get("status") as BatchStatus | null;
    const uploadedBy = searchParams.get("uploadedBy");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    // Build WHERE clause
    const whereConditions: string[] = ["1=1"];
    const params: any[] = [];

    if (status) {
      whereConditions.push("STATUS = ?");
      params.push(status);
    }

    if (uploadedBy) {
      whereConditions.push("UPLOADED_BY ILIKE ?");
      params.push(`%${uploadedBy}%`);
    }

    if (dateFrom) {
      whereConditions.push("CREATED_DATE >= ?");
      params.push(dateFrom);
    }

    if (dateTo) {
      whereConditions.push("CREATED_DATE <= ?");
      params.push(dateTo);
    }

    const whereClause = whereConditions.join(" AND ");

    // Count total records
    const countSQL = `
      SELECT COUNT(*) as total
      FROM MY_FLOW.PUBLIC.BULK_IMPORT_BATCHES
      WHERE ${whereClause}
    `;

    const countResult = await executeQuery(countSQL, params);
    const total = (countResult as any[])[0]?.total || 0;

    // Fetch paginated data
    const dataSQL = `
      SELECT 
        BATCH_ID,
        BATCH_NAME,
        UPLOADED_BY,
        TOTAL_ROWS,
        STATUS,
        CREATED_DATE,
        COMPLETED_AT
      FROM MY_FLOW.PUBLIC.BULK_IMPORT_BATCHES
      WHERE ${whereClause}
      ORDER BY CREATED_DATE DESC
      LIMIT ? OFFSET ?
    `;

    const dataParams = [...params, limit, offset];
    const result = await executeQuery(dataSQL, dataParams);

    // Transform the data and get additional statistics
    const batches: (BulkImportBatch & { giftCount: number; totalValue: number })[] = [];

    for (const row of result as any[]) {
      // Get gift count and total value for this batch
      const giftStatsSQL = `
        SELECT 
          COUNT(*) as giftCount,
          SUM(COST_MYR) as totalValue
        FROM MY_FLOW.PUBLIC.GIFT_DETAILS
        WHERE BATCH_ID = ?
      `;

      const giftStatsResult = await executeQuery(giftStatsSQL, [row.BATCH_ID]);
      const giftStats = (giftStatsResult as any[])[0];

      batches.push({
        batchId: row.BATCH_ID,
        batchName: row.BATCH_NAME,
        uploadedBy: row.UPLOADED_BY,
        totalRows: row.TOTAL_ROWS,
        status: row.STATUS,
        createdAt: new Date(row.CREATED_DATE),
        completedAt: row.COMPLETED_AT ? new Date(row.COMPLETED_AT) : undefined,
        giftCount: giftStats.giftCount || 0,
        totalValue: giftStats.totalValue || 0,
      });
    }

    return NextResponse.json({
      success: true,
      data: batches,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching batches:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch batches",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { batchId, status, updatedBy } = body;

    if (!batchId || !status || !updatedBy) {
      return NextResponse.json({ success: false, message: "Batch ID, status, and updated by are required" }, { status: 400 });
    }

    if (!["ACTIVE", "INACTIVE"].includes(status)) {
      return NextResponse.json({ success: false, message: "Status must be either ACTIVE or INACTIVE" }, { status: 400 });
    }

    const sql = `
      UPDATE MY_FLOW.PUBLIC.BULK_IMPORT_BATCHES
      SET 
        STATUS = ?,
        COMPLETED_AT = CASE WHEN ? = 'INACTIVE' THEN CURRENT_TIMESTAMP() ELSE COMPLETED_AT END
      WHERE BATCH_ID = ?
    `;

    const result = await executeQuery(sql, [status, status, batchId]);
    const affectedRows = (result as any).affectedRows || 0;

    if (affectedRows === 0) {
      return NextResponse.json({ success: false, message: "Batch not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Batch ${status === "ACTIVE" ? "activated" : "deactivated"} successfully`,
      affectedRows,
    });
  } catch (error) {
    console.error("Error updating batch status:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update batch status",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
