import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin route protection
  if (pathname.startsWith("/admin")) {
    const token = await getToken({ req: request });

    // If not authenticated or not an admin user, redirect to login
    if (!token) {
      const url = new URL("/login", request.url);
      url.searchParams.set("callbackUrl", encodeURI(pathname));
      return NextResponse.redirect(url);
    }

    // If user is not SHOP_ADMIN or SHOP_STAFF, redirect to homepage
    if (token.role !== "SHOP_ADMIN" && token.role !== "SHOP_STAFF") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Add shop ID header to all API requests for proper identification
  if (pathname.startsWith("/api/")) {
    const shopSubdomain = process.env.SHOP_SUBDOMAIN || "para";

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-shop-subdomain", shopSubdomain);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

// Match all pathnames except for assets, api public routes, etc.
export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
