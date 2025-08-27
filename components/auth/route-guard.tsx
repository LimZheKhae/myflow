"use client"

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useFirebaseAuth } from '@/contexts/firebase-auth-context'
import { Sparkles, Shield, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface RouteGuardProps {
  children: React.ReactNode
}

// Define which routes require specific module permissions
const ROUTE_MODULE_MAP: Record<string, string> = {
  '/vip-profile': 'vip-profile',
  '/campaign': 'campaign',
  '/gift-approval': 'gift-approval', 
  '/user-management': 'user-management',
}

const PUBLIC_ROUTES = ['/']
const AUTH_ONLY_ROUTES = ['/profile']

function LoadingScreen() {
  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl mb-6 shadow-2xl animate-pulse">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">Loading MyFlow</h2>
          <p className="text-gray-500">Checking your authentication and permissions...</p>
          <div className="mt-4 flex justify-center">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AccessDeniedScreen({ 
  requiredModule, 
  userRole, 
  onGoHome 
}: { 
  requiredModule: string
  userRole?: string
  onGoHome: () => void 
}) {
  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="max-w-md w-full glass-card border-0 shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-red-500 to-orange-500 rounded-3xl mb-6 shadow-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
            
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <span className="font-medium text-orange-800">Insufficient Permissions</span>
              </div>
              <p className="text-sm text-orange-700">
                You need <strong>VIEW</strong> permission for the <strong>{requiredModule}</strong> module to access this page.
              </p>
              {userRole && (
                <p className="text-xs text-orange-600 mt-2">
                  Current role: {userRole}
                </p>
              )}
            </div>
            
            <p className="text-gray-600 mb-6">
              Please contact your administrator to request access to this module.
            </p>
            
            <Button 
              onClick={onGoHome}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function RouteGuard({ children }: RouteGuardProps) {
  const { user, loading } = useFirebaseAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)

  const getRequiredModule = (pathname: string): string | null => {
    // Check exact matches first
    if (ROUTE_MODULE_MAP[pathname]) {
      return ROUTE_MODULE_MAP[pathname]
    }

    // Check for nested routes (e.g., /vip-profile/123)
    for (const [route, module] of Object.entries(ROUTE_MODULE_MAP)) {
      if (pathname.startsWith(route + '/')) {
        return module
      }
    }

    return null
  }

  const checkAccess = (user: any, pathname: string): boolean => {
    // Public routes are always accessible
    if (PUBLIC_ROUTES.includes(pathname)) {
      return true
    }

    // Auth-only routes just need authentication
    if (AUTH_ONLY_ROUTES.includes(pathname) || 
        AUTH_ONLY_ROUTES.some(route => pathname.startsWith(route + '/'))) {
      return !!user
    }

    // Protected routes need specific module permissions
    const requiredModule = getRequiredModule(pathname)
    if (!requiredModule) {
      return !!user // Default to requiring auth if no specific module
    }

    // Check if user has VIEW permission for the required module
    if (!user) return false
    
    // Admin has access to everything
    if (user.role === 'ADMIN') return true

    // Check if user has VIEW permission for this module
    const modulePermissions = user.permissions[requiredModule] || []
    return modulePermissions.includes('VIEW')
  }

  useEffect(() => {
    if (!loading) {
      const hasPageAccess = checkAccess(user, pathname)
      setHasAccess(hasPageAccess)
      setIsCheckingPermissions(false)

      // If no access and not on a public route, they'll see the access denied screen
      // The component will handle the display logic
    }
  }, [user, loading, pathname])

  // Show loading while checking authentication
  if (loading || isCheckingPermissions) {
    return <LoadingScreen />
  }

  // If user has access, render the children
  if (hasAccess) {
    return <>{children}</>
  }

  // If this is a public route but user is not authenticated, let the page handle it
  if (PUBLIC_ROUTES.includes(pathname)) {
    return <>{children}</>
  }

  // Show access denied for protected routes without proper permissions
  const requiredModule = getRequiredModule(pathname)
  if (requiredModule) {
    return (
      <AccessDeniedScreen
        requiredModule={requiredModule}
        userRole={user?.role}
        onGoHome={() => router.push('/')}
      />
    )
  }

  // For other cases, redirect to home
  router.push('/')
  return <LoadingScreen />
}