# 🛡️ Bulk Upload Database Safeguards Guide

## Overview

This document outlines the comprehensive database-side safeguards implemented to prevent human mistakes and provide rollback capabilities for bulk upload operations, including the latest intelligent data correction assistant and member profile validation features.

## 🎯 **Key Safeguards Implemented**

### **1. Batch ID System (Primary Safeguard)**

#### **What is a Batch ID?**

- **Unique identifier** for each bulk upload operation
- **Format**: `BATCH_{timestamp}_{random_string}` (e.g., `BATCH_1703123456789_abc123def`)
- **Purpose**: Track all records from a single upload operation

#### **Benefits:**

- ✅ **Atomic Operations**: All records in a batch succeed or fail together
- ✅ **Easy Rollback**: Rollback entire batch with one operation
- ✅ **Audit Trail**: Complete history of what was uploaded when
- ✅ **Data Integrity**: Prevents partial imports

#### **Database Schema:**

```sql
-- Batch tracking table
CREATE TABLE MY_FLOW.PUBLIC.BULK_IMPORT_BATCHES (
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

-- Enhanced gift requests table with batch tracking
ALTER TABLE MY_FLOW.PUBLIC.GIFT_DETAILS
ADD COLUMN BATCH_ID VARCHAR(50),
ADD COLUMN CURRENCY VARCHAR(10),
ADD COLUMN MERCHANT_NAME VARCHAR(100);
```

### **2. Member Profile Validation System**

#### **Cross-Reference Validation:**

- **Member Login Validation**: Verify member exists in `ALL_MEMBER_PROFILE`
- **Merchant Match Validation**: Ensure CSV merchant matches member's actual merchant
- **Currency Match Validation**: Ensure CSV currency matches member's actual currency
- **Permission Validation**: Check user has access to specified merchant & currency

#### **Database Schema:**

```sql
-- Member profiles table for validation
CREATE OR REPLACE TABLE MY_FLOW.MART.ALL_MEMBER_PROFILE (
    MEMBER_ID NUMBER(38,0),
    MEMBER_LOGIN VARCHAR(16777216),
    MEMBER_NAME VARCHAR(16777216),
    MERCHANT VARCHAR(16777216),        -- Merchant code
    MERCHANT_NAME VARCHAR(16777216),   -- Merchant name
    CURRENCY VARCHAR(16777216),
    -- ... other fields
);
```

### **3. Transaction Management**

#### **Database Transactions:**

- **BEGIN TRANSACTION**: Start atomic operation
- **COMMIT**: Save all changes if successful
- **ROLLBACK**: Undo all changes if any error occurs

#### **Benefits:**

- ✅ **Data Consistency**: No partial updates
- ✅ **Automatic Rollback**: Failed imports don't corrupt data
- ✅ **Isolation**: Other operations aren't affected

### **4. Comprehensive Logging System**

#### **Three-Level Logging:**

1. **Bulk Import Logs** (`BULK_IMPORT_LOGS`)

   - Transaction-level logging
   - Summary of each import operation

2. **Batch Tracking** (`BULK_IMPORT_BATCHES`)

   - Detailed batch information
   - Status tracking and rollback history

3. **Rollback Logs** (`BULK_ROLLBACK_LOGS`)
   - Complete rollback history
   - Reasons and affected records

### **5. Enhanced Validation Layers**

#### **Frontend Validation:**

- ✅ **CSV Format Validation**: Ensures proper file structure
- ✅ **Field Validation**: Required fields, data types, formats
- ✅ **Business Logic**: Cost limits, duplicate checks
- ✅ **Preview Mode**: Show data before import
- ✅ **Member Profile Validation**: Cross-reference with member database
- ✅ **Merchant & Currency Validation**: Permission and match checking

#### **Backend Validation:**

- ✅ **Database Constraints**: Foreign keys, unique constraints
- ✅ **Data Type Validation**: Ensure proper data types
- ✅ **Business Rules**: Cost limits, status transitions
- ✅ **Duplicate Prevention**: Check for existing records
- ✅ **Member Existence**: Verify member in database
- ✅ **Permission Validation**: Check user access rights

### **6. Intelligent Data Correction Assistant**

#### **Automatic Error Detection:**

- **Member Login Suggestions**: Find similar member names when exact match fails
- **Merchant Mismatch Correction**: Auto-correct merchant names to match member's actual merchant
- **Currency Mismatch Correction**: Auto-correct currency to match member's actual currency
- **Case Corrections**: Fix category and reward name case issues
- **Field Suggestions**: Provide available options for member selection

#### **Correction Features:**

- **Side-by-side Comparison**: Original vs corrected data display
- **Download Options**: Original CSV, corrected CSV for verification
- **Apply & Re-validate**: Automatic correction application
- **Member Options**: Show available members with merchant/currency combinations

### **7. Rollback Mechanisms**

#### **Two Rollback Types:**

1. **Transaction-Based Rollback**

   - Use `transactionId` to rollback
   - Automatically finds associated batch

2. **Batch-Based Rollback**
   - Use `batchId` directly
   - More precise control

#### **Rollback Process:**

```sql
-- For all tabs: Update status to ROLLED_BACK
UPDATE MY_FLOW.PUBLIC.BULK_IMPORT_BATCHES
SET STATUS = 'ROLLED_BACK', 
    ROLLBACK_DATE = CURRENT_TIMESTAMP(),
    ROLLED_BACK_ROWS = (SELECT COUNT(*) FROM MY_FLOW.PUBLIC.GIFT_DETAILS WHERE BATCH_ID = 'BATCH_123'),
    ROLLBACK_REASON = 'User requested rollback'
WHERE BATCH_ID = 'BATCH_123';

-- Remove BATCH_ID from GIFT_DETAILS to make them invisible
UPDATE MY_FLOW.PUBLIC.GIFT_DETAILS
SET BATCH_ID = NULL, LAST_MODIFIED_DATE = CURRENT_TIMESTAMP()
WHERE BATCH_ID = 'BATCH_123';
```

## 🔧 **Implementation Details**

### **Two Validation Approaches:**

#### **Approach 1: Pre-Validation with Correction Assistant (Current Implementation)**

```typescript
// Frontend validates ALL data before sending to backend
const validation = validateCSVWithMemberProfiles(csvData)
if (!validation.isValid) {
  // Generate correction suggestions
  const { suggestions, correctedRows } = generateCorrectionSuggestions(csvData, validation.errors)
  
  // Show correction assistant dialog
  if (suggestions.length > 0) {
    setShowCorrectionDialog(true)
    setCorrectionSuggestions(suggestions)
    setCorrectedRows(correctedRows)
  }
  
  return { success: false, errors: validation.errors }
}

// Only valid data reaches backend
await importValidatedData(validation.data)
```

**Benefits:**

- ✅ **Atomic operations** - all succeed or all fail
- ✅ **No partial imports** - prevents data corruption
- ✅ **Better user experience** - clear feedback before import
- ✅ **Reduced database load** - no failed transaction attempts
- ✅ **Intelligent corrections** - automatic error fixing suggestions
- ✅ **Member validation** - cross-reference with member database

#### **Approach 2: Attempt Import (Alternative)**

```typescript
// Send all data to backend, handle failures individually
const result = await attemptImport(csvData)
// Returns: { success: true, importedCount: 8, failedCount: 2, failedRows: [...] }
```

**Benefits:**

- ✅ **Partial success** - some rows succeed even if others fail
- ✅ **More flexible** - handles mixed valid/invalid data
- ✅ **Real-time feedback** - shows exactly what succeeded/failed

### **Enhanced Bulk Upload Flow:**

1. **Pre-Upload Validation**

   ```typescript
   // Validate CSV structure and data with member profiles
   const validation = await validateCSVWithMemberProfiles(csvData)
   if (!validation.isValid) {
     // Generate correction suggestions
     const corrections = generateCorrectionSuggestions(csvData, validation.errors)
     return { success: false, errors: validation.errors, corrections }
   }
   ```

2. **Batch Creation**

   ```typescript
   // Create batch record before import
   const batchId = `BATCH_${Date.now()}_${randomString}`
   await createBatchRecord(batchId, transactionId, data.length)
   ```

3. **Atomic Import**

   ```typescript
   // Use database transaction
   await executeQuery('BEGIN TRANSACTION')
   try {
     // Import all records with batch ID and member validation
     await importRecordsWithMemberValidation(data, batchId)
     await executeQuery('COMMIT')
   } catch (error) {
     await executeQuery('ROLLBACK')
     throw error
   }
   ```

4. **Post-Import Logging**
   ```typescript
   // Update batch with results
   await updateBatchStatus(batchId, 'COMPLETED', importedCount)
   ```

### **Member Profile Validation Process:**

1. **Bulk Member Lookup**

   ```typescript
   // Get all member logins from CSV
   const memberLogins = csvData.map(row => row.memberLogin.trim().toLowerCase())
   
   // Bulk validate against member database
   const validation = await bulkValidateMemberLogins(memberLogins)
   ```

2. **Permission Checking**

   ```typescript
   // Check user permissions for merchants and currencies
   const userMerchants = user.permissions['merchants'] || []
   const userCurrencies = user.permissions['currencies'] || []
   
   // Validate each row
   csvData.forEach(row => {
     if (!userMerchants.includes(row.merchant)) {
       errors.push(`No permission for merchant: ${row.merchant}`)
     }
     if (!userCurrencies.includes(row.currency)) {
       errors.push(`No permission for currency: ${row.currency}`)
     }
   })
   ```

3. **Merchant & Currency Matching**

   ```typescript
   // Validate merchant and currency match member's actual data
   const memberData = validationMap.get(row.memberLogin.toLowerCase())
   if (memberData.merchant !== row.merchant.trim()) {
     errors.push(`Member belongs to merchant "${memberData.merchant}", not "${row.merchant}"`)
   }
   if (memberData.currency !== row.currency.trim()) {
     errors.push(`Member has currency "${memberData.currency}", not "${row.currency}"`)
   }
   ```

### **Rollback Process:**

1. **Identify Batch**

   ```typescript
   // Find batch by batch ID
   const batch = await getBatchDetails(batchId)
   ```

2. **Execute Rollback**

   ```typescript
   // Rollback based on tab type
   switch (batch.tab) {
     case 'pending':
       await deleteBatchRecords(batchId)
       break
     case 'processing':
       await revertToPreviousState(batchId)
       break
   }
   ```

3. **Update Logs**
   ```typescript
   // Mark batch as rolled back
   await updateBatchStatus(batchId, 'ROLLED_BACK', rolledBackCount)
   ```

## 🚨 **Error Prevention Strategies**

### **1. Human Error Prevention**

#### **Before Upload:**

- ✅ **Template Downloads**: Provide correct CSV templates with new field structure
- ✅ **Validation Preview**: Show data before import
- ✅ **Field Descriptions**: Clear field requirements
- ✅ **Sample Data**: Example of correct format
- ✅ **Member Profile Integration**: Show available members

#### **During Upload:**

- ✅ **Real-time Validation**: Immediate feedback
- ✅ **Error Details**: Specific error messages
- ✅ **Warning System**: Non-blocking warnings
- ✅ **Progress Tracking**: Show import progress
- ✅ **Correction Assistant**: Automatic error fixing suggestions

#### **After Upload:**

- ✅ **Success Confirmation**: Clear success message
- ✅ **Batch ID**: Reference for tracking
- ✅ **Rollback Option**: Easy rollback process
- ✅ **Audit Trail**: Complete history

### **2. Data Integrity Safeguards**

#### **Database Constraints:**

```sql
-- Prevent invalid data
ALTER TABLE GIFT_DETAILS
ADD CONSTRAINT chk_cost_positive CHECK (COST_BASE > 0),
ADD CONSTRAINT chk_currency_valid CHECK (CURRENCY IN ('MYR', 'VND', 'USD', 'GBP')),
ADD CONSTRAINT chk_status_valid CHECK (WORKFLOW_STATUS IN ('KAM_Request', 'MKTOps_Processing', 'KAM_Proof', 'SalesOps_Audit')),
ADD CONSTRAINT chk_category_valid CHECK (CATEGORY IN ('Birthday Gift', 'Offline Campaign', 'Online Campaign', 'Festival Gift', 'Leaderboard', 'Loyalty Gift', 'Rewards Club', 'Others')),
ADD CONSTRAINT chk_reward_name_valid CHECK (REWARD_NAME IN ('Luxury Gifts', 'Electronics', 'Fashion & Accessories', 'Food & Beverages', 'Travel & Experiences', 'Gaming & Entertainment', 'Sports & Fitness', 'Beauty & Wellness', 'Home & Lifestyle', 'Digital Services', 'Gift Cards', 'Others'));
```

#### **Business Rules:**

- ✅ **Cost Limits**: Maximum gift values
- ✅ **Status Transitions**: Valid workflow progression
- ✅ **Duplicate Prevention**: Unique gift IDs
- ✅ **Date Validation**: Valid request dates
- ✅ **Member Validation**: Must exist in member database
- ✅ **Merchant & Currency Match**: Must match member's actual data

### **3. Performance Safeguards**

#### **Batch Size Limits:**

- ✅ **Maximum Rows**: Prevent accidental large uploads
- ✅ **Memory Management**: Process in chunks
- ✅ **Timeout Protection**: Prevent hanging operations
- ✅ **Resource Monitoring**: Track database load
- ✅ **Member Profile Caching**: Fast member validation

## 📊 **Monitoring and Analytics**

### **Batch Analytics:**

```sql
-- Success rate by user
SELECT UPLOADED_BY,
       COUNT(*) as total_batches,
       AVG(CASE WHEN STATUS = 'COMPLETED' THEN 1 ELSE 0 END) as success_rate
FROM BULK_IMPORT_BATCHES
GROUP BY UPLOADED_BY;

-- Rollback frequency
SELECT TAB,
       COUNT(*) as total_imports,
       COUNT(CASE WHEN STATUS = 'ROLLED_BACK' THEN 1 END) as rollbacks
FROM BULK_IMPORT_BATCHES
GROUP BY TAB;

-- Member validation success rate
SELECT 
    COUNT(*) as total_attempts,
    COUNT(CASE WHEN MEMBER_VALIDATION_STATUS = 'SUCCESS' THEN 1 END) as successful_validations,
    AVG(CASE WHEN MEMBER_VALIDATION_STATUS = 'SUCCESS' THEN 1 ELSE 0 END) as validation_success_rate
FROM BULK_IMPORT_LOGS
WHERE MODULE = 'gift-approval' AND TAB = 'pending';
```

### **Error Tracking:**

- ✅ **Error Patterns**: Identify common mistakes
- ✅ **User Analytics**: Track user behavior
- ✅ **Performance Metrics**: Monitor system health
- ✅ **Alert System**: Notify on unusual activity
- ✅ **Correction Analytics**: Track correction success rates

## 🔄 **Recovery Procedures**

### **1. Immediate Rollback**

```bash
# Rollback by batch ID (soft delete - sets BATCH_ID = NULL)
curl -X POST /api/gift-approval/bulk-rollback \
  -H "Content-Type: application/json" \
  -d '{"batchId": "BATCH_123", "rollbackReason": "Wrong data"}'
```

### **2. Data Recovery**

```sql
-- Find affected records (including rolled back ones)
SELECT * FROM MY_FLOW.PUBLIC.GIFT_DETAILS WHERE BATCH_ID = 'BATCH_123';

-- Check batch status
SELECT * FROM MY_FLOW.PUBLIC.BULK_IMPORT_BATCHES WHERE BATCH_ID = 'BATCH_123';

-- Find member validation issues
SELECT * FROM MY_FLOW.MART.ALL_MEMBER_PROFILE 
WHERE MEMBER_LOGIN IN ('vipuser1', 'vipuser2');
```

### **3. Manual Corrections**

```sql
-- Update specific records
UPDATE MY_FLOW.PUBLIC.GIFT_DETAILS
SET COST_BASE = 1000, CATEGORY = 'Birthday Gift'
WHERE GIFT_ID = 123 AND BATCH_ID = 'BATCH_123';

-- Fix member data if needed
UPDATE MY_FLOW.MART.ALL_MEMBER_PROFILE
SET MERCHANT_NAME = 'Beta', CURRENCY = 'MYR'
WHERE MEMBER_LOGIN = 'vipuser1';
```

## 🎯 **Best Practices**

### **For Users:**

1. **Always download and use templates** with new field structure
2. **Preview data before import** using validation preview
3. **Use correction assistant** for automatic error fixing
4. **Keep batch IDs for reference** and rollback purposes
5. **Test with small datasets first** before large imports
6. **Verify member data** matches merchant and currency
7. **Check permissions** for merchant and currency access

### **For Administrators:**

1. **Monitor batch success rates** and correction usage
2. **Set appropriate batch size limits** for your system
3. **Regular backup before large imports** to prevent data loss
4. **Train users on proper procedures** including correction assistant
5. **Maintain audit trails** for compliance and troubleshooting
6. **Monitor member profile data** for accuracy

### **For Developers:**

1. **Always use transactions** for data integrity
2. **Implement comprehensive logging** for debugging
3. **Provide clear error messages** with actionable suggestions
4. **Test rollback procedures** regularly
5. **Monitor system performance** during bulk operations
6. **Cache member profiles** for fast validation
7. **Implement correction suggestions** for better UX

## 🚀 **Future Enhancements**

### **Planned Features:**

- 🔄 **Scheduled Rollbacks**: Automatic rollback after time period
- 📧 **Email Notifications**: Alert on large imports
- 🔍 **Advanced Analytics**: Machine learning for error prediction
- 🔐 **Approval Workflows**: Multi-step approval for large batches
- 📱 **Mobile Notifications**: Real-time status updates
- 🤖 **AI-Powered Corrections**: Machine learning for better suggestions
- 📊 **Predictive Validation**: Pre-validate data before upload
- 🔗 **External System Integration**: Import from external databases

---

## 📞 **Support**

For questions or issues with bulk upload safeguards:

- **Technical Issues**: Check logs in `BULK_IMPORT_LOGS`
- **Data Recovery**: Use batch ID to identify affected records
- **Rollback Help**: Follow rollback procedures in this guide
- **Member Validation**: Check `ALL_MEMBER_PROFILE` table
- **Correction Assistant**: Use automatic error fixing features
- **Emergency**: Contact system administrator for immediate assistance
