# 🏢 MyFlow - Professional CRM Platform with Advanced RBAC

A comprehensive Customer Relationship Management (CRM) platform built with Next.js 15, React 19, and Firebase, featuring an advanced Role-Based Access Control (RBAC) system.

## 🚀 Features

### Core Modules
- **👑 VIP Profile Management** - Manage high-value customer profiles
- **📊 Campaign Management** - Marketing campaign creation and tracking  
- **🎁 Gift Approval System** - Gift request workflow management
- **👥 User Management** - System administration and user permissions

### Advanced RBAC System
- ✅ **Granular Permissions** - MODULE × PERMISSION matrix (VIEW, SEARCH, EDIT, ADD, DELETE, IMPORT, EXPORT)
- ✅ **Merchant-based Access Control** - Restrict users to specific merchants
- ✅ **Currency Restrictions** - Control which currencies users can work with
- ✅ **Member Data Visibility** - Separate access for Normal vs VIP customers
- ✅ **Personal Info Masking** - Protect sensitive customer data
- ✅ **Real-time Permission Enforcement** - Dynamic UI based on user permissions
- ✅ **Firebase Integration** - Secure backend with Firestore security rules

## 🛡️ RBAC Documentation

### 📚 Comprehensive Documentation
- **[RBAC_DOCUMENTATION.md](./RBAC_DOCUMENTATION.md)** - Complete RBAC system guide
  - Core concepts and architecture
  - Implementation patterns
  - Security best practices
  - Adding new modules and permissions
  - Firebase integration
  - Troubleshooting guide

### ⚡ Quick Reference  
- **[RBAC_QUICK_REFERENCE.md](./RBAC_QUICK_REFERENCE.md)** - Developer quick reference
  - Common code snippets
  - Permission templates
  - Debugging tips
  - Performance optimizations

## 🏗️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Firebase (Auth, Firestore, Security Rules)
- **UI**: Tailwind CSS, shadcn/ui components
- **State Management**: React Context + Firebase Auth
- **Notifications**: Sonner (toast notifications)

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ 
- Firebase project setup
- Package manager (npm, yarn, pnpm, or bun)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd CRM2
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
# or  
pnpm install
# or
bun install
```

3. **Configure Firebase**
```bash
# Copy environment template
cp .env.local.example .env.local

# Add your Firebase configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

4. **Run the development server**
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

5. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

### Demo Credentials

**Admin User:**
- Email: `admin@crm.com`
- Password: `admin123`

**Manager User:**  
- Email: `manager@crm.com`
- Password: `manager123`

**KAM User:**
- Email: `kam@crm.com`
- Password: `kam123`

## 🔐 RBAC System Overview

### User Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| **ADMIN** | System administrator | Full access to all modules and data |
| **MANAGER** | Department manager | Broad access with some restrictions |
| **KAM** | Key Account Manager | Customer-focused modules, VIP access |
| **PROCUREMENT** | Procurement specialist | Procurement and approval workflows |
| **AUDIT** | Auditor | Read-only access for compliance |

### Permission Matrix

| Module | VIEW | SEARCH | EDIT | ADD | DELETE | IMPORT | EXPORT |
|--------|------|--------|------|-----|--------|---------|---------|
| VIP Profile | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ |
| Campaign | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ |  
| Gift Approval | ✅ | ✅ | ✅ | ✅ | ⚠️ | ❌ | ✅ |
| User Management | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ❌ | ⚠️ |

- ✅ = Available for role assignment
- ⚠️ = Admin/Manager only (typically)
- ❌ = Not applicable

### Access Controls

#### Merchant Access
Users can be restricted to specific merchants:
- `MERCHANT_A`, `MERCHANT_B`, `MERCHANT_C`
- `Beta`, `Seed`, `Maple`, `Alpha`, `Tesla`, `Other1`

#### Currency Access  
Control which currencies users can work with:
- `USD`, `EUR`, `GBP`, `MYR`, `SGD`, `IDR`
- `THB`, `PHP`, `INT`, `Tesla`, `Other1`, `Other2`

#### Member Data Visibility
- **Normal Only** - Regular customers
- **VIP Only** - High-value customers  
- **Both** - All customer types

## 🛠️ Development

### Adding New Modules

1. **Update module configuration**
```typescript
// app/user-management/page.tsx
const MODULES = [
  // ... existing modules
  { id: 'new-module', name: 'New Module' }
]
```

2. **Create module pages**
```typescript
// app/new-module/page.tsx
export default function NewModulePage() {
  const { hasPermission } = useFirebaseAuth()
  
  if (!hasPermission('new-module', 'VIEW')) {
    return <AccessDenied />
  }
  
  return <ModuleContent />
}
```

3. **Update navigation**
```typescript
// components/layout/sidebar.tsx
{
  name: 'New Module',
  href: '/new-module',
  icon: Icon,
  module: 'new-module', 
  permission: 'VIEW'
}
```

### Permission Implementation

```tsx
import { PermissionGuard } from '@/components/common/permission-guard'

// Wrap components requiring permissions
<PermissionGuard module="vip-profile" permission="EDIT">
  <EditButton />
</PermissionGuard>

// Or use hooks for conditional logic
const { hasPermission } = useFirebaseAuth()
const canEdit = hasPermission('vip-profile', 'EDIT')
```

## 📁 Project Structure

```
CRM2/
├── app/                          # Next.js App Router
│   ├── (dashboard)/              # Dashboard group (removed)
│   ├── campaign/                 # Campaign management
│   ├── gift-approval/            # Gift approval system  
│   ├── user-management/          # User administration
│   ├── vip-profile/              # VIP customer profiles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Dashboard home
├── components/                   # Reusable components
│   ├── auth/                     # Authentication components
│   ├── common/                   # Common components (PermissionGuard)
│   ├── layout/                   # Layout components (Header, Sidebar)
│   └── ui/                       # shadcn/ui components
├── contexts/                     # React contexts
│   └── firebase-auth-context.tsx # Firebase auth state
├── lib/                          # Utility libraries
│   ├── firebase.ts               # Firebase configuration
│   ├── firebase-auth.ts          # Firebase auth service
│   └── utils.ts                  # General utilities
├── types/                        # TypeScript type definitions
│   ├── auth.ts                   # Auth-related types
│   └── firebase.ts               # Firebase document types
├── RBAC_DOCUMENTATION.md         # Comprehensive RBAC guide
├── RBAC_QUICK_REFERENCE.md       # Developer quick reference
└── README.md                     # This file
```

## 🧪 Testing

### Testing User Permissions

1. **Login as different users** to test role-based access
2. **Check permission guards** ensure UI elements show/hide correctly
3. **Verify Firebase rules** test backend security enforcement
4. **Test access controls** confirm merchant/currency restrictions work

### Debug Permission Issues

```typescript
// Debug user state
const { user, userData } = useFirebaseAuth()
console.log('Current user:', userData)
console.log('Permissions:', userData?.permissions)

// Check specific permissions
console.log('Can edit VIP:', hasPermission('vip-profile', 'EDIT'))
```

## 🚀 Deployment

1. **Build the application**
```bash
npm run build
```

2. **Deploy Firestore rules**
```bash
firebase deploy --only firestore:rules
```

3. **Deploy to your preferred platform**
- Vercel (recommended for Next.js)
- Firebase Hosting
- Netlify
- AWS Amplify

## 🤝 Contributing

1. Read the [RBAC Documentation](./RBAC_DOCUMENTATION.md)
2. Review the [Quick Reference](./RBAC_QUICK_REFERENCE.md)
3. Follow the established patterns for permission checks
4. Ensure all new features include appropriate RBAC controls
5. Test with different user roles before submitting

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For questions about the RBAC system:
1. Check the [RBAC Documentation](./RBAC_DOCUMENTATION.md)
2. Review the [Quick Reference](./RBAC_QUICK_REFERENCE.md)  
3. Look at existing implementations in the codebase
4. Open an issue with specific details

---

**Built with ❤️ using Next.js 15, React 19, and Firebase** 