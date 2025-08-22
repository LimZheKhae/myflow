# Bulk Action Rules for GIFT Workflow System

This document describes the bulk action functionalities available in the system across different workflow tabs.  
Each bulk action records the `userId` of the person performing the action and updates the relevant audit fields.  
The `LAST_MODIFIED_DATE` is updated for every action.

---

## Pending Tab

### 1. Bulk Approve
- Updates selected gifts’ `WORKFLOW_STATUS` → `Manager_Review`
- Records approver’s `userId` in `APPROVAL_REVIEWED_BY`
- Updates `LAST_MODIFIED_DATE`

### 2. Bulk Reject
- Popup modal asks for **Reject Reason** (applies to all selected gifts).  
- Updates:
  - `WORKFLOW_STATUS` → `Rejected`
  - `REJECT_REASON` → modal input
  - `APPROVAL_REVIEWED_BY` → current `userId`
  - `LAST_MODIFIED_DATE`

---

## Processing Tab

### 1. Bulk Reject
- Same as Pending Tab Bulk Reject.
- Updates:
  - `WORKFLOW_STATUS` → `Rejected`
  - `PURCHASED_BY` → current `userId`

### 2. Bulk UploadedBO True
- Updates all selected gifts’ `UPLOADED_BO` → `TRUE`.

### 3. Bulk Proceed
**Validation:**
- Each selected gift must have:
  - `DISPATCHER` not null  
  - `TRACKING_CODE` not null  
  - `TRACKING_STATUS` = `Completed`  
  - `UPLOADED_BO` = `TRUE`

**If validation fails:**
- Popup highlights invalid rows.  
- User can choose to skip invalid gifts.  

**Valid gifts update:**
- `WORKFLOW_STATUS` → `KAM_Proof`
- `PURCHASED_BY` → current `userId`
- `LAST_MODIFIED_DATE`

---

## KAM Proof Tab

### 1. Bulk Fill Feedback
- Popup modal asks for **Receiver Feedback** (applies to all selected gifts).  
- Updates:
  - `GIFT_FEEDBACK` → modal input
  - `KAM_PROOF_BY` → current `userId`
  - `LAST_MODIFIED_DATE`

- Modal has two buttons:
  - **Save Feedback only**
  - **Proceed to Audit** → also update `WORKFLOW_STATUS` → `SalesOps_Audit`

### 2. Bulk Proceed
- Directly updates:
  - `WORKFLOW_STATUS` → `SalesOps_Audit`
  - `KAM_PROOF_BY` → current `userId`
  - `LAST_MODIFIED_DATE`

---

## Audit Tab

### 1. Bulk Mark as Completed
**Validation:**
- If any selected gift has `AUDIT_REMARK = NULL`, popup asks for remark.  
- Remark applies to all selected gifts.  

**Updates:**
- `WORKFLOW_STATUS` → `Completed`
- `AUDIT_REMARK` → modal input (if provided)
- `AUDITED_BY` → current `userId`
- `LAST_MODIFIED_DATE`

### 2. Bulk Mark as Issue
- Popup modal asks for remark (if `AUDIT_REMARK = NULL`).  
- Updates:
  - `WORKFLOW_STATUS` → `KAM_Proof`
  - `AUDIT_REMARK` → modal input (if provided)
  - `AUDITED_BY` → current `userId`
  - `LAST_MODIFIED_DATE`

---

## ✅ Summary
This way, every bulk action has:
- **Status transition**
- **User who performed it**
- **Timestamp**
- **Optional remark/reason field when required**
