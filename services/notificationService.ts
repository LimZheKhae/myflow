import { collection, addDoc, query, where, orderBy, onSnapshot, updateDoc, doc, getDoc, getDocs, setDoc, writeBatch, Timestamp } from 'firebase/firestore'
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
    console.log('🔔 [FRONTEND] Getting notifications for user:', { userId, userRole })
    
    // Temporary: Remove the where clause to avoid index requirement
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'))

    return onSnapshot(q, (snapshot) => {
      console.log('🔔 [FRONTEND] Firebase snapshot received:', snapshot.docs.length, 'documents')
      
      const allNotifications = snapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          readAt: data.readAt?.toDate(),
          expiresAt: data.expiresAt?.toDate(),
        } as Notification
      })
      
      console.log('🔔 [FRONTEND] All notifications before filtering:', 
        allNotifications.map(n => ({
          id: n.id,
          title: n.title,
          read: n.read,
          userId: n.userId,
          targetUserIds: n.targetUserIds,
          roles: n.roles,
          type: n.type
        }))
      )

      const notifications = allNotifications.filter((notification) => {
        // Check each condition separately for debugging
        const isUnread = !notification.read
        const isForUser = notification.userId === userId
        const isGlobal = notification.userId === null
        const isTargeted = notification.targetUserIds && notification.targetUserIds.includes(userId)
        const isRoleBased = notification.roles && notification.roles.includes(userRole)
        const isGlobalRole = notification.roles && notification.roles.length === 0
        
        const shouldShow = isUnread && (isForUser || isGlobal || isTargeted || isRoleBased || isGlobalRole)
        
        console.log(`🔔 [FRONTEND] Notification ${notification.id} (${notification.title}):`, {
          isUnread,
          isForUser,
          isGlobal,
          isTargeted,
          isRoleBased,
          isGlobalRole,
          shouldShow,
          userRole,
          notificationRoles: notification.roles,
          notificationUserId: notification.userId,
          notificationTargetUserIds: notification.targetUserIds,
          currentUserId: userId
        })
        
        return shouldShow
      })
      
      console.log('🔔 [FRONTEND] Filtered notifications:', notifications.length, 'notifications')

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
  static async updateNotificationSettings(userId: string, updates: Partial<NotificationSettings>): Promise<void> {
    try {
      const docRef = doc(db, 'notification_settings', userId)
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      })
    } catch (error) {
      console.error('Error updating notification settings:', error)
      throw error
    }
  }

  // Get all user notifications (for admin purposes)
  static async getAllUserNotifications(userId: string, userRole: string): Promise<Notification[]> {
    try {
      const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(q)
      
      return snapshot.docs
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
        .filter(
          (notification) =>
            notification.userId === userId || 
            notification.userId === null || 
            (notification.targetUserIds && notification.targetUserIds.includes(userId)) || 
            (notification.roles && notification.roles.includes(userRole)) || 
            (notification.roles && notification.roles.length === 0)
        )
    } catch (error) {
      console.error('Error getting all user notifications:', error)
      return []
    }
  }

  // Delete expired notifications
  static async deleteExpiredNotifications(): Promise<void> {
    try {
      const now = Timestamp.now()
      const q = query(
        collection(db, 'notifications'),
        where('expiresAt', '<', now)
      )
      
      const snapshot = await getDocs(q)
      const batch = writeBatch(db)
      
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref)
      })
      
      await batch.commit()
      console.log(`Deleted ${snapshot.docs.length} expired notifications`)
    } catch (error) {
      console.error('Error deleting expired notifications:', error)
    }
  }
}
