# 🛡️ CRM Role-Based Access Control (RBAC) Documentation

## Table of Contents
1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [Permission System](#permission-system)
4. [User Management](#user-management)
5. [Implementation Guide](#implementation-guide)
6. [Adding New Modules](#adding-new-modules)
7. [Adding New Permissions](#adding-new-permissions)
8. [Firebase Integration](#firebase-integration)
9. [Security Best Practices](#security-best-practices)
10. [Troubleshooting](#troubleshooting)
11. [API Reference](#api-reference)

---

## Overview

MyFlow implements a comprehensive Role-Based Access Control (RBAC) system that provides granular permission management across different modules, merchants, currencies, and member data types.

### Key Features
- ✅ **Module-level permissions** (VIEW, SEARCH, EDIT, ADD, DELETE, IMPORT, EXPORT)
- ✅ **Merchant-based access control** (limit users to specific merchants)
- ✅ **Currency restrictions** (control which currencies users can work with)
- ✅ **Member data visibility** (Normal, VIP, or both)
- ✅ **Personal info masking** (protect sensitive user data)
- ✅ **Real-time permission enforcement**
- ✅ **Firebase Firestore integration**

---

## Core Concepts

### 1. Users
Every user in the system has:
- **Basic Info**: Name, email, department, region
- **Role**: Defines their primary function (ADMIN, MANAGER, KAM, PROCUREMENT, AUDIT)
- **Status**: Active/Inactive and login permissions
- **Access Controls**: Merchants, currencies, member types they can access

### 2. Roles
Pre-defined user roles with different levels of access:

| Role | Description | Default Access Level |
|------|-------------|---------------------|
| **ADMIN** | System administrator | Full access to all modules, merchants, currencies |
| **MANAGER** | Department manager | Broad access with some restrictions |
| **KAM** | Key Account Manager | Limited to customer-facing modules |
| **PROCUREMENT** | Procurement specialist | Access to procurement-related functions |
| **AUDIT** | Auditor | Read-only access for compliance |

### 3. Modules
The application is divided into modules, each with its own permission set:

| Module | ID | Purpose |
|--------|----|---------| 
| **VIP Profile** | `vip-profile` | Manage VIP customer profiles |
| **Campaign** | `campaign` | Marketing campaign management |
| **Gift Approval** | `gift-approval` | Gift request approval workflow |
| **User Management** | `user-management` | System user administration |

### 4. Permissions
Each module supports these permission types:

| Permission | Description | Use Case |
|------------|-------------|----------|
| **VIEW** | See module content | Basic read access |
| **SEARCH** | Search within module | Find specific records |
| **EDIT** | Modify existing records | Update customer data |
| **ADD** | Create new records | Add new customers/campaigns |
| **DELETE** | Remove records | Clean up old data |
| **IMPORT** | Bulk import data | Load external data |
| **EXPORT** | Export data | Generate reports |

---

## Permission System

### Permission Matrix Structure

The permission system uses a matrix approach where each user has permissions defined as:

```typescript
permissions: {
  "vip-profile": ["VIEW", "SEARCH", "EDIT"],
  "campaign": ["VIEW", "SEARCH", "EDIT", "ADD"],
  "gift-approval": ["VIEW", "ADD"],
  "user-management": ["VIEW", "SEARCH"]
}
```

### Access Control Layers

#### 1. Module Access
```typescript
// Check if user can access a module with specific permission
FirebaseAuthService.hasPermission(userData, 'vip-profile', 'VIEW')
```

#### 2. Merchant Access
```typescript
// Check if user can work with specific merchant
FirebaseAuthService.canAccessMerchant(userData, 'MERCHANT_A')
```

#### 3. Currency Access
```typescript
// Check if user can work with specific currency
FirebaseAuthService.canAccessCurrency(userData, 'USD')
```

#### 4. Member Type Access
```typescript
// Check if user can access member type
FirebaseAuthService.canAccessMemberType(userData, 'VIP')
```

### Member Data Visibility

Users can be granted access to different member data types:

| Access Level | Description | Use Case |
|-------------|-------------|----------|
| **Normal Only** | See only normal members | Basic customer service |
| **VIP Only** | See only VIP members | High-value customer management |
| **Both** | See normal and VIP members | Comprehensive customer management |

---

## User Management

### Creating Users

When creating a new user, administrators can configure:

#### User Settings Tab
- **Department**: User's department/team
- **Login**: Enable/disable login capability
- **Status**: Active/inactive status
- **Personal Info Masking**: Hide sensitive data
- **Name, Email, Password**: Basic credentials
- **Role**: Primary user role
- **Member Data Access**: Normal/VIP/Both

#### Authority Settings Tab
- **Permission Matrix**: Module-by-permission grid
- **Granular Control**: Select specific permissions for each module

#### Projects & Currency Tab
- **Merchant Access**: Select which merchants user can work with
- **Currency Access**: Select which currencies user can handle

### User Data Structure

```typescript
interface FirebaseUser {
  id: string
  email: string
  name: string
  role: UserRole
  merchants: string[]           // ['MERCHANT_A', 'MERCHANT_B']
  currencies: string[]          // ['USD', 'EUR', 'GBP']
  memberAccess: MemberType[]    // ['NORMAL', 'VIP']
  permissions: Record<string, Permission[]>
  isActive: boolean
  department?: string
  region?: string
  additionalData: {
    maskPersonalInfo?: boolean
    canLogin?: boolean
  }
}
```

---

## Implementation Guide

### Frontend Permission Checks

#### 1. Component-Level Protection

```tsx
import PermissionGuard from '@/components/common/permission-guard'

// Wrap components that require specific permissions
<PermissionGuard module="vip-profile" permission="EDIT">
  <EditButton onClick={handleEdit} />
</PermissionGuard>
```

#### 2. Hook-Based Checks

```tsx
import { useFirebaseAuth } from '@/contexts/firebase-auth-context'

function MyComponent() {
  const { hasPermission } = useFirebaseAuth()
  
  const canEdit = hasPermission('vip-profile', 'EDIT')
  
  return (
    <div>
      {canEdit && <EditButton />}
    </div>
  )
}
```

#### 3. Service-Level Checks

```typescript
import { FirebaseAuthService } from '@/lib/firebase-auth'

// Check permissions in service functions
if (!FirebaseAuthService.hasPermission(userData, 'campaign', 'ADD')) {
  throw new Error('Insufficient permissions')
}
```

### Backend Security (Firestore Rules)

```javascript
// Example Firestore security rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User can only access their own user document
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // VIP profiles with merchant restrictions
    match /vip-profiles/{profileId} {
      allow read: if hasPermission('vip-profile', 'VIEW') && 
                     canAccessMerchant(resource.data.merchant);
      allow write: if hasPermission('vip-profile', 'EDIT') && 
                      canAccessMerchant(resource.data.merchant);
    }
  }
}
```

---

## Adding New Modules

### Step 1: Define Module Configuration

Add the new module to the modules list:

```typescript
// In app/user-management/page.tsx
const MODULES = [
  { id: 'vip-profile', name: 'VIP Profile' },
  { id: 'campaign', name: 'Campaign' },
  { id: 'gift-approval', name: 'Gift Approval' },
  { id: 'user-management', name: 'User Management' },
  { id: 'new-module', name: 'New Module' } // ← Add here
]
```

### Step 2: Create Module Pages

```typescript
// app/new-module/page.tsx
export default function NewModulePage() {
  const { hasPermission } = useFirebaseAuth()
  
  // Check module access
  if (!hasPermission('new-module', 'VIEW')) {
    return <AccessDenied />
  }
  
  return (
    <div>
      <PermissionGuard module="new-module" permission="ADD">
        <AddButton />
      </PermissionGuard>
      
      <PermissionGuard module="new-module" permission="EDIT">
        <EditButton />
      </PermissionGuard>
    </div>
  )
}
```

### Step 3: Update Navigation

```typescript
// components/layout/sidebar.tsx
const navigationItems = [
  {
    name: 'VIP Profile',
    href: '/vip-profile',
    icon: Users,
    module: 'vip-profile',
    permission: 'VIEW'
  },
  // ... existing items
  {
    name: 'New Module',
    href: '/new-module',
    icon: NewIcon,
    module: 'new-module',
    permission: 'VIEW'
  }
]
```

### Step 4: Update Type Definitions

```typescript
// types/auth.ts
export type ModuleId = 
  | 'vip-profile'
  | 'campaign' 
  | 'gift-approval'
  | 'user-management'
  | 'new-module' // ← Add here
```

---

## Adding New Permissions

### Step 1: Update Permission Types

```typescript
// types/auth.ts
export type Permission = 
  | 'VIEW'
  | 'SEARCH'
  | 'EDIT'
  | 'ADD'
  | 'DELETE'
  | 'IMPORT'
  | 'EXPORT'
  | 'NEW_PERMISSION' // ← Add here
```

### Step 2: Update Permission Array

```typescript
// app/user-management/page.tsx
const PERMISSIONS: Permission[] = [
  'VIEW', 'SEARCH', 'EDIT', 'ADD', 'DELETE', 'IMPORT', 'EXPORT',
  'NEW_PERMISSION' // ← Add here
]
```

### Step 3: Implement Permission Logic

```typescript
// In your module components
<PermissionGuard module="vip-profile" permission="NEW_PERMISSION">
  <NewFeatureButton />
</PermissionGuard>
```

### Step 4: Update Default Permissions

```typescript
// lib/firebase-auth.ts - in createUserDocumentOnFirstLogin
const defaultPermissions = {
  'vip-profile': ['VIEW', 'SEARCH', 'NEW_PERMISSION'], // ← Add to defaults
  // ... other modules
}
```

---

## Firebase Integration

### User Document Structure

```typescript
// Firestore: /users/{userId}
{
  id: "user123",
  email: "user@example.com",
  name: "John Doe",
  role: "KAM",
  merchants: ["MERCHANT_A", "MERCHANT_B"],
  currencies: ["USD", "EUR"],
  memberAccess: ["NORMAL", "VIP"],
  permissions: {
    "vip-profile": ["VIEW", "SEARCH", "EDIT"],
    "campaign": ["VIEW", "SEARCH"],
    "gift-approval": ["VIEW", "ADD"]
  },
  isActive: true,
  department: "Sales",
  region: "North America",
  additionalData: {
    maskPersonalInfo: false,
    canLogin: true
  },
  createdAt: timestamp,
  updatedAt: timestamp,
  lastLogin: timestamp
}
```

### Permission Queries

```typescript
// Get users with specific role
const managers = await FirebaseAuthService.getUsersByRole('MANAGER')

// Get users with merchant access
const merchantUsers = await FirebaseAuthService.getUsersByMerchant('MERCHANT_A')

// Update user permissions
await FirebaseAuthService.updateUserPermissions(userId, {
  'new-module': ['VIEW', 'EDIT']
})
```

---

## Security Best Practices

### 1. Principle of Least Privilege
- Grant users only the minimum permissions needed
- Regularly review and audit user permissions
- Remove unused permissions promptly

### 2. Defense in Depth
- Implement checks at multiple layers (UI, API, Database)
- Don't rely solely on frontend permission guards
- Use Firestore security rules as the final enforcement

### 3. Audit Trail
- Log all permission changes
- Track user access patterns
- Monitor for suspicious activity

### 4. Data Segregation
- Use merchant and currency restrictions to isolate data
- Implement member type access controls
- Enable personal info masking for sensitive data

### 5. Regular Updates
- Review permissions during role changes
- Deactivate users when they leave
- Update permissions for business requirement changes

---

## Troubleshooting

### Common Issues

#### 1. Permission Denied Errors
```typescript
// Check user permissions
console.log('User permissions:', user.permissions)
console.log('Required permission:', 'vip-profile', 'EDIT')
console.log('Has permission:', hasPermission('vip-profile', 'EDIT'))
```

#### 2. Users Can't See Data
- Verify merchant access: `user.merchants.includes(dataItem.merchant)`
- Check currency access: `user.currencies.includes(dataItem.currency)`
- Confirm member type access: `user.memberAccess.includes(profile.memberType)`

#### 3. Permission Matrix Not Updating
- Check Firebase connection
- Verify user document structure
- Ensure proper state management in forms

#### 4. Firestore Security Rules
```javascript
// Debug rules in Firebase Console
allow read: if debug(hasPermission('vip-profile', 'VIEW'));
```

### Debug Utilities

```typescript
// Add to your components for debugging
const { user } = useFirebaseAuth()

console.log('Current user:', user)
console.log('User permissions:', user?.permissions)
console.log('Merchant access:', user?.merchants)
console.log('Currency access:', user?.currencies)
```

---

## API Reference

### FirebaseAuthService Methods

#### User Management
```typescript
// Create new user
static async createUser(userData: UserData & { password: string }): Promise<string>

// Get all users
static async getAllUsers(): Promise<FirebaseUser[]>

// Update user data
static async updateUserData(uid: string, updates: Partial<FirebaseUser>, updatedBy?: string): Promise<void>

// Toggle user status
static async toggleUserStatus(uid: string, isActive: boolean, updatedBy: string): Promise<void>

// Delete user
static async deleteUser(uid: string, deletedBy: string): Promise<void>
```

#### Permission Checks
```typescript
// Check module permission
static hasPermission(userData: FirebaseUser, module: string, permission: Permission): boolean

// Check merchant access
static canAccessMerchant(userData: FirebaseUser, merchant: string): boolean

// Check currency access
static canAccessCurrency(userData: FirebaseUser, currency: string): boolean

// Check member type access
static canAccessMemberType(userData: FirebaseUser, memberType: MemberType): boolean
```

#### Authentication
```typescript
// Sign in user
static async signIn(email: string, password: string): Promise<{ user: User; userData: FirebaseUser }>

// Sign out user
static async signOut(): Promise<void>

// Get current user data
static async getUserData(uid: string): Promise<FirebaseUser | null>
```

### React Hooks

#### useFirebaseAuth
```typescript
const {
  user,              // Current Firebase Auth user
  userData,          // User's Firestore document
  loading,           // Authentication loading state
  hasPermission,     // Check module permission
  signOut           // Sign out function
} = useFirebaseAuth()
```

### Components

#### PermissionGuard
```tsx
<PermissionGuard 
  module="vip-profile" 
  permission="EDIT"
  fallback={<AccessDenied />}  // Optional
>
  <ProtectedComponent />
</PermissionGuard>
```

---

## Examples

### Example 1: KAM User Configuration

```typescript
const kamUser = {
  name: "John KAM",
  email: "john.kam@company.com",
  role: "KAM",
  merchants: ["MERCHANT_A", "MERCHANT_B"],
  currencies: ["USD", "EUR"],
  memberAccess: ["VIP"], // Only VIP customers
  permissions: {
    "vip-profile": ["VIEW", "SEARCH", "EDIT", "ADD"],
    "campaign": ["VIEW", "SEARCH"],
    "gift-approval": ["VIEW", "ADD"]
    // No user-management access
  },
  department: "Sales",
  region: "North America"
}
```

### Example 2: Manager User Configuration

```typescript
const managerUser = {
  name: "Jane Manager",
  email: "jane.manager@company.com",
  role: "MANAGER",
  merchants: ["MERCHANT_A", "MERCHANT_B", "MERCHANT_C"],
  currencies: ["USD", "EUR", "GBP"],
  memberAccess: ["NORMAL", "VIP"], // All member types
  permissions: {
    "vip-profile": ["VIEW", "SEARCH", "EDIT"],
    "campaign": ["VIEW", "SEARCH", "EDIT", "ADD"],
    "gift-approval": ["VIEW", "SEARCH", "EDIT"],
    "user-management": ["VIEW", "SEARCH"]
  },
  department: "Marketing",
  region: "Global"
}
```

### Example 3: Adding a Reports Module

```typescript
// 1. Add to modules list
const MODULES = [
  // ... existing modules
  { id: 'reports', name: 'Reports' }
]

// 2. Create reports page
// app/reports/page.tsx
export default function ReportsPage() {
  const { hasPermission } = useFirebaseAuth()
  
  return (
    <div>
      <PermissionGuard module="reports" permission="VIEW">
        <ReportsTable />
      </PermissionGuard>
      
      <PermissionGuard module="reports" permission="EXPORT">
        <ExportButton />
      </PermissionGuard>
    </div>
  )
}

// 3. Update navigation
{
  name: 'Reports',
  href: '/reports',
  icon: BarChart,
  module: 'reports',
  permission: 'VIEW'
}
```

---

## Future Considerations

### Scalability
- Consider implementing permission inheritance
- Add support for custom roles
- Implement time-based permissions (temporary access)

### Enhanced Features
- IP-based access restrictions
- Two-factor authentication integration
- Advanced audit logging with change history

### Performance
- Cache permission checks for frequently accessed data
- Implement permission preloading for better UX
- Optimize Firestore queries with compound indexes

---

This documentation provides a comprehensive guide to understanding, implementing, and extending the RBAC system. Keep it updated as the system evolves and new features are added.

**Last Updated**: December 2024  
**Version**: 1.0  
**Maintainer**: Development Team 