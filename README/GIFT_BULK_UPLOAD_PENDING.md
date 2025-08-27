# GIFT: Bulk Upload - Pending

## Overview

The **GIFT: Bulk Upload - Pending** feature allows users to upload multiple gift requests simultaneously using CSV files. This feature is specifically designed for the "Pending" tab of the Gift Approval module, enabling KAM and Admin users to create multiple gift requests in a single operation.

## Features

### ✅ **Core Functionality**

- **CSV Upload**: Upload CSV files with multiple gift request records
- **MemberLogin Validation**: Validate member login existence and map to VIP ID
- **Zod Schema Validation**: Consistent validation with individual gift requests
- **Batch Tracking**: Complete audit trail for all bulk operations
- **Workflow Automation**: Automatic progression from "KAM_Request" to "Manager_Review"

### ✅ **User Experience**

- **Template Download**: Pre-formatted CSV template with sample data
- **Real-time Validation**: Immediate feedback on validation errors
- **Preview Mode**: Review data before import
- **Progress Tracking**: Visual progress indicators during upload
- **Error Reporting**: Detailed error messages per row

### ✅ **Data Safety**

- **Transaction Safety**: All-or-nothing import with rollback capability
- **Partial Import Support**: Some rows can fail without affecting others
- **Batch Status Tracking**: Complete audit trail of import operations
- **Debug Logging**: Comprehensive SQL query logging for troubleshooting

## User Guide

### 1. Accessing Bulk Upload

1. Navigate to **Gift Approval** module
2. Select the **Pending** tab
3. Click the **"Bulk Upload"** button
4. The bulk upload dialog will open

### 2. Downloading Template

1. Click **"Download Template"** button
2. Open the downloaded CSV file
3. Use the sample data as a reference for your data format

### 3. Preparing CSV Data

#### Required Fields

- `memberLogin` - User's member login (e.g., "user123")
- `giftItem` - Name of the gift item (e.g., "Gift Card")
- `costMyr` - Cost in Malaysian Ringgit (e.g., "100")
- `category` - Gift category (e.g., "Birthday")

#### Optional Fields

- `rewardName` - Name of the reward (e.g., "Birthday Reward")
- `rewardClubOrder` - Reward club order number (e.g., "RCO-001")
- `remark` - Additional remarks (e.g., "VIP birthday gift")

#### Valid Categories

- Birthday
- Retention
- High Roller
- Promotion
- Other

### 4. CSV Format Example

```csv
memberLogin,giftItem,costMyr,category,rewardName,rewardClubOrder,remark
user123,Gift Card,100,Birthday,Birthday Reward,RCO-001,VIP birthday gift
john.doe,Phone,500,Retention,Retention Bonus,RCO-002,High value customer
maria.smith,Watch,750,High Roller,Premium Gift,RCO-003,Luxury item
```

### 5. Upload Process

1. **Upload File**: Drag and drop or select your CSV file
2. **Validation**: System validates each row and shows results
3. **Review Errors**: Fix any validation errors in your CSV
4. **Preview Data**: Review the first 5 rows before import
5. **Import**: Click "Import Data" to proceed with the import

### 6. Validation Rules

#### MemberLogin Validation

- Must not be empty
- Must exist in the database (currently hardcoded to accept all non-empty values)
- Automatically trimmed of whitespace

#### Gift Item Validation

- Must not be empty
- Must be a non-empty string

#### Cost Validation

- Must be a positive number
- Must be greater than 0

#### Category Validation

- Must be one of the valid categories listed above
- Case-sensitive validation

## Technical Implementation

### Database Schema

#### BULK_IMPORT_BATCHES Table

```sql
CREATE TABLE MY_FLOW.PUBLIC.BULK_IMPORT_BATCHES (
    BATCH_ID NUMBER(38,0) NOT NULL autoincrement start 10 increment 1 order,
    BATCH_NAME VARCHAR(200),  -- Format: BATCH_{user name}_{date time}
    UPLOADED_BY VARCHAR(100), -- Firebase User ID
    TOTAL_ROWS NUMBER(38,0),
    IS_ACTIVE BOOLEAN DEFAULT TRUE,
    CREATED_DATE TIMESTAMP_NTZ(9),
    COMPLETED_AT TIMESTAMP_NTZ(9),
    primary key (BATCH_ID)
);
```

#### GIFT_DETAILS Table (Target)

```sql
-- Records are inserted into GIFT_DETAILS with:
-- MEMBER_ID: Mapped from memberLogin using cached member profiles
-- BATCH_ID: Reference to the bulk import batch
-- WORKFLOW_STATUS: Initially "KAM_Request", then updated to "Manager_Review"
-- KAM_REQUESTED_BY: Firebase User ID of the user performing the bulk upload
-- CURRENCY: Member's currency from member profile
-- COST_BASE: Gift cost in MYR
-- COST_LOCAL: Gift cost in local currency (if different from MYR)
```

### API Endpoints

#### POST `/api/gift-approval/bulk-import`

- **Purpose**: Process bulk import requests
- **Authentication**: Requires KAM or Admin role with ADD permission
- **Input**: CSV data, tab type, user information
- **Output**: Import results with success/failure counts

### Frontend Components

#### BulkUploadDialog

- **Location**: `components/ui/bulk-upload-dialog.tsx`
- **Features**: File upload, validation, preview, import execution
- **Validation**: Uses Zod schema for consistent validation

#### Validation Logic

```typescript
// MemberLogin to Member ID mapping using cached member profiles
const validateMemberLogins = (memberLogins: string[]) => {
  // Uses cached member profiles from MY_FLOW.MART.ALL_MEMBER_PROFILE
  // Returns validation results with memberId, memberName, currency, etc.
  return memberProfiles.filter((member) => memberLogins.includes(member.memberLogin))
}
```

### Data Flow

#### 1. User Authentication & Batch Naming

```typescript
// Frontend passes user information
user: {
  id: "firebase_user_id_123",
  name: "John Anderson",      // Preferred for batch naming
  email: "john@company.com",  // Fallback if name not available
  role: "KAM",
  permissions: { "gift-approval": ["ADD"] }
}

// Backend generates batch name
const uploaderName = userDisplayName || uploadedBy || userId;  // userDisplayName = "John Anderson"
const currentDate = new Date().toLocaleString('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
}).replace(/[/,]/g, '-').replace(/\s/g, ' ');
const batchName = `BATCH_${uploaderName}_${currentDate}`;
// Result: "BATCH_John Anderson_01-05-2025 14:30:25"
```

#### 2. CSV Processing

```typescript
// Parse CSV with Papa Parse
const result = Papa.parse(text, {
  header: true,
  skipEmptyLines: true,
  transform: (value) => value.trim(),
})
```

#### 3. Validation Pipeline

```typescript
// 1. Check memberLogin exists and get memberId from cached profiles
// 2. Transform to Zod schema format with memberId
// 3. Validate with giftRequestFormSchema
// 4. Prepare validated data for API with proper member mapping
```

#### 4. Database Operations

```sql
-- 1. Create batch record with user-friendly name
INSERT INTO BULK_IMPORT_BATCHES (BATCH_NAME, UPLOADED_BY, TOTAL_ROWS, IS_ACTIVE, CREATED_DATE)
VALUES (?, ?, ?, TRUE, CURRENT_TIMESTAMP())
-- BATCH_NAME format: BATCH_{user name}_{date time} (e.g., BATCH_John Anderson_01-05-2025 14:30:25)

-- 2. Insert gift requests
INSERT INTO GIFT_DETAILS (MEMBER_ID, BATCH_ID, KAM_REQUESTED_BY, WORKFLOW_STATUS, MEMBER_LOGIN, COST_BASE, CURRENCY, COST_LOCAL, ...)
VALUES (?, ?, ?, 'KAM_Request', ?, ?, ?, ?, ...)

-- 3. Update workflow status
UPDATE GIFT_DETAILS
SET WORKFLOW_STATUS = 'Manager_Review', LAST_MODIFIED_DATE = CURRENT_TIMESTAMP()
WHERE KAM_REQUESTED_BY = ? AND WORKFLOW_STATUS = 'KAM_Request' AND DATE(CREATED_DATE) = CURRENT_DATE()

-- 4. Update batch status
UPDATE BULK_IMPORT_BATCHES
SET IS_ACTIVE = TRUE, COMPLETED_AT = CURRENT_TIMESTAMP()
WHERE BATCH_ID = ?
```

## Error Handling

### Validation Errors

- **Missing Required Fields**: Clear error messages for each missing field
- **Invalid Data Types**: Specific validation for numbers, categories, etc.
- **MemberLogin Not Found**: Error when memberLogin doesn't exist in database
- **Zod Schema Violations**: Detailed error messages from Zod validation

### Import Errors

- **Database Errors**: Individual row failures tracked and reported
- **Transaction Rollback**: Automatic rollback on critical errors
- **Batch Status Updates**: Failed batches marked as inactive (IS_ACTIVE = FALSE)
- **Rollback Mechanism**: Soft delete - sets IS_ACTIVE = FALSE instead of hard deletion
- **Partial Success**: Some rows can succeed while others fail

### Error Messages Examples

```
Row 2: Missing required field "memberLogin"
Row 3: Member login "invalid.user" not found in database
Row 4: Value must be a positive number (field: value)
Row 5: Please select a valid category (field: category)
```

## Debug Features

### SQL Query Logging

```typescript
// All database operations are logged with:
debugSQL(sql, params, label)
// Outputs: SQL query, parameters, formatted debug query
```

### Console Logging

```typescript
// Success messages
console.log(`✅ Successfully updated ${rowsUpdated} gift request(s) to Manager_Review status`)

// Warning messages
console.warn('⚠️ Warning: Bulk import completed but workflow status update failed')

// Error messages
console.error('Bulk import failed:', errorMessage)
```

## Security & Permissions

### Role Requirements

- **KAM Role**: Can perform bulk uploads
- **Admin Role**: Can perform bulk uploads
- **Other Roles**: Access denied

### Permission Requirements

- **ADD Permission**: Required for gift-approval module
- **Module Access**: Must have access to gift-approval module

### Data Validation

- **Input Sanitization**: All inputs are trimmed and validated
- **SQL Injection Prevention**: Parameterized queries used throughout
- **Transaction Safety**: Database transactions ensure data integrity

## Future Enhancements

### Database Integration

- **Enhanced MemberLogin Validation**: Improve cached member profile validation
- **Member Information Population**: Auto-populate fullName, phone, address from member profiles
- **Enhanced Error Handling**: More specific error messages for database issues

### Performance Optimizations

- **Batch Size Limits**: Implement maximum batch size limits
- **Progress Indicators**: Real-time progress updates for large imports
- **Background Processing**: Move large imports to background jobs

### User Experience

- **Drag & Drop**: Enhanced file upload interface
- **Real-time Validation**: Validate as user types in CSV editor
- **Template Customization**: Allow users to customize CSV templates

## Troubleshooting

### Common Issues

#### 1. "Member login not found" Errors

- **Cause**: MemberLogin doesn't exist in cached member profiles
- **Solution**: Verify memberLogin exists in member database or refresh member cache

#### 2. "Validation failed" Errors

- **Cause**: CSV data doesn't match required format
- **Solution**: Use the template and check validation rules

#### 3. "Import failed" Errors

- **Cause**: Database connection or permission issues
- **Solution**: Check database connectivity and user permissions

#### 4. "Workflow status update failed" Warnings

- **Cause**: No KAM_Request records found for today
- **Solution**: Check if records were actually created

### Debug Steps

1. Check browser console for error messages
2. Review server logs for SQL query details
3. Verify CSV format matches template
4. Confirm user has required permissions
5. Check database connectivity

## API Reference

### Request Format

```typescript
interface BulkImportRequest {
  tab: string // "pending"
  data: any[] // Validated CSV data with memberId mapping
  uploadedBy: string // Firebase User ID (for database tracking)
  userDisplayName: string // User name (preferred) or email or ID (for batch naming)
  userId: string // Firebase User ID
  userRole?: string // User role (KAM/ADMIN)
  userPermissions?: Record<string, string[]> // User permissions
  batchName?: string // Optional batch name
  description?: string // Optional description
}
```

### Response Format

```typescript
interface BulkImportResult {
  success: boolean
  message: string
  importedCount: number
  failedCount: number
  batchId: string
  totalValue: number
  failedRows?: any[]
}
```

## Related Documentation

- [Gift Module Overview](../Gift%20Module.md)
- [RBAC Documentation](../RBAC_DOCUMENTATION.md)
- [Bulk Upload System Guide](../BULK_UPLOAD_SYSTEM_GUIDE.md)
- [Gift API Documentation](../GIFT_API_DOCUMENTATION.md)

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Status**: Production Ready
