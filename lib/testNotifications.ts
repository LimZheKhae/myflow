import { NotificationService } from '@/services/notificationService'
import { NotificationData } from '@/types/notification'

export const createTestNotification = async () => {
  const testNotification: NotificationData = {
    userId: null, // Global notification
    targetUserIds: null,
    roles: ['ADMIN', 'MANAGER'],
    module: 'gift-approval',
    type: 'workflow',
    title: 'Test Notification',
    message: 'This is a test notification to verify the system is working correctly.',
    action: 'test_notification',
    priority: 'medium',
    data: {
      testId: '123',
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
  }

  try {
    const notificationId = await NotificationService.createNotification(testNotification)
    console.log('Test notification created with ID:', notificationId)
    return notificationId
  } catch (error) {
    console.error('Error creating test notification:', error)
    throw error
  }
}

export const createGiftApprovalNotification = async (giftId: number, action: string, fromStatus: string, toStatus: string, userId: string) => {
  const notification: NotificationData = {
    userId: null,
    targetUserIds: null,
    roles: ['ADMIN', 'MANAGER', 'KAM'],
    module: 'gift-approval',
    type: 'workflow',
    title: `Gift ${action.charAt(0).toUpperCase() + action.slice(1)}`,
    message: `Gift #${giftId} has been ${action} and moved from ${fromStatus} to ${toStatus}`,
    action: `gift_${action}`,
    priority: action === 'rejected' ? 'high' : 'medium',
    data: {
      giftId,
      fromStatus,
      toStatus,
      actionBy: userId,
      timestamp: new Date().toISOString(),
    },
    actions: [
      {
        label: 'View Gift',
        action: 'navigate',
        url: `/gift-approval?giftId=${giftId}`,
      },
    ],
    expiresAt: null,
  }

  try {
    const notificationId = await NotificationService.createNotification(notification)
    console.log('Gift approval notification created with ID:', notificationId)
    return notificationId
  } catch (error) {
    console.error('Error creating gift approval notification:', error)
    throw error
  }
}
