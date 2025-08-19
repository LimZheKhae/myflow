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
-- Gift Requests Table
CREATE TABLE MY_FLOW.PUBLIC.GIFT_REQUESTS (
  ID VARCHAR PRIMARY KEY,
  DATE DATE,
  PIC VARCHAR,
  MEMBER_LOGIN VARCHAR,
  PLAYER_NAME VARCHAR,
  PHONE_NUMBER VARCHAR,
  ADDRESS VARCHAR,
  GIFT VARCHAR,
  COST DECIMAL(10,2),
  CURRENCY VARCHAR,
  REMARK TEXT,
  CATEGORY VARCHAR,
  WORKFLOW_STATUS VARCHAR,
  TRANSACTION_ID VARCHAR,
  UPLOADED_BY VARCHAR,
  UPLOADED_AT TIMESTAMP,
  -- MKTOps fields
  MKTOPS_DISPATCHER VARCHAR,
  MKTOPS_TRACKING_CODE VARCHAR,
  MKTOPS_STATUS VARCHAR,
  -- KAM Proof fields
  KAM_PROOF_FILE VARCHAR,
  KAM_RECEIVER_FEEDBACK TEXT,
  KAM_UPLOADED_BY VARCHAR,
  KAM_UPLOADED_DATE TIMESTAMP,
  -- SalesOps fields
  SALESOPS_CHECKER_NAME VARCHAR,
  SALESOPS_REMARK TEXT,
  SALESOPS_CHECKED_DATE TIMESTAMP
);

-- Bulk Import Logs
CREATE TABLE MY_FLOW.PUBLIC.BULK_IMPORT_LOGS (
  TRANSACTION_ID VARCHAR PRIMARY KEY,
  MODULE VARCHAR,
  TAB VARCHAR,
  UPLOADED_BY VARCHAR,
  TOTAL_ROWS INTEGER,
  SUCCESSFUL_ROWS INTEGER,
  FAILED_ROWS INTEGER,
  STATUS VARCHAR, -- COMPLETED, FAILED, ROLLED_BACK
  ERROR_MESSAGE TEXT,
  CREATED_AT TIMESTAMP,
  ROLLBACK_DATE TIMESTAMP,
  ROLLED_BACK_ROWS INTEGER
);

-- Bulk Rollback Logs
CREATE TABLE MY_FLOW.PUBLIC.BULK_ROLLBACK_LOGS (
  ID VARCHAR PRIMARY KEY,
  TRANSACTION_ID VARCHAR,
  MODULE VARCHAR,
  TAB VARCHAR,
  ROLLED_BACK_BY VARCHAR,
  ROLLED_BACK_ROWS INTEGER,
  ORIGINAL_TOTAL_ROWS INTEGER,
  ORIGINAL_SUCCESSFUL_ROWS INTEGER,
  CREATED_AT TIMESTAMP
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
5. **Import** - Execute database transaction
6. **Result** - View import results and transaction ID

### **3. Rollback Process**

1. **Access Result Tab** - View transaction details
2. **Click Rollback** - Initiate rollback process
3. **Confirmation** - Verify rollback completion
4. **Audit Trail** - Check rollback logs

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

## 🔄 **Rollback Capabilities**

### **Automatic Rollback**

- **Transaction Failure** - Automatic rollback
- **Validation Errors** - No data inserted
- **System Errors** - Complete rollback

### **Manual Rollback**

- **User-Initiated** - Via UI button
- **Transaction ID** - Unique identifier tracking
- **Audit Trail** - Complete rollback logging
- **Data Integrity** - Maintains referential integrity

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
  "transactionId": "bulk_1234567890",
  "uploadedBy": "user@example.com"
}
```

### **Bulk Rollback**

```http
POST /api/gift-approval/bulk-rollback
Content-Type: application/json

{
  "transactionId": "bulk_1234567890"
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
4. **Import Failures** - Check transaction logs
5. **Rollback Issues** - Verify transaction ID

### **Debug Steps**

1. **Check Console Logs** - Browser developer tools
2. **Review API Responses** - Network tab
3. **Verify Database Logs** - Snowflake query history
4. **Check Permission Matrix** - User role validation
5. **Validate CSV Format** - Template comparison

## 🚀 **Future Enhancements**

- [ ] **Real-time Collaboration** - Multiple user imports
- [ ] **Advanced Validation** - Custom business rules
- [ ] **Import Scheduling** - Automated imports
- [ ] **Data Transformation** - Pre-import processing
- [ ] **Integration APIs** - External system imports
- [ ] **Advanced Analytics** - Import performance metrics
- [ ] **Template Management** - Custom template creation
- [ ] **Bulk Export** - Reverse operation support

