import dotenv from 'dotenv'

// Load environment variables BEFORE importing any modules that use them
dotenv.config({ path: '.env.local' })

import { SnowflakeFileUploader } from '../lib/snowflake/file-upload'

async function testFileUpload() {
  try {
    console.log('🧪 Testing Snowflake File Upload...')
    console.log('Account:', process.env.SNOWFLAKE_ACCOUNT)
    console.log('Username:', process.env.SNOWFLAKE_USERNAME)
    console.log('Database:', process.env.SNOWFLAKE_DATABASE)
    
    // Test 1: List files in stage
    console.log('\n📋 Test 1: Listing files in stage...')
    try {
      const files = await SnowflakeFileUploader.listFilesInStage()
      console.log('✅ Files in stage:', files)
    } catch (error) {
      console.log('❌ Failed to list files:', error instanceof Error ? error.message : 'Unknown error')
    }
    
    // Test 2: Upload a test file
    console.log('\n📤 Test 2: Uploading test file...')
    try {
      const testBuffer = Buffer.from('Hello Snowflake File Upload!', 'utf8')
      const result = await SnowflakeFileUploader.uploadFileToStage(testBuffer, 'test-file-upload.txt')
      console.log('✅ Upload result:', result)
    } catch (error) {
      console.log('❌ Failed to upload file:', error instanceof Error ? error.message : 'Unknown error')
    }
    
    // Test 3: Get file URL
    console.log('\n🔗 Test 3: Getting file URL...')
    try {
      const url = await SnowflakeFileUploader.getFileUrl('test-file-upload.txt')
      console.log('✅ File URL:', url)
    } catch (error) {
      console.log('❌ Failed to get file URL:', error instanceof Error ? error.message : 'Unknown error')
    }
    
    console.log('\n🎉 File upload test completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testFileUpload()
