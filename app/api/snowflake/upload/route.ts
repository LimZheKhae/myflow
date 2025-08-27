import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake/config'
import { SnowflakeFileUploader } from '@/lib/snowflake/file-upload'

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
      
      // Generate unique filename
      const timestamp = Date.now()
      const fileExtension = file.name.split('.').pop()
      const uniqueFilename = `${timestamp}_${file.name}`
      
      // Convert file to buffer
      const fileBuffer = Buffer.from(await file.arrayBuffer())
      
      // Upload file to Snowflake stage using SQL PUT command
      console.log(`Uploading file ${uniqueFilename} to Snowflake stage...`)
      const uploadResult = await SnowflakeFileUploader.uploadFileToStage(fileBuffer, uniqueFilename)
      
      if (!uploadResult.success) {
        console.error('File upload failed:', uploadResult.error)
        return NextResponse.json(
          { error: 'Failed to upload file to Snowflake stage', details: uploadResult.error },
          { status: 500 }
        )
      }
      
      console.log('File uploaded successfully to stage:', uploadResult.message)
      
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // For demo purposes, using user ID 1, in real app you'd get this from auth context
      const userId = 1
      
      // Use our own file serving endpoint instead of Snowflake URL
      const imageUrl = `/api/snowflake/files/serve/${uniqueFilename}`
      
      // Store file metadata in Snowflake table
      const insertSQL = `
        INSERT INTO MY_FLOW.PUBLIC.IMAGES (USER_ID, IMAGE_URL, FILE_NAME)
        VALUES (?, ?, ?)
      `
      
      await executeQuery(insertSQL, [userId, imageUrl, uniqueFilename])
      
      const fileMetadata = {
        id: `file_${timestamp}`,
        filename: uniqueFilename,
        originalName: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
        snowflakePath: `@MY_FLOW.PUBLIC.IMAGE_FILES/${uniqueFilename}`,
        imageUrl: imageUrl,
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
