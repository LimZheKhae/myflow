# 🛡️ Bulk Upload Database Safeguards Guide

## Overview

This document outlines the comprehensive database-side safeguards implemented to prevent human mistakes and provide rollback capabilities for bulk upload operations.

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
ALTER TABLE MY_FLOW.PUBLIC.GIFT_REQUESTS
ADD COLUMN BATCH_ID VARCHAR(50);
```

### **2. Transaction Management**

#### **Database Transactions:**

- **BEGIN TRANSACTION**: Start atomic operation
- **COMMIT**: Save all changes if successful
- **ROLLBACK**: Undo all changes if any error occurs

#### **Benefits:**

- ✅ **Data Consistency**: No partial updates
- ✅ **Automatic Rollback**: Failed imports don't corrupt data
- ✅ **Isolation**: Other operations aren't affected

### **3. Comprehensive Logging System**

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

### **4. Validation Layers**

#### **Frontend Validation:**

- ✅ **CSV Format Validation**: Ensures proper file structure
- ✅ **Field Validation**: Required fields, data types, formats
- ✅ **Business Logic**: Cost limits, duplicate checks
- ✅ **Preview Mode**: Show data before import

#### **Backend Validation:**

- ✅ **Database Constraints**: Foreign keys, unique constraints
- ✅ **Data Type Validation**: Ensure proper data types
- ✅ **Business Rules**: Cost limits, status transitions
- ✅ **Duplicate Prevention**: Check for existing records

### **5. Rollback Mechanisms**

#### **Two Rollback Types:**

1. **Transaction-Based Rollback**

   - Use `transactionId` to rollback
   - Automatically finds associated batch

2. **Batch-Based Rollback**
   - Use `batchId` directly
   - More precise control

#### **Rollback Process:**

```sql
-- For pending gifts: DELETE records
DELETE FROM GIFT_REQUESTS WHERE BATCH_ID = 'BATCH_123';

-- For updates: REVERT to previous state
UPDATE GIFT_REQUESTS
SET WORKFLOW_STATUS = 'KAM_Request', BATCH_ID = NULL
WHERE BATCH_ID = 'BATCH_123';
```

## 🔧 **Implementation Details**

### **Two Validation Approaches:**

#### **Approach 1: Pre-Validation (Current Implementation)**

```typescript
// Frontend validates ALL data before sending to backend
const validation = validateCSV(csvData);
if (!validation.isValid) {
  // Show errors, don't proceed to import
  return { success: false, errors: validation.errors };
}

// Only valid data reaches backend
await importValidatedData(validation.data);
```

**Benefits:**

- ✅ **Atomic operations** - all succeed or all fail
- ✅ **No partial imports** - prevents data corruption
- ✅ **Better user experience** - clear feedback before import
- ✅ **Reduced database load** - no failed transaction attempts

#### **Approach 2: Attempt Import (Alternative)**

```typescript
// Send all data to backend, handle failures individually
const result = await attemptImport(csvData);
// Returns: { success: true, importedCount: 8, failedCount: 2, failedRows: [...] }
```

**Benefits:**

- ✅ **Partial success** - some rows succeed even if others fail
- ✅ **More flexible** - handles mixed valid/invalid data
- ✅ **Real-time feedback** - shows exactly what succeeded/failed

### **Enhanced Bulk Upload Flow:**

1. **Pre-Upload Validation**

   ```typescript
   // Validate CSV structure and data
   const validation = validateCSV(csvData);
   if (!validation.isValid) {
     return { success: false, errors: validation.errors };
   }
   ```

2. **Batch Creation**

   ```typescript
   // Create batch record before import
   const batchId = `BATCH_${Date.now()}_${randomString}`;
   await createBatchRecord(batchId, transactionId, data.length);
   ```

3. **Atomic Import**

   ```typescript
   // Use database transaction
   await executeQuery("BEGIN TRANSACTION");
   try {
     // Import all records with batch ID
     await importRecords(data, batchId);
     await executeQuery("COMMIT");
   } catch (error) {
     await executeQuery("ROLLBACK");
     throw error;
   }
   ```

4. **Post-Import Logging**
   ```typescript
   // Update batch with results
   await updateBatchStatus(batchId, "COMPLETED", importedCount);
   ```

### **Rollback Process:**

1. **Identify Batch**

   ```typescript
   // Find batch by transaction ID or batch ID
   const batch = await getBatchDetails(batchId);
   ```

2. **Execute Rollback**

   ```typescript
   // Rollback based on tab type
   switch (batch.tab) {
     case "pending":
       await deleteBatchRecords(batchId);
       break;
     case "processing":
       await revertToPreviousState(batchId);
       break;
   }
   ```

3. **Update Logs**
   ```typescript
   // Mark batch as rolled back
   await updateBatchStatus(batchId, "ROLLED_BACK", rolledBackCount);
   ```

## 🚨 **Error Prevention Strategies**

### **1. Human Error Prevention**

#### **Before Upload:**

- ✅ **Template Downloads**: Provide correct CSV templates
- ✅ **Validation Preview**: Show data before import
- ✅ **Field Descriptions**: Clear field requirements
- ✅ **Sample Data**: Example of correct format

#### **During Upload:**

- ✅ **Real-time Validation**: Immediate feedback
- ✅ **Error Details**: Specific error messages
- ✅ **Warning System**: Non-blocking warnings
- ✅ **Progress Tracking**: Show import progress

#### **After Upload:**

- ✅ **Success Confirmation**: Clear success message
- ✅ **Transaction ID**: Reference for tracking
- ✅ **Rollback Option**: Easy rollback process
- ✅ **Audit Trail**: Complete history

### **2. Data Integrity Safeguards**

#### **Database Constraints:**

```sql
-- Prevent invalid data
ALTER TABLE GIFT_REQUESTS
ADD CONSTRAINT chk_cost_positive CHECK (COST > 0),
ADD CONSTRAINT chk_currency_valid CHECK (CURRENCY IN ('MYR', 'VND', 'USD', 'GBP')),
ADD CONSTRAINT chk_status_valid CHECK (WORKFLOW_STATUS IN ('KAM_Request', 'MKTOps_Processing', 'KAM_Proof', 'SalesOps_Audit'));
```

#### **Business Rules:**

- ✅ **Cost Limits**: Maximum gift values
- ✅ **Status Transitions**: Valid workflow progression
- ✅ **Duplicate Prevention**: Unique gift IDs
- ✅ **Date Validation**: Valid request dates

### **3. Performance Safeguards**

#### **Batch Size Limits:**

- ✅ **Maximum Rows**: Prevent accidental large uploads
- ✅ **Memory Management**: Process in chunks
- ✅ **Timeout Protection**: Prevent hanging operations
- ✅ **Resource Monitoring**: Track database load

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
```

### **Error Tracking:**

- ✅ **Error Patterns**: Identify common mistakes
- ✅ **User Analytics**: Track user behavior
- ✅ **Performance Metrics**: Monitor system health
- ✅ **Alert System**: Notify on unusual activity

## 🔄 **Recovery Procedures**

### **1. Immediate Rollback**

```bash
# Rollback by batch ID
curl -X POST /api/gift-approval/bulk-rollback \
  -H "Content-Type: application/json" \
  -d '{"batchId": "BATCH_123", "rollbackReason": "Wrong data"}'
```

### **2. Data Recovery**

```sql
-- Find affected records
SELECT * FROM GIFT_REQUESTS WHERE BATCH_ID = 'BATCH_123';

-- Check rollback history
SELECT * FROM BULK_ROLLBACK_LOGS WHERE BATCH_ID = 'BATCH_123';
```

### **3. Manual Corrections**

```sql
-- Update specific records
UPDATE GIFT_REQUESTS
SET COST = 1000, CURRENCY = 'MYR'
WHERE ID = 'GFT_123' AND BATCH_ID = 'BATCH_123';
```

## 🎯 **Best Practices**

### **For Users:**

1. **Always download and use templates**
2. **Preview data before import**
3. **Keep transaction IDs for reference**
4. **Test with small datasets first**
5. **Verify data after import**

### **For Administrators:**

1. **Monitor batch success rates**
2. **Set appropriate batch size limits**
3. **Regular backup before large imports**
4. **Train users on proper procedures**
5. **Maintain audit trails**

### **For Developers:**

1. **Always use transactions**
2. **Implement comprehensive logging**
3. **Provide clear error messages**
4. **Test rollback procedures**
5. **Monitor system performance**

## 🚀 **Future Enhancements**

### **Planned Features:**

- 🔄 **Scheduled Rollbacks**: Automatic rollback after time period
- 📧 **Email Notifications**: Alert on large imports
- 🔍 **Advanced Analytics**: Machine learning for error prediction
- 🔐 **Approval Workflows**: Multi-step approval for large batches
- 📱 **Mobile Notifications**: Real-time status updates

---

## 📞 **Support**

For questions or issues with bulk upload safeguards:

- **Technical Issues**: Check logs in `BULK_IMPORT_LOGS`
- **Data Recovery**: Use batch ID to identify affected records
- **Rollback Help**: Follow rollback procedures in this guide
- **Emergency**: Contact system administrator for immediate assistance
