# IntegratedNotificationService Debugging Guide

## ✅ Current Status: WORKING

The IntegratedNotificationService is now fully functional with Brevo email integration. All issues have been resolved and the system is working correctly.

## 🎯 What's Working Now

### ✅ Email Service
- **Brevo Integration**: Professional email delivery service
- **Gmail Sender**: Send from Gmail addresses without domain verification
- **Free Tier**: 300 emails/day (9,000/month) - PERMANENT
- **Bulk Emails**: Support for multiple recipients

### ✅ Notification System
- **Single Gift Rejection**: Working with role-based targeting
- **Bulk Gift Rejection**: Working with detailed gift information
- **In-App Notifications**: Firebase notifications working
- **Email Notifications**: Brevo emails working

### ✅ Data Integration
- **VIEW_GIFT_DETAILS**: Using correct view table for gift data
- **Field Mapping**: Proper mapping between database and notification service
- **Role-Based Targeting**: KAM and ADMIN users receive notifications

## 🔧 Fixes Applied

### 1. Email Service Migration
```typescript
// Migrated from Resend to Brevo
// services/brevoService.ts
export class BrevoService {
  private static apiKey = process.env.BREVO_API_KEY
  private static fromEmail = process.env.BREVO_FROM_EMAIL || 'dsa.dev24@gmail.com'
  private static fromName = process.env.BREVO_FROM_NAME || 'ZK Admin'
  
  static async sendEmail(params: {
    to: string | string[]
    subject: string
    html: string
    text?: string
  }): Promise<{ success: boolean; error?: string; data?: any }>
}
```

### 2. Database Query Fixes
```typescript
// Fixed gift data queries to use VIEW_GIFT_DETAILS
const giftDataQuery = `
  SELECT 
    GIFT_ID, FULL_NAME, MEMBER_LOGIN, GIFT_ITEM, COST_BASE,
    CATEGORY, KAM_NAME, KAM_EMAIL, MANAGER_NAME, REJECT_REASON
  FROM MY_FLOW.PRESENTATION.VIEW_GIFT_DETAILS 
  WHERE GIFT_ID = ?
`
```

### 3. Field Mapping Fixes
```typescript
// Proper field mapping from view to notification service
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
```

### 4. Fallback System
```typescript
// Fallback system for when Firebase permissions fail
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

### 5. Enhanced Error Handling
```typescript
// Comprehensive error handling with detailed logging
try {
  const userDoc = await usersRef.doc(data.userId).get()
  // ... handle success
} catch (firebaseError) {
  console.error('❌ Firebase permission error')
  return this.getFallbackUsers(data)
}
```

## 🧪 Testing

### Test Page
Visit: `http://localhost:3000/test-integrated-notifications`

### Available Tests
1. **Basic Email Test** - Send to personal email (dsa.dev24@gmail.com)
2. **Company Email Test** - Send to company email (zk.lim@aetheriondataworks.com)
3. **Gift Rejection Test** - Complete workflow with personal email
4. **Gift Rejection Company Test** - Complete workflow with company email

### Expected Results
```
✅ Brevo email test successful!
✅ Gift rejection test successful!
✅ Notification: ✅ | Email: ✅
```

## 🔍 Monitoring

### Console Logs
Look for these success messages:
```
🚀 [INTEGRATED] Starting integrated notification process
🔔 [NOTIFICATION] Creating notification with data
✅ [INTEGRATED] Notification sent successfully: [notification-id]
📧 [BREVO] Sending email to: [recipient-emails]
✅ [BREVO] Email sent successfully
```

### Brevo Dashboard
- **Delivery Rates**: Track email delivery success
- **Bounce Rates**: Monitor invalid email addresses
- **Open Rates**: Track email engagement

## 🛠️ Configuration

### Environment Variables
```bash
# Brevo Configuration
BREVO_API_KEY=xkeysib-your_api_key_here
BREVO_FROM_EMAIL=dsa.dev24@gmail.com
BREVO_FROM_NAME=ZK Admin
EMAIL_ENABLED=true

# Fallback Admin Emails
ADMIN_EMAIL_1=dsa.dev24@gmail.com
```

### Brevo Setup
1. **Create Account**: Sign up at [brevo.com](https://www.brevo.com)
2. **Get API Key**: Settings → API Keys → Generate new key
3. **Configure Sender**: Use Gmail address (no domain verification needed)
4. **Test Setup**: Use `/test-integrated-notifications` page

## 📊 System Flow

### Single Gift Rejection
1. **User Action**: Manager/Admin rejects gift in UI
2. **API Call**: `/api/gift-approval/update` with action='reject'
3. **Database Update**: Gift status changed to 'Rejected'
4. **Gift Data**: Fetched from `VIEW_GIFT_DETAILS`
5. **Notification**: Created in Firebase
6. **Email**: Sent via Brevo to KAM and ADMIN users

### Bulk Gift Rejection
1. **User Action**: Manager/Admin rejects multiple gifts
2. **API Call**: `/api/gift-approval/bulk-actions` with reject action
3. **Database Update**: All gifts status changed to 'Rejected'
4. **Gift Data**: Fetched from `VIEW_GIFT_DETAILS` for all gifts
5. **Notification**: Created in Firebase
6. **Email**: Detailed email with all gift information sent via Brevo

## 🎨 Email Templates

### Single Gift Rejection
- **Subject**: "Gift Request Rejected - Gift #[ID]"
- **Content**: Professional rejection email with gift details

### Bulk Gift Rejection
- **Subject**: "Bulk Gift Rejection - [X] gift(s) rejected"
- **Content**: Detailed email with all rejected gift information

## 🔒 Security & Permissions

### Role-Based Access
- **MANAGER/ADMIN**: Can reject gifts and trigger emails
- **KAM**: Receives rejection notifications
- **AUDIT**: Can view all notification history

### Email Security
- **Brevo Verification**: Professional email delivery service
- **Gmail Sender**: No domain verification required
- **Rate Limiting**: Built-in protection against spam

## 🚨 Troubleshooting

### If Emails Not Sending
1. **Check Environment Variables**:
   ```bash
   echo $BREVO_API_KEY
   echo $EMAIL_ENABLED
   ```

2. **Test Email Service**:
   Visit: `http://localhost:3000/test-integrated-notifications`

3. **Check Brevo Dashboard**:
   Monitor delivery rates and bounce rates

### If Notifications Not Appearing
1. **Check Firebase Permissions**:
   Verify service account has Firestore read/write permissions

2. **Check Console Logs**:
   Look for Firebase permission errors

3. **Test Fallback System**:
   Ensure `ADMIN_EMAIL_1` is set in environment variables

### If Gift Data Missing
1. **Check Database Queries**:
   Verify `VIEW_GIFT_DETAILS` exists and has correct data

2. **Check Field Mapping**:
   Ensure gift data is properly mapped to notification service

3. **Test with Real Data**:
   Use actual gift IDs in test scenarios

## 📈 Performance

### Email Delivery Performance
- **Brevo**: 99.9% delivery rate
- **Free Tier**: 300 emails/day (9,000/month) - PERMANENT
- **Bulk Emails**: Optimized for multiple recipients

### Database Performance
- **User Lookups**: Optimized queries with fallback system
- **Bulk Operations**: Efficient batch processing
- **View Queries**: Using optimized `VIEW_GIFT_DETAILS`

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

