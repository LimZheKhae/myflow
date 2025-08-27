"use client"

import { useState } from "react"
import { useFirebaseAuth as useAuth } from "@/contexts/firebase-auth-context"
import FirebaseLoginForm from "@/components/auth/firebase-login-form"
import Sidebar from "@/components/layout/sidebar"
import Header from "@/components/layout/header"
import PermissionGuard from "@/components/common/permission-guard"
import AccessDenied from "@/components/common/access-denied"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Plus, Edit, Phone, Gift, Calendar, DollarSign, Users, Mail } from "lucide-react"

// Mock VIP data
const mockVIPs = [
  {
    id: "1",
    name: "John Doe",
    email: "john.doe@example.com",
    phone: "+1234567890",
    merchant: "MERCHANT_A",
    currency: "USD",
    memberType: "VIP" as const,
    totalDeposit: 50000,
    lastActivity: "2024-01-15",
    status: "Active",
    assignedKAM: "1",
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane.smith@example.com",
    phone: "+1234567891",
    merchant: "MERCHANT_B",
    currency: "EUR",
    memberType: "VIP" as const,
    totalDeposit: 75000,
    lastActivity: "2024-01-14",
    status: "Inactive",
    assignedKAM: "1",
  },
]

export default function VIPProfilePage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedVIP, setSelectedVIP] = useState<(typeof mockVIPs)[0] | null>(null)
  const { user, loading, hasPermission, canAccessMerchant, canAccessCurrency } = useAuth()

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

  // Check if user has VIEW permission for vip-profile module
  if (!hasPermission('vip-profile', 'VIEW')) {
    return <AccessDenied moduleName="VIP Profile Management" />
  }

  // Filter VIPs based on user's access rights
  const filteredVIPs = mockVIPs.filter((vip) => {
    const matchesSearch =
      vip.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vip.email.toLowerCase().includes(searchTerm.toLowerCase())
    const hasAccess =
      canAccessMerchant(vip.merchant) &&
      canAccessCurrency(vip.currency) &&
      (user?.role === "ADMIN" || vip.assignedKAM === user?.id)

    return matchesSearch && hasAccess
  })

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="VIP Profile Management" description="Manage individual VIP player profiles and activities" />

      <div className="flex-1 p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Search VIPs by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 w-96 h-12 bg-white/80 border-gray-200 focus:bg-white shadow-sm transition-all duration-200"
              />
            </div>
          </div>

          <PermissionGuard module="vip-profile" permission="ADD">
            <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-12 px-6">
              <Plus className="h-5 w-5 mr-2" />
              Add VIP Player
            </Button>
          </PermissionGuard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* VIP List */}
          <div className="lg:col-span-1">
            <Card className="glass-card hover-lift border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                <CardTitle className="flex items-center gap-2 text-emerald-800">
                  <Users className="w-5 h-5" />
                  VIP Players ({filteredVIPs.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-1 p-4 max-h-96 overflow-y-auto custom-scrollbar">
                  {filteredVIPs.map((vip, index) => (
                    <div
                      key={vip.id}
                      className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
                        selectedVIP?.id === vip.id
                          ? "border-emerald-500 bg-gradient-to-r from-emerald-50 to-teal-50 shadow-lg"
                          : "border-gray-200 hover:bg-gray-50 hover:shadow-md"
                      }`}
                      onClick={() => setSelectedVIP(vip)}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                            <span className="text-white font-bold text-sm">{vip.name.charAt(0).toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{vip.name}</p>
                            <p className="text-sm text-gray-500">{vip.email}</p>
                          </div>
                        </div>
                        <Badge
                          variant={vip.status === "Active" ? "default" : "secondary"}
                          className={
                            vip.status === "Active"
                              ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-sm"
                              : "bg-gray-100 text-gray-600"
                          }
                        >
                          {vip.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs border-emerald-200 text-emerald-700 bg-emerald-50">
                          {vip.merchant}
                        </Badge>
                        <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 bg-blue-50">
                          {vip.currency}
                        </Badge>
                        <Badge variant="outline" className="text-xs border-purple-200 text-purple-700 bg-purple-50">
                          ${vip.totalDeposit.toLocaleString()}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* VIP Details */}
          <div className="lg:col-span-2">
            {selectedVIP ? (
              <Card className="glass-card hover-lift border-0 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-blue-50 via-purple-50 to-indigo-50 border-b border-blue-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
                        <span className="text-white font-bold text-xl">{selectedVIP.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <CardTitle className="text-2xl gradient-text">{selectedVIP.name}</CardTitle>
                        <CardDescription className="text-gray-600 flex items-center gap-2 mt-1">
                          <Mail className="w-4 h-4" />
                          {selectedVIP.email}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <PermissionGuard module="vip-profile" permission="EDIT">
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-white/80 border-blue-200 text-blue-700 hover:bg-blue-50 transition-all duration-200"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Profile
                        </Button>
                      </PermissionGuard>
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-white/80 border-green-200 text-green-700 hover:bg-green-50 transition-all duration-200"
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Call Now
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-white/80 border-purple-200 text-purple-700 hover:bg-purple-50 transition-all duration-200"
                      >
                        <Gift className="h-4 w-4 mr-2" />
                        Send Gift
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="profile" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="profile">Profile</TabsTrigger>
                      <TabsTrigger value="activity">Activity</TabsTrigger>
                      <TabsTrigger value="gifts">Gifts</TabsTrigger>
                      <TabsTrigger value="notes">Notes</TabsTrigger>
                    </TabsList>

                    <TabsContent value="profile" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Phone</label>
                          <p className="text-sm text-gray-600">{selectedVIP.phone}</p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Merchant</label>
                          <p className="text-sm text-gray-600">{selectedVIP.merchant}</p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Currency</label>
                          <p className="text-sm text-gray-600">{selectedVIP.currency}</p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Total Deposit</label>
                          <p className="text-sm text-gray-600 flex items-center">
                            <DollarSign className="h-4 w-4 mr-1" />
                            {selectedVIP.totalDeposit.toLocaleString()}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Last Activity</label>
                          <p className="text-sm text-gray-600 flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {selectedVIP.lastActivity}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Status</label>
                          <Badge variant={selectedVIP.status === "Active" ? "default" : "secondary"}>
                            {selectedVIP.status}
                          </Badge>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="activity">
                      <div className="text-center py-8 text-gray-500">Activity timeline will be displayed here</div>
                    </TabsContent>

                    <TabsContent value="gifts">
                      <div className="text-center py-8 text-gray-500">Gift history will be displayed here</div>
                    </TabsContent>

                    <TabsContent value="notes">
                      <div className="text-center py-8 text-gray-500">Notes and remarks will be displayed here</div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <Card className="glass-card border-0 shadow-xl">
                <CardContent className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-r from-gray-200 to-gray-300 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                      <Users className="h-10 w-10 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-lg">Select a VIP player to view details</p>
                    <p className="text-gray-400 text-sm mt-2">
                      Choose from the list to see comprehensive profile information
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
