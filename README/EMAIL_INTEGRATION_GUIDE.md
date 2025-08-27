# Email Integration Guide for Gift Approval System

## Overview

The MyFlow CRM now includes comprehensive email notifications for the gift approval workflow, powered by **Brevo** (formerly Sendinblue). This system automatically sends professional email notifications when gift requests are rejected, ensuring KAMs are immediately informed of any issues.

## 🚀 Features

### ✅ What's Working
- **Automatic Email Notifications** - Sent when gifts are rejected
- **Professional Email Templates** - Branded, responsive email designs
- **Targeted Delivery** - Emails sent to KAM and ADMIN users
- **Bulk Operations** - Support for bulk rejection notifications with detailed gift information
- **Error Handling** - Graceful fallback if email sending fails
- **Brevo Integration** - Reliable email delivery service with permanent free tier
- **Gmail Sender Support** - Send from Gmail addresses without domain verification

### 📧 Email Templates Available
1. **Gift Rejection** - Professional rejection emails with gift details
2. **Bulk Gift Rejection** - Detailed bulk rejection emails with all gift information
3. **Bulk Actions** - Mass operation notifications (for future use)
4. **Workflow Updates** - Status change notifications (for future use)

## 🔧 Configuration

### Environment Variables
```bash
# Brevo Configuration
BREVO_API_KEY=xkeysib-your_api_key_here
BREVO_FROM_EMAIL=dsa.dev24@gmail.com
BREVO_FROM_NAME=ZK Admin
EMAIL_ENABLED=true

# Fallback Admin Emails (for when Firebase permissions fail)
ADMIN_EMAIL_1=dsa.dev24@gmail.com
```

### Brevo Setup Steps
1. **Create Brevo Account**: Sign up at [brevo.com](https://www.brevo.com)
2. **Get API Key**: Navigate to Settings → API Keys → Generate new key
3. **Configure Sender**: Use Gmail address as sender (no domain verification needed)
4. **Test Setup**: Use the test page at `/test-integrated-notifications`

### Email Service Status
Check your email service status:
```bash
# Test Brevo email service
curl -X POST http://localhost:3000/api/test-brevo-email \
  -H "Content-Type: application/json" \
  -d '{"toEmail":"your-email@example.com","subject":"Test","message":"Test email"}'
```

## 🧪 Testing

### 1. Test Email Service
Visit: `http://localhost:3000/test-integrated-notifications`

### 2. Test Scenarios Available
- **Basic Email Test** - Send to personal email (dsa.dev24@gmail.com)
- **Company Email Test** - Send to company email (zk.lim@aetheriondataworks.com)
- **Gift Rejection Test** - Complete workflow with personal email
- **Gift Rejection Company Test** - Complete workflow with company email

### 3. Web Interface Testing
Visit: `http://localhost:3000/test-integrated-notifications`

## 📋 Implementation Details

### Single Gift Rejection Flow
1. **User Action**: Manager/Admin rejects a gift
2. **Database Update**: Gift status changed to "Rejected"
3. **Gift Data Retrieval**: System fetches gift details from `VIEW_GIFT_DETAILS`
4. **Email Generation**: Professional rejection email created
5. **Email Delivery**: Email sent via Brevo to KAM and ADMIN users
6. **In-App Notification**: Notification created in Firebase

### Bulk Gift Rejection Flow
1. **User Action**: Manager/Admin rejects multiple gifts
2. **Database Update**: All gifts status changed to "Rejected"
3. **Gift Data Retrieval**: System fetches all gift details from `VIEW_GIFT_DETAILS`
4. **Role-Based Targeting**: Emails sent to KAM and ADMIN roles
5. **Detailed Email**: Single email with all rejection details and gift information
6. **Timeline Logging**: All actions logged for audit trail

## 🔍 Code Integration Points

### 1. Single Gift Rejection
**File**: `app/api/gift-approval/update/route.ts`
```typescript
// Enhanced rejection logic with email notifications
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

### 2. Bulk Gift Rejection
**File**: `app/api/gift-approval/bulk-actions/route.ts`
```typescript
// Bulk rejection with detailed email notifications
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

### 3. Integrated Notification Service
**File**: `services/integratedNotificationService.ts`
```typescript
// Unified service for notifications and emails
static async sendGiftRejectionNotification(giftData: any, targetUsers: string[]) {
  return this.sendIntegratedNotification({
    userId: null,
    targetUserIds: targetUsers.length > 0 ? targetUsers : null,
    roles: targetUsers.length === 0 ? ['KAM', 'ADMIN'] : [],
    module: 'gift-approval',
    type: 'rejection',
    title: 'Gift Request Rejected',
    message: `Gift request #${giftData.giftId} has been rejected`,
    action: 'gift_rejected',
    priority: 'high',
    data: { giftId: giftData.giftId, reason: giftData.rejectReason },
    emailTemplate: 'gift_rejected',
    emailData: giftData,
    sendEmail: true,
    sendNotification: true
  })
}

// Dedicated bulk rejection method
static async sendBulkGiftRejectionNotification(
  giftDataArray: any[], 
  rejectedBy: string, 
  rejectReason: string, 
  targetRoles: string[]
) {
  return this.sendIntegratedNotification({
    userId: null,
    targetUserIds: null,
    roles: targetRoles,
    module: 'gift-approval',
    type: 'bulk_rejection',
    title: 'Bulk Gift Rejection',
    message: `${giftDataArray.length} gift(s) have been rejected`,
    action: 'bulk_gift_rejected',
    priority: 'high',
    data: { 
      giftCount: giftDataArray.length, 
      rejectedBy, 
      rejectReason,
      giftIds: giftDataArray.map(gift => gift.giftId)
    },
    emailTemplate: 'bulk_gift_rejected',
    emailData: { 
      giftDataArray, 
      rejectedBy, 
      rejectReason,
      giftCount: giftDataArray.length
    },
    sendEmail: true,
    sendNotification: true
  })
}
```

## 📧 Email Templates

### Gift Rejection Template
- **Subject**: "Gift Request Rejected - Gift #[ID]"
- **Content**: Professional rejection email with:
  - Gift details (ID, item, cost, category)
  - Player information (name, login)
  - Rejection reason
  - KAM contact information
  - Next steps guidance

### Bulk Gift Rejection Template
- **Subject**: "Bulk Gift Rejection - [X] gift(s) rejected"
- **Content**: Detailed bulk rejection email with:
  - Total number of rejected gifts
  - Who rejected them and why
  - Individual gift details for each rejected gift
  - Professional styling with rejection indicators
  - Action buttons to view the system

### Email Flow Examples
```
ZK Admin <dsa.dev24@gmail.com> → dsa.dev24@gmail.com
ZK Admin <dsa.dev24@gmail.com> → zk.lim@aetheriondataworks.com
```

## 🎯 Targeting Logic

### User Targeting Priority
1. **Specific User ID** - Direct user targeting
2. **Target User IDs** - Multiple specific users
3. **Role-Based** - All users with specified roles (KAM, ADMIN)
4. **Global** - All users (fallback)

### Role-Based Targeting for Rejections
```typescript
// Gift rejections target KAM and ADMIN users
roles: ['KAM', 'ADMIN']

// Service searches for both exact case and uppercase
const rolesToSearch = data.roles.flatMap(role => [role, role.toUpperCase()])
```

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

## 🔒 Security & Permissions

### Role-Based Access
- **MANAGER/ADMIN**: Can reject gifts and trigger emails
- **KAM**: Receives rejection notifications
- **AUDIT**: Can view all notification history

### Email Security
- **Brevo Verification**: Professional email delivery service
- **Gmail Sender**: No domain verification required
- **Rate Limiting**: Built-in protection against spam
- **Error Handling**: Graceful fallback if email fails

## 📊 Monitoring & Analytics

### Brevo Dashboard
- **Delivery Rates**: Track email delivery success
- **Bounce Rates**: Monitor invalid email addresses
- **Open Rates**: Track email engagement
- **Click Rates**: Monitor link interactions

### Application Logs
```bash
# Check email service status
# Monitor notification logs in browser console
# Check server logs for detailed email sending information
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Emails Not Sending
```bash
# Check environment variables
echo $BREVO_API_KEY
echo $EMAIL_ENABLED

# Test email service via web interface
http://localhost:3000/test-integrated-notifications
```

#### 2. KAM Not Receiving Emails
- Verify KAM email in database
- Check KAM role assignment
- Ensure email is not in spam folder
- Check Firebase permissions for user lookup

#### 3. Bulk Emails Failing
- Check Brevo rate limits (300 emails/day free tier)
- Verify all gift IDs exist in VIEW_GIFT_DETAILS
- Monitor application logs for detailed errors

### Debug Commands
```bash
# Test email service via web interface
http://localhost:3000/test-integrated-notifications

# Check server logs for detailed error messages
# Monitor browser console for notification logs
```

## 📈 Performance

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

## 🔄 Future Enhancements

### Planned Features
1. **Email Preferences** - User-configurable notification settings
2. **Template Customization** - Branded email templates
3. **Advanced Analytics** - Detailed email engagement tracking
4. **SMS Notifications** - Text message alerts
5. **Push Notifications** - Mobile app notifications

### Integration Opportunities
1. **Slack Integration** - Team notifications
2. **Microsoft Teams** - Enterprise notifications
3. **Webhook Support** - Custom integrations
4. **API Endpoints** - External system integration

## 📞 Support

### Getting Help
1. **Check Logs**: Review application and email service logs
2. **Test Interface**: Use `/test-integrated-notifications` page
3. **Brevo Dashboard**: Monitor email delivery status
4. **Documentation**: Refer to this guide and API docs

### Contact Information
- **Technical Issues**: Check application logs
- **Email Delivery**: Monitor Brevo dashboard
- **Configuration**: Review environment variables
- **Integration**: Refer to API documentation

---

**Last Updated**: December 2024
**Version**: 2.0.0 (Brevo Integration)
**Status**: Production Ready ✅
**Email Service**: Brevo (formerly Sendinblue)
**Free Tier**: 300 emails/day (9,000/month) - PERMANENT

