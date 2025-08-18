import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

console.log('🧪 Testing Environment Variables...')
console.log('SNOWFLAKE_ACCOUNT:', process.env.SNOWFLAKE_ACCOUNT)
console.log('SNOWFLAKE_USERNAME:', process.env.SNOWFLAKE_USERNAME)
console.log('SNOWFLAKE_DATABASE:', process.env.SNOWFLAKE_DATABASE)
console.log('SNOWFLAKE_WAREHOUSE:', process.env.SNOWFLAKE_WAREHOUSE)
console.log('SNOWFLAKE_ROLE:', process.env.SNOWFLAKE_ROLE)
console.log('SNOWFLAKE_PRIVATE_KEY length:', process.env.SNOWFLAKE_PRIVATE_KEY?.length || 0)
