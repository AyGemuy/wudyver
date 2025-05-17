import {
  NextResponse
} from "next/server";
import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import {
  RateLimiterMemory
} from "rate-limiter-flexible";
const DOMAIN_URL = apiConfig.DOMAIN_URL || "localhost";
const DEFAULT_PROTOCOL = "https://";
const rateLimiter = new RateLimiterMemory({
  points: apiConfig.LIMIT_POINTS,
  duration: apiConfig.LIMIT_DURATION
});
export const config = {
  matcher: ["/", "/login", "/register", "/api/:path*"]
};

function ensureProtocol(url, defaultProtocol) {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return defaultProtocol + url;
  }
  return url;
}
export async function middleware(req) {
  try {
    const url = new URL(req.url);
    const {
      pathname
    } = url;
    const isApi = pathname.startsWith("/api");
    const isAuthPage = ["/login", "/register"].includes(pathname);
    const authToken = req.cookies.get("auth_token")?.value;
    const requestStartTime = Date.now();
    const ipAddress = req.ip || "unknown";
    const response = NextResponse.next();
    console.log(`[Middleware] ${req.method} ${req.url} - Start`);
    const origin = req.headers.get("origin");
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    response.headers.set("Access-Control-Allow-Credentials", "true");
    if (isApi && !pathname.includes("/api/visitor")) {
      try {
        const rateLimitResponse = await rateLimiter.consume(ipAddress, 1, {
          returnRateLimitInfo: true
        });
        response.headers.set("X-RateLimit-Limit", rateLimitResponse.limit);
        response.headers.set("X-RateLimit-Remaining", rateLimitResponse.remainingPoints);
        response.headers.set("X-RateLimit-Reset", Math.ceil(rateLimitResponse.msUntilNext / 1e3));
      } catch (error) {
        return new NextResponse(JSON.stringify({
          error: "Too many requests, please try again later."
        }), {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": Math.ceil(error.msUntilNext / 1e3),
            "X-RateLimit-Limit": error.points,
            "X-RateLimit-Remaining": 0,
            "X-RateLimit-Reset": Math.ceil(error.msUntilNext / 1e3)
          }
        });
      }
    }
    if (!isApi && !isAuthPage && !isAuthenticated(authToken)) {
      console.warn(`[Middleware] Not authenticated. Redirecting to login.`);
      const redirectUrlWithProtocol = ensureProtocol(DOMAIN_URL, DEFAULT_PROTOCOL);
      return NextResponse.redirect(`${redirectUrlWithProtocol}/login`);
    }
    const responseTime = Date.now() - requestStartTime;
    console.log(`[Middleware] ${req.method} ${req.url} - ${response.status} (${responseTime}ms)`);
    try {
      const baseURL = ensureProtocol(DOMAIN_URL, DEFAULT_PROTOCOL);
      if (isApi) {
        await axios.get(`${baseURL}/api/visitor/req`, {
          headers: {
            "Content-Type": "application/json"
          }
        });
      } else {
        await axios.get(`${baseURL}/api/visitor/visit`, {
          headers: {
            "Content-Type": "application/json"
          }
        });
        await axios.post(`${baseURL}/api/visitor/info`, {
          route: pathname,
          time: new Date().toISOString(),
          hit: 1
        }, {
          headers: {
            "Content-Type": "application/json"
          }
        });
      }
    } catch (err) {
      console.error(`[Middleware] Visitor logging failed:`, err.message);
    }
    return response;
  } catch (error) {
    console.error("[Middleware] Unhandled error:", error);
    return new NextResponse(JSON.stringify({
      error: "Internal Server Error"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
}

function isAuthenticated(token) {
  return Boolean(token);
}