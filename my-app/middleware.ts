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

    // --- ADDED ROLE SECURITY ---
    // If a non-admin tries to access /admin pages, kick them out
    if (path.startsWith("/admin") && role !== "Superadmin" && role !== "Officer/Admin") {
        // Redirect them to a safe place, like their own dashboard or an "Access Denied" page
        return NextResponse.redirect(new URL("/login", req.url)); 
    }
    // ---------------------------

    // 2. Original Logic: Redirect Finance Officers...
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
// Ensure middleware runs on the login page and all protected routes
export const config = {
  matcher: [
    "/",
    "/login",
    "/finance/:path*",
    
    // Add your role-based folder routes here with wildcards:
    "/admin/:path*",
    "/treasurer/:path*",
    "/auditor/:path*",
    "/member/:path*",
    
    "/notifications",
    "/events",
    "/membership",
    "/loans",
  ],
};