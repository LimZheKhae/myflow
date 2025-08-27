# Activity Log Fields Guide

## 📋 Overview
Activity logs track all user actions and system events in the MYFLOW application. Each log entry contains detailed information about who performed what action, when, and on which entity.

## 🗂️ Collection: `activity_logs`

### 📊 Document Structure

```typescript
interface FirebaseActivityLog {
  id: string                    // Auto-generated document ID
  userId: string               // User ID who performed the action
  userName: string             // Display name of the user
  userEmail: string            // Email of the user
  action: string               // Action performed (see Action Types below)
  module: string               // Module where action occurred (see Module Types below)
  entityType: string           // Type of entity affected (see Entity Types below)
  entityId: string             // ID of the affected entity
  entityName?: string          // Name/description of the entity (optional)
  details: Record<string, any> // Additional details about the action
  ipAddress?: string           // IP address of the user (optional)
  userAgent?: string           // User agent string (optional)
  createdAt: Timestamp         // When the action occurred
  updatedAt: Timestamp         // Last update timestamp
}
```

## 🎯 Action Types

### User Management Actions
- `USER_LOGIN` - User logged in
- `USER_LOGOUT` - User logged out
- `USER_REGISTER` - New user registration
- `USER_PROFILE_UPDATE` - User profile updated
- `PASSWORD_CHANGE` - Password changed
- `PASSWORD_RESET` - Password reset requested

### VIP Profile Actions
- `CREATE_VIP_PROFILE` - New VIP profile created
- `UPDATE_VIP_PROFILE` - VIP profile updated
- `DELETE_VIP_PROFILE` - VIP profile deleted
- `ADD_VIP_NOTE` - Note added to VIP profile
- `UPDATE_VIP_NOTE` - VIP note updated
- `DELETE_VIP_NOTE` - VIP note deleted
- `ASSIGN_KAM` - KAM assigned to VIP
- `UNASSIGN_KAM` - KAM unassigned from VIP

### Campaign Actions
- `CREATE_CAMPAIGN` - New campaign created
- `UPDATE_CAMPAIGN` - Campaign updated
- `DELETE_CAMPAIGN` - Campaign deleted
- `UPDATE_CAMPAIGN_TARGET` - Campaign target updated
- `CAMPAIGN_STATUS_CHANGE` - Campaign status changed
- `ASSIGN_CAMPAIGN_USER` - User assigned to campaign
- `UNASSIGN_CAMPAIGN_USER` - User unassigned from campaign

### Gift Request Actions
- `CREATE_GIFT_REQUEST` - New gift request created
- `UPDATE_GIFT_REQUEST` - Gift request updated
- `DELETE_GIFT_REQUEST` - Gift request deleted
- `APPROVE_GIFT_REQUEST` - Gift request approved
- `REJECT_GIFT_REQUEST` - Gift request rejected
- `UPDATE_PROCUREMENT_STATUS` - Procurement status updated
- `UPDATE_DELIVERY_STATUS` - Delivery status updated
- `ADD_GIFT_NOTE` - Note added to gift request
- `UPDATE_GIFT_NOTE` - Gift note updated

### System Actions
- `SYSTEM_BACKUP` - System backup performed
- `SYSTEM_MAINTENANCE` - System maintenance
- `DATA_IMPORT` - Data imported
- `DATA_EXPORT` - Data exported
- `BULK_OPERATION` - Bulk operation performed
- `SYSTEM_ERROR` - System error occurred
- `PERMISSION_CHANGE` - User permissions changed
- `ROLE_ASSIGNMENT` - User role assigned/changed

## 🏗️ Module Types

- `auth` - Authentication and user management
- `vip-profile` - VIP profile management
- `campaign` - Campaign management
- `gift-approval` - Gift request approval system
- `user-management` - User administration
- `system` - System operations
- `reports` - Reporting and analytics
- `settings` - System settings

## 🏷️ Entity Types

### User Management
- `user` - User account
- `role` - User role
- `permission` - User permission

### VIP Profiles
- `vip_profile` - VIP profile
- `vip_note` - VIP note
- `kam_assignment` - KAM assignment

### Campaigns
- `campaign` - Campaign
- `campaign_target` - Campaign target
- `campaign_user` - Campaign user assignment

### Gift Requests
- `gift_request` - Gift request
- `gift_note` - Gift note
- `approval_workflow` - Approval workflow step

### System
- `backup` - System backup
- `maintenance` - System maintenance
- `import` - Data import
- `export` - Data export

## 📝 Details Field Examples

### VIP Profile Creation
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "merchant": "Casino A",
  "category": "High Roller"
}
```

### Gift Request Approval
```json
{
  "playerName": "John Doe",
  "giftType": "iPhone 15 Pro",
  "amount": 4500,
  "currency": "MYR",
  "comments": "Approved for VIP player"
}
```

### Campaign Update
```json
{
  "name": "Q4 VIP Campaign",
  "type": "Promotional",
  "merchant": "Casino A",
  "status": "Active"
}
```

### User Login
```json
{
  "loginMethod": "email",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0..."
}
```

## 🔧 Sample Log Entries

### VIP Profile Creation
```json
{
  "userId": "user123",
  "userName": "Alice Manager",
  "userEmail": "alice@company.com",
  "action": "CREATE_VIP_PROFILE",
  "module": "vip-profile",
  "entityType": "vip_profile",
  "entityId": "vip456",
  "entityName": "John Doe",
  "details": {
    "name": "John Doe",
    "email": "john.doe@example.com",
    "merchant": "Casino A",
    "category": "High Roller"
  },
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### Gift Request Approval
```json
{
  "userId": "user789",
  "userName": "Bob Manager",
  "userEmail": "bob@company.com",
  "action": "APPROVE_GIFT_REQUEST",
  "module": "gift-approval",
  "entityType": "gift_request",
  "entityId": "gift123",
  "entityName": "iPhone 15 Pro for John Doe",
  "details": {
    "playerName": "John Doe",
    "giftType": "iPhone 15 Pro",
    "amount": 4500,
    "currency": "MYR",
    "comments": "Approved for VIP player"
  },
  "createdAt": "2024-01-15T14:20:00Z"
}
```

### User Login
```json
{
  "userId": "user123",
  "userName": "Alice Manager",
  "userEmail": "alice@company.com",
  "action": "USER_LOGIN",
  "module": "auth",
  "entityType": "user",
  "entityId": "user123",
  "details": {
    "loginMethod": "email",
    "ipAddress": "192.168.1.100"
  },
  "createdAt": "2024-01-15T09:00:00Z"
}
```

## 🚀 Usage Guidelines

### When to Log
- ✅ All user actions that modify data
- ✅ System operations and maintenance
- ✅ Security events (logins, permission changes)
- ✅ Bulk operations
- ✅ Error conditions

### What to Include in Details
- ✅ Relevant entity information
- ✅ Action-specific data
- ✅ User context (IP, user agent)
- ✅ Timestamps for time-sensitive operations
- ✅ Error messages for failed operations

### What NOT to Include
- ❌ Sensitive personal information
- ❌ Passwords or authentication tokens
- ❌ Large data objects
- ❌ Redundant information already in other fields

## 🔍 Querying Examples

### Get all actions by a specific user
```javascript
const userActions = await ActivityLogService.getActivityLogs({
  userId: 'user123'
})
```

### Get all gift request actions
```javascript
const giftActions = await ActivityLogService.getActivityLogs({
  module: 'gift-approval'
})
```

### Get actions in date range
```javascript
const recentActions = await ActivityLogService.getActivityLogs({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31')
})
```

### Get specific action types
```javascript
const approvals = await ActivityLogService.getActivityLogs({
  action: 'APPROVE_GIFT_REQUEST'
})
```

## 📊 Analytics and Reporting

### Common Queries
- User activity summary
- Module usage statistics
- Action frequency analysis
- Error tracking and monitoring
- Audit trail for compliance

### Performance Considerations
- Index on frequently queried fields
- Archive old logs for performance
- Use pagination for large result sets
- Consider aggregation for reporting

## 🔒 Security and Privacy

### Data Retention
- Keep logs for compliance requirements
- Archive old logs to reduce storage costs
- Implement log rotation policies

### Access Control
- Restrict log access to administrators
- Audit log access itself
- Implement data masking for sensitive fields

### Compliance
- Ensure logs meet regulatory requirements
- Implement tamper-evident logging
- Regular log integrity checks
