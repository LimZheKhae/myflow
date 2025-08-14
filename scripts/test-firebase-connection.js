// Simple Firebase connection test
// Run this in browser console at localhost:3000 to test Firebase

const testFirebaseConnection = async () => {
  console.log('🔥 Testing Firebase Connection...')
  
  try {
    // Test Firebase config
    console.log('📋 Firebase Config:')
    console.log('Project ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID)
    console.log('Auth Domain:', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN)
    console.log('API Key exists:', !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY)
    
    // Import Firebase dynamically (for browser)
    const { auth } = await import('../lib/firebase')
    
    console.log('✅ Firebase initialized successfully!')
    console.log('Auth instance:', auth)
    console.log('Current user:', auth.currentUser)
    
    // Test if we can make a basic auth request
    const { sendPasswordResetEmail } = await import('firebase/auth')
    
    // This will throw if connection fails
    try {
      await sendPasswordResetEmail(auth, 'test@nonexistent-email-for-testing.com')
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log('✅ Firebase Auth connection working! (User not found is expected)')
      } else if (error.code === 'auth/network-request-failed') {
        console.log('❌ Network connection failed - check internet connection')
        throw error
      } else {
        console.log('✅ Firebase Auth connection working! Error:', error.code)
      }
    }
    
    return true
  } catch (error) {
    console.error('❌ Firebase connection failed:', error)
    console.log('🔍 Troubleshooting:')
    console.log('1. Check internet connection')
    console.log('2. Verify Firebase project exists')
    console.log('3. Check environment variables in .env.local')
    console.log('4. Ensure Firebase Authentication is enabled')
    return false
  }
}

// Test connection on page load
if (typeof window !== 'undefined') {
  window.testFirebaseConnection = testFirebaseConnection
  console.log('🧪 Run testFirebaseConnection() in console to test Firebase')
} 