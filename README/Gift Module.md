# 🎁 Gift Module - Complete Documentation

## 📋 Overview

The Gift Module is a comprehensive workflow management system for handling gift requests, approvals, and delivery tracking. It implements a dual-layer access control system with RBAC as the default and UBAC for user-level overrides.

---

## 🔐 Access Control System

### **RBAC (Role-Based Access Control)**

- **Default Permission Framework**: Serves as the base layer for all access control
- **Role-Based Permissions**: Defines what each role can access and perform
- **Module-Level Security**: Controls access to different sections of the gift workflow

### **UBAC (User-Based Access Control)**

- **Permission Override**: Allows specific user-level permissions that override RBAC defaults
- **Granular Control**: Provides fine-tuned access control for individual users
- **Flexible Management**: Enables custom permission sets for special cases

---

## 👥 User Roles & Permissions

| Role        | Description          | Primary Responsibilities                     |
| ----------- | -------------------- | -------------------------------------------- |
| **KAM**     | Key Account Manager  | Gift request creation, delivery proof upload |
| **Manager** | Management Level     | Gift approval/rejection decisions            |
| **MKTOps**  | Marketing Operations | Tracking details, shipping management        |
| **Audit**   | SalesOps Audit Team  | Final verification and compliance checks     |
| **Admin**   | System Administrator | Full access across all modules and actions   |

---

## 🔄 Gift Workflow Stages

### **1. KAM Request → Manager Review**

**Status**: `KAM_Request` → `Manager_Review`

**Process**:

- KAM submits gift request with complete details
- System automatically converts status to "Manager Review"
- Request appears in "Pending" tab for manager review

**Required Fields**:

- Player information (validated against database)
- Gift item description
- Cost and currency
- Category (Birthday, Retention, High Roller, Promotion, Other)
- Detailed remarks

**Optional Fields**:

- Reward Club Order (reference number from reward system)
- Reward Name (specific reward item name)

**Validation Rules**:

- Player must exist in VIP database
- All required fields must be completed
- Cost must be positive number

---

### **2. Manager Review (Pending Tab)**

**Status**: `Manager_Review`

**Process**:

- Manager reviews gift request details
- Decision: Approve or Reject
- If approved: Moves to MKTOps Processing
- If rejected: Requires rejection reason

**Actions Available**:

- ✅ **Approve**: Moves to next workflow stage
- ❌ **Reject**: Requires detailed rejection reason
- 📋 **Bulk Actions**: Approve/reject multiple requests
- 📊 **Export**: Export selected requests to CSV

**Validation Rules**:

- Rejection requires mandatory reason
- Approval automatically triggers next stage

---

### **3. MKTOps Processing**

**Status**: `MKTOps_Processing`

**Process**:

- MKTOps receives approved gift requests
- Uploads tracking and shipping information
- Manages delivery logistics

**Required Fields**:

- Dispatcher/Courier information
- Tracking code
- Shipping status (In Transit, Delivered, Failed)
- BO (Bill of Order) proof upload

**Validation Rules**:

- Gift ID must be valid and exist
- Tracking code cannot be null
- Dispatcher information is required
- BO proof is optional but recommended

**Actions Available**:

- 🚚 **Update Tracking**: Add/modify shipping details
- 📎 **Upload BO Proof**: Attach delivery documentation
- 📋 **Bulk Update**: Update multiple gifts simultaneously
- 📊 **Export**: Export processing data

---

### **4. KAM Proof**

**Status**: `KAM_Proof`

**Process**:

- KAM confirms gift delivery
- Uploads delivery proof and feedback
- Provides receiver feedback

**Required Fields**:

- Gift ID (must be valid)
- Delivery proof image (optional)
- Receiver feedback (optional)

**Validation Rules**:

- Gift ID must exist and be in correct status
- Proof image is optional but recommended
- Feedback can be null

**Actions Available**:

- 📸 **Upload Proof**: Attach delivery confirmation
- 💬 **Add Feedback**: Record receiver comments
- 📋 **Bulk Upload**: Upload proof for multiple gifts

---

### **5. SalesOps Audit**

**Status**: `SalesOps_Audit`

**Process**:

- Audit team performs final verification
- Records checker information and remarks
- Marks gift as completed

**Required Fields**:

- Checker name (auto-filled from logged-in user)
- Audit remarks (optional)
- Gift ID (must be valid)

**Validation Rules**:

- Gift ID must exist and be in audit status
- Checker name is automatically populated
- Remarks are optional but recommended

**Actions Available**:

- ✅ **Complete Audit**: Mark gift as completed
- 📝 **Add Remarks**: Record audit observations
- 📋 **Bulk Audit**: Process multiple gifts

---

### **6. Completed**

**Status**: `Completed`

**Process**:

- Gift workflow is finalized
- All documentation is complete
- Available for reference and reporting

**Access**: Read-only access for all users
**Purpose**: Historical reference and compliance reporting

---

## 📊 Bulk Upload System

### **CSV Upload Support for Each Tab**

#### **Pending Tab - Gift Request Upload**

**Purpose**: Bulk creation of new gift requests

**Required CSV Fields**:

```csv
playerName,gift,cost,currency,category,remark,memberLogin,phoneNumber,address
```

**Optional CSV Fields**:

```csv
rewardClubOrder,rewardName
```

**Validation Rules**:

- ✅ Player must exist in VIP database
- ✅ All required fields must be populated
- ✅ Cost must be positive number
- ✅ Currency must be valid (MYR, USD, VND, GBP)
- ✅ Category must be valid

**Error Handling**:

- Invalid players are flagged with specific error messages
- Missing required fields prevent import
- Invalid data types are rejected

---

#### **Processing Tab - Tracking Details Upload**

**Purpose**: Bulk update of existing gift tracking information

**Required CSV Fields**:

```csv
giftId,dispatcher,trackingCode,status
```

**Validation Rules**:

- ✅ Gift ID must be valid and exist
- ✅ Tracking code cannot be null
- ✅ Dispatcher information is required
- ✅ Status must be valid (In Transit, Delivered, Failed)

**Error Handling**:

- Invalid gift IDs are flagged
- Missing tracking codes prevent update
- Non-existent gifts are reported

---

#### **KAM Proof Tab - Proof Upload**

**Purpose**: Bulk upload of delivery proof and feedback

**Required CSV Fields**:

```csv
giftId,receiverFeedback
```

**Validation Rules**:

- ✅ Gift ID must be valid and exist
- ✅ Gift must be in KAM Proof status
- ✅ Proof image is optional (handled separately)
- ✅ Feedback can be null

**Error Handling**:

- Invalid gift IDs are reported
- Gifts in wrong status are flagged
- Optional fields are handled gracefully

---

#### **Audit Tab - Audit Information Upload**

**Purpose**: Bulk upload of audit remarks and checker information

**Required CSV Fields**:

```csv
giftId,remark
```

**Validation Rules**:

- ✅ Gift ID must be valid and exist
- ✅ Gift must be in audit status
- ✅ Checker name is auto-filled from logged-in user
- ✅ Remarks are optional

**Error Handling**:

- Invalid gift IDs are flagged
- Gifts in wrong status are reported
- Missing remarks are handled gracefully

---

## 🔒 Tab Action Permissions

### **Request Button**

**Access**: KAM, Admin
**Function**: Create new gift requests
**Validation**: User must have ADD permission for gift-approval module

### **Pending Tab (Manager Review)**

**Access**: Manager, Admin
**Actions**:

- Approve gift requests
- Reject gift requests with reason
- Bulk approve/reject
- Export selected requests

### **Processing Tab (MKTOps)**

**Access**: MKTOps, Admin
**Actions**:

- Update tracking information
- Upload BO proof
- Bulk update tracking
- Export processing data

### **KAM Proof Tab**

**Access**: KAM, Admin
**Actions**:

- Upload delivery proof
- Add receiver feedback
- Bulk upload proof
- Export proof data

### **Audit Tab**

**Access**: Audit team, Admin
**Actions**:

- Complete audit process
- Add audit remarks
- Bulk audit completion
- Export audit data

### **Completed Tab**

**Access**: All users (read-only)
**Actions**:

- View completed gifts
- Export completed data
- Generate reports

---

## 🛡️ Security Features

### **Permission Guards**

- **Module-Level**: Controls access to entire gift module
- **Action-Level**: Controls specific actions within tabs
- **Data-Level**: Controls access to specific gift records

### **Role-Based Action Components**

- `KAMOnlyAction`: Restricts actions to KAM users only
- `ManagerAndAboveAction`: Allows Manager and higher roles
- `AuditAndAboveAction`: Allows Audit and higher roles
- `AdminOnlyAction`: Restricts to Admin users only

### **Enhanced Permission Guard**

- Provides fallback UI for unauthorized users
- Shows appropriate messages for permission restrictions
- Maintains UI consistency across permission levels

---

## 📈 Data Management

### **Batch Processing**

- **Batch ID System**: Tracks all records from single upload operation
- **Transaction Safety**: All-or-nothing import operations
- **Rollback Capability**: Ability to undo bulk operations
- **Audit Trail**: Complete history of all operations

### **Validation Layers**

- **Frontend Validation**: Real-time validation during upload
- **Backend Validation**: Server-side data integrity checks
- **Database Constraints**: Database-level validation rules
- **Business Logic**: Custom validation for business rules

### **Error Handling**

- **Detailed Error Messages**: Specific feedback for validation failures
- **Partial Success Handling**: Reports on successful vs failed imports
- **Retry Mechanisms**: Ability to retry failed operations
- **Error Logging**: Comprehensive error tracking and reporting

---

## 🔧 Technical Implementation

### **Database Schema**

```sql
-- Main gift requests table
CREATE TABLE MY_FLOW.PUBLIC.GIFT_REQUESTS (
    ID VARCHAR(50) PRIMARY KEY,
    DATE DATE,
    PIC VARCHAR(100),
    MEMBER_LOGIN VARCHAR(100),
    PLAYER_NAME VARCHAR(200),
    PHONE_NUMBER VARCHAR(50),
    ADDRESS TEXT,
    REWARD_NAME VARCHAR(200),
    GIFT TEXT,
    COST DECIMAL(15,2),
    CURRENCY VARCHAR(10),
    REMARK TEXT,
    CATEGORY VARCHAR(50),
    REWARD_CLUB_ORDER VARCHAR(100),
    WORKFLOW_STATUS VARCHAR(50),
    BATCH_ID VARCHAR(50),
    TRANSACTION_ID VARCHAR(50),
    UPLOADED_BY VARCHAR(100),
    UPLOADED_AT TIMESTAMP
);

-- Batch tracking table
CREATE TABLE MY_FLOW.PUBLIC.BULK_IMPORT_BATCHES (
    BATCH_ID VARCHAR(50) PRIMARY KEY,
    MODULE VARCHAR(50),
    TAB VARCHAR(50),
    STATUS VARCHAR(20),
    TOTAL_ROWS INTEGER,
    SUCCESSFUL_ROWS INTEGER,
    FAILED_ROWS INTEGER,
    CREATED_AT TIMESTAMP
);
```

### **API Endpoints**

- `POST /api/gift-approval/bulk-import`: Bulk import gift data
- `POST /api/gift-approval/bulk-rollback`: Rollback bulk operations
- `GET /api/gift-approval/gifts`: Retrieve gift data
- `PUT /api/gift-approval/gifts/{id}`: Update gift information

### **Frontend Components**

- `BulkUploadDialog`: Multi-step bulk upload interface
- `PermissionGuard`: Role-based access control
- `RoleBasedActionPermission`: Granular action permissions
- `DataTable`: Display and manage gift data

---

## 📊 Monitoring & Analytics

### **Success Metrics**

- **Import Success Rate**: Percentage of successful bulk imports
- **Processing Time**: Average time to process gift requests
- **Error Rates**: Frequency of validation failures
- **User Activity**: Most active users and roles

### **Audit Reports**

- **Batch History**: Complete history of all bulk operations
- **User Actions**: Track all user activities and changes
- **Error Logs**: Detailed error tracking and analysis
- **Compliance Reports**: Audit trail for regulatory compliance

---

## 🚀 Future Enhancements

### **Planned Features**

- **Email Notifications**: Automated alerts for status changes
- **Mobile App**: Mobile interface for KAM proof uploads
- **Advanced Analytics**: Machine learning for gift value optimization
- **Integration APIs**: Connect with external shipping providers
- **Real-time Tracking**: Live tracking integration with courier services

### **Performance Optimizations**

- **Caching**: Implement Redis caching for frequently accessed data
- **Database Indexing**: Optimize database queries for large datasets
- **Async Processing**: Background processing for bulk operations
- **CDN Integration**: Optimize file upload and delivery

---

## 📞 Support & Maintenance

### **Troubleshooting**

- **Common Issues**: FAQ for typical problems
- **Error Codes**: Reference guide for error messages
- **Debug Tools**: Development utilities for problem diagnosis
- **Log Analysis**: Tools for analyzing system logs

### **Maintenance Procedures**

- **Regular Backups**: Automated backup procedures
- **Data Cleanup**: Periodic cleanup of old records
- **Performance Monitoring**: Continuous system monitoring
- **Security Updates**: Regular security patch management

---

_This documentation provides a comprehensive overview of the Gift Module's functionality, security, and implementation details. For specific technical questions or implementation guidance, refer to the individual component documentation._
