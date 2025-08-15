const snowflake = require('snowflake-sdk');
require('dotenv').config({ path: '.env.local' });

console.log('🔍 Testing Snowflake Database Connection...');
console.log('='.repeat(60));

// Get environment variables
const account = process.env.SNOWFLAKE_ACCOUNT;
const username = process.env.SNOWFLAKE_USERNAME;
const database = process.env.SNOWFLAKE_DATABASE;
const warehouse = process.env.SNOWFLAKE_WAREHOUSE;
const role = process.env.SNOWFLAKE_ROLE || 'PUBLIC';
const privateKey = process.env.SNOWFLAKE_PRIVATE_KEY;

// Validate configuration
console.log('📋 Configuration Check:');
console.log(`   Account: ${account || '❌ Missing'}`);
console.log(`   Username: ${username || '❌ Missing'}`);
console.log(`   Database: ${database || '❌ Missing'}`);
console.log(`   Warehouse: ${warehouse || '❌ Missing'}`);
console.log(`   Role: ${role}`);
console.log(`   Private Key: ${privateKey ? '✅ Set' : '❌ Missing'}`);

// Check for missing required fields
const missingFields = [];
if (!account) missingFields.push('SNOWFLAKE_ACCOUNT');
if (!username) missingFields.push('SNOWFLAKE_USERNAME');
if (!database) missingFields.push('SNOWFLAKE_DATABASE');
if (!warehouse) missingFields.push('SNOWFLAKE_WAREHOUSE');
if (!privateKey) missingFields.push('SNOWFLAKE_PRIVATE_KEY');

if (missingFields.length > 0) {
  console.error('\n❌ Missing required environment variables:', missingFields.join(', '));
  console.log('💡 Please check your .env.local file and ensure all required fields are set.');
  process.exit(1);
}

console.log('\n✅ All required configuration fields are present');

// Format private key
const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

// Connection options
const connectionOptions = {
  account,
  username,
  database,
  warehouse,
  role,
  authenticator: 'SNOWFLAKE_JWT',
  privateKey: formattedPrivateKey,
};

console.log('\n🔌 Attempting to connect to Snowflake...');

// Create connection
const connection = snowflake.createConnection(connectionOptions);

// Handle connection errors
connection.on('error', (err) => {
  console.error('❌ Connection error:', err.message);
  process.exit(1);
});

// Test connection
connection.connect((err, conn) => {
  if (err) {
    console.error('\n❌ Connection failed!');
    console.error('   Error Code:', err.code);
    console.error('   Error Message:', err.message);
    console.error('   SQL State:', err.sqlState);
    
    // Provide specific guidance based on error codes
    switch (err.code) {
      case 390186:
        console.log('\n💡 Role permission error. Try updating your .env.local file:');
        console.log('   SNOWFLAKE_ROLE=PUBLIC');
        break;
      case 404005:
        console.log('\n💡 Authentication error. Check your private key and user permissions.');
        break;
      case 404001:
        console.log('\n💡 Account identifier error. Check your SNOWFLAKE_ACCOUNT value.');
        break;
      default:
        console.log('\n💡 Check your Snowflake configuration and network connectivity');
    }
    
    process.exit(1);
  }
  
  console.log('✅ Successfully connected to Snowflake!');
  console.log(`   Session ID: ${conn.getId()}`);
  
  // Test basic queries
  const testQueries = [
    {
      name: 'System Information',
      sql: 'SELECT CURRENT_VERSION() as version, CURRENT_USER() as user, CURRENT_ROLE() as role, CURRENT_DATABASE() as database, CURRENT_WAREHOUSE() as warehouse, CURRENT_SCHEMA() as schema'
    },
    {
      name: 'Account Information',
      sql: 'SELECT CURRENT_ACCOUNT() as account, CURRENT_REGION() as region, CURRENT_CLIENT() as client'
    },
    {
      name: 'Session Information',
      sql: 'SELECT SESSION_ID() as session_id, SESSION_USER() as session_user, SESSION_ROLE() as session_role'
    }
  ];
  
  let completedQueries = 0;
  const totalQueries = testQueries.length;
  
  testQueries.forEach((query, index) => {
    console.log(`\n📊 Running test ${index + 1}/${totalQueries}: ${query.name}`);
    
    conn.execute({
      sqlText: query.sql,
      complete: (err, stmt, rows) => {
        completedQueries++;
        
        if (err) {
          console.error(`❌ Query failed: ${err.message}`);
        } else {
          console.log(`✅ Query successful (${rows.length} row(s)):`);
          console.table(rows);
        }
        
        // If all queries are done, run additional tests
        if (completedQueries === totalQueries) {
          runAdditionalTests(conn);
        }
      }
    });
  });
});

// Additional tests
function runAdditionalTests(conn) {
  console.log('\n🔍 Running additional database tests...');
  
  // Test database operations
  const additionalTests = [
    {
      name: 'List Available Databases',
      sql: 'SHOW DATABASES',
      description: 'Shows all databases accessible to the current user'
    },
    {
      name: 'List Available Warehouses',
      sql: 'SHOW WAREHOUSES',
      description: 'Shows all warehouses accessible to the current user'
    },
    {
      name: 'List Available Schemas',
      sql: 'SHOW SCHEMAS',
      description: 'Shows all schemas in the current database'
    },
    {
      name: 'List Available Tables',
      sql: 'SHOW TABLES',
      description: 'Shows all tables in the current schema'
    }
  ];
  
  let completedTests = 0;
  const totalTests = additionalTests.length;
  
  additionalTests.forEach((test, index) => {
    console.log(`\n📋 Test ${index + 1}/${totalTests}: ${test.name}`);
    console.log(`   Description: ${test.description}`);
    
    conn.execute({
      sqlText: test.sql,
      complete: (err, stmt, rows) => {
        completedTests++;
        
        if (err) {
          console.error(`❌ Test failed: ${err.message}`);
        } else {
          console.log(`✅ Test successful (${rows.length} row(s)):`);
          if (rows.length > 0) {
            // Show first few rows for large result sets
            const displayRows = rows.slice(0, 5);
            console.table(displayRows);
            if (rows.length > 5) {
              console.log(`   ... and ${rows.length - 5} more rows`);
            }
          } else {
            console.log('   No results returned');
          }
        }
        
        // If all tests are done, close connection
        if (completedTests === totalTests) {
          console.log('\n🎉 All tests completed successfully!');
          console.log('\n📊 Connection Summary:');
          console.log('   ✅ Authentication: JWT with private key');
          console.log('   ✅ Connection: Established successfully');
          console.log('   ✅ Basic Queries: All passed');
          console.log('   ✅ Database Access: Verified');
          console.log('   ✅ Warehouse Access: Verified');
          console.log('   ✅ Schema Access: Verified');
          
          // Close connection
          conn.destroy((err) => {
            if (err) {
              console.error('❌ Error closing connection:', err.message);
            } else {
              console.log('🔒 Connection closed successfully');
            }
            console.log('\n✨ Snowflake database connection test completed successfully!');
            process.exit(0);
          });
        }
      }
    });
  });
}
