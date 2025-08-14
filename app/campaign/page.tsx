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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, Target, Phone, Calendar, Users, Sparkles } from "lucide-react"

const mockCampaigns = [
  {
    id: "1",
    name: "VIP Reactivation Q1",
    type: "Reactivation",
    status: "Active",
    targetCount: 150,
    completedCalls: 45,
    createdBy: "1",
    createdAt: "2024-01-10",
    merchant: "MERCHANT_A",
    currency: "USD",
  },
  {
    id: "2",
    name: "High Value Retention",
    type: "Retention",
    status: "Completed",
    targetCount: 75,
    completedCalls: 75,
    createdBy: "1",
    createdAt: "2024-01-05",
    merchant: "MERCHANT_B",
    currency: "EUR",
  },
]

export default function CampaignPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const { user, loading, hasPermission } = useAuth()

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

  // Check if user has VIEW permission for campaign module
  if (!hasPermission('campaign', 'VIEW')) {
    return <AccessDenied moduleName="Campaign Management" />
  }

  const filteredCampaigns = mockCampaigns.filter((campaign) => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || campaign.status.toLowerCase() === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Campaign Management" description="Manage VIP retention, reactivation, and engagement campaigns" />

      <div className="flex-1 p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Search campaigns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 w-80 h-12 bg-white/80 border-gray-200 focus:bg-white shadow-sm transition-all duration-200"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48 h-12 bg-white/80 border-gray-200 focus:bg-white shadow-sm">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <PermissionGuard module="campaign" permission="ADD">
            <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-12 px-6">
              <Plus className="h-5 w-5 mr-2" />
              Create Campaign
            </Button>
          </PermissionGuard>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampaigns.map((campaign, index) => (
            <Card
              key={campaign.id}
              className="glass-card hover-lift border-0 shadow-xl transition-all duration-300 group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-b border-blue-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <Badge
                    variant={campaign.status === "Active" ? "default" : "secondary"}
                    className={
                      campaign.status === "Active"
                        ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-sm"
                        : campaign.status === "Completed"
                          ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-0 shadow-sm"
                          : "bg-gray-100 text-gray-600"
                    }
                  >
                    {campaign.status}
                  </Badge>
                </div>
                <CardTitle className="text-xl gradient-text group-hover:scale-105 transition-transform duration-300">
                  {campaign.name}
                </CardTitle>
                <CardDescription className="text-gray-600 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  {campaign.type} Campaign
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 font-medium">Campaign Progress</span>
                    <span className="font-bold text-lg gradient-text">
                      {campaign.completedCalls}/{campaign.targetCount}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500 shadow-sm"
                        style={{
                          width: `${(campaign.completedCalls / campaign.targetCount) * 100}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 text-center">
                      {Math.round((campaign.completedCalls / campaign.targetCount) * 100)}% Complete
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                      <Users className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                      <p className="text-sm font-bold text-blue-800">{campaign.targetCount}</p>
                      <p className="text-xs text-blue-600">Targets</p>
                    </div>
                    <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
                      <Phone className="h-5 w-5 text-green-600 mx-auto mb-1" />
                      <p className="text-sm font-bold text-green-800">{campaign.completedCalls}</p>
                      <p className="text-xs text-green-600">Calls</p>
                    </div>
                    <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100">
                      <Calendar className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                      <p className="text-sm font-bold text-purple-800">{campaign.createdAt}</p>
                      <p className="text-xs text-purple-600">Created</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 bg-blue-50">
                      {campaign.merchant}
                    </Badge>
                    <Badge variant="outline" className="text-xs border-purple-200 text-purple-700 bg-purple-50">
                      {campaign.currency}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <PermissionGuard module="campaign" permission="EDIT">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 bg-white/80 border-blue-200 text-blue-700 hover:bg-blue-50 transition-all duration-200"
                      >
                        Manage Campaign
                      </Button>
                    </PermissionGuard>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white/80 border-green-200 text-green-700 hover:bg-green-50 transition-all duration-200"
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredCampaigns.length === 0 && (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No campaigns found</p>
                <PermissionGuard module="campaign" permission="ADD">
                  <Button className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Campaign
                  </Button>
                </PermissionGuard>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      </div>
    </div>
  )
}
