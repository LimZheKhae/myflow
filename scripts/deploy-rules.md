# Deploy Updated Firestore Rules

The Firestore security rules have been updated to fix the "No users found" issue. You need to deploy these rules to your Firebase project.

## Steps to Deploy:

1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Initialize Firebase project** (if not already done):
   ```bash
   firebase init firestore
   ```
   - Select your project: `crm2-3715e`
   - Choose `firestore.rules` as your rules file
   - Choose `firestore.indexes.json` as your indexes file

4. **Deploy the rules**:
   ```bash
   firebase deploy --only firestore:rules
   ```

## What was changed:

- Added `allow list` permission for authenticated users to query the users collection
- This allows the `getAllUsers()` method to work properly
- Previously, users could only read individual documents but not list/query all users

## After deployment:

1. Refresh your application
2. Check the browser console for the debug logs we added
3. You should now see users in the User Management page

## Security Note:

The current rule `allow list: if isAuthenticated()` is temporarily permissive for debugging. After confirming it works, we should restrict it to:

```javascript
allow list: if isAuthenticated() && (
  isAdmin() || 
  (isManager() && hasPermission('user-management', 'VIEW'))
);
``` 