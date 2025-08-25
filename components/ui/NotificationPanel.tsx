'use client'

import React from 'react'
import { X, Check, AlertCircle, Info, Clock, ExternalLink } from 'lucide-react'
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
  const { notifications, markAsRead } = useNotifications()
  const { handleNotificationAction } = useNotificationActions()

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'high':
        return <AlertCircle className="h-4 w-4 text-orange-500" />
      case 'medium':
        return <Info className="h-4 w-4 text-blue-500" />
      default:
        return <Info className="h-4 w-4 text-gray-500" />
    }
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

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'destructive'
      case 'high':
        return 'secondary'
      case 'medium':
        return 'default'
      default:
        return 'outline'
    }
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  const getModuleDisplayName = (module: string) => {
    return module.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  return (
    <Card className="absolute right-0 top-12 w-96 max-h-[600px] overflow-hidden z-50 shadow-xl border-0 bg-white/95 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b bg-gradient-to-r from-gray-50 to-white">
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          Notifications
          {notifications.length > 0 && (
            <Badge variant="secondary" className="ml-2 text-xs">
              {notifications.length}
            </Badge>
          )}
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 hover:bg-gray-100 rounded-full"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="p-0">
        <div className="max-h-[500px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Info className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
              <p className="text-sm text-gray-500">You're all caught up! Check back later for updates.</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "group relative p-4 rounded-lg border border-gray-200 transition-all duration-200 hover:shadow-md hover:border-gray-300",
                    getPriorityColor(notification.priority),
                    !notification.read && "ring-2 ring-blue-100 bg-white"
                  )}
                >
                  {/* Unread indicator */}
                  {!notification.read && (
                    <div className="absolute top-3 left-3 w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}

                  <div className="flex items-start gap-3 pl-4">
                    {/* Priority Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getPriorityIcon(notification.priority)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold text-gray-900 leading-tight">
                          {notification.title}
                        </h4>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => notification.id && markAsRead(notification.id)}
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100 rounded-full"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Message */}
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {notification.message}
                      </p>

                      {/* Metadata */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant={getPriorityBadgeVariant(notification.priority)}
                            className="text-xs px-2 py-1"
                          >
                            {notification.priority}
                          </Badge>
                          <Badge variant="outline" className="text-xs px-2 py-1">
                            {getModuleDisplayName(notification.module)}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            {formatTime(notification.createdAt)}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      {notification.actions && notification.actions.length > 0 && (
                        <div className="flex gap-2 pt-2">
                          {notification.actions.map((action, index) => (
                            <Button
                              key={index}
                              variant="outline"
                              size="sm"
                              onClick={() => handleNotificationAction(notification, action)}
                              className="text-xs h-7 px-3 hover:bg-gray-50"
                            >
                              {action.action === 'navigate' && <ExternalLink className="h-3 w-3 mr-1" />}
                              {action.label}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t bg-gray-50 px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 px-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                onClick={() => {
                  // Mark all as read functionality
                  notifications.forEach(notification => {
                    if (!notification.read && notification.id) {
                      markAsRead(notification.id)
                    }
                  })
                }}
              >
                Mark all as read
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
