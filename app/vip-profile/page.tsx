"use client"

import { useState } from "react"
import { useFirebaseAuth as useAuth } from "@/contexts/firebase-auth-context"
import FirebaseLoginForm from "@/components/auth/firebase-login-form"
import Sidebar from "@/components/layout/sidebar"
import Header from "@/components/layout/header"
import PermissionGuard from "@/components/common/permission-guard"
import AccessDenied from "@/components/common/access-denied"
import { Loader2 } from "lucide-react"
import GeometricLoader from "@/components/ui/geometric-loader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { TierBadge, PlayerStatusBadge, CurrencyBadge } from "@/components/field-badges"
import { Label } from "@/components/ui/label"
import { DataTable } from "@/components/ui/data-table"
import { MultiSelect } from "@/components/ui/multi-select"
import DateRangePicker from "@/components/date-range-picker"
import type { DateRange } from "react-day-picker"
import type { ColumnDef } from "@tanstack/react-table"
import Link from "next/link"

// Helper function to format dates as DD/MM/YYYY
const formatDateDDMMYYYY = (date: Date) => {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

// Define icon components as simple SVGs
const Search = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
)

const Plus = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
)

const Eye = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
    />
  </svg>
)

const Edit = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
    />
  </svg>
)

const Phone = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
    />
  </svg>
)

const Gift = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
    />
  </svg>
)

interface VIPPlayer {
  id: string
  name: string
  tier: "Diamond" | "Platinum" | "Gold" | "Silver" | "Bronze"
  totalDeposits: number
  currency: "MYR" | "SGD" | "USD"
  lastActivity: string
  status: "Active" | "Inactive" | "Dormant"
  kam: string
  phone: string
  email: string
  birthday: string
  preferences: string
}

const mockPlayers: VIPPlayer[] = [
  {
    id: "VIP001",
    name: "John Anderson",
    tier: "Diamond",
    totalDeposits: 125000,
    currency: "USD",
    lastActivity: "2024-01-15",
    status: "Active",
    kam: "A",
    phone: "+1-555-0123",
    email: "john.anderson@email.com",
    birthday: "Mar 15, 1985",
    preferences: "Blackjack, Roulette",
  },
  {
    id: "VIP002",
    name: "Maria Rodriguez",
    tier: "Platinum",
    totalDeposits: 85000,
    currency: "SGD",
    lastActivity: "2024-01-10",
    status: "Active",
    kam: "B",
    phone: "+1-555-0124",
    email: "maria.rodriguez@email.com",
    birthday: "Jun 20, 1990",
    preferences: "Poker, Slots",
  },
  {
    id: "VIP003",
    name: "David Kim",
    tier: "Gold",
    totalDeposits: 45000,
    currency: "MYR",
    lastActivity: "2023-12-20",
    status: "Inactive",
    kam: "A",
    phone: "+1-555-0125",
    email: "david.kim@email.com",
    birthday: "Aug 10, 1988",
    preferences: "Baccarat, Craps",
  },
  {
    id: "VIP004",
    name: "Lisa Wang",
    tier: "Silver",
    totalDeposits: 25000,
    currency: "SGD",
    lastActivity: "2024-01-12",
    status: "Active",
    kam: "C",
    phone: "+1-555-0126",
    email: "lisa.wang@email.com",
    birthday: "Dec 5, 1992",
    preferences: "Slots, Bingo",
  },
  {
    id: "VIP005",
    name: "Robert Smith",
    tier: "Bronze",
    totalDeposits: 15000,
    currency: "MYR",
    lastActivity: "2023-11-30",
    status: "Dormant",
    kam: "B",
    phone: "+1-555-0127",
    email: "robert.smith@email.com",
    birthday: "Jan 20, 1980",
    preferences: "Poker, Blackjack",
  },
]

export default function VIPProfiles() {
  const { user, loading, hasPermission, canAccessMerchant, canAccessCurrency } = useAuth()

  const [searchMemberName, setSearchMemberName] = useState("")
  const [searchPlayerId, setSearchPlayerId] = useState("")
  const [searchKAM, setSearchKAM] = useState("")
  const [pendingMemberName, setPendingMemberName] = useState("")
  const [pendingPlayerId, setPendingPlayerId] = useState("")
  const [pendingKAM, setPendingKAM] = useState("")
  const [players] = useState<VIPPlayer[]>(mockPlayers)
  const [selectedTiers, setSelectedTiers] = useState<string[]>([])
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([])
  const [selectedMerchants, setSelectedMerchants] = useState<string[]>([])
  const [pendingFilters, setPendingFilters] = useState({ tiers: [] as string[], currencies: [] as string[], merchants: [] as string[] })
  const [birthdayRange, setBirthdayRange] = useState<DateRange | undefined>(undefined)
  const [pendingBirthdayRange, setPendingBirthdayRange] = useState<DateRange | undefined>(undefined)
  const [isTableLoading, setIsTableLoading] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <GeometricLoader size="lg" />
          <p className="mt-4 text-gray-600 text-sm">Loading your dashboard...</p>
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

  const columns: ColumnDef<VIPPlayer>[] = [
    {
      accessorKey: "id",
      header: "Player ID",
      enableSorting: true,
    },
    {
      accessorKey: "name",
      header: "Name",
      enableSorting: true,
      cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    },
    {
      accessorKey: "tier",
      header: "Tier",
      enableSorting: true,
      cell: ({ row }) => <TierBadge value={row.getValue("tier") as string} />,
    },
    {
      accessorKey: "totalDeposits",
      header: "Total Deposits",
      enableSorting: true,
      cell: ({ row }) => {
        const amount = Number.parseFloat(row.getValue("totalDeposits"))
        const currency = row.original.currency
        const formatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: currency,
        }).format(amount)
        return <div className="font-medium">{formatted}</div>
      },
    },
    {
      accessorKey: "currency",
      header: "Currency",
      enableSorting: true,
      cell: ({ row }) => <CurrencyBadge value={row.getValue("currency") as string} />,
    },
    {
      accessorKey: "status",
      header: "Status",
      enableSorting: true,
      cell: ({ row }) => <PlayerStatusBadge value={row.getValue("status") as string} />,
    },
    {
      accessorKey: "kam",
      header: "KAM",
      enableSorting: true,
    },
    {
      accessorKey: "lastActivity",
      header: "Last Activity",
      enableSorting: true,
    },
    {
      accessorKey: "phone",
      header: "Phone",
      enableSorting: true,
    },
    {
      accessorKey: "birthday",
      header: "Birthday",
      enableSorting: true,
      cell: ({ row }) => <div className="text-sm">{row.getValue("birthday")}</div>,
    },
    {
      accessorKey: "preferences",
      header: "Preferences",
      enableSorting: true,
      cell: ({ row }) => <div className="text-sm">{row.getValue("preferences")}</div>,
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => {
        const player = row.original
        return (
          <div className="flex space-x-2">
            <PermissionGuard module="vip-profile" permission="VIEW">
              <Link href={`/vip-profile/${player.id}`}>
                <Button variant="ghost" size="sm">
                  <Eye className="h-4 w-4" />
                </Button>
              </Link>
            </PermissionGuard>
            <PermissionGuard module="vip-profile" permission="EDIT">
              <Button variant="ghost" size="sm">
                <Edit className="h-4 w-4" />
              </Button>
            </PermissionGuard>
            <PermissionGuard module="vip-profile" permission="EDIT">
              <Button variant="ghost" size="sm">
                <Phone className="h-4 w-4" />
              </Button>
            </PermissionGuard>
            <PermissionGuard module="vip-profile" permission="EDIT">
              <Button variant="ghost" size="sm">
                <Gift className="h-4 w-4" />
              </Button>
            </PermissionGuard>
          </div>
        )
      },
    },
  ]

  // Filter VIPs based on user's access rights and search criteria
  const filteredPlayers = players.filter((player) => {
    // Text search filter
    const matchesMemberName = searchMemberName === "" || player.name.toLowerCase().includes(searchMemberName.toLowerCase())
    const matchesPlayerId = searchPlayerId === "" || player.id.toLowerCase().includes(searchPlayerId.toLowerCase())
    const matchesKAM = searchKAM === "" || player.kam.toLowerCase().includes(searchKAM.toLowerCase())

    // Tier filter (multi-select)
    const matchesTier = selectedTiers.length === 0 || selectedTiers.includes(player.tier)

    // Currency filter (multi-select)
    const matchesCurrency = selectedCurrencies.length === 0 || selectedCurrencies.includes(player.currency)

    // KAM filter (multi-select)
    const matchesKAMFilter = selectedMerchants.length === 0 || selectedMerchants.includes(player.kam)

    // Birthday date range filter
    const parseBirthdayToDate = (birthdayText: string) => new Date(birthdayText)
    const playerBirthday = parseBirthdayToDate(player.birthday)
    let matchesBirthdayRange = true
    if (birthdayRange?.from && birthdayRange?.to) {
      matchesBirthdayRange = playerBirthday >= birthdayRange.from && playerBirthday <= birthdayRange.to
    } else if (birthdayRange?.from && !birthdayRange.to) {
      matchesBirthdayRange = playerBirthday >= birthdayRange.from
    } else if (!birthdayRange?.from && birthdayRange?.to) {
      matchesBirthdayRange = playerBirthday <= birthdayRange.to
    }

    // Access control filter
    const hasAccess =
      canAccessMerchant(player.kam) &&
      canAccessCurrency(player.currency) &&
      (user?.role === "ADMIN" || player.kam === user?.id)

    return matchesMemberName && matchesPlayerId && matchesKAM && matchesTier && matchesCurrency && matchesKAMFilter && matchesBirthdayRange && hasAccess
  })

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="VIP Profile Management" description="Manage individual VIP player profiles and activities" />

        <div className="flex-1 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">VIP Profile Module</h1>
              <p className="text-slate-600">Player-centric dashboard - Full CRM card for each VIP player</p>
            </div>
            <PermissionGuard module="vip-profile" permission="ADD">
              <Link href="/vip-profiles/new" className="cursor-pointer">
                <Button className="bg-purple-600 hover:bg-purple-700 cursor-pointer">
                  <Plus className="h-4 w-4 mr-2" />
                  Add VIP Player
                </Button>
              </Link>
            </PermissionGuard>
          </div>

          {/* Search and Filters */}
          <Card className="mb-6 border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Search & Filter</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Search Fields Row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="member-name-search">Member Name</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="member-name-search"
                        placeholder="Search by member name..."
                        value={pendingMemberName}
                        onChange={(e) => setPendingMemberName(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="player-id-search">Player ID</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="player-id-search"
                        placeholder="Search by player ID..."
                        value={pendingPlayerId}
                        onChange={(e) => setPendingPlayerId(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="kam-search">KAM</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="kam-search"
                        placeholder="Search by KAM..."
                        value={pendingKAM}
                        onChange={(e) => setPendingKAM(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Tier</Label>
                    <MultiSelect
                      options={[
                        { value: "Diamond", label: "Diamond" },
                        { value: "Platinum", label: "Platinum" },
                        { value: "Gold", label: "Gold" },
                        { value: "Silver", label: "Silver" },
                        { value: "Bronze", label: "Bronze" },
                      ]}
                      selectedValues={pendingFilters.tiers}
                      onSelectionChange={(vals) => setPendingFilters((p) => ({ ...p, tiers: vals }))}
                      placeholder="Filter by Tier"
                      label="Select Tiers"
                    />
                  </div>
                </div>

                {/* Filter Fields Row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Currency</Label>
                    <MultiSelect
                      options={[
                        { value: "USD", label: "USD" },
                        { value: "SGD", label: "SGD" },
                        { value: "MYR", label: "MYR" },
                      ]}
                      selectedValues={pendingFilters.currencies}
                      onSelectionChange={(vals) => setPendingFilters((p) => ({ ...p, currencies: vals }))}
                      placeholder="Filter by Currency"
                      label="Select Currencies"
                    />
                  </div>
                  <div>
                    <Label>Merchants Filter</Label>
                    <MultiSelect
                      options={[
                        { value: "Alpha", label: "Alpha" },
                        { value: "Beta", label: "Beta" },
                      ]}
                      selectedValues={pendingFilters.merchants}
                      onSelectionChange={(vals) => setPendingFilters((p) => ({ ...p, merchants: vals }))}
                      placeholder="Filter by Merchant"
                      label="Select Merchant"
                    />
                  </div>
                  <div>
                    <Label>Birthday Range</Label>
                    <DateRangePicker
                      date={pendingBirthdayRange}
                      onDateChange={setPendingBirthdayRange}
                      placeholder="Pick a birthday range"
                      formatDate={formatDateDDMMYYYY}
                    />
                  </div>
                  <div></div>
                </div>

                {/* Action Buttons Row */}
                <div className="flex justify-end gap-2">
                  <Button
                    onClick={() => {
                      setSearchMemberName(pendingMemberName)
                      setSearchPlayerId(pendingPlayerId)
                      setSearchKAM(pendingKAM)
                      setSelectedTiers(pendingFilters.tiers)
                      setSelectedCurrencies(pendingFilters.currencies)
                      setSelectedMerchants(pendingFilters.merchants)
                      setBirthdayRange(pendingBirthdayRange)
                      setIsTableLoading(true)
                      setTimeout(() => setIsTableLoading(false), 500)
                    }}
                  >
                    Apply Filters
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPendingMemberName("")
                      setPendingPlayerId("")
                      setPendingKAM("")
                      setPendingFilters({ tiers: [], currencies: [], merchants: [] })
                      setPendingBirthdayRange(undefined)
                      setSearchMemberName("")
                      setSearchPlayerId("")
                      setSearchKAM("")
                      setSelectedTiers([])
                      setSelectedCurrencies([])
                      setSelectedMerchants([])
                      setBirthdayRange(undefined)
                      setIsTableLoading(true)
                      setTimeout(() => setIsTableLoading(false), 300)
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Players Table */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>VIP Players ({filteredPlayers.length})</CardTitle>
              <CardDescription>Manage your assigned VIP players and their engagement history</CardDescription>
            </CardHeader>
            <CardContent>
              {isTableLoading ? (
                <div className="space-y-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-10 bg-slate-200 rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <DataTable columns={columns} data={filteredPlayers} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
