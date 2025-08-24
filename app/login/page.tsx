'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useFirebaseAuth } from '@/contexts/firebase-auth-context'
import FirebaseLoginForm from '@/components/auth/firebase-login-form'

function LoginPageContent() {
  const { user, loading } = useFirebaseAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/'

  useEffect(() => {
    // If user is already authenticated, redirect them
    if (user && !loading) {
      router.push(redirectTo)
    }
  }, [user, loading, router, redirectTo])

  // Show loading while checking authentication status
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // If user is authenticated, don't show login form
  if (user) {
    return null
  }

  return <FirebaseLoginForm />
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  )
}
