import { NextRequest, NextResponse } from "next/server";
import { SnowflakeFileUploader } from "@/lib/snowflake/file-upload";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const giftId = formData.get("giftId") as string;
    const uploadType = formData.get("uploadType") as string; // "mkt-proof" or "kam-proof"

    if (!file || !giftId || !uploadType) {
      return NextResponse.json(
        {
          success: false,
          message: "File, gift ID, and upload type are required",
        },
        { status: 400 }
      );
    }

    // Validate file size (20MB)
    const MAX_FILE_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          message: `File size must be less than 20MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
        },
        { status: 400 }
      );
    }

    // Validate file type
    const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          message: "Please upload an image file (JPEG, PNG, GIF, or WebP)",
        },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const filename = `${uploadType}-${giftId}-${timestamp}.${fileExtension}`;

    // Upload to Snowflake stage
    const uploadResult = await SnowflakeFileUploader.uploadFileToStage(
      buffer,
      filename,
      'MY_FLOW.PUBLIC.IMAGE_FILES'
    );

    if (!uploadResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: uploadResult.error || "Upload failed",
        },
        { status: 500 }
      );
    }

    // Get the public URL
    const imageUrl = await SnowflakeFileUploader.getFileUrl(filename, 'MY_FLOW.PUBLIC.IMAGE_FILES');

    return NextResponse.json({
      success: true,
      message: "Image uploaded successfully",
      data: {
        filename,
        imageUrl,
        fileSize: file.size,
        fileType: file.type,
      },
    });

  } catch (error) {
    console.error("Error uploading image:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to upload image",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
