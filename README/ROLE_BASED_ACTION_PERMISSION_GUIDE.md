# RoleBasedActionPermission System Guide

## Overview

The `RoleBasedActionPermission` system provides granular role-based access control for specific actions within the Gift Approval module, ensuring only authorized users can perform certain operations. The system now supports both role-based and permission-based access control with enhanced components that can show disabled actions instead of hiding them.

## Core Components

### Main Component

```tsx
<RoleBasedActionPermission allowedRoles={["KAM", "ADMIN"]} fallback={<DisabledButton />}>
  <ActiveButton />
</RoleBasedActionPermission>
```

### Enhanced Component with Permission Support

```tsx
<RoleBasedActionPermission allowedRoles={["KAM", "ADMIN"]} permission="EDIT" module="gift-approval" alwaysShow={true} disabledFallback={<DisabledButton />}>
  <ActiveButton />
</RoleBasedActionPermission>
```

### Pre-configured Components

#### Basic Role-Based Components (Hide Actions)

- `KAMOnlyAction` - KAM users only
- `AdminOnlyAction` - ADMIN users only
- `KAMAndAdminAction` - KAM and ADMIN users
- `ManagerAndAboveAction` - ADMIN and MANAGER users
- `AuditAndAboveAction` - ADMIN and AUDIT users
- `ProcurementAndAboveAction` - ADMIN and PROCUREMENT users

#### Enhanced Permission-Based Components (Show Disabled Actions)

- `KAMOnlyActionWithPermission` - KAM users with specific permission
- `ManagerAndAboveActionWithPermission` - Manager+ users with specific permission
- `AuditAndAboveActionWithPermission` - Audit+ users with specific permission
- `KAMAndAdminActionWithPermission` - KAM and Admin users with specific permission

## Gift Tab Action Implementations

### 1. KAM Proof Upload (Enhanced with Permission)

**Location**: Gift workflow step 4 (KAM Proof)

```tsx
<KAMAndAdminActionWithPermission
  module="gift-approval"
  permission="EDIT"
  disabledFallback={
    <div className="opacity-50">
      <div className="bg-gray-400">4</div>
      <p>KAM Proof</p>
      <p>KAM role and EDIT permission required</p>
    </div>
  }
>
  <div className="cursor-pointer" onClick={handleWorkflowClick}>
    <div className="bg-orange-500">4</div>
    <p>KAM Proof</p>
    <p>Upload delivery proof</p>
  </div>
</KAMAndAdminActionWithPermission>
```

### 2. Upload Delivery Proof Button (Enhanced with Permission)

**Location**: Gift table actions (KAM_Proof status)

```tsx
<KAMAndAdminActionWithPermission
  module="gift-approval"
  permission="EDIT"
  disabledFallback={
    <Button disabled title="KAM role and EDIT permission required">
      <Upload className="text-gray-400" />
    </Button>
  }
>
  <Button onClick={uploadProof}>
    <Upload className="text-orange-600" />
  </Button>
</KAMAndAdminActionWithPermission>
```

### 3. Bulk Approve/Reject Actions (Enhanced with Permission)

**Location**: Bulk actions panel (pending tab)

```tsx
<ManagerAndAboveActionWithPermission
  module="gift-approval"
  permission="EDIT"
  disabledFallback={
    <Button disabled title="Manager role and EDIT permission required">
      Bulk Approve
    </Button>
  }
>
  <Button onClick={handleBulkApprove}>Bulk Approve</Button>
</ManagerAndAboveActionWithPermission>
```

### 4. Audit Gift Actions (Enhanced with Permission)

**Location**: Gift table actions (SalesOps_Audit status)

```tsx
<AuditAndAboveActionWithPermission
  module="gift-approval"
  permission="EDIT"
  disabledFallback={
    <Button disabled title="Audit role and EDIT permission required">
      <Shield className="text-gray-400" />
    </Button>
  }
>
  <Button onClick={handleAudit}>
    <Shield className="text-indigo-600" />
  </Button>
</AuditAndAboveActionWithPermission>
```

### 5. View Actions for Rejected Gifts

**Location**: Gift table actions (Rejected status)

```tsx
<PermissionGuard module="gift-approval" permission="VIEW">
  <Dialog>
    <DialogTrigger asChild>
      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-pointer" onClick={() => setSelectedGift(gift)} title={gift.workflowStatus === "Rejected" ? "View Gift Details & Rejection Reason" : "View Gift Details"}>
        <Eye className="h-4 w-4" />
      </Button>
    </DialogTrigger>
    {/* Dialog content with prominent rejection reason display */}
  </Dialog>
</PermissionGuard>
```

### 6. Request Gift Button (Enhanced with Permission)

**Location**: Header section - Main action button

```tsx
<RoleBasedActionPermission
  allowedRoles={["KAM", "ADMIN"]}
  permission="ADD"
  module="gift-approval"
  alwaysShow={true}
  disabledFallback={
    <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
      <Package className="h-8 w-8 mx-auto mb-2 text-gray-400" />
      <p className="text-sm text-gray-600">KAM role and ADD permission required to request gifts</p>
    </div>
  }
>
  <Dialog>
    <DialogTrigger asChild>
      <Button className="bg-green-600 hover:bg-green-700">
        <Plus className="h-4 w-4 mr-2" />
        Request Gift
      </Button>
    </DialogTrigger>
    {/* Dialog content */}
  </Dialog>
</RoleBasedActionPermission>
```

### 7. Bulk Upload Button (Enhanced with Permission)

**Location**: Search bar section - Bulk upload functionality

```tsx
<KAMAndAdminActionWithPermission
  module="gift-approval"
  permission="IMPORT"
  disabledFallback={
    <Button size="sm" variant="outline" disabled className="opacity-50 cursor-not-allowed" title="KAM role and IMPORT permission required">
      <Upload className="h-4 w-4 mr-2" />
      Bulk Upload
    </Button>
  }
>
  <BulkUploadDialog
    module="gift-approval"
    tab={activeTab}
    trigger={
      <Button size="sm" variant="outline">
        <Upload className="h-4 w-4 mr-2" />
        Bulk Upload
      </Button>
    }
  />
</KAMAndAdminActionWithPermission>
```

**Key Features**:

- **Single View Action**: Only one eye icon for rejected gifts (no duplicates)
- **Enhanced Tooltip**: Shows "View Gift Details & Rejection Reason" for rejected gifts
- **Prominent Rejection Display**: Rejection reason is prominently displayed in a red-themed card
- **Visual Indicator**: "Has Reason" badge appears next to rejected status in the table

## Behavior Patterns

### Permission Logic

The system checks both role and permission requirements:

1. **Role Check**: User's role must be in the `allowedRoles` array
2. **Permission Check**: User must have the specified permission for the module
3. **Combined Logic**: User needs BOTH role AND permission for access

### Hidden vs Disabled

#### Basic Components (Hide Actions)

- **Hidden**: No fallback provided - action completely invisible
- **Disabled**: Fallback provided - action visible but disabled with explanation

#### Enhanced Components (Show Disabled Actions)

- **Always Visible**: Actions are always shown (enabled or disabled)
- **Enabled**: User has both role AND permission
- **Disabled**: User lacks role OR permission - shows `disabledFallback`

### Visual Feedback

- **Authorized**: Normal button styling with hover effects
- **Unauthorized**: Grayed out, disabled, with role and permission requirement tooltips

## Security Benefits

1. **UI Security**: Prevents unauthorized users from seeing actions they can't perform
2. **User Experience**: Clear visual feedback about permission requirements
3. **Consistency**: Standardized permission checking across all gift actions
4. **Maintainability**: Centralized role logic in reusable components
5. **Dual Validation**: Both role AND permission are checked for enhanced security
6. **Flexible UX**: Choose between hiding actions or showing disabled states

## Usage Guidelines

### When to Use Each Component

#### Basic Components (Hide Actions)

Use when you want to completely hide actions from unauthorized users.

```tsx
// Only KAM can upload proof (hidden from others)
<KAMOnlyAction>
  <UploadButton />
</KAMOnlyAction>

// Only Admin can access system settings (hidden from others)
<AdminOnlyAction>
  <SettingsButton />
</AdminOnlyAction>
```

#### Enhanced Components (Show Disabled Actions)

Use when you want to show all actions but disable them for unauthorized users.

```tsx
// KAM and Admin can request gifts (disabled for others)
<RoleBasedActionPermission
  allowedRoles={['KAM', 'ADMIN']}
  permission="ADD"
  module="gift-approval"
  alwaysShow={true}
  disabledFallback={<Button disabled>Request Gift (KAM/Admin only)</Button>}
>
  <RequestGiftButton />
</RoleBasedActionPermission>

// Manager and above can bulk approve (disabled for others)
<ManagerAndAboveActionWithPermission
  module="gift-approval"
  permission="EDIT"
  disabledFallback={<Button disabled>Bulk Approve (Manager+ only)</Button>}
>
  <BulkApproveButton />
</ManagerAndAboveActionWithPermission>
```

#### Custom Role Combinations

```tsx
<RoleBasedActionPermission allowedRoles={["ADMIN", "MANAGER", "KAM"]}>
  <CustomAction />
</RoleBasedActionPermission>
```

### Best Practices

1. **Always provide meaningful fallbacks** for better user experience
2. **Use specific role components** when possible for better readability
3. **Combine with server-side validation** for complete security
4. **Provide clear tooltips** explaining why actions are disabled
5. **Use consistent visual styling** for disabled states
6. **Choose appropriate component type** based on UX requirements:
   - Use basic components to hide sensitive actions
   - Use enhanced components to show workflow visibility
7. **Always specify both role and permission** for enhanced components
8. **Provide descriptive disabledFallback** with clear permission requirements

## Implementation Examples

### Basic Usage (Hide Actions)

```tsx
import { KAMOnlyAction, ManagerAndAboveAction } from "@/components/common/role-based-action-permission"

// Simple KAM-only action (hidden from others)
<KAMOnlyAction>
  <Button>KAM Action</Button>
</KAMOnlyAction>

// Manager+ action with fallback (hidden from others)
<ManagerAndAboveAction
  fallback={<Button disabled>Manager+ Required</Button>}
>
  <Button>Manager Action</Button>
</ManagerAndAboveAction>
```

### Enhanced Usage (Show Disabled Actions)

```tsx
import {
  KAMAndAdminActionWithPermission,
  ManagerAndAboveActionWithPermission
} from "@/components/common/role-based-action-permission"

// KAM and Admin with permission (disabled for others)
<RoleBasedActionPermission
  allowedRoles={['KAM', 'ADMIN']}
  permission="ADD"
  module="gift-approval"
  alwaysShow={true}
  disabledFallback={<Button disabled>Request Gift (KAM/Admin + ADD permission)</Button>}
>
  <Button>Request Gift</Button>
</RoleBasedActionPermission>

// Manager+ with permission (disabled for others)
<ManagerAndAboveActionWithPermission
  module="gift-approval"
  permission="EDIT"
  disabledFallback={<Button disabled>Bulk Approve (Manager+ + EDIT permission)</Button>}
>
  <Button>Bulk Approve</Button>
</ManagerAndAboveActionWithPermission>
```

### Advanced Usage

```tsx
// Custom role combination with detailed fallback
<RoleBasedActionPermission
  allowedRoles={["ADMIN", "MANAGER"]}
  fallback={
    <div className="text-center p-4 bg-gray-50 rounded-lg">
      <p className="text-sm text-gray-600">Only Admin and Manager users can perform this action</p>
    </div>
  }
>
  <Button>Advanced Action</Button>
</RoleBasedActionPermission>
```

## File Structure

```
components/
├── common/
│   ├── role-based-action-permission.tsx          # Main component
│   ├── role-based-action-permission-examples.tsx # Usage examples
│   └── enhanced-permission-guard.tsx            # Enhanced RBAC guard
```

## Integration with Existing RBAC

The `RoleBasedActionPermission` system works alongside the existing RBAC system:

- **PermissionGuard**: For basic permission checks (used for view actions)
- **RoleBasedActionPermission**: For specific action-level permissions
- **Enhanced Components**: For action-level permissions with disabled state visibility (replaces EnhancedPermissionGuard)
- **Module-level checks**: Direct permission checks in component logic

## Troubleshooting

### Common Issues

1. **Import Error**: Ensure correct import syntax

   ```tsx
   // Correct
   import RoleBasedActionPermission, { KAMOnlyAction } from "./role-based-action-permission";

   // Incorrect
   import { RoleBasedActionPermission } from "./role-based-action-permission";
   ```

2. **TypeScript Errors**: Check user role type compatibility
3. **Styling Issues**: Ensure fallback components have proper disabled styling

### Debugging

Add console logs to check user roles:

```tsx
const { user } = useAuth();
console.log("Current user role:", user?.role);
```

## Future Enhancements

- [x] Add permission-based access control
- [x] Implement enhanced components with disabled state visibility
- [ ] Add role hierarchy support
- [ ] Implement conditional permissions based on data
- [ ] Add permission caching for performance
- [ ] Create permission testing utilities
- [ ] Add role-based permission inheritance
- [ ] Implement dynamic permission loading

## Summary

### Component Types Comparison

| Component Type          | Behavior                | Use Case                            |
| ----------------------- | ----------------------- | ----------------------------------- |
| **Basic Components**    | Hide actions completely | Sensitive operations, clean UI      |
| **Enhanced Components** | Show disabled actions   | Workflow visibility, user education |

### Key Features

- **Dual Validation**: Both role AND permission are checked
- **Flexible UX**: Choose between hiding or showing disabled actions
- **Clear Feedback**: Descriptive tooltips explain requirements
- **Consistent Security**: Server-side validation still required
- **Reusable**: Components can be used across all modules

### Best Practice Recommendation

- **Use Enhanced Components** for most gift approval actions to show workflow visibility
- **Use Basic Components** for sensitive operations like system settings
- **Always provide clear tooltips** explaining permission requirements
- **Combine with server-side validation** for complete security
