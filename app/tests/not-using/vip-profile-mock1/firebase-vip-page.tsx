"use client"

import { useState, useEffect } from "react"
import { useFirebaseAuth } from "@/contexts/firebase-auth-context"
import { VIPProfileService } from "@/lib/firebase-services"
import Header from "@/components/layout/header"
import PermissionGuard from "@/components/common/permission-guard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Search, 
  Plus, 
  Edit, 
  Phone, 
  Gift, 
  Calendar, 
  DollarSign, 
  Users, 
  Mail, 
  Loader2, 
  Save,
  MessageSquare,
  AlertCircle,
  CheckCircle
} from "lucide-react"
import type { FirebaseVIPProfile, VIPNote } from "@/types/firebase"

export default function FirebaseVIPProfilePage() {
  const [vipProfiles, setVIPProfiles] = useState<FirebaseVIPProfile[]>([])
  const [selectedVIP, setSelectedVIP] = useState<FirebaseVIPProfile | null>(null)
  const [vipNotes, setVIPNotes] = useState<VIPNote[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showNoteDialog, setShowNoteDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Form states
  const [newVIP, setNewVIP] = useState({
    name: "",
    email: "",
    phone: "",
    merchant: "",
    currency: "USD",
    memberType: "VIP" as const,
    totalDeposit: 0,
    status: "Active" as const,
  })
  
  const [newNote, setNewNote] = useState({
    content: "",
    type: "General" as const,
    isPrivate: false,
  })

  const { user, canAccessMerchant, canAccessCurrency, logActivity } = useFirebaseAuth()

  // Load VIP profiles on component mount
  useEffect(() => {
    loadVIPProfiles()
  }, [user])

  // Set up real-time listener for VIP profiles
  useEffect(() => {
    if (!user) return

    const filters: any = {}
    
    // Apply user access restrictions
    if (user.role === 'KAM') {
      filters.assignedKAM = user.id
    }

    const unsubscribe = VIPProfileService.onVIPProfilesSnapshot(
      (profiles) => {
        const filteredProfiles = profiles.filter((profile) => {
          return canAccessMerchant(profile.merchant) && canAccessCurrency(profile.currency)
        })
        setVIPProfiles(filteredProfiles)
        setLoading(false)
      },
      filters
    )

    return () => unsubscribe()
  }, [user, canAccessMerchant, canAccessCurrency])

  // Load VIP notes when a VIP is selected
  useEffect(() => {
    if (selectedVIP) {
      loadVIPNotes(selectedVIP.id)
    }
  }, [selectedVIP])

  const loadVIPProfiles = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const filters: any = {}
      
      // Apply user access restrictions
      if (user.role === 'KAM') {
        filters.assignedKAM = user.id
      }

      const { profiles } = await VIPProfileService.getVIPProfiles(filters, { limit: 100 })
      
      // Additional client-side filtering for merchant/currency access
      const filteredProfiles = profiles.filter((profile) => {
        return canAccessMerchant(profile.merchant) && canAccessCurrency(profile.currency)
      })

      setVIPProfiles(filteredProfiles)
    } catch (error: any) {
      setError(`Failed to load VIP profiles: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const loadVIPNotes = async (vipProfileId: string) => {
    try {
      setLoadingNotes(true)
      const notes = await VIPProfileService.getVIPNotes(vipProfileId)
      setVIPNotes(notes)
    } catch (error: any) {
      console.error('Failed to load VIP notes:', error)
    } finally {
      setLoadingNotes(false)
    }
  }

  const handleCreateVIP = async () => {
    if (!user) return

    try {
      setError(null)
      
      // Validate merchant access
      if (!canAccessMerchant(newVIP.merchant)) {
        setError("You don't have access to this merchant")
        return
      }

      const vipData = {
        ...newVIP,
        assignedKAM: user.id,
        lastActivity: new Date() as any,
        playerNotes: [],
        giftHistory: [],
        campaignHistory: [],
        customFields: {},
      }

      await VIPProfileService.createVIPProfile(vipData, user.id)
      
      setSuccess("VIP profile created successfully")
      setShowAddDialog(false)
      setNewVIP({
        name: "",
        email: "",
        phone: "",
        merchant: "",
        currency: "USD",
        memberType: "VIP",
        totalDeposit: 0,
        status: "Active",
      })

      // Log activity
      await logActivity('CREATE_VIP_PROFILE', 'vip-profile', 'vip_profile', '', {
        name: newVIP.name,
        merchant: newVIP.merchant,
      })

    } catch (error: any) {
      setError(`Failed to create VIP profile: ${error.message}`)
    }
  }

  const handleAddNote = async () => {
    if (!selectedVIP || !user) return

    try {
      setError(null)
      
      const noteData = {
        ...newNote,
        vipProfileId: selectedVIP.id,
        attachments: [],
      }

      await VIPProfileService.addVIPNote(selectedVIP.id, noteData, user.id)
      
      setSuccess("Note added successfully")
      setShowNoteDialog(false)
      setNewNote({
        content: "",
        type: "General",
        isPrivate: false,
      })

      // Reload notes
      await loadVIPNotes(selectedVIP.id)

      // Log activity
      await logActivity('ADD_VIP_NOTE', 'vip-profile', 'vip_note', selectedVIP.id, {
        vipName: selectedVIP.name,
        noteType: newNote.type,
      })

    } catch (error: any) {
      setError(`Failed to add note: ${error.message}`)
    }
  }

  // Filter VIPs based on search and status
  const filteredVIPs = vipProfiles.filter((vip) => {
    const matchesSearch =
      vip.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vip.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vip.phone.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || vip.status.toLowerCase() === statusFilter

    return matchesSearch && matchesStatus
  })

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }

  const formatDate = (date: any) => {
    if (!date) return 'N/A'
    const dateObj = date.toDate ? date.toDate() : new Date(date)
    return dateObj.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col">
        <Header title="VIP Profile Management" description="Manage individual VIP player profiles and activities" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading VIP profiles...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header title="VIP Profile Management" description="Manage individual VIP player profiles and activities" />

      <div className="flex-1 p-6">
        {/* Alerts */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Search and Filters */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Search VIPs by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 w-96 h-12 bg-white/80 border-gray-200 focus:bg-white shadow-sm transition-all duration-200"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48 h-12 bg-white/80 border-gray-200 focus:bg-white shadow-sm">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <PermissionGuard module="vip-profile" permission="ADD">
            <Button 
              onClick={() => setShowAddDialog(true)}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-12 px-6"
            >
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
                          {formatCurrency(vip.totalDeposit, vip.currency)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  
                  {filteredVIPs.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p>No VIP players found</p>
                      <p className="text-sm">Adjust your search or filters</p>
                    </div>
                  )}
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
                            {formatCurrency(selectedVIP.totalDeposit, selectedVIP.currency)}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Last Activity</label>
                          <p className="text-sm text-gray-600 flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {formatDate(selectedVIP.lastActivity)}
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

                    <TabsContent value="notes" className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Player Notes</h3>
                        <PermissionGuard module="vip-profile" permission="EDIT">
                          <Button
                            onClick={() => setShowNoteDialog(true)}
                            size="sm"
                            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Add Note
                          </Button>
                        </PermissionGuard>
                      </div>
                      
                      {loadingNotes ? (
                        <div className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
                          <p className="text-gray-600">Loading notes...</p>
                        </div>
                      ) : vipNotes.length > 0 ? (
                        <div className="space-y-3">
                          {vipNotes.map((note) => (
                            <div key={note.id} className="p-4 bg-gray-50 rounded-lg border">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {note.type}
                                  </Badge>
                                  {note.isPrivate && (
                                    <Badge variant="outline" className="text-xs border-red-200 text-red-700 bg-red-50">
                                      Private
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-xs text-gray-500">
                                  {formatDate(note.createdAt)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700">{note.content}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                          <p>No notes available</p>
                          <p className="text-sm">Add a note to track interactions</p>
                        </div>
                      )}
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

        {/* Add VIP Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New VIP Player</DialogTitle>
              <DialogDescription>
                Create a new VIP player profile with basic information
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={newVIP.name}
                  onChange={(e) => setNewVIP({ ...newVIP, name: e.target.value })}
                  placeholder="Enter player name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newVIP.email}
                  onChange={(e) => setNewVIP({ ...newVIP, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={newVIP.phone}
                  onChange={(e) => setNewVIP({ ...newVIP, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="merchant">Merchant</Label>
                  <Select
                    value={newVIP.merchant}
                    onValueChange={(value) => setNewVIP({ ...newVIP, merchant: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select merchant" />
                    </SelectTrigger>
                    <SelectContent>
                      {user?.merchants.map((merchant) => (
                        <SelectItem key={merchant} value={merchant}>
                          {merchant}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={newVIP.currency}
                    onValueChange={(value) => setNewVIP({ ...newVIP, currency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {user?.currencies.map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalDeposit">Total Deposit</Label>
                <Input
                  id="totalDeposit"
                  type="number"
                  value={newVIP.totalDeposit}
                  onChange={(e) => setNewVIP({ ...newVIP, totalDeposit: Number(e.target.value) })}
                  placeholder="Enter total deposit amount"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateVIP} disabled={!newVIP.name || !newVIP.email || !newVIP.merchant}>
                  <Save className="h-4 w-4 mr-2" />
                  Create VIP
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Note Dialog */}
        <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Player Note</DialogTitle>
              <DialogDescription>
                Add a note about your interaction with {selectedVIP?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="noteType">Note Type</Label>
                <Select
                  value={newNote.type}
                  onValueChange={(value: any) => setNewNote({ ...newNote, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="Call">Call</SelectItem>
                    <SelectItem value="Meeting">Meeting</SelectItem>
                    <SelectItem value="Gift">Gift</SelectItem>
                    <SelectItem value="Complaint">Complaint</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="noteContent">Note Content</Label>
                <Textarea
                  id="noteContent"
                  value={newNote.content}
                  onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                  placeholder="Enter your note here..."
                  rows={4}
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPrivate"
                  checked={newNote.isPrivate}
                  onChange={(e) => setNewNote({ ...newNote, isPrivate: e.target.checked })}
                />
                <Label htmlFor="isPrivate" className="text-sm">
                  Make this note private (only visible to you)
                </Label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowNoteDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddNote} disabled={!newNote.content.trim()}>
                  <Save className="h-4 w-4 mr-2" />
                  Add Note
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
} 