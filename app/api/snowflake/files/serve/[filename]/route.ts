import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake/config'
import fs from 'fs'
import path from 'path'
import os from 'os'

// GET - Serve file from Snowflake stage
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

    // First, verify the file exists in our table
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
    
    // Create a temporary directory for this request
    const tempDir = path.join(os.tmpdir(), 'snowflake-files')
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }
    
    const tempFilePath = path.join(tempDir, filename)
    
    try {
      // Download file from Snowflake stage to temporary location
      const getSQL = `GET @MY_FLOW.PUBLIC.IMAGE_FILES/${filename} file://${tempDir}/`
      await executeQuery(getSQL)
      
      // Check if file was downloaded successfully
      if (!fs.existsSync(tempFilePath)) {
        throw new Error('File download failed')
      }
      
      // Read the file
      const fileBuffer = fs.readFileSync(tempFilePath)
      
      // Determine content type based on file extension
      const ext = path.extname(filename).toLowerCase()
      let contentType = 'application/octet-stream'
      
      if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg'
      else if (ext === '.png') contentType = 'image/png'
      else if (ext === '.gif') contentType = 'image/gif'
      else if (ext === '.webp') contentType = 'image/webp'
      else if (ext === '.txt') contentType = 'text/plain'
      else if (ext === '.pdf') contentType = 'application/pdf'
      
      // Clean up temporary file
      try {
        fs.unlinkSync(tempFilePath)
      } catch (cleanupError) {
        console.error('Failed to clean up temporary file:', cleanupError)
      }
      
      // Return the file as a response
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `inline; filename="${filename}"`,
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        },
      })
      
    } catch (getError) {
      console.error('Error serving file from stage:', getError)
      return NextResponse.json(
        { error: 'Failed to serve file from stage' },
        { status: 500 }
      )
    }
    
  } catch (error) {
    console.error('Serve file error:', error)
    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    )
  }
}
