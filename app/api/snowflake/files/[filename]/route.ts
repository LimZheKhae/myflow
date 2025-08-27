import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake/config'
import { SnowflakeFileUploader } from '@/lib/snowflake/file-upload'

// Get file from table
async function getFileFromTable(filename: string) {
  try {
    const selectSQL = `
      SELECT 
        USER_ID,
        IMAGE_URL,
        FILE_NAME,
        UPLOADED_AT
      FROM MY_FLOW.PUBLIC.IMAGES
      WHERE FILE_NAME = ?
    `
    console.log('Executing query to get file from table 123:', selectSQL)
    const result = await executeQuery(selectSQL, [filename])
    
    if (result.length === 0) {
      throw new Error('File not found in table')
    }
    
    console.log(`File ${filename} found in table`)
    return { success: true, message: 'File retrieved successfully', data: result[0] }
  } catch (error) {
    console.error('Error getting file from table:', error)
    throw error
  }
}

// Delete file from table and stage
async function deleteFileFromTable(filename: string) {
  try {
    // First delete from stage
    const stageDeleteResult = await SnowflakeFileUploader.deleteFileFromStage(filename)
    if (!stageDeleteResult.success) {
      console.warn('Failed to delete from stage:', stageDeleteResult.error)
    }
    
    // Then delete from table
    const deleteSQL = `DELETE FROM MY_FLOW.PUBLIC.IMAGES WHERE FILE_NAME = ?`
    await executeQuery(deleteSQL, [filename])
    
    console.log(`File ${filename} removed from table and stage`)
    return { success: true, message: 'File deleted successfully' }
  } catch (error) {
    console.error('Error deleting file from table:', error)
    throw error
  }
}

// GET - Fetch file from Snowflake stage
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
    
    try {
      // Get file from table
      const result = await getFileFromTable(filename)
      
        return NextResponse.json({
         success: true,
         message: 'File fetched successfully from Snowflake stage',
         data: {
           filename,
           snowflakePath: `@MY_FLOW.PUBLIC.IMAGE_FILES/${filename}`,
           status: 'fetched'
         }
       })
      
    } catch (error) {
      throw error
    }
    
  } catch (error) {
    console.error('Fetch file error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch file from Snowflake stage' },
      { status: 500 }
    )
  }
}

// DELETE - Remove file from Snowflake stage
export async function DELETE(
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
    
    try {
      // Delete file from table
      const result = await deleteFileFromTable(filename)
      
             return NextResponse.json({
         success: true,
         message: 'File deleted successfully from Snowflake stage',
         data: {
           filename,
           snowflakePath: `@MY_FLOW.PUBLIC.IMAGE_FILES/${filename}`,
           status: 'deleted'
         }
       })
      
    } catch (error) {
      throw error
    }
    
  } catch (error) {
    console.error('Delete file error:', error)
    return NextResponse.json(
      { error: 'Failed to delete file from Snowflake stage' },
      { status: 500 }
    )
  }
}
