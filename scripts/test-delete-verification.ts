import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { SnowflakeFileUploader } from '../lib/snowflake/file-upload'
import { executeQuery } from '../lib/snowflake/config'

async function testDeleteVerification() {
  try {
    console.log('🧪 Testing Delete Verification Process...')
    
    const testFilename = 'test-delete-verification.txt'
    const testContent = 'This is a test file for delete verification'
    
    console.log('\n📤 Step 1: Uploading test file...')
    try {
      const testBuffer = Buffer.from(testContent, 'utf8')
      const uploadResult = await SnowflakeFileUploader.uploadFileToStage(testBuffer, testFilename)
      console.log('✅ Upload result:', uploadResult.success ? 'Success' : 'Failed')
    } catch (error) {
      console.log('❌ Upload failed:', error)
      return
    }
    
    console.log('\n📋 Step 2: Verifying file exists in stage...')
    try {
      const filesInStage = await SnowflakeFileUploader.listFilesInStage()
      const fileExists = filesInStage.some((file: any) => file.name.includes(testFilename))
      console.log('✅ File exists in stage:', fileExists)
    } catch (error) {
      console.log('❌ Could not verify file in stage:', error)
    }
    
    console.log('\n🗑️ Step 3: Deleting file from stage...')
    try {
      const deleteResult = await SnowflakeFileUploader.deleteFileFromStage(testFilename)
      console.log('✅ Delete result:', deleteResult.success ? 'Success' : 'Failed')
    } catch (error) {
      console.log('❌ Delete failed:', error)
      return
    }
    
    console.log('\n📋 Step 4: Verifying file is deleted from stage...')
    try {
      const filesAfterDelete = await SnowflakeFileUploader.listFilesInStage()
      const fileStillExists = filesAfterDelete.some((file: any) => file.name.includes(testFilename))
      console.log('✅ File deleted from stage:', !fileStillExists)
    } catch (error) {
      console.log('❌ Could not verify deletion from stage:', error)
    }
    
    console.log('\n🎉 Delete verification test completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testDeleteVerification()
