# Integrated Notification System

## Overview

The Integrated Notification System combines both in-app notifications and email notifications with unified targeting logic, powered by **Brevo** for email delivery. This system ensures that both notification types use the same targeting mechanisms (userId, targetUserIds, or roles) and can be sent simultaneously or independently.

## Key Features

- **Unified Targeting**: Same targeting logic for both notifications and emails
- **Role-based Targeting**: Send to users with specific roles (KAM, ADMIN, etc.)
- **User-specific Targeting**: Send to specific users or user lists
- **Email Template Support**: Pre-built templates for common scenarios
- **Configurable Sending**: Enable/disable notifications or emails independently
- **Error Handling**: Robust error handling with detailed logging and fallback systems
- **Firebase Integration**: Uses Firebase for user management and notifications
- **Brevo Email Service**: Professional email delivery with permanent free tier
- **Gmail Sender Support**: Send from Gmail addresses without domain verification

## Architecture

### Core Components

1. **IntegratedNotificationService** (`services/integratedNotificationService.ts`)
   - Main service for sending integrated notifications
   - Handles both notification and email sending
   - Manages user targeting and email template generation
   - Includes fallback system for Firebase permission issues

2. **BrevoService** (`services/brevoService.ts`)
   - Dedicated service for Brevo email sending
   - Handles bulk email delivery
   - Professional email delivery with 300 emails/day free tier

3. **API Routes**
   - `app/api/gift-approval/update/route.ts` - Single gift actions
   - `app/api/gift-approval/bulk-actions/route.ts` - Bulk gift actions
   - `app/api/test-brevo-email/route.ts` - Email testing endpoint

4. **Email Templates** (`templates/emailTemplates.ts`)
   - Pre-built email templates for common scenarios
   - Consistent styling and branding
   - Dynamic content injection
   - Professional HTML email designs

## Usage

### Basic Usage

```typescript
import { IntegratedNotificationService } from '@/services/integratedNotificationService'

// Send gift rejection notification
await IntegratedNotificationService.sendGiftRejectionNotification(
  giftData,
  [] // Empty array triggers role-based targeting (KAM, ADMIN)
)

// Send bulk gift rejection notification
await IntegratedNotificationService.sendBulkGiftRejectionNotification(
  giftDataArray,
  'manager@company.com', // rejected by
  'Policy violation', // rejection reason
  ['KAM', 'ADMIN'] // target roles
)

// Send bulk action notification (for future use)
await IntegratedNotificationService.sendBulkActionNotification(
  'bulk_approve',
  [123, 456, 789], // gift IDs
  'manager@company.com', // user email
  ['KAM', 'ADMIN'] // target roles
)
```

### Advanced Usage

```typescript
// Custom integrated notification
await IntegratedNotificationService.sendIntegratedNotification({
  userId: null, // Global notification
  targetUserIds: ['user1', 'user2'], // Specific users
  roles: ['KAM', 'ADMIN'], // Role-based targeting
  
  module: 'gift-approval',
  type: 'custom_action',
  title: 'Custom Notification',
  message: 'This is a custom notification',
  action: 'custom_action',
  priority: 'high',
  
  // Email configuration
  emailTemplate: 'gift_rejected',
  emailData: { /* email template data */ },
  sendEmail: true,
  
  // Notification configuration
  sendNotification: true,
  
  // Additional data
  data: { customField: 'value' },
  actions: [
    {
      label: 'View Details',
      action: 'navigate',
      url: '/gift-approval'
    }
  ]
})
```

## Targeting Options

### 1. User-specific Targeting

```typescript
{
  userId: 'specific-user-id', // Single user
  targetUserIds: null,
  roles: []
}
```

### 2. Multiple User Targeting

```typescript
{
  userId: null,
  targetUserIds: ['user1', 'user2', 'user3'], // Multiple users
  roles: []
}
```

### 3. Role-based Targeting

```typescript
{
  userId: null,
  targetUserIds: null,
  roles: ['KAM', 'ADMIN', 'MANAGER'] // All users with these roles
}
```

### 4. Mixed Targeting

```typescript
{
  userId: null,
  targetUserIds: ['specific-user'], // Specific user
  roles: ['KAM', 'ADMIN'] // Plus all users with these roles
}
```

## Email Templates

### Available Templates

1. **gift_rejected** - For single gift rejection notifications
2. **bulk_gift_rejected** - For bulk gift rejection notifications with detailed gift information
3. **bulk_action** - For bulk action notifications (for future use)
4. **workflow_update** - For workflow status changes (for future use)

### Template Data Structure

```typescript
interface GiftEmailData {
  giftId: number
  fullName: string
  memberLogin: string
  giftItem: string
  costMyr: number
  category: string
  kamRequestedBy: string
  kamEmail: string
  approvalReviewedBy?: string
  managerEmail?: string
  rejectReason?: string
  trackingStatus?: string
  dispatcher?: string
  trackingCode?: string
  mktOpsUpdatedBy?: string
  auditorName?: string
  auditorEmail?: string
  kamProofBy?: string
  kamProofEmail?: string
  giftFeedback?: string
  auditRemark?: string
  createdDate?: Date
  lastModifiedDate?: Date
}
```

## API Endpoints

### POST `/api/gift-approval/update`

Update single gift with integrated notifications.

#### Request Body

```typescript
{
  giftId: number,
  tab: string,
  action: string,
  userId: string,
  userRole: string,
  userPermissions: Record<string, string[]>,
  rejectReason?: string,
  // ... other fields
}
```

### POST `/api/gift-approval/bulk-actions`

Perform bulk actions with integrated notifications.

#### Request Body

```typescript
{
  action: string,
  giftIds: number[],
  uploadedBy: string,
  reason?: string, // for rejections
  // ... other fields
}
```

### POST `/api/test-brevo-email`

Test Brevo email service directly.

#### Request Body

```typescript
{
  toEmail: string,
  subject: string,
  message: string
}
```

## Integration with Gift Approval System

### Single Gift Actions

The system is integrated into the gift approval update route:

```typescript
// In app/api/gift-approval/update/route.ts
if (action === 'reject') {
  // Get gift data from VIEW_GIFT_DETAILS
  const giftDataQuery = `
    SELECT 
      GIFT_ID, FULL_NAME, MEMBER_LOGIN, GIFT_ITEM, COST_BASE,
      CATEGORY, KAM_NAME, KAM_EMAIL, MANAGER_NAME, REJECT_REASON
    FROM MY_FLOW.PRESENTATION.VIEW_GIFT_DETAILS 
    WHERE GIFT_ID = ?
  `
  
  // Map data and send integrated notification
  const mappedGiftData = {
    giftId: giftData.GIFT_ID,
    fullName: giftData.FULL_NAME,
    memberLogin: giftData.MEMBER_LOGIN,
    giftItem: giftData.GIFT_ITEM,
    costMyr: giftData.COST_BASE,
    category: giftData.CATEGORY,
    kamRequestedBy: giftData.KAM_NAME,
    kamEmail: giftData.KAM_EMAIL,
    approvalReviewedBy: data.userId,
    rejectReason: data.rejectReason
  }
  
  await IntegratedNotificationService.sendGiftRejectionNotification(
    mappedGiftData,
    [] // Empty array triggers role-based targeting
  )
}
```

### Bulk Actions

The system is integrated into the bulk actions route:

```typescript
// In app/api/gift-approval/bulk-actions/route.ts
if (action.includes('reject')) {
  // Get gift data from VIEW_GIFT_DETAILS
  const giftDataQuery = `
    SELECT 
      GIFT_ID, FULL_NAME, MEMBER_LOGIN, GIFT_ITEM, COST_BASE,
      CATEGORY, KAM_NAME, KAM_EMAIL, MANAGER_NAME, REJECT_REASON
    FROM MY_FLOW.PRESENTATION.VIEW_GIFT_DETAILS 
    WHERE GIFT_ID IN (${placeholders})
  `
  
  // Map data and send dedicated bulk rejection notification
  const giftDataArray = giftDataResult.map(gift => ({
    giftId: gift.GIFT_ID,
    fullName: gift.FULL_NAME,
    memberLogin: gift.MEMBER_LOGIN,
    giftItem: gift.GIFT_ITEM,
    costMyr: gift.COST_BASE,
    category: gift.CATEGORY,
    kamRequestedBy: gift.KAM_NAME,
    kamEmail: gift.KAM_EMAIL,
    approvalReviewedBy: uploadedBy,
    rejectReason: reason
  }))
  
  await IntegratedNotificationService.sendBulkGiftRejectionNotification(
    giftDataArray,
    uploadedBy,
    reason,
    ['KAM', 'ADMIN']
  )
}
```

## Configuration

### Environment Variables

```env
# Brevo Configuration
BREVO_API_KEY=xkeysib-your_api_key_here
BREVO_FROM_EMAIL=dsa.dev24@gmail.com
BREVO_FROM_NAME=ZK Admin
EMAIL_ENABLED=true

# Fallback Admin Emails (for when Firebase permissions fail)
ADMIN_EMAIL_1=dsa.dev24@gmail.com

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
FIREBASE_SERVICE_ACCOUNT_KEY=your_service_account_key
```

### User Management

The system requires a `users` collection in Firebase with the following structure:

```typescript
interface User {
  id: string
  email: string
  name: string
  role: string
  // ... other user fields
}
```

## Testing

### Test Page

Visit `/test-integrated-notifications` to test the system with:

1. **Basic Email Tests**: Test Brevo email service
   - Test Basic Email (dsa.dev24@gmail.com)
   - Test Company Email (zk.lim@aetheriondataworks.com)

2. **Gift Rejection Tests**: Test complete workflow
   - Test Gift Rejection (dsa.dev24@gmail.com)
   - Test Gift Rejection (Company Email)

3. **System Information**: Documentation and feature overview

### Test Scenarios

1. **Single Gift Rejection**: Test single gift rejection notifications
2. **Bulk Gift Rejection**: Test bulk gift rejection notifications
3. **Email Service**: Test Brevo email delivery
4. **Fallback System**: Test when Firebase permissions fail

## Error Handling

The system includes comprehensive error handling:

1. **Service-level errors**: Logged and handled gracefully
2. **Email service errors**: Don't fail notification sending
3. **User targeting errors**: Fallback to admin emails
4. **Template errors**: Detailed error messages
5. **Firebase permission errors**: Fallback user system

### Fallback System

When Firebase permissions fail, the system uses fallback users:

```typescript
private static getFallbackUsers(data: IntegratedNotificationData) {
  const fallbackUsers = [
    {
      id: 'fallback-admin-1',
      email: process.env.ADMIN_EMAIL_1 || 'dsa.dev24@gmail.com',
      name: 'ZK Admin',
      role: 'ADMIN'
    }
  ]
  return fallbackUsers.filter(user => user.email && user.email.trim() !== '')
}
```

## Monitoring and Logging

### Console Logs

The system provides detailed console logging:

```
✅ Notification sent successfully: notification-id
✅ Email sent successfully
📧 Found 2 target users for email: [user1@email.com, user2@email.com]
❌ Firebase permission error for role-based targeting
🔄 Using fallback user targeting method
```

### Firebase Logs

- Notifications are stored in the `notifications` collection
- User data is retrieved from the `users` collection
- All operations are logged with timestamps

### Brevo Dashboard

- **Delivery Rates**: Track email delivery success
- **Bounce Rates**: Monitor invalid email addresses
- **Open Rates**: Track email engagement
- **Click Rates**: Monitor link interactions

## Best Practices

1. **Targeting**: Use role-based targeting for broad notifications, user-specific for targeted ones
2. **Email Templates**: Use appropriate templates for different scenarios
3. **Error Handling**: Always handle errors gracefully in production
4. **Testing**: Test notifications in development before production
5. **Monitoring**: Monitor notification and email delivery rates
6. **Fallback System**: Always have fallback emails configured

## Troubleshooting

### Common Issues

1. **Emails not sending**: Check `EMAIL_ENABLED` environment variable
2. **No target users**: Verify user data exists in Firebase
3. **Template errors**: Check email template data structure
4. **Permission errors**: Verify Firebase service account permissions
5. **Brevo API errors**: Check API key and rate limits

### Debug Steps

1. Check console logs for detailed error messages
2. Verify environment variables are set correctly
3. Test with the `/test-integrated-notifications` page
4. Check Firebase console for user data and permissions
5. Monitor Brevo dashboard for email delivery status

### Debug Commands

```bash
# Test email service via web interface
http://localhost:3000/test-integrated-notifications

# Check server logs for detailed error messages
# Monitor browser console for notification logs
```

## Performance

### Email Delivery Performance
- **Brevo**: 99.9% delivery rate
- **Free Tier**: 300 emails/day (9,000/month) - PERMANENT
- **Bulk Emails**: Optimized for multiple recipients
- **Template Rendering**: Fast HTML generation
- **Error Recovery**: Automatic retry logic

### Database Performance
- **User Lookups**: Optimized queries with fallback system
- **Bulk Operations**: Efficient batch processing
- **Notification Storage**: Firebase for real-time access
- **View Queries**: Using optimized VIEW_GIFT_DETAILS

## Future Enhancements

1. **Notification Preferences**: User-configurable notification settings
2. **Email Scheduling**: Delayed email sending
3. **Template Customization**: User-defined email templates
4. **Analytics**: Notification and email delivery analytics
5. **Mobile Push**: Push notification support
6. **Webhook Integration**: External system notifications
7. **Advanced Targeting**: More sophisticated user targeting options

---

**Last Updated**: December 2024
**Version**: 2.0.0 (Brevo Integration)
**Status**: Production Ready ✅
**Email Service**: Brevo (formerly Sendinblue)
**Free Tier**: 300 emails/day (9,000/month) - PERMANENT
