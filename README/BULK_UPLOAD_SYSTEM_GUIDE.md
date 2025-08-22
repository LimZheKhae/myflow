# Bulk Upload System Guide

## Overview

The bulk upload system provides a comprehensive solution for importing large datasets into the Gift Approval module with full validation, transaction safety, and rollback capabilities.

## 🎯 **Key Features**

### **1. Role-Based Access Control**

- **IMPORT permission** required for bulk upload
- **Tab-specific validation** rules
- **Role-based button visibility** (Manager+, KAM+, Audit+)

### **2. Data Validation**

- **CSV format validation**
- **Required field checking**
- **Data type validation**
- **Business rule validation**
- **Duplicate detection**

### **3. Database Transaction Safety**

- **Atomic operations** - All or nothing
- **Automatic rollback** on errors
- **Transaction logging** for audit trail
- **Manual rollback** capability

### **4. User Experience**

- **Template download** for correct format
- **Real-time validation** feedback
- **Preview mode** before import
- **Progress tracking**
- **Detailed error reporting**

## 📋 **Supported Tabs & Validation Rules**

### **Pending Tab**

**Required Fields:**

- `playerName` - Player's full name
- `gift` - Gift item description
- `cost` - Numeric value
- `currency` - One of: MYR, VND, USD, GBP
- `category` - One of: Birthday, Retention, High Roller, Promotion, Other
- `remark` - Additional notes

**Optional Fields:**

- `phoneNumber` - Contact number
- `address` - Player address

### **Processing Tab**

**Required Fields:**

- `giftId` - Existing gift request ID
- `dispatcher` - Courier company
- `trackingCode` - Tracking number
- `status` - One of: In Transit, Delivered, Failed

### **KAM Proof Tab**

**Required Fields:**

- `giftId` - Existing gift request ID
- `proofFile` - Proof file name/path
- `receiverFeedback` - Player feedback

**Optional Fields:**

- `uploadedBy` - KAM name (auto-filled if not provided)

### **Audit Tab**

**Required Fields:**

- `giftId` - Existing gift request ID
- `checkerName` - Auditor name
- `remark` - Audit notes

## 🔧 **Database Schema**

### **Main Tables**

```sql
-- Gift Details Table (Master Table)
CREATE OR REPLACE TABLE MY_FLOW.PUBLIC.GIFT_DETAILS (
  GIFT_ID NUMBER(38,0) NOT NULL AUTOINCREMENT START 100 INCREMENT 1 ORDER,
  VIP_ID NUMBER(38,0),
  BATCH_ID NUMBER(38,0),
  KAM_REQUESTED_BY VARCHAR(16777216),
  CREATED_DATE TIMESTAMP_NTZ(9),
  WORKFLOW_STATUS VARCHAR(16777216),
  MEMBER_LOGIN VARCHAR(16777216),
  FULL_NAME VARCHAR(16777216),
  PHONE VARCHAR(16777216),
  ADDRESS VARCHAR(16777216),
  REWARD_NAME VARCHAR(16777216),
  GIFT_ITEM VARCHAR(16777216),
  COST_BASE NUMBER(38,0),
  COST_VND NUMBER(38,0),
  REMARK VARCHAR(16777216),
  REWARD_CLUB_ORDER VARCHAR(16777216),
  CATEGORY VARCHAR(16777216),
  APPROVAL_REVIEWED_BY NUMBER(38,0),
  DISPATCHER VARCHAR(16777216),
  TRACKING_CODE VARCHAR(16777216),
  TRACKING_STATUS VARCHAR(16777216),
  PURCHASED_BY NUMBER(38,0),
  MKT_PURCHASE_DATE TIMESTAMP_NTZ(9),
  UPLOADED_BO BOOLEAN,
  MKT_PROOF VARCHAR(16777216),
  KAM_PROOF VARCHAR(16777216),
  KAM_PROOF_BY NUMBER(38,0),
  GIFT_FEEDBACK VARCHAR(16777216),
  AUDITED_BY NUMBER(38,0),
  AUDIT_DATE TIMESTAMP_NTZ(9),
  AUDIT_REMARK VARCHAR(16777216),
  LAST_MODIFIED_DATE TIMESTAMP_NTZ(9),
  PRIMARY KEY (GIFT_ID)
);

-- Bulk Import Batches Table
CREATE OR REPLACE TABLE MY_FLOW.PUBLIC.BULK_IMPORT_BATCHES (
  BATCH_ID NUMBER(38,0) NOT NULL AUTOINCREMENT START 10 INCREMENT 1 ORDER,
  BATCH_NAME VARCHAR(200),  -- Format: BATCH_{user name}_{date time}
  UPLOADED_BY VARCHAR(100),
  TOTAL_ROWS NUMBER(38,0),
  IS_ACTIVE BOOLEAN DEFAULT TRUE,
  CREATED_DATE TIMESTAMP_NTZ(9),
  COMPLETED_AT TIMESTAMP_NTZ(9),
  PRIMARY KEY (BATCH_ID)
);
```

## 🚀 **Usage Workflow**

### **1. Access Control**

```tsx
<EnhancedPermissionGuard module="gift-approval" permission="IMPORT" fallback={<DisabledButton />}>
  <BulkUploadDialog />
</EnhancedPermissionGuard>
```

### **2. Upload Process**

1. **Download Template** - Get correct CSV format
2. **Upload File** - Select CSV file (max 5MB)
3. **Validation** - Automatic data validation
4. **Preview** - Review data before import
5. **Import** - Execute database transaction (INSERT INTO GIFT_DETAILS)
6. **Result** - View import results and batch ID

### **3. Workflow Updates**

After bulk import, different tabs will UPDATE the GIFT_DETAILS rows accordingly:

- **Pending Tab**: INSERT new gift requests (WORKFLOW_STATUS = 'KAM_Request')
- **Processing Tab**: UPDATE tracking information (DISPATCHER, TRACKING_CODE, etc.)
- **KAM Proof Tab**: UPDATE proof and feedback (KAM_PROOF, GIFT_FEEDBACK)
- **Audit Tab**: UPDATE audit information (AUDITED_BY, AUDIT_REMARK)

### **4. Batch Management**

- Each bulk import creates a record in BULK_IMPORT_BATCHES
- Batch ID is linked to GIFT_DETAILS records via BATCH_ID field
- Batch status can be TRUE or FALSE for filtering (IS_ACTIVE boolean field)

## 📁 **File Structure**

```
components/
├── ui/
│   ├── bulk-upload-dialog.tsx          # Main upload component
│   └── file-uploader.tsx               # File selection component

app/
├── api/
│   └── gift-approval/
│       ├── bulk-import/
│       │   └── route.ts                # Import API
│       └── bulk-rollback/
│           └── route.ts                # Rollback API

app/
└── gift-approval/
    └── page.tsx                        # Main page with upload button
```

## 🔒 **Security Features**

### **Permission Matrix**

| Role        | Pending | Processing | KAM Proof | Audit |
| ----------- | ------- | ---------- | --------- | ----- |
| KAM         | ✅      | ❌         | ✅        | ❌    |
| Manager     | ✅      | ✅         | ❌        | ❌    |
| Procurement | ❌      | ✅         | ❌        | ❌    |
| Audit       | ❌      | ❌         | ❌        | ✅    |
| Admin       | ✅      | ✅         | ✅        | ✅    |

### **Data Validation**

- **SQL Injection Prevention** - Parameterized queries
- **File Type Validation** - CSV only
- **File Size Limits** - 5MB maximum
- **Content Validation** - Business rule enforcement

## 📊 **Error Handling**

### **Validation Errors**

- **Missing Required Fields** - Row-level error reporting
- **Invalid Data Types** - Type checking with suggestions
- **Business Rule Violations** - Domain-specific validation
- **Duplicate Detection** - Warning for potential duplicates

### **Database Errors**

- **Transaction Rollback** - Automatic on any error
- **Partial Import Handling** - Continue with valid rows
- **Error Logging** - Detailed error tracking
- **User Feedback** - Clear error messages

## 🔄 **Batch Management**

### **Batch Tracking**

- **Batch ID Generation** - Auto-incrementing batch IDs (starts at 10)
- **Batch Status Management** - TRUE/FALSE status control (IS_ACTIVE boolean)
- **Batch Filtering** - Only ACTIVE batches shown in gift listings
- **Batch History** - Complete audit trail of all batch operations

### **Data Integrity**

- **Referential Integrity** - BATCH_ID links to BULK_IMPORT_BATCHES
- **Workflow Consistency** - All updates maintain workflow status
- **Audit Trail** - Complete history of all operations
- **Status Tracking** - Real-time status updates across workflow stages

## 📈 **Performance Considerations**

### **Batch Processing**

- **Chunked Imports** - Large file handling
- **Progress Tracking** - Real-time feedback
- **Memory Management** - Efficient file processing
- **Database Optimization** - Bulk operations

### **Monitoring**

- **Import Logs** - Track all operations
- **Performance Metrics** - Import speed tracking
- **Error Rates** - Quality monitoring
- **User Activity** - Usage analytics

## 🛠 **API Endpoints**

### **Bulk Import**

```http
POST /api/gift-approval/bulk-import
Content-Type: application/json

{
  "tab": "pending",
  "data": [...],
  "batchName": "January Birthday Gifts",
  "uploadedBy": "user@example.com"
}
```

### **Batch Management**

```http
GET /api/gift-approval/batches
Content-Type: application/json

PUT /api/gift-approval/batches
Content-Type: application/json

{
  "batchId": 123,
  "isActive": false,
  "updatedBy": "admin@example.com"
}
```

## 📝 **CSV Template Examples**

### **Pending Tab Template**

```csv
playerName,gift,cost,currency,category,remark,phoneNumber,address
John Doe,Luxury Watch,2500,MYR,Birthday,High roller player,+60123456789,123 Main St
Jane Smith,iPhone Pro,1200,USD,Retention,VIP customer,+1234567890,456 Oak Ave
```

### **Processing Tab Template**

```csv
giftId,dispatcher,trackingCode,status
GFT001,DHL,DHL123456789,In Transit
GFT002,FedEx,FDX987654321,Delivered
```

## 🔍 **Troubleshooting**

### **Common Issues**

1. **CSV Format Errors** - Use provided templates
2. **Permission Denied** - Check user role and permissions
3. **Validation Failures** - Review error messages
4. **Import Failures** - Check batch creation logs
5. **Batch Status Issues** - Verify batch is ACTIVE (IS_ACTIVE = TRUE)

### **Debug Steps**

1. **Check Console Logs** - Browser developer tools
2. **Review API Responses** - Network tab
3. **Verify Database Logs** - Snowflake query history
4. **Check Permission Matrix** - User role validation
5. **Validate CSV Format** - Template comparison
6. **Check Batch Status** - Ensure batch is ACTIVE in BULK_IMPORT_BATCHES (IS_ACTIVE = TRUE)

## 🚀 **Future Enhancements**

- [ ] **Real-time Collaboration** - Multiple user imports
- [ ] **Advanced Validation** - Custom business rules
- [ ] **Import Scheduling** - Automated imports
- [ ] **Data Transformation** - Pre-import processing
- [ ] **Integration APIs** - External system imports
- [ ] **Advanced Analytics** - Import performance metrics
- [ ] **Template Management** - Custom template creation
- [ ] **Bulk Export** - Reverse operation support
- [ ] **Batch Rollback** - Ability to deactivate entire batches
- [ ] **Batch Merging** - Combine multiple batches
- [ ] **Batch Analytics** - Performance metrics per batch
