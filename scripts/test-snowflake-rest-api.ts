import dotenv from 'dotenv'

// Load environment variables BEFORE importing any modules that use them
dotenv.config({ path: '.env.local' })

import { getSnowflakeRestAPI, snowflakeRestAPI } from '../lib/snowflake/rest-api'

async function testSnowflakeRestAPI() {
  try {
    console.log('🧪 Testing Snowflake REST API...')
    console.log('Account:', process.env.SNOWFLAKE_ACCOUNT)
    console.log('Username:', process.env.SNOWFLAKE_USERNAME)
    console.log('Database:', process.env.SNOWFLAKE_DATABASE)
    
    // Get the REST API instance
    const snowflakeRestAPI = getSnowflakeRestAPI()
    
    // Test 1: List files in stage
    console.log('\n📋 Test 1: Listing files in stage...')
    try {
      const files = await snowflakeRestAPI.listFilesInStage()
      console.log('✅ Files in stage:', files)
    } catch (error) {
      console.log('❌ Failed to list files:', error instanceof Error ? error.message : 'Unknown error')
    }
    
    // Test 2: Upload a test file
    console.log('\n📤 Test 2: Uploading test file...')
    try {
      const testBuffer = Buffer.from('Hello Snowflake REST API!', 'utf8')
      const result = await snowflakeRestAPI.uploadFileToStage(testBuffer, 'test-file.txt')
      console.log('✅ Upload result:', result)
    } catch (error) {
      console.log('❌ Failed to upload file:', error instanceof Error ? error.message : 'Unknown error')
    }
    
    console.log('\n🎉 REST API test completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testSnowflakeRestAPI()
