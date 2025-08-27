"use client"

import { useState, useEffect } from "react"
import { useFirebaseAuth as useAuth } from "@/contexts/firebase-auth-context"
import FirebaseLoginForm from "@/components/auth/firebase-login-form"
import Sidebar from "@/components/layout/sidebar"
import Header from "@/components/layout/header"
import { Loader2, Upload, Download, Eye, Trash2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileUploader } from "@/components/ui/file-uploader"
import { toast } from "sonner"

interface UploadedImage {
  id: string
  filename: string
  size: number
  type: string
  uploadedAt: string
  snowflakePath: string
  previewUrl?: string
}

export default function TestImageUpload() {
  const { user, loading, hasPermission } = useAuth()
  const [isUploading, setIsUploading] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)

  // Load existing files from Snowflake stage on component mount
  useEffect(() => {
    const loadExistingFiles = async () => {
      setIsLoadingFiles(true)
      try {
        const response = await fetch('tests/api/snowflake/files')
        if (response.ok) {
          const result = await response.json()
          if (result.data.files && result.data.files.length > 0) {
            // Convert Snowflake file data to our UploadedImage format
            const existingImages: UploadedImage[] = result.data.files.map((file: any) => ({
              id: `file_${Date.now()}_${Math.random()}`,
              filename: file.FILE_NAME,
              size: 0, // Size not stored in table, could be added if needed
              type: 'image/jpeg', // Default type since Snowflake doesn't store MIME type
              uploadedAt: file.UPLOADED_AT ? new Date(file.UPLOADED_AT).toISOString() : new Date().toISOString(),
              snowflakePath: `@MY_FLOW.PUBLIC.IMAGE_FILES/${file.FILE_NAME}`,
              previewUrl: `/api/snowflake/files/serve/${file.FILE_NAME}` // Use our own file serving endpoint
            }))
            setUploadedImages(existingImages)
          }
        }
      } catch (error) {
        console.error('Error loading existing files:', error)
        toast.error('Failed to load existing files from Snowflake stage')
      } finally {
        setIsLoadingFiles(false)
      }
    }

    loadExistingFiles()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <FirebaseLoginForm />
  }

//   // Check if user has VIEW permission for test-imageupload module
//   if (!hasPermission('test-imageupload', 'VIEW')) {
//     return <AccessDenied moduleName="Test Image Upload" />
//   }

  const handleFileSelect = (file: File | null) => {
    if (file) {
      setSelectedFile(file)
      toast.success(`File selected: ${file.name}`)
    } else {
      setSelectedFile(null)
    }
  }

  const uploadToSnowflake = async () => {
    if (!selectedFile) {
      toast.error("Please select a file first")
      return
    }

    setIsUploading(true)
    
    try {
      // Create FormData for file upload
      const formData = new FormData()
      formData.append('file', selectedFile)
      
      // Upload file to Snowflake via API
      const response = await fetch('/api/snowflake/upload', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }
      
      const result = await response.json()
      
      const uploadedImage: UploadedImage = {
        id: result.data.id,
        filename: result.data.filename,
        size: result.data.size,
        type: result.data.type,
        uploadedAt: result.data.uploadedAt,
        snowflakePath: result.data.snowflakePath,
        previewUrl: URL.createObjectURL(selectedFile)
      }

      setUploadedImages(prev => [uploadedImage, ...prev])
      setSelectedFile(null)
      
      toast.success(`Successfully uploaded ${selectedFile.name} to Snowflake stage`)
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : "Failed to upload image to Snowflake stage")
    } finally {
      setIsUploading(false)
    }
  }

  const fetchFromSnowflake = async (image: UploadedImage) => {
    setIsFetching(true)
    
    try {
      // Fetch file from Snowflake via API
      const response = await fetch(`/api/snowflake/files/${image.filename}`, {
        method: 'GET'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Fetch failed')
      }
      
      const result = await response.json()
      
      toast.success(`Successfully fetched ${image.filename} from Snowflake stage`)
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error(error instanceof Error ? error.message : "Failed to fetch image from Snowflake stage")
    } finally {
      setIsFetching(false)
    }
  }

  const deleteImage = async (imageId: string) => {
    try {
      // Find the image to get the filename
      const image = uploadedImages.find(img => img.id === imageId)
      if (!image) {
        throw new Error('Image not found')
      }
      
      // Delete file from Snowflake via API
      const response = await fetch(`/api/snowflake/files/${image.filename}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Delete failed')
      }
      
      const result = await response.json()
      
      setUploadedImages(prev => prev.filter(img => img.id !== imageId))
      toast.success("Image deleted from Snowflake stage")
    } catch (error) {
      console.error('Delete error:', error)
      toast.error(error instanceof Error ? error.message : "Failed to delete image from Snowflake stage")
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Test Image Upload" description="Test file uploader and Snowflake stage integration" />

        <div className="flex-1 p-6 overflow-y-auto">
          {/* Header */}
          <div className="mb-8">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">Test Image Upload Module</h1>
              <p className="text-slate-600">Test file uploader component and Snowflake stage integration</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Upload Section */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Upload className="h-5 w-5" />
                  <span>Upload Image to Snowflake</span>
                </CardTitle>
                <CardDescription>
                  Select an image file and upload it to Snowflake stage for testing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* File Uploader */}
                <div>
                                     <FileUploader
                     onFileSelect={handleFileSelect}
                     acceptedTypes="image/jpeg,image/png,image/gif,image/webp"
                     maxSize={5} // 5MB
                     placeholder="Drag and drop an image here, or click to browse"
                     className="min-h-[200px]"
                   />
                </div>

                {/* Selected File Info */}
                {selectedFile && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-2">Selected File:</h4>
                    <div className="space-y-1 text-sm text-blue-800">
                      <p><span className="font-medium">Name:</span> {selectedFile.name}</p>
                      <p><span className="font-medium">Size:</span> {formatFileSize(selectedFile.size)}</p>
                      <p><span className="font-medium">Type:</span> {selectedFile.type}</p>
                    </div>
                  </div>
                )}

                {/* Upload Button */}
                <Button
                  onClick={uploadToSnowflake}
                  disabled={!selectedFile || isUploading}
                  className="w-full"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading to Snowflake...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload to Snowflake Stage
                    </>
                  )}
                </Button>

                {/* Upload Instructions */}
                <div className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-medium text-slate-900 mb-2">Instructions:</h4>
                  <ul className="text-sm text-slate-600 space-y-1">
                    <li>• Supported formats: JPEG, PNG, GIF, WebP</li>
                    <li>• Maximum file size: 5MB</li>
                    <li>• Files will be uploaded to Snowflake stage</li>
                    <li>• You can fetch and delete uploaded images</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Uploaded Images Section */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="h-5 w-5" />
                  <span>Uploaded Images ({uploadedImages.length})</span>
                </CardTitle>
                <CardDescription>
                  View and manage images uploaded to Snowflake stage
                </CardDescription>
              </CardHeader>
                             <CardContent>
                 {isLoadingFiles ? (
                   <div className="text-center py-12">
                     <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                     <p className="text-slate-500">Loading files from Snowflake stage...</p>
                   </div>
                 ) : uploadedImages.length === 0 ? (
                   <div className="text-center py-12">
                     <Upload className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                     <p className="text-slate-500">No images uploaded yet</p>
                     <p className="text-sm text-slate-400">Upload an image to see it here</p>
                   </div>
                 ) : (
                  <div className="space-y-4">
                    {uploadedImages.map((image) => (
                      <div key={image.id} className="p-4 border rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                        <div className="flex items-start space-x-4">
                          {/* Image Preview */}
                          {image.previewUrl && (
                            <div className="flex-shrink-0">
                              <img
                                src={image.previewUrl}
                                alt={image.filename}
                                className="w-16 h-16 object-cover rounded-lg border"
                              />
                            </div>
                          )}
                          
                          {/* Image Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-slate-900 truncate">{image.filename}</h4>
                            <div className="text-sm text-slate-600 space-y-1 mt-1">
                              <p>Size: {formatFileSize(image.size)}</p>
                              <p>Type: {image.type}</p>
                              <p>Uploaded: {new Date(image.uploadedAt).toLocaleString()}</p>
                              <p className="font-mono text-xs bg-slate-200 px-2 py-1 rounded">
                                {image.snowflakePath}
                              </p>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-col space-y-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => fetchFromSnowflake(image)}
                              disabled={isFetching}
                            >
                              {isFetching ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteImage(image.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Snowflake Connection Info */}
          <Card className="mt-8 border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Snowflake Stage Configuration</CardTitle>
              <CardDescription>
                Information about the Snowflake stage connection and configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-900 mb-2">Stage Name</h4>
                  <p className="text-green-800 font-mono">@MY_FLOW.PUBLIC.IMAGE_FILES</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">File Format</h4>
                  <p className="text-blue-800">AUTO (Detected from file extension)</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h4 className="font-medium text-purple-900 mb-2">Storage</h4>
                  <p className="text-purple-800">Internal Stage</p>
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                <h4 className="font-medium text-slate-900 mb-2">SQL Commands for Testing:</h4>
                <div className="space-y-2 text-sm font-mono text-slate-700">
                  <p>-- List files in stage</p>
                  <p className="bg-slate-200 px-2 py-1 rounded">LIST @MY_FLOW.PUBLIC.IMAGE_FILES;</p>
                  <p>-- Get file metadata</p>
                  <p className="bg-slate-200 px-2 py-1 rounded">SELECT METADATA$FILENAME, METADATA$FILE_SIZE FROM @MY_FLOW.PUBLIC.IMAGE_FILES;</p>
                  <p>-- Download file from stage</p>
                  <p className="bg-slate-200 px-2 py-1 rounded">GET @MY_FLOW.PUBLIC.IMAGE_FILES/filename.jpg file:///tmp/;</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
