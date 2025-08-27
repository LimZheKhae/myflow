'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useFirebaseAuth as useAuth } from '@/contexts/firebase-auth-context'
import { useNotifications } from '@/contexts/NotificationContext'
import { toast } from 'sonner'
import { User, Bell, Shield, Settings, Save, RefreshCw } from 'lucide-react'
import Sidebar from '@/components/layout/sidebar'
import Header from '@/components/layout/header'

export default function ProfilePage() {
  const { user, updateUserProfile } = useAuth()
  const { settings, updateSettings, loading } = useNotifications()

  const [isUpdating, setIsUpdating] = useState(false)
  const [profileData, setProfileData] = useState({
    name: '',
    department: '',
    region: '',
  })
  const [notificationSettings, setNotificationSettings] = useState({
    email: true,
    push: true,
    inApp: true,
    modules: {
      'gift-approval': true,
      'vip-profile': false,
      'campaign': false,
      'reports': false,
      'user-management': false,
    },
  })

  // Initialize form data when user data loads
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        department: user.department || '',
        region: user.region || '',
      })
    }
  }, [user])

  // Initialize notification settings when they load
  useEffect(() => {
    if (settings) {
      setNotificationSettings({
        email: settings.email,
        push: settings.push,
        inApp: settings.inApp,
        modules: { ...settings.modules },
      })
    } else {
      // Set default values if settings are not available
      setNotificationSettings({
        email: true,
        push: true,
        inApp: true,
        modules: {
          'gift-approval': false,
          'vip-profile': false,
          'campaign': false,
          'reports': false,
          'user-management': false,
        },
      })
    }
  }, [settings])

  const handleProfileUpdate = async () => {
    if (!user) return

    setIsUpdating(true)
    try {
      await updateUserProfile({
        name: profileData.name,
        department: profileData.department,
        region: profileData.region,
      })
      toast.success('Profile updated successfully!')
    } catch (error: any) {
      toast.error(`Failed to update profile: ${error.message}`)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleNotificationSettingsUpdate = async () => {
    if (!user) return

    setIsUpdating(true)
    try {
      await updateSettings(notificationSettings)
      toast.success('Notification settings updated successfully!')
    } catch (error: any) {
      toast.error(`Failed to update notification settings: ${error.message}`)
    } finally {
      setIsUpdating(false)
    }
  }

  // Removed category toggle function - categories are now automatic based on module

  const handleModuleToggle = (module: string) => {
    setNotificationSettings((prev) => ({
      ...prev,
      modules: {
        ...prev.modules,
        [module]: !prev.modules[module as keyof typeof prev.modules],
      },
    }))
  }

  // Helper function to format Firebase timestamps
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'Never'
    try {
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleDateString()
      }
      return new Date(timestamp).toLocaleDateString()
    } catch (error) {
      return 'Invalid date'
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading profile settings...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Profile & Settings" description="Manage your account settings and preferences" />

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Profile Settings</h1>
                <p className="text-gray-600 mt-2">Manage your account and notification preferences</p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">{user?.role}</Badge>
                <Badge variant="outline">{user?.department}</Badge>
              </div>
            </div>

            <Tabs defaultValue="profile" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="profile" className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </TabsTrigger>
                <TabsTrigger value="notifications" className="flex items-center space-x-2">
                  <Bell className="h-4 w-4" />
                  <span>Notifications</span>
                </TabsTrigger>
                <TabsTrigger value="security" className="flex items-center space-x-2">
                  <Shield className="h-4 w-4" />
                  <span>Security</span>
                </TabsTrigger>
              </TabsList>

              {/* Profile Tab */}
              <TabsContent value="profile" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <User className="h-5 w-5" />
                      <span>Personal Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input id="name" value={profileData.name} onChange={(e) => setProfileData((prev) => ({ ...prev, name: e.target.value }))} placeholder="Enter your full name" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" value={user?.email || ''} disabled className="bg-gray-50" />
                        <p className="text-xs text-gray-500">Email cannot be changed</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="department">Department</Label>
                        <Input id="department" value={profileData.department} onChange={(e) => setProfileData((prev) => ({ ...prev, department: e.target.value }))} placeholder="Enter your department" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="region">Region</Label>
                        <Input id="region" value={profileData.region} onChange={(e) => setProfileData((prev) => ({ ...prev, region: e.target.value }))} placeholder="Enter your region" />
                      </div>
                    </div>
                    <Button onClick={handleProfileUpdate} disabled={isUpdating} className="w-full md:w-auto">
                      {isUpdating ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Update Profile
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Bell className="h-5 w-5" />
                      <span>Notification Preferences</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Delivery Methods */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Delivery Methods</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="email-notifications">Email Notifications</Label>
                            <p className="text-sm text-gray-500">Receive notifications via email</p>
                          </div>
                          <Switch id="email-notifications" checked={notificationSettings.email} onCheckedChange={(checked) => setNotificationSettings((prev) => ({ ...prev, email: checked }))} />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="push-notifications">Push Notifications</Label>
                            <p className="text-sm text-gray-500">Receive push notifications in browser</p>
                          </div>
                          <Switch id="push-notifications" checked={notificationSettings.push} onCheckedChange={(checked) => setNotificationSettings((prev) => ({ ...prev, push: checked }))} />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="in-app-notifications">In-App Notifications</Label>
                            <p className="text-sm text-gray-500">Show notifications in the application</p>
                          </div>
                          <Switch id="in-app-notifications" checked={notificationSettings.inApp} onCheckedChange={(checked) => setNotificationSettings((prev) => ({ ...prev, inApp: checked }))} />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Notification Categories - Removed - Categories are automatic based on module */}

                    {/* Module Notifications */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Module Notifications</h3>
                      <div className="space-y-4">
                        {Object.entries(notificationSettings.modules).map(([module, enabled]) => (
                          <div key={module} className="flex items-center justify-between">
                            <div>
                              <Label htmlFor={`module-${module}`} className="capitalize">
                                {module.replace('-', ' ')} Module
                              </Label>
                              <p className="text-sm text-gray-500">
                                {module === 'system' && 'All system notifications (updates)'}
                                {module === 'gift-approval' && 'All gift approval notifications (workflow, bulk, errors)'}
                                {module === 'vip-profile' && 'All VIP profile notifications (updates, imports, errors)'}
                                {module === 'campaign' && 'All campaign notifications (launches, alerts, performance)'}
                                {module === 'reports' && 'All report notifications (generation, exports, scheduled)'}
                                {module === 'user-management' && 'All user management notifications (creation, permissions, alerts)'}
                              </p>
                            </div>
                            <Switch id={`module-${module}`} checked={enabled} onCheckedChange={() => handleModuleToggle(module)} />
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button onClick={handleNotificationSettingsUpdate} disabled={isUpdating} className="w-full md:w-auto">
                      {isUpdating ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Update Notification Settings
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Security Tab */}
              <TabsContent value="security" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Shield className="h-5 w-5" />
                      <span>Security Settings</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h3 className="font-semibold text-blue-800 mb-2">Account Security</h3>
                      <p className="text-sm text-blue-700">Your account is secured with Firebase Authentication. For password changes or security concerns, please contact your system administrator.</p>
                    </div>

                    <div className="space-y-2">
                      <Label>Account Status</Label>
                      <div className="flex items-center space-x-2">
                        <Badge variant={user?.isActive ? 'default' : 'destructive'}>{user?.isActive ? 'Active' : 'Inactive'}</Badge>
                        <span className="text-sm text-gray-500">Last login: {formatTimestamp(user?.lastLogin)}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Permissions</Label>
                      <div className="flex flex-wrap gap-2">
                        {user?.permissions &&
                          Object.entries(user.permissions).map(([module, perms]) => (
                            <Badge key={module} variant="outline" className="text-xs">
                              {module}: {perms.length} permissions
                            </Badge>
                          ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}
