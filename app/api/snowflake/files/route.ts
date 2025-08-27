import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake/config'
import { SnowflakeFileUploader } from '@/lib/snowflake/file-upload'

// List files from IMAGES table
async function listFilesFromTable() {
  try {
    const selectSQL = `
      SELECT 
        USER_ID,
        IMAGE_URL,
        FILE_NAME,
        UPLOADED_AT
      FROM MY_FLOW.PUBLIC.IMAGES
      ORDER BY UPLOADED_AT DESC
    `
    const result = await executeQuery(selectSQL)
    
    console.log('Files from table:', result)
    return result
  } catch (error) {
    console.error('Error listing files from table:', error)
    throw error
  }
}

// List files from Snowflake stage using SQL
async function listFilesFromStage() {
  try {
    const files = await SnowflakeFileUploader.listFilesInStage()
    console.log('Files from stage:', files)
    return files
  } catch (error) {
    console.error('Error listing files from stage:', error)
    throw error
  }
}

// Get file metadata from table
async function getFileMetadata() {
  try {
      
      const metadataSQL = `
      SELECT 
      USER_ID,
      IMAGE_URL,
      FILE_NAME,
      UPLOADED_AT,
      COUNT(*) as total_files
      FROM MY_FLOW.PUBLIC.IMAGES
      GROUP BY USER_ID, IMAGE_URL, FILE_NAME, UPLOADED_AT
      `
    console.log('Executing query to list files metada from table:', metadataSQL)
    
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
    
    console.log('Starting to list files from table...')
    
    // List files from table
    const files = await listFilesFromTable()
    console.log('Files retrieved successfully:', files)
    
    let metadata = null
    if (includeMetadata && files.length > 0) {
      console.log('Fetching metadata...')
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
    console.error('List files error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to list files from Snowflake table',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
