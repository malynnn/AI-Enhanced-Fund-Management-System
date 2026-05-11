import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth?.token;
    const role = token?.role as string | undefined;
    const path = req.nextUrl.pathname;

    // 1. Redirect logged-in users away from the login page
    if (path === "/login" && token) {
        return NextResponse.redirect(new URL("/", req.url));
    }

    // 2. Original Logic: Redirect Finance Officers from the root User Dashboard to the Finance Hub
    if (path === "/" && role && ['Officer/Admin', 'Superadmin', 'Treasurer', 'Auditor'].includes(role)) {
      return NextResponse.redirect(new URL("/finance/dashboard", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const path = req.nextUrl.pathname;
        
        // Anyone can visit the login page
        if (path === "/login") return true;
        
        // Everything else requires a token
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

// Ensure middleware runs on the login page and all protected routes
export const config = {
  matcher: [
    "/",
    "/login",
    "/finance/:path*",
    "/dashboard",
    "/notifications",
    "/events",
    "/membership",
    "/loans",
  ],
};