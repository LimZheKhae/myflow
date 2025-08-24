import { NextRequest, NextResponse } from 'next/server'

// Define protected routes and their required modules
const ROUTE_MODULE_MAP: Record<string, string> = {
  '/vip-profile': 'vip-profile',
  '/campaign': 'campaign', 
  '/gift-approval': 'gift-approval',
  '/user-management': 'user-management',
}

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/']

// Routes that require authentication but no specific module permissions
const AUTH_ONLY_ROUTES = ['/profile']

async function getUserFromToken(request: NextRequest) {
  try {
    // Get Firebase auth token from cookies or headers
    const authToken = request.cookies.get('__session')?.value || 
                     request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!authToken) {
      return null
    }

    // For server-side Firebase auth verification, you would typically:
    // 1. Verify the token with Firebase Admin SDK
    // 2. Get user data from Firestore
    
    // Since we're in middleware and want to avoid heavy operations,
    // we'll use a different approach - check if the client-side auth is valid
    // by making a request to an API endpoint that validates the session
    
    return null // Placeholder - will be handled by client-side redirect
  } catch (error) {
    console.error('Error verifying auth token:', error)
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Skip middleware for static files, API routes, and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // files with extensions
  ) {
    return NextResponse.next()
  }

  // Handle public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next()
  }

  // For protected routes, we need to handle this client-side due to Firebase Auth limitations
  // Create a response that includes auth check instructions
  const response = NextResponse.next()
  
  // Add headers to indicate which module permission is required
  const requiredModule = getRequiredModule(pathname)
  if (requiredModule) {
    response.headers.set('x-required-module', requiredModule)
    response.headers.set('x-required-permission', 'VIEW')
  }

  // Add header to indicate auth is required
  if (!PUBLIC_ROUTES.includes(pathname)) {
    response.headers.set('x-auth-required', 'true')
  }

  return response
}

function getRequiredModule(pathname: string): string | null {
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

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}