"use client"

import React from "react"
import { useState } from "react"
import { useFirebaseAuth as useAuth } from "@/contexts/firebase-auth-context"
import FirebaseLoginForm from "@/components/auth/firebase-login-form"
import Sidebar from "@/components/layout/sidebar"
import Header from "@/components/layout/header"
import PermissionGuard from "@/components/common/permission-guard"
import AccessDenied from "@/components/common/access-denied"
import { Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TierBadge, PlayerStatusBadge, CurrencyBadge } from "@/components/field-badges"
import {
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Gift,
  MessageSquare,
  Edit,
  ArrowLeft,
  User,
  MapPin,
  Globe,
  CreditCard,
  TrendingUp,
  Clock,
  Star,
  Save,
  Check,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export default function VIPPlayerProfile({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params)
  const { user, loading, hasPermission, canAccessMerchant, canAccessCurrency } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [player, setPlayer] = useState({
    id: resolvedParams.id,
    name: "John Anderson",
    tier: "Diamond",
    email: "john.anderson@email.com",
    phone: "+1-555-0123",
    birthday: "1985-03-15",
    joinDate: "2022-03-15",
    lastLogin: "2024-01-15 14:30",
    totalDeposits: 125000,
    totalWithdrawals: 45000,
    netRevenue: 80000,
    lifetimeValue: 200000,
    status: "Active",
    kam: {
      name: "Sarah Johnson",
      email: "sarah.johnson@company.com",
      phone: "+1-555-0124",
      extension: "1234",
    },
    region: "North America",
    currency: "USD",
    language: "English",
    timezone: "EST",
    address: "123 Main St, New York, NY 10001",
    preferences: {
      games: ["Blackjack", "Roulette", "Baccarat"],
      provider: "Evolution Gaming",
    },
    playerValue: {
      monthlyDeposit: 15000,
      averageBet: 500,
      sessionDuration: "2.5 hours",
      frequency: "Daily",
    },
  })

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

  const interactions = [
    {
      id: 1,
      type: "Call",
      date: "2024-01-15 14:30",
      duration: "15 min",
      notes:
        "Discussed new VIP promotions, player interested in exclusive tournament. Very positive response to luxury watch gift.",
      outcome: "Positive",
      nextAction: "Follow up on tournament invitation",
    },
    {
      id: 2,
      type: "Gift",
      date: "2024-01-10 10:00",
      item: "Luxury Watch",
      status: "Delivered",
      value: "$2,500",
      notes: "Player extremely satisfied with gift quality",
    },
    {
      id: 3,
      type: "Campaign",
      date: "2024-01-05 09:00",
      campaign: "New Year Bonus",
      response: "Participated",
      deposit: "$5,000",
      notes: "Responded immediately to campaign offer",
    },
    {
      id: 4,
      type: "Chat",
      date: "2024-01-03 16:45",
      duration: "8 min",
      notes: "Inquiry about withdrawal limits. Provided VIP support contact.",
      outcome: "Resolved",
    },
  ]

  const giftHistory = [
    {
      id: 1,
      date: "2024-01-10",
      item: "Luxury Watch - Rolex Submariner",
      value: "$2,500",
      status: "Delivered",
      tracking: "DHL123456789",
      occasion: "High Value Player Recognition",
      feedback: "Extremely satisfied",
    },
    {
      id: 2,
      date: "2023-12-25",
      item: "Premium Wine Collection",
      value: "$800",
      status: "Delivered",
      tracking: "FDX987654321",
      occasion: "Holiday Gift",
      feedback: "Loved the selection",
    },
    {
      id: 3,
      date: "2023-11-15",
      item: "Latest iPhone Pro Max",
      value: "$1,200",
      status: "Delivered",
      tracking: "UPS456789123",
      occasion: "Birthday Gift",
      feedback: "Perfect timing",
    },
  ]

  const [callsHistory, setCallsHistory] = useState([
    {
      id: 1,
      date: "2024-01-15 14:30",
      duration: "15 min",
      outcome: "Accepted Offer",
      notes: "Discussed new VIP promotions, player interested in exclusive tournament. Very positive response to luxury watch gift.",
      nextCall: "2024-01-22 15:00",
      scheduled: true,
    },
    {
      id: 2,
      date: "2024-01-08 10:00",
      duration: "8 min",
      outcome: "No Answer",
      notes: "Left voicemail about upcoming VIP event. No response yet.",
      nextCall: "2024-01-16 14:00",
      scheduled: true,
    },
    {
      id: 3,
      date: "2024-01-02 16:45",
      duration: "12 min",
      outcome: "Callback Needed",
      notes: "Player had questions about withdrawal limits. Needs follow-up on new banking options.",
      nextCall: "2024-01-09 11:00",
      scheduled: false,
    },
    {
      id: 4,
      date: "2023-12-28 13:20",
      duration: "20 min",
      outcome: "Accepted Offer",
      notes: "Discussed holiday promotions. Player made immediate deposit of $5,000.",
      nextCall: "2024-01-05 15:00",
      scheduled: true,
    },
    {
      id: 5,
      date: "2023-12-20 09:15",
      duration: "6 min",
      outcome: "No Answer",
      notes: "Quick check-in call. Left message about new year bonuses.",
      nextCall: "2023-12-27 14:00",
      scheduled: false,
    },
  ])

  const campaignOptions = [
    { id: "CAM001", name: "January VIP Retention" },
    { id: "CAM002", name: "Dormant Player Reactivation" },
    { id: "CAM003", name: "High Value Player Engagement" },
    { id: "CAM004", name: "HFTD Weekly Check-in" },
  ]

  const [newCall, setNewCall] = useState({
    date: "",
    duration: "",
    outcome: "",
    notes: "",
    nextCall: "",
    scheduled: false,
    relatedCampaignId: "none" as string,
  })

  const handleAddCall = () => {
    if (!newCall.date || !newCall.duration || !newCall.outcome || !newCall.notes) {
      return
    }
    const nextId = (callsHistory[callsHistory.length - 1]?.id || 0) + 1
    setCallsHistory((prev) => [
      ...prev,
      {
        id: nextId,
        date: newCall.date,
        duration: newCall.duration,
        outcome: newCall.outcome,
        notes:
          newCall.notes +
          (newCall.relatedCampaignId !== "none"
            ? ` (Related: ${campaignOptions.find((c) => c.id === newCall.relatedCampaignId)?.name})`
            : ""),
        nextCall: newCall.nextCall,
        scheduled: newCall.scheduled,
      },
    ])
    setNewCall({ date: "", duration: "", outcome: "", notes: "", nextCall: "", scheduled: false, relatedCampaignId: "none" })
  }

  // Check if user has access to this specific player's data
  const hasAccessToPlayer = 
    canAccessMerchant(player.kam.name) &&
    canAccessCurrency(player.currency) &&
    (user?.role === "ADMIN" || player.kam.name === user?.name)

  if (!hasAccessToPlayer) {
    return <AccessDenied moduleName="VIP Profile Management" />
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="VIP Profile Management" description="Manage individual VIP player profiles and activities" />
        
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-4">
              <Link href="/vip-profile" className="cursor-pointer">
                <Button variant="ghost" size="sm" className="cursor-pointer">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to VIP Profiles
                </Button>
              </Link>
            </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="text-2xl font-semibold bg-purple-100 text-purple-700">
                  {player.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-4xl font-bold text-slate-900">{player.name}</h1>
                <div className="flex items-center space-x-4 mt-2">
                  <span className="text-lg"><TierBadge value={player.tier} /></span>
                  <PlayerStatusBadge value={player.status} />
                  <span className="text-slate-600">ID: {player.id}</span>
                </div>
                <div className="flex items-center space-x-6 mt-3 text-sm text-slate-600">
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4" />
                    <span>{player.region}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Globe className="h-4 w-4" />
                    <span>{player.language}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CreditCard className="h-4 w-4" />
                    <CurrencyBadge value={player.currency} />
                  </div>
                </div>
              </div>
            </div>
            <PermissionGuard module="vip-profile" permission="EDIT">
              <Button
                className="bg-purple-600 hover:bg-purple-700 cursor-pointer"
                onClick={() => {
                  if (isEditing) {
                    toast.success("Profile updated successfully")
                    setIsEditing(false)
                  } else {
                    setIsEditing(true)
                  }
                }}
              >
                {isEditing ? <Save className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
                {isEditing ? "Save" : "Edit"}
              </Button>
            </PermissionGuard>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Lifetime Value</p>
                  <p className="text-2xl font-bold text-purple-600">${player.lifetimeValue.toLocaleString()}</p>
                </div>
                <Star className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Deposits</p>
                  <p className="text-2xl font-bold text-green-600">${player.totalDeposits.toLocaleString()}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Net Revenue</p>
                  <p className="text-2xl font-bold text-blue-600">${player.netRevenue.toLocaleString()}</p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Gifts Sent</p>
                  <p className="text-2xl font-bold text-orange-600">{giftHistory.length}</p>
                </div>
                <Gift className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Interactions</p>
                  <p className="text-2xl font-bold text-indigo-600">{interactions.length}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-indigo-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Player Details */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Player Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-slate-500" />
                {isEditing ? (
                  <Input
                    className="h-8 max-w-xs"
                    value={player.email}
                    onChange={(e) => setPlayer({ ...player, email: e.target.value })}
                    placeholder="Email"
                  />
                ) : (
                  <span className="text-sm">{player.email}</span>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-slate-500" />
                {isEditing ? (
                  <Input
                    className="h-8 max-w-xs"
                    value={player.phone}
                    onChange={(e) => setPlayer({ ...player, phone: e.target.value })}
                    placeholder="Contact number"
                  />
                ) : (
                  <span className="text-sm">{player.phone}</span>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <Calendar className="h-4 w-4 text-slate-500" />
                <span className="text-sm">Birthday: {player.birthday}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Calendar className="h-4 w-4 text-slate-500" />
                <span className="text-sm">Joined: {player.joinDate}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Clock className="h-4 w-4 text-slate-500" />
                <span className="text-sm">Last Login: {player.lastLogin}</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="h-4 w-4 text-slate-500" />
                {isEditing ? (
                  <Input
                    className="h-8 w-full"
                    value={player.address}
                    onChange={(e) => setPlayer({ ...player, address: e.target.value })}
                    placeholder="Address"
                  />
                ) : (
                  <span className="text-sm">{player.address}</span>
                )}
              </div>

              <Separator />
              <div>
                <h4 className="font-semibold mb-2">Assigned KAM</h4>
                <div className="space-y-2 text-sm text-slate-600">
                  <p className="font-medium">{player.kam.name}</p>
                  {/* <div className="flex items-center space-x-1">
                    <Mail className="h-3 w-3" />
                    <span>{player.kam.email}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Phone className="h-3 w-3" />
                    <span>{player.kam.phone} ext. {player.kam.extension}</span>
                  </div> */}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Player Value Metrics</h4>
                <div className="space-y-2 text-sm text-slate-600">
                  <p>Monthly Deposit: ${player.playerValue.monthlyDeposit.toLocaleString()}</p>
                  <p>Average Bet: ${player.playerValue.averageBet}</p>
                  <p>Session Duration: {player.playerValue.sessionDuration}</p>
                  <p>Play Frequency: {player.playerValue.frequency}</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Preferences</h4>
                <div className="space-y-2 text-sm text-slate-600">
                  <p>Games: {player.preferences.games.join(", ")}</p>
                  <p>Provider: {player.preferences.provider}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="interactions" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="interactions" className="cursor-pointer">Timeline</TabsTrigger>
                <TabsTrigger value="gifts" className="cursor-pointer">Gifts</TabsTrigger>
                <TabsTrigger value="calls" className="cursor-pointer">Calls</TabsTrigger>
                <TabsTrigger value="notes" className="cursor-pointer">Notes</TabsTrigger>
              </TabsList>

              <TabsContent value="interactions">
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle>Engagement Timeline</CardTitle>
                    <CardDescription>Complete history of all interactions and touchpoints</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {interactions.map((interaction) => (
                        <div key={interaction.id} className="border-l-4 border-purple-200 pl-6 pb-6 relative">
                          <div className="absolute -left-2 top-0 w-4 h-4 bg-purple-500 rounded-full"></div>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <Badge variant="outline" className="font-medium">
                                {interaction.type}
                              </Badge>
                              {interaction.duration && (
                                <span className="text-sm text-slate-500">Duration: {interaction.duration}</span>
                              )}
                            </div>
                            <span className="text-sm text-slate-500">{interaction.date}</span>
                          </div>

                          {interaction.type === "Call" && (
                            <div className="space-y-2">
                              <p className="text-sm text-slate-700">{interaction.notes}</p>
                              <div className="flex items-center space-x-4">
                                <Badge className="bg-green-100 text-green-800">{interaction.outcome}</Badge>
                                {interaction.nextAction && (
                                  <span className="text-xs text-blue-600">Next: {interaction.nextAction}</span>
                                )}
                              </div>
                            </div>
                          )}

                          {interaction.type === "Gift" && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium">{interaction.item}</p>
                              <p className="text-sm text-slate-600">Value: {interaction.value}</p>
                              <div className="flex items-center space-x-4">
                                <Badge className="bg-blue-100 text-blue-800">{interaction.status}</Badge>
                                {interaction.notes && (
                                  <span className="text-xs text-slate-600">{interaction.notes}</span>
                                )}
                              </div>
                            </div>
                          )}

                          {interaction.type === "Campaign" && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium">{interaction.campaign}</p>
                              <div className="flex items-center space-x-4">
                                <span className="text-sm text-slate-600">Response: {interaction.response}</span>
                                <span className="text-sm text-green-600">Deposit: {interaction.deposit}</span>
                              </div>
                              {interaction.notes && <p className="text-xs text-slate-600">{interaction.notes}</p>}
                            </div>
                          )}

                          {interaction.type === "Chat" && (
                            <div className="space-y-2">
                              <p className="text-sm text-slate-700">{interaction.notes}</p>
                              <Badge className="bg-blue-100 text-blue-800">{interaction.outcome}</Badge>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="gifts">
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle>Gift History</CardTitle>
                    <CardDescription>All gifts sent to this VIP player with feedback</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {giftHistory.map((gift) => (
                        <div
                          key={gift.id}
                          className="flex items-start justify-between p-4 border rounded-lg bg-gradient-to-r from-green-50 to-blue-50"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-lg">{gift.item}</p>
                            <p className="text-sm text-slate-600 mt-1">Occasion: {gift.occasion}</p>
                            <p className="text-sm text-slate-600">Value: {gift.value}</p>
                            <p className="text-sm text-slate-600">Tracking: {gift.tracking}</p>
                            {gift.feedback && (
                              <p className="text-sm text-green-700 mt-2 italic">Feedback: "{gift.feedback}"</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-slate-600">{gift.date}</p>
                            <Badge className="bg-green-100 text-green-800 mt-1">{gift.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="calls">
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle>Calls History</CardTitle>
                    <CardDescription>All past calls with player, outcomes, and scheduled follow-ups</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isEditing && (
                      <div className="p-4 mb-6 border-2 border-dashed border-blue-200 rounded-lg">
                        <h4 className="font-semibold mb-3">Add New Call</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="call-date">Date & Time *</Label>
                            <Input id="call-date" type="datetime-local" value={newCall.date} onChange={(e) => setNewCall((p) => ({ ...p, date: e.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="call-duration">Duration (e.g., 15 min) *</Label>
                            <Input id="call-duration" placeholder="15 min" value={newCall.duration} onChange={(e) => setNewCall((p) => ({ ...p, duration: e.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="call-outcome">Outcome *</Label>
                            <Select value={newCall.outcome} onValueChange={(v) => setNewCall((p) => ({ ...p, outcome: v }))}>
                              <SelectTrigger id="call-outcome"><SelectValue placeholder="Select outcome" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Accepted Offer">Accepted Offer</SelectItem>
                                <SelectItem value="No Answer">No Answer</SelectItem>
                                <SelectItem value="Callback Needed">Callback Needed</SelectItem>
                                <SelectItem value="Resolved">Resolved</SelectItem>
                                <SelectItem value="Rejected">Rejected</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="related-campaign">Related Campaign</Label>
                            <Select value={newCall.relatedCampaignId} onValueChange={(v) => setNewCall((p) => ({ ...p, relatedCampaignId: v }))}>
                              <SelectTrigger id="related-campaign"><SelectValue placeholder="Select campaign or none" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No related campaign</SelectItem>
                                {campaignOptions.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="call-notes">Notes *</Label>
                            <Textarea id="call-notes" rows={3} placeholder="Enter call summary or notes..." value={newCall.notes} onChange={(e) => setNewCall((p) => ({ ...p, notes: e.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="next-call">Next Call (optional)</Label>
                            <Input id="next-call" type="datetime-local" value={newCall.nextCall} onChange={(e) => setNewCall((p) => ({ ...p, nextCall: e.target.value }))} />
                          </div>
                          <div className="flex items-center space-x-2">
                            <input id="scheduled" type="checkbox" className="rounded" checked={newCall.scheduled} onChange={(e) => setNewCall((p) => ({ ...p, scheduled: e.target.checked }))} />
                            <Label htmlFor="scheduled">Scheduled</Label>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 mt-4">
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 cursor-pointer" onClick={handleAddCall}>Add Call</Button>
                          <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => setNewCall({ date: "", duration: "", outcome: "", notes: "", nextCall: "", scheduled: false, relatedCampaignId: "none" })}>Clear</Button>
                        </div>
                      </div>
                    )}
                    <div className="space-y-4">
                      {callsHistory.map((call) => (
                        <div key={call.id} className="border-l-4 border-blue-400 pl-6 pr-4 py-4 relative bg-white rounded-r-lg shadow-sm hover:shadow-lg transition-shadow">
                          
                          {/* Header */}
                          <div className="flex items-start justify-between mb-5">
                            <div className="flex items-center space-x-4">
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "font-medium px-1 text-sm",
                                  call.outcome === "Accepted Offer" && "bg-green-100 text-green-800 border-green-200",
                                  call.outcome === "No Answer" && "bg-yellow-100 text-yellow-800 border-yellow-200",
                                  call.outcome === "Callback Needed" && "bg-blue-100 text-blue-800 border-blue-200"
                                )}
                              >
                                {call.outcome}
                              </Badge>
                              <div className="flex items-center space-x-2 text-slate-500">
                                <Clock className="h-4 w-4" />
                                <span className="text-sm font-medium">{call.duration}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-slate-900">{call.date}</p>
                              <p className="text-xs text-slate-500 mt-1">Call #{call.id}</p>
                            </div>
                          </div>
                          
                          {/* Call Notes */}
                          <div className="mb-6">
                            <p className="text-sm text-slate-700 leading-relaxed">{call.notes}</p>
                          </div>
                          
                          {/* Footer */}
                          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-3">
                                <Calendar className="h-4 w-4 text-slate-500" />
                                <div>
                                  <span className="text-xs text-slate-600 font-medium">Next Call:</span>
                                  <p className="text-sm font-semibold text-slate-900 mt-0.5">{call.nextCall}</p>
                                </div>
                              </div>
                              {call.scheduled && (
                                <Badge className="bg-green-100 text-green-800 text-xs px-3 py-1.5 font-medium">
                                  <Check className="h-3 w-3 mr-1.5" />
                                  Scheduled
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center space-x-3">
                              <PermissionGuard module="vip-profile" permission="EDIT">
                                <Button size="sm" variant="outline" className="text-xs px-3 py-1.5 h-8 cursor-pointer">
                                  <Phone className="h-3 w-3 mr-1.5" />
                                  Schedule Call
                                </Button>
                              </PermissionGuard>
                              <PermissionGuard module="vip-profile" permission="EDIT">
                                <Button size="sm" variant="ghost" className="text-xs px-2 py-1.5 h-8 cursor-pointer">
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </PermissionGuard>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notes">
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle>KAM Notes & Observations</CardTitle>
                    <CardDescription>Private notes and strategic insights about this player</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {isEditing && (
                        <div className="p-4 border-2 border-dashed border-blue-200 rounded-lg">
                          <div className="space-y-3">
                            <div>
                              <Label htmlFor="note-category">Category</Label>
                              <select
                                id="note-category"
                                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                              >
                                <option value="">Select a category...</option>
                                <option value="High Priority">High Priority</option>
                                <option value="Gift Feedback">Gift Feedback</option>
                                <option value="Strategy">Strategy</option>
                                <option value="Communication">Communication</option>
                                <option value="Preferences">Preferences</option>
                                <option value="Follow-up">Follow-up</option>
                                <option value="General">General</option>
                              </select>
                            </div>
                            <div>
                              <Label htmlFor="new-note">Add New Note</Label>
                              <Textarea
                                id="new-note"
                                placeholder="Enter your observations, preferences, or strategic notes..."
                                className="mt-2"
                                rows={4}
                              />
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 cursor-pointer">
                                <Save className="h-3 w-3 mr-1" />
                                Add Note
                              </Button>
                              <Button size="sm" variant="outline" className="cursor-pointer">
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded-lg border-l-4 border-red-500">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-slate-600">January 15, 2024</p>
                            <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">High Priority</Badge>
                          </div>
                          <p className="text-sm">
                            Player showed strong interest in exclusive tournaments. Consider inviting to next
                            high-stakes event. Mentioned preference for live dealer games over slots. Very responsive to
                            personalized communication approach.
                          </p>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-lg border-l-4 border-green-500">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-slate-600">January 10, 2024</p>
                            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Gift Feedback</Badge>
                          </div>
                          <p className="text-sm">
                            Extremely satisfied with luxury watch gift. Mentioned preference for Swiss brands in future.
                            This type of high-end gift resonates well with player's lifestyle and status expectations.
                          </p>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-lg border-l-4 border-blue-500">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-slate-600">December 28, 2023</p>
                            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">Strategy</Badge>
                          </div>
                          <p className="text-sm">
                            Player prefers phone calls over email communication. Best contact time is evenings EST.
                            Responds well to exclusive offers and VIP treatment. Consider quarterly check-ins.
                          </p>
                        </div>
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
    </div>
  )
}
