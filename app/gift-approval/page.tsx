"use client";

import { useState } from "react";
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
import { DataTable } from "@/components/ui/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Eye, Upload, CheckCircle, XCircle, Clock, Search, FileText, Truck, Shield, Calendar, User, Package, CheckSquare, Download, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { exportToCSV } from "@/lib/utils";
import { FileUploader } from "@/components/ui/file-uploader";

interface GiftRequest {
  id: string;
  // KAM Input Fields
  date: string;
  pic: string; // KAM who submitted
  memberLogin: string;
  playerName: string;
  phoneNumber: string;
  address: string;
  rewardName?: string;
  gift: string;
  cost: number;
  currency: "MYR" | "VND" | "USD" | "GBP";
  remark: string;
  rewardClubOrder?: string;
  category: "Birthday" | "Retention" | "High Roller" | "Promotion" | "Other";

  // Manager Approval Fields
  managerApproval?: {
    approvedBy: string;
    approvedDate: string;
    rejectedReason?: string;
  };

  // MKTOps Fields
  mktops?: {
    dispatcher?: string; // Courier used
    trackingCode?: string;
    status?: "In Transit" | "Delivered" | "Failed";
    uploadedBO?: string; // BO proof file
    mktOpsProof?: string; // Additional proof
  };

  // KAM Delivery Confirmation Fields
  kamProof?: {
    proofFile?: string; // Screenshot proof
    uploadedBy: string;
    uploadedDate: string;
    receiverFeedback?: string; // Feedback from the gift receiver
  };

  // SalesOps Audit Fields
  salesOps?: {
    checkerName?: string;
    checkedDate?: string;
    remark?: string;
  };

  // Workflow Status
  workflowStatus: "KAM_Request" | "Manager_Review" | "MKTOps_Processing" | "KAM_Proof" | "SalesOps_Audit" | "Completed" | "Rejected";
}

const mockGifts: GiftRequest[] = [
  {
    id: "GFT001",
    date: "2024-01-05",
    pic: "Sarah Johnson",
    memberLogin: "john.anderson",
    playerName: "John Anderson",
    phoneNumber: "+60123456789",
    address: "123 Jalan Ampang, Kuala Lumpur, Malaysia",
    gift: "Luxury Watch - Rolex Submariner",
    cost: 2500,
    currency: "MYR",
    remark: "High roller player celebrating birthday. Consistent monthly deposits of $50K+",
    category: "Birthday",
    workflowStatus: "Completed",
    managerApproval: {
      approvedBy: "David Wilson",
      approvedDate: "2024-01-06",
    },
    mktops: {
      dispatcher: "DHL",
      trackingCode: "DHL123456789",
    status: "Delivered",
      uploadedBO: "BO_GFT001.pdf",
    },
    kamProof: {
      proofFile: "delivery_proof_GFT001.jpg",
      uploadedBy: "Sarah Johnson",
      uploadedDate: "2024-01-10",
    },
    salesOps: {
      checkerName: "Lisa Chen",
      checkedDate: "2024-01-11",
      remark: "All documents verified. Delivery confirmed.",
    },
  },
  {
    id: "GFT002",
    date: "2024-01-12",
    pic: "Mike Chen",
    memberLogin: "maria.rodriguez",
    playerName: "Maria Rodriguez",
    phoneNumber: "+60187654321",
    address: "456 Bukit Bintang, Kuala Lumpur, Malaysia",
    gift: "Premium Wine Collection",
    cost: 800,
    currency: "MYR",
    remark: "Retention gift for platinum tier player",
    category: "Retention",
    workflowStatus: "KAM_Proof",
    managerApproval: {
      approvedBy: "David Wilson",
      approvedDate: "2024-01-13",
    },
    mktops: {
      dispatcher: "FedEx",
      trackingCode: "FDX987654321",
      status: "In Transit",
      uploadedBO: "BO_GFT002.pdf",
    },
  },
  {
    id: "GFT003",
    date: "2024-01-15",
    pic: "Sarah Johnson",
    memberLogin: "david.kim",
    playerName: "David Kim",
    phoneNumber: "+60111222333",
    address: "789 Petaling Street, Kuala Lumpur, Malaysia",
    gift: "Latest iPhone Pro Max",
    cost: 1200,
    currency: "MYR",
    remark: "High roller engagement gift",
    category: "High Roller",
    workflowStatus: "Manager_Review",
  },
  {
    id: "GFT004",
    date: "2024-01-14",
    pic: "Mike Chen",
    memberLogin: "lisa.wang",
    playerName: "Lisa Wang",
    phoneNumber: "+60144555666",
    address: "321 Chinatown, Kuala Lumpur, Malaysia",
    gift: "Designer Handbag",
    cost: 1800,
    currency: "MYR",
    remark: "VIP player birthday celebration",
    category: "Birthday",
    workflowStatus: "MKTOps_Processing",
    managerApproval: {
      approvedBy: "David Wilson",
      approvedDate: "2024-01-15",
    },
  },
  {
    id: "GFT005",
    date: "2024-01-13",
    pic: "Sarah Johnson",
    memberLogin: "robert.brown",
    playerName: "Robert Brown",
    phoneNumber: "+60177888999",
    address: "654 Bangsar, Kuala Lumpur, Malaysia",
    gift: "Gaming Console Bundle",
    cost: 600,
    currency: "MYR",
    remark: "Promotion reward for new player",
    category: "Promotion",
    workflowStatus: "Manager_Review",
    managerApproval: {
      approvedBy: "David Wilson",
      approvedDate: "2024-01-13",
      rejectedReason: "Player tier does not qualify for this gift value",
    },
  },
  {
    id: "GFT006",
    date: "2024-01-11",
    pic: "Mike Chen",
    memberLogin: "emma.davis",
    playerName: "Emma Davis",
    phoneNumber: "+60122333444",
    address: "987 Mont Kiara, Kuala Lumpur, Malaysia",
    gift: "Spa Weekend Package",
    cost: 1500,
    currency: "MYR",
    remark: "High roller retention gift",
    category: "Retention",
    workflowStatus: "KAM_Proof",
    managerApproval: {
      approvedBy: "David Wilson",
      approvedDate: "2024-01-12",
    },
    mktops: {
      dispatcher: "DHL",
      trackingCode: "DHL654321987",
      status: "Delivered",
      uploadedBO: "BO_GFT006.pdf",
    },
  },
  {
    id: "GFT007",
    date: "2024-01-16",
    pic: "Sarah Johnson",
    memberLogin: "alex.tan",
    playerName: "Alex Tan",
    phoneNumber: "+60155666777",
    address: "555 KLCC, Kuala Lumpur, Malaysia",
    gift: "Premium Headphones",
    cost: 900,
    currency: "MYR",
    remark: "VIP player engagement gift",
    category: "High Roller",
    workflowStatus: "MKTOps_Processing",
    managerApproval: {
      approvedBy: "David Wilson",
      approvedDate: "2024-01-17",
    },
  },
  {
    id: "GFT008",
    date: "2024-01-18",
    pic: "Mike Chen",
    memberLogin: "sophia.lee",
    playerName: "Sophia Lee",
    phoneNumber: "+60166777888",
    address: "777 Damansara, Kuala Lumpur, Malaysia",
    gift: "Luxury Perfume Set",
    cost: 1200,
    currency: "MYR",
    remark: "Birthday gift for platinum tier player",
    category: "Birthday",
    workflowStatus: "MKTOps_Processing",
    managerApproval: {
      approvedBy: "David Wilson",
      approvedDate: "2024-01-19",
    },
  },
  {
    id: "GFT009",
    date: "2024-01-20",
    pic: "Sarah Johnson",
    memberLogin: "james.wong",
    playerName: "James Wong",
    phoneNumber: "+60177888999",
    address: "888 Subang, Kuala Lumpur, Malaysia",
    gift: "Smart Watch",
    cost: 1500,
    currency: "MYR",
    remark: "Retention gift for high roller",
    category: "Retention",
    workflowStatus: "MKTOps_Processing",
    managerApproval: {
      approvedBy: "David Wilson",
      approvedDate: "2024-01-21",
    },
  },
  {
    id: "GFT010",
    date: "2024-01-22",
    pic: "Mike Chen",
    memberLogin: "anna.ng",
    playerName: "Anna Ng",
    phoneNumber: "+60188999000",
    address: "999 KL Sentral, Kuala Lumpur, Malaysia",
    gift: "Luxury Sunglasses",
    cost: 1100,
    currency: "MYR",
    remark: "VIP player engagement gift",
    category: "High Roller",
    workflowStatus: "KAM_Proof",
    managerApproval: {
      approvedBy: "David Wilson",
      approvedDate: "2024-01-23",
    },
    mktops: {
      dispatcher: "DHL",
      trackingCode: "DHL111222333",
      status: "Delivered",
      uploadedBO: "BO_GFT010.pdf",
    },
  },
  {
    id: "GFT011",
    date: "2024-01-24",
    pic: "Sarah Johnson",
    memberLogin: "peter.lee",
    playerName: "Peter Lee",
    phoneNumber: "+60199000111",
    address: "111 Mid Valley, Kuala Lumpur, Malaysia",
    gift: "Premium Wine Collection",
    cost: 1800,
    currency: "MYR",
    remark: "High roller retention gift",
    category: "Retention",
    workflowStatus: "SalesOps_Audit",
    managerApproval: {
      approvedBy: "David Wilson",
      approvedDate: "2024-01-25",
    },
    mktops: {
      dispatcher: "FedEx",
      trackingCode: "FDX444555666",
      status: "Delivered",
      uploadedBO: "BO_GFT011.pdf",
    },
    kamProof: {
      proofFile: "delivery_proof_GFT011.jpg",
      uploadedBy: "Sarah Johnson",
      uploadedDate: "2024-01-26",
    },
  },
  {
    id: "GFT012",
    date: "2024-01-26",
    pic: "Sarah Johnson",
    memberLogin: "emma.wilson",
    playerName: "Emma Wilson",
    phoneNumber: "+44 7911 123456",
    address: "London, UK",
    gift: "Designer Handbag",
    cost: 1800,
    currency: "GBP",
    remark: "Birthday gift for VIP player",
    category: "Birthday",
    workflowStatus: "SalesOps_Audit",
    managerApproval: {
      approvedBy: "David Wilson",
      approvedDate: "2024-01-27",
    },
    mktops: {
      dispatcher: "DHL Express",
      trackingCode: "DHL777888999",
      status: "Delivered",
      uploadedBO: "BO_GFT012.pdf",
      mktOpsProof: "delivery_proof_GFT012.jpg",
    },
    kamProof: {
      proofFile: "delivery_confirmation_GFT012.jpg",
      uploadedBy: "Sarah Johnson",
      uploadedDate: "2024-01-28",
    },
  },
];

interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  status: "completed" | "pending" | "current" | "rejected";
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}

export default function Gifts() {
  const [gifts, setGifts] = useState<GiftRequest[]>(mockGifts);
  // Actions are now based on workflow status, not user role - Audit functionality added
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedGift, setSelectedGift] = useState<GiftRequest | null>(null);
  
  // Clear row selection when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setRowSelection({}); // Clear selection when switching tabs
  };
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isMKTOpsModalOpen, setIsMKTOpsModalOpen] = useState(false);
  const [isKAMProofModalOpen, setIsKAMProofModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [rejectingGiftId, setRejectingGiftId] = useState<string>("");
  const [rejectReason, setRejectReason] = useState("");
  const [mktopsForm, setMktopsForm] = useState({
    giftId: "",
    dispatcher: "",
    trackingCode: "",
    status: "In Transit" as "In Transit" | "Delivered" | "Failed",
    uploadedBO: false,
    mktOpsProof: null as File | null,
  });

  const [kamProofForm, setKAMProofForm] = useState({
    proofFile: null as File | null,
    receiverFeedback: "",
  });

  const [auditForm, setAuditForm] = useState({
    checkerName: "",
    remark: "",
  });
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [requestForm, setRequestForm] = useState({
    vipId: "",
    giftItem: "",
    value: "",
    remark: "",
    category: "" as "Birthday" | "Retention" | "High Roller" | "Promotion" | "Other" | "",
  });

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

  // Check if user has VIEW permission for gift-approval module
  if (!hasPermission('gift-approval', 'VIEW')) {
    return <AccessDenied moduleName="Gift Approval System" />
  }


  // Mock VIP players assigned to this KAM account
  const assignedVIPPlayers = [
    { id: "VIP001", name: "John Anderson", login: "john.anderson" },
    { id: "VIP002", name: "Maria Rodriguez", login: "maria.rodriguez" },
    { id: "VIP003", name: "David Kim", login: "david.kim" },
    { id: "VIP004", name: "Lisa Wang", login: "lisa.wang" },
    { id: "VIP005", name: "Robert Brown", login: "robert.brown" },
    { id: "VIP006", name: "Emma Davis", login: "emma.davis" },
  ];

  const handleFormChange = (field: string, value: string) => {
    setRequestForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmitRequest = () => {
    // Validate all required fields
    if (!requestForm.vipId || !requestForm.giftItem || !requestForm.value || !requestForm.remark || !requestForm.category) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate value is a number
    const numericValue = parseFloat(requestForm.value);
    if (isNaN(numericValue) || numericValue <= 0) {
      toast.error("Please enter a valid value amount");
      return;
    }

    // Find the selected VIP player
    const selectedVIP = assignedVIPPlayers.find(vip => vip.id === requestForm.vipId);
    if (!selectedVIP) {
      toast.error("Please select a valid VIP player");
      return;
    }

    // Create new gift request
    const newGift: GiftRequest = {
      id: `GFT${String(gifts.length + 1).padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      pic: "Sarah Johnson", // Auto-filled from logged-in user
      memberLogin: selectedVIP.login,
      playerName: selectedVIP.name,
      phoneNumber: "+60123456789", // This would be fetched from VIP profiles
      address: "VIP Address", // This would be fetched from VIP profiles
      gift: requestForm.giftItem,
      cost: numericValue,
      currency: "MYR",
      remark: requestForm.remark,
      category: requestForm.category as "Birthday" | "Retention" | "High Roller" | "Promotion" | "Other",
      workflowStatus: "Manager_Review" as const, // Automatically move to Manager Review
      managerApproval: {
        approvedBy: "Sarah Johnson", // Auto-approve when creating
        approvedDate: new Date().toISOString().split('T')[0],
      }
    };

    // Add to gifts list
    setGifts(prev => [newGift, ...prev]);

    // Reset form
    setRequestForm({
      vipId: "",
      giftItem: "",
      value: "",
      remark: "",
      category: "",
    });

    // Close modal
    setIsRequestModalOpen(false);

    // Show success toast
    toast.success("Gift request submitted successfully!", {
      description: `Request ID: ${newGift.id} has been created and moved to Manager Review.`,
    });
  };

  const handleBulkMoveToNextStep = () => {
    const selectedRows = Object.keys(rowSelection);
    if (selectedRows.length === 0) {
      toast.error("Please select at least one gift to move");
      return;
    }
    
    // Get the filtered gifts for the current tab
    const filteredGifts = getFilteredGifts(activeTab);
    
    // Find the actual gift IDs from the selected row indices
    const selectedGiftIds = selectedRows.map(rowId => {
      const rowIndex = parseInt(rowId);
      return filteredGifts[rowIndex]?.id;
    }).filter(Boolean);
    
    // Store original state for undo
    const originalGifts = gifts.filter(gift => selectedGiftIds.includes(gift.id));
    
    // Move all selected gifts to next step
    setGifts(prev => prev.map((gift) => {
      if (!selectedGiftIds.includes(gift.id)) return gift;
      
      let nextStatus: GiftRequest['workflowStatus'];
      let timelineUpdate: any = {};
      
      switch (gift.workflowStatus) {
        case "KAM_Request":
          nextStatus = "Manager_Review";
          timelineUpdate = {
            managerApproval: {
              approvedBy: "Sarah Johnson", // Auto-approve when moving to next step
              approvedDate: new Date().toISOString().split('T')[0],
            }
          };
          break;
        case "MKTOps_Processing":
          nextStatus = "KAM_Proof";
          timelineUpdate = {
            mktops: {
              ...gift.mktops,
              status: "In Transit", // Set default status when moving to KAM Proof
            }
          };
          break;
        case "KAM_Proof":
          nextStatus = "SalesOps_Audit";
          timelineUpdate = {
            kamProof: {
              proofFile: "auto_proof.jpg", // Auto-upload proof when moving to audit
              uploadedBy: "Sarah Johnson",
              uploadedDate: new Date().toISOString().split('T')[0],
            }
          };
          break;
      default:

          return gift; // Skip if cannot move
      }
      
      return { ...gift, workflowStatus: nextStatus, ...timelineUpdate };
    }));
    
    toast.success(`Moved ${selectedGiftIds.length} gifts to next step`, {
      action: {
        label: "Undo",
        onClick: () => {
          // Undo by restoring original state
          setGifts(prev => prev.map((gift) => {
            const originalGift = originalGifts.find(og => og.id === gift.id);
            return originalGift || gift;
          }));
          toast.info("Move to next step reverted");
        },
      },
    });
  };

  const handleApproveGift = (giftId: string) => {
    // Show confirmation toast
    toast.success("Gift request approved!", {
      description: `Request ID: ${giftId} has been approved and moved to MKTOps processing.`,
      action: {
        label: "Undo",
        onClick: () => {
          // Revert the approval
          setGifts(prev => prev.map(gift => 
            gift.id === giftId 
              ? { ...gift, workflowStatus: "Manager_Review" as const }
              : gift
          ));
          toast.info("Approval reverted");
        },
      },
    });

    // Update the gift status
    setGifts(prev => prev.map(gift => 
      gift.id === giftId 
        ? { 
            ...gift, 
            workflowStatus: "MKTOps_Processing" as const,
            managerApproval: {
              approvedBy: "David Wilson",
              approvedDate: new Date().toISOString().split('T')[0],
            }
          }
        : gift
    ));
  };

  const handleRejectGift = (giftId: string) => {
    // Open reject reason modal
    setRejectingGiftId(giftId);
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = () => {
    if (!rejectReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    // Show confirmation toast
    toast.error("Gift request rejected!", {
      description: `Request ID: ${rejectingGiftId} has been rejected.`,
      action: {
        label: "Undo",
        onClick: () => {
          // Revert the rejection
          setGifts(prev => prev.map(gift => 
            gift.id === rejectingGiftId 
              ? { 
                  ...gift, 
                  workflowStatus: "Manager_Review" as const,
                  managerApproval: {
                    approvedBy: "David Wilson",
                    approvedDate: new Date().toISOString().split('T')[0],
                  }
                }
              : gift
          ));
          toast.info("Rejection reverted");
        },
      },
    });

    // Update the gift status
    setGifts(prev => prev.map(gift => 
      gift.id === rejectingGiftId 
        ? { 
            ...gift, 
            workflowStatus: "Rejected" as const,
            managerApproval: {
              approvedBy: "David Wilson",
              approvedDate: new Date().toISOString().split('T')[0],
              rejectedReason: rejectReason,
            }
          }
        : gift
    ));

    // Reset and close modal
    setRejectReason("");
    setRejectingGiftId("");
    setIsRejectModalOpen(false);
  };

  const handleMKTOpsUpdate = (giftId: string) => {
    setMktopsForm({
      giftId: giftId,
      dispatcher: "",
      trackingCode: "",
      status: "In Transit",
      uploadedBO: false,
      mktOpsProof: null,
    });
    setIsMKTOpsModalOpen(true);
  };

  const handleSubmitMKTOps = () => {
    if (!mktopsForm.dispatcher || !mktopsForm.trackingCode) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Update the gift with MKTOps information
    setGifts(prev => prev.map(gift => 
      gift.id === mktopsForm.giftId 
        ? { 
            ...gift, 
            mktops: {
              dispatcher: mktopsForm.dispatcher,
              trackingCode: mktopsForm.trackingCode,
              status: mktopsForm.status,
              uploadedBO: mktopsForm.uploadedBO ? "BO_Proof.pdf" : undefined,
              mktOpsProof: mktopsForm.mktOpsProof ? mktopsForm.mktOpsProof.name : undefined,
            }
          }
        : gift
    ));

    // Reset form and close modal
    setMktopsForm({
      giftId: "",
      dispatcher: "",
      trackingCode: "",
      status: "In Transit",
      uploadedBO: false,
      mktOpsProof: null,
    });
    setIsMKTOpsModalOpen(false);

    toast.success("MKTOps information updated successfully!");
  };

  const handleSubmitKAMProof = () => {
    if (!kamProofForm.proofFile) {
      toast.error("Please upload a delivery proof image");
      return;
    }

    // Update the gift with KAM proof information
    setGifts(prev => prev.map(gift => 
      gift.id === selectedGift?.id 
        ? { 
            ...gift, 
            kamProof: {
              proofFile: kamProofForm.proofFile?.name || "",
              uploadedBy: "Sarah Johnson", // Current KAM
              uploadedDate: new Date().toISOString().split('T')[0],
              receiverFeedback: kamProofForm.receiverFeedback,
            },
            workflowStatus: "SalesOps_Audit" as const, // Move to next workflow step
          }
        : gift
    ));

    // Reset form and close modal
    setKAMProofForm({
      proofFile: null,
      receiverFeedback: "",
    });
    setIsKAMProofModalOpen(false);

    toast.success("Delivery proof uploaded successfully! Gift moved to audit.");
  };

  const handleSubmitAudit = () => {
    // Checker name is auto-filled, so no validation needed

    // Update the gift with audit information
    setGifts(prev => prev.map(gift => 
      gift.id === selectedGift?.id 
        ? { 
            ...gift, 
            salesOps: {
              checkerName: auditForm.checkerName,
              checkedDate: new Date().toISOString().split('T')[0],
              remark: auditForm.remark || undefined,
            },
            workflowStatus: "Completed" as const, // Move to final workflow step
          }
        : gift
    ));

    // Reset form and close modal
    setAuditForm({
      checkerName: "",
      remark: "",
    });
    setIsAuditModalOpen(false);

    toast.success("Audit completed successfully! Gift marked as completed.");
  };

  // Function to move gift to next workflow step
  const handleMoveToNextStep = (giftId: string) => {
    const gift = gifts.find(g => g.id === giftId);
    if (!gift) return;

    let nextStatus: GiftRequest['workflowStatus'];
    let timelineUpdate: any = {};
    
    switch (gift.workflowStatus) {
      case "KAM_Request":
        nextStatus = "Manager_Review";
        timelineUpdate = {
          managerApproval: {
            approvedBy: "Sarah Johnson", // Auto-approve when moving to next step
            approvedDate: new Date().toISOString().split('T')[0],
          }
        };
        break;
      case "MKTOps_Processing":
        nextStatus = "KAM_Proof";
        timelineUpdate = {
          mktops: {
            ...gift.mktops,
            status: "In Transit", // Set default status when moving to KAM Proof
          }
        };
        break;
      case "KAM_Proof":
        nextStatus = "SalesOps_Audit";
        timelineUpdate = {
          kamProof: {
            proofFile: "auto_proof.jpg", // Auto-upload proof when moving to audit
            uploadType: "Manual",
            uploadedBy: "Sarah Johnson",
            uploadedDate: new Date().toISOString().split('T')[0],
          }
        };
        break;
      default:

        toast.error("Cannot move this status to next step");
        return;
    }

    const updatedGifts = gifts.map((g) =>
      g.id === giftId
        ? { ...g, workflowStatus: nextStatus, ...timelineUpdate }
        : g
    );
    setGifts(updatedGifts);
    toast.success(`Gift moved to ${nextStatus.replace("_", " ")}`);
  };

  const handleToggleUploadedBO = (giftId: string) => {
    setGifts(prev => prev.map(gift => 
      gift.id === giftId 
        ? { 
            ...gift, 
            mktops: {
              ...gift.mktops,
              uploadedBO: gift.mktops?.uploadedBO ? undefined : "BO_Proof.pdf",
            }
          }
        : gift
    ));
    toast.success("Uploaded BO status updated!");
  };

  const handleBulkMKTOpsUpdate = () => {
    const selectedRows = Object.keys(rowSelection);
    if (selectedRows.length === 0) {
      toast.error("Please select at least one gift to update");
      return;
    }
    
    // For now, just show a toast. In a real implementation, you'd open a modal
    toast.success(`Updating ${selectedRows.length} selected gifts`);
  };

  const handleBulkExport = () => {
    const selectedRows = Object.keys(rowSelection);
    if (selectedRows.length === 0) {
      toast.error("Please select at least one gift to export");
      return;
    }
    
    const selectedGifts = gifts.filter((_, index) => selectedRows.includes(index.toString()));
    exportToCSV(selectedGifts, `bulk_gifts_${new Date().toISOString().split('T')[0]}`);
    toast.success(`Exported ${selectedRows.length} gifts to CSV`);
  };

  const handleBulkToggleBO = () => {
    const selectedRows = Object.keys(rowSelection);
    if (selectedRows.length === 0) {
      toast.error("Please select at least one gift to update");
      return;
    }
    
    // Get the filtered gifts for the current tab
    const filteredGifts = getFilteredGifts(activeTab);
    
    // Find the actual gift IDs from the selected row indices
    const selectedGiftIds = selectedRows.map(rowId => {
      const rowIndex = parseInt(rowId);
      return filteredGifts[rowIndex]?.id;
    }).filter(Boolean);
    
    // Store original state for undo
    const originalGifts = gifts.filter(gift => selectedGiftIds.includes(gift.id));
    
    // Toggle BO status for all selected gifts
    setGifts(prev => prev.map((gift) => 
      selectedGiftIds.includes(gift.id)
        ? { 
            ...gift, 
            mktops: {
              ...gift.mktops,
              uploadedBO: gift.mktops?.uploadedBO ? undefined : "BO_Proof.pdf",
            }
          }
        : gift
    ));
    
    toast.success(`Updated BO status for ${selectedGiftIds.length} gifts`, {
      action: {
        label: "Undo",
        onClick: () => {
          // Undo the BO toggle by restoring original state
          setGifts(prev => prev.map((gift) => {
            const originalGift = originalGifts.find(og => og.id === gift.id);
            return originalGift ? originalGift : gift;
          }));
          toast.success("BO status update undone");
        }
      }
    });
    setRowSelection({}); // Clear selection after bulk action
  };

  const handleBulkApprove = () => {
    const selectedRows = Object.keys(rowSelection);
    if (selectedRows.length === 0) {
      toast.error("Please select at least one gift to approve");
      return;
    }
    
    // Get the filtered gifts for the current tab
    const filteredGifts = getFilteredGifts(activeTab);
    
    // Find the actual gift IDs from the selected row indices
    const selectedGiftIds = selectedRows.map(rowId => {
      const rowIndex = parseInt(rowId);
      return filteredGifts[rowIndex]?.id;
    }).filter(Boolean);
    
    // Store original state for undo
    const originalGifts = gifts.filter(gift => selectedGiftIds.includes(gift.id));
    
    // Approve all selected gifts
    setGifts(prev => prev.map((gift) => 
      selectedGiftIds.includes(gift.id) && gift.workflowStatus === "Manager_Review"
        ? { 
            ...gift, 
            workflowStatus: "MKTOps_Processing" as const,
            managerApproval: {
              approvedBy: "David Wilson",
              approvedDate: new Date().toISOString().split('T')[0],
            }
          }
        : gift
    ));
    
    toast.success(`Approved ${selectedGiftIds.length} gifts`, {
      action: {
        label: "Undo",
        onClick: () => {
          // Undo the approval by restoring original state
          setGifts(prev => prev.map((gift) => {
            const originalGift = originalGifts.find(og => og.id === gift.id);
            return originalGift ? originalGift : gift;
          }));
          toast.success("Approval undone");
        }
      }
    });
    setRowSelection({}); // Clear selection after bulk action
  };

  const handleBulkReject = () => {
    const selectedRows = Object.keys(rowSelection);
    if (selectedRows.length === 0) {
      toast.error("Please select at least one gift to reject");
      return;
    }
    
    // Get the filtered gifts for the current tab
    const filteredGifts = getFilteredGifts(activeTab);
    
    // Find the actual gift IDs from the selected row indices
    const selectedGiftIds = selectedRows.map(rowId => {
      const rowIndex = parseInt(rowId);
      return filteredGifts[rowIndex]?.id;
    }).filter(Boolean);
    
    // Store original state for undo
    const originalGifts = gifts.filter(gift => selectedGiftIds.includes(gift.id));
    
    // Reject all selected gifts
    setGifts(prev => prev.map((gift) => 
      selectedGiftIds.includes(gift.id) && gift.workflowStatus === "Manager_Review"
        ? { 
            ...gift, 
            workflowStatus: "Rejected" as const,
            managerApproval: {
              approvedBy: "David Wilson",
              approvedDate: new Date().toISOString().split('T')[0],
              rejectedReason: "Bulk rejection - does not meet criteria",
            }
          }
        : gift
    ));
    
    toast.success(`Rejected ${selectedGiftIds.length} gifts`, {
      action: {
        label: "Undo",
        onClick: () => {
          // Undo the rejection by restoring original state
          setGifts(prev => prev.map((gift) => {
            const originalGift = originalGifts.find(og => og.id === gift.id);
            return originalGift ? originalGift : gift;
          }));
          toast.success("Rejection undone");
        }
      }
    });
    setRowSelection({}); // Clear selection after bulk action
  };



  const getFilteredGifts = (status: string) => {
    let filtered = gifts;

    if (status !== "all") {
      if (status === "pending") {
        filtered = gifts.filter((gift) => gift.workflowStatus === "KAM_Request" || gift.workflowStatus === "Manager_Review");
      } else if (status === "rejected") {
        filtered = gifts.filter((gift) => gift.workflowStatus === "Rejected");
      } else if (status === "processing") {
        filtered = gifts.filter((gift) => gift.workflowStatus === "MKTOps_Processing");
      } else if (status === "kam-proof") {
        filtered = gifts.filter((gift) => gift.workflowStatus === "KAM_Proof");
      } else if (status === "audit") {
        filtered = gifts.filter((gift) => gift.workflowStatus === "SalesOps_Audit");
      } else if (status === "completed") {
        filtered = gifts.filter((gift) => gift.workflowStatus === "Completed");
      }
    }

    if (searchTerm) {
      filtered = filtered.filter((gift) => gift.playerName.toLowerCase().includes(searchTerm.toLowerCase()) || gift.gift.toLowerCase().includes(searchTerm.toLowerCase()) || gift.id.toLowerCase().includes(searchTerm.toLowerCase()) || gift.memberLogin.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    return filtered;
  };

  const getWorkflowStatusBadge = (status: string) => {
    const colors = {
      KAM_Request: "bg-blue-100 text-blue-800 border-blue-200",
      Manager_Review: "bg-yellow-100 text-yellow-800 border-yellow-200",
      MKTOps_Processing: "bg-purple-100 text-purple-800 border-purple-200",
      KAM_Proof: "bg-orange-100 text-orange-800 border-orange-200",
      SalesOps_Audit: "bg-indigo-100 text-indigo-800 border-indigo-200",
      Completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
      Rejected: "bg-red-100 text-red-800 border-red-200",
    };
    return <Badge className={`${colors[status as keyof typeof colors]} border`}>{status.replace("_", " ")}</Badge>;
  };

  const generateTimeline = (gift: GiftRequest): TimelineEvent[] => {
    const timeline: TimelineEvent[] = [];

    // KAM Request
    timeline.push({
      id: "1",
      title: "Gift Request Submitted",
      description: `Request submitted by ${gift.pic} for ${gift.playerName}`,
      date: gift.date,
      time: "09:00 AM",
      status: "completed",
      icon: User,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    });

    // Manager Review
    if (gift.managerApproval) {
      timeline.push({
        id: "2",
        title: "Manager Review",
        description: gift.managerApproval.rejectedReason 
          ? `Rejected by ${gift.managerApproval.approvedBy}: ${gift.managerApproval.rejectedReason}`
          : `Approved by ${gift.managerApproval.approvedBy}`,
        date: gift.managerApproval.approvedDate,
        time: "02:30 PM",
        status: gift.managerApproval.rejectedReason ? "rejected" : "completed",
        icon: CheckSquare,
        color: gift.managerApproval.rejectedReason ? "text-red-600" : "text-green-600",
        bgColor: gift.managerApproval.rejectedReason ? "bg-red-50" : "bg-green-50",
      });
    } else if (gift.workflowStatus === "Manager_Review") {
      timeline.push({
        id: "2",
        title: "Manager Review",
        description: "Pending manager approval",
        date: "Pending",
        time: "Pending",
        status: "current",
        icon: Clock,
        color: "text-yellow-600",
        bgColor: "bg-yellow-50",
      });
    }

    // MKTOps Processing
    if (gift.mktops) {
      timeline.push({
        id: "3",
        title: "MKTOps Processing",
        description: `Purchase processed via ${gift.mktops.dispatcher}. Tracking: ${gift.mktops.trackingCode}`,
        date: gift.managerApproval?.approvedDate || "Pending",
        time: "11:00 AM",
        status: "completed",
        icon: Package,
        color: "text-purple-600",
        bgColor: "bg-purple-50",
      });
    } else if (gift.workflowStatus === "MKTOps_Processing") {
      timeline.push({
        id: "3",
        title: "MKTOps Processing",
        description: "Purchase and shipping in progress",
        date: "In Progress",
        time: "In Progress",
        status: "current",
        icon: Package,
        color: "text-purple-600",
        bgColor: "bg-purple-50",
      });
    }

    // KAM Proof
    if (gift.kamProof) {
      timeline.push({
        id: "4",
        title: "Delivery Confirmation",
        description: `Proof uploaded by ${gift.kamProof.uploadedBy}`,
        date: gift.kamProof.uploadedDate,
        time: "03:45 PM",
        status: "completed",
        icon: CheckCircle,
        color: "text-orange-600",
        bgColor: "bg-orange-50",
      });
    } else if (gift.workflowStatus === "KAM_Proof") {
      timeline.push({
        id: "4",
        title: "Delivery Confirmation",
        description: "Awaiting delivery proof from KAM",
        date: "Pending",
        time: "Pending",
        status: "current",
        icon: Clock,
        color: "text-orange-600",
        bgColor: "bg-orange-50",
      });
    }

    // SalesOps Audit
    if (gift.salesOps) {
      timeline.push({
        id: "5",
        title: "SalesOps Audit",
        description: `Verified by ${gift.salesOps.checkerName}: ${gift.salesOps.remark}`,
        date: gift.salesOps.checkedDate || "Pending",
        time: "10:15 AM",
        status: "completed",
        icon: Shield,
        color: "text-emerald-600",
        bgColor: "bg-emerald-50",
      });
    } else if (gift.workflowStatus === "Completed") {
      timeline.push({
        id: "5",
        title: "SalesOps Audit",
        description: "Final audit completed",
        date: "Completed",
        time: "Completed",
        status: "completed",
        icon: Shield,
        color: "text-emerald-600",
        bgColor: "bg-emerald-50",
      });
    }

    return timeline;
  };

  const columns: ColumnDef<GiftRequest>[] = [
    {
      id: "select",
      header: ({ table }) => {
        const allSelected = table.getRowModel().rows.every(row => rowSelection[row.id]);
        const someSelected = table.getRowModel().rows.some(row => rowSelection[row.id]);

  return (

          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected && !allSelected;
              }}
              onChange={(value) => {
                const newSelection: Record<string, boolean> = {};
                if (value.target.checked) {
                  table.getRowModel().rows.forEach(row => {
                    newSelection[row.id] = true;
                  });
                }
                setRowSelection(newSelection);
              }}
              className="rounded"
            />
          </div>
        );
      },
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={rowSelection[row.id] || false}
            onChange={(value) => {
              const newSelection = { ...rowSelection };
              if (value.target.checked) {
                newSelection[row.id] = true;
              } else {
                delete newSelection[row.id];
              }
              setRowSelection(newSelection);
            }}
            className="rounded"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "id",
      header: "Gift ID",
      cell: ({ row }) => <div className="font-mono text-sm">{row.getValue("id")}</div>,
    },
    {
      accessorKey: "playerName",
      header: "Player",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.getValue("playerName")}</div>
          <div className="text-sm text-slate-500">{row.original.memberLogin}</div>
        </div>
      ),
    },
    {
      accessorKey: "gift",
      header: "Gift Item",
      cell: ({ row }) => (
        <div className="max-w-xs">
          <div className="font-medium truncate">{row.getValue("gift")}</div>
          <div className="text-xs text-slate-500">{row.original.category}</div>
        </div>
      ),
    },
    {
      accessorKey: "cost",
      header: "Value",
      cell: ({ row }) => {
        const amount = Number.parseFloat(row.getValue("cost"));
        const formatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: row.original.currency,
        }).format(amount);
        return <div className="font-medium">{formatted}</div>;
      },
    },
    {
      accessorKey: "workflowStatus",
      header: "Workflow Status",
      cell: ({ row }) => getWorkflowStatusBadge(row.getValue("workflowStatus")),
    },
    {
      accessorKey: "date",
      header: "Request Date",
      cell: ({ row }) => <div className="text-sm">{row.getValue("date")}</div>,
    },
    {
      accessorKey: "pic",
      header: "KAM",
      cell: ({ row }) => <div className="text-sm">{row.getValue("pic")}</div>,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const gift = row.original;
        return (
          <div className="flex space-x-2">
            <PermissionGuard module="gift-approval" permission="VIEW">
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 cursor-pointer"
                    onClick={() => setSelectedGift(gift)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Gift Timeline - {gift.id}
                    </DialogTitle>
                    <DialogDescription>
                      Complete workflow history for {gift.playerName}'s gift request
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-6">
                    {/* Gift Details */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Gift Details</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-slate-600">Player</p>
                            <p className="text-base">{gift.playerName} ({gift.memberLogin})</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-600">Gift Item</p>
                            <p className="text-base">{gift.gift}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-600">Value</p>
                            <p className="text-base">
                              {new Intl.NumberFormat("en-US", {
                                style: "currency",
                                currency: gift.currency,
                              }).format(gift.cost)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-600">Category</p>
                            <p className="text-base">{gift.category}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-600">KAM</p>
                            <p className="text-base">{gift.pic}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-600">Current Status</p>
                            <div className="mt-1">{getWorkflowStatusBadge(gift.workflowStatus)}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Timeline */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Workflow Timeline</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {generateTimeline(gift).map((event, index) => (
                            <div key={event.id} className="flex items-start space-x-4">
                              {/* Timeline Line */}
                              <div className="flex flex-col items-center">
                                <div className={`p-2 rounded-full ${event.bgColor}`}>
                                  <event.icon className={`h-4 w-4 ${event.color}`} />
                                </div>
                                {index < generateTimeline(gift).length - 1 && (
                                  <div className="w-0.5 h-8 bg-slate-200 mt-2"></div>
                                )}
                              </div>
                              
                              {/* Timeline Content */}
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium text-slate-900">{event.title}</h4>
                                  <div className="flex items-center space-x-2 text-sm text-slate-500">
                                    <Calendar className="h-3 w-3" />
                                    <span>{event.date}</span>
                                    <span>•</span>
                                    <span>{event.time}</span>
                                  </div>
                                </div>
                                <p className="text-sm text-slate-600">{event.description}</p>
                                {event.status === "rejected" && (
                                  <Badge variant="destructive" className="text-xs">
                                    Rejected
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Additional Details */}
                    {(gift.mktops || gift.kamProof || gift.salesOps) && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Additional Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {gift.mktops && (
                              <div>
                                <h5 className="font-medium text-slate-700 mb-2">Shipping Information</h5>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-slate-600">Courier:</span> {gift.mktops.dispatcher}
                                  </div>
                                  <div>
                                    <span className="text-slate-600">Tracking:</span> {gift.mktops.trackingCode}
                                  </div>
                                  <div>
                                    <span className="text-slate-600">Status:</span> {gift.mktops.status}
                                  </div>
                                  {gift.mktops.uploadedBO && (
                                    <div>
                                      <span className="text-slate-600">BO Proof:</span> {gift.mktops.uploadedBO}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {gift.kamProof && (
                              <div>
                                <h5 className="font-medium text-slate-700 mb-2">Delivery Proof</h5>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-slate-600">Proof File:</span> {gift.kamProof.proofFile}
                                  </div>
                                  
                                  <div>
                                    <span className="text-slate-600">Uploaded By:</span> {gift.kamProof.uploadedBy}
                                  </div>
                                  <div>
                                    <span className="text-slate-600">Date:</span> {gift.kamProof.uploadedDate}
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {gift.salesOps && (
                              <div>
                                <h5 className="font-medium text-slate-700 mb-2">Audit Information</h5>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-slate-600">Checker:</span> {gift.salesOps.checkerName}
                                  </div>
                                  <div>
                                    <span className="text-slate-600">Checked Date:</span> {gift.salesOps.checkedDate}
                                  </div>
                                  {gift.salesOps.remark && (
                                    <div className="col-span-2">
                                      <span className="text-slate-600">Remark:</span> {gift.salesOps.remark}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </PermissionGuard>

            {/* Workflow Status Based Actions */}
            {gift.workflowStatus === "Manager_Review" && (
              <div className="flex space-x-2">
                <PermissionGuard module="gift-approval" permission="EDIT">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 cursor-pointer hover:bg-green-50"
                    onClick={() => handleApproveGift(gift.id)}
                    title="Approve Gift Request"
                  >
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </Button>
                </PermissionGuard>
                <PermissionGuard module="gift-approval" permission="EDIT">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 cursor-pointer hover:bg-red-50"
                    onClick={() => handleRejectGift(gift.id)}
                    title="Reject Gift Request"
                  >
                    <XCircle className="h-4 w-4 text-red-600" />
                  </Button>
                </PermissionGuard>
              </div>
            )}

            {gift.workflowStatus === "MKTOps_Processing" && (
              <div className="flex space-x-2">
                <PermissionGuard module="gift-approval" permission="EDIT">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 cursor-pointer hover:bg-blue-50"
                    onClick={() => handleMKTOpsUpdate(gift.id)}
                    title="Update Tracking Details"
                  >
                    <Truck className="h-4 w-4 text-blue-600" />
                  </Button>
                </PermissionGuard>
                <PermissionGuard module="gift-approval" permission="EDIT">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 cursor-pointer hover:bg-green-50"
                    onClick={() => handleToggleUploadedBO(gift.id)}
                    title="Toggle BO Status"
                  >
                    <CheckSquare className="h-4 w-4 text-green-600" />
                  </Button>
                </PermissionGuard>
                <PermissionGuard module="gift-approval" permission="VIEW">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 cursor-pointer hover:bg-purple-50"
                    onClick={() => {
                      exportToCSV([gift], `gift_${gift.id}`);
                      toast.success(`Exported gift ${gift.id} to CSV`);
                    }}
                    title="Export to CSV"
                  >
                    <Download className="h-4 w-4 text-purple-600" />
                  </Button>
                </PermissionGuard>
              </div>
            )}

            {gift.workflowStatus === "KAM_Proof" && (
              <PermissionGuard module="gift-approval" permission="EDIT">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 cursor-pointer hover:bg-orange-50"
                  title="Upload Delivery Proof"
                  onClick={() => {
                    setSelectedGift(gift);
                    setIsKAMProofModalOpen(true);
                  }}
                >
                  <Upload className="h-4 w-4 text-orange-600" />
                </Button>
              </PermissionGuard>
            )}

            {gift.workflowStatus === "SalesOps_Audit" && (
              <PermissionGuard module="gift-approval" permission="EDIT">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 cursor-pointer hover:bg-indigo-50"
                  title="Audit Gift Request"
                  onClick={() => {
                    setSelectedGift(gift);
                    setAuditForm({
                      checkerName: "Sarah Johnson", // Auto-fill with logged-in user
                      remark: "",
                    });
                    setIsAuditModalOpen(true);
                  }}
                >
                  <Shield className="h-4 w-4 text-indigo-600" />
                </Button>
              </PermissionGuard>
            )}

            {/* Move to Next Step action for applicable statuses */}
            {(gift.workflowStatus === "KAM_Request" || gift.workflowStatus === "MKTOps_Processing" || gift.workflowStatus === "KAM_Proof") && (
              <PermissionGuard module="gift-approval" permission="EDIT">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 cursor-pointer hover:bg-blue-50"
                  onClick={() => handleMoveToNextStep(gift.id)}
                  title="Move to Next Step"
                >
                  <ArrowRight className="h-4 w-4 text-blue-600" />
                </Button>
              </PermissionGuard>
            )}

            {/* View action for other statuses */}
            {(gift.workflowStatus === "KAM_Request" || gift.workflowStatus === "Rejected") && (
              <PermissionGuard module="gift-approval" permission="VIEW">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 cursor-pointer hover:bg-gray-50"
                  title="View Gift Details"
                >
                  <Eye className="h-4 w-4 text-gray-600" />
                </Button>
              </PermissionGuard>
            )}
          </div>
        );
      },
    },
  ];

  const getTabCounts = () => {
    return {
      all: gifts.length,
      pending: gifts.filter((g) => g.workflowStatus === "KAM_Request" || g.workflowStatus === "Manager_Review").length,
      rejected: gifts.filter((g) => g.workflowStatus === "Rejected").length,
      processing: gifts.filter((g) => g.workflowStatus === "MKTOps_Processing").length,
      kamProof: gifts.filter((g) => g.workflowStatus === "KAM_Proof").length,
      audit: gifts.filter((g) => g.workflowStatus === "SalesOps_Audit").length,
      completed: gifts.filter((g) => g.workflowStatus === "Completed").length,
    };
  };

  const tabCounts = getTabCounts();

  const handleWorkflowClick = (workflowStep: string) => {
    setIsAnimating(true);

    setTimeout(() => {
      switch (workflowStep) {
        case "KAM_Request":
          // Scroll to Request Gift button
          const requestButton = document.querySelector('[href="/gifts/new"]');
          if (requestButton) {
            requestButton.scrollIntoView({ behavior: "smooth", block: "center" });
          }
          toast("💡 KAM Request", {
            description: "Click the 'Request Gift' button above to create a new gift request",
            action: {
              label: "Got it",
              onClick: () => console.log("User acknowledged KAM request tip"),
            },
            position: "top-center",
          });
          break;
        case "Manager_Review":
          setActiveTab("pending");
          // Scroll to tabs section
          const tabsSection = document.getElementById("gift-tabs-section");
          if (tabsSection) {
            tabsSection.scrollIntoView({ behavior: "smooth", block: "start" });
          }
          toast("💡 Manager Review", {
            description: "Review pending gift requests in the 'Pending' tab below",
            action: {
              label: "Got it",
              onClick: () => console.log("User acknowledged Manager review tip"),
            },
            position: "top-center",
          });
          break;
        case "MKTOps_Processing":
          setActiveTab("processing");
          // Scroll to tabs section
          const tabsSection2 = document.getElementById("gift-tabs-section");
          if (tabsSection2) {
            tabsSection2.scrollIntoView({ behavior: "smooth", block: "start" });
          }
          toast("💡 MKTOps Processing", {
            description: "Check processing requests in the 'Processing' tab below",
            action: {
              label: "Got it",
              onClick: () => console.log("User acknowledged MKTOps tip"),
            },
            position: "top-center",
          });
          break;
        case "KAM_Proof":
          setActiveTab("kam-proof");
          // Scroll to tabs section
          const tabsSection3 = document.getElementById("gift-tabs-section");
          if (tabsSection3) {
            tabsSection3.scrollIntoView({ behavior: "smooth", block: "start" });
          }
          toast("💡 KAM Proof", {
            description: "Upload delivery proof in the 'KAM Proof' tab below",
            action: {
              label: "Got it",
              onClick: () => console.log("User acknowledged KAM proof tip"),
            },
            position: "top-center",
          });
          break;
        case "SalesOps_Audit":
          setActiveTab("audit");
          // Scroll to tabs section
          const tabsSection4 = document.getElementById("gift-tabs-section");
          if (tabsSection4) {
            tabsSection4.scrollIntoView({ behavior: "smooth", block: "start" });
          }
          toast("💡 SalesOps Audit", {
            description: "Review audit requests in the 'Audit' tab below",
            action: {
              label: "Got it",
              onClick: () => console.log("User acknowledged SalesOps tip"),
            },
            position: "top-center",
          });
          break;
      }
      setIsAnimating(false);
    }, 300);
  };

  const stats = [
    {
      title: "Pending Review",
      value: tabCounts.pending,
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
    {
      title: "In Processing",
      value: tabCounts.processing,
      icon: Truck,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Completed",
      value: gifts.filter((g) => g.workflowStatus === "Completed").length,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Total Value",
      value: `${gifts.reduce((sum, g) => sum + g.cost, 0).toLocaleString()} ${gifts[0]?.currency || "MYR"}`,
      icon: null,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Gift Approval System" description="Manage gift requests and approval workflow" />

      <div className="flex-1 p-6">

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-slate-900 mb-2">Gift & Approval Module</h1>
                <p className="text-slate-600">Workflow for managing gift requests and approvals</p>
              </div>
              <PermissionGuard module="gift-approval" permission="ADD">
                <Dialog open={isRequestModalOpen} onOpenChange={setIsRequestModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-green-600 hover:bg-green-700 cursor-pointer transition-all duration-500">
                      <Plus className="h-4 w-4 mr-2" />
                      Request Gift
                    </Button>
                  </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Request New Gift
                    </DialogTitle>
                    <DialogDescription>
                      Submit a new gift request for VIP player approval
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="vipId" className="text-sm font-medium">
                        Select VIP Player <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={requestForm.vipId}
                        onValueChange={(value) => handleFormChange("vipId", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a VIP player" />
                        </SelectTrigger>
                        <SelectContent>
                          {assignedVIPPlayers.map((vip) => (
                            <SelectItem key={vip.id} value={vip.id}>
                              {vip.name} ({vip.login})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="giftItem" className="text-sm font-medium">
                        Gift Item <span className="text-red-500">*</span>
                      </Label>
              <Input

                        id="giftItem"
                        placeholder="Enter gift item description"
                        value={requestForm.giftItem}
                        onChange={(e) => handleFormChange("giftItem", e.target.value)}
                        required
              />
            </div>


                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="value" className="text-sm font-medium">
                          Value (MYR) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="value"
                          type="number"
                          placeholder="Enter amount"
                          value={requestForm.value}
                          onChange={(e) => handleFormChange("value", e.target.value)}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="category" className="text-sm font-medium">
                          Category <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={requestForm.category}
                          onValueChange={(value) => handleFormChange("category", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>

                            <SelectItem value="Birthday">Birthday</SelectItem>
                            <SelectItem value="Retention">Retention</SelectItem>
                            <SelectItem value="High Roller">High Roller</SelectItem>
                            <SelectItem value="Promotion">Promotion</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>


                    <div className="space-y-2">
                      <Label htmlFor="remark" className="text-sm font-medium">
                        Remark <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id="remark"
                        placeholder="Enter detailed remarks about this gift request"
                        value={requestForm.remark}
                        onChange={(e) => handleFormChange("remark", e.target.value)}
                        rows={4}
                        required
                      />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setIsRequestModalOpen(false)}
                      >
                        Cancel
              </Button>
                      <Button
                        onClick={handleSubmitRequest}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Submit Request
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              </PermissionGuard>
            {/* Reject Reason Modal */}
            <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    Reject Gift Request
                  </DialogTitle>
                  <DialogDescription>
                    Please provide a reason for rejecting this gift request
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="rejectReason" className="text-sm font-medium">
                      Rejection Reason <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="rejectReason"
                      placeholder="Enter the reason for rejection..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={4}
                      required
                    />
          </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsRejectModalOpen(false);
                        setRejectReason("");
                        setRejectingGiftId("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleConfirmReject}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Confirm Rejection
                    </Button>
      </div>
    </div>
              </DialogContent>
            </Dialog>

            {/* MKTOps Modal */}
            <Dialog open={isMKTOpsModalOpen} onOpenChange={setIsMKTOpsModalOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Update MKTOps Information
                  </DialogTitle>
                  <DialogDescription>
                    Update shipping and tracking information for gift request
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dispatcher" className="text-sm font-medium">
                        Dispatcher <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="dispatcher"
                        placeholder="e.g., DHL, FedEx, UPS"
                        value={mktopsForm.dispatcher}
                        onChange={(e) => setMktopsForm(prev => ({ ...prev, dispatcher: e.target.value }))}
                        required
                      />
          </div>

                    
                    <div className="space-y-2">
                      <Label htmlFor="trackingCode" className="text-sm font-medium">
                        Tracking Code <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="trackingCode"
                        placeholder="Enter tracking number"
                        value={mktopsForm.trackingCode}
                        onChange={(e) => setMktopsForm(prev => ({ ...prev, trackingCode: e.target.value }))}
                        required
                      />
                </div>

              </div>

                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-sm font-medium">
                      Status
                    </Label>
                    <Select
                      value={mktopsForm.status}
                      onValueChange={(value) => setMktopsForm(prev => ({ ...prev, status: value as "In Transit" | "Delivered" | "Failed" }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="In Transit">In Transit</SelectItem>
                        <SelectItem value="Delivered">Delivered</SelectItem>
                        <SelectItem value="Failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
            </div>

                  <div className="space-y-2">
                    <Label htmlFor="mktOpsProof" className="text-sm font-medium">
                      MKTOps Proof (Image)
                    </Label>
                    <FileUploader
                      onFileSelect={(file) => setMktopsForm(prev => ({ ...prev, mktOpsProof: file }))}
                      acceptedTypes="image/*"
                      maxSize={5}
                      placeholder="Drag and drop an image here, or click to browse"
                    />
          </div>


                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="uploadedBO"
                      checked={mktopsForm.uploadedBO}
                      onChange={(e) => setMktopsForm(prev => ({ ...prev, uploadedBO: e.target.checked }))}
                      className="rounded"
                    />
                    <Label htmlFor="uploadedBO" className="text-sm font-medium">
                      Uploaded BO
                    </Label>
                </div>


                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsMKTOpsModalOpen(false);
                        setMktopsForm({
                          giftId: "",
                          dispatcher: "",
                          trackingCode: "",
                          status: "In Transit",
                          uploadedBO: false,
                          mktOpsProof: null,
                        });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmitMKTOps}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      Update Information
                    </Button>
              </div>

                </div>
              </DialogContent>
            </Dialog>

            {/* KAM Proof Modal */}
            <Dialog open={isKAMProofModalOpen} onOpenChange={setIsKAMProofModalOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload Delivery Proof
                  </DialogTitle>
                  <DialogDescription>
                    Upload proof of delivery for {selectedGift?.playerName}'s gift request
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="proofFile" className="text-sm font-medium">
                      Delivery Proof (Image) <span className="text-red-500">*</span>
                    </Label>
                    <FileUploader
                      onFileSelect={(file) => setKAMProofForm(prev => ({ ...prev, proofFile: file }))}
                      acceptedTypes="image/*"
                      maxSize={5}
                      placeholder="Drag and drop a delivery proof image here, or click to browse"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="receiverFeedback" className="text-sm font-medium">
                      Receiver Feedback
                    </Label>
                    <Textarea
                      id="receiverFeedback"
                      placeholder="Enter feedback from the gift receiver..."
                      value={kamProofForm.receiverFeedback}
                      onChange={(e) => setKAMProofForm(prev => ({ ...prev, receiverFeedback: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsKAMProofModalOpen(false);
                        setKAMProofForm({
                          proofFile: null,
                          receiverFeedback: "",
                        });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmitKAMProof}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      Upload Proof
                    </Button>
            </div>

                </div>
              </DialogContent>
            </Dialog>

            {/* Audit Modal */}
            <Dialog open={isAuditModalOpen} onOpenChange={setIsAuditModalOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Audit Gift Request
                  </DialogTitle>
                  <DialogDescription>
                    Review and complete audit for {selectedGift?.playerName}'s gift request
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6">
                  {/* Gift Details Summary */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Gift Request Summary</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                <div>

                        <span className="text-gray-600">Player:</span> {selectedGift?.playerName}
                </div>
                <div>

                        <span className="text-gray-600">Gift:</span> {selectedGift?.gift}
                      </div>
                      <div>
                        <span className="text-gray-600">Value:</span> {selectedGift?.cost} {selectedGift?.currency}
                      </div>
                      <div>
                        <span className="text-gray-600">Category:</span> {selectedGift?.category}
                      </div>
                </div>
              </div>


                  {/* KAM Proof Summary */}
                  {selectedGift?.kamProof && (
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-medium text-green-900 mb-3">Delivery Proof</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                <div>

                          <span className="text-green-600">Proof File:</span> {selectedGift.kamProof.proofFile}
                </div>
                <div>

                          <span className="text-green-600">Receiver Feedback:</span> {selectedGift.kamProof.receiverFeedback || "No feedback provided"}
                </div>

                        <div>
                          <span className="text-green-600">Uploaded By:</span> {selectedGift.kamProof.uploadedBy}
              </div>

                  <div>
                          <span className="text-green-600">Date:</span> {selectedGift.kamProof.uploadedDate}
                        </div>
                      </div>
                  </div>
                )}

                  {/* MKTOps Summary */}
                  {selectedGift?.mktops && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-3">Shipping Information</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>

                          <span className="text-blue-600">Dispatcher:</span> {selectedGift.mktops.dispatcher}
          </div>
                        <div>
                          <span className="text-blue-600">Tracking Code:</span> {selectedGift.mktops.trackingCode}
                        </div>
                        <div>
                          <span className="text-blue-600">Status:</span> {selectedGift.mktops.status}
                        </div>
                        <div>
                          <span className="text-blue-600">BO Uploaded:</span> {selectedGift.mktops.uploadedBO ? "Yes" : "No"}
                        </div>
                      </div>
                  </div>
                )}


                  {/* Audit Form */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="checkerName" className="text-sm font-medium">
                        Checker Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="checkerName"
                        value={auditForm.checkerName}
                        readOnly
                        className="bg-gray-50"
                      />
                      <p className="text-xs text-gray-500">Auto-filled from logged-in user</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="auditRemark" className="text-sm font-medium">
                        Audit Remark
                      </Label>
                      <Textarea
                        id="auditRemark"
                        placeholder="Enter any audit remarks or observations..."
                        value={auditForm.remark}
                        onChange={(e) => setAuditForm(prev => ({ ...prev, remark: e.target.value }))}
                        rows={3}
                      />
              </div>
            </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsAuditModalOpen(false);
                        setAuditForm({
                          checkerName: "",
                          remark: "",
                        });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmitAudit}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Mark as Completed
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

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


        {/* Gift Workflow Diagram */}
        <Card className="mb-8 border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Gift Approval Workflow</CardTitle>
            <CardDescription>Track the complete gift request and delivery process</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-6 bg-gradient-to-r from-green-50 via-blue-50 to-purple-50 rounded-lg">
              <div className="flex items-center justify-between relative">
                {/* Connecting line */}
                <div className="absolute top-15 left-0 right-0 h-0.5 bg-gradient-to-r from-green-300 via-blue-300 to-purple-300 z-0"></div>

                <div className="flex items-center justify-between w-full relative z-10">
                  <div className={`text-center bg-white rounded-lg p-3 shadow-sm border border-green-200 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-md ${isAnimating ? "animate-pulse" : ""}`} onClick={() => handleWorkflowClick("KAM_Request")}>
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold mb-2 mx-auto">1</div>
                    <p className="text-sm font-semibold text-green-700 mb-1">KAM Request</p>
                    <p className="text-xs text-green-600">Submit gift request</p>
                  </div>

                  <div className={`text-center bg-white rounded-lg p-3 shadow-sm border border-blue-200 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-md ${isAnimating ? "animate-pulse" : ""}`} onClick={() => handleWorkflowClick("Manager_Review")}>
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold mb-2 mx-auto">2</div>
                    <p className="text-sm font-semibold text-blue-700 mb-1">Manager Review</p>
                    <p className="text-xs text-blue-600">Approve/Reject</p>
                  </div>

                  <div className={`text-center bg-white rounded-lg p-3 shadow-sm border border-purple-200 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-md ${isAnimating ? "animate-pulse" : ""}`} onClick={() => handleWorkflowClick("MKTOps_Processing")}>
                    <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold mb-2 mx-auto">3</div>
                    <p className="text-sm font-semibold text-purple-700 mb-1">MKTOps</p>
                    <p className="text-xs text-purple-600">Purchase & track</p>
                  </div>

                  <div className={`text-center bg-white rounded-lg p-3 shadow-sm border border-orange-200 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-md ${isAnimating ? "animate-pulse" : ""}`} onClick={() => handleWorkflowClick("KAM_Proof")}>
                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold mb-2 mx-auto">4</div>
                    <p className="text-sm font-semibold text-orange-700 mb-1">KAM Proof</p>
                    <p className="text-xs text-orange-600">Upload delivery proof</p>
                  </div>

                  <div className={`text-center bg-white rounded-lg p-3 shadow-sm border border-emerald-200 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-md ${isAnimating ? "animate-pulse" : ""}`} onClick={() => handleWorkflowClick("SalesOps_Audit")}>
                    <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold mb-2 mx-auto">5</div>
                    <p className="text-sm font-semibold text-emerald-700 mb-1">SalesOps</p>
                    <p className="text-xs text-emerald-600">Final audit</p>
                  </div>
                </div>
              </div>

              {/* Additional workflow details */}
              {/* <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-3 gap-4 text-xs text-gray-600">
                  <div>
                    <span className="font-medium">Steps 1-2:</span> Request & Approval Phase
                  </div>
                  <div>
                    <span className="font-medium">Steps 3-4:</span> Purchase & Delivery Phase
                  </div>
                  <div>
                    <span className="font-medium">Step 5:</span> Audit & Compliance Phase
                  </div>
                </div>
              </div> */}
            </div>
          </CardContent>
        </Card>

        

        {/* Gift Requests with Tabs */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Gift Requests</CardTitle>
            <CardDescription>
              Complete workflow for managing gift requests, approvals, and delivery tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search Bar (live) */}
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by player name, gift item, or request ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {/* Bulk Actions */}
            {Object.keys(rowSelection).length > 0 && (
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200 transition-all duration-300 ease-in-out animate-in slide-in-from-top-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-blue-800">
                      {Object.keys(rowSelection).length} gift(s) selected
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* Bulk Actions based on active tab */}
                    {activeTab === "pending" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleBulkApprove}
                          className="bg-green-600 text-white hover:bg-green-700"
                        >
                        <CheckCircle className="h-4 w-4 mr-2" />

                          Bulk Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"

                          onClick={handleBulkReject}
                          className="bg-red-600 text-white hover:bg-red-700"
                      >
                        <XCircle className="h-4 w-4 mr-2" />

                          Bulk Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleBulkExport}
                          className="bg-purple-600 text-white hover:bg-purple-700"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Export Selected
                      </Button>
                    </>

                    )}
                    
                    {activeTab === "processing" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleBulkMKTOpsUpdate}
                          className="bg-blue-600 text-white hover:bg-blue-700"
                          title="Update MKTOps Info for selected gifts"
                        >
                          <Truck className="h-4 w-4 mr-2" />
                          Bulk Update MKTOps
                    </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleBulkToggleBO}
                          className="bg-green-600 text-white hover:bg-green-700"
                          title="Toggle Uploaded BO status for selected gifts"
                        >
                          <CheckSquare className="h-4 w-4 mr-2" />
                          Toggle BO Status
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleBulkExport}
                          className="bg-purple-600 text-white hover:bg-purple-700"
                          title="Export selected gifts to CSV"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export Selected
                        </Button>
                      </>
                    )}
                    
                    {/* Move to Next Step for applicable tabs */}
                    {(activeTab === "all" || activeTab === "kam-proof" || activeTab === "audit") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleBulkMoveToNextStep}
                        className="bg-blue-600 text-white hover:bg-blue-700"
                        title="Move selected gifts to next workflow step"
                      >
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Move to Next Step
                      </Button>
                    )}
                    
                    {/* Export for other tabs */}
                    {activeTab !== "pending" && activeTab !== "processing" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleBulkExport}
                        className="bg-purple-600 text-white hover:bg-purple-700"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Export Selected
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            
            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-8">
              <div id="gift-tabs-section" className="scroll-mt-8">
                <TabsList className="grid w-full grid-cols-7 mb-8">
                  <TabsTrigger value="all" className="relative cursor-pointer">
                  All
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {tabCounts.all}
                  </Badge>
                </TabsTrigger>
                  <TabsTrigger value="pending" className="relative cursor-pointer transition-all duration-500">
                  Pending
                  <Badge variant="secondary" className="ml-2 text-xs bg-yellow-100 text-yellow-800">
                    {tabCounts.pending}
                  </Badge>
                </TabsTrigger>
                  <TabsTrigger value="rejected" className="relative cursor-pointer">
                  Rejected
                  <Badge variant="secondary" className="ml-2 text-xs bg-red-100 text-red-800">
                    {tabCounts.rejected}
                  </Badge>
                </TabsTrigger>
                  <TabsTrigger value="processing" className="relative cursor-pointer transition-all duration-500">
                    Processing
                    <Badge variant="secondary" className="ml-2 text-xs bg-purple-100 text-purple-800">
                      {tabCounts.processing}
                    </Badge>
                  </TabsTrigger>
              <TabsTrigger value="kam-proof" className="relative cursor-pointer transition-all duration-500">
                KAM Proof
                <Badge variant="secondary" className="ml-2 text-xs bg-orange-100 text-orange-800">
                  {tabCounts.kamProof}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="audit" className="relative cursor-pointer transition-all duration-500">
                Audit
                <Badge variant="secondary" className="ml-2 text-xs bg-indigo-100 text-indigo-800">
                  {tabCounts.audit}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="relative cursor-pointer transition-all duration-500">
                    Completed
                    <Badge variant="secondary" className="ml-2 text-xs bg-emerald-100 text-emerald-800">
                      {tabCounts.completed}
                    </Badge>
                  </TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <DataTable columns={columns} data={getFilteredGifts("all")} />
              </TabsContent>

              <TabsContent value="pending">
                <DataTable columns={columns} data={getFilteredGifts("pending")} />
              </TabsContent>

              <TabsContent value="rejected">
                <DataTable columns={columns} data={getFilteredGifts("rejected")} />
              </TabsContent>

                <TabsContent value="processing">
                  <DataTable columns={columns} data={getFilteredGifts("processing")} />
                </TabsContent>

                <TabsContent value="kam-proof">
                  <DataTable columns={columns} data={getFilteredGifts("kam-proof")} />
                </TabsContent>

                <TabsContent value="audit">
                  <DataTable columns={columns} data={getFilteredGifts("audit")} />
                </TabsContent>

                <TabsContent value="completed">
                  <DataTable columns={columns} data={getFilteredGifts("completed")} />
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
    </div>

      </div>
    </div>
  );
}

