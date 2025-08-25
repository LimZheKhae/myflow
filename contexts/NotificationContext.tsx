'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { NotificationService } from '@/services/notificationService'
import { Notification, NotificationSettings } from '@/types/notification'
import { useFirebaseAuth as useAuth } from '@/contexts/firebase-auth-context'

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

interface NotificationProviderProps {
  children: React.ReactNode
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
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
    if (!user?.id) return
    await NotificationService.markAsRead(notificationId, user.id)
  }

  const createNotification = async (notification: Omit<Notification, 'id' | 'createdAt'>) => {
    return await NotificationService.createNotification(notification as any)
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
