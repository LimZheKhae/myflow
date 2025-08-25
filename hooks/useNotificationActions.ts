'use client'

import { useNotifications } from '@/contexts/NotificationContext'
import { useRouter } from 'next/navigation'
import { Notification, NotificationAction } from '@/types/notification'

export const useNotificationActions = () => {
  const { markAsRead } = useNotifications()
  const router = useRouter()

  const handleNotificationAction = async (notification: Notification, action: NotificationAction) => {
    try {
      // Mark as read first
      if (notification.id) {
        await markAsRead(notification.id)
      }

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
        default:
          console.warn('Unknown notification action:', action.action)
      }
    } catch (error) {
      console.error('Error handling notification action:', error)
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId)
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleMarkAllAsRead = async (notificationIds: string[]) => {
    try {
      await Promise.all(notificationIds.map((id) => markAsRead(id)))
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  return {
    handleNotificationAction,
    handleMarkAsRead,
    handleMarkAllAsRead,
  }
}
