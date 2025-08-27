# 🎁 Gift Module UAT Test Plan

## 📋 **Test Plan Overview**

**Module:** Gift Approval System  
**Version:** 1.0  
**Test Type:** User Acceptance Testing (UAT)  
**Access Control:** RBAC (Role-Based Access Control) + UBAC (User-Based Access Control)  
**Test Environment:** Staging/Production-like environment  

---

## 🎯 **Test Objectives**

1. **Verify RBAC Access Controls** - Test role-based permissions across all user roles
2. **Validate UBAC Workflow** - Test user-specific access and ownership restrictions
3. **Test Gift Request Workflow** - End-to-end gift approval process
4. **Validate Bulk Operations** - Test bulk actions with proper permissions
5. **Verify Notification System** - Test email and in-app notifications for rejections
6. **Test Search Functionality** - Verify search by player name, member login, and gift item PIC

---

## 👥 **Test User Roles & Permissions Matrix**

| Role | Gift Module Permissions | Data Access | Workflow Actions |
|------|------------------------|-------------|------------------|
| **ADMIN** | VIEW, SEARCH, EDIT, ADD, DELETE, IMPORT, EXPORT | FULL | All actions |
| **MANAGER** | VIEW, SEARCH, EDIT, IMPORT, EXPORT | READ_ONLY (approval history, financial) | Approve/Reject, Process |
| **KAM** | VIEW, SEARCH, ADD, IMPORT | FULL (own requests), READ_ONLY (approval history) | Create requests, Upload proof |
| **PROCUREMENT** | VIEW, SEARCH, EDIT | FULL (procurement data) | Update tracking, Process |
| **AUDIT** | VIEW, SEARCH, EDIT, EXPORT | READ_ONLY | View and edit in Audit tab |

---

## 🧪 **Test Scenarios**

### **1. RBAC Access Control Testing**

#### **1.1 Module Access Testing**
**Objective:** Verify users can only access modules they have permission for

| Test Case | Role | Expected Result | Status |
|-----------|------|-----------------|--------|
| TC-001 | ADMIN | Can access all gift module features | ⬜ |
| TC-002 | KAM | Can view, search, add gift requests | ⬜ |
| TC-003 | AUDIT | Can view and edit in Audit tab, no add | ⬜ |
| TC-004 | No permissions | Access denied page shown | ⬜ |

**Test Steps:**
1. Login with each role
2. Navigate to `/gift-approval`
3. Verify UI elements match permissions
4. Test direct URL access without permissions

#### **1.2 Permission-Based UI Testing**
**Objective:** Verify UI elements are shown/hidden based on permissions

| Test Case | Role | UI Elements | Expected Result | Status |
|-----------|------|-------------|-----------------|--------|
| TC-005 | KAM | Add Gift button | ✅ Visible | ⬜ |
| TC-006 | KAM | Bulk Approve button | ❌ Hidden | ⬜ |
| TC-007 | MANAGER | Bulk Approve button | ✅ Visible | ⬜ |
| TC-008 | AUDIT | Edit buttons in Audit tab | ✅ Visible | ⬜ |

**Test Steps:**
1. Login with each role
2. Navigate to gift approval page
3. Check visibility of action buttons
4. Verify tab access based on permissions

### **2. UBAC Workflow Testing**

#### **2.1 Gift Request Creation (KAM Role)**
**Objective:** Test KAM users can create gift requests with proper restrictions

| Test Case | Description | Expected Result | Status |
|-----------|-------------|-----------------|--------|
| TC-009 | Create gift request | Success, status: KAM_Request | ⬜ |
| TC-010 | Create with invalid data | Validation error shown | ⬜ |

**Test Steps:**
1. Login as KAM user
2. Navigate to gift approval
3. Click "Add Gift Request"
4. Fill required fields (player name, gift type, amount, currency, merchant, reason)
5. Submit request
6. Verify request appears in "Pending" tab with "KAM_Request" status

#### **2.2 Gift Request Approval (MANAGER Role)**
**Objective:** Test MANAGER users can approve/reject gift requests

| Test Case | Description | Expected Result | Status |
|-----------|-------------|-----------------|--------|
| TC-011 | Approve single request | Status changes to "Manager_Review" | ⬜ |
| TC-012 | Reject single request | Status changes to "Rejected" | ⬜ |
| TC-013 | Bulk approve requests | All selected requests approved | ⬜ |
| TC-014 | Bulk reject with reason | All selected requests rejected with reason | ⬜ |

**Test Steps:**
1. Login as MANAGER user
2. Navigate to "Pending" tab
3. Select gift request(s)
4. Click "Approve" or "Reject"
5. If rejecting, provide reason
6. Verify status change and notification sent

#### **2.3 Processing Workflow (PROCUREMENT Role)**
**Objective:** Test PROCUREMENT users can process approved gifts

| Test Case | Description | Expected Result | Status |
|-----------|-------------|-----------------|--------|
| TC-015 | Process approved gift | Status changes to "Processing" | ⬜ |
| TC-016 | Update tracking info | Tracking details saved | ⬜ |
| TC-017 | Mark as delivered | Status changes to "Delivered" | ⬜ |
| TC-018 | Upload BO proof | BO status updated | ⬜ |

**Test Steps:**
1. Login as PROCUREMENT user
2. Navigate to "Processing" tab
3. Select approved gift request
4. Fill tracking information (dispatcher, tracking code)
5. Update status to "Processing"
6. Verify workflow progression

#### **2.4 KAM Proof Upload (KAM Role)**
**Objective:** Test KAM users can upload proof for delivered gifts

| Test Case | Description | Expected Result | Status |
|-----------|-------------|-----------------|--------|
| TC-019 | Upload KAM proof | Proof uploaded, status updated | ⬜ |
| TC-020 | Add receiver feedback | Feedback saved | ⬜ |
| TC-021 | Proceed to audit | Status changes to "Audit" | ⬜ |
| TC-022 | Upload invalid file | Error message shown | ⬜ |

**Test Steps:**
1. Login as KAM user (original request creator)
2. Navigate to "KAM Proof" tab
3. Select delivered gift request
4. Upload proof document
5. Add receiver feedback
6. Click "Proceed to Audit"

#### **2.5 Audit Completion (AUDIT Role)**
**Objective:** Test AUDIT users can complete the audit process

| Test Case | Description | Expected Result | Status |
|-----------|-------------|-----------------|--------|
| TC-023 | Mark as completed | Status changes to "Completed" | ⬜ |
| TC-024 | Mark as issue | Status changes to "Audit Issue" | ⬜ |
| TC-025 | Add audit remarks | Remarks saved | ⬜ |

**Test Steps:**
1. Login as AUDIT user
2. Navigate to "Audit" tab
3. Select gift request for audit
4. Review KAM proof and feedback
5. Add checker name and remarks
6. Mark as "Completed" or "Issue"

### **3. Bulk Operations Testing**

#### **3.1 Bulk Approval/Rejection**
**Objective:** Test bulk operations with proper permissions

| Test Case | Description | Expected Result | Status |
|-----------|-------------|-----------------|--------|
| TC-026 | Bulk approve (MANAGER) | All selected requests approved | ⬜ |
| TC-027 | Bulk reject with reason | All selected requests rejected | ⬜ |
| TC-028 | Bulk reject without reason | Error message shown | ⬜ |
| TC-029 | Bulk operations (KAM) | Access denied | ⬜ |

**Test Steps:**
1. Login as MANAGER user
2. Navigate to "Pending" tab
3. Select multiple gift requests
4. Choose bulk action (approve/reject)
5. If rejecting, provide reason
6. Verify all selected requests updated

#### **3.2 Bulk Processing**
**Objective:** Test bulk processing operations

| Test Case | Description | Expected Result | Status |
|-----------|-------------|-----------------|--------|
| TC-030 | Bulk process to KAM proof | All selected moved to KAM proof | ⬜ |
| TC-031 | Bulk upload BO proof | All selected BO status updated | ⬜ |
| TC-032 | Bulk mark completed | All selected marked completed | ⬜ |

### **4. Search Functionality Testing**

#### **4.1 Search by Player Name**
**Objective:** Test search functionality by player name

| Test Case | Description | Expected Result | Status |
|-----------|-------------|-----------------|--------|
| TC-033 | Search by exact player name | Returns matching gift requests | ⬜ |
| TC-034 | Search by partial player name | Returns partial matches | ⬜ |
| TC-035 | Search with no results | Shows "No results found" message | ⬜ |

**Test Steps:**
1. Navigate to gift approval page
2. Use search box to search by player name
3. Verify results match search criteria
4. Test with various search terms

#### **4.2 Search by Member Login**
**Objective:** Test search functionality by member login

| Test Case | Description | Expected Result | Status |
|-----------|-------------|-----------------|--------|
| TC-036 | Search by member login | Returns matching gift requests | ⬜ |
| TC-037 | Search by partial member login | Returns partial matches | ⬜ |

#### **4.3 Search by Gift Item PIC (KAM Name/Email)**
**Objective:** Test search functionality by KAM name or email

| Test Case | Description | Expected Result | Status |
|-----------|-------------|-----------------|--------|
| TC-038 | Search by KAM name | Returns gift requests by that KAM | ⬜ |
| TC-039 | Search by KAM email | Returns gift requests by that KAM | ⬜ |
| TC-040 | Search by partial KAM name | Returns partial matches | ⬜ |

### **5. Notification System Testing**

#### **5.1 Email Notifications (Reject Only)**
**Objective:** Test email notification system for rejections only

| Test Case | Description | Expected Result | Status |
|-----------|-------------|-----------------|--------|
| TC-041 | Gift request rejected | Email sent to KAM with reason | ⬜ |
| TC-042 | Bulk gift requests rejected | Email sent to KAM for each rejection | ⬜ |

**Test Steps:**
1. Perform rejection actions
2. Check email delivery
3. Verify email content includes rejection reason
4. Test email template formatting

#### **5.2 In-App Notifications (Reject Only)**
**Objective:** Test in-app notification system for rejections only

| Test Case | Description | Expected Result | Status |
|-----------|-------------|-----------------|--------|
| TC-043 | Notification bell shows rejection count | Correct notification count | ⬜ |
| TC-044 | Click rejection notification | Navigate to relevant gift request | ⬜ |
| TC-045 | Mark rejection notification as read | Count decreases | ⬜ |
| TC-046 | Real-time rejection notifications | Notifications appear immediately | ⬜ |

### **6. Error Handling & Validation Testing**

#### **6.1 Form Validation**
**Objective:** Test form validation and error handling

| Test Case | Description | Expected Result | Status |
|-----------|-------------|-----------------|--------|
| TC-047 | Empty required fields | Validation error shown | ⬜ |
| TC-048 | Invalid amount format | Error message displayed | ⬜ |
| TC-049 | Invalid email format | Error message displayed | ⬜ |
| TC-050 | File size too large | Upload error shown | ⬜ |

#### **6.2 Permission Errors**
**Objective:** Test permission-based error handling

| Test Case | Description | Expected Result | Status |
|-----------|-------------|-----------------|--------|
| TC-051 | Unauthorized action | Access denied message | ⬜ |
| TC-052 | Invalid status transition | Error message shown | ⬜ |
| TC-053 | Network error | Graceful error handling | ⬜ |

### **7. Performance & Load Testing**

#### **7.1 Large Dataset Handling**
**Objective:** Test performance with large datasets

| Test Case | Description | Expected Result | Status |
|-----------|-------------|-----------------|--------|
| TC-054 | 1000+ gift requests | Page loads within 3 seconds | ⬜ |
| TC-055 | Bulk operations on 100+ items | Operation completes within 10 seconds | ⬜ |
| TC-056 | Search functionality | Search results within 2 seconds | ⬜ |

---

## 📈 **Success Criteria**

### **Functional Requirements**
- [ ] All RBAC permissions working correctly
- [ ] All UBAC workflow restrictions enforced
- [ ] Gift request workflow completes end-to-end
- [ ] Bulk operations function properly
- [ ] Rejection notifications sent to correct recipients
- [ ] Search functionality works for player name, member login, and KAM name/email

### **Non-Functional Requirements**
- [ ] Page load times < 3 seconds
- [ ] Bulk operations complete < 10 seconds
- [ ] No JavaScript errors in console
- [ ] Responsive design works on mobile
- [ ] Accessibility standards met

### **Security Requirements**
- [ ] Unauthorized access properly blocked
- [ ] Data access restrictions enforced
- [ ] Audit trail maintained
- [ ] No sensitive data exposed

---

*This test plan covers comprehensive testing of the Gift Module's RBAC and UBAC access controls, ensuring proper security and workflow functionality.*
