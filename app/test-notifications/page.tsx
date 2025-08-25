'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createTestNotification, createGiftApprovalNotification } from '@/lib/testNotifications'
import { useNotifications } from '@/contexts/NotificationContext'
import { useFirebaseAuth as useAuth } from '@/contexts/firebase-auth-context'
import { toast } from 'sonner'

export default function TestNotificationsPage() {
  const { createNotification } = useNotifications()
  const { user } = useAuth()

  const handleCreateTestNotification = async () => {
    try {
      await createTestNotification()
      toast.success('Test notification created successfully!')
    } catch (error) {
      console.error('Error creating test notification:', error)
      toast.error('Failed to create test notification')
    }
  }

  const handleCreateGiftNotification = async () => {
    try {
      await createGiftApprovalNotification(123, 'approved', 'Manager_Review', 'MKTOps_Processing', user?.id || 'test-user')
      toast.success('Gift approval notification created successfully!')
    } catch (error) {
      console.error('Error creating gift notification:', error)
      toast.error('Failed to create gift notification')
    }
  }

  const handleCreateDirectNotification = async () => {
    try {
      await createNotification({
        userId: null,
        targetUserIds: null,
        roles: ['ADMIN', 'MANAGER'],
        module: 'gift-approval',
        type: 'workflow',
        title: 'Direct Test Notification',
        message: 'This notification was created directly through the context.',
        action: 'direct_test',
        priority: 'high',
        data: {
          testId: 'direct-123',
          timestamp: new Date().toISOString(),
        },
        actions: [
          {
            label: 'View Details',
            action: 'navigate',
            url: '/gift-approval',
          },
          {
            label: 'Dismiss',
            action: 'dismiss',
          },
        ],
        expiresAt: null,
      } as any)
      toast.success('Direct notification created successfully!')
    } catch (error) {
      console.error('Error creating direct notification:', error)
      toast.error('Failed to create direct notification')
    }
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Notification System Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button onClick={handleCreateTestNotification} className="w-full">
              Create Test Notification
            </Button>
            <Button onClick={handleCreateGiftNotification} className="w-full">
              Create Gift Approval Notification
            </Button>
            <Button onClick={handleCreateDirectNotification} className="w-full">
              Create Direct Notification
            </Button>
          </div>

          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Instructions:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Click any of the buttons above to create a test notification</li>
              <li>Check the notification bell in the header for new notifications</li>
              <li>Click on the notification bell to see the notification panel</li>
              <li>Try marking notifications as read</li>
              <li>Test the notification actions (View Details, Dismiss)</li>
            </ol>
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold mb-2 text-blue-800">Current User:</h3>
            <p className="text-sm text-blue-700">
              ID: {user?.id || 'Not logged in'} | Role: {user?.role || 'Unknown'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
