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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Gift, Clock, CheckCircle, XCircle, DollarSign, Calendar } from "lucide-react"

const mockGiftRequests = [
  {
    id: "1",
    playerName: "John Doe",
    playerId: "1",
    requestedBy: "1",
    requestedByName: "John KAM",
    giftType: "Cash Bonus",
    amount: 500,
    currency: "USD",
    merchant: "MERCHANT_A",
    reason: "High value player retention",
    status: "Pending",
    createdAt: "2024-01-15",
    approvedBy: null,
    approvedAt: null,
    procurementStatus: null,
  },
  {
    id: "2",
    playerName: "Jane Smith",
    playerId: "2",
    requestedBy: "1",
    requestedByName: "John KAM",
    giftType: "Free Spins",
    amount: 100,
    currency: "EUR",
    merchant: "MERCHANT_B",
    reason: "Reactivation incentive",
    status: "Approved",
    createdAt: "2024-01-14",
    approvedBy: "2",
    approvedAt: "2024-01-14",
    procurementStatus: "Processing",
  },
]

export default function GiftApprovalPage() {
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

  // Check if user has VIEW permission for gift-approval module
  if (!hasPermission('gift-approval', 'VIEW')) {
    return <AccessDenied moduleName="Gift Approval System" />
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Pending":
        return <Clock className="h-4 w-4 text-yellow-600" />
      case "Approved":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "Rejected":
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-800"
      case "Approved":
        return "bg-green-100 text-green-800"
      case "Rejected":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const filteredRequests = mockGiftRequests.filter((request) => {
    const matchesSearch =
      request.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.giftType.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || request.status.toLowerCase() === statusFilter

    // Filter based on user role and ownership
    let hasAccess = true
    if (user?.role === "KAM") {
      hasAccess = request.requestedBy === user.id
    }

    return matchesSearch && matchesStatus && hasAccess
  })

  const pendingRequests = filteredRequests.filter((r) => r.status === "Pending")
  const approvedRequests = filteredRequests.filter((r) => r.status === "Approved")
  const completedRequests = filteredRequests.filter((r) => r.status === "Completed")

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Gift & Approval Management"
        description="Manage gift requests, approvals, and procurement tracking"
      />

      <div className="flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search gift requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-80"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All Requests ({filteredRequests.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pendingRequests.length})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({approvedRequests.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedRequests.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <GiftRequestList requests={filteredRequests} />
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            <GiftRequestList requests={pendingRequests} showApprovalActions={user?.role === "MANAGER"} />
          </TabsContent>

          <TabsContent value="approved" className="space-y-4">
            <GiftRequestList requests={approvedRequests} showProcurementActions={user?.role === "PROCUREMENT"} />
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            <GiftRequestList requests={completedRequests} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function GiftRequestList({
  requests,
  showApprovalActions = false,
  showProcurementActions = false,
}: {
  requests: typeof mockGiftRequests
  showApprovalActions?: boolean
  showProcurementActions?: boolean
}) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Pending":
        return <Clock className="h-4 w-4 text-yellow-600" />
      case "Approved":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "Rejected":
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No gift requests found</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <Card key={request.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(request.status)}
                <div>
                  <CardTitle className="text-lg">{request.playerName}</CardTitle>
                  <CardDescription>
                    Requested by {request.requestedByName} • {request.createdAt}
                  </CardDescription>
                </div>
              </div>
              <Badge
                className={`${
                  request.status === "Pending"
                    ? "bg-yellow-100 text-yellow-800"
                    : request.status === "Approved"
                      ? "bg-green-100 text-green-800"
                      : request.status === "Rejected"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800"
                }`}
              >
                {request.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Gift Type</label>
                  <p className="text-sm text-gray-900">{request.giftType}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Amount</label>
                  <p className="text-sm text-gray-900 flex items-center">
                    <DollarSign className="h-4 w-4 mr-1" />
                    {request.amount} {request.currency}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Merchant</label>
                  <p className="text-sm text-gray-900">{request.merchant}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Reason</label>
                  <p className="text-sm text-gray-900">{request.reason}</p>
                </div>
              </div>

              <div className="space-y-3">
                {request.approvedBy && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Approved</label>
                    <p className="text-sm text-gray-900 flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {request.approvedAt}
                    </p>
                  </div>
                )}
                {request.procurementStatus && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Procurement</label>
                    <Badge variant="outline">{request.procurementStatus}</Badge>
                  </div>
                )}
              </div>
            </div>

            {(showApprovalActions || showProcurementActions) && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                {showApprovalActions && (
                  <PermissionGuard module="gift-approval" permission="EDIT">
                    <>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-600 hover:bg-red-50 bg-transparent"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </>
                  </PermissionGuard>
                )}

                {showProcurementActions && (
                  <PermissionGuard module="gift-approval" permission="EDIT">
                    <Button size="sm" variant="outline">
                      Update Status
                    </Button>
                  </PermissionGuard>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
