// my-app/middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth?.token;
    const role = token?.role as string | undefined;
    const path = req.nextUrl.pathname;

    // If an Officer, Treasurer, Auditor, or Superadmin lands on the root User dashboard ("/"),
    // instantly redirect them to the Monitoring Hub instead.
    if (path === "/" && role && ['Officer/Admin', 'Treasurer', 'Auditor', 'Superadmin'].includes(role)) {
      return NextResponse.redirect(new URL("/finance/dashboard", req.url));
    }
  },
  {
    callbacks: {
      // This ensures the middleware only runs if the user actually has a token
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    /* Ignore API routes, Next.js internal files, and images so they don't get blocked */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}