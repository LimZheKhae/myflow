# 👥 User Management Documentation

## Overview

The **User Management** module in MyFlow provides comprehensive user administration capabilities with granular permission controls. This module allows authorized users to manage user accounts, roles, permissions, and access settings across the entire platform.

---

## 🔐 Access Requirements

### Base Requirements
- **Authentication**: Must be logged into MyFlow
- **Module Permission**: Must have `VIEW` permission for `user-management` module
- **Page Access**: Direct URL access is protected - users without `VIEW` permission see Access Denied

### Permission Hierarchy
Users need specific permissions within the `user-management` module to perform different actions:

| Permission | Description | Actions Available |
|------------|-------------|-------------------|
| `VIEW` | View user information | See department overview, view user lists, access user details |
| `SEARCH` | Search through users | Use search functionality within departments |
| `EDIT` | Modify user data | Update user profiles, change roles, modify permissions |
| `ADD` | Create new users | Create new user accounts with full configuration |
| `DELETE` | Remove users | Soft delete user accounts (archive users) |
| `IMPORT` | Import user data | Bulk import user information (future feature) |
| `EXPORT` | Export user data | Export user lists and reports (future feature) |

---

## 🏢 Department Structure

### Available Departments
The system organizes users into the following departments:

1. **KAM** (Key Account Management)
2. **MktOps** (Marketing Operations) 
3. **SalesOps** (Sales Operations)
4. **Audit** (Audit Department)
5. **DSA** (Digital Sales & Analytics)
6. **Unassigned** (Users without department)

### Department View
- **Department Cards**: Visual overview showing user counts and status
- **Active/Inactive Indicators**: Green dots for active, gray for inactive users
- **Click Navigation**: Click any department to view users within that department

---

## 👤 User Roles

### Available Roles
| Role | Description | Typical Use Case |
|------|-------------|------------------|
| `CC/CA` | Customer Care/Customer Assistant | Front-line customer support and assistance |
| `KAM` | Key Account Management | Account management and client relationships |
| `TL` | Team Leader | Team supervision and coordination |
| `Manager` | Department Manager | Department-level management |
| `QA` | Quality Assurance | Quality control and testing |
| `MKTops` | Marketing Operations | Marketing campaign management |
| `Audit` | Audit Specialist | Compliance and audit functions |
| `Admin` | System Administrator | Full system access and control |

---

## 🛠️ Features by Permission Level

### 👀 VIEW Permission
**What users can do:**
- Access the User Management page
- View department overview cards
- See user counts per department (active/inactive)
- Navigate between departments
- View basic user information (name, email, role, status)
- See user avatars and status indicators

**What users cannot do:**
- Modify any user data
- Create new users
- Delete or archive users
- Access detailed permission settings

**UI Elements Available:**
- Department navigation cards
- User list view
- Back to departments navigation
- Basic user profile cards
- Status indicators (view-only, no toggle)

---

### 🔍 SEARCH Permission
**Additional capabilities:**
- Use the search functionality within departments
- Filter users by name or email
- Real-time search as you type
- Contextual search placeholder (`Search in {Department}...`)

**UI Elements Available:**
- Search input field (appears when department is selected)
- Real-time search results
- Search suggestions and filtering

---

### ✏️ EDIT Permission
**Additional capabilities:**
- Modify existing user profiles
- Update user information:
  - Name and email
  - Department assignment
  - Role assignment
  - Active/inactive status toggle
- Configure user permissions:
  - Module-specific permissions (VIEW, SEARCH, EDIT, ADD, DELETE, IMPORT, EXPORT)
  - Merchant access controls
  - Currency restrictions
- Change user status (activate/deactivate)

**UI Elements Available:**
- Edit button (✏️) on user cards
- User edit dialog with full permission matrix
- Status toggle switches (protected by EDIT permission)
- Permission checkboxes and selectors

**Permission Matrix Interface:**
```
Authority Settings
├── VIP Profile    [✓VIEW] [✓SEARCH] [✓EDIT] [ ADD] [ DELETE] [ IMPORT] [ EXPORT]
├── Campaign       [✓VIEW] [ SEARCH] [ EDIT] [ ADD] [ DELETE] [ IMPORT] [ EXPORT]
├── Gift Approval  [✓VIEW] [✓SEARCH] [ EDIT] [ ADD] [ DELETE] [ IMPORT] [ EXPORT]
└── User Management[ VIEW] [ SEARCH] [ EDIT] [ ADD] [ DELETE] [ IMPORT] [ EXPORT]

Access Controls
├── Merchant Access: MERCHANT_A, MERCHANT_B (Multi-select)
└── Currency Access: USD, EUR, MYR (Multi-select)
```

---

### ➕ ADD Permission
**Additional capabilities:**
- Create new user accounts
- Set initial user configuration:
  - Personal information (name, email, password)
  - Department assignment
  - Role assignment
  - Initial permission matrix
  - Merchant and currency access
- Password requirement: Minimum 6 characters for new users

**UI Elements Available:**
- "Add User" button in header
- New user creation dialog
- Complete user setup form
- Password field for new accounts

**User Creation Form:**
```
Personal Information
├── Name: [Text Input]
├── Email: [Email Input]
├── Password: [Password Input] (Required, min 6 chars)
├── Department: [Dropdown: KAM, MktOps, SalesOps, Audit, DSA]
└── Role: [Dropdown: CC/CA, KAM, TL, Manager, QA, MKTops, Audit, Admin]

Authority Settings
├── [Permission Matrix for all modules]
├── Merchant Access: [Multi-select dropdown]
└── Currency Access: [Multi-select dropdown]
```

---

### 🗑️ DELETE Permission
**Additional capabilities:**
- Archive user accounts (soft delete)
- Remove users from active directory
- Maintain audit trail of deleted users

**Important Notes:**
- **Soft Delete**: Users are marked as `archived` rather than permanently deleted
- **Data Retention**: Archived users maintain their data for audit purposes
- **Irreversible**: Deleted users disappear from all user lists
- **Audit Trail**: System tracks who deleted the user and when

**UI Elements Available:**
- Delete button (🗑️) on user cards
- Confirmation dialog before deletion
- Warning messages about irreversible action

---

### 📥 IMPORT Permission (Future Feature)
**Planned capabilities:**
- Bulk import user data from CSV/Excel files
- Batch user creation
- Import validation and error handling
- Preview import results before applying

---

### 📤 EXPORT Permission (Future Feature)
**Planned capabilities:**
- Export user lists to CSV/Excel
- Generate user reports
- Export permission matrices
- Department-wise user exports

---

## 🎯 User Interface Components

### Department Overview
```
┌─────────────────────────────────────────────────────────────┐
│ Departments                                                 │
│ Click on a department to view and manage users             │
│                                                             │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│ │ [K] KAM     │ │ [M] MktOps  │ │ [S] SalesOps│            │
│ │ 5 users     │ │ 3 users     │ │ 2 users     │            │
│ │ • 4 Active  │ │ • 2 Active  │ │ • 1 Active  │            │
│ │ • 1 Inactive│ │ • 1 Inactive│ │ • 1 Inactive│            │
│ └─────────────┘ └─────────────┘ └─────────────┘            │
│                                                             │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│ │ [A] Audit   │ │ [D] DSA     │ │ [?] Unassigned│          │
│ │ 1 user      │ │ 4 users     │ │ 2 users     │            │
│ │ • 1 Active  │ │ • 3 Active  │ │ Mixed status │            │
│ │ • 0 Inactive│ │ • 1 Inactive│ │              │            │
│ └─────────────┘ └─────────────┘ └─────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

### Department User List
```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to Departments    KAM Department    [5 users]       │
│                                                             │
│ [🔍 Search in KAM...]                         [+ Add User] │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [J] John Doe     [MANAGER]    • Active  [✏️][⚡][🗑️]   │ │
│ │     john@crm.com                                        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [S] Sarah Smith  [AGENT]      • Active  [✏️][⚡][🗑️]   │ │
│ │     sarah@crm.com                                       │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### User Actions
| Icon | Action | Permission Required | Description |
|------|--------|-------------------|-------------|
| ✏️ | Edit | EDIT | Open user edit dialog |
| ⚡ | Toggle Status | EDIT | Activate/deactivate user (Protected) |
| 🗑️ | Delete | DELETE | Archive user account |

---

## 🔒 Security Features

### Permission Validation
- **Real-time Checks**: Permissions verified on every action
- **UI Hiding**: Users only see actions they can perform
- **Backend Validation**: Server-side permission enforcement
- **Firestore Rules**: Database-level access control

### Action Protection
- **Status Toggle Protection**: Toggle switches only appear with EDIT permission
- **Button Visibility**: Action buttons dynamically shown based on permissions
- **Form Access**: User creation/edit forms require appropriate permissions
- **Data Modification**: All write operations require explicit permission validation

### Audit Trail
- **User Creation**: Tracks who created each user
- **Modifications**: Records all user profile changes
- **Deletions**: Maintains record of archived users
- **Timestamps**: All actions include timestamp information

### Data Protection
- **Soft Delete**: No permanent data loss
- **Password Security**: Secure password creation and updates
- **Session Management**: Firebase authentication integration
- **Role Separation**: Clear role-based access boundaries

---

## 🚀 Best Practices

### For Administrators
1. **Regular Review**: Periodically review user permissions
2. **Principle of Least Privilege**: Grant minimum necessary permissions
3. **Department Organization**: Keep users properly categorized
4. **Status Management**: Deactivate rather than delete when possible

### For Managers
1. **Team Oversight**: Monitor your department's user list
2. **Permission Requests**: Use proper channels for permission changes
3. **New User Setup**: Ensure proper role and department assignment
4. **Status Updates**: Keep user statuses current

### For Users
1. **Profile Accuracy**: Keep personal information updated
2. **Security**: Follow password security guidelines
3. **Access Reporting**: Report any access issues promptly
4. **Role Understanding**: Understand your role's capabilities

---

## 🆘 Troubleshooting

### Common Issues

**Problem**: "Access Denied" when visiting User Management
- **Cause**: No VIEW permission for user-management module
- **Solution**: Contact administrator to grant VIEW permission

**Problem**: Cannot see Add User button
- **Cause**: Missing ADD permission
- **Solution**: Request ADD permission from administrator

**Problem**: Edit button not visible
- **Cause**: Missing EDIT permission
- **Solution**: Request EDIT permission from administrator

**Problem**: No search field appears
- **Cause**: Missing SEARCH permission
- **Solution**: Request SEARCH permission from administrator

**Problem**: User creation fails
- **Cause**: Password too short or missing required fields
- **Solution**: Ensure password is at least 6 characters and all fields are filled

### Error Messages
| Error | Meaning | Resolution |
|-------|---------|------------|
| "Access Denied" | Insufficient permissions | Contact administrator |
| "User creation failed" | Invalid user data | Check required fields |
| "Password too short" | Password < 6 characters | Use longer password |
| "Email already exists" | Duplicate email | Use different email |

---

## 📞 Support

For additional help with User Management:
1. **Documentation**: Refer to RBAC_DOCUMENTATION.md for permission details
2. **Administrator**: Contact your system administrator
3. **Technical Issues**: Check browser console for error details
4. **Feature Requests**: Submit through proper channels

---

*Last Updated: December 2024*
*Version: 1.0*
*MyFlow - Professional CRM Platform* 