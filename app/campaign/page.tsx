"use client";

import { useState, useEffect } from "react";
import { useFirebaseAuth as useAuth } from "@/contexts/firebase-auth-context";
import FirebaseLoginForm from "@/components/auth/firebase-login-form";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import PermissionGuard from "@/components/common/permission-guard";
import AccessDenied from "@/components/common/access-denied";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { TierBadge, PlayerStatusBadge, CallOutcomeBadge, CurrencyBadge } from "@/components/field-badges";
import { Plus, Eye, Play, Pause, BarChart3, Search, Filter, Users, Target, BarChart, LineChart, PieChart, TrendingUp, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { cn, formatDateRangeLabel, formatDateISO } from "@/lib/utils";
import DateRangePicker from "@/components/date-range-picker";
import type { DateRange } from "react-day-picker";
import type { ColumnDef } from "@tanstack/react-table";

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: "Active" | "Paused" | "Completed" | "Draft";
  playerCount: number;
  callsMade: number;
  successRate: number;
  createdDate: string;
  startDate: string;
  endDate: string;
  kam: string;
  project: string;
  region: string;
  currency: string;
  description: string;
  target?: {
    column: "Players" | "Engagement Percent" | "Monthly Deposit";
    aggregation: "COUNT" | "SUM" | "AVG" | "MIN" | "MAX";
  };
}

interface AnalyticsData {
  campaignId: string;
  dailyCalls: { date: string; calls: number }[];
  playerEngagement: { date: string; engagement: number }[];
  successRates: { date: string; rate: number }[];
  playerTiers: { tier: string; count: number }[];
  callOutcomes: { outcome: string; count: number }[];
  revenueImpact: { date: string; revenue: number }[];
}

interface ChartConfig {
  id: string;
  type: "bar" | "line" | "area" | "pie" | "donut" | "dual-axis";
  title: string;
  subtitle?: string;
  xAxis?: string;
  yAxis?: string;
  yAxis2?: string;
  categoryKey?: string;
  dataKey: string;
  color?: string;
  dataSource?: "players-filtered" | "analytics";
}

interface Player {
  id: string;
  name: string;
  tier: "Diamond" | "Platinum" | "Gold" | "Silver" | "Bronze";
  status: "Active" | "Inactive" | "Pending";
  phone: string;
  email: string;
  lastCallDate: string;
  callOutcome: "Successful" | "No Answer" | "Callback" | "Rejected";
  engagementScore: number;
  monthlyDeposit: number;
  currency: string;
  assignedKAM: string;
  notes: string;
}

// Filter criteria interface for dynamic campaign filters
interface FilterCriteria {
  id: string;
  column: string;
  operator: string;
  value: string | string[];
  dataType: "string" | "number" | "boolean";
}

const mockCampaigns: Campaign[] = [
  {
    id: "CAM001",
    name: "January VIP Retention",
    type: "Retention",
    status: "Active",

    playerCount: 45,
    callsMade: 32,
    successRate: 78,
    createdDate: "2024-01-01",
    startDate: "2024-01-01",
    endDate: "2024-01-31",
    kam: "Sarah Johnson",
    project: "Premium Casino",
    region: "North America",
    currency: "USD",

    description: "Monthly retention campaign targeting Diamond and Platinum tier players",
  },
  {
    id: "CAM002",
    name: "Dormant Player Reactivation",
    type: "Reactivation",
    status: "Active",
    playerCount: 28,
    callsMade: 15,
    successRate: 45,
    createdDate: "2024-01-05",
    startDate: "2024-01-05",
    endDate: "2024-02-05",
    kam: "Mike Chen",
    project: "Sports Betting",
    region: "Europe",
    currency: "EUR",
    description: "Reactivating players who haven't logged in for 30+ days",
  },
  {
    id: "CAM003",
    name: "High Value Player Engagement",
    type: "HVP",
    status: "Completed",

    playerCount: 12,
    callsMade: 12,
    successRate: 92,
    createdDate: "2023-12-15",
    startDate: "2023-12-15",
    endDate: "2024-01-15",
    kam: "Sarah Johnson",
    project: "Live Casino",
    region: "Asia Pacific",
    currency: "USD",
    description: "Exclusive engagement for players with $50K+ monthly deposits",
  },
  {
    id: "CAM004",
    name: "HFTD Weekly Check-in",
    type: "HFTD",
    status: "Active",
    playerCount: 8,
    callsMade: 6,
    successRate: 85,
    createdDate: "2024-01-10",
    startDate: "2024-01-10",
    endDate: "2024-01-17",
    kam: "Sarah Johnson",
    project: "Premium Casino",
    region: "North America",
    currency: "USD",
    description: "High Frequency Top Dollar players weekly engagement",
  },
  {
    id: "CAM005",
    name: "European High Rollers",
    type: "HVP",
    status: "Paused",
    playerCount: 15,
    callsMade: 8,
    successRate: 67,
    createdDate: "2024-01-08",
    startDate: "2024-01-08",
    endDate: "2024-02-08",
    kam: "Mike Chen",
    project: "Live Casino",
    region: "Europe",
    currency: "EUR",

    description: "Targeting high-value European players for exclusive tournaments",
  },
];

// Mock analytics data for January VIP Retention campaign
const mockAnalyticsData: AnalyticsData = {
  campaignId: "CAM001",
  dailyCalls: [
    { date: "2024-01-01", calls: 12 },
    { date: "2024-01-02", calls: 15 },
    { date: "2024-01-03", calls: 18 },
    { date: "2024-01-04", calls: 22 },
    { date: "2024-01-05", calls: 25 },
    { date: "2024-01-06", calls: 28 },
    { date: "2024-01-07", calls: 30 },
    { date: "2024-01-08", calls: 32 },
    { date: "2024-01-09", calls: 35 },
    { date: "2024-01-10", calls: 38 },
  ],
  playerEngagement: [
    { date: "2024-01-01", engagement: 65 },
    { date: "2024-01-02", engagement: 68 },
    { date: "2024-01-03", engagement: 72 },
    { date: "2024-01-04", engagement: 75 },
    { date: "2024-01-05", engagement: 78 },
    { date: "2024-01-06", engagement: 82 },
    { date: "2024-01-07", engagement: 85 },
    { date: "2024-01-08", engagement: 88 },
    { date: "2024-01-09", engagement: 90 },
    { date: "2024-01-10", engagement: 92 },
  ],
  successRates: [
    { date: "2024-01-01", rate: 70 },
    { date: "2024-01-02", rate: 72 },
    { date: "2024-01-03", rate: 75 },
    { date: "2024-01-04", rate: 78 },
    { date: "2024-01-05", rate: 80 },
    { date: "2024-01-06", rate: 82 },
    { date: "2024-01-07", rate: 85 },
    { date: "2024-01-08", rate: 87 },
    { date: "2024-01-09", rate: 88 },
    { date: "2024-01-10", rate: 90 },
  ],
  playerTiers: [
    { tier: "Diamond", count: 8 },
    { tier: "Platinum", count: 12 },
    { tier: "Gold", count: 15 },
    { tier: "Silver", count: 10 },
  ],
  callOutcomes: [
    { outcome: "Successful", count: 25 },
    { outcome: "No Answer", count: 5 },
    { outcome: "Callback", count: 3 },
    { outcome: "Rejected", count: 2 },
  ],
  revenueImpact: [
    { date: "2024-01-01", revenue: 15000 },
    { date: "2024-01-02", revenue: 18000 },
    { date: "2024-01-03", revenue: 22000 },
    { date: "2024-01-04", revenue: 25000 },
    { date: "2024-01-05", revenue: 28000 },
    { date: "2024-01-06", revenue: 32000 },
    { date: "2024-01-07", revenue: 35000 },
    { date: "2024-01-08", revenue: 38000 },
    { date: "2024-01-09", revenue: 42000 },
    { date: "2024-01-10", revenue: 45000 },
  ],
};

// Mock player data for January VIP Retention campaign
const mockPlayers: Player[] = [
  {
    id: "P001",
    name: "John Anderson",
    tier: "Diamond",
    status: "Active",
    phone: "+60123456789",
    email: "john.anderson@email.com",
    lastCallDate: "2024-01-10",
    callOutcome: "Successful",
    engagementScore: 95,
    monthlyDeposit: 50000,
    currency: "USD",
    assignedKAM: "Sarah Johnson",
    notes: "High roller player, very responsive to calls",
  },
  {
    id: "P002",
    name: "Maria Rodriguez",
    tier: "Platinum",
    status: "Active",
    phone: "+60187654321",
    email: "maria.rodriguez@email.com",
    lastCallDate: "2024-01-09",
    callOutcome: "Successful",
    engagementScore: 88,
    monthlyDeposit: 25000,
    currency: "USD",
    assignedKAM: "Sarah Johnson",
    notes: "Interested in new promotions",
  },
  {
    id: "P003",
    name: "David Kim",
    tier: "Gold",
    status: "Active",
    phone: "+60111222333",
    email: "david.kim@email.com",
    lastCallDate: "2024-01-08",
    callOutcome: "Callback",
    engagementScore: 72,
    monthlyDeposit: 12000,
    currency: "USD",
    assignedKAM: "Mike Chen",
    notes: "Prefers evening calls",
  },
  {
    id: "P004",
    name: "Lisa Wang",
    tier: "Platinum",
    status: "Active",
    phone: "+60144555666",
    email: "lisa.wang@email.com",
    lastCallDate: "2024-01-10",
    callOutcome: "No Answer",
    engagementScore: 65,
    monthlyDeposit: 30000,
    currency: "USD",
    assignedKAM: "Sarah Johnson",
    notes: "Hard to reach, try different times",
  },
  {
    id: "P005",
    name: "Robert Brown",
    tier: "Silver",
    status: "Active",
    phone: "+60177888999",
    email: "robert.brown@email.com",
    lastCallDate: "2024-01-07",
    callOutcome: "Rejected",
    engagementScore: 45,
    monthlyDeposit: 5000,
    currency: "USD",
    assignedKAM: "Mike Chen",
    notes: "Not interested in current offers",
  },
  {
    id: "P006",
    name: "Emma Davis",
    tier: "Diamond",
    status: "Active",
    phone: "+60122333444",
    email: "emma.davis@email.com",
    lastCallDate: "2024-01-10",
    callOutcome: "Successful",
    engagementScore: 92,
    monthlyDeposit: 75000,
    currency: "USD",
    assignedKAM: "Sarah Johnson",
    notes: "VIP player, excellent engagement",
  },
];

export default function Campaigns() {
  const { user, loading, hasPermission, canAccessMerchant, canAccessCurrency } = useAuth()

  const [campaigns, setCampaigns] = useState<Campaign[]>(mockCampaigns);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>(mockCampaigns);
  const [searchCampaignName, setSearchCampaignName] = useState("");
  const [searchKAM, setSearchKAM] = useState("");
  const [filterCurrency, setFilterCurrency] = useState("all");
  const [filterProject, setFilterProject] = useState("all");
  const [filterRegion, setFilterRegion] = useState("all");
  const [pendingFilters, setPendingFilters] = useState({
    campaignName: "",
    kam: "",
    currency: "all",
    project: "all",
    region: "all",
  });
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isTableLoading, setIsTableLoading] = useState(false);

  const [analyticsData] = useState<AnalyticsData>(mockAnalyticsData);
  const [chartConfigs, setChartConfigs] = useState<ChartConfig[]>([
    {
      id: "daily-calls",
      type: "bar",
      title: "Daily Calls Made",
      subtitle: "Calls per day (sample)",
      xAxis: "Date",
      yAxis: "Number of Calls",
      dataKey: "calls",
      color: "#3b82f6",
      dataSource: "analytics",
    },
    {
      id: "success-rates",
      type: "line",
      title: "Success Rate Trend",
      subtitle: "Rate over time (sample)",
      xAxis: "Date",
      yAxis: "Success Rate (%)",
      dataKey: "rate",
      color: "#10b981",
      dataSource: "analytics",
    },
    {
      id: "player-tiers",
      type: "pie",
      title: "Player Tier Distribution",
      subtitle: "Distribution by tier (sample)",
      xAxis: "Tier",
      yAxis: "Count",
      dataKey: "count",
      dataSource: "analytics",
    },
  ]);

  // Dynamic filter criteria for campaign creation
  const [filterCriteria, setFilterCriteria] = useState<FilterCriteria[]>([]);
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    startDate: "",
    endDate: "",
    description: "",
  });
  const [pendingNewCampaignRange, setPendingNewCampaignRange] = useState<DateRange | undefined>(undefined);
  const [newCampaignTagOption, setNewCampaignTagOption] = useState<string>("Retention");
  const [newCampaignCustomTag, setNewCampaignCustomTag] = useState<string>("");
  const [campaignTarget, setCampaignTarget] = useState<{ column: "Players" | "Engagement Percent" | "Monthly Deposit"; aggregation: "COUNT" | "SUM" | "AVG" | "MIN" | "MAX" }>({ column: "Players", aggregation: "COUNT" });

  // Chart configuration for new campaign
  const [newCampaignCharts, setNewCampaignCharts] = useState<ChartConfig[]>([
    {
      id: "daily-calls",
      type: "bar",
      title: "Daily Calls Made",
      subtitle: "",
      xAxis: "Date",
      yAxis: "Number of Calls",
      dataKey: "calls",
      color: "#3b82f6",
      dataSource: "players-filtered",
    },
    {
      id: "success-rates",
      type: "line",
      title: "Success Rate Trend",
      subtitle: "",
      xAxis: "Date",
      yAxis: "Success Rate (%)",
      dataKey: "rate",
      color: "#10b981",
      dataSource: "players-filtered",
    },
  ]);

  // Initialize filtered on mount
  useEffect(() => {
    // Only apply filters when user is loaded and has proper permissions
    if (!loading && user && hasPermission('campaign', 'VIEW')) {
      applyFilters();
    }
  }, [campaigns, loading, user]);

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

  // Available columns for filtering
  const availableColumns = [
    { name: "Project", type: "string", options: ["Premium Casino", "Sports Betting", "Live Casino", "Poker Room"] },
    { name: "Currency", type: "string", options: ["USD", "EUR", "GBP", "CAD", "MYR", "VND"] },
    { name: "Region", type: "string", options: ["North America", "Europe", "Asia Pacific", "Latin America"] },
    { name: "VIP_Level", type: "string", options: ["Silver", "Gold", "Platinum", "Diamond"] },
    { name: "Status", type: "string", options: ["Active", "Inactive", "Suspended"] },
    { name: "Is_VIP", type: "boolean", options: ["true", "false"] },
    { name: "Is_Active", type: "boolean", options: ["true", "false"] },
    { name: "Has_Bonus", type: "boolean", options: ["true", "false"] },
    { name: "NGR", type: "number" },
    { name: "GGR", type: "number" },
    { name: "Total_Deposit", type: "number" },
    { name: "Monthly_Deposit", type: "number" },
    { name: "FTD", type: "number" },
    { name: "Valid_Bet_Amount", type: "number" },
    { name: "Withdrawal", type: "number" },
    { name: "Promo_Turnover", type: "number" },
    { name: "Engagement_Percent", type: "number" },
  ];

  // Operators for different data types
  const stringOperators = [
    { value: "IN", label: "In (Multiple Values)" },
    { value: "NOT_IN", label: "Not In (Multiple Values)" },
    { value: "=", label: "Equals" },
    { value: "!=", label: "Not Equals" },
    { value: "CONTAINS", label: "Contains" },
    { value: "NOT_CONTAINS", label: "Not Contains" },
  ];

  const numberOperators = [
    { value: "=", label: "Equals" },
    { value: "!=", label: "Not Equals" },
    { value: ">", label: "Greater Than" },
    { value: ">=", label: "Greater Than or Equal" },
    { value: "<", label: "Less Than" },
    { value: "<=", label: "Less Than or Equal" },
    { value: "BETWEEN", label: "Between" },
  ];

  const booleanOperators = [
    { value: "=", label: "Equals" },
    { value: "!=", label: "Not Equals" },
  ];

  // Add new filter criteria
  const addFilterCriteria = () => {
    const newCriteria: FilterCriteria = {
      id: `filter-${Date.now()}`,
      column: "",
      operator: "",
      value: "",
      dataType: "string",
    };
    setFilterCriteria([...filterCriteria, newCriteria]);
  };

  // Remove filter criteria
  const removeFilterCriteria = (id: string) => {
    setFilterCriteria(filterCriteria.filter((criteria) => criteria.id !== id));
  };

  // Update filter criteria
  const updateFilterCriteria = (id: string, field: keyof FilterCriteria, value: any) => {
    setFilterCriteria((prevCriteria) => {
      return prevCriteria.map((criteria) => {
        if (criteria.id === id) {
          return { ...criteria, [field]: value };
        }
        return criteria;
      });
    });
  };

  // Get operators based on column type
  const getOperatorsForColumn = (columnName: string) => {
    const column = availableColumns.find((col) => col.name === columnName);
    if (column?.type === "number") return numberOperators;
    if (column?.type === "boolean") return booleanOperators;
    return stringOperators;
  };

  // Get column type
  const getColumnType = (columnName: string) => {
    const column = availableColumns.find((col) => col.name === columnName);
    return column?.type || "string";
  };

  // Get column options
  const getColumnOptions = (columnName: string) => {
    const column = availableColumns.find((col) => col.name === columnName);
    return column?.options || [];
  };

  // Apply filters on demand
  const applyFilters = () => {
    const filtered = campaigns.filter((campaign) => {
      const matchesCampaignName = searchCampaignName === "" || campaign.name.toLowerCase().includes(searchCampaignName.toLowerCase()) || campaign.description.toLowerCase().includes(searchCampaignName.toLowerCase());
      const matchesKAM = searchKAM === "" || campaign.kam.toLowerCase().includes(searchKAM.toLowerCase());
      const matchesCurrency = filterCurrency === "all" || campaign.currency === filterCurrency;
      const matchesProject = filterProject === "all" || campaign.project === filterProject;
      const matchesRegion = filterRegion === "all" || campaign.region === filterRegion;

      // Access control filter
      const hasAccess = 
        canAccessMerchant(campaign.project) &&
        canAccessCurrency(campaign.currency) &&
        (user?.role === "ADMIN" || campaign.kam === user?.name)

      return matchesCampaignName && matchesKAM && matchesCurrency && matchesProject && matchesRegion && hasAccess;
    });
    setFilteredCampaigns(filtered);
  };

  const handleCreateCampaign = () => {
    if (!newCampaign.name) {
      toast.error("Please fill in the campaign name");
      return;
    }
    if (!pendingNewCampaignRange?.from || !pendingNewCampaignRange?.to) {
      toast.error("Please select a campaign date range");
      return;
    }

    if (filterCriteria.length === 0) {
      toast.error("Please add at least one filter criteria");
      return;
    }

    const campaignType = newCampaignTagOption === "Custom" ? (newCampaignCustomTag.trim() || "Custom") : newCampaignTagOption;

    const campaign: Campaign = {
      id: `CAM${String(campaigns.length + 1).padStart(3, "0")}`,
      name: newCampaign.name,
      type: campaignType,
      status: "Draft",
      playerCount: 0,
      callsMade: 0,
      successRate: 0,
      createdDate: new Date().toISOString().split("T")[0],
      startDate: formatDateISO(pendingNewCampaignRange.from),
      endDate: formatDateISO(pendingNewCampaignRange.to),
      kam: "Sarah Johnson", // Current user
      project: "Premium Casino", // Default
      region: "North America", // Default
      currency: "USD", // Default
      description: newCampaign.description,
    } as Campaign;

    const updatedCampaigns = [...campaigns, campaign];
    setCampaigns(updatedCampaigns);
    setFilteredCampaigns(updatedCampaigns);
    setIsCreateModalOpen(false);

    // Reset form
    setNewCampaign({ name: "", startDate: "", endDate: "", description: "" });
    setPendingNewCampaignRange(undefined);
    setNewCampaignTagOption("Retention");
    setNewCampaignCustomTag("");
    setFilterCriteria([]);

    // Reset chart configuration
    setNewCampaignCharts([
      {
        id: "daily-calls",
        type: "bar",
        title: "Daily Calls Made",
        xAxis: "Date",
        yAxis: "Number of Calls",
        dataKey: "calls",
        color: "#3b82f6",
      },
      {
        id: "success-rates",
        type: "line",
        title: "Success Rate Trend",
        xAxis: "Date",
        yAxis: "Success Rate (%)",
        dataKey: "rate",
        color: "#10b981",
      },
    ]);

    toast.success("Campaign created successfully!");
  };

  const toggleCampaignStatus = (campaignId: string) => {
    const updatedCampaigns = campaigns.map((campaign) => {
      if (campaign.id === campaignId) {
        const newStatus = campaign.status === "Active" ? "Paused" : "Active";
        toast.success(`Campaign ${newStatus.toLowerCase()} successfully!`);
        return { ...campaign, status: newStatus as Campaign["status"] };
      }
      return campaign;
    });
    setCampaigns(updatedCampaigns);
    applyFilters();
  };

  const stats = [
    {
      title: "Active Campaigns",
      value: campaigns.filter((c) => c.status === "Active").length,
      icon: Target,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Total Players",
      value: campaigns.reduce((sum, c) => sum + c.playerCount, 0),
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Calls Made Today",
      value: 47,
      icon: BarChart3,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Average Success Rate",
      value: `${Math.round(campaigns.reduce((sum, c) => sum + c.successRate, 0) / campaigns.length)}%`,
      icon: null,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ];

  const uniqueCurrencies = [...new Set(campaigns.map((c) => c.currency))];
  const uniqueProjects = [...new Set(campaigns.map((c) => c.project))];
  const uniqueRegions = [...new Set(campaigns.map((c) => c.region))];

  // Player column metadata for campaign analytics (used in Analytics modal, not in chart config now)
  const numericPlayerColumns = [
    { key: "engagementScore", label: "Engagement Percent" },
    { key: "monthlyDeposit", label: "Monthly Deposit" },
  ];
  const stringPlayerColumns = [
    { key: "tier", label: "VIP Level" },
    { key: "status", label: "Status" },
    { key: "assignedKAM", label: "Assigned KAM" },
  ];

  // Sortable columns for Analytics Player Details table
  const analyticsPlayerColumns: ColumnDef<Player>[] = [
    {
      accessorKey: "name",
      header: "Player",
      enableSorting: true,
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-sm text-slate-500">{row.original.email}</div>
        </div>
      ),
    },
    {
      accessorKey: "tier",
      header: "Tier",
      enableSorting: true,
      cell: ({ row }) => <TierBadge value={row.original.tier} />,
    },
    {
      accessorKey: "status",
      header: "Status",
      enableSorting: true,
      cell: ({ row }) => <PlayerStatusBadge value={row.original.status} />,
    },
    {
      accessorKey: "lastCallDate",
      header: "Last Call",
      enableSorting: true,
      cell: ({ row }) => <div className="text-sm">{row.original.lastCallDate}</div>,
    },
    {
      accessorKey: "callOutcome",
      header: "Outcome",
      enableSorting: true,
      cell: ({ row }) => <CallOutcomeBadge value={row.original.callOutcome} />,
    },
    {
      accessorKey: "engagementScore",
      header: "Engagement",
      enableSorting: true,
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <div className="w-16 bg-slate-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full"
              style={{ width: `${row.original.engagementScore}%` }}
            />
          </div>
          <span className="text-sm">{row.original.engagementScore}%</span>
        </div>
      ),
    },
    {
      accessorKey: "monthlyDeposit",
      header: "Monthly Deposit",
      enableSorting: true,
      cell: ({ row }) => (
        <span className="font-medium">${row.original.monthlyDeposit.toLocaleString()}</span>
      ),
    },
    {
      accessorKey: "currency",
      header: "Currency",
      enableSorting: true,
      cell: ({ row }) => <CurrencyBadge value={row.original.currency} />,
    },
    {
      accessorKey: "assignedKAM",
      header: "KAM",
      enableSorting: true,
    },
    {
      accessorKey: "notes",
      header: "Notes",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-sm text-slate-600 max-w-xs truncate inline-block">
          {row.original.notes}
        </span>
      ),
    },
  ];

  // Apply filterCriteria to players dataset (subset of columns supported)
  const evaluateString = (actual: string, operator: string, value: any) => {
    const val = typeof value === "string" ? value : String(value);
    if (operator === "IN" && Array.isArray(value)) return value.includes(actual);
    if (operator === "NOT_IN" && Array.isArray(value)) return !value.includes(actual);
    if (operator === "CONTAINS") return actual.toLowerCase().includes(val.toLowerCase());
    if (operator === "NOT_CONTAINS") return !actual.toLowerCase().includes(val.toLowerCase());
    if (operator === "=") return actual === val;
    if (operator === "!=") return actual !== val;
    return true;
  };

  const evaluateNumber = (actual: number, operator: string, value: any) => {
    if (operator === "BETWEEN" && Array.isArray(value)) {
      const [min, max] = value.map((v: any) => Number(v));
      return (isNaN(min) || actual >= min) && (isNaN(max) || actual <= max);
    }
    const v = Number(Array.isArray(value) ? value[0] : value);
    switch (operator) {
      case ">":
        return actual > v;
      case ">=":
        return actual >= v;
      case "<":
        return actual < v;
      case "<=":
        return actual <= v;
      case "=":
        return actual === v;
      case "!=":
        return actual !== v;
      default:
        return true;
    }
  };

  const mapCriteriaColumnToPlayerField = (col: string): { key?: keyof Player; type: "string" | "number" } => {
    if (col === "Engagement_Percent") return { key: "engagementScore", type: "number" };
    if (col === "Monthly_Deposit" || col === "Total_Deposit") return { key: "monthlyDeposit", type: "number" };
    if (col === "VIP_Level") return { key: "tier", type: "string" };
    if (col === "Status") return { key: "status", type: "string" };
    return { type: "string" } as any;
  };

  const getFilteredPlayersFromCriteria = (): Player[] => {
    if (filterCriteria.length === 0) return mockPlayers;
    return mockPlayers.filter((p) => {
      return filterCriteria.every((c) => {
        if (!c.column || !c.operator || !c.value) return true;
        const map = mapCriteriaColumnToPlayerField(c.column);
        if (!map.key) return true; // unsupported column -> ignore
        const actual: any = (p as any)[map.key];
        if (map.type === "string") return evaluateString(String(actual ?? ""), c.operator, c.value);
        return evaluateNumber(Number(actual ?? 0), c.operator, c.value);
      });
    });
  };

  // Aggregation helpers (for future Analytics metrics)
  const computeAggregatedMetric = (players: Player[], agg: "COUNT" | "SUM" | "AVG" | "MIN" | "MAX", column?: string) => {
    if (agg === "COUNT" || !column) return players.length;
    const nums = players.map((p) => Number((p as any)[column] || 0));
    switch (agg) {
      case "SUM":
        return nums.reduce((a, b) => a + b, 0);
      case "AVG":
        return nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100 : 0;
      case "MIN":
        return nums.length ? Math.min(...nums) : 0;
      case "MAX":
        return nums.length ? Math.max(...nums) : 0;
      default:
        return players.length;
    }
  };

  const computeSuccessRate = (players: Player[], crit?: { column: string; operator: string; threshold: number }) => {
    if (!crit || !crit.column) return null;
    const pass = players.filter((p) => evaluateNumber(Number((p as any)[crit.column] || 0), crit.operator, crit.threshold as any)).length;
    const rate = players.length ? Math.round((pass / players.length) * 100) : 0;
    return { rate, pass, total: players.length };
  };

  // Chart component
  const ChartComponent = ({ config, data }: { config: ChartConfig; data: any[] }) => {
    const getChartIcon = (type: string) => {
      switch (type) {
        case "bar":
          return <BarChart className="h-4 w-4" />;
        case "line":
          return <LineChart className="h-4 w-4" />;
        case "area":
          return <TrendingUp className="h-4 w-4" />;
        case "pie":
          return <PieChart className="h-4 w-4" />;
        case "donut":
          return <PieChart className="h-4 w-4" />;
        default:
          return <BarChart className="h-4 w-4" />;
      }
    };

    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {getChartIcon(config.type)}
            <span>{config.title}</span>
          </CardTitle>
          <CardDescription>
            {config.subtitle || (
              <>
                {config.xAxis} {config.yAxis ? `vs ${config.yAxis}` : ""}
                {config.yAxis2 && ` vs ${config.yAxis2}`}
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center bg-slate-50 rounded-lg">
            <div className="text-center">
              <div className="text-4xl font-bold text-slate-400 mb-2">{config.type.toUpperCase()}</div>
              <p className="text-slate-500">Chart visualization for {config.title}</p>
              <p className="text-sm text-slate-400 mt-2">Data points: {data.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Campaign Management" description="Manage VIP retention, reactivation, and engagement campaigns" />

      <div className="flex-1 p-6 overflow-y-auto">

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-slate-900 mb-2">Campaign Module</h1>
                <p className="text-slate-600">Campaign creation and call-tracking tool for player engagement</p>
              </div>
              <PermissionGuard module="campaign" permission="ADD">
                <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700 cursor-pointer">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Campaign
                    </Button>
                  </DialogTrigger>
              <DialogContent className="w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[80vw] xl:w-[75vw] max-w-[95vw] md:max-w-[90vw] lg:max-w-[1200px] xl:max-w-[1400px] max-h-[85vh] overflow-y-auto p-4 md:p-6">
                <DialogHeader>
                  <DialogTitle>Create New Campaign</DialogTitle>
                  <DialogDescription>Set up a new player engagement campaign with dynamic filter criteria.</DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Basic Campaign Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1 md:col-span-2">
                      <Label htmlFor="campaign-name">Campaign Name *</Label>
                      <Input id="campaign-name" value={newCampaign.name} onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })} placeholder="Enter campaign name" />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <Label>Campaign Date Range *</Label>
                      <DateRangePicker
                        date={pendingNewCampaignRange}
                        onDateChange={(range) => setPendingNewCampaignRange(range)}
                        placeholder="Select campaign date range"
              />
            </div>

                    <div>
                      <Label>Campaign Tag</Label>
                      <Select value={newCampaignTagOption} onValueChange={(val) => setNewCampaignTagOption(val)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select tag" />
              </SelectTrigger>
              <SelectContent>

                          <SelectItem value="HVP">HVP</SelectItem>
                          <SelectItem value="HFTD">HFTD</SelectItem>
                          <SelectItem value="Retention">Retention</SelectItem>
                          <SelectItem value="Reactivation">Reactivation</SelectItem>
                          <SelectItem value="Custom">Custom Tag</SelectItem>
              </SelectContent>
            </Select>

                    </div>
                    {newCampaignTagOption === "Custom" && (
                      <div>
                        <Label htmlFor="custom-tag">Custom Tag</Label>
                        <Input id="custom-tag" value={newCampaignCustomTag} onChange={(e) => setNewCampaignCustomTag(e.target.value)} placeholder="Enter custom tag" />
                      </div>
                    )}
                    <div className="col-span-1 md:col-span-2">
                      <Label htmlFor="description">Description</Label>
                      <Input id="description" value={newCampaign.description} onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })} placeholder="Brief description of the campaign" />
                    </div>
          </div>


                  {/* Dynamic Filter Criteria */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-lg font-semibold">Filter Criteria</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addFilterCriteria} className="cursor-pointer">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Filter
            </Button>
        </div>


                    {filterCriteria.length === 0 && (
                      <div className="text-center py-8 bg-slate-50 rounded-lg">
                        <p className="text-slate-500">No filter criteria added yet. Click "Add Filter" to start building your campaign criteria.</p>
                      </div>
                    )}

                    <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                      {filterCriteria.map((criteria, index) => (
                        <div key={criteria.id} className="p-4 border rounded-lg bg-slate-50">
                <div className="flex items-center justify-between mb-3">

                            <h4 className="font-medium">Filter {index + 1}</h4>
                            <Button type="button" variant="outline" size="sm" onClick={() => removeFilterCriteria(criteria.id)} className="text-red-600 hover:text-red-700 cursor-pointer">
                              Remove
                            </Button>
                  </div>


                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Column Selection */}
                            <div>
                              <Label>Column</Label>
                              <Select
                                value={criteria.column}
                                onValueChange={(value) => {
                                  const columnType = getColumnType(value);
                                  updateFilterCriteria(criteria.id, "column", value);
                                  updateFilterCriteria(criteria.id, "dataType", columnType);
                                  updateFilterCriteria(criteria.id, "operator", "");
                                  updateFilterCriteria(criteria.id, "value", columnType === "string" ? [] : "");
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select column" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableColumns.map((column) => (
                                    <SelectItem key={column.name} value={column.name}>
                                      {column.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                </div>


                            {/* Operator Selection */}
                            <div>
                              <Label>Operator</Label>
                              <Select value={criteria.operator} onValueChange={(value) => updateFilterCriteria(criteria.id, "operator", value)} disabled={!criteria.column}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select operator" />
                                </SelectTrigger>
                                <SelectContent>
                                  {getOperatorsForColumn(criteria.column).map((op) => (
                                    <SelectItem key={op.value} value={op.value}>
                                      {op.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                  </div>


                            {/* Value Input */}
                            <div>
                              <Label>Value</Label>
                              {criteria.dataType === "string" && (criteria.operator === "IN" || criteria.operator === "NOT_IN") ? (
                                // Multi-select for string columns with IN/NOT_IN operators
                  <div className="space-y-2">

                                  <div className="flex flex-wrap gap-1">
                                    {Array.isArray(criteria.value) && criteria.value.length > 0 ? (
                                      criteria.value.map((val, idx) => (
                                        <Badge key={idx} variant="secondary" className="text-xs">
                                          {val}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const newValues = (criteria.value as string[]).filter((_, i) => i !== idx);
                                              updateFilterCriteria(criteria.id, "value", newValues);
                                            }}
                                            className="ml-1 text-red-500 hover:text-red-700"
                                          >
                                            ×
                                          </button>
                                        </Badge>
                                      ))
                                    ) : (
                                      <span className="text-sm text-slate-500">No values selected</span>
                                    )}
                    </div>
                                  <Select
                                    onValueChange={(value) => {
                                      const currentValues = Array.isArray(criteria.value) ? criteria.value : [];
                                      if (!currentValues.includes(value)) {
                                        updateFilterCriteria(criteria.id, "value", [...currentValues, value]);
                                      }
                                    }}
                                    disabled={!criteria.operator}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Add values..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {getColumnOptions(criteria.column).map((option) => (
                                        <SelectItem key={option} value={option}>
                                          {option}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              ) : criteria.dataType === "boolean" ? (
                                // Boolean select for boolean columns
                                <Select value={criteria.value as string} onValueChange={(value) => updateFilterCriteria(criteria.id, "value", value)} disabled={!criteria.operator}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select value" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="true">True</SelectItem>
                                    <SelectItem value="false">False</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : criteria.dataType === "string" ? (
                                // Single input for string columns
                                <Input value={criteria.value as string} onChange={(e) => updateFilterCriteria(criteria.id, "value", e.target.value)} placeholder="Enter value" disabled={!criteria.operator} />
                              ) : criteria.operator === "BETWEEN" ? (
                                // Range input for number columns with BETWEEN operator
                                <div className="flex space-x-2">
                                  <Input
                                    value={Array.isArray(criteria.value) ? criteria.value[0] || "" : ""}
                                    onChange={(e) => {
                                      const currentValue = Array.isArray(criteria.value) ? criteria.value : ["", ""];
                                      updateFilterCriteria(criteria.id, "value", [e.target.value, currentValue[1] || ""]);
                                    }}
                                    placeholder="Min"
                                    type="number"
                                    disabled={!criteria.operator}
                                  />
                                  <Input
                                    value={Array.isArray(criteria.value) ? criteria.value[1] || "" : ""}
                                    onChange={(e) => {
                                      const currentValue = Array.isArray(criteria.value) ? criteria.value : ["", ""];
                                      updateFilterCriteria(criteria.id, "value", [currentValue[0] || "", e.target.value]);
                                    }}
                                    placeholder="Max"
                                    type="number"
                                    disabled={!criteria.operator}
                      />
                  </div>

                              ) : (
                                // Single number input
                                <Input value={criteria.value as string} onChange={(e) => updateFilterCriteria(criteria.id, "value", e.target.value)} placeholder="Enter value" type="number" disabled={!criteria.operator} />
                              )}
                    </div>
                    </div>


                          {/* Filter Preview */}
                          {criteria.column && criteria.operator && criteria.value && (
                            <div className="mt-3 p-2 bg-blue-50 rounded text-sm">
                              <span className="font-medium">Preview:</span> {criteria.column} {criteria.operator} {criteria.operator === "BETWEEN" && Array.isArray(criteria.value) ? `${criteria.value[0]} AND ${criteria.value[1]}` : (criteria.operator === "IN" || criteria.operator === "NOT_IN") && Array.isArray(criteria.value) ? `(${criteria.value.join(", ")})` : Array.isArray(criteria.value) ? criteria.value.join(", ") : criteria.value}
                    </div>

                          )}
                  </div>

                      ))}
                    </div>
                  </div>


                  {/* Chart Configuration Section */}
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                      <Label className="text-lg font-semibold">Analytics Charts Configuration</Label>
                      <Button

                        type="button"
                        variant="outline"
                        size="sm"

                        onClick={() => {
                          if (newCampaignCharts.length >= 3) {
                            toast.error("You can add up to 3 charts in the summary.");
                            return;
                          }
                          const newChart: ChartConfig = {
                            id: `chart-${Date.now()}`,
                            type: "bar",
                            title: "New Chart",
                            subtitle: "",
                            xAxis: "X Axis",
                            yAxis: "Y Axis",
                            dataKey: "calls",
                          };
                          setNewCampaignCharts([...newCampaignCharts, newChart]);
                        }}
                        className="cursor-pointer"
                        disabled={newCampaignCharts.length >= 3}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Chart
                      </Button>
                    </div>

                    <div className="space-y-4 max-h-60 overflow-y-auto">
                      {newCampaignCharts.map((config: ChartConfig, index: number) => (
                        <div key={config.id} className="p-4 border rounded-lg bg-slate-50">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                              <Label>Chart Type</Label>
                              <Select
                                value={config.type}
                                onValueChange={(value) => {
                                  const updated = [...newCampaignCharts];
                                  updated[index] = { ...config, type: value as ChartConfig["type"] };
                                  setNewCampaignCharts(updated);
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="bar">Bar Chart</SelectItem>
                                  <SelectItem value="line">Line Chart</SelectItem>
                                  <SelectItem value="area">Area Chart</SelectItem>
                                  <SelectItem value="pie">Pie Chart</SelectItem>
                                  <SelectItem value="donut">Donut Chart</SelectItem>
                                  <SelectItem value="dual-axis">Dual Axis</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Title</Label>
                              <Input
                                value={config.title}
                                onChange={(e) => {
                                  const updated = [...newCampaignCharts];
                                  updated[index] = { ...config, title: e.target.value };
                                  setNewCampaignCharts(updated);
                                }}
                              />
                            </div>
                            <div>
                              <Label>Subtitle</Label>
                              <Input
                                value={config.subtitle || ""}
                                onChange={(e) => {
                                  const updated = [...newCampaignCharts];
                                  updated[index] = { ...config, subtitle: e.target.value };
                                  setNewCampaignCharts(updated);
                                }}
                                placeholder="Optional subtitle"
                              />
                            </div>

                             {/* Conditional Axis Fields - Only for axis-based charts */}
                             {(config.type === "bar" || config.type === "line" || config.type === "area" || config.type === "dual-axis") && (
                              <>
                                <div>
                                  <Label>X Axis</Label>
                                  <Input
                                    value={config.xAxis || ""}
                                    onChange={(e) => {
                                      const updated = [...newCampaignCharts];
                                      updated[index] = { ...config, xAxis: e.target.value };
                                      setNewCampaignCharts(updated);
                                    }}
                                  />
                                </div>
                                <div>
                                  <Label>Y Axis</Label>
                                  <Input
                                    value={config.yAxis || ""}
                                    onChange={(e) => {
                                      const updated = [...newCampaignCharts];
                                      updated[index] = { ...config, yAxis: e.target.value };
                                      setNewCampaignCharts(updated);
                                    }}
                                  />
                                </div>
                              </>
                            )}

                             {/* Y Axis 2 - Only for dual-axis charts */}
                             {config.type === "dual-axis" && (
                              <div>
                                <Label>Y Axis 2</Label>
                                <Input
                                  value={config.yAxis2 || ""}
                                  onChange={(e) => {
                                    const updated = [...newCampaignCharts];
                                    updated[index] = { ...config, yAxis2: e.target.value };
                                    setNewCampaignCharts(updated);
                                  }}
                                />
                              </div>
                            )}

                             {/* Pie/Donut specific fields */}
                             {(config.type === "pie" || config.type === "donut") && (
                               <>
                                 <div>
                                   <Label>Category Key</Label>
                                   <Select
                                     value={config.categoryKey || "tier"}
                                     onValueChange={(value) => {
                                       const updated = [...newCampaignCharts];
                                       updated[index] = { ...config, categoryKey: value };
                                       setNewCampaignCharts(updated);
                                     }}
                                   >
                                     <SelectTrigger>
                                       <SelectValue placeholder="Select category field" />
                                     </SelectTrigger>
                                     <SelectContent>
                                       <SelectItem value="tier">Player Tier</SelectItem>
                                       <SelectItem value="status">Status</SelectItem>
                                       <SelectItem value="assignedKAM">Assigned KAM</SelectItem>
                                     </SelectContent>
                                   </Select>
                                 </div>
                                 <div>
                                   <Label>Value Key</Label>
                                   <Select
                                     value={config.dataKey}
                                     onValueChange={(value) => {
                                       const updated = [...newCampaignCharts];
                                       updated[index] = { ...config, dataKey: value };
                                       setNewCampaignCharts(updated);
                                     }}
                                   >
                                     <SelectTrigger>
                                       <SelectValue placeholder="Select value metric" />
                                     </SelectTrigger>
                                     <SelectContent>
                                       <SelectItem value="count">Count</SelectItem>
                                       <SelectItem value="engagement">Avg Engagement</SelectItem>
                                     </SelectContent>
                                   </Select>
                                 </div>
                               </>
                             )}

                             {/* Data source note: charts always use players from filter criteria */}
                             <div className="lg:col-span-4">
                               <p className="text-xs text-slate-500">Charts use the player list produced by your Filter Criteria. Configure up to 3 charts.</p>
                             </div>
                            <div className="lg:col-span-4 flex justify-end">
                    <Button

                                type="button"
                      variant="outline"
                      size="sm"

                                onClick={() => {
                                  const updated = newCampaignCharts.filter((_, i) => i !== index);
                                  setNewCampaignCharts(updated);
                                }}
                                className="text-red-600 hover:text-red-700 cursor-pointer"
                              >
                                Remove
                    </Button>
                  </div>

                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} className="cursor-pointer">
                    Cancel
                  </Button>
                  <Button onClick={handleCreateCampaign} className="cursor-pointer">
                    Create Campaign
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            </PermissionGuard>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">{stat.title}</p>
                    <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                  {stat.icon && (
                    <div className={`p-3 ${stat.bgColor} rounded-full`}>
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>


        {/* Filters */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Search & Filters</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="campaign-name-search">Campaign Name</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input id="campaign-name-search" placeholder="Search by name or description..." value={pendingFilters.campaignName} onChange={(e) => setPendingFilters((p) => ({ ...p, campaignName: e.target.value }))} className="pl-10" />
                </div>
              </div>
              <div>
                <Label htmlFor="kam-search">KAM</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input id="kam-search" placeholder="Search by KAM..." value={pendingFilters.kam} onChange={(e) => setPendingFilters((p) => ({ ...p, kam: e.target.value }))} className="pl-10" />
                </div>
              </div>
              <div>
                <Label htmlFor="currency-filter">Currency</Label>
                <Select value={pendingFilters.currency} onValueChange={(value) => setPendingFilters((p) => ({ ...p, currency: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Currencies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Currencies</SelectItem>
                    {uniqueCurrencies.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="project-filter">Project (Merchant)</Label>
                <Select value={pendingFilters.project} onValueChange={(value) => setPendingFilters((p) => ({ ...p, project: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {uniqueProjects.map((project) => (
                      <SelectItem key={project} value={project}>
                        {project}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="region-filter">Region</Label>
                <Select value={pendingFilters.region} onValueChange={(value) => setPendingFilters((p) => ({ ...p, region: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Regions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Regions</SelectItem>
                    {uniqueRegions.map((region) => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end mt-4 gap-2">
              <Button
                onClick={() => {
                  setSearchCampaignName(pendingFilters.campaignName);
                  setSearchKAM(pendingFilters.kam);
                  setFilterCurrency(pendingFilters.currency);
                  setFilterProject(pendingFilters.project);
                  setFilterRegion(pendingFilters.region);
                  setIsTableLoading(true);
                  setTimeout(() => {
                    applyFilters();
                    setIsTableLoading(false);
                  }, 500);
                }}
                className="cursor-pointer"
              >
                Apply Filters
                  </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setPendingFilters({ campaignName: "", kam: "", currency: "all", project: "all", region: "all" });
                  setSearchCampaignName("");
                  setSearchKAM("");
                  setFilterCurrency("all");
                  setFilterProject("all");
                  setFilterRegion("all");
                  setIsTableLoading(true);
                  setTimeout(() => {
                    applyFilters();
                    setIsTableLoading(false);
                  }, 300);
                }}
              >
                Clear
              </Button>
              </div>
            </CardContent>
          </Card>


        {/* Campaigns List */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>My Campaigns ({filteredCampaigns.length})</CardTitle>
            <CardDescription>Manage your player engagement campaigns and track progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isTableLoading && (
                <>
                  {[1,2,3,4].map((i) => (
                    <div key={i} className="p-6 border rounded-lg bg-slate-50 animate-pulse">
                      <div className="h-6 w-48 bg-slate-200 rounded mb-4" />
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="h-16 bg-slate-200 rounded" />
                        <div className="h-16 bg-slate-200 rounded" />
                        <div className="h-16 bg-slate-200 rounded" />
                        <div className="h-16 bg-slate-200 rounded" />
                      </div>
                      <div className="h-4 w-full bg-slate-200 rounded" />
                    </div>
                  ))}
                </>
              )}
              {!isTableLoading && filteredCampaigns.map((campaign) => (
                <div key={campaign.id} className="p-6 border rounded-lg bg-gradient-to-r from-white to-slate-50 hover:shadow-md transition-all duration-200 hover:scale-[1.01]">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-3">
                        <h3 className="text-xl font-semibold text-slate-900">{campaign.name}</h3>
                        <Badge className={campaign.type === "HFTD" ? "bg-purple-100 text-purple-800 border-purple-200" : campaign.type === "HVP" ? "bg-red-100 text-red-800 border-red-200" : campaign.type === "Retention" ? "bg-blue-100 text-blue-800 border-blue-200" : "bg-orange-100 text-orange-800 border-orange-200"}>{campaign.type}</Badge>
                        <Badge className={campaign.status === "Active" ? "bg-green-100 text-green-800 border-green-200" : campaign.status === "Paused" ? "bg-yellow-100 text-yellow-800 border-yellow-200" : campaign.status === "Completed" ? "bg-gray-100 text-gray-800 border-gray-200" : "bg-slate-100 text-slate-800 border-slate-200"}>{campaign.status}</Badge>
      </div>

                      <p className="text-slate-600 mb-4">{campaign.description}</p>

                      {/* Campaign Metrics */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <p className="text-sm font-medium text-blue-700">Players</p>
                          <p className="text-2xl font-bold text-blue-900">{campaign.playerCount}</p>
      </div>

                        <div className="bg-green-50 p-3 rounded-lg">
                          <p className="text-sm font-medium text-green-700">Calls Made</p>
                          <p className="text-2xl font-bold text-green-900">{campaign.callsMade}</p>
    </div>

                        <div className="bg-purple-50 p-3 rounded-lg">
                          <p className="text-sm font-medium text-purple-700">Success Rate</p>
                          <p className="text-2xl font-bold text-purple-900">{campaign.successRate}%</p>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-lg">
                          <p className="text-sm font-medium text-orange-700">Duration</p>
                          <p className="text-sm font-bold text-orange-900">
                            {campaign.startDate} - {campaign.endDate}
                          </p>
                        </div>
                      </div>

                      {/* Campaign Details */}
                      <div className="flex items-center space-x-6 text-sm text-slate-600">
                        <div className="flex items-center space-x-1">
                          <span className="font-medium">Project:</span>
                          <span>{campaign.project}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="font-medium">Region:</span>
                          <span>{campaign.region}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="font-medium">Currency:</span>
                          <span>{campaign.currency}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="font-medium">Created:</span>
                          <span>{campaign.createdDate}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2 ml-6">
                      <Dialog
                        open={isViewModalOpen && selectedCampaign?.id === campaign.id}
                        onOpenChange={(open) => {
                          setIsViewModalOpen(open);
                          if (!open) setSelectedCampaign(null);
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setSelectedCampaign(campaign)} className="hover:bg-blue-50 cursor-pointer">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                          <DialogHeader>
                            <DialogTitle className="flex items-center space-x-2">
                              <span>{selectedCampaign?.name}</span>
                              <Badge className={selectedCampaign?.type === "HFTD" ? "bg-purple-100 text-purple-800" : selectedCampaign?.type === "HVP" ? "bg-red-100 text-red-800" : selectedCampaign?.type === "Retention" ? "bg-blue-100 text-blue-800" : "bg-orange-100 text-orange-800"}>{selectedCampaign?.type}</Badge>
                            </DialogTitle>
                            <DialogDescription>Campaign details and performance metrics</DialogDescription>
                          </DialogHeader>
                          {selectedCampaign && (
                            <div className="space-y-6">
                              {/* Performance Overview */}
                              <div className="grid grid-cols-4 gap-4">
                                <div className="text-center p-4 bg-blue-50 rounded-lg">
                                  <p className="text-2xl font-bold text-blue-900">{selectedCampaign.playerCount}</p>
                                  <p className="text-sm text-blue-700">Total Players</p>
                                </div>
                                <div className="text-center p-4 bg-green-50 rounded-lg">
                                  <p className="text-2xl font-bold text-green-900">{selectedCampaign.callsMade}</p>
                                  <p className="text-sm text-green-700">Calls Made</p>
                                </div>
                                <div className="text-center p-4 bg-purple-50 rounded-lg">
                                  <p className="text-2xl font-bold text-purple-900">{selectedCampaign.successRate}%</p>
                                  <p className="text-sm text-purple-700">Success Rate</p>
                                </div>
                                <div className="text-center p-4 bg-orange-50 rounded-lg">
                                  <p className="text-2xl font-bold text-orange-900">{Math.ceil((new Date(selectedCampaign.endDate).getTime() - new Date(selectedCampaign.startDate).getTime()) / (1000 * 60 * 60 * 24))}</p>
                                  <p className="text-sm text-orange-700">Days Duration</p>
                                </div>
                              </div>

                              {/* Campaign Information */}
                              <div className="grid grid-cols-2 gap-6">
                                <div>
                                  <h4 className="font-semibold mb-3 text-slate-900">Campaign Information</h4>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="font-medium text-slate-600">Status:</span>
                                      <Badge className={selectedCampaign.status === "Active" ? "bg-green-100 text-green-800" : selectedCampaign.status === "Paused" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"}>{selectedCampaign.status}</Badge>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="font-medium text-slate-600">Project:</span>
                                      <span>{selectedCampaign.project}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="font-medium text-slate-600">Region:</span>
                                      <span>{selectedCampaign.region}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="font-medium text-slate-600">Currency:</span>
                                      <span>{selectedCampaign.currency}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="font-medium text-slate-600">KAM:</span>
                                      <span>{selectedCampaign.kam}</span>
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-3 text-slate-900">Timeline</h4>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="font-medium text-slate-600">Created:</span>
                                      <span>{selectedCampaign.createdDate}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="font-medium text-slate-600">Start Date:</span>
                                      <span>{selectedCampaign.startDate}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="font-medium text-slate-600">End Date:</span>
                                      <span>{selectedCampaign.endDate}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Description */}
                              <div>
                                <h4 className="font-semibold mb-2 text-slate-900">Description</h4>
                                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">{selectedCampaign.description}</p>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>

                      <Button variant="outline" size="sm" onClick={() => toggleCampaignStatus(campaign.id)} disabled={campaign.status === "Completed"} className={cn("cursor-pointer", campaign.status === "Active" ? "hover:bg-yellow-50 text-yellow-700 border-yellow-200" : "hover:bg-green-50 text-green-700 border-green-200")}>
                        {campaign.status === "Active" ? (
                          <>
                            <Pause className="h-4 w-4 mr-1" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-1" />
                            Start
                          </>
                        )}
                      </Button>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="hover:bg-purple-50 bg-transparent cursor-pointer">
                            <BarChart3 className="h-4 w-4 mr-1" />
                            Analytics
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="min-w-[95vw] max-w-[95vw]">
                          <DialogHeader>
                            <DialogTitle>Campaign Analytics Dashboard - {campaign.name}</DialogTitle>
                            <DialogDescription>View campaign analytics, player details, and performance metrics</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                            {/* Analytics Charts */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {chartConfigs.map((config) => (
                                <ChartComponent key={config.id} config={config} data={config.id === "daily-calls" ? analyticsData.dailyCalls : config.id === "success-rates" ? analyticsData.successRates : config.id === "player-tiers" ? analyticsData.playerTiers : config.id === "call-outcomes" ? analyticsData.callOutcomes : config.id === "revenue-impact" ? analyticsData.revenueImpact : analyticsData.dailyCalls} />
                              ))}
                            </div>

                            {/* Campaign Summary Stats */}
                            <Card className="border-0 shadow-lg">
                              <CardHeader>
                                <CardTitle>Campaign Summary</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                                    <p className="text-2xl font-bold text-blue-900">{mockPlayers.length}</p>
                                    <p className="text-sm text-blue-700">Total Players</p>
                                  </div>
                                  <div className="text-center p-4 bg-green-50 rounded-lg">
                                    <p className="text-2xl font-bold text-green-900">{mockPlayers.filter((p) => p.callOutcome === "Successful").length}</p>
                                    <p className="text-sm text-green-700">Successful Calls</p>
                                  </div>
                                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                                    <p className="text-2xl font-bold text-purple-900">{Math.round(mockPlayers.reduce((sum, p) => sum + p.engagementScore, 0) / mockPlayers.length)}%</p>
                                    <p className="text-sm text-purple-700">Avg Engagement</p>
                                  </div>
                                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                                    <p className="text-2xl font-bold text-orange-900">${mockPlayers.reduce((sum, p) => sum + p.monthlyDeposit, 0).toLocaleString()}</p>
                                    <p className="text-sm text-orange-700">Total Monthly Deposits</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Player Details Table */}
                            <Card className="border-0 shadow-lg">
                              <CardHeader>
                                <CardTitle>Player Details</CardTitle>
                                <CardDescription>Complete list of players in this campaign with their status and metrics</CardDescription>
                              </CardHeader>
                              <CardContent>
                                <DataTable columns={analyticsPlayerColumns} data={mockPlayers} />
                              </CardContent>
                            </Card>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}

