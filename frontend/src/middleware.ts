import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/signin",
  "/signin/",
  "/favicon.ico",
  "/api/token/refresh/",
  "/api/auth/login/",
  "/_next/",
  "/images/",
  "/fonts/",
];

// Middleware function to protect routes
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes and static assets
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Grab access token cookie — replace 'access_token' with your actual cookie name if different
  const accessToken = request.cookies.get("access_token")?.value;

  // No token? Redirect to signin
  if (!accessToken) {
    const url = request.nextUrl.clone();
    url.pathname = "/signin";
    return NextResponse.redirect(url);
  }

  // Token found, allow through
  return NextResponse.next();
}

// Protect all routes except those explicitly public
export const config = {
  matcher: [
    /*
      This regex means:
      - Match all routes EXCEPT those starting with /api, /_next, /favicon.ico, /images, /fonts
      - So your middleware runs on everything else
    */
    "/((?!api|_next|favicon.ico|images|fonts).*)",
  ],
};
