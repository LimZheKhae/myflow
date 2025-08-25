# 🔔 **Global Notification System Implementation Plan**

## 📋 **Overview**

Implement a comprehensive notification system using Firebase Firestore that integrates with the existing gift approval workflow to provide real-time notifications to users based on their roles and permissions. The system features:

- **Module-Based Control**: Users control notifications by module (not by category)
- **Permission-Aware**: Only modules with VIEW permission can be enabled
- **Automatic Setup**: Notification settings are created automatically for new users
- **Robust Error Handling**: Multiple fallback mechanisms ensure system reliability
- **Flexible Type System**: Supports module-specific notification types
- **Real-time Updates**: Live notification updates using Firebase onSnapshot

## 🎯 **System Architecture**

### **Technology Stack**

- **Frontend**: Next.js 14, React, TypeScript
- **Backend**: Firebase Firestore (Realtime Database)
- **Authentication**: Firebase Auth (existing)
- **Real-time**: Firebase onSnapshot listeners
- **UI Components**: TailwindCSS, Shadcn/ui

### **Firebase Collections**

1. **`notifications`** - Main notification documents
2. **`notification_settings`** - User preferences and settings

## 📊 **Database Schema**

### **Flexible Notification Type System**

The notification system uses a flexible type system that allows for module-specific notification types while maintaining organization and type safety.

#### **Notification Type Constants**

```typescript
// types/notification.ts
export const NOTIFICATION_TYPES = {
  // Common types (used across modules)
  COMMON: {
    WORKFLOW: 'workflow',
    SYSTEM: 'system',
    ERROR: 'error',
    BULK: 'bulk',
    MAINTENANCE: 'maintenance',
  },
  
  // Gift Approval Module
  GIFT_APPROVAL: {
    WORKFLOW: 'workflow',
    APPROVAL: 'approval',
    REJECTION: 'rejection',
    BULK_IMPORT: 'bulk_import',
    VALIDATION_ERROR: 'validation_error',
    PROCEED_TO_NEXT: 'proceed_to_next',
    BO_UPLOAD: 'bo_upload',
  },
  
  // VIP Profile Module (future)
  VIP_PROFILE: {
    PROFILE_UPDATE: 'profile_update',
    VIP_CREATION: 'vip_creation',
    STATUS_CHANGE: 'status_change',
    IMPORT_ERROR: 'import_error',
    BULK_UPDATE: 'bulk_update',
  },
  
  // Campaign Module (future)
  CAMPAIGN: {
    CAMPAIGN_LAUNCH: 'campaign_launch',
    CAMPAIGN_PAUSE: 'campaign_pause',
    PERFORMANCE_ALERT: 'performance_alert',
    BUDGET_WARNING: 'budget_warning',
    TARGET_REACHED: 'target_reached',
  },
  
  // User Management Module (future)
  USER_MANAGEMENT: {
    USER_CREATED: 'user_created',
    PERMISSION_CHANGE: 'permission_change',
    ROLE_UPDATE: 'role_update',
    LOGIN_ALERT: 'login_alert',
    ACCOUNT_LOCKED: 'account_locked',
  },
  
  // Reports Module (future)
  REPORTS: {
    REPORT_GENERATED: 'report_generated',
    EXPORT_COMPLETE: 'export_complete',
    SCHEDULED_REPORT: 'scheduled_report',
    DATA_ANALYSIS: 'data_analysis',
  },
} as const

// Type helper for getting all possible notification types
export type NotificationType = 
  | typeof NOTIFICATION_TYPES.COMMON[keyof typeof NOTIFICATION_TYPES.COMMON]
  | typeof NOTIFICATION_TYPES.GIFT_APPROVAL[keyof typeof NOTIFICATION_TYPES.GIFT_APPROVAL]
  | typeof NOTIFICATION_TYPES.VIP_PROFILE[keyof typeof NOTIFICATION_TYPES.VIP_PROFILE]
  | typeof NOTIFICATION_TYPES.CAMPAIGN[keyof typeof NOTIFICATION_TYPES.CAMPAIGN]
  | typeof NOTIFICATION_TYPES.USER_MANAGEMENT[keyof typeof NOTIFICATION_TYPES.USER_MANAGEMENT]
  | typeof NOTIFICATION_TYPES.REPORTS[keyof typeof NOTIFICATION_TYPES.REPORTS]
  | string // Allow any string for future flexibility
```

#### **Benefits of Flexible Type System**

- **Module-Specific Types**: Each module can have its own notification types
- **Type Safety**: TypeScript autocomplete and validation
- **Future-Proof**: Easy to add new types without code changes
- **Organized**: Clear categorization by module
- **Flexible**: Allows any string for custom types

#### **Usage Examples**

```typescript
// Gift Approval Module
await NotificationService.createNotification({
  module: 'gift-approval',
  type: NOTIFICATION_TYPES.GIFT_APPROVAL.APPROVAL, // 'approval'
  title: 'Gift Approved',
  message: 'Gift #123 has been approved'
})

// VIP Profile Module (future)
await NotificationService.createNotification({
  module: 'vip-profile',
  type: NOTIFICATION_TYPES.VIP_PROFILE.PROFILE_UPDATE, // 'profile_update'
  title: 'VIP Profile Updated',
  message: 'VIP profile for John Doe has been updated'
})

// Campaign Module (future)
await NotificationService.createNotification({
  module: 'campaign',
  type: NOTIFICATION_TYPES.CAMPAIGN.CAMPAIGN_LAUNCH, // 'campaign_launch'
  title: 'Campaign Launched',
  message: 'Summer Campaign 2024 has been launched'
})

// Custom type (for future flexibility)
await NotificationService.createNotification({
  module: 'custom-module',
  type: 'custom_notification_type', // Any string works
  title: 'Custom Notification',
  message: 'This is a custom notification type'
})
```

### **Collection: `notifications`**

```typescript
interface Notification {
  // Targeting
  userId: string | null // Specific user or null for global
  targetUserIds: string[] | null // Pre-filtered user list
  roles: string[] // Role-based targeting

  // Content
  module: string // Module name (e.g., "gift-approval")
  type: string // Flexible type - allows any module-specific types (e.g., "workflow", "approval", "profile_update", etc.)
  title: string // Notification title
  message: string // Notification message
  action: string // Action identifier

  // Metadata
  priority: 'low' | 'medium' | 'high' | 'critical'
  read: boolean // Read status
  readAt: Date | null // When read
  readBy: string | null // Who read it

  // Timestamps
  createdAt: Date
  expiresAt: Date | null // Optional expiration

  // Context and Actions
  data: Record<string, any> // Additional context data
  actions: NotificationAction[] // Interactive actions
}
```

### **Notification Targeting & Visibility Rules**

The notification system uses a sophisticated targeting mechanism to control who can see each notification. The visibility is determined by the targeting fields in the following priority order:

#### **1. User-Specific Notifications (`userId` field)**
```typescript
// Only a specific user can see this notification
{
  userId: "user123",
  targetUserIds: null,
  roles: []
}
```
- **Condition**: `userId` is a specific user ID
- **Visibility**: Only that specific user can see the notification
- **Use Case**: Personal notifications, direct messages, user-specific alerts

#### **2. Targeted User List (`targetUserIds` field)**
```typescript
// Only users in the specified list can see this notification
{
  userId: null,
  targetUserIds: ["user1", "user2", "user3"],
  roles: []
}
```
- **Condition**: `targetUserIds` contains an array of user IDs
- **Visibility**: Only users whose IDs are in the array can see the notification
- **Use Case**: Team notifications, group announcements, selective updates

#### **3. Role-Based Notifications (`roles` field)**
```typescript
// Only users with specified roles can see this notification
{
  userId: null,
  targetUserIds: null,
  roles: ["ADMIN", "MANAGER"]
}
```
- **Condition**: `roles` contains an array of role names
- **Visibility**: Only users with any of the specified roles can see the notification
- **Use Case**: Role-specific alerts, permission-based notifications, administrative updates

#### **4. Global Notifications (All targeting fields are null/empty)**
```typescript
// All users can see this notification
{
  userId: null,
  targetUserIds: null,
  roles: []
}
```
- **Condition**: All targeting fields are null or empty arrays
- **Visibility**: All authenticated users can see the notification
- **Use Case**: System announcements, global updates, maintenance notifications

#### **Visibility Logic Implementation**

The notification filtering logic in `getUserNotifications` handles these conditions:

```typescript
// Filter for unread notifications and user access
.filter((notification) => {
  // Check if notification is unread
  if (notification.read) return false
  
  // Check user-specific targeting
  if (notification.userId === userId) return true
  
  // Check global notifications (all targeting fields are null/empty)
  if (notification.userId === null && 
      (!notification.targetUserIds || notification.targetUserIds.length === 0) &&
      (!notification.roles || notification.roles.length === 0)) {
    return true
  }
  
  // Check targeted user list
  if (notification.targetUserIds && notification.targetUserIds.includes(userId)) {
    return true
  }
  
  // Check role-based targeting
  if (notification.roles && notification.roles.includes(userRole)) {
    return true
  }
  
  return false
})
```

#### **Targeting Examples**

```typescript
// Example 1: Personal notification for specific user
await NotificationService.createNotification({
  userId: "user123",
  targetUserIds: null,
  roles: [],
  module: "gift-approval",
  type: "profile_update",
  title: "Profile Updated",
  message: "Your profile has been successfully updated",
  // ... other fields
})

// Example 2: Team notification for specific users
await NotificationService.createNotification({
  userId: null,
  targetUserIds: ["kam1", "kam2", "kam3"],
  roles: [],
  module: "gift-approval",
  type: "team_alert",
  title: "Team Meeting",
  message: "Team meeting scheduled for tomorrow at 10 AM",
  // ... other fields
})

// Example 3: Role-based notification for administrators
await NotificationService.createNotification({
  userId: null,
  targetUserIds: null,
  roles: ["ADMIN", "MANAGER"],
  module: "system",
  type: "maintenance",
  title: "System Maintenance",
  message: "Scheduled maintenance will occur tonight at 2 AM",
  // ... other fields
})

// Example 4: Global notification for all users
await NotificationService.createNotification({
  userId: null,
  targetUserIds: null,
  roles: [],
  module: "system",
  type: "announcement",
  title: "System Update",
  message: "New features have been added to the platform",
  // ... other fields
})
```

#### **Targeting Priority and Best Practices**

1. **Use `userId`** for personal, user-specific notifications
2. **Use `targetUserIds`** for team or group notifications
3. **Use `roles`** for permission-based notifications
4. **Use global targeting** (all null) for system-wide announcements
5. **Avoid mixing targeting types** - choose the most appropriate one
6. **Consider performance** - role-based queries may be slower than user-specific ones

interface NotificationAction {
  label: string
  action: 'navigate' | 'mark_read' | 'dismiss'
  url?: string // For navigate action
}
```

### **Collection: `notification_settings`**

```typescript
interface NotificationSettings {
  userId: string

  // Channel preferences
  email: boolean
  push: boolean
  inApp: boolean

  // Module preferences (only modules user has VIEW permission for)
  modules: {
    'gift-approval': boolean
    'vip-profile': boolean
    'campaign': boolean
    'reports': boolean
    'user-management': boolean
    // Additional modules can be added dynamically
    [key: string]: boolean
  }

  // Timestamps
  createdAt: Date
  updatedAt: Date
}
```

## 🛠️ **Implementation Steps**

### **Phase 1: Firebase Setup & Configuration**

#### **Step 1.1: Firebase Project Configuration**

1. **Create Firebase project** (if not exists)
2. **Enable Firestore Database**
3. **Configure security rules**
4. **Add Firebase config to Next.js**

#### **Step 1.2: Install Dependencies**

```bash
npm install firebase
npm install @firebase/firestore
npm install @firebase/auth
npm install firebase-admin
```

#### **Step 1.3: Firebase Configuration**

```typescript
// lib/firebase.ts (Client-side)
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
```

```typescript
// lib/firebase-admin.ts (Server-side)
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}')

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  })
}

export const adminDb = getFirestore()
```

### **Phase 2: Core Notification Services**

#### **Step 2.1: Client-Side Notification Service**

```typescript
// services/notificationService.ts
import { collection, addDoc, query, orderBy, onSnapshot, updateDoc, doc, getDoc, setDoc, getDocs, writeBatch, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Notification, NotificationSettings } from '@/types/notification'

export class NotificationService {
  // Create notification (client-side)
  static async createNotification(notification: Omit<Notification, 'id' | 'createdAt'>) {
    try {
      const docRef = await addDoc(collection(db, 'notifications'), {
        ...notification,
        createdAt: Timestamp.now(),
        read: false,
        readAt: null,
        readBy: null,
      })
      return docRef.id
    } catch (error) {
      console.error('Error creating notification:', error)
      throw error
    }
  }

  // Get user notifications with real-time updates
  static getUserNotifications(userId: string, userRole: string, callback?: (notifications: Notification[]) => void) {
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'))

    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs
        .map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            readAt: data.readAt?.toDate(),
            expiresAt: data.expiresAt?.toDate(),
          } as Notification
        })
        .filter((notification) => {
          // Check if notification is unread
          if (notification.read) return false
          
          // Check user-specific targeting
          if (notification.userId === userId) return true
          
          // Check global notifications (all targeting fields are null/empty)
          if (notification.userId === null && 
              (!notification.targetUserIds || notification.targetUserIds.length === 0) &&
              (!notification.roles || notification.roles.length === 0)) {
            return true
          }
          
          // Check targeted user list
          if (notification.targetUserIds && notification.targetUserIds.includes(userId)) {
            return true
          }
          
          // Check role-based targeting
          if (notification.roles && notification.roles.includes(userRole)) {
            return true
          }
          
          return false
        })

      if (callback) {
        callback(notifications)
      }
      
      return notifications
    })
  }

  // Mark notification as read
  static async markAsRead(notificationId: string, userId: string) {
    try {
      const docRef = doc(db, 'notifications', notificationId)
      await updateDoc(docRef, {
        read: true,
        readAt: Timestamp.now(),
        readBy: userId,
      })
    } catch (error) {
      console.error('Error marking notification as read:', error)
      throw error
    }
  }

  // Mark all notifications as read
  static async markAllAsRead(userId: string) {
    try {
      const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(q)
      
      const batch = writeBatch(db)
      const unreadNotifications = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(notification => !notification.read && notification.userId === userId)
      
      unreadNotifications.forEach(notification => {
        const docRef = doc(db, 'notifications', notification.id)
        batch.update(docRef, {
          read: true,
          readAt: Timestamp.now(),
          readBy: userId,
        })
      })
      
      await batch.commit()
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      throw error
    }
  }

  // Get notification settings
  static async getNotificationSettings(userId: string): Promise<NotificationSettings> {
    try {
      const docRef = doc(db, 'notification_settings', userId)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const data = docSnap.data()
        return {
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        } as NotificationSettings
      } else {
        // Create default settings if document doesn't exist
        console.log(`Creating default notification settings for user: ${userId}`)
        return await this.createDefaultNotificationSettings(userId)
      }
    } catch (error) {
      console.error('Error getting notification settings:', error)
      // Return default settings as fallback
      return await this.createDefaultNotificationSettings(userId)
    }
  }

  // Create default notification settings
  static async createDefaultNotificationSettings(userId: string): Promise<NotificationSettings> {
    try {
      // Import FirebaseAuthService to check permissions
      const { FirebaseAuthService } = await import('@/lib/firebase-auth')
      
      // Get user data to check permissions
      const userData = await FirebaseAuthService.getUserData(userId)
      
      // Determine which modules the user has VIEW permission for
      const moduleSettings = {
        'gift-approval': userData ? FirebaseAuthService.hasPermission(userData, 'gift-approval', 'VIEW') : false,
        'vip-profile': userData ? FirebaseAuthService.hasPermission(userData, 'vip-profile', 'VIEW') : false,
        'campaign': userData ? FirebaseAuthService.hasPermission(userData, 'campaign', 'VIEW') : false,
        'reports': userData ? FirebaseAuthService.hasPermission(userData, 'reports', 'VIEW') : false,
        'user-management': userData ? FirebaseAuthService.hasPermission(userData, 'user-management', 'VIEW') : false,
      }

      const defaultSettings: NotificationSettings = {
        userId,
        email: true,
        push: true,
        inApp: true,
        modules: moduleSettings,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Save to Firebase
      await setDoc(doc(db, 'notification_settings', userId), {
        ...defaultSettings,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })
      
      console.log(`Default notification settings created for user: ${userId}`, {
        modules: moduleSettings,
        role: userData?.role
      })

      return defaultSettings
    } catch (error) {
      console.error('Error creating default notification settings:', error)
      
      // Return basic default settings if everything fails
      const fallbackSettings: NotificationSettings = {
        userId,
        email: true,
        push: true,
        inApp: true,
        modules: {
          'gift-approval': false,
          'vip-profile': false,
          'campaign': false,
          'reports': false,
          'user-management': false,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Try to save fallback settings
      try {
        await setDoc(doc(db, 'notification_settings', userId), {
          ...fallbackSettings,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        })
      } catch (saveError) {
        console.error('Failed to save fallback notification settings:', saveError)
      }

      return fallbackSettings
    }
  }

  // Update notification settings
  static async updateNotificationSettings(userId: string, settings: Partial<NotificationSettings>) {
    try {
      const docRef = doc(db, 'notification_settings', userId)
      await updateDoc(docRef, {
        ...settings,
        updatedAt: Timestamp.now(),
      })
    } catch (error) {
      console.error('Error updating notification settings:', error)
      throw error
    }
  }
}
```

#### **Step 2.2: Server-Side Notification Service**

```typescript
// services/serverNotificationService.ts
import { adminDb } from '@/lib/firebase-admin'
import { Notification } from '@/types/notification'
import { Timestamp } from 'firebase-admin/firestore'

export class ServerNotificationService {
  // Create notification (server-side - for API routes)
  static async createNotification(notification: Omit<Notification, 'id' | 'createdAt'>) {
    try {
      const docRef = await adminDb.collection('notifications').add({
        ...notification,
        createdAt: Timestamp.now(), // Using Admin SDK's Timestamp
        read: false,
        readAt: null,
        readBy: null,
      })
      return docRef.id
    } catch (error) {
      console.error('Error creating server-side notification:', error)
      throw error
    }
  }
}
```

### **Phase 3: React Context & Hooks**

#### **Step 3.1: Notification Context**

```typescript
// contexts/NotificationContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react'
import { NotificationService } from '@/services/notificationService'
import { useAuth } from '@/contexts/AuthContext'

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  markAsRead: (notificationId: string) => Promise<void>
  createNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => Promise<string>
  settings: NotificationSettings | null
  updateSettings: (settings: Partial<NotificationSettings>) => Promise<void>
  loading: boolean
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id || !user?.role) {
      setLoading(false)
      return
    }

    // Get notification settings
    NotificationService.getNotificationSettings(user.id)
      .then(setSettings)
      .catch(console.error)
      .finally(() => setLoading(false))

    // Subscribe to notifications
    const unsubscribe = NotificationService.getUserNotifications(user.id, user.role, (notifications) => {
      setNotifications(notifications)
    })

    return () => {
      unsubscribe()
    }
  }, [user?.id, user?.role])

  const markAsRead = async (notificationId: string) => {
    if (!user) return
    await NotificationService.markAsRead(notificationId, user.id)
  }

  const createNotification = async (notification: Omit<Notification, 'id' | 'createdAt'>) => {
    return await NotificationService.createNotification(notification)
  }

  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    if (!user?.id) return
    await NotificationService.updateNotificationSettings(user.id, newSettings)
    setSettings((prev) => (prev ? { ...prev, ...newSettings } : null))
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        createNotification,
        settings,
        updateSettings,
        loading,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
```

#### **Step 3.2: Custom Hooks**

```typescript
// hooks/useNotificationActions.ts
import { useNotifications } from '@/contexts/NotificationContext'
import { useRouter } from 'next/navigation'

export const useNotificationActions = () => {
  const { markAsRead } = useNotifications()
  const router = useRouter()

  const handleNotificationAction = async (notification: Notification, action: NotificationAction) => {
    // Mark as read first
    await markAsRead(notification.id)

    // Handle action
    switch (action.action) {
      case 'navigate':
        if (action.url) {
          router.push(action.url)
        }
        break
      case 'mark_read':
        // Already handled above
        break
      case 'dismiss':
        // Notification will be marked as read
        break
    }
  }

  return { handleNotificationAction }
}
```

### **Phase 4: UI Components**

#### **Step 4.1: Enhanced Notification Bell Component**

```typescript
// components/ui/NotificationBell.tsx
import React, { useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useNotifications } from '@/contexts/NotificationContext'
import { NotificationPanel } from './NotificationPanel'

export const NotificationBell: React.FC = () => {
  const { unreadCount } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative h-10 w-10 rounded-full hover:bg-gray-100 transition-all duration-200 group"
        aria-label="Notifications"
      >
        {unreadCount > 0 ? (
          <Bell className="h-5 w-5 text-gray-700 group-hover:text-gray-900 transition-colors" />
        ) : (
          <BellOff className="h-5 w-5 text-gray-500 group-hover:text-gray-700 transition-colors" />
        )}
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs font-medium min-w-0 flex items-center justify-center animate-pulse"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
        <div className="absolute inset-0 rounded-full bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="z-50">
            <NotificationPanel onClose={() => setIsOpen(false)} />
          </div>
        </>
      )}
    </div>
  )
}
```

#### **Step 4.2: Enhanced Notification Panel**

```typescript
// components/ui/NotificationPanel.tsx
import React from 'react'
import { X, Check, AlertCircle, Info, Clock, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNotifications } from '@/contexts/NotificationContext'
import { useNotificationActions } from '@/hooks/useNotificationActions'
import { cn } from '@/lib/utils'

interface NotificationPanelProps {
  onClose: () => void
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ onClose }) => {
  const { notifications, markAsRead, markAllAsRead } = useNotifications()
  const { handleNotificationAction } = useNotificationActions()

  const getModuleDisplayName = (module: string) => {
    const moduleNames: Record<string, string> = {
      'gift-approval': 'Gift Approval',
      'vip-profile': 'VIP Profile',
      'campaign': 'Campaign',
      'reports': 'Reports',
      'user-management': 'User Management',
      'system': 'System',
    }
    return moduleNames[module] || module
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'border-l-red-500 bg-red-50/50'
      case 'high':
        return 'border-l-orange-500 bg-orange-50/50'
      case 'medium':
        return 'border-l-blue-500 bg-blue-50/50'
      default:
        return 'border-l-gray-400 bg-gray-50/50'
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead()
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4">
      <div className="w-full max-w-md">
        <Card className="w-full shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
                {notifications.length > 0 && (
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                    {notifications.length}
                  </Badge>
                )}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/20 transition-colors"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-0 max-h-96 overflow-hidden">
            <div className="max-h-80 overflow-y-auto p-4 space-y-3">
              {notifications.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">All caught up!</p>
                  <p className="text-sm text-gray-400">No new notifications</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "group relative p-4 rounded-lg border border-gray-200 transition-all duration-200 hover:shadow-md hover:border-gray-300",
                      getPriorityColor(notification.priority),
                      !notification.read && "ring-2 ring-blue-100 bg-white"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {notification.priority === 'critical' && (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                        {notification.priority === 'high' && (
                          <AlertCircle className="h-4 w-4 text-orange-500" />
                        )}
                        {notification.priority === 'medium' && (
                          <Info className="h-4 w-4 text-blue-500" />
                        )}
                        {notification.priority === 'low' && (
                          <Info className="h-4 w-4 text-gray-500" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-gray-900 leading-tight">
                              {notification.title}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                              {notification.message}
                            </p>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => notification.id && markAsRead(notification.id)}
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-3">
                          <Badge variant="outline" className="text-xs bg-white/50">
                            {getModuleDisplayName(notification.module)}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs",
                              notification.priority === 'critical' && "border-red-200 text-red-700 bg-red-50",
                              notification.priority === 'high' && "border-orange-200 text-orange-700 bg-orange-50",
                              notification.priority === 'medium' && "border-blue-200 text-blue-700 bg-blue-50",
                              notification.priority === 'low' && "border-gray-200 text-gray-700 bg-gray-50"
                            )}
                          >
                            {notification.priority}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-gray-400 ml-auto">
                            <Clock className="h-3 w-3" />
                            {notification.createdAt && formatTime(notification.createdAt)}
                          </div>
                        </div>

                        {notification.actions && notification.actions.length > 0 && (
                          <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                            {notification.actions.map((action, index) => (
                              <Button
                                key={index}
                                variant="outline"
                                size="sm"
                                onClick={() => handleNotificationAction(notification, action)}
                                className="text-xs h-7 px-2"
                              >
                                {action.label}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {notifications.length > 0 && (
              <div className="border-t border-gray-100 p-3 bg-gray-50/50">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="w-full text-sm text-gray-600 hover:text-gray-900 hover:bg-white"
                >
                  Mark all as read
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

### **Phase 5: Integration with Gift Approval System**

#### **Step 5.1: Reject Notification Implementation**

The notification system has been specifically enhanced to handle reject actions across all gift approval workflows. This includes single reject actions, bulk reject actions, and audit rejections.

##### **Single Reject Notifications**

```typescript
// app/api/gift-approval/update/route.ts
import { ServerNotificationService } from '@/services/serverNotificationService'

// Create notification for reject actions only
if (action === 'reject') {
  try {
    await createRejectNotification(data.giftId, data.rejectReason || 'No reason provided', data.userId, data.userRole || '')
  } catch (notificationError) {
    console.error('Error creating reject notification:', notificationError)
    // Don't fail the request if notification creation fails
  }
}

// Helper function to create reject notifications
async function createRejectNotification(giftId: number, rejectReason: string, userId: string, userRole?: string) {
  try {
    await ServerNotificationService.createNotification({
      userId: null,
      targetUserIds: null,
      roles: ['KAM', 'ADMIN'],
      module: 'gift-approval',
      type: 'rejection',
      title: 'Gift Rejected',
      message: `Gift #${giftId} has been rejected. Reason: ${rejectReason}`,
      action: 'gift_reject',
      priority: 'high',
      read: false, readAt: null, readBy: null,
      data: { giftId, rejectReason, rejectedBy: userId, userRole },
      actions: [{ label: 'View Gift', action: 'navigate', url: `/gift-approval?giftId=${giftId}` }],
      expiresAt: null,
    })
    console.log(`✅ Reject notification created for Gift #${giftId}`)
  } catch (error) {
    console.error('Error creating reject notification:', error)
    throw error
  }
}
```

##### **Bulk Reject Notifications**

```typescript
// app/api/gift-approval/bulk-actions/route.ts
import { ServerNotificationService } from '@/services/serverNotificationService'

// Create notification for reject actions only
if (action.includes('reject')) {
  try {
    await createBulkRejectNotification(giftIds, reason || 'No reason provided', userId)
  } catch (notificationError) {
    console.error('Error creating bulk reject notification:', notificationError)
    // Don't fail the request if notification creation fails
  }
}

// Helper function to create bulk reject notifications
async function createBulkRejectNotification(giftIds: number[], rejectReason: string, userId: string) {
  try {
    await ServerNotificationService.createNotification({
      userId: null, 
      targetUserIds: null, 
      roles: ['KAM', 'ADMIN'],
      module: 'gift-approval', 
      type: 'bulk_rejection', 
      title: 'Bulk Gift Rejection',
      message: `${giftIds.length} gift(s) have been rejected. Reason: ${rejectReason}`,
      action: 'bulk_gift_reject', 
      priority: 'high',
      read: false, readAt: null, readBy: null,
      data: { giftIds, rejectReason, rejectedBy: userId, rejectedCount: giftIds.length },
      actions: [{ label: 'View Gifts', action: 'navigate', url: '/gift-approval' }],
      expiresAt: null,
    })
    console.log(`✅ Bulk reject notification created for ${giftIds.length} gifts`)
  } catch (error) {
    console.error('Error creating bulk reject notification:', error)
    throw error
  }
}
```

##### **Audit Reject Notifications (Bulk Update)**

```typescript
// app/api/gift-approval/bulk-update/route.ts
import { ServerNotificationService } from '@/services/serverNotificationService'

// Create notification for audit rejections (mark as issue)
if (tab === 'audit' && auditDecision === 'issue') {
  try {
    const rejectedGiftIds = data.map(row => parseInt(row.giftId))
    await createBulkUpdateRejectNotification(rejectedGiftIds, userId)
  } catch (notificationError) {
    console.error('Error creating bulk update reject notification:', notificationError)
    // Don't fail the request if notification creation fails
  }
}

// Helper function to create bulk update reject notifications (audit mark as issue)
async function createBulkUpdateRejectNotification(giftIds: number[], userId: string) {
  try {
    await ServerNotificationService.createNotification({
      userId: null, 
      targetUserIds: null, 
      roles: ['KAM', 'ADMIN'],
      module: 'gift-approval', 
      type: 'audit_rejection', 
      title: 'Audit Issues Found',
      message: `${giftIds.length} gift(s) have been marked as issues during audit and returned to KAM Proof`,
      action: 'bulk_audit_reject', 
      priority: 'high',
      read: false, readAt: null, readBy: null,
      data: { giftIds, rejectedBy: userId, rejectedCount: giftIds.length, auditAction: 'mark_as_issue' },
      actions: [{ label: 'View Gifts', action: 'navigate', url: '/gift-approval' }],
      expiresAt: null,
    })
    console.log(`✅ Bulk update reject notification created for ${giftIds.length} gifts`)
  } catch (error) {
    console.error('Error creating bulk update reject notification:', error)
    throw error
  }
}
```

#### **Step 5.2: Server-Side vs Client-Side Architecture**

The notification system now uses a dual-service architecture to handle different contexts:

##### **Server-Side Service (API Routes)**
- **Service**: `ServerNotificationService`
- **SDK**: Firebase Admin SDK
- **Authentication**: Bypasses client auth (admin privileges)
- **Use Case**: Automated notifications from API routes (reject actions, workflow updates)
- **Key Features**:
  - Uses `adminDb` for elevated privileges
  - Imports `Timestamp` from `firebase-admin/firestore`
  - Handles server-side authentication context

##### **Client-Side Service (React Components)**
- **Service**: `NotificationService`
- **SDK**: Regular Firebase SDK
- **Authentication**: Uses current user's auth context
- **Use Case**: Test notifications, direct user actions, real-time updates
- **Key Features**:
  - Uses `db` for client-side operations
  - Imports `Timestamp` from `firebase/firestore`
  - Handles client-side authentication context

#### **Step 5.3: Notification Targeting for Reject Actions**

All reject notifications are targeted to specific roles:

```typescript
// Targeting configuration for reject notifications
const rejectNotificationTargeting = {
  roles: ['KAM', 'ADMIN'], // KAM and Admins receive reject notifications
  priority: 'high', // High priority for immediate attention
  data: {
    // Context data for the rejection
    giftId: number,
    rejectReason: string,
    rejectedBy: string,
    userRole?: string,
  },
  actions: [
    {
      label: 'View Gift',
      action: 'navigate',
      url: `/gift-approval?giftId=${giftId}`,
    },
  ],
}
```

#### **Step 5.4: Error Handling and Fallbacks**

The notification system includes robust error handling:

```typescript
// Error handling pattern for all notification creation
try {
  await ServerNotificationService.createNotification(notificationData)
  console.log(`✅ Notification created successfully`)
} catch (notificationError) {
  console.error('Error creating notification:', notificationError)
  // Don't fail the main request if notification creation fails
  // The gift approval workflow continues even if notification fails
}
```

This ensures that:
- Gift approval workflows are not interrupted by notification failures
- All errors are logged for debugging
- The system gracefully degrades when notifications are unavailable

### **Phase 6: Layout Integration**

#### **Step 6.1: Update Main Layout**

```typescript
// app/layout.tsx (updated)
import { NotificationProvider } from '@/contexts/NotificationContext'
import { NotificationBell } from '@/components/ui/NotificationBell'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <MemberProfileProvider>
            <NotificationProvider>
              <div className="min-h-screen bg-gray-50">
                <header className="bg-white shadow-sm border-b">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                      <div className="flex items-center">
                        <h1 className="text-xl font-semibold text-gray-900">Gift Approval System</h1>
                      </div>
                      <div className="flex items-center space-x-4">
                        <NotificationBell />
                        {/* Other header items */}
                      </div>
                    </div>
                  </div>
                </header>
                <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">{children}</main>
              </div>
            </NotificationProvider>
          </MemberProfileProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
```

## 🔧 **Configuration & Environment Variables**

### **Environment Variables**

```env
# .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### **Firebase Security Rules**

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Notifications collection
    match /notifications/{notificationId} {
      allow read: if request.auth != null && (
        // User-specific notifications
        resource.data.userId == request.auth.uid ||
        // Global notifications (all targeting fields are null/empty)
        (resource.data.userId == null && 
         (resource.data.targetUserIds == null || resource.data.targetUserIds.size() == 0) &&
         (resource.data.roles == null || resource.data.roles.size() == 0)) ||
        // Targeted user list notifications
        (resource.data.targetUserIds != null && request.auth.uid in resource.data.targetUserIds) ||
        // Role-based notifications
        (resource.data.roles != null && request.auth.token.role in resource.data.roles)
      );
      
      allow update: if request.auth != null && (
        // Only allow updating read status for notifications user can see
        resource.data.userId == request.auth.uid ||
        (resource.data.targetUserIds != null && request.auth.uid in resource.data.targetUserIds) ||
        (resource.data.roles != null && request.auth.token.role in resource.data.roles) ||
        // Global notifications can be updated by any authenticated user
        (resource.data.userId == null && 
         (resource.data.targetUserIds == null || resource.data.targetUserIds.size() == 0) &&
         (resource.data.roles == null || resource.data.roles.size() == 0))
      ) && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['read', 'readAt', 'readBy']);
      
      // Allow creation from server-side (API routes) or admin users
      allow create: if (
        // Server-side creation (no auth context)
        request.auth == null ||
        // Admin users can create notifications
        (request.auth != null && request.auth.token.admin == true)
      );
      
      // Only admins can delete notifications
      allow delete: if request.auth != null && request.auth.token.admin == true;
    }

    // Notification settings - users can only access their own settings
    match /notification_settings/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

#### **Security Rules Explanation**

The Firebase security rules enforce the same targeting logic as the application:

1. **User-Specific Access**: Users can only read notifications where `userId` matches their ID
2. **Global Access**: All authenticated users can read notifications where all targeting fields are null/empty
3. **Targeted List Access**: Users can read notifications where their ID is in `targetUserIds`
4. **Role-Based Access**: Users can read notifications where their role is in `roles`
5. **Update Restrictions**: Users can only update the read status of notifications they can see
6. **Server-Side Creation**: API routes can create notifications (no auth context required)
7. **Admin Creation**: Admin users can also create notifications
8. **Settings Privacy**: Users can only access their own notification settings

#### **Server-Side Creation Support**

The security rules now support server-side notification creation from API routes:

```javascript
// Allow creation from server-side (API routes) or admin users
allow create: if (
  // Server-side creation (no auth context)
  request.auth == null ||
  // Admin users can create notifications
  (request.auth != null && request.auth.token.admin == true)
);
```

This allows the `ServerNotificationService` to create notifications from API routes without requiring client-side authentication context.

## 🧪 **Testing Strategy**

### **Unit Tests**

- Notification service functions
- Context providers
- UI components
- Helper functions

### **Integration Tests**

- Firebase integration
- Real-time updates
- Role-based filtering
- Notification creation workflow
- **Targeting logic validation**:
  - User-specific notifications (only target user sees)
  - Targeted user list (only listed users see)
  - Role-based notifications (only users with matching roles see)
  - Global notifications (all authenticated users see)
  - Mixed targeting scenarios

### **E2E Tests**

- Complete notification flow
- User interactions
- Cross-browser compatibility

## 📊 **Performance Considerations**

### **Optimizations**

- **Pagination**: Limit notifications per page
- **Caching**: Cache user settings
- **Debouncing**: Debounce real-time updates
- **Lazy loading**: Load notifications on demand

### **Monitoring**

- **Firebase Analytics**: Track notification usage
- **Error tracking**: Monitor notification failures
- **Performance metrics**: Track response times

## 🚀 **Deployment Checklist**

### **Pre-deployment**

- [ ] Firebase project configured
- [ ] Security rules deployed
- [ ] Environment variables set
- [ ] Dependencies installed
- [ ] Tests passing

### **Post-deployment**

- [ ] Verify real-time updates work
- [ ] Test role-based filtering
- [ ] Check notification creation
- [ ] Validate UI components
- [ ] Monitor error logs

## 🛡️ **Error Handling & Robustness**

### **Automatic Notification Settings Creation**

The notification system automatically handles cases where users don't have notification settings:

```typescript
// Automatic creation flow
1. User logs in → System checks for notification settings
2. If not found → Creates default settings based on user permissions
3. If creation fails → Provides fallback settings
4. If everything fails → System continues with basic defaults
```

### **Permission-Based Module Access**

Notification settings are automatically configured based on user permissions:

```typescript
// Only modules with VIEW permission are enabled by default
const moduleSettings = {
  'gift-approval': userData ? FirebaseAuthService.hasPermission(userData, 'gift-approval', 'VIEW') : false,
  'vip-profile': userData ? FirebaseAuthService.hasPermission(userData, 'vip-profile', 'VIEW') : false,
  'campaign': userData ? FirebaseAuthService.hasPermission(userData, 'campaign', 'VIEW') : false,
  'reports': userData ? FirebaseAuthService.hasPermission(userData, 'reports', 'VIEW') : false,
  'user-management': userData ? FirebaseAuthService.hasPermission(userData, 'user-management', 'VIEW') : false,
}
```

### **Fallback Mechanisms**

The system includes multiple fallback layers:

1. **Primary**: Try to get existing settings
2. **Secondary**: Create new settings with permissions
3. **Tertiary**: Use basic fallback settings
4. **Final**: Continue with minimal defaults

### **Real-time Subscription Safety**

Notifications are safely subscribed with proper error handling:

```typescript
// Safe subscription with callback
const unsubscribe = NotificationService.getUserNotifications(user.id, user.role, (notifications) => {
  setNotifications(notifications)
})

// Proper cleanup
return () => {
  unsubscribe()
}
```

## 📈 **Future Enhancements**

### **Phase 2 Features**

- **Email notifications** via Firebase Functions
- **Push notifications** for mobile
- **Notification preferences** UI
- **Notification history** page
- **Advanced filtering** and search

### **Phase 3 Features**

- **Notification templates** system
- **Scheduled notifications**
- **Notification analytics** dashboard
- **Custom notification channels**
- **Multi-language support**

## 🔧 **Extending the Notification System**

### **Adding New Modules**

The notification system is designed to be easily extensible for new modules. Here's how to add support for a new module:

#### **Step 1: Add Module Types**

```typescript
// types/notification.ts
export const NOTIFICATION_TYPES = {
  // ... existing types
  
  // New Module
  NEW_MODULE: {
    CUSTOM_ACTION: 'custom_action',
    STATUS_UPDATE: 'status_update',
    IMPORT_COMPLETE: 'import_complete',
    VALIDATION_ERROR: 'validation_error',
  },
} as const
```

#### **Step 2: Update User Settings**

```typescript
// lib/firebase-auth.ts - createDefaultNotificationSettings()
const modules = [
  'gift-approval', 
  'user-management', 
  'reports', 
  'system',
  'new-module', // Add new module
]

modules.forEach(module => {
  moduleSettings[module] = this.hasPermission(userData, module, 'VIEW')
})
```

#### **Step 3: Create Module-Specific Notifications**

```typescript
// In your new module's API routes
await NotificationService.createNotification({
  userId: null,
  targetUserIds: null,
  roles: ['ADMIN', 'MANAGER'],
  module: 'new-module',
  type: NOTIFICATION_TYPES.NEW_MODULE.CUSTOM_ACTION,
  title: 'Custom Action Completed',
  message: 'Custom action has been completed successfully',
  action: 'custom_action',
  priority: 'medium',
  data: {
    actionId: 'action_123',
    completedBy: userId,
  },
  actions: [
    {
      label: 'View Details',
      action: 'navigate',
      url: '/new-module/action_123',
    },
  ],
  expiresAt: null,
})
```

#### **Step 4: Update Profile Page (Optional)**

The profile page will automatically show the new module in notification settings since it uses dynamic rendering.

### **Adding New Notification Types**

To add new notification types to existing modules:

```typescript
// types/notification.ts
export const NOTIFICATION_TYPES = {
  GIFT_APPROVAL: {
    // ... existing types
    NEW_TYPE: 'new_type', // Add new type
  },
} as const
```

### **Module-Specific Notification Examples**

#### **VIP Profile Module**
```typescript
// VIP profile update notification
await NotificationService.createNotification({
  module: 'vip-profile',
  type: NOTIFICATION_TYPES.VIP_PROFILE.PROFILE_UPDATE,
  title: 'VIP Profile Updated',
  message: `VIP profile for ${vipName} has been updated`,
  priority: 'medium',
  data: { vipId, updatedBy: userId },
  actions: [
    {
      label: 'View Profile',
      action: 'navigate',
      url: `/vip-profile/${vipId}`,
    },
  ],
})
```

#### **Campaign Module**
```typescript
// Campaign launch notification
await NotificationService.createNotification({
  module: 'campaign',
  type: NOTIFICATION_TYPES.CAMPAIGN.CAMPAIGN_LAUNCH,
  title: 'Campaign Launched',
  message: `${campaignName} has been launched successfully`,
  priority: 'high',
  data: { campaignId, launchedBy: userId },
  actions: [
    {
      label: 'View Campaign',
      action: 'navigate',
      url: `/campaigns/${campaignId}`,
    },
  ],
})
```

#### **User Management Module**
```typescript
// User creation notification
await NotificationService.createNotification({
  module: 'user-management',
  type: NOTIFICATION_TYPES.USER_MANAGEMENT.USER_CREATED,
  title: 'New User Created',
  message: `User ${userEmail} has been created with role ${userRole}`,
  priority: 'medium',
  data: { userId, createdBy: adminId },
  actions: [
    {
      label: 'View User',
      action: 'navigate',
      url: `/user-management/${userId}`,
    },
  ],
})
```

## 🎯 **Success Metrics**

### **Technical Metrics**

- **Real-time latency**: < 500ms
- **Notification delivery rate**: > 99%
- **Error rate**: < 1%
- **User engagement**: > 80% read rate

### **Business Metrics**

- **User adoption**: > 90% of users enable notifications
- **Workflow efficiency**: Reduced approval time by 20%
- **User satisfaction**: > 4.5/5 rating
- **System reliability**: 99.9% uptime

## ✅ **Current Implementation Status**

### **Completed Features**

- ✅ **Dual-Service Architecture**: Client-side and server-side notification services
- ✅ **Enhanced UI/UX**: Modern notification panel with improved visual design
- ✅ **Reject Notifications**: Comprehensive reject notification system for all gift approval workflows
- ✅ **Real-time Updates**: Live notification updates using Firebase onSnapshot
- ✅ **Error Handling**: Robust error handling with graceful degradation
- ✅ **Type Safety**: Full TypeScript support with flexible notification types
- ✅ **Permission-Based Access**: Automatic module enabling based on VIEW permissions
- ✅ **Automatic Settings**: Default notification settings creation for new users

### **Server-Side Features**

- ✅ **ServerNotificationService**: Firebase Admin SDK integration for API routes
- ✅ **Reject Action Notifications**: Single, bulk, and audit reject notifications
- ✅ **Targeted Notifications**: Role-based targeting for KAM and ADMIN users
- ✅ **Error Isolation**: Notification failures don't interrupt main workflows
- ✅ **Timestamp Compatibility**: Proper Firebase Admin SDK Timestamp handling

### **Client-Side Features**

- ✅ **NotificationService**: Client-side Firebase SDK integration
- ✅ **Enhanced UI Components**: Modern notification bell and panel
- ✅ **Real-time Subscriptions**: Live notification updates
- ✅ **Bulk Actions**: Mark all as read functionality
- ✅ **Smart Time Formatting**: Relative time display (e.g., "2m ago")
- ✅ **Priority-Based Styling**: Color-coded notifications by priority

### **Integration Points**

- ✅ **Gift Approval System**: Reject notifications for all workflow actions
- ✅ **API Routes**: Server-side notification creation from all relevant endpoints
- ✅ **User Authentication**: Automatic settings creation on first login
- ✅ **Layout Integration**: Enhanced notification bell in header component
- ✅ **Profile Management**: Settings management in profile page

### **Testing & Validation**

- ✅ **Error Scenarios**: Handles missing notification settings gracefully
- ✅ **Permission Scenarios**: Only shows modules user has access to
- ✅ **Real-time Updates**: Live notification updates working
- ✅ **UI Responsiveness**: Loading states and error handling in UI
- ✅ **Server-Side Integration**: API route notification creation working
- ✅ **Firebase Compatibility**: Proper Admin SDK and client SDK separation

---

**This implementation provides a comprehensive, scalable notification system that integrates seamlessly with your existing gift approval workflow while maintaining security, performance, and user experience standards. The system features:**

- **Dual-Service Architecture**: Separate client-side and server-side services for optimal performance and security
- **Enhanced UI/UX**: Modern, responsive notification interface with priority-based styling
- **Comprehensive Reject Notifications**: Automated notifications for all reject actions across the gift approval workflow
- **Robust Error Handling**: Graceful degradation ensures main workflows continue even if notifications fail
- **Real-time Updates**: Live notification delivery using Firebase onSnapshot
- **Role-Based Targeting**: Intelligent notification delivery based on user roles and permissions
- **Automatic Setup**: Seamless integration with existing user authentication and permission systems

**The system is production-ready with enterprise-grade reliability, security, and user experience standards.**
