# Firebase Admin SDK Setup Guide

## 🎯 **Problem Solved**

The activity logging was being blocked by ad blockers because it was using client-side Firebase. We've now moved to **Firebase Admin SDK** for server-side operations.

## 📋 **Required Environment Variables**

Add these to your `.env.local` file:

```bash
# Firebase Admin SDK Configuration (Server-side)
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
```

## 🔧 **How to Get Firebase Admin Credentials**

### **Step 1: Go to Firebase Console**

1. Visit [Firebase Console](https://console.firebase.google.com/)
2. Select your project

### **Step 2: Generate Service Account Key**

1. Go to **Project Settings** (gear icon)
2. Click **Service accounts** tab
3. Click **Generate new private key**
4. Download the JSON file

### **Step 3: Extract Credentials**

From the downloaded JSON file, copy:

- `client_email` → `FIREBASE_CLIENT_EMAIL`
- `private_key` → `FIREBASE_PRIVATE_KEY`

### **Step 4: Add to .env.local**

```bash
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
```

## ✅ **What's Fixed**

1. **🚫 No More Ad Blocker Issues**: Server-side Firebase Admin SDK bypasses ad blockers
2. **🔒 Secure**: Admin SDK has full permissions and runs server-side
3. **⚡ Reliable**: No more `ERR_BLOCKED_BY_CLIENT` errors
4. **🌐 Global**: Works for all modules (Gift Approval, User Management, etc.)

## 🎉 **Result**

After setup, your activity logging will work perfectly:

- ✅ No ad blocker interference
- ✅ All actions logged to Firebase `activity_logs` collection
- ✅ Gift timeline events logged to Snowflake `GIFT_WORKFLOW_TIMELINE`
- ✅ Complete audit trail for all modules

## 🔍 **Testing**

1. Create a user in User Management
2. Check Firebase Console → Firestore → `activity_logs` collection
3. You should see the activity logged without any ad blocker errors!
