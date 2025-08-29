# Bulk Upload System Guide

## Overview

The bulk upload system provides a comprehensive solution for importing large datasets into the Gift Approval module with full validation, transaction safety, rollback capabilities, and intelligent data correction assistance.

## 🎯 **Key Features**

### **1. Role-Based Access Control**

- **IMPORT permission** required for bulk upload
- **Tab-specific validation** rules
- **Role-based button visibility** (Manager+, KAM+, Audit+)
- **Merchant & Currency permissions** validation

### **2. Advanced Data Validation**

- **CSV format validation**
- **Required field checking**
- **Data type validation**
- **Business rule validation**
- **Duplicate detection**
- **Member profile validation**
- **Merchant & Currency matching**

### **3. Intelligent Data Correction Assistant**

- **Automatic error detection** and suggestions
- **Smart field corrections** (case, typos, mismatches)
- **Member login suggestions** with similar names
- **Merchant & Currency auto-correction**
- **Download corrected CSV** for verification
- **Apply corrections & re-validate** functionality

### **4. Database Transaction Safety**

- **Atomic operations** - All or nothing
- **Automatic rollback** on errors
- **Transaction logging** for audit trail
- **Manual rollback** capability
- **Batch ID tracking** for all operations

### **5. Enhanced User Experience**

- **Template download** for correct format
- **Real-time validation** feedback
- **Preview mode** before import
- **Progress tracking**
- **Detailed error reporting**
- **Responsive modal design**

## 📋 **Supported Tabs & Validation Rules**

### **Pending Tab (New Gift Requests)**

**Required Fields:**

- `merchant` - Merchant name (must match member's merchant)
- `memberLogin` - Member login (must exist in database)
- `currency` - Currency code (must match member's currency)
- `giftItem` - Gift item description
- `category` - One of: Birthday Gift, Offline Campaign, Online Campaign, Festival Gift, Leaderboard, Loyalty Gift, Rewards Club, Others
- `giftCost` - Numeric value (positive number)
- `rewardName` - One of: Luxury Gifts, Electronics, Fashion & Accessories, Food & Beverages, Travel & Experiences, Gaming & Entertainment, Sports & Fitness, Beauty & Wellness, Home & Lifestyle, Digital Services, Gift Cards, Others

**Optional Fields:**

- `rewardClubOrder` - Reward club order reference
- `description` - Additional notes (replaces old 'remark' field)

**Validation Rules:**

- ✅ **Member Existence**: Member login must exist in member profiles
- ✅ **Merchant Match**: CSV merchant must exactly match member's merchant
- ✅ **Currency Match**: CSV currency must exactly match member's currency
- ✅ **Permission Check**: Uploader must have access to specified merchant & currency
- ✅ **Category Validation**: Must be one of the predefined categories
- ✅ **Reward Name Validation**: Must be one of the predefined reward names
- ✅ **Cost Validation**: Must be a positive number

### **Processing Tab**

**Required Fields:**

- `giftId` - Existing gift request ID
- `dispatcher` - Courier company
- `trackingCode` - Tracking number
- `status` - One of: In Transit, Delivered, Failed

**Validation Rules:**

- ✅ **Gift ID Existence**: Gift ID must exist in database
- ✅ **Status Validation**: Must be valid tracking status
- ✅ **No uploadedBo Requirement**: Removed requirement for BO upload

### **KAM Proof Tab**

**Required Fields:**

- `giftId` - Existing gift request ID
- `proofFile` - Proof file name/path
- `receiverFeedback` - Player feedback

**Optional Fields:**

- `uploadedBy` - KAM name (auto-filled if not provided)

**Validation Rules:**

- ✅ **Gift ID Existence**: Gift ID must exist in database
- ✅ **Proof File**: Must provide proof file reference
- ✅ **Feedback**: Must provide receiver feedback

### **Audit Tab**

**Required Fields:**

- `giftId` - Existing gift request ID
- `checkerName` - Auditor name
- `remark` - Audit notes

**Validation Rules:**

- ✅ **Gift ID Existence**: Gift ID must exist in database
- ✅ **Auditor Name**: Must provide auditor name
- ✅ **Audit Notes**: Must provide audit remarks

## 🔧 **Database Schema**

### **Main Tables**

```sql
-- Gift Details Table (Master Table)
CREATE OR REPLACE TABLE MY_FLOW.PUBLIC.GIFT_DETAILS (
  GIFT_ID NUMBER(38,0) NOT NULL AUTOINCREMENT START 100 INCREMENT 1 ORDER,
  VIP_ID NUMBER(38,0),
  BATCH_ID VARCHAR(50),
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
  CURRENCY VARCHAR(10),
  MERCHANT_NAME VARCHAR(100),
  PRIMARY KEY (GIFT_ID)
);

-- Bulk Import Batches Table
CREATE OR REPLACE TABLE MY_FLOW.PUBLIC.BULK_IMPORT_BATCHES (
  BATCH_ID VARCHAR(50) PRIMARY KEY,
  TRANSACTION_ID VARCHAR(50),
  MODULE VARCHAR(50),
  TAB VARCHAR(50),
  BATCH_NAME VARCHAR(200),
  DESCRIPTION TEXT,
  UPLOADED_BY VARCHAR(100),
  TOTAL_ROWS INTEGER,
  SUCCESSFUL_ROWS INTEGER,
  FAILED_ROWS INTEGER,
  TOTAL_VALUE DECIMAL(15,2),
  STATUS VARCHAR(20), -- 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'ROLLED_BACK'
  ERROR_MESSAGE TEXT,
  CREATED_AT TIMESTAMP,
  COMPLETED_AT TIMESTAMP,
  FAILED_AT TIMESTAMP,
  ROLLBACK_DATE TIMESTAMP,
  ROLLED_BACK_ROWS INTEGER,
  ROLLBACK_REASON TEXT
);

-- Member Profiles Table (for validation)
CREATE OR REPLACE TABLE MY_FLOW.MART.ALL_MEMBER_PROFILE (
  MEMBER_ID NUMBER(38,0),
  MEMBER_LOGIN VARCHAR(16777216),
  MEMBER_NAME VARCHAR(16777216),
  MERCHANT VARCHAR(16777216),
  MERCHANT_NAME VARCHAR(16777216),
  CURRENCY VARCHAR(16777216),
  -- ... other fields
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

1. **Download Template** - Get correct CSV format with new field structure
2. **Upload File** - Select CSV file (max 5MB)
3. **Validation** - Automatic data validation with member profile checking
4. **Correction Assistant** - Review and apply automatic corrections
5. **Preview** - Review data before import
6. **Import** - Execute database transaction (INSERT INTO GIFT_DETAILS)
7. **Result** - View import results and batch ID

### **3. Data Correction Assistant**

**Automatic Corrections:**

- **Member Login**: Find similar member names when exact match fails
- **Merchant Mismatch**: Correct merchant names to match member's actual merchant
- **Currency Mismatch**: Correct currency to match member's actual currency
- **Case Corrections**: Fix category and reward name case issues
- **Field Suggestions**: Provide available options for member selection

**Correction Features:**

- **Side-by-side Comparison**: Original vs corrected data
- **Download Options**: Original CSV, corrected CSV
- **Apply & Re-validate**: Automatic correction application
- **Member Options**: Show available members with merchant/currency combinations

### **4. Workflow Updates**

After bulk import, different tabs will UPDATE the GIFT_DETAILS rows accordingly:

- **Pending Tab**: INSERT new gift requests (WORKFLOW_STATUS = 'KAM_Request')
- **Processing Tab**: UPDATE tracking information (DISPATCHER, TRACKING_CODE, etc.)
- **KAM Proof Tab**: UPDATE proof and feedback (KAM_PROOF, GIFT_FEEDBACK)
- **Audit Tab**: UPDATE audit information (AUDITED_BY, AUDIT_REMARK)

### **5. Batch Management**

- Each bulk import creates a record in BULK_IMPORT_BATCHES
- Batch ID is linked to GIFT_DETAILS records via BATCH_ID field
- Batch status tracking for rollback capabilities
- Complete audit trail of all batch operations

## 📁 **File Structure**

```
components/
├── ui/
│   ├── bulk-upload-dialog.tsx          # Main upload component with correction assistant
│   ├── bulk-update-dialog.tsx          # Bulk update component
│   └── file-uploader.tsx               # File selection component

app/
├── api/
│   └── gift-approval/
│       ├── bulk-import/
│       │   └── route.ts                # Import API with member validation
│       ├── bulk-update/
│       │   └── route.ts                # Update API
│       ├── bulk-rollback/
│       │   └── route.ts                # Rollback API
│       └── export-current/
│           └── route.ts                # Export current gifts

app/
└── gift-approval/
    └── page.tsx                        # Main page with upload button

contexts/
└── member-profile-context.tsx          # Member profile validation context
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

### **Enhanced Data Validation**

- **SQL Injection Prevention** - Parameterized queries
- **File Type Validation** - CSV only
- **File Size Limits** - 5MB maximum
- **Content Validation** - Business rule enforcement
- **Member Profile Validation** - Cross-reference with member database
- **Merchant & Currency Permissions** - User access validation

## 📊 **Error Handling**

### **Validation Errors**

- **Missing Required Fields** - Row-level error reporting
- **Invalid Data Types** - Type checking with suggestions
- **Business Rule Violations** - Domain-specific validation
- **Duplicate Detection** - Warning for potential duplicates
- **Member Not Found** - Clear error with suggestions
- **Merchant Mismatch** - Show correct merchant for member
- **Currency Mismatch** - Show correct currency for member

### **Database Errors**

- **Transaction Rollback** - Automatic on any error
- **Partial Import Handling** - Continue with valid rows
- **Error Logging** - Detailed error tracking
- **User Feedback** - Clear error messages
- **Correction Suggestions** - Automatic fix recommendations

## 🔄 **Batch Management**

### **Batch Tracking**

- **Batch ID Generation** - Unique batch identifiers
- **Batch Status Management** - Complete status tracking
- **Batch Filtering** - Active/inactive batch control
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
- **Member Profile Caching** - Fast member validation

### **Monitoring**

- **Import Logs** - Track all operations
- **Performance Metrics** - Import speed tracking
- **Error Rates** - Quality monitoring
- **User Activity** - Usage analytics
- **Correction Analytics** - Track correction success rates

## 🛠 **API Endpoints**

### **Bulk Import**

```http
POST /api/gift-approval/bulk-import
Content-Type: application/json

{
  "tab": "pending",
  "data": [...],
  "batchId": "BATCH_1234567890_abc123",
  "uploadedBy": "user@example.com",
  "userDisplayName": "John Doe",
  "userId": "user123",
  "userRole": "KAM",
  "userPermissions": {
    "merchants": ["Beta", "Alpha"],
    "currencies": ["MYR", "USD"]
  }
}
```

### **Bulk Update**

```http
POST /api/gift-approval/bulk-update
Content-Type: application/json

{
  "tab": "processing",
  "data": [...],
  "batchId": "BATCH_1234567890_def456",
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
  "batchId": "BATCH_123",
  "isActive": false,
  "updatedBy": "admin@example.com"
}
```

### **Export Current Gifts**

```http
GET /api/gift-approval/export-current?tab=processing
Content-Type: application/json
```

## 📝 **CSV Template Examples**

### **Pending Tab Template (Updated)**

```csv
merchant,memberLogin,currency,giftItem,category,giftCost,rewardName,rewardClubOrder,description
Beta,vipuser1,MYR,Gift Card,Birthday Gift,100,Luxury Gifts,RCO-001,Pokemon Gift Card
Alpha,vipuser2,USD,iPhone Pro,Online Campaign,1200,Electronics,RCO-002,High-end smartphone
```

### **Processing Tab Template**

```csv
giftId,dispatcher,trackingCode,status
GFT001,DHL,DHL123456789,In Transit
GFT002,FedEx,FDX987654321,Delivered
```

### **KAM Proof Tab Template**

```csv
giftId,proofFile,receiverFeedback,uploadedBy
GFT001,proof_001.jpg,Great gift! Thank you,John Doe
GFT002,proof_002.jpg,Excellent service,Jane Smith
```

### **Audit Tab Template**

```csv
giftId,checkerName,remark
GFT001,Auditor A,All documents verified
GFT002,Auditor B,Approved after review
```

## 🔍 **Troubleshooting**

### **Common Issues**

1. **CSV Format Errors** - Use provided templates with new field structure
2. **Permission Denied** - Check user role and merchant/currency permissions
3. **Validation Failures** - Review error messages and use correction assistant
4. **Import Failures** - Check batch creation logs
5. **Member Not Found** - Verify member login exists in selected merchant
6. **Merchant Mismatch** - Ensure CSV merchant matches member's actual merchant
7. **Currency Mismatch** - Ensure CSV currency matches member's actual currency

### **Debug Steps**

1. **Check Console Logs** - Browser developer tools
2. **Review API Responses** - Network tab
3. **Verify Database Logs** - Snowflake query history
4. **Check Permission Matrix** - User role validation
5. **Validate CSV Format** - Template comparison
6. **Check Member Profiles** - Verify member exists in database
7. **Use Correction Assistant** - Apply automatic corrections
8. **Check Batch Status** - Ensure batch is properly tracked

## 🚀 **Future Enhancements**

- [x] **Data Correction Assistant** - Automatic error detection and correction
- [x] **Member Profile Validation** - Cross-reference with member database
- [x] **Merchant & Currency Permissions** - Enhanced access control
- [x] **Responsive Modal Design** - Better mobile experience
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
- [ ] **Email Notifications** - Import completion alerts
- [ ] **Mobile Notifications** - Real-time status updates
