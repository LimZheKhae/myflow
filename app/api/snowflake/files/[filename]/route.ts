import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake/config'

// Get file from stage (simulated - in real implementation you'd use GET command)
async function getFileFromStage(filename: string, stageName: string = 'MY_STAGE') {
  try {
    // In a real implementation, you would use the GET command
    // GET @MY_STAGE/filename file:///tmp/;
    
    // For now, we'll just verify the file exists in the stage
    const listSQL = `LIST @${stageName}/${filename}`
    const result = await executeQuery(listSQL)
    
    if (result.length === 0) {
      throw new Error('File not found in stage')
    }
    
    console.log(`File ${filename} found in stage`)
    return { success: true, message: 'File retrieved successfully' }
  } catch (error) {
    console.error('Error getting file from stage:', error)
    throw error
  }
}

// Delete file from stage
async function deleteFileFromStage(filename: string, stageName: string = 'MY_STAGE') {
  try {
    const removeSQL = `REMOVE @${stageName}/${filename}`
    await executeQuery(removeSQL)
    
    console.log(`File ${filename} removed from stage @${stageName}`)
    return { success: true, message: 'File deleted successfully' }
  } catch (error) {
    console.error('Error deleting file from stage:', error)
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
      // Get file from stage
      const result = await getFileFromStage(filename)
      
      return NextResponse.json({
        success: true,
        message: 'File fetched successfully from Snowflake stage',
        data: {
          filename,
          snowflakePath: `@MY_STAGE/${filename}`,
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
      // Delete file from stage
      const result = await deleteFileFromStage(filename)
      
      return NextResponse.json({
        success: true,
        message: 'File deleted successfully from Snowflake stage',
        data: {
          filename,
          snowflakePath: `@MY_STAGE/${filename}`,
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
