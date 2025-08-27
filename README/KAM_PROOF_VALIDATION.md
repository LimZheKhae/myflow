# KAM Proof Validation Requirements

## 🔍 **Overview**

When proceeding from the **Processing** tab to the **KAM Proof** stage, the system validates that all required fields are properly filled before allowing the workflow progression.

## ✅ **Validation Requirements**

### **Required Fields for "Proceed to KAM Proof"**

1. **Dispatcher** (`DISPATCHER`)

   - Must not be null or empty
   - Example: "DHL", "FedEx", "UPS"

2. **Tracking Code** (`TRACKING_CODE`)

   - Must not be null or empty
   - Example: "DHL123456789", "FDX987654321"

3. **Tracking Status** (`TRACKING_STATUS`)

   - Must be exactly "Delivered"
   - Other statuses like "In Transit", "Failed" are not allowed

4. **Uploaded BO** (`UPLOADED_BO`)
   - Must be exactly `true`
   - `false` or `null` values are not allowed

## 🛠️ **Implementation**

### **1. Single Gift Update (`/api/gift-approval/update`)**

```typescript
// Validation function for processing requirements
async function validateProcessingRequirements(giftId: number): Promise<{ isValid: boolean; message: string }> {
  const result = await executeQuery(
    `SELECT DISPATCHER, TRACKING_CODE, TRACKING_STATUS, UPLOADED_BO 
     FROM MY_FLOW.PUBLIC.GIFT_DETAILS 
     WHERE GIFT_ID = ?`,
    [giftId]
  )

  const gift = result[0]
  const missingFields: string[] = []

  // Check required fields
  if (!gift.DISPATCHER || gift.DISPATCHER.trim() === '') {
    missingFields.push('Dispatcher')
  }

  if (!gift.TRACKING_CODE || gift.TRACKING_CODE.trim() === '') {
    missingFields.push('Tracking Code')
  }

  if (!gift.TRACKING_STATUS || gift.TRACKING_STATUS.trim() === '') {
    missingFields.push('Tracking Status')
  } else if (gift.TRACKING_STATUS !== 'Delivered') {
    return {
      isValid: false,
      message: 'Tracking Status must be "Delivered" to proceed to KAM Proof',
    }
  }

  if (gift.UPLOADED_BO !== true) {
    missingFields.push('Uploaded BO (must be true)')
  }

  if (missingFields.length > 0) {
    return {
      isValid: false,
      message: `Missing required fields: ${missingFields.join(', ')}`,
    }
  }

  return { isValid: true, message: 'Processing requirements validation passed' }
}
```

### **2. Bulk Actions (`/api/gift-approval/bulk-actions`)**

```typescript
case 'bulk_proceed_to_kam_proof':
  // Validate required fields for all selected gifts
  const validationSQL = `
    SELECT GIFT_ID, DISPATCHER, TRACKING_CODE, TRACKING_STATUS, UPLOADED_BO
    FROM MY_FLOW.PUBLIC.GIFT_DETAILS
    WHERE GIFT_ID IN (${giftIds.map(() => '?').join(',')})
  `
  const validationResult = await executeQuery(validationSQL, giftIds)

  const invalidGifts = validationResult.filter((gift) =>
    !gift.DISPATCHER ||
    !gift.TRACKING_CODE ||
    gift.TRACKING_STATUS !== 'Delivered' ||
    gift.UPLOADED_BO !== true
  )

  if (invalidGifts.length > 0) {
    const invalidDetails = invalidGifts.map((gift) => ({
      giftId: gift.GIFT_ID,
      issues: [
        !gift.DISPATCHER ? 'Missing DISPATCHER' : null,
        !gift.TRACKING_CODE ? 'Missing TRACKING_CODE' : null,
        gift.TRACKING_STATUS !== 'Delivered' ?
          `TRACKING_STATUS must be 'Delivered' (current: ${gift.TRACKING_STATUS})` : null,
        gift.UPLOADED_BO !== true ? 'UPLOADED_BO must be TRUE' : null
      ].filter(Boolean),
    }))

    return NextResponse.json({
      success: false,
      message: `${invalidGifts.length} gift(s) do not meet requirements for proceeding to KAM Proof`,
      invalidGifts: invalidDetails,
    }, { status: 400 })
  }
```

## 📋 **Error Messages**

### **Single Gift Validation Errors**

- `"Missing required fields: Dispatcher, Tracking Code"`
- `"Tracking Status must be "Delivered" to proceed to KAM Proof"`
- `"Missing required fields: Uploaded BO (must be true)"`

### **Bulk Action Validation Errors**

- `"3 gift(s) do not meet requirements for proceeding to KAM Proof"`
- Detailed breakdown of which gifts failed and why:
  ```json
  {
    "invalidGifts": [
      {
        "giftId": 123,
        "issues": ["Missing DISPATCHER", "TRACKING_STATUS must be 'Delivered' (current: In Transit)"]
      }
    ]
  }
  ```

## 🔄 **Workflow Integration**

### **Processing Tab Actions**

1. **Update MKTOps Info** - Fill in dispatcher, tracking code, tracking status
2. **Set BO Uploaded** - Toggle UPLOADED_BO to true
3. **Proceed to KAM Proof** - Validates all requirements before proceeding

### **Validation Flow**

```
Processing Tab
    ↓
User clicks "Proceed to KAM Proof"
    ↓
System validates:
    - Dispatcher ✓
    - Tracking Code ✓
    - Tracking Status = "Delivered" ✓
    - Uploaded BO = true ✓
    ↓
If validation passes → Move to KAM Proof tab
If validation fails → Show error message with details
```

## 🎯 **User Experience**

### **Frontend Validation**

- Real-time validation as users fill in fields
- Clear error messages indicating what's missing
- Disabled "Proceed" button until all requirements are met

### **Backend Validation**

- Server-side validation ensures data integrity
- Detailed error responses for debugging
- Bulk action support with partial success handling

## 📊 **Database Schema**

### **Relevant Fields in GIFT_DETAILS**

```sql
DISPATCHER VARCHAR(16777216),        -- Courier company (DHL, FedEx, etc.)
TRACKING_CODE VARCHAR(16777216),     -- Tracking number
TRACKING_STATUS VARCHAR(16777216),   -- Delivery status (Delivered, In Transit, Failed)
UPLOADED_BO BOOLEAN,                 -- BO proof uploaded status
```

### **Validation Rules**

- `DISPATCHER`: NOT NULL, NOT EMPTY
- `TRACKING_CODE`: NOT NULL, NOT EMPTY
- `TRACKING_STATUS`: MUST BE "Delivered"
- `UPLOADED_BO`: MUST BE TRUE

## 🚀 **Best Practices**

### **For Users**

1. Always fill in dispatcher and tracking code when updating MKTOps info
2. Set tracking status to "Delivered" only when delivery is confirmed
3. Upload BO proof before attempting to proceed to KAM Proof
4. Use bulk actions for multiple gifts with same requirements

### **For Developers**

1. Always validate on both frontend and backend
2. Provide clear, actionable error messages
3. Log validation failures for debugging
4. Support partial success in bulk operations

## 🔍 **Troubleshooting**

### **Common Issues**

1. **"Missing DISPATCHER"** - Update MKTOps info with courier company
2. **"Missing TRACKING_CODE"** - Add tracking number in MKTOps update
3. **"TRACKING_STATUS must be 'Delivered'"** - Change status to "Delivered" when confirmed
4. **"UPLOADED_BO must be TRUE"** - Toggle BO uploaded status to true

### **Debug Queries**

```sql
-- Check gift status
SELECT GIFT_ID, DISPATCHER, TRACKING_CODE, TRACKING_STATUS, UPLOADED_BO
FROM MY_FLOW.PUBLIC.GIFT_DETAILS
WHERE GIFT_ID = 123;

-- Find gifts ready for KAM Proof
SELECT GIFT_ID, DISPATCHER, TRACKING_CODE, TRACKING_STATUS, UPLOADED_BO
FROM MY_FLOW.PUBLIC.GIFT_DETAILS
WHERE WORKFLOW_STATUS = 'MKTOps_Processing'
  AND DISPATCHER IS NOT NULL
  AND TRACKING_CODE IS NOT NULL
  AND TRACKING_STATUS = 'Delivered'
  AND UPLOADED_BO = TRUE;
```
