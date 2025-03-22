import axios from "axios";
import {
  NextResponse
} from "next/server";
import {
  cookies
} from "next/headers";
import * as UAParser from "ua-parser-js";
export const config = {
  matcher: ["/", "/dashboard/:path*", "/playground/:path*", "/docs/:path*", "/pages/:path*", "/authentication/:path*"]
};
export async function middleware(req) {
  const url = new URL(req.url);
  const {
    pathname
  } = url;
  console.log(`[Middleware] Processing request for: ${pathname}`);
  const userAgent = req.headers.get("user-agent") || "unknown";
  const parsedUserAgent = new UAParser.UAParser(userAgent);
  const nameUserAgent = parsedUserAgent.getBrowser().name || "unknown";
  console.log(`[Middleware] User-Agent detected: ${nameUserAgent}`);
  if (nameUserAgent === "unknown") {
    console.warn(`[Middleware] Access denied: Unknown User-Agent.`);
    return NextResponse.json({
      error: "Akses ditolak! User-Agent tidak diizinkan."
    }, {
      status: 403
    });
  }
  const authTokenCookie = cookies().get("auth_token");
  const isAuthenticated = Boolean(authTokenCookie);
  console.log(`[Middleware] Authentication status: ${isAuthenticated ? "Authenticated" : "Not authenticated"}`);
  if (!isAuthenticated && !pathname.includes("api") && !pathname.includes("authentication")) {
    console.warn(`[Middleware] Redirecting to login page.`);
    return NextResponse.redirect(`https://${process.env.DOMAIN_URL}/authentication/sign-in`);
  }
  const dashboardRoutes = ["dashboard", "playground", "docs", "pages"];
  if (!dashboardRoutes.some(route => pathname.includes(route))) {
    console.log(`[Middleware] Logging visitor request for: ${pathname}`);
    try {
      const reqLog = await axios.get(`https://${process.env.DOMAIN_URL}/api/visitor/req`, {
        headers: {
          "Content-Type": "application/json"
        }
      });
      console.log(`[Middleware] Request log response:`, reqLog.data);
    } catch (error) {
      console.error(`[Middleware] Error fetching request log:`, error.message);
      return NextResponse.next();
    }
    try {
      const infoLog = await axios.post(`https://${process.env.DOMAIN_URL}/api/visitor/info`, {
        route: pathname,
        time: new Date().toISOString(),
        hit: 1
      }, {
        headers: {
          "Content-Type": "application/json"
        }
      });
      console.log(`[Middleware] Visitor info logged successfully:`, infoLog.data);
    } catch (error) {
      console.error(`[Middleware] Error posting visitor info:`, error.message);
      return NextResponse.next();
    }
  } else {
    console.log(`[Middleware] Logging visit for dashboard section: ${pathname}`);
    try {
      const visitLog = await axios.get(`https://${process.env.DOMAIN_URL}/api/visitor/visit`, {
        headers: {
          "Content-Type": "application/json"
        }
      });
      console.log(`[Middleware] Visit log response:`, visitLog.data);
    } catch (error) {
      console.error(`[Middleware] Error fetching visit log:`, error.message);
      return NextResponse.next();
    }
  }
  console.log(`[Middleware] Request processed successfully. Continuing execution.`);
  return NextResponse.next();
}