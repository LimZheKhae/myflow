import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake/config'

// GET - Download file from Snowflake stage
export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const { filename } = params
    
    if (!filename) {
      return NextResponse.json(
        { error: 'Filename is required' },
        { status: 400 }
      )
    }

    // First, get the file metadata from the table
    const selectSQL = `
      SELECT 
        USER_ID,
        IMAGE_URL,
        FILE_NAME,
        UPLOADED_AT
      FROM MY_FLOW.PUBLIC.IMAGES
      WHERE FILE_NAME = ?
    `
    
    const result = await executeQuery(selectSQL, [filename])
    
    if (result.length === 0) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    const fileData = result[0]
    
    // Get the file from Snowflake stage using GET command
    const getSQL = `GET @MY_FLOW.PUBLIC.IMAGE_FILES/${filename} file:///tmp/`
    
    try {
      // Execute GET command to download file to temporary location
      await executeQuery(getSQL)
      
      // For now, we'll return the file metadata and URL
      // In a production environment, you would:
      // 1. Read the file from the temporary location
      // 2. Stream it back to the client
      // 3. Clean up the temporary file
      
      return NextResponse.json({
        success: true,
        message: 'File metadata retrieved successfully',
        data: {
          filename: fileData.FILE_NAME,
          imageUrl: fileData.IMAGE_URL,
          uploadedAt: fileData.UPLOADED_AT,
          userId: fileData.USER_ID,
          // Note: The actual file content would be streamed here
          // For now, returning metadata only
        }
      })
      
    } catch (getError) {
      console.error('Error getting file from stage:', getError)
      return NextResponse.json(
        { error: 'Failed to retrieve file from stage' },
        { status: 500 }
      )
    }
    
  } catch (error) {
    console.error('Download file error:', error)
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    )
  }
}
