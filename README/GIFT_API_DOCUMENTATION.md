# Gift Approval API Documentation

## Overview

The Gift Approval API provides comprehensive CRUD operations for managing gift requests, bulk imports, batch management, and statistics. All endpoints use the `MY_FLOW.PUBLIC.GIFT_DETAILS` table structure.

## Base URL

```
/api/gift-approval
```

## Authentication

All endpoints require proper authentication and authorization based on user roles and permissions.

---

## 1. Main Gift Endpoints

### GET `/api/gift-approval`

Fetch paginated gift data with filtering and search capabilities.

**Query Parameters:**

- `page` (number, default: 1) - Page number
- `limit` (number, default: 50) - Items per page
- `workflowStatus` (string) - Filter by workflow status
- `category` (string) - Filter by gift category
- `kamRequestedBy` (string) - Filter by KAM requester
- `memberLogin` (string) - Filter by member login
- `dateFrom` (string) - Filter from date (YYYY-MM-DD)
- `dateTo` (string) - Filter to date (YYYY-MM-DD)
- `search` (string) - Search across member login, full name, gift item, reward name, tracking code

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "giftId": 1,
      "vipId": 123,
      "batchId": "BATCH_001",
      "kamRequestedBy": "kam@example.com",
      "createdDate": "2024-01-15T10:30:00Z",
      "workflowStatus": "KAM_Request",
      "memberLogin": "player123",
      "fullName": "John Doe",
      "phone": "+60123456789",
      "address": "123 Main St",
      "rewardName": "VIP Reward",
      "giftItem": "iPhone 15",
      "costMyr": 5000.0,
      "costVnd": null,
      "remark": "Birthday gift",
      "rewardClubOrder": "RCO001",
      "category": "Birthday",
      "approvalReviewedBy": null,
      "dispatcher": null,
      "trackingCode": null,
      "trackingStatus": null,
      "purchasedBy": null,
      "mktPurchaseDate": null,
      "uploadedBo": null,
      "mktProof": null,
      "mktProofBy": null,
      "kamProof": null,
      "kamProofBy": null,
      "giftFeedback": null,
      "auditedBy": null,
      "auditDate": null,
      "auditRemark": null,
      "lastModifiedDate": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

---

### GET `/api/gift-approval/[id]`

Fetch specific gift details by ID.

**Path Parameters:**

- `id` (number) - Gift ID

**Response:**

```json
{
  "success": true,
  "data": {
    "giftId": 1,
    "vipId": 123,
    "batchId": "BATCH_001",
    "kamRequestedBy": "kam@example.com",
    "createdDate": "2024-01-15T10:30:00Z",
    "workflowStatus": "KAM_Request"
    // ... all gift fields
  }
}
```

### PUT `/api/gift-approval/[id]`

Update gift details and workflow status.

**Path Parameters:**

- `id` (number) - Gift ID

**Request Body:**

```json
{
  "workflowStatus": "MKTOps_Processing",
  "trackingStatus": "In Transit",
  "dispatcher": "FedEx",
  "trackingCode": "FX123456789",
  "kamProof": "proof_url",
  "giftFeedback": "Customer happy with gift",
  "auditRemark": "Audit completed successfully",
  "uploadedBy": "user@example.com"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Gift updated successfully",
  "affectedRows": 1
}
```

---

## 2. Statistics Endpoints

### GET `/api/gift-approval/statistics`

Fetch comprehensive gift statistics and analytics.

**Query Parameters:**

- `dateFrom` (string) - Filter from date (YYYY-MM-DD)
- `dateTo` (string) - Filter to date (YYYY-MM-DD)

**Response:**

```json
{
  "success": true,
  "data": {
    "totalGifts": 150,
    "totalValueMyr": 750000.0,
    "totalValueVnd": 0,
    "pendingCount": 25,
    "processingCount": 30,
    "completedCount": 85,
    "rejectedCount": 10,
    "averageCostMyr": 5000.0,
    "averageCostVnd": 0,
    "categoryBreakdown": {
      "Birthday": 45,
      "Retention": 30,
      "High Roller": 25,
      "Promotion": 35,
      "Other": 15
    },
    "statusBreakdown": {
      "KAM_Request": 20,
      "Manager_Review": 25,
      "MKTOps_Processing": 30,
      "KAM_Proof": 15,
      "SalesOps_Audit": 20,
      "Completed": 85,
      "Rejected": 10
    },
    "recentActivity": {
      "last7Days": 15
    },
    "topKAMRequesters": [
      {
        "name": "kam1@example.com",
        "requestCount": 25,
        "totalValue": 125000.0
      }
    ],
    "monthlyTrends": [
      {
        "month": "2024-01",
        "count": 45,
        "totalValue": 225000.0
      }
    ]
  }
}
```

---

## 3. Batch Management Endpoints

### GET `/api/gift-approval/batches`

Fetch batch information with statistics.

**Query Parameters:**

- `page` (number, default: 1) - Page number
- `limit` (number, default: 20) - Items per page
- `isActive` (boolean) - Filter by batch status (TRUE/FALSE)
- `uploadedBy` (string) - Filter by uploader
- `dateFrom` (string) - Filter from date (YYYY-MM-DD)
- `dateTo` (string) - Filter to date (YYYY-MM-DD)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "batchId": "BATCH_001",
      "batchName": "January Birthday Gifts",
      "uploadedBy": "kam@example.com",
      "totalRows": 50,
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00Z",
      "completedAt": null,
      "giftCount": 50,
      "totalValue": 250000.0
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 25,
    "totalPages": 2
  }
}
```

### PUT `/api/gift-approval/batches`

Update batch status (activate/deactivate).

**Request Body:**

```json
{
  "batchId": "BATCH_001",
  "isActive": false,
  "updatedBy": "admin@example.com"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Batch deactivated successfully",
  "affectedRows": 1
}
```

---

## 4. Individual Gift Creation

### POST `/api/gift-approval/create`

Create a new individual gift request.

**Request Body:**

```json
{
  "vipId": 123,
  "giftItem": "iPhone 15",
  "rewardName": "VIP Reward",
  "rewardClubOrder": "RCO001",
  "value": "5000.00",
  "remark": "Birthday gift for VIP player",
  "category": "Birthday",
  "createdBy": "kam@example.com"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Gift request created successfully",
  "data": {
    "giftId": 151,
    "batchId": "INDIVIDUAL_1705312200000_abc123",
    "workflowStatus": "KAM_Request"
  }
}
```

---

## 5. Bulk Actions Endpoints

### PUT `/api/gift-approval/bulk-actions`

Update multiple gifts at once with various workflow actions.

**Request Body:**

```json
{
  "action": "approve",
  "giftIds": [1, 2, 3, 4, 5],
  "workflowStatus": "MKTOps_Processing",
  "uploadedBy": "manager@example.com"
}
```

**Available Actions:**

1. **`approve`** - Approve gifts and move to next workflow stage

   ```json
   {
     "action": "approve",
     "giftIds": [1, 2, 3],
     "workflowStatus": "MKTOps_Processing",
     "uploadedBy": "manager@example.com"
   }
   ```

2. **`reject`** - Reject gifts with reason

   ```json
   {
     "action": "reject",
     "giftIds": [1, 2, 3],
     "reason": "Budget exceeded for this quarter",
     "uploadedBy": "manager@example.com"
   }
   ```

3. **`process`** - Update tracking information (MKTOps)

   ```json
   {
     "action": "process",
     "giftIds": [1, 2, 3],
     "dispatcher": "FedEx",
     "trackingCode": "FX123456789",
     "trackingStatus": "In Transit",
     "uploadedBy": "mktops@example.com"
   }
   ```

4. **`upload_proof`** - Upload KAM proof and feedback

   ```json
   {
     "action": "upload_proof",
     "giftIds": [1, 2, 3],
     "kamProof": "proof_url_here",
     "giftFeedback": "Customer very happy with gift",
     "uploadedBy": "kam@example.com"
   }
   ```

5. **`complete_audit`** - Complete audit process

   ```json
   {
     "action": "complete_audit",
     "giftIds": [1, 2, 3],
     "auditRemark": "All gifts delivered successfully",
     "uploadedBy": "audit@example.com"
   }
   ```

6. **`update_tracking`** - Update tracking information only

   ```json
   {
     "action": "update_tracking",
     "giftIds": [1, 2, 3],
     "trackingStatus": "Delivered",
     "uploadedBy": "mktops@example.com"
   }
   ```

7. **`bulk_status_change`** - Generic status change
   ```json
   {
     "action": "bulk_status_change",
     "giftIds": [1, 2, 3],
     "workflowStatus": "Completed",
     "trackingStatus": "Delivered",
     "uploadedBy": "admin@example.com"
   }
   ```

**Response:**

```json
{
  "success": true,
  "message": "Bulk approve completed successfully",
  "data": {
    "action": "approve",
    "totalRequested": 5,
    "affectedRows": 5,
    "updatedGifts": [
      {
        "giftId": 1,
        "workflowStatus": "MKTOps_Processing",
        "trackingStatus": null,
        "lastModified": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

---

## 6. Bulk Import Endpoints

### POST `/api/gift-approval/bulk-import`

Import gift data from CSV files for different workflow stages.

**Request Body:**

```json
{
  "tab": "pending",
  "data": [
    {
      "memberLogin": "player123",
      "fullName": "John Doe",
      "phone": "+60123456789",
      "address": "123 Main St",
      "rewardName": "VIP Reward",
      "giftItem": "iPhone 15",
      "costMyr": 5000.0,
      "costVnd": null,
      "remark": "Birthday gift",
      "rewardClubOrder": "RCO001",
      "category": "Birthday"
    }
  ],
  "uploadedBy": "kam@example.com"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Bulk import completed successfully",
  "importedCount": 50,
  "failedCount": 0,
  "batchId": "BATCH_002",
  "totalValue": 250000.0
}
```

---

## 6. Workflow Status Transitions

### Valid Status Transitions:

1. **KAM_Request** → **Manager_Review** (Manager approval)
2. **Manager_Review** → **MKTOps_Processing** (Approved) or **Rejected**
3. **MKTOps_Processing** → **KAM_Proof** (Processing complete)
4. **KAM_Proof** → **SalesOps_Audit** (Proof uploaded)
5. **SalesOps_Audit** → **Completed** (Audit complete)

### Required Fields by Status:

**MKTOps_Processing:**

- `dispatcher` (string)
- `trackingCode` (string)
- `trackingStatus` (string)

**SalesOps_Audit:**

- `auditRemark` (string)

---

## 7. Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

**Common HTTP Status Codes:**

- `200` - Success
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `500` - Internal Server Error

---

## 8. Data Types

### WorkflowStatus

```typescript
type WorkflowStatus = 'KAM_Request' | 'Manager_Review' | 'MKTOps_Processing' | 'KAM_Proof' | 'SalesOps_Audit' | 'Completed' | 'Rejected'
```

### GiftCategory

```typescript
type GiftCategory = 'Birthday' | 'Retention' | 'High Roller' | 'Promotion' | 'Other'
```

### TrackingStatus

```typescript
type TrackingStatus = 'Pending' | 'In Transit' | 'Delivered' | 'Failed' | 'Returned'
```

### BatchStatus

```typescript
type BatchStatus = boolean // true for active, false for inactive
```

## 9. Database Schema Reference

### GIFT_DETAILS Table Structure

The main table `MY_FLOW.PUBLIC.GIFT_DETAILS` contains all gift request data with the following key fields:

- **GIFT_ID**: Auto-incrementing primary key (starts at 100)
- **VIP_ID**: Reference to VIP player
- **BATCH_ID**: Reference to bulk import batch (if applicable)
- **WORKFLOW_STATUS**: Current stage in the approval workflow
- **COST_BASE/COST_VND**: Gift cost in different currencies
- **Tracking fields**: DISPATCHER, TRACKING_CODE, TRACKING_STATUS
- **Proof fields**: MKT_PROOF, KAM_PROOF, GIFT_FEEDBACK
- **Audit fields**: AUDITED_BY, AUDIT_DATE, AUDIT_REMARK

### BULK_IMPORT_BATCHES Table Structure

The batch tracking table `MY_FLOW.PUBLIC.BULK_IMPORT_BATCHES` contains:

- **BATCH_ID**: Auto-incrementing primary key (starts at 10)
- **BATCH_NAME**: Human-readable batch name (Format: BATCH*{uploader name}*{date time})
- **UPLOADED_BY**: User who created the batch
- **TOTAL_ROWS**: Number of rows in the batch
- **IS_ACTIVE**: Batch status (TRUE/FALSE)
- **CREATED_DATE/COMPLETED_AT**: Timestamps for tracking

---

## 9. Usage Examples

### Fetch Pending Gifts

```javascript
const response = await fetch('/api/gift-approval?workflowStatus=Manager_Review&page=1&limit=20')
const data = await response.json()
```

### Update Gift to Processing

```javascript
const response = await fetch('/api/gift-approval/123', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    workflowStatus: 'MKTOps_Processing',
    dispatcher: 'FedEx',
    trackingCode: 'FX123456789',
    trackingStatus: 'In Transit',
    uploadedBy: 'mktops@example.com',
  }),
})
```

### Get Statistics for Last Month

```javascript
const response = await fetch('/api/gift-approval/statistics?dateFrom=2024-01-01&dateTo=2024-01-31')
const stats = await response.json()
```

### Bulk Approve Gifts

```javascript
const response = await fetch('/api/gift-approval/bulk-actions', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'approve',
    giftIds: [1, 2, 3, 4, 5],
    workflowStatus: 'MKTOps_Processing',
    uploadedBy: 'manager@example.com',
  }),
})
```

### Bulk Reject Gifts

```javascript
const response = await fetch('/api/gift-approval/bulk-actions', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'reject',
    giftIds: [1, 2, 3],
    reason: 'Budget exceeded for this quarter',
    uploadedBy: 'manager@example.com',
  }),
})
```

### Bulk Update Tracking

```javascript
const response = await fetch('/api/gift-approval/bulk-actions', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'process',
    giftIds: [1, 2, 3],
    dispatcher: 'FedEx',
    trackingCode: 'FX123456789',
    trackingStatus: 'In Transit',
    uploadedBy: 'mktops@example.com',
  }),
})
```

---

## 10. Security & Permissions

All endpoints enforce role-based access control:

- **KAM**: Can create gifts, upload proofs
- **Manager**: Can approve/reject gifts
- **MKTOps**: Can update tracking information
- **Audit**: Can complete audit process
- **Admin**: Full access to all operations

Batch management is restricted to users with appropriate permissions, and only ACTIVE batches are visible in gift listings.
