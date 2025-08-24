import { NextRequest, NextResponse } from 'next/server'

// Define protected routes and their required modules
const ROUTE_MODULE_MAP: Record<string, string> = {
  '/vip-profile': 'vip-profile',
  '/campaign': 'campaign',
  '/gift-approval': 'gift-approval',
  '/user-management': 'user-management',
}

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/forgot-password', '/reset-password']

// Routes that require authentication but no specific module permissions
const AUTH_ONLY_ROUTES = ['/profile']

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

  // Check for Firebase auth token in cookies
  const authToken = request.cookies.get('firebase-auth-token')?.value || request.cookies.get('__session')?.value

  // If no auth token and trying to access protected route, redirect to login
  if (!authToken && pathname !== '/') {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // If user is on login page but has valid token, redirect to home
  if (pathname === '/login' && authToken) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // For the home page, allow access but let client-side handle auth state
  if (pathname === '/') {
    return NextResponse.next()
  }

  // For other protected routes, only redirect if no token exists
  // Let client-side handle token validation to avoid middleware complexity
  if (!authToken && pathname !== '/') {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // For protected routes, add headers to indicate which module permission is required
  const response = NextResponse.next()
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
