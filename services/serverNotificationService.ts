import { adminDb } from '@/lib/firebase-admin'
import { Notification } from '@/types/notification'
import { Timestamp } from 'firebase-admin/firestore'

export class ServerNotificationService {
  // Create notification (server-side - for API routes)
  static async createNotification(notification: Omit<Notification, 'id' | 'createdAt'>) {
    try {
      const docRef = await adminDb.collection('notifications').add({
        ...notification,
        createdAt: Timestamp.now(),
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
