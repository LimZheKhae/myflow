'use client'

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

        {/* Notification badge */}
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs font-medium min-w-0 flex items-center justify-center animate-pulse"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}

        {/* Hover effect */}
        <div className="absolute inset-0 rounded-full bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      </Button>

      {/* Notification panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="z-50">
            <NotificationPanel onClose={() => setIsOpen(false)} />
          </div>
        </>
      )}
    </div>
  )
}
