Got it ✅ Here’s your **Gift Module Implementation Prompt** written in clean **Markdown**:

````markdown
# 🎯 Gift Module Implementation Prompt

---

## 1. General UX
- Every **submission** or **API trigger** (approve, reject, update, import, etc.) must display a **loading animation** until the API responds.  
- The animation can be **modal-based** or **inline**, but it must:
  - Block duplicate actions while pending.  
  - Clearly indicate progress state to the user.  

---

## 2. Bulk Actions

### Export as CSV

**CSV Columns**:  
Date, PIC, Member Login, Full Name, HP Number, Address, Reward Name, Gift Cost (MYR), Cost (VND), Remark, Reward Club Order, Category, Dispatcher, Tracking Code, Status, Uploaded BO, MKTOps Proof, KAM Proof, Checker Name, Checked Date, Remark  

**Format Rules**:
- **Date** → `CREATED DATE` in `MM/DD/YYYY` format  
- **PIC** → `KAM_REQUESTED_BY`  
- **Status** → `TRACKING_STATUS`  
- **Uploaded BO** → Yes/No  
- **Checked Date** → `AUDIT_DATE` formatted as `DD Month` (e.g., `25 July`)  
- **Null values** → leave blank  

---

### Bulk Import (Insert into DB)

**Template Fix**:
- Add `costVnd`.  

**Validation**:
- Trim leading/trailing spaces.  
- `memberLogin` → must exist in VIP list (for **Pending** stage).  
- `giftItem` → required.  
- `cost`, `costVnd` → optional, must be **numeric** or **null**, positive only.  

---

### Bulk Update

#### Processing Stage
**Template**:  
`giftId, giftItem, cost, memberLogin, Dispatcher, trackingCode, Status, uploadedBo (Yes/No)`  

**Business Rules**:
- `giftItem`, `cost`, `memberLogin` → not updatable (display-only for verification).  
- `giftId` must exist.  
- `dispatcher`, `trackingCode` → required.  
- `status` → optional, values limited to `{Pending, In Transit, Delivered, Failed}`.  
- If `status` is null → system provides **auto-fill all nulls** with a chosen value.  
- `uploadedBo` → optional.  
  - If null → system auto-fills all as **No**.  

**Workflow Advance Option**:
- User may choose to **auto-update all records’ `WORKFLOW_STATUS` → KAM_Proof**.  
- Validation: if **move to next phase** is selected → ensure all rows have a valid status.  

---

#### KAM Proof Stage
**Template**:  
`giftId, giftItem, cost, memberLogin, receiverFeedback`  

**Rules**:
- `giftId` must exist.  
- `receiverFeedback` → optional.  
  - If null → system provides **bulk auto-fill options**.  

**Options**:
- Advance workflow → **Audit**.  
- Or remain in **KAM Proof** status.  

---

#### Audit Stage
**Template**:  
`giftId, giftItem, memberLogin, remark`  

**Rules**:
- `giftId` must exist.  
- `remark` → required.  
  - If null → system provides **bulk auto-fill options**.  

---

## 3. Logging

Every action trigger must:  
- Store event in **Firebase** under `activity_logs`.  
- Insert corresponding record in **Snowflake** table:  

```sql
TABLE MY_FLOW.PUBLIC.GIFT_WORKFLOW_TIMELINE (
  ID NUMBER(38,0) NOT NULL AUTOINCREMENT START 100 INCREMENT 1 ORDER,
  GIFT_ID NUMBER(38,0),
  FROM_STATUS VARCHAR,
  TO_STATUS VARCHAR,
  CHANGED_BY NUMBER(38,0),
  CHANGED_AT TIMESTAMP_NTZ(9),
  REMARK VARCHAR,
  PRIMARY KEY (ID)
);
````

---

## 4. Next Tasks

* Implement **Email notification system**.
* Implement **In-app notification system**.

---

⚡ **Key Clarification**:

* **Auto fill feature** = system bulk replacement for null values.
