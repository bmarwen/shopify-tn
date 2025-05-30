import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;
    const hostname = request.headers.get("host") || "";

    // For development environment, use the environment variable
    const subdomain =
      process.env.NODE_ENV === "development"
        ? process.env.SHOP_SUBDOMAIN || "para"
        : getSubdomainFromHostname(hostname);

    // Add the current subdomain to headers for backend use
    const requestHeaders = new Headers(request.headers);
    if (subdomain) {
      requestHeaders.set("x-shop-subdomain", subdomain);
    }

    // Main store.tn domain handling
    if (!subdomain || subdomain === "www") {
      // This is for the main store.tn site
      if (pathname.startsWith("/admin")) {
        try {
          const isAuth = await isAuthenticated(request);
          if (!isAuth) {
            return redirectToLogin(request);
          }
        } catch (error) {
          console.error("Auth check failed:", error);
          return redirectToLogin(request);
        }
      }
      // Continue to the main store application
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }

    // Subdomain handling (e.g., para.store.tn)
    // Admin routes for shop owners
    if (pathname.startsWith("/admin")) {
      try {
        const token = await getToken({ req: request });

        // If not authenticated, redirect to login
        if (!token) {
          return redirectToLogin(request, subdomain);
        }

        // Check if user belongs to this shop
        if (token.shopSubdomain !== subdomain) {
          // User is authenticated but trying to access another shop's admin
          return NextResponse.redirect(new URL("/unauthorized", request.url));
        }

        // User is authenticated and authorized for this shop's admin
        return NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
      } catch (error) {
        console.error("Token validation failed:", error);
        return redirectToLogin(request, subdomain);
      }
    }

    // API routes
    if (pathname.startsWith("/api/")) {
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }

    // All other routes are for the storefront
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    console.error("Middleware error:", error);
    // Fallback to allowing the request to continue
    return NextResponse.next();
  }
}

// Helper function to extract subdomain from hostname
function getSubdomainFromHostname(hostname: string): string | null {
  // Handle localhost for development
  if (hostname.includes("localhost")) {
    return process.env.SHOP_SUBDOMAIN || null;
  }

  // Extract subdomain from hostname
  const parts = hostname.split(".");
  if (parts.length > 2) {
    return parts[0];
  }
  return null;
}

// Helper function to redirect to login
function redirectToLogin(
  request: NextRequest,
  subdomain?: string | null
): NextResponse {
  const url = new URL("/login", request.url);
  url.searchParams.set("callbackUrl", request.nextUrl.pathname);

  // If we have a subdomain, ensure we're redirecting to that shop's login page
  if (subdomain) {
    // In production, this would be something like `https://${subdomain}.store.tn/login`
    // For development, we use the same URL but keep track of the subdomain
    url.searchParams.set("shop", subdomain);
  }

  return NextResponse.redirect(url);
}

// Check if the request is authenticated (simplified, actual implementation would use getToken)
async function isAuthenticated(request: NextRequest): Promise<boolean> {
  try {
    const token = await getToken({ req: request });
    return !!token;
  } catch (error) {
    console.error("Authentication check failed:", error);
    return false;
  }
}

// Match all pathnames except for assets, public routes, etc.
export const config = {
  matcher: [
    /**
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public|assets).*)",
    "/api/:path*",
    "/admin/:path*",
  ],
};
