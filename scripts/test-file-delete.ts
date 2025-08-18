import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { SnowflakeFileUploader } from '../lib/snowflake/file-upload'
import { executeQuery } from '../lib/snowflake/config'

async function testFileDelete() {
  try {
    console.log('🧪 Testing Snowflake File Delete...')
    console.log('Account:', process.env.SNOWFLAKE_ACCOUNT)
    console.log('Username:', process.env.SNOWFLAKE_USERNAME)
    console.log('Database:', process.env.SNOWFLAKE_DATABASE)

    const testFilename = 'test-delete-file.txt'
    const testContent = 'This is a test file for deletion'

    console.log('\n📋 Step 1: Listing files in stage before test...')
    try {
      const filesBefore = await SnowflakeFileUploader.listFilesInStage()
      console.log('✅ Files in stage before test:', filesBefore.length)
    } catch (error) {
      console.log('⚠️ Could not list files before test:', error)
    }

    console.log('\n📤 Step 2: Uploading test file...')
    try {
      const testBuffer = Buffer.from(testContent, 'utf8')
      const uploadResult = await SnowflakeFileUploader.uploadFileToStage(testBuffer, testFilename)
      console.log('✅ Upload result:', uploadResult)
    } catch (error) {
      console.log('❌ Upload failed:', error)
      return
    }

    console.log('\n📋 Step 3: Verifying file exists in stage...')
    try {
      const filesAfterUpload = await SnowflakeFileUploader.listFilesInStage()
      const uploadedFile = filesAfterUpload.find((file: any) => file.name === testFilename)
      console.log('✅ File found in stage:', uploadedFile ? 'Yes' : 'No')
    } catch (error) {
      console.log('❌ Could not verify file in stage:', error)
    }

    console.log('\n🗑️ Step 4: Deleting file from stage...')
    try {
      const deleteResult = await SnowflakeFileUploader.deleteFileFromStage(testFilename)
      console.log('✅ Delete result:', deleteResult)
    } catch (error) {
      console.log('❌ Delete failed:', error)
      return
    }

    console.log('\n📋 Step 5: Verifying file is deleted from stage...')
    try {
      const filesAfterDelete = await SnowflakeFileUploader.listFilesInStage()
      const deletedFile = filesAfterDelete.find((file: any) => file.name === testFilename)
      console.log('✅ File deleted from stage:', deletedFile ? 'No (still exists)' : 'Yes (not found)')
    } catch (error) {
      console.log('❌ Could not verify deletion from stage:', error)
    }

    console.log('\n🎉 File deletion test completed!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testFileDelete()
