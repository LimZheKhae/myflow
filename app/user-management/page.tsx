"use client"

import { useState, useEffect } from "react"
import { useFirebaseAuth as useAuth } from "@/contexts/firebase-auth-context"
import { FirebaseAuthService } from "@/lib/firebase-auth"
import FirebaseLoginForm from "@/components/auth/firebase-login-form"
import Sidebar from "@/components/layout/sidebar"
import Header from "@/components/layout/header"
import PermissionGuard from "@/components/common/permission-guard"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Search, Plus, Edit, Trash2, Shield, Users, UserPlus, Mail, Phone, MapPin, Settings } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { UserRole, Permission, MemberType } from "@/types/auth"
import type { FirebaseUser } from "@/types/firebase"
import { toast } from "sonner"
import { format } from "date-fns"

// Global activity logging function - uses server-side API to avoid ad blocker issues
const logActivity = async (
  action: string, 
  userId: string, 
  userName: string,
  userEmail: string, 
  details: Record<string, any>
) => {
  try {
    // Log to global activity logs
    await fetch('/api/activity-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        module: 'USER_MANAGEMENT',
        action: action.toUpperCase().replace(/[-\s]/g, '_'), // Convert to uppercase with underscores
        userId: userId,
        userName: userName,
        userEmail: userEmail,
        details: details
      })
    });
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't throw error to avoid breaking the main workflow
  }
};

// Available modules for permission settings (only actual application modules)
const MODULES = [
  { id: 'vip-profile', name: 'VIP Profile' },
  { id: 'campaign', name: 'Campaign' },
  { id: 'gift-approval', name: 'Gift Approval' },
  { id: 'user-management', name: 'User Management' }
]

// Available permissions for each module
const PERMISSIONS: Permission[] = ['VIEW', 'SEARCH', 'EDIT', 'ADD', 'DELETE', 'IMPORT', 'EXPORT']

// Available merchants
const MERCHANTS = ['MERCHANT_A', 'MERCHANT_B', 'MERCHANT_C', 'Beta', 'Seed', 'Maple', 'Alpha', 'Tesla', 'Other1']

// Available currencies
const CURRENCIES = ['USD', 'EUR', 'GBP', 'MYR', 'SGD', 'IDR', 'THB', 'PHP', 'INT', 'Tesla', 'Other1', 'Other2']

// Available departments
const DEPARTMENTS = ['KAM', 'MktOps', 'SalesOps', 'Audit', 'DSA']

// Available roles for user creation
const ROLES = [
  'Agent (CA/CC/KAM)',
  'TL', 
  'Manager',
  'QA',
  'MKTops',
  'Audit',
  'Admin'
]

export default function UserManagementPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null)
  const [showDepartmentView, setShowDepartmentView] = useState(true)
  const [users, setUsers] = useState<FirebaseUser[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<FirebaseUser | null>(null)
  const { user, loading: authLoading } = useAuth()

  // New user form state
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "KAM" as UserRole,
    merchants: [] as string[],
    currencies: [] as string[],
    memberAccess: [] as MemberType[],
    department: "",
    region: "",
    permissions: {} as Record<string, Permission[]>,
    maskPersonalInfo: false,
    canLogin: true,
    isActive: true
  })

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const allUsers = await FirebaseAuthService.getAllUsers()
      setUsers(allUsers)
    } catch (error) {
      toast.error("Failed to fetch users")
      console.error("Error fetching users:", error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
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

  // Group users by department
  const usersByDepartment = users.reduce((acc, user) => {
    const dept = user.department || 'Unassigned'
    if (!acc[dept]) acc[dept] = []
    acc[dept].push(user)
    return acc
  }, {} as Record<string, FirebaseUser[]>)

  // Filter users based on search and selected department
  const filteredUsers = selectedDepartment 
    ? (usersByDepartment[selectedDepartment] || []).filter((u) =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : []

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case "ADMIN":
        return "bg-purple-100 text-purple-800"
      case "MANAGER":
        return "bg-blue-100 text-blue-800"
      case "KAM":
        return "bg-green-100 text-green-800"
      case "PROCUREMENT":
        return "bg-orange-100 text-orange-800"
      case "AUDIT":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleCreateUser = async () => {
    try {
      if (!newUser.name || !newUser.email || !newUser.password) {
        toast.error("Name, email, and password are required")
        return
      }

      if (newUser.password.length < 6) {
        toast.error("Password must be at least 6 characters long")
        return
      }

      const createdUserId = await FirebaseAuthService.createUser({
        ...newUser,
        additionalData: {
          maskPersonalInfo: newUser.maskPersonalInfo,
          canLogin: newUser.canLogin
        }
      })
      console.log('Created user ID:', createdUserId)
      // Also create/update user in Snowflake SYS_USER_INFO table
      try {
        await fetch('/api/user-management/snowflake', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: createdUserId,
            name: newUser.name,
            role: newUser.role.toUpperCase(),
            isActive: newUser.isActive,
            email: newUser.email
          })
        })
      } catch (snowflakeError) {
        console.warn('Failed to sync user to Snowflake SYS_USER_INFO:', snowflakeError)
        // Don't fail the entire operation if Snowflake sync fails
      }

        toast.success("User created successfully")
      setIsCreateDialogOpen(false)
      resetForm()
      fetchUsers() // Refresh the list

      // Log activity
      await logActivity(
        'CREATE_USER',
        user?.id || 'unknown',
        user?.name || user?.email || 'unknown',
        user?.email || 'unknown',
        {
          createdUserId: createdUserId!,
          createdUserName: newUser.name,
          createdUserEmail: newUser.email,
          role: newUser.role,
          department: newUser.department,
          permissions: newUser.permissions,
          merchants: newUser.merchants,
          currencies: newUser.currencies,
          memberAccess: newUser.memberAccess,
          canLogin: newUser.canLogin,
          isActive: newUser.isActive,
          maskPersonalInfo: newUser.maskPersonalInfo,
          remark: `User created: ${newUser.name} (${newUser.email}) with role ${newUser.role}`
        }
      )
    } catch (error: any) {
      toast.error(error.message || "Failed to create user")
    }
  }

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await FirebaseAuthService.toggleUserStatus(userId, !currentStatus, user?.id || 'system')
      // Also update user status in Snowflake SYS_USER_INFO table
      try {
        const targetUser = users.find(u => u.id === userId)
        if (targetUser) {
          await fetch('/api/user-management/snowflake', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: userId,
              name: targetUser.name,
              role: targetUser.role,
              isActive: !currentStatus,
              email: targetUser.email
            })
          })
        }
      } catch (snowflakeError) {
        console.warn('Failed to sync user status to Snowflake SYS_USER_INFO:', snowflakeError)
        // Don't fail the entire operation if Snowflake sync fails
      }

      toast.success(`User ${currentStatus ? 'deactivated' : 'activated'} successfully`)
      fetchUsers() // Refresh the list

      // Log activity
      await logActivity(
        'TOGGLE_USER_STATUS',
        user?.id || 'unknown',
        user?.name || user?.email || 'unknown',
        user?.email || 'unknown',
        {
          targetUserId: userId,
          previousStatus: currentStatus,
          newStatus: !currentStatus,
          remark: `User ${currentStatus ? 'deactivated' : 'activated'}`
        }
      )
    } catch (error: any) {
      toast.error(error.message || "Failed to update user status")
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return
    }

    try {
      // Get user details before deletion for logging
      const userToDelete = users.find(u => u.id === userId)
      
      // Also delete user from Snowflake SYS_USER_INFO table
      try {
        await fetch(`/api/user-management/snowflake?userId=${userId}`, {
          method: 'DELETE',
        })
      } catch (snowflakeError) {
        console.warn('Failed to delete user from Snowflake SYS_USER_INFO:', snowflakeError)
        // Don't fail the entire operation if Snowflake sync fails
      }

      await FirebaseAuthService.deleteUser(userId, user?.id || 'system')
      toast.success("User deleted successfully")
      fetchUsers() // Refresh the list

      // Log activity
      await logActivity(
        'DELETE_USER',
        user?.id || 'unknown',
        user?.name || user?.email || 'unknown',
        user?.email || 'unknown',
        {
          deletedUserId: userId,
          deletedUserName: userToDelete?.name || 'Unknown',
          deletedUserEmail: userToDelete?.email || 'Unknown',
          deletedUserRole: userToDelete?.role || 'Unknown',
          deletedUserDepartment: userToDelete?.department || 'Unknown',
          remark: `User deleted: ${userToDelete?.name || 'Unknown'} (${userToDelete?.email || 'Unknown'})`
        }
      )
    } catch (error: any) {
      toast.error(error.message || "Failed to delete user")
    }
  }

  const handleEditUser = (user: FirebaseUser) => {
    setEditingUser(user)
    setNewUser({
      name: user.name,
      email: user.email,
      password: "", // Don't pre-fill password for security
      role: user.role,
      merchants: user.merchants,
      currencies: user.currencies,
      memberAccess: user.memberAccess,
      department: user.department || "",
      region: user.region || "",
      permissions: user.permissions,
      maskPersonalInfo: user.additionalData?.maskPersonalInfo || false,
      canLogin: user.additionalData?.canLogin !== false,
      isActive: user.isActive
    })
    setIsCreateDialogOpen(true)
  }

  const handleUpdateUser = async () => {
    if (!editingUser) return

    try {
      // Update user data
      await FirebaseAuthService.updateUserData(editingUser.id, {
        name: newUser.name,
        role: newUser.role,
        merchants: newUser.merchants,
        currencies: newUser.currencies,
        memberAccess: newUser.memberAccess,
        department: newUser.department,
        region: newUser.region,
        permissions: newUser.permissions,
        isActive: newUser.isActive,
        additionalData: {
          ...editingUser.additionalData,
          maskPersonalInfo: newUser.maskPersonalInfo,
          canLogin: newUser.canLogin
        }
      }, user?.id)

      // Update password if provided
      if (newUser.password && newUser.password.length >= 6) {
        // Note: Password update for other users requires Firebase Admin SDK
        // For now, we'll show a message that password reset email should be sent
        toast.info("User updated. For password changes, use the password reset feature.")
      } else {
        toast.success("User updated successfully")
      }

      // Also update user in Snowflake SYS_USER_INFO table
      try {
        await fetch('/api/user-management/snowflake', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: editingUser.id,
            name: newUser.name,
            role: newUser.role.toUpperCase(),
            isActive: newUser.isActive,
            email: newUser.email
          })
        })
      } catch (snowflakeError) {
        console.warn('Failed to sync user update to Snowflake SYS_USER_INFO:', snowflakeError)
        // Don't fail the entire operation if Snowflake sync fails
      }

      setIsCreateDialogOpen(false)
      setEditingUser(null)
      resetForm()
      fetchUsers() // Refresh the list

      // Log activity
      await logActivity(
        'UPDATE_USER',
        user?.id || 'unknown',
        user?.name || user?.email || 'unknown',
        user?.email || 'unknown',
        {
          updatedUserId: editingUser.id,
          updatedUserName: editingUser.name,
          updatedUserEmail: editingUser.email,
          previousRole: editingUser.role,
          newRole: newUser.role,
          previousDepartment: editingUser.department,
          newDepartment: newUser.department,
          previousPermissions: editingUser.permissions,
          newPermissions: newUser.permissions,
          previousMerchants: editingUser.merchants,
          newMerchants: newUser.merchants,
          previousCurrencies: editingUser.currencies,
          newCurrencies: newUser.currencies,
          previousMemberAccess: editingUser.memberAccess,
          newMemberAccess: newUser.memberAccess,
          previousIsActive: editingUser.isActive,
          newIsActive: newUser.isActive,
          previousCanLogin: editingUser.additionalData?.canLogin,
          newCanLogin: newUser.canLogin,
          previousMaskPersonalInfo: editingUser.additionalData?.maskPersonalInfo,
          newMaskPersonalInfo: newUser.maskPersonalInfo,
          passwordChanged: newUser.password && newUser.password.length >= 6,
          remark: `User updated: ${editingUser.name} (${editingUser.email})`
        }
      )
    } catch (error: any) {
      toast.error(error.message || "Failed to update user")
    }
  }

  const resetForm = () => {
    setNewUser({
      name: "",
      email: "",
      password: "",
      role: "KAM",
      merchants: [],
      currencies: [],
      memberAccess: [],
      department: "",
      region: "",
      permissions: {},
      maskPersonalInfo: false,
      canLogin: true,
      isActive: true
    })
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Never"
    if (timestamp.toDate) {
      return format(timestamp.toDate(), "MMM dd, yyyy")
    }
    return "Never"
  }

  const updateModulePermission = (moduleId: string, permission: Permission, checked: boolean) => {
    const currentPermissions = newUser.permissions[moduleId] || []
    let updatedPermissions: Permission[]

    if (checked) {
      updatedPermissions = [...currentPermissions, permission]
    } else {
      updatedPermissions = currentPermissions.filter(p => p !== permission)
    }

    setNewUser({
      ...newUser,
      permissions: {
        ...newUser.permissions,
        [moduleId]: updatedPermissions
      }
    })
  }

  const hasModulePermission = (moduleId: string, permission: Permission) => {
    return (newUser.permissions[moduleId] || []).includes(permission)
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="User Management" description="Manage user accounts, roles, and permissions" />

        <div className="flex-1 p-6">
          <div className="flex items-center justify-between mb-6">
            {selectedDepartment && (
              <div className="relative w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder={`Search in ${selectedDepartment}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white border-gray-300 focus:border-blue-500"
                />
              </div>
            )}

            {!selectedDepartment && <div />}

            <PermissionGuard module="user-management" permission="ADD">
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingUser(null)
                    resetForm()
                  }} className="bg-blue-600 hover:bg-blue-700">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] md:max-w-6xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      {editingUser ? 'Edit User Permissions' : 'Create New User'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingUser ? 'Update user information and comprehensive permission settings.' : 'Add a new user with detailed role and permission configuration.'}
                    </DialogDescription>
                  </DialogHeader>

                  <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
                      <TabsTrigger value="basic" className="text-xs sm:text-sm">User Settings</TabsTrigger>
                      <TabsTrigger value="permissions" className="text-xs sm:text-sm">Authority Settings</TabsTrigger>
                      <TabsTrigger value="access" className="text-xs sm:text-sm">Projects & Currency</TabsTrigger>
                    </TabsList>

                    <TabsContent value="basic" className="space-y-6">
                      <div className="bg-orange-100 p-4 rounded-lg">
                        <h3 className="font-semibold text-orange-800 mb-4">User Settings</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="department">Department</Label>
                              <Select 
                                value={newUser.department} 
                                onValueChange={(value) => setNewUser({ ...newUser, department: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select department" />
                                </SelectTrigger>
                                <SelectContent>
                                  {DEPARTMENTS.map((dept) => (
                                    <SelectItem key={dept} value={dept}>
                                      {dept}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="canLogin"
                                checked={newUser.canLogin}
                                onCheckedChange={(checked) => setNewUser({ ...newUser, canLogin: checked })}
                              />
                              <Label htmlFor="canLogin">Login</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="isActive"
                                checked={newUser.isActive}
                                onCheckedChange={(checked) => setNewUser({ ...newUser, isActive: checked })}
                              />
                              <Label htmlFor="isActive">Status</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="maskPersonalInfo"
                                checked={newUser.maskPersonalInfo}
                                onCheckedChange={(checked) => setNewUser({ ...newUser, maskPersonalInfo: checked })}
                              />
                              <Label htmlFor="maskPersonalInfo">Masking personal info (YES/NO)</Label>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="name">Name</Label>
                              <Input
                                id="name"
                                value={newUser.name}
                                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                placeholder="Enter full name"
                              />
                            </div>
                            <div>
                              <Label htmlFor="email">Email</Label>
                              <Input
                                id="email"
                                type="email"
                                value={newUser.email}
                                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                placeholder="Enter email address"
                                disabled={!!editingUser}
                              />
                            </div>
                            <div>
                              <Label htmlFor="password">Password</Label>
                              <Input
                                id="password"
                                type="password"
                                value={newUser.password}
                                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                placeholder={editingUser ? "Leave blank to keep current password" : "Enter password (min 6 characters)"}
                              />
                            </div>
                            <div>
                              <Label htmlFor="role">Role</Label>
                              <Select 
                                value={newUser.role}
                                onValueChange={(value) => setNewUser({ ...newUser, role: value as UserRole })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                  {ROLES.map((role) => (
                                    <SelectItem key={role} value={role}>
                                      {role}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="memberData">View Member Data</Label>
                              <Select 
                                value={newUser.memberAccess.length === 2 ? "all" : newUser.memberAccess[0] || "normal"}
                                onValueChange={(value) => {
                                  if (value === "all") {
                                    setNewUser({ ...newUser, memberAccess: ["NORMAL", "VIP"] })
                                  } else if (value === "vip") {
                                    setNewUser({ ...newUser, memberAccess: ["VIP"] })
                                  } else {
                                    setNewUser({ ...newUser, memberAccess: ["NORMAL"] })
                                  }
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All, Normal Only, VIP only</SelectItem>
                                  <SelectItem value="normal">Normal Only</SelectItem>
                                  <SelectItem value="vip">VIP only</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="permissions" className="space-y-6">
                      <div className="bg-orange-100 p-4 rounded-lg">
                        <h3 className="font-semibold text-orange-800 mb-4">Authority Settings</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse min-w-[600px]">
                            <thead>
                              <tr>
                                <th className="text-left p-2 sm:p-3 font-medium border-b text-xs sm:text-sm">Module Name</th>
                                {PERMISSIONS.map(permission => (
                                  <th key={permission} className="text-center p-2 sm:p-3 font-medium border-b min-w-[60px] sm:min-w-[80px] text-xs sm:text-sm">
                                    {permission}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {MODULES.map(module => (
                                <tr key={module.id} className="border-b">
                                  <td className="p-2 sm:p-3 font-medium text-xs sm:text-sm">{module.name}</td>
                                  {PERMISSIONS.map(permission => (
                                    <td key={permission} className="text-center p-2 sm:p-3">
                                      <Checkbox
                                        checked={hasModulePermission(module.id, permission)}
                                        onCheckedChange={(checked) => 
                                          updateModulePermission(module.id, permission, checked as boolean)
                                        }
                                      />
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="access" className="space-y-6">
                      <div className="bg-orange-100 p-4 rounded-lg">
                        <h3 className="font-semibold text-orange-800 mb-4">Projects & Currency Settings</h3>
                        <div className="space-y-6">
                          <div>
                            <Label className="font-medium mb-3 block">Merchant</Label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                              {MERCHANTS.map(merchant => (
                                <div key={merchant} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`merchant-${merchant}`}
                                    checked={newUser.merchants.includes(merchant)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setNewUser({ 
                                          ...newUser, 
                                          merchants: [...newUser.merchants, merchant] 
                                        })
                                      } else {
                                        setNewUser({ 
                                          ...newUser, 
                                          merchants: newUser.merchants.filter(m => m !== merchant) 
                                        })
                                      }
                                    }}
                                  />
                                  <Label htmlFor={`merchant-${merchant}`} className="text-sm">
                                    {merchant}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <Label className="font-medium mb-3 block">Currency</Label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                              {CURRENCIES.map(currency => (
                                <div key={currency} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`currency-${currency}`}
                                    checked={newUser.currencies.includes(currency)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setNewUser({ 
                                          ...newUser, 
                                          currencies: [...newUser.currencies, currency] 
                                        })
                                      } else {
                                        setNewUser({ 
                                          ...newUser, 
                                          currencies: newUser.currencies.filter(c => c !== currency) 
                                        })
                                      }
                                    }}
                                  />
                                  <Label htmlFor={`currency-${currency}`} className="text-sm">
                                    {currency}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-end mt-6 pt-4 border-t">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="w-full sm:w-auto">
                      Reset
                    </Button>
                    <Button onClick={editingUser ? handleUpdateUser : handleCreateUser} className="w-full sm:w-auto">
                      {editingUser ? 'Submit' : 'Submit'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </PermissionGuard>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : selectedDepartment ? (
            <div>
              {/* Department Header */}
              <div className="flex items-center gap-3 mb-4">
                <Button 
                  variant="ghost" 
                  onClick={() => setSelectedDepartment(null)}
                  className="text-gray-600 hover:text-gray-800"
                >
                  ← Back to Departments
                </Button>
                <h2 className="text-xl font-semibold text-gray-900">{selectedDepartment} Department</h2>
                <Badge variant="outline" className="ml-2">
                  {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
                </Badge>
              </div>

              {/* User List */}
              <div className="space-y-2">
                {filteredUsers.map((u) => (
                  <Card key={u.id} className="border border-gray-200 hover:border-gray-300 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        {/* User Info */}
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div className="w-9 h-9 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                            {u.name.charAt(0).toUpperCase()}
                          </div>

                          {/* Basic Info */}
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-gray-900">{u.name}</h3>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${getRoleColor(u.role)}`}
                              >
                                {u.role}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">{u.email}</p>
                          </div>
                        </div>

                        {/* Status & Actions */}
                        <div className="flex items-center gap-4">
                          {/* Status */}
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${u.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                            <span className="text-xs text-gray-500">
                              {u.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            <PermissionGuard module="user-management" permission="EDIT">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleEditUser(u)}
                                className="h-8 w-8 p-0 hover:bg-gray-100"
                              >
                                <Edit className="h-4 w-4 text-gray-600" />
                              </Button>
                            </PermissionGuard>
                            
                            <PermissionGuard module="user-management" permission="EDIT">
                              <Switch 
                                checked={u.isActive} 
                                onCheckedChange={() => handleToggleStatus(u.id, u.isActive)}
                                className="scale-75"
                              />
                            </PermissionGuard>
                            
                            <PermissionGuard module="user-management" permission="DELETE">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDeleteUser(u.id)}
                                className="h-8 w-8 p-0 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </PermissionGuard>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {filteredUsers.length === 0 && (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">No users found</h3>
                      <p className="text-gray-500">
                        {searchTerm 
                          ? "Try adjusting your search terms"
                          : `No users in ${selectedDepartment} department yet`}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ) : (
            <div>
              {/* Department Overview */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Departments</h2>
                <p className="text-gray-600">Click on a department to view and manage users</p>
              </div>

              {/* Department Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {DEPARTMENTS.map((dept) => {
                  const deptUsers = usersByDepartment[dept] || []
                  const activeUsers = deptUsers.filter(u => u.isActive).length
                  
                  return (
                    <Card 
                      key={dept} 
                      className="cursor-pointer border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200"
                      onClick={() => setSelectedDepartment(dept)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                            <span className="text-white font-semibold text-lg">
                              {dept.charAt(0)}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {deptUsers.length} users
                          </Badge>
                        </div>
                        
                        <h3 className="font-semibold text-gray-900 mb-2">{dept}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            {activeUsers} Active
                          </span>
                          <span className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full" />
                            {deptUsers.length - activeUsers} Inactive
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}

                {/* Unassigned Users */}
                {usersByDepartment['Unassigned'] && usersByDepartment['Unassigned'].length > 0 && (
                  <Card 
                    className="cursor-pointer border border-gray-200 hover:border-yellow-300 hover:shadow-md transition-all duration-200"
                    onClick={() => setSelectedDepartment('Unassigned')}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center">
                          <span className="text-white font-semibold text-lg">?</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {usersByDepartment['Unassigned'].length} users
                        </Badge>
                      </div>
                      
                      <h3 className="font-semibold text-gray-900 mb-2">Unassigned</h3>
                      <p className="text-sm text-gray-600">Users without department</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
