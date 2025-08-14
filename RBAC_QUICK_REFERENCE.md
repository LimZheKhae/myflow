# 🚀 RBAC Quick Reference Guide

## 🔥 Common Tasks

### 1. Add Permission Check to Component
```tsx
import PermissionGuard from '@/components/common/permission-guard'

<PermissionGuard module="vip-profile" permission="EDIT">
  <EditButton />
</PermissionGuard>
```

### 2. Check Permission in Hook
```tsx
const { hasPermission } = useFirebaseAuth()
const canEdit = hasPermission('vip-profile', 'EDIT')
```

### 3. Add New Module to System
```typescript
// 1. Add to MODULES array in app/user-management/page.tsx
const MODULES = [
  // ... existing
  { id: 'new-module', name: 'New Module' }
]

// 2. Update types/auth.ts
export type ModuleId = 'vip-profile' | 'campaign' | 'gift-approval' | 'user-management' | 'new-module'

// 3. Add to navigation in components/layout/sidebar.tsx
{
  name: 'New Module',
  href: '/new-module', 
  icon: Icon,
  module: 'new-module',
  permission: 'VIEW'
}
```

### 4. Add New Permission
```typescript
// 1. Update types/auth.ts
export type Permission = 'VIEW' | 'SEARCH' | 'EDIT' | 'ADD' | 'DELETE' | 'IMPORT' | 'EXPORT' | 'NEW_PERMISSION'

// 2. Update PERMISSIONS array in app/user-management/page.tsx
const PERMISSIONS: Permission[] = [...existing, 'NEW_PERMISSION']
```

## 📊 Permission Matrix Cheat Sheet

| Module | Purpose | Common Permissions |
|--------|---------|-------------------|
| `vip-profile` | VIP customer management | VIEW, SEARCH, EDIT, ADD |
| `campaign` | Marketing campaigns | VIEW, SEARCH, EDIT, ADD, DELETE |
| `gift-approval` | Gift requests | VIEW, ADD, EDIT |
| `user-management` | System administration | VIEW, SEARCH, EDIT, ADD, DELETE |

## 🏗️ User Configuration Templates

### KAM (Key Account Manager)
```typescript
{
  role: "KAM",
  memberAccess: ["VIP"],
  merchants: ["MERCHANT_A", "MERCHANT_B"],
  currencies: ["USD", "EUR"],
  permissions: {
    "vip-profile": ["VIEW", "SEARCH", "EDIT", "ADD"],
    "campaign": ["VIEW", "SEARCH"],
    "gift-approval": ["VIEW", "ADD"]
  }
}
```

### Manager
```typescript
{
  role: "MANAGER", 
  memberAccess: ["NORMAL", "VIP"],
  merchants: ["MERCHANT_A", "MERCHANT_B", "MERCHANT_C"],
  currencies: ["USD", "EUR", "GBP"],
  permissions: {
    "vip-profile": ["VIEW", "SEARCH", "EDIT"],
    "campaign": ["VIEW", "SEARCH", "EDIT", "ADD"],
    "gift-approval": ["VIEW", "SEARCH", "EDIT"],
    "user-management": ["VIEW", "SEARCH"]
  }
}
```

### Admin
```typescript
{
  role: "ADMIN",
  memberAccess: ["NORMAL", "VIP"], 
  merchants: ["*"], // All merchants
  currencies: ["*"], // All currencies
  permissions: {
    "vip-profile": ["VIEW", "SEARCH", "EDIT", "ADD", "DELETE", "EXPORT"],
    "campaign": ["VIEW", "SEARCH", "EDIT", "ADD", "DELETE", "EXPORT"],
    "gift-approval": ["VIEW", "SEARCH", "EDIT", "ADD", "DELETE", "EXPORT"],
    "user-management": ["VIEW", "SEARCH", "EDIT", "ADD", "DELETE", "EXPORT"]
  }
}
```

## 🛠️ Firebase Service Methods

### User Management
```typescript
// Create user
await FirebaseAuthService.createUser({ ...userData, password: 'password123' })

// Update user
await FirebaseAuthService.updateUserData(userId, updates, currentUserId)

// Toggle status  
await FirebaseAuthService.toggleUserStatus(userId, isActive, currentUserId)

// Delete user
await FirebaseAuthService.deleteUser(userId, currentUserId)
```

### Permission Checks
```typescript
// Module permission
FirebaseAuthService.hasPermission(userData, 'vip-profile', 'EDIT')

// Merchant access
FirebaseAuthService.canAccessMerchant(userData, 'MERCHANT_A')

// Currency access
FirebaseAuthService.canAccessCurrency(userData, 'USD')

// Member type access
FirebaseAuthService.canAccessMemberType(userData, 'VIP')
```

## 🎯 Available Permissions

| Permission | Description | Use Case |
|------------|-------------|----------|
| `VIEW` | Read access | See data |
| `SEARCH` | Search capability | Find records |
| `EDIT` | Modify existing | Update records |
| `ADD` | Create new | Add records |
| `DELETE` | Remove records | Delete data |
| `IMPORT` | Bulk import | Load data |
| `EXPORT` | Data export | Generate reports |

## 🏢 Available Merchants
- `MERCHANT_A`, `MERCHANT_B`, `MERCHANT_C`
- `Beta`, `Seed`, `Maple`, `Alpha`, `Tesla`, `Other1`

## 💰 Available Currencies  
- `USD`, `EUR`, `GBP`, `MYR`, `SGD`, `IDR`
- `THB`, `PHP`, `INT`, `Tesla`, `Other1`, `Other2`

## 👥 Member Types
- `NORMAL` - Regular customers
- `VIP` - High-value customers

## 🚨 Common Debugging

### Check User State
```typescript
const { user, userData } = useFirebaseAuth()
console.log('Auth User:', user)
console.log('User Data:', userData)
console.log('Permissions:', userData?.permissions)
```

### Debug Permission Issues
```typescript
// Check specific permission
console.log('Has VIP Edit:', hasPermission('vip-profile', 'EDIT'))

// Check access controls
console.log('Merchants:', userData?.merchants)
console.log('Currencies:', userData?.currencies)  
console.log('Member Access:', userData?.memberAccess)
```

### Firebase Console Checks
1. Go to Firebase Console → Firestore
2. Navigate to `users/{userId}`
3. Verify document structure matches expected format
4. Check `permissions` object for correct module/permission arrays

## ⚡ Performance Tips

1. **Cache Permission Checks**
```tsx
const canEdit = useMemo(() => hasPermission('vip-profile', 'EDIT'), [userData])
```

2. **Batch Permission Guards**
```tsx
const permissions = useMemo(() => ({
  canView: hasPermission('vip-profile', 'VIEW'),
  canEdit: hasPermission('vip-profile', 'EDIT'),
  canDelete: hasPermission('vip-profile', 'DELETE')
}), [userData])
```

3. **Avoid Nested Permission Guards**
```tsx
// ❌ Avoid this
<PermissionGuard module="vip-profile" permission="VIEW">
  <PermissionGuard module="vip-profile" permission="EDIT">
    <EditButton />
  </PermissionGuard>
</PermissionGuard>

// ✅ Do this instead
{hasPermission('vip-profile', 'VIEW') && hasPermission('vip-profile', 'EDIT') && (
  <EditButton />
)}
```

## 🔒 Security Checklist

- [ ] Permission checks implemented at component level
- [ ] Backend validation in place (Firestore rules)
- [ ] Merchant/currency restrictions enforced
- [ ] Member type access controls working
- [ ] Personal info masking configured
- [ ] Audit logging enabled
- [ ] User sessions properly managed
- [ ] Default permissions set for new roles

---

**💡 Tip**: Always implement permission checks at multiple layers (UI, API, Database) for robust security! 