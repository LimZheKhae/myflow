# 🔥 Firebase Integration Guide for MyFlow

## Overview

This guide provides a comprehensive plan for integrating Firebase into MyFlow with the 4 main modules: **VIP Profile**, **Campaign**, **Gift Approval**, and **User Management**. The integration includes Firebase Authentication, Firestore database, and advanced Role-Based Access Control (RBAC).

## 🏗️ Architecture Overview

### Current Implementation Status

✅ **Complete**: Firebase Configuration & Services  
✅ **Complete**: Authentication System  
✅ **Complete**: Firestore Security Rules  
✅ **Complete**: Database Schema Design  
🔄 **In Progress**: Module Migration  
⏳ **Pending**: Real-time Features  
⏳ **Pending**: Data Migration

### Technology Stack

- **Authentication**: Firebase Auth
- **Database**: Cloud Firestore
- **Storage**: Firebase Storage (for files)
- **Security**: Firestore Security Rules
- **Real-time**: Firestore Real-time Listeners

## 📁 Project Structure

```
lib/
├── firebase.ts                 # Firebase configuration
├── firebase-auth.ts           # Authentication service
├── firebase-services.ts       # CRUD services for all modules
└── rbac-utils.ts              # RBAC utilities

contexts/
├── firebase-auth-context.tsx  # Firebase auth context
└── auth-context.tsx          # Original auth context (backup)

types/
├── firebase.ts               # Firebase-specific types
├── auth.ts                   # Authentication types
└── rbac.ts                   # RBAC types

components/
└── auth/
    ├── firebase-login-form.tsx   # New Firebase login
    └── login-form.tsx           # Original login (backup)

app/
├── vip-profile/
│   └── firebase-vip-page.tsx   # Firebase-powered VIP page
├── campaign/
├── gift-approval/
└── user-management/

firestore.rules                 # Firestore security rules
.env.local.example              # Environment variables template
```

## 🚀 Setup Instructions

### 1. Firebase Project Setup

1. **Create Firebase Project**

   ```bash
   # Visit https://console.firebase.google.com
   # Create a new project: "crm-system"
   # Enable Authentication and Firestore
   ```

2. **Configure Authentication**

   - Enable Email/Password authentication
   - Set up authorized domains
   - Configure password requirements

3. **Set up Firestore Database**
   - Create database in production mode
   - Deploy security rules from `firestore.rules`

### 2. Environment Configuration

1. **Copy environment template**

   ```bash
   cp .env.local.example .env.local
   ```

2. **Add Firebase configuration**
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

### 3. Update Application Entry Points

1. **Update root layout** (`app/layout.tsx`)

   ```tsx
   import { FirebaseAuthProvider } from "@/contexts/firebase-auth-context";

   export default function RootLayout({ children }) {
     return (
       <html lang="en">
         <body>
           <FirebaseAuthProvider>{children}</FirebaseAuthProvider>
         </body>
       </html>
     );
   }
   ```

2. **Update dashboard layout** (`app/(dashboard)/layout.tsx`)

   ```tsx
   import { useFirebaseAuth } from "@/contexts/firebase-auth-context";
   import FirebaseLoginForm from "@/components/auth/firebase-login-form";

   export default function DashboardLayout({ children }) {
     const { user, loading } = useFirebaseAuth();

     if (loading) return <div>Loading...</div>;
     if (!user) return <FirebaseLoginForm />;

     return (
       <div className="flex h-screen bg-gray-50">
         <Sidebar />
         <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
       </div>
     );
   }
   ```

## 📊 Database Schema

### Collections Structure

```
📁 users/
├── {userId} (FirebaseUser)
│   ├── id: string
│   ├── email: string
│   ├── name: string
│   ├── role: UserRole
│   ├── merchants: string[]
│   ├── currencies: string[]
│   ├── permissions: Record<string, Permission[]>
│   └── ...

📁 vip_profiles/
├── {profileId} (FirebaseVIPProfile)
│   ├── id: string
│   ├── name: string
│   ├── email: string
│   ├── assignedKAM: string
│   └── notes/ (subcollection)
│       └── {noteId} (VIPNote)

📁 campaigns/
├── {campaignId} (FirebaseCampaign)
│   ├── id: string
│   ├── name: string
│   ├── type: string
│   ├── targets: CampaignTarget[]
│   └── ...

📁 gift_requests/
├── {requestId} (FirebaseGiftRequest)
│   ├── id: string
│   ├── playerName: string
│   ├── status: string
│   ├── approvalWorkflow: GiftApprovalStep[]
│   └── ...

📁 activity_logs/
├── {logId} (FirebaseActivityLog)
│   ├── userId: string
│   ├── action: string
│   ├── module: string
│   └── ...
```

## 🔐 Security & RBAC

### Role-Based Access Control

```typescript
// User Roles
type UserRole = "ADMIN" | "MANAGER" | "KAM" | "PROCUREMENT" | "AUDIT";

// Permissions per Module
const PERMISSION_MATRIX = {
  ADMIN: {
    "vip-profile": ["VIEW", "SEARCH", "EDIT", "ADD", "DELETE", "EXPORT"],
    campaign: ["VIEW", "SEARCH", "EDIT", "ADD", "DELETE", "EXPORT"],
    "gift-approval": ["VIEW", "SEARCH", "EDIT", "ADD", "DELETE", "EXPORT"],
    "user-management": ["VIEW", "SEARCH", "EDIT", "ADD", "DELETE", "EXPORT"],
  },
  KAM: {
    "vip-profile": ["VIEW", "SEARCH", "EDIT", "ADD"],
    campaign: ["VIEW", "SEARCH", "EDIT", "ADD", "DELETE"],
    "gift-approval": ["VIEW", "ADD"],
  },
  // ... other roles
};
```

### Access Restrictions

- **Merchant-based**: Users can only access data from their assigned merchants
- **Currency-based**: Users can only view data in their assigned currencies
- **Ownership-based**: KAMs can only manage their own VIP profiles and campaigns
- **Department-based**: Additional filtering by department/region

## 📱 Module Implementation

### 1. VIP Profile Module ✅

**Firebase Services Used:**

- `VIPProfileService.createVIPProfile()`
- `VIPProfileService.getVIPProfiles()`
- `VIPProfileService.updateVIPProfile()`
- `VIPProfileService.addVIPNote()`
- Real-time listeners for live updates

**Key Features:**

- Real-time profile updates
- Note management with privacy controls
- Activity logging
- Advanced filtering and search
- Merchant/currency access control

### 2. Campaign Module

**Implementation Plan:**

- Migrate to `CampaignService`
- Add real-time campaign status updates
- Implement campaign target management
- Add campaign analytics and reporting

### 3. Gift Approval Module

**Implementation Plan:**

- Migrate to `GiftRequestService`
- Implement approval workflow
- Add procurement status tracking
- Real-time approval notifications

### 4. User Management Module

**Implementation Plan:**

- Use `FirebaseAuthService` for user CRUD
- Implement permission matrix management
- Add user activity monitoring
- Role-based user filtering

## 🔄 Migration Strategy

### Phase 1: Authentication (✅ Complete)

- [x] Firebase Auth setup
- [x] User authentication flow
- [x] Session management
- [x] Permission checking

### Phase 2: VIP Profiles (🔄 In Progress)

- [x] Service layer implementation
- [x] Real-time data sync
- [x] UI components
- [ ] Data migration from mock data
- [ ] Testing and validation

### Phase 3: Campaigns

- [ ] Service layer migration
- [ ] Campaign workflow implementation
- [ ] Target management
- [ ] Analytics integration

### Phase 4: Gift Approval

- [ ] Approval workflow
- [ ] Procurement integration
- [ ] Notification system
- [ ] Audit trail

### Phase 5: User Management

- [ ] Complete user CRUD operations
- [ ] Permission matrix UI
- [ ] Bulk operations
- [ ] User activity dashboard

### Phase 6: Advanced Features

- [ ] Real-time notifications
- [ ] File upload/management
- [ ] Data export/import
- [ ] Advanced analytics

## 🧪 Testing Strategy

### Unit Tests

```typescript
// Example test for VIP Profile service
describe("VIPProfileService", () => {
  test("should create VIP profile with proper permissions", async () => {
    const mockUser = { id: "user1", role: "KAM", merchants: ["MERCHANT_A"] };
    const vipData = { name: "Test VIP", merchant: "MERCHANT_A" };

    const result = await VIPProfileService.createVIPProfile(vipData, mockUser.id);
    expect(result).toBeDefined();
  });
});
```

### Integration Tests

- Authentication flow
- Permission enforcement
- Data access restrictions
- Real-time updates

## 📊 Monitoring & Analytics

### Firebase Analytics

- User engagement tracking
- Feature usage metrics
- Performance monitoring
- Error tracking

### Custom Metrics

- Module usage statistics
- Permission violations
- Activity log analysis
- User behavior patterns

## 🚀 Deployment

### Development Environment

```bash
# Install dependencies
pnpm install

# Start Firebase emulators
firebase emulators:start

# Start development server
pnpm dev
```

### Production Deployment

```bash
# Build application
pnpm build

# Deploy to Vercel/Firebase Hosting
vercel deploy
# or
firebase deploy
```

## 🔧 Troubleshooting

### Common Issues

1. **Authentication Errors**

   - Verify Firebase config
   - Check authorized domains
   - Validate user credentials

2. **Permission Denied**

   - Review Firestore security rules
   - Check user permissions
   - Validate merchant/currency access

3. **Real-time Issues**
   - Verify network connectivity
   - Check listener setup
   - Monitor Firestore usage

### Debug Tools

- Firebase Console
- Browser DevTools
- Firestore Debug Mode
- Real-time Database Profiler

## 📈 Performance Optimization

### Best Practices

- Use composite indexes for complex queries
- Implement pagination for large datasets
- Cache frequently accessed data
- Optimize security rule complexity
- Monitor read/write operations

### Firestore Optimization

```typescript
// Use indexes for complex queries
const q = query(collection(db, "vip_profiles"), where("merchant", "==", merchant), where("currency", "==", currency), where("status", "==", "Active"), orderBy("updatedAt", "desc"), limit(20));
```

## 🤝 Contributing

### Development Workflow

1. Create feature branch
2. Implement changes
3. Add tests
4. Update documentation
5. Submit pull request

### Code Standards

- TypeScript for type safety
- ESLint for code quality
- Prettier for formatting
- Jest for testing

## 📞 Support

For questions or issues:

- Check Firebase documentation
- Review Firestore guides
- Consult Next.js documentation
- Contact development team

---

## 🎯 Next Steps

1. **Complete VIP Profile Migration**

   - Finish UI implementation
   - Add data validation
   - Implement error handling

2. **Implement Campaign Module**

   - Create Firebase services
   - Build campaign UI
   - Add workflow management

3. **Add Real-time Features**

   - Notification system
   - Live updates
   - Collaborative editing

4. **Enhance Security**
   - Audit access controls
   - Implement rate limiting
   - Add security monitoring

This integration provides a scalable, secure, and feature-rich MyFlow platform powered by Firebase! 🚀
