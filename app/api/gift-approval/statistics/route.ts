import { NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/snowflake/config";
import { GiftStatistics, WorkflowStatus, GiftCategory } from "@/types/gift";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract date range parameters
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    // Build WHERE clause for date filtering
    const whereConditions: string[] = ["1=1"];
    const params: any[] = [];

    if (dateFrom) {
      whereConditions.push("CREATED_DATE >= ?");
      params.push(dateFrom);
    }

    if (dateTo) {
      whereConditions.push("CREATED_DATE <= ?");
      params.push(dateTo);
    }

    // Include gifts from ACTIVE batches or manual gifts (no batch)
    whereConditions.push("(BATCH_ID IS NULL OR BATCH_ID IN (SELECT BATCH_ID FROM MY_FLOW.PUBLIC.BULK_IMPORT_BATCHES WHERE STATUS != 'INACTIVE'))");

    const whereClause = whereConditions.join(" AND ");

    // Get total counts and values
    const totalsSQL = `
      SELECT 
        COUNT(*) as totalGifts,
        SUM(COST_MYR) as totalValueMyr,
        SUM(COST_VND) as totalValueVnd,
        AVG(COST_MYR) as averageCostMyr,
        AVG(COST_VND) as averageCostVnd
      FROM MY_FLOW.PUBLIC.GIFT_DETAILS
      WHERE ${whereClause}
    `;

    const totalsResult = await executeQuery(totalsSQL, params);
    const totals = (totalsResult as any[])[0];

    // Get status breakdown
    const statusSQL = `
      SELECT 
        WORKFLOW_STATUS,
        COUNT(*) as count
      FROM MY_FLOW.PUBLIC.GIFT_DETAILS
      WHERE ${whereClause}
      GROUP BY WORKFLOW_STATUS
    `;

    const statusResult = await executeQuery(statusSQL, params);
    const statusRows = statusResult as any[];

    const statusBreakdown: Record<WorkflowStatus, number> = {
      KAM_Request: 0,
      Manager_Review: 0,
      MKTOps_Processing: 0,
      KAM_Proof: 0,
      SalesOps_Audit: 0,
      Completed: 0,
      Rejected: 0,
    };

    statusRows.forEach((row) => {
      if (row.WORKFLOW_STATUS in statusBreakdown) {
        statusBreakdown[row.WORKFLOW_STATUS as WorkflowStatus] = row.count;
      }
    });

    // Get category breakdown
    const categorySQL = `
      SELECT 
        CATEGORY,
        COUNT(*) as count
      FROM MY_FLOW.PUBLIC.GIFT_DETAILS
      WHERE ${whereClause}
      GROUP BY CATEGORY
    `;

    const categoryResult = await executeQuery(categorySQL, params);
    const categoryRows = categoryResult as any[];

    const categoryBreakdown: Record<GiftCategory, number> = {
      Birthday: 0,
      Retention: 0,
      "High Roller": 0,
      Promotion: 0,
      Other: 0,
    };

    categoryRows.forEach((row) => {
      if (row.CATEGORY in categoryBreakdown) {
        categoryBreakdown[row.CATEGORY as GiftCategory] = row.count;
      }
    });

    // Get recent activity (last 7 days)
    const recentActivitySQL = `
      SELECT 
        COUNT(*) as recentCount
      FROM MY_FLOW.PUBLIC.GIFT_DETAILS
      WHERE ${whereClause}
        AND CREATED_DATE >= DATEADD(day, -7, CURRENT_DATE())
    `;

    const recentResult = await executeQuery(recentActivitySQL, params);
    const recentCount = (recentResult as any[])[0]?.recentCount || 0;

    // Get top KAM requesters
    const topKAMSQL = `
      SELECT 
        KAM_REQUESTED_BY,
        COUNT(*) as requestCount,
        SUM(COST_MYR) as totalValue
      FROM MY_FLOW.PUBLIC.GIFT_DETAILS
      WHERE ${whereClause}
        AND KAM_REQUESTED_BY IS NOT NULL
      GROUP BY KAM_REQUESTED_BY
      ORDER BY requestCount DESC
      LIMIT 5
    `;

    const topKAMResult = await executeQuery(topKAMSQL, params);
    const topKAM = topKAMResult as any[];

    // Get monthly trends (last 6 months)
    const monthlyTrendSQL = `
      SELECT 
        DATE_TRUNC('month', CREATED_DATE) as month,
        COUNT(*) as count,
        SUM(COST_MYR) as totalValue
      FROM MY_FLOW.PUBLIC.GIFT_DETAILS
      WHERE ${whereClause}
        AND CREATED_DATE >= DATEADD(month, -6, CURRENT_DATE())
      GROUP BY DATE_TRUNC('month', CREATED_DATE)
      ORDER BY month DESC
    `;

    const monthlyTrendResult = await executeQuery(monthlyTrendSQL, params);
    const monthlyTrends = monthlyTrendResult as any[];

    const statistics: GiftStatistics = {
      totalGifts: totals.totalGifts || 0,
      totalValueMyr: totals.totalValueMyr || 0,
      totalValueVnd: totals.totalValueVnd || 0,
      pendingCount: statusBreakdown["Manager_Review"] || 0,
      processingCount: statusBreakdown["MKTOps_Processing"] || 0,
      completedCount: statusBreakdown["Completed"] || 0,
      rejectedCount: statusBreakdown["Rejected"] || 0,
      averageCostMyr: totals.averageCostMyr || 0,
      averageCostVnd: totals.averageCostVnd || 0,
      categoryBreakdown,
      statusBreakdown,
    };

    return NextResponse.json({
      success: true,
      data: {
        ...statistics,
        recentActivity: {
          last7Days: recentCount,
        },
        topKAMRequesters: topKAM.map((kam) => ({
          name: kam.KAM_REQUESTED_BY,
          requestCount: kam.requestCount,
          totalValue: kam.totalValue,
        })),
        monthlyTrends: monthlyTrends.map((trend) => ({
          month: trend.month,
          count: trend.count,
          totalValue: trend.totalValue,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching gift statistics:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch gift statistics",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
