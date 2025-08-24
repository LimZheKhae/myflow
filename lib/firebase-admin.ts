import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

// Initialize Firebase Admin SDK
const firebaseAdminConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
}

// Initialize the app if it hasn't been initialized
if (!getApps().length) {
  initializeApp({
    credential: cert(firebaseAdminConfig),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  })
}

// Get Firestore instance
export const adminDb = getFirestore()

// Get Auth instance
export const auth = getAuth()

export default adminDb
