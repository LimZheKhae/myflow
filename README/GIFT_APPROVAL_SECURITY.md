# Gift Approval System Security Model

## Overview

The Gift Approval System implements a comprehensive Role-Based Access Control (RBAC) security model to ensure that only authorized users can perform specific actions on gift requests based on their role and permissions.

## Security Architecture

### 1. Authentication Layer
- **Firebase Authentication**: All users must be authenticated via Firebase Auth
- **Session Management**: User sessions are managed through Firebase Auth state
- **User Validation**: Each request must include valid `userId`, `userRole`, and `userPermissions`

### 2. Authorization Layer
- **Role-Based Access**: Users are assigned specific roles (ADMIN, MANAGER, KAM, MKTOPS, AUDIT)
- **Permission-Based Access**: Each role has specific permissions for different modules
- **Module-Specific Permissions**: Users must have appropriate permissions for the `gift-approval` module

### 3. Workflow Security
- **Status Validation**: Actions can only be performed on gifts in appropriate workflow states
- **Progression Control**: Workflow transitions are strictly controlled and validated
- **Audit Trail**: All actions are logged with user information and timestamps

## Security Requirements by Tab

### Pending Tab (`/api/gift-approval/update`)

**Required Role:** MANAGER, ADMIN
**Required Permissions:** VIEW, EDIT (gift-approval module)
**Allowed Actions:** approve, reject
**Workflow Status:** KAM_Request, Manager_Review

**Security Checks:**
```typescript
// Role validation
if (!['MANAGER', 'ADMIN'].includes(userRole)) {
  return { isValid: false, message: 'Only Manager and Admin users can approve/reject gift requests' }
}

// Permission validation
if (!hasViewPermission || !hasEditPermission) {
  return { isValid: false, message: 'VIEW and EDIT permissions required' }
}

// Action validation
if (!['approve', 'reject'].includes(action)) {
  return { isValid: false, message: "Invalid action for pending tab" }
}
```

### Processing Tab (`/api/gift-approval/update`)

**Required Role:** MKTOPS, MANAGER, ADMIN
**Required Permissions:** VIEW, EDIT (gift-approval module)
**Allowed Actions:** update, update-mktops, reject, toggle-bo, proceed
**Workflow Status:** Manager_Review, MKTOps_Processing

**Security Checks:**
```typescript
// Role validation
if (!['MKTOPS', 'MANAGER', 'ADMIN'].includes(userRole)) {
  return { isValid: false, message: 'Only MKTOps, Manager, and Admin users can update processing information' }
}

// Permission validation
if (!hasViewPermission || !hasEditPermission) {
  return { isValid: false, message: 'VIEW and EDIT permissions required' }
}

// Action validation
if (!['update', 'update-mktops', 'reject', 'toggle-bo', 'proceed'].includes(action)) {
  return { isValid: false, message: "Invalid action for processing tab" }
}
```

**Special Validation for "Proceed to KAM Proof":**
- Dispatcher must be provided
- Tracking Code must be provided
- Tracking Status must be "Delivered"
- Uploaded BO must be true

### KAM Proof Tab (`/api/gift-approval/update`)

**Required Role:** KAM, ADMIN
**Required Permissions:** VIEW, EDIT (gift-approval module)
**Allowed Actions:** submit
**Workflow Status:** KAM_Proof

**Security Checks:**
```typescript
// Role validation
if (!['KAM', 'ADMIN'].includes(userRole)) {
  return { isValid: false, message: 'Only KAM and Admin users can submit proof' }
}

// Permission validation
if (!hasViewPermission || !hasEditPermission) {
  return { isValid: false, message: 'VIEW and EDIT permissions required' }
}

// Action validation
if (action !== 'submit') {
  return { isValid: false, message: "Invalid action for kam-proof tab" }
}
```

### Audit Tab (`/api/gift-approval/update`)

**Required Role:** AUDIT, ADMIN
**Required Permissions:** VIEW, EDIT (gift-approval module)
**Allowed Actions:** complete, mark-issue
**Workflow Status:** SalesOps_Audit

**Security Checks:**
```typescript
// Role validation
if (!['AUDIT', 'ADMIN'].includes(userRole)) {
  return { isValid: false, message: 'Only Audit and Admin users can audit gifts' }
}

// Permission validation
if (!hasViewPermission || !hasEditPermission) {
  return { isValid: false, message: 'VIEW and EDIT permissions required' }
}

// Action validation
if (!['complete', 'mark-issue'].includes(action)) {
  return { isValid: false, message: "Invalid action for audit tab" }
}
```

## Permission Matrix

| Role | Pending | Processing | KAM Proof | Audit | Permissions |
|------|---------|------------|-----------|-------|-------------|
| ADMIN | ✅ | ✅ | ✅ | ✅ | All permissions |
| MANAGER | ✅ | ✅ | ❌ | ❌ | VIEW, EDIT, IMPORT, EXPORT |
| MKTOPS | ❌ | ✅ | ❌ | ❌ | VIEW, EDIT |
| KAM | ❌ | ❌ | ✅ | ❌ | VIEW, SEARCH, ADD, IMPORT |
| AUDIT | ❌ | ❌ | ❌ | ✅ | VIEW, EDIT |

## Security Validation Flow

### 1. Request Validation
```typescript
// Validate required fields
if (!giftId || !tab || !action || !userId) {
  return { success: false, message: 'Required fields missing' }
}

// Validate user credentials
if (!userRole || !userPermissions) {
  return { success: false, message: 'User role and permissions required' }
}
```

### 2. Permission Validation
```typescript
// Check gift-approval module permissions
if (!userPermissions['gift-approval'] || !Array.isArray(userPermissions['gift-approval'])) {
  return { success: false, message: 'Gift approval permissions required' }
}

// Check VIEW and EDIT permissions
const hasViewPermission = userPermissions['gift-approval'].includes('VIEW')
const hasEditPermission = userPermissions['gift-approval'].includes('EDIT')

if (!hasViewPermission || !hasEditPermission) {
  return { success: false, message: 'VIEW and EDIT permissions required' }
}
```

### 3. Role and Action Validation
```typescript
// Tab-specific role validation
const allowedRoles = getTabAllowedRoles(tab)
if (!allowedRoles.includes(userRole)) {
  return { success: false, message: `Role ${userRole} not allowed for ${tab} tab` }
}

// Action validation
const allowedActions = getTabAllowedActions(tab)
if (!allowedActions.includes(action)) {
  return { success: false, message: `Action ${action} not allowed for ${tab} tab` }
}
```

### 4. Workflow Validation
```typescript
// Get current gift status
const currentGift = await getCurrentGiftStatus(giftId)

// Validate workflow progression
const workflowValidation = validateWorkflowProgression(tab, action, currentGift.workflowStatus)
if (!workflowValidation.isValid) {
  return { success: false, message: workflowValidation.message }
}
```

## Error Handling

### Security Error Responses
- **400 Bad Request**: Missing required fields, invalid data
- **403 Forbidden**: Insufficient permissions, invalid role
- **404 Not Found**: Gift not found
- **500 Internal Server Error**: Database errors, system failures

### Error Messages
- Clear, user-friendly error messages
- No sensitive information exposed
- Consistent error format across all endpoints

## Audit and Logging

### Activity Logging
- All actions are logged with user information
- Timestamps for all operations
- Workflow timeline tracking
- Notification creation for relevant actions

### Security Monitoring
- Failed authentication attempts
- Permission violation attempts
- Unauthorized access attempts
- Suspicious activity patterns

## Best Practices

### 1. Defense in Depth
- Multiple layers of security validation
- Input sanitization and validation
- SQL injection prevention
- XSS protection

### 2. Principle of Least Privilege
- Users only have access to what they need
- Role-based permissions
- Module-specific access control

### 3. Secure by Default
- All endpoints require authentication
- Explicit permission requirements
- Fail-safe error handling

### 4. Regular Security Reviews
- Periodic permission audits
- Role assignment reviews
- Security testing and validation

## Implementation Notes

### Frontend Security
- Client-side validation for UX
- Server-side validation for security
- Permission-based UI rendering
- Role-based component visibility

### API Security
- Request validation middleware
- Permission checking utilities
- Error handling standardization
- Logging and monitoring

### Database Security
- Parameterized queries
- Transaction management
- Audit trail maintenance
- Data integrity constraints
