import axios from "axios";
import {
  NextResponse
} from "next/server";
import * as UAParser from "ua-parser-js";
export const config = {
  matcher: ["/", "/login", "/register", "/api/:path*"]
};
export async function middleware(req) {
  const url = new URL(req.url);
  const {
    pathname,
    hostname
  } = url;
  const userAgent = req.headers.get("user-agent") || "unknown";
  const parser = new UAParser.UAParser(userAgent);
  const browserName = parser.getBrowser().name || "unknown";
  const DOMAIN = process.env.DOMAIN_URL || "localhost";
  const isAuthPage = ["/login", "/register"].includes(pathname);
  const isApi = pathname.startsWith("/api");
  const authToken = req.cookies.get("auth_token");
  const isAuthenticated = Boolean(authToken);
  if (browserName === "unknown" && hostname !== DOMAIN) {
    console.warn(`[Middleware] Access denied: Invalid User-Agent or domain.`);
    return NextResponse.json({
      error: "Akses ditolak! User-Agent tidak diizinkan."
    }, {
      status: 403
    });
  }
  if (!isAuthenticated && !isAuthPage && !isApi) {
    console.warn(`[Middleware] Not authenticated. Redirecting to login.`);
    return NextResponse.redirect(`https://${DOMAIN}/login`);
  }
  try {
    const headers = {
      "Content-Type": "application/json"
    };
    if (isApi) {
      await axios.get(`https://${DOMAIN}/api/visitor/req`, {
        headers: headers
      });
    } else {
      await axios.get(`https://${DOMAIN}/api/visitor/visit`, {
        headers: headers
      });
      await axios.post(`https://${DOMAIN}/api/visitor/info`, {
        route: pathname,
        time: new Date().toISOString(),
        hit: 1
      }, {
        headers: headers
      });
    }
  } catch (err) {
    console.error(`[Middleware] Visitor logging failed:`, err.message);
  }
  return NextResponse.next();
}