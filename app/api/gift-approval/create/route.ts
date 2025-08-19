import { NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/snowflake/config";
import { GiftRequestForm, GiftCategory } from "@/types/gift";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vipId, giftItem, rewardName, rewardClubOrder, value, remark, category, createdBy }: GiftRequestForm & { createdBy: string } = body;

    // Validate required fields
    if (!giftItem || !category || !createdBy) {
      return NextResponse.json({ success: false, message: "Gift item, category, and created by are required" }, { status: 400 });
    }

    if (!["Birthday", "Retention", "High Roller", "Promotion", "Other"].includes(category)) {
      return NextResponse.json({ success: false, message: "Invalid category" }, { status: 400 });
    }

    // Parse value to determine currency
    const valueNum = parseFloat(value) || 0;
    let costMyr = null;
    let costVnd = null;

    // For now, assume MYR if value is provided (you can enhance this logic)
    if (valueNum > 0) {
      costMyr = valueNum;
    }

    // For individual gifts, we don't create a batch - BATCH_ID will be NULL
    const batchId = null;

    // Insert gift request
    const insertSQL = `
      INSERT INTO MY_FLOW.PUBLIC.GIFT_DETAILS (
        VIP_ID, BATCH_ID, KAM_REQUESTED_BY, CREATED_DATE, WORKFLOW_STATUS,
        MEMBER_LOGIN, FULL_NAME, PHONE, ADDRESS, REWARD_NAME, GIFT_ITEM,
        COST_MYR, COST_VND, REMARK, REWARD_CLUB_ORDER, CATEGORY,
        LAST_MODIFIED_DATE
      ) VALUES (?, ?, ?, CURRENT_TIMESTAMP(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP())
    `;

    const result = await executeQuery(insertSQL, [
      vipId || null,
      batchId,
      createdBy,
      "KAM_Request",
      null, // memberLogin - will be populated when VIP is linked
      null, // fullName - will be populated when VIP is linked
      null, // phone - will be populated when VIP is linked
      null, // address - will be populated when VIP is linked
      rewardName || null,
      giftItem,
      costMyr,
      costVnd,
      remark || null,
      rewardClubOrder || null,
      category,
    ]);

    const affectedRows = (result as any).affectedRows || 0;

    if (affectedRows === 0) {
      return NextResponse.json({ success: false, message: "Failed to create gift request" }, { status: 500 });
    }

    // Get the created gift ID
    const giftIdSQL = `
      SELECT GIFT_ID 
      FROM MY_FLOW.PUBLIC.GIFT_DETAILS 
      WHERE BATCH_ID = ? 
      ORDER BY CREATED_DATE DESC 
      LIMIT 1
    `;

    const giftIdResult = await executeQuery(giftIdSQL, [batchId]);
    const giftId = (giftIdResult as any[])[0]?.GIFT_ID;

    return NextResponse.json({
      success: true,
      message: "Gift request created successfully",
      data: {
        giftId,
        batchId: null, // Individual gifts don't have batch IDs
        workflowStatus: "KAM_Request",
      },
    });
  } catch (error) {
    console.error("Error creating gift request:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create gift request",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}