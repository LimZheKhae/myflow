import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake/config'

// List files in stage
async function listFilesInStage(stageName: string = 'MY_STAGE') {
  try {
    const listSQL = `LIST @${stageName}`
    const result = await executeQuery(listSQL)
    
    console.log('Files in stage:', result)
    return result
  } catch (error) {
    console.error('Error listing files in stage:', error)
    throw error
  }
}

// Get file metadata from stage
async function getFileMetadata(stageName: string = 'MY_STAGE') {
  try {
    const metadataSQL = `
      SELECT 
        METADATA$FILENAME as filename,
        METADATA$FILE_SIZE as file_size,
        METADATA$LAST_MODIFIED as last_modified,
        METADATA$FILE_ROW_NUMBER as row_number
      FROM @${stageName}
    `
    
    const result = await executeQuery(metadataSQL)
    
    console.log('File metadata:', result)
    return result
  } catch (error) {
    console.error('Error getting file metadata:', error)
    throw error
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeMetadata = searchParams.get('metadata') === 'true'
    
    try {
      // List files in stage
      const files = await listFilesInStage()
      
      let metadata = null
      if (includeMetadata && files.length > 0) {
        metadata = await getFileMetadata()
      }
      
      return NextResponse.json({
        success: true,
        data: {
          files,
          metadata,
          count: files.length
        }
      })
      
    } catch (error) {
      throw error
    }
    
  } catch (error) {
    console.error('List files error:', error)
    return NextResponse.json(
      { error: 'Failed to list files from Snowflake stage' },
      { status: 500 }
    )
  }
}
