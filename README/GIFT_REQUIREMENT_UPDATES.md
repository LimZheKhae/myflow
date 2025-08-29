# Gift Management System – Requirement Draft & Database Changes

## 1. Gift Approval & Access Control

- **UBAC (User-Based Access Control)** must be applied in Gift Requests:
  - Users can only view and interact with gifts that match their permitted **merchants** and **currencies**.

- **Search & Filters**
  - Search by Date  
  - Filter by Merchant  
  - Filter by Currency  
  - All filters must respect **RBAC/UBAC** permissions  

---

## 2. Database Changes

### `MY_FLOW.PUBLIC.GIFT_DETAILS`
- **Added Column**
  - `MKT_DELIVERED_DATE` → Stores the timeline when MKTOps updates delivery status to *Delivered*.  

- **Renamed Columns**
  - `COST_BASE` → `GIFT_COST` (all costs are inserted here; currency column differentiates).  
  - `REMARK` → `DESCRIPTION`.  

- **Removed Columns**
  - `COST_LOCAL`  

---

### `MY_FLOW.MART.ALL_MEMBER_PROFILE`
- **Added Column**
  - `MERCHANT_NAME` →  
    - Used for global member profile listing.  
    - System should first attempt to fill out merchant from available input.  
    - When user keys in `memberlogin`, dropdown should only list members that belong to this merchant.

---

### `MY_FLOW.PRESENTATION.VIEW_GIFT_DETAILS`
- **Renamed Column**
  - `REMARK` → `DESCRIPTION`.  
  - `COST_BASE` → `GIFT_COST` (all costs are inserted here; currency column differentiates).  

- **Removed Columns**
  - `COST_LOCAL`  

---

### New View
- **`MY_FLOW.PRESENTATION.GIFT_MKTOPS_UPLOADBO`**
  - Purpose: For **email notification system**.  
  - Trigger: Runs on **26th of each month, 12:00 AM**.  
  - Action: Fetches data → Generates CSV → Sends to `EMAIL` role for **MKTOps** and **Admin**.  

---

## 3. Templates & Data Handling

- Every **template** (forms, bulk upload, bulk update) must include:
  - **Merchant** (non-editable)  
  - **Currency** (non-editable)  

- **Validation Rules**
  - Uploader must have permission to access the selected Merchant & Currency.  
  - System must verify if the Member exists within the selected Merchant before processing.  

---

## 4. Workflow Updates

- **KAM Proof**
  - Add **Rollback Action**:
    - Revert status back to *Processing*.  
    - Update Delivery Status to *Failed*.  

- **UploadedBo Validation**
  - Remove validation dependency on *UploadedBo* before moving to *KAM Proof*.  

---

## 5. Merchant-Specific Rules

- **Create Request**
  - Requires **Merchant selection (Dropdown)** before other fields become editable.  
  - Merchant dropdown only displays merchants the current user has permission for.  

- **Member Profile API**
  - Must always return **merchant & currency permissions** for the current user.  

---

## 6. Reference Data

### Currency Options
- MYR  
- SGD  
- IDR  
- KHUSD  
- VND  
- THB  
- PHP  
- INT  
- Tesla  
- Other  

### Merchant Options
- Beta  
- Seed  
- Maple  
- Alpha  
- Tesla  
- Other  