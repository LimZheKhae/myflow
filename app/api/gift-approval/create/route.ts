import { NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/snowflake/config";
import { GiftRequestForm, GiftCategory } from "@/types/gift";
import { debugSQL } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      vipId,
      memberName,
      memberLogin,
      giftItem,
      rewardName,
      rewardClubOrder,
      costMyr,
      costVnd,
      remark,
      category,
      userId,
      userRole,
      userPermissions,
    }: GiftRequestForm & {
      userId: string;
      costMyr: number;
      costVnd: number | null;
      userRole?: string;
      userPermissions?: Record<string, string[]>;
    } = body;

    // Validate required fields
    if (!giftItem || !vipId || !costMyr || !category || !userId || !memberName || !memberLogin) {
      return NextResponse.json(
        {
          success: false,
          message: "Gift item, VIP Player, member name, member login, value, category, and Firebase User ID are required",
        },
        { status: 400 }
      );
    }

    // Basic user ID validation (should be a non-empty string)
    if (typeof userId !== 'string' || userId.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid user ID format",
        },
        { status: 400 }
      );
    }

    // Server-side role validation using client-provided data
    if (!userRole) {
      return NextResponse.json(
        {
          success: false,
          message: "User role is required",
        },
        { status: 400 }
      );
    }

    // Check if user has KAM or Admin role
    if (!["KAM", "ADMIN"].includes(userRole)) {
      return NextResponse.json(
        {
          success: false,
          message: "Insufficient role permissions. Only KAM and Admin users can create gift requests.",
        },
        { status: 403 }
      );
    }

    // Check if user has ADD permission for gift-approval module
    if (!userPermissions || !userPermissions["gift-approval"] || !userPermissions["gift-approval"].includes("ADD")) {
      return NextResponse.json(
        {
          success: false,
          message: "Insufficient module permissions. ADD permission required for gift-approval module.",
        },
        { status: 403 }
      );
    }

    // Validate category (remove the incorrect validation)
    // Category validation should be handled by frontend Zod schema
    // Backend will accept any valid category from the GiftCategory type

    // Validate cost value
    if (costMyr <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Value must be a positive number",
        },
        { status: 400 }
      );
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
    
    const insertParams = [
      vipId,
      batchId,
      userId, // Use user ID from request body
      "KAM_Request",
      memberLogin, // Use memberLogin from request
      memberName, // Use memberName from request
      null, // phone - will be populated when VIP is linked
      null, // address - will be populated when VIP is linked
      rewardName || null,
      giftItem,
      costMyr,
      costVnd,
      remark || null,
      rewardClubOrder || null,
      category,
    ];
    
    // Debug the SQL query and parameters
    debugSQL(insertSQL, insertParams, "Gift Request Insert");
    
    const result = await executeQuery(insertSQL, insertParams);
    
    // Debug the result structure
    console.log("🔍 Insert Result Structure:", {
      result: result,
      resultType: typeof result,
      isArray: Array.isArray(result),
      length: Array.isArray(result) ? result.length : 'N/A',
      keys: result && typeof result === 'object' ? Object.keys(result) : 'N/A',
      firstElement: Array.isArray(result) ? result[0] : 'N/A',
      rowsInserted: Array.isArray(result) && result[0] ? result[0]['number of rows inserted'] : 'N/A'
    });

    // Check if the insert was successful based on the actual Snowflake result structure
    const rowsInserted = Array.isArray(result) && result[0] ? result[0]['number of rows inserted'] : 0;
    
    if (rowsInserted === 0) {
      return NextResponse.json({ success: false, message: "Failed to create gift request - no rows affected" }, { status: 500 });
    }



    // Update the WORKFLOW_STATUS to Manager_Review for all KAM_Request gifts created today by this user
    const updateWorkflowSQL = `
      UPDATE MY_FLOW.PUBLIC.GIFT_DETAILS 
      SET WORKFLOW_STATUS = ?, LAST_MODIFIED_DATE = CURRENT_TIMESTAMP()
      WHERE KAM_REQUESTED_BY = ? 
        AND WORKFLOW_STATUS = 'KAM_Request'
        AND DATE(CREATED_DATE) = CURRENT_DATE()
    `;

    const updateWorkflowParams = ["Manager_Review", userId];
    
    // Debug the workflow update query
    debugSQL(updateWorkflowSQL, updateWorkflowParams, "Workflow Status Update");
    
    const updateResult = await executeQuery(updateWorkflowSQL, updateWorkflowParams);
    
    // Debug the update result
    console.log("🔍 Update Result Structure:", {
      result: updateResult,
      resultType: typeof updateResult,
      isArray: Array.isArray(updateResult),
      length: Array.isArray(updateResult) ? updateResult.length : 'N/A',
      keys: updateResult && typeof updateResult === 'object' ? Object.keys(updateResult) : 'N/A',
      firstElement: Array.isArray(updateResult) ? updateResult[0] : 'N/A',
      rowsUpdated: Array.isArray(updateResult) && updateResult[0] ? updateResult[0]['number of rows updated'] : 'N/A'
    });

    // Check if the update was successful
    const rowsUpdated = Array.isArray(updateResult) && updateResult[0] ? updateResult[0]['number of rows updated'] : 0;
    
    if (rowsUpdated === 0) {
      console.warn("⚠️ Warning: Gift request created but workflow status update failed - no KAM_Request records found for today");
      // Don't fail the entire request, just log a warning
    } else {
      console.log(`✅ Successfully updated ${rowsUpdated} gift request(s) to Manager_Review status`);
    }

    // Note: Activity logging removed since we don't have user ID on server side
    // You can implement this later with proper server-side authentication

    return NextResponse.json({
      success: true,
      message: "Gift request created successfully and moved to Manager Review",
      data: {
        batchId: null, // Individual gifts don't have batch IDs
        workflowStatus: "Manager_Review",
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
