# Gift Update API Documentation

## Overview

The Gift Update API provides a unified endpoint for updating gift requests across different workflow stages. Each tab has specific role requirements and actions that can be performed.

## API Endpoint

```
PUT /api/gift-approval/update
```

## Request Format

```typescript
interface UpdateRequest {
  giftId: number;           // Required: Gift ID to update
  tab: string;              // Required: Tab name (pending, processing, kam-proof, audit)
  action: string;           // Required: Action to perform
  userId: string;           // Required: User ID performing the action
  userRole?: string;        // Required: User role for permission validation
  userPermissions?: Record<string, string[]>; // Required: User permissions
  
  // Tab-specific optional fields
  rejectReason?: string;    // For pending/audit reject actions
  dispatcher?: string;      // For processing tab
  trackingCode?: string;    // For processing tab
  trackingStatus?: string;  // For processing tab
  kamProof?: string;        // For kam-proof tab
  giftFeedback?: string;    // For kam-proof tab
  auditRemark?: string;     // For audit tab
}
```

## Tab-Specific Requirements

### 1. Pending Tab

**Required Role:** `MANAGER` or `ADMIN`  
**Required Permission:** `EDIT` for `gift-approval` module  
**Actions:** `approve`, `reject`

**Workflow Status Requirements:**
- Can only act on gifts with status: `KAM_Request`, `Manager_Review`

**Request Examples:**

```typescript
// Approve a gift request
{
  "giftId": 123,
  "tab": "pending",
  "action": "approve",
  "userId": "user123",
  "userRole": "MANAGER",
  "userPermissions": { "gift-approval": ["EDIT", "VIEW"] }
}

// Reject a gift request
{
  "giftId": 123,
  "tab": "pending",
  "action": "reject",
  "userId": "user123",
  "userRole": "MANAGER",
  "userPermissions": { "gift-approval": ["EDIT", "VIEW"] },
  "rejectReason": "Insufficient budget allocation" // Optional
}
```

**Status Transitions:**
- `approve`: `KAM_Request`/`Manager_Review` → `MKTOps_Processing`
- `reject`: `KAM_Request`/`Manager_Review` → `Rejected`

### 2. Processing Tab

**Required Role:** `MKTOPS` or `ADMIN`  
**Required Permission:** `EDIT` for `gift-approval` module  
**Actions:** `update`

**Workflow Status Requirements:**
- Can only act on gifts with status: `Manager_Review`

**Request Example:**

```typescript
{
  "giftId": 123,
  "tab": "processing",
  "action": "update",
  "userId": "user123",
  "userRole": "MKTOPS",
  "userPermissions": { "gift-approval": ["EDIT", "VIEW"] },
  "dispatcher": "John Doe",
  "trackingCode": "TRK123456789",
  "trackingStatus": "In Transit"
}
```

**Status Transitions:**
- `update`: `Manager_Review` → `KAM_Proof`

### 3. KAM Proof Tab

**Required Role:** `KAM` or `ADMIN`  
**Required Permission:** `EDIT` for `gift-approval` module  
**Actions:** `submit`

**Workflow Status Requirements:**
- Can only act on gifts with status: `MKTOps_Processing`

**Request Example:**

```typescript
{
  "giftId": 123,
  "tab": "kam-proof",
  "action": "submit",
  "userId": "user123",
  "userRole": "KAM",
  "userPermissions": { "gift-approval": ["EDIT", "VIEW"] },
  "kamProof": "Photo evidence of gift delivery",
  "giftFeedback": "VIP was very satisfied with the gift"
}
```

**Status Transitions:**
- `submit`: `MKTOps_Processing` → `SalesOps_Audit`

### 4. Audit Tab

**Required Role:** `AUDIT` or `ADMIN`  
**Required Permission:** `EDIT` for `gift-approval` module  
**Actions:** `approve`, `reject`

**Workflow Status Requirements:**
- Can only act on gifts with status: `KAM_Proof`

**Request Examples:**

```typescript
// Approve a gift
{
  "giftId": 123,
  "tab": "audit",
  "action": "approve",
  "userId": "user123",
  "userRole": "AUDIT",
  "userPermissions": { "gift-approval": ["EDIT", "VIEW"] }
}

// Reject a gift
{
  "giftId": 123,
  "tab": "audit",
  "action": "reject",
  "userId": "user123",
  "userRole": "AUDIT",
  "userPermissions": { "gift-approval": ["EDIT", "VIEW"] },
  "auditRemark": "Documentation incomplete" // Optional
}
```

**Status Transitions:**
- `approve`: `KAM_Proof` → `Completed`
- `reject`: `KAM_Proof` → `Rejected`

## Response Format

### Success Response

```typescript
{
  "success": true,
  "message": "Gift approve successful",
  "data": {
    "giftId": 123,
    "newStatus": "MKTOps_Processing",
    "updatedBy": "user123",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Error Response

```typescript
{
  "success": false,
  "message": "Only Manager and Admin users can approve/reject gift requests",
  "error": "Permission denied"
}
```

## Error Codes

| HTTP Status | Error Type | Description |
|-------------|------------|-------------|
| 400 | Bad Request | Missing required fields or invalid action |
| 403 | Forbidden | Insufficient role or permission |
| 404 | Not Found | Gift not found |
| 400 | Workflow Error | Invalid workflow progression |
| 500 | Server Error | Database or internal error |

## Common Error Messages

- **"Gift ID, tab, action, and user ID are required"** - Missing required fields
- **"Only Manager and Admin users can approve/reject gift requests"** - Insufficient role for pending tab
- **"Only MKTOps and Admin users can update processing information"** - Insufficient role for processing tab
- **"Only KAM and Admin users can submit proof"** - Insufficient role for kam-proof tab
- **"Only Audit and Admin users can audit gifts"** - Insufficient role for audit tab
- **"EDIT permission required for gift-approval module"** - Missing EDIT permission
- **"Gift not found"** - Gift ID doesn't exist
- **"Cannot perform 'approve' on gift with status 'Completed'"** - Invalid workflow progression

## Frontend Integration

### Using the Utility Functions

```typescript
import { approveGift, rejectGift, updateProcessingInfo, submitKamProof, auditGift } from "@/lib/gift-update";

// Approve a gift request
const result = await approveGift(giftId, userId, userRole, userPermissions);

// Reject a gift request with reason
const result = await rejectGift(giftId, userId, userRole, userPermissions, "Budget exceeded");

// Update processing information
const result = await updateProcessingInfo(giftId, userId, userRole, userPermissions, {
  dispatcher: "John Doe",
  trackingCode: "TRK123456789",
  trackingStatus: "In Transit"
});

// Submit KAM proof
const result = await submitKamProof(giftId, userId, userRole, userPermissions, {
  kamProof: "Photo evidence",
  giftFeedback: "VIP satisfied"
});

// Audit approve/reject
const result = await auditGift(giftId, userId, userRole, userPermissions, "approve");
```

### Using the React Component

```typescript
import { GiftUpdateActions } from "@/components/gift-update-actions";

<GiftUpdateActions
  giftId={123}
  tab="pending"
  currentStatus="Manager_Review"
  onUpdateComplete={() => {
    // Refresh data or show success message
    console.log("Gift updated successfully");
  }}
/>
```

## Database Schema Updates

The API updates the following fields in the `GIFT_DETAILS` table:

- `WORKFLOW_STATUS` - Updated based on action
- `APPROVAL_REVIEWED_BY` - Set to user ID for pending tab approve/reject actions
- `REJECT_REASON` - Set for pending tab reject actions (optional, null for approve)
- `AUDITED_BY` - Set to user ID for audit tab actions
- `AUDIT_REMARK` - Set for audit tab reject actions (optional)
- `DISPATCHER` - Set for processing updates
- `TRACKING_CODE` - Set for processing updates
- `TRACKING_STATUS` - Set for processing updates
- `KAM_PROOF` - Set for KAM proof submission
- `GIFT_FEEDBACK` - Set for KAM proof submission
- `KAM_PROOF_BY` - Set to user ID for KAM proof
- `AUDITED_BY` - Set to user ID for audit actions
- `AUDIT_DATE` - Set to current timestamp for audit actions
- `LAST_MODIFIED_DATE` - Updated on all changes

## Security Considerations

1. **Role-based Access Control**: Each tab has specific role requirements
2. **Permission Validation**: Users must have EDIT permission for gift-approval module
3. **Workflow Validation**: Actions can only be performed on gifts in appropriate status
4. **User Tracking**: All updates are tracked with user ID and timestamp
5. **Input Validation**: All inputs are validated and sanitized

## Testing

### Test Cases

1. **Valid Approvals**: Test each tab with correct role and permissions
2. **Invalid Roles**: Test with insufficient role permissions
3. **Invalid Permissions**: Test without EDIT permission
4. **Invalid Workflow**: Test actions on gifts with wrong status
5. **Missing Fields**: Test with missing required fields
6. **Non-existent Gift**: Test with invalid gift ID

### Example Test Data

```typescript
// Test user with different roles
const testUsers = {
  manager: { id: "manager1", role: "MANAGER", permissions: { "gift-approval": ["EDIT", "VIEW"] } },
  mkttops: { id: "mkttops1", role: "MKTOPS", permissions: { "gift-approval": ["EDIT", "VIEW"] } },
  kam: { id: "kam1", role: "KAM", permissions: { "gift-approval": ["EDIT", "VIEW"] } },
  audit: { id: "audit1", role: "AUDIT", permissions: { "gift-approval": ["EDIT", "VIEW"] } },
  admin: { id: "admin1", role: "ADMIN", permissions: { "gift-approval": ["EDIT", "VIEW", "ADD", "DELETE"] } }
};
```

## Related Documentation

- [Gift Module Overview](../Gift%20Module.md)
- [RBAC Documentation](../RBAC_DOCUMENTATION.md)
- [Gift API Documentation](../GIFT_API_DOCUMENTATION.md)
- [Bulk Upload System Guide](../BULK_UPLOAD_SYSTEM_GUIDE.md)
