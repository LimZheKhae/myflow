import { NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/snowflake/config";
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const { filename } = params;
    const stageName = 'MY_FLOW.PUBLIC.IMAGE_FILES';

    if (!filename) {
      return NextResponse.json(
        {
          success: false,
          message: "Filename is required",
        },
        { status: 400 }
      );
    }

    // Create a temporary directory for this request
    const tempDir = path.join(os.tmpdir(), 'snowflake-files');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempFilePath = path.join(tempDir, filename);
    
    try {
      // Download file from Snowflake stage to temporary location
      const getSQL = `GET @${stageName}/${filename} file://${tempDir}/`;
      await executeQuery(getSQL);
      
      // Check if file was downloaded successfully
      if (!fs.existsSync(tempFilePath)) {
        return NextResponse.json(
          {
            success: false,
            message: "File not found in Snowflake stage",
          },
          { status: 404 }
        );
      }
      
      // Read the file
      const fileBuffer = fs.readFileSync(tempFilePath);
      
      // Determine content type based on file extension
      const ext = path.extname(filename).toLowerCase();
      let contentType = 'application/octet-stream';
      
      if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.gif') contentType = 'image/gif';
      else if (ext === '.webp') contentType = 'image/webp';
      
      // Clean up temporary file
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupError) {
        console.error('Failed to clean up temporary file:', cleanupError);
      }
      
      // Return the file as a download response with proper headers
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': fileBuffer.length.toString(),
          'Cache-Control': 'no-cache', // Don't cache downloads
        },
      });

    } catch (getError) {
      console.error('Error downloading file from stage:', getError);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to download file from Snowflake stage",
          error: getError instanceof Error ? getError.message : "Unknown error",
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Error downloading image:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to download image",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
