"use client"

import { Button } from "@/components/ui/button"
import RoleBasedActionPermission, { 
  KAMOnlyAction, 
  AdminOnlyAction, 
  KAMAndAdminAction,
  ManagerAndAboveAction,
  AuditAndAboveAction,
  ProcurementAndAboveAction 
} from "@/components/common/role-based-action-permission"
import { Upload, Shield, CheckCircle, XCircle, FileText } from "lucide-react"

// Example usage of the RoleBasedActionPermission component
export function RoleBasedActionExamples() {
  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-bold">Role-Based Action Permission Examples</h2>
      
      {/* Example 1: KAM Only - Upload KAM Proof */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-2">1. KAM Only - Upload KAM Proof</h3>
        <KAMOnlyAction
          fallback={
            <Button disabled variant="outline" className="opacity-50">
              <Upload className="h-4 w-4 mr-2" />
              Upload KAM Proof (KAM Only)
            </Button>
          }
        >
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Upload KAM Proof
          </Button>
        </KAMOnlyAction>
      </div>

      {/* Example 2: Admin Only - System Settings */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-2">2. Admin Only - System Settings</h3>
        <AdminOnlyAction
          fallback={
            <Button disabled variant="outline" className="opacity-50">
              <Shield className="h-4 w-4 mr-2" />
              System Settings (Admin Only)
            </Button>
          }
        >
          <Button variant="outline">
            <Shield className="h-4 w-4 mr-2" />
            System Settings
          </Button>
        </AdminOnlyAction>
      </div>

      {/* Example 3: KAM and Admin - Request Gift */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-2">3. KAM and Admin - Request Gift</h3>
        <KAMAndAdminAction
          fallback={
            <Button disabled variant="outline" className="opacity-50">
              <FileText className="h-4 w-4 mr-2" />
              Request Gift (KAM/Admin Only)
            </Button>
          }
        >
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Request Gift
          </Button>
        </KAMAndAdminAction>
      </div>

      {/* Example 4: Manager and Above - Bulk Approve */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-2">4. Manager and Above - Bulk Approve</h3>
        <ManagerAndAboveAction
          fallback={
            <Button disabled variant="outline" className="opacity-50">
              <CheckCircle className="h-4 w-4 mr-2" />
              Bulk Approve (Manager+ Only)
            </Button>
          }
        >
          <Button variant="outline">
            <CheckCircle className="h-4 w-4 mr-2" />
            Bulk Approve
          </Button>
        </ManagerAndAboveAction>
      </div>

      {/* Example 5: Audit and Above - Audit Gift */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-2">5. Audit and Above - Audit Gift</h3>
        <AuditAndAboveAction
          fallback={
            <Button disabled variant="outline" className="opacity-50">
              <Shield className="h-4 w-4 mr-2" />
              Audit Gift (Audit+ Only)
            </Button>
          }
        >
          <Button variant="outline">
            <Shield className="h-4 w-4 mr-2" />
            Audit Gift
          </Button>
        </AuditAndAboveAction>
      </div>

      {/* Example 6: Custom Role Combination */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-2">6. Custom Role Combination</h3>
        <RoleBasedActionPermission
          allowedRoles={['ADMIN', 'MANAGER', 'KAM']}
          fallback={
            <Button disabled variant="outline" className="opacity-50">
              <XCircle className="h-4 w-4 mr-2" />
              Custom Action (Admin/Manager/KAM Only)
            </Button>
          }
        >
          <Button variant="outline">
            <XCircle className="h-4 w-4 mr-2" />
            Custom Action
          </Button>
        </RoleBasedActionPermission>
      </div>

      {/* Example 7: Hidden vs Disabled */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-2">7. Hidden vs Disabled</h3>
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Hidden (no fallback):</p>
          <KAMOnlyAction>
            <Button variant="outline">Only KAM sees this</Button>
          </KAMOnlyAction>
          
          <p className="text-sm text-gray-600">Disabled (with fallback):</p>
          <KAMOnlyAction
            fallback={
              <Button disabled variant="outline" className="opacity-50">
                KAM Only Action (Disabled)
              </Button>
            }
          >
            <Button variant="outline">KAM Action</Button>
          </KAMOnlyAction>
        </div>
      </div>
    </div>
  )
}
