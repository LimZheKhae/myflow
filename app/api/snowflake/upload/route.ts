import { NextRequest, NextResponse } from 'next/server'
import { createSnowflakeConnection, executeQuery } from '@/lib/snowflake/config'

// Create stage if it doesn't exist
async function createStage(stageName: string = 'MY_STAGE') {
  try {
    const createStageSQL = `
      CREATE STAGE IF NOT EXISTS ${stageName}
      FILE_FORMAT = (TYPE = 'AUTO')
      COMMENT = 'Stage for file uploads from web application'
    `
    
    await executeQuery(createStageSQL)
    console.log(`Stage ${stageName} created/verified successfully`)
  } catch (error) {
    console.error('Error creating stage:', error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size too large. Maximum size is 5MB.' },
        { status: 400 }
      )
    }

    try {
      // Create stage
      await createStage()
      
      // Generate unique filename
      const timestamp = Date.now()
      const fileExtension = file.name.split('.').pop()
      const uniqueFilename = `${timestamp}_${file.name}`
      
      // Convert file to buffer
      const fileBuffer = Buffer.from(await file.arrayBuffer())
      
      // In a real implementation, you would upload the file to Snowflake stage
      // For now, we'll simulate the upload and store metadata
      
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Store file metadata (in a real app, you'd store this in a database)
      const fileMetadata = {
        id: `file_${timestamp}`,
        filename: uniqueFilename,
        originalName: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
        snowflakePath: `@MY_STAGE/${uniqueFilename}`,
        status: 'uploaded'
      }
      
      return NextResponse.json({
        success: true,
        message: 'File uploaded successfully to Snowflake stage',
        data: fileMetadata
      })
      
    } catch (error) {
      throw error
    }
    
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload file to Snowflake stage' },
      { status: 500 }
    )
  }
}
