import snowflake from 'snowflake-sdk'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

export interface SnowflakeConfig {
  account: string
  username: string
  database: string
  warehouse: string
  role: string
  privateKey: string
}

export const getSnowflakeConfig = (): SnowflakeConfig => {
  const requiredEnvVars = {
    account: process.env.SNOWFLAKE_ACCOUNT,
    username: process.env.SNOWFLAKE_USERNAME,
    database: process.env.SNOWFLAKE_DATABASE,
    warehouse: process.env.SNOWFLAKE_WAREHOUSE,
    role: process.env.SNOWFLAKE_ROLE,
    privateKey: process.env.SNOWFLAKE_PRIVATE_KEY,
  }

  // Check if all required environment variables are present
  for (const [key, value] of Object.entries(requiredEnvVars)) {
    if (!value) {
      throw new Error(`Missing required environment variable: SNOWFLAKE_${key.toUpperCase()}`)
    }
  }

  return requiredEnvVars as SnowflakeConfig
}

export const createSnowflakeConnection = (): Promise<snowflake.Connection> => {
  const config = getSnowflakeConfig()
  
  // Format the private key properly
  let privateKey = config.privateKey
  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n')
  }

  const connectionOptions: snowflake.ConnectionOptions = {
    account: config.account,
    username: config.username,
    database: config.database,
    warehouse: config.warehouse,
    role: config.role,
    authenticator: 'SNOWFLAKE_JWT',
    privateKey: privateKey,
    clientSessionKeepAlive: true,
    clientRequestMFAToken: false,
  }

  return new Promise((resolve, reject) => {
    const connection = snowflake.createConnection(connectionOptions)
    
    connection.connect((err, conn) => {
      if (err) {
        console.error('Failed to connect to Snowflake:', err)
        reject(err)
      } else {
        console.log('Successfully connected to Snowflake')
        resolve(conn)
      }
    })
  })
}

export const executeQuery = async (query: string, binds: any[] = []): Promise<any[]> => {
  const connection = await createSnowflakeConnection()
  
  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText: query,
      binds: binds,
      complete: (err, stmt, rows) => {
        // Always destroy the connection when done
        connection.destroy((destroyErr) => {
          if (destroyErr) {
            console.error('Error destroying connection:', destroyErr)
          }
        })

        if (err) {
          console.error('Query execution failed:', err)
          reject(err)
        } else {
          // For INSERT operations, Snowflake returns metadata about affected rows
          // For SELECT operations, it returns the actual rows
          resolve(rows || [])
        }
      }
    })
  })
} 