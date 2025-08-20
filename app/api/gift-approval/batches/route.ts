import { NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/snowflake/config";
import { BulkImportBatch } from "@/types/gift";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract query parameters
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;
    const isActive = searchParams.get("isActive");
    const status = isActive === "true" ? true : isActive === "false" ? false : null;
    const uploadedBy = searchParams.get("uploadedBy");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    // Build WHERE clause
    const whereConditions: string[] = ["1=1"];
    const params: any[] = [];

    if (status !== null) {
      whereConditions.push("IS_ACTIVE = ?");
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
        IS_ACTIVE,
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
        BATCH_ID: row.BATCH_ID,
        BATCH_NAME: row.BATCH_NAME,
        UPLOADED_BY: row.UPLOADED_BY,
        TOTAL_ROWS: row.TOTAL_ROWS,
        IS_ACTIVE: row.IS_ACTIVE,
        CREATED_DATE: new Date(row.CREATED_DATE).toISOString(),
        COMPLETED_AT: row.COMPLETED_AT ? new Date(row.COMPLETED_AT).toISOString() : null,
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
    const { batchId, isActive, updatedBy } = body;

    if (!batchId || typeof isActive !== 'boolean' || !updatedBy) {
      return NextResponse.json({ success: false, message: "Batch ID, isActive (boolean), and updated by are required" }, { status: 400 });
    }

    const sql = `
      UPDATE MY_FLOW.PUBLIC.BULK_IMPORT_BATCHES
      SET 
        IS_ACTIVE = ?,
        COMPLETED_AT = CASE WHEN ? = FALSE THEN CURRENT_TIMESTAMP() ELSE COMPLETED_AT END
      WHERE BATCH_ID = ?
    `;

    const result = await executeQuery(sql, [isActive, isActive, batchId]);
    const affectedRows = (result as any).affectedRows || 0;

    if (affectedRows === 0) {
      return NextResponse.json({ success: false, message: "Batch not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Batch ${isActive ? "activated" : "deactivated"} successfully`,
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
