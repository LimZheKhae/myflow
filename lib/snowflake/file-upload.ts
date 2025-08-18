import { executeQuery } from './config'
import fs from 'fs'
import path from 'path'
import os from 'os'

interface FileUploadResult {
  success: boolean
  message: string
  filename?: string
  stagePath?: string
  error?: string
}

export class SnowflakeFileUploader {
  
  /**
   * Upload file to Snowflake stage using SQL commands
   * This approach saves the file temporarily and uses Snowflake's PUT command
   */
  static async uploadFileToStage(
    fileBuffer: Buffer,
    filename: string,
    stageName: string = 'MY_FLOW.PUBLIC.IMAGE_FILES'
  ): Promise<FileUploadResult> {
    try {
      // Create a temporary file
      const tempDir = os.tmpdir()
      const tempFilePath = path.join(tempDir, filename)
      
      // Write the buffer to temporary file
      fs.writeFileSync(tempFilePath, fileBuffer)
      
      console.log(`Temporary file created: ${tempFilePath}`)
      
      // Use Snowflake's PUT command to upload from local file to stage
      const putSQL = `PUT file://${tempFilePath} @${stageName} AUTO_COMPRESS=FALSE OVERWRITE=TRUE`
      
      console.log(`Executing PUT command: ${putSQL}`)
      
      try {
        console.log(`Executing PUT command: ${putSQL}`)
        await executeQuery(putSQL)
        
        // Clean up temporary file
        fs.unlinkSync(tempFilePath)
        console.log(`Temporary file cleaned up: ${tempFilePath}`)
        
        return {
          success: true,
          message: `File ${filename} uploaded successfully to stage ${stageName}`,
          filename: filename,
          stagePath: `@${stageName}/${filename}`
        }
        
      } catch (putError) {
        // Clean up temporary file even if upload fails
        try {
          fs.unlinkSync(tempFilePath)
        } catch (cleanupError) {
          console.error('Failed to clean up temporary file:', cleanupError)
        }
        
        throw putError
      }
      
    } catch (error) {
      console.error('File upload to Snowflake stage failed:', error)
      return {
        success: false,
        message: 'File upload failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  /**
   * List files in a stage using SQL
   */
  static async listFilesInStage(stageName: string = 'MY_FLOW.PUBLIC.IMAGE_FILES'): Promise<any[]> {
    try {
      const listSQL = `LIST @${stageName}`
      const result = await executeQuery(listSQL)
      
      console.log('Files in stage:', result)
      return result
      
    } catch (error) {
      console.error('Failed to list files in stage:', error)
      throw error
    }
  }
  
  /**
   * Delete file from stage using SQL
   */
  static async deleteFileFromStage(
    filename: string,
    stageName: string = 'MY_FLOW.PUBLIC.IMAGE_FILES'
  ): Promise<FileUploadResult> {
    try {
      const removeSQL = `REMOVE @${stageName}/${filename}`
      await executeQuery(removeSQL)
      
      return {
        success: true,
        message: `File ${filename} deleted successfully from stage ${stageName}`,
        filename: filename
      }
      
    } catch (error) {
      console.error('Failed to delete file from stage:', error)
      return {
        success: false,
        message: 'File deletion failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  /**
   * Get file URL from stage using BUILD_STAGE_FILE_URL
   */
  static async getFileUrl(filename: string, stageName: string = 'MY_FLOW.PUBLIC.IMAGE_FILES'): Promise<string> {
    try {
      const urlSQL = `SELECT BUILD_STAGE_FILE_URL(@${stageName}, '${filename}') as FILE_URL`
      const result = await executeQuery(urlSQL)
      
      if (result && result.length > 0) {
        return result[0].FILE_URL
      }
      
      throw new Error('No URL returned from BUILD_STAGE_FILE_URL')
      
    } catch (error) {
      console.error('Failed to get file URL:', error)
      throw error
    }
  }
}
