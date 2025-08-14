"use client"

import { useState } from "react"
import { useFirebaseAuth as useAuth } from "@/contexts/firebase-auth-context"
import FirebaseLoginForm from "@/components/auth/firebase-login-form"
import ChangePasswordDialog from "@/components/auth/change-password-dialog"
import Sidebar from "@/components/layout/sidebar"
import Header from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  User, 
  Mail, 
  Shield, 
  Calendar, 
  MapPin, 
  Building, 
  KeyRound, 
  Settings, 
  Loader2,
  Edit3,
  Save,
  X
} from "lucide-react"
import { format } from "date-fns"

export default function ProfilePage() {
  const { user, loading } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState("")

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <FirebaseLoginForm />
  }

  const handleEditName = () => {
    setIsEditing(true)
    setEditedName(user.name)
  }

  const handleSaveName = () => {
    // TODO: Implement name update functionality
    setIsEditing(false)
    console.log("Saving name:", editedName)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditedName("")
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Never"
    
    try {
      // Handle Firebase Timestamp
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return format(date, "PPP 'at' p")
    } catch (error) {
      return "Invalid date"
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'MANAGER':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'KAM':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'PROCUREMENT':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'AUDIT':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Profile & Settings" description="Manage your account settings and preferences" />
        
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Profile Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Your basic account information and role details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Profile Header */}
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-xl">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            className="text-lg font-semibold max-w-xs"
                            autoFocus
                          />
                          <Button size="sm" onClick={handleSaveName}>
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <h2 className="text-2xl font-semibold text-gray-900">{user.name}</h2>
                          <Button size="sm" variant="outline" onClick={handleEditName}>
                            <Edit3 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {user.role}
                      </Badge>
                      {user.isActive ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-gray-500" />
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Email Address</Label>
                        <p className="text-gray-900">{user.email}</p>
                      </div>
                    </div>
                    
                    {user.department && (
                      <div className="flex items-center gap-3">
                        <Building className="w-5 h-5 text-gray-500" />
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Department</Label>
                          <p className="text-gray-900">{user.department}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    {user.region && (
                      <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-gray-500" />
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Region</Label>
                          <p className="text-gray-900">{user.region}</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-gray-500" />
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Last Login</Label>
                        <p className="text-gray-900">{formatDate(user.lastLogin)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Access Information */}
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-600" />
                    Access & Permissions
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Merchants */}
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">Merchants</Label>
                      <div className="flex flex-wrap gap-1">
                        {user.merchants && user.merchants.length > 0 ? (
                          user.merchants.map((merchant, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {merchant}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-gray-500">No merchant access</span>
                        )}
                      </div>
                    </div>

                    {/* Currencies */}
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">Currencies</Label>
                      <div className="flex flex-wrap gap-1">
                        {user.currencies && user.currencies.length > 0 ? (
                          user.currencies.map((currency, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {currency}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-gray-500">No currency access</span>
                        )}
                      </div>
                    </div>

                    {/* Member Access */}
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">Member Data Access</Label>
                      <div className="flex flex-wrap gap-1">
                        {user.memberAccess && user.memberAccess.length > 0 ? (
                          user.memberAccess.map((access, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {access}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-gray-500">No member access</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Settings Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-600" />
                  Security Settings
                </CardTitle>
                <CardDescription>
                  Manage your account security and authentication settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <KeyRound className="w-5 h-5 text-gray-500" />
                    <div>
                      <h4 className="font-medium text-gray-900">Password</h4>
                      <p className="text-sm text-gray-600">
                        Change your password to keep your account secure
                      </p>
                    </div>
                  </div>
                  <ChangePasswordDialog>
                    <Button variant="outline">
                      <KeyRound className="w-4 h-4 mr-2" />
                      Change Password
                    </Button>
                  </ChangePasswordDialog>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <div>
                      <h4 className="font-medium text-gray-900">Account Created</h4>
                      <p className="text-sm text-gray-600">
                        {formatDate(user.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>

                {user.updatedAt && (
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-gray-500" />
                      <div>
                        <h4 className="font-medium text-gray-900">Last Updated</h4>
                        <p className="text-sm text-gray-600">
                          {formatDate(user.updatedAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  )
} 