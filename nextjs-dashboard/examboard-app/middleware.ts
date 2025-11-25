import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get token from cookies or headers
  const token = request.cookies.get('accessToken') || request.headers.get('Authorization');
  const isAuthenticated = !!token;

  // Paths that don't require authentication
  const publicPaths = ['/login'];
  const isPublicPath = publicPaths.includes(pathname);

  // Redirect authenticated users away from login page
  if (isAuthenticated && isPublicPath) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Redirect unauthenticated users to login with return_to parameter
  if (!isAuthenticated && !isPublicPath) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('return_to', pathname);
    const res = NextResponse.redirect(loginUrl);
    // set a short-lived cookie so client-side code can read the intended return path
    res.cookies.set('return_to', pathname, { path: '/', maxAge: 60 * 5 });
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    // Exclude Next internals, static assets, images, favicon, API routes, and public images
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.png$).*)',
  ],
};