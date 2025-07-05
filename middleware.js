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

function isAuthenticated(token) {
  return Boolean(token);
}
export async function middleware(req) {
  const requestStartTime = Date.now();
  let response = NextResponse.next();
  try {
    const url = new URL(req.url);
    const {
      pathname
    } = url;
    const ipAddress = req.ip || req.headers.get("x-forwarded-for") || "unknown";
    const isApi = pathname.startsWith("/api");
    const isAuthPage = ["/login", "/register"].includes(pathname);
    const authToken = req.cookies.get("auth_token")?.value;
    console.log(`[Middleware] ${req.method} ${req.url} - Start`);
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-XSS-Protection", "1; mode=block");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    response.headers.set("Access-Control-Allow-Credentials", "true");
    const isVisitorApi = pathname.includes("/api/visitor");
    const isAuthApi = pathname.includes("/api/auth");
    const isGeneralApi = pathname.includes("/api/general");
    if (isApi && !isVisitorApi && !isAuthApi && !isGeneralApi) {
      try {
        const rateLimiterRes = await rateLimiter.consume(ipAddress, 1);
        response.headers.set("X-RateLimit-Limit", apiConfig.LIMIT_POINTS);
        response.headers.set("X-RateLimit-Remaining", rateLimiterRes.remainingPoints);
        response.headers.set("X-RateLimit-Reset", Math.ceil((Date.now() + rateLimiterRes.msBeforeNext) / 1e3));
        console.log(`[Middleware] Rate limit status for ${pathname}: Remaining ${rateLimiterRes.remainingPoints}`);
      } catch (rateLimiterError) {
        const retryAfterSeconds = Math.ceil(rateLimiterError.msBeforeNext / 1e3);
        const totalLimit = apiConfig.LIMIT_POINTS;
        console.warn(`[Middleware] Rate limit exceeded for ${pathname}. Retry after ${retryAfterSeconds}s.`);
        return new NextResponse(JSON.stringify({
          status: "error",
          code: 429,
          message: `Terlalu banyak permintaan. Anda telah melampaui batas ${totalLimit} permintaan per ${apiConfig.LIMIT_DURATION} detik. Silakan coba lagi dalam ${retryAfterSeconds} detik.`,
          limit: totalLimit,
          remaining: 0,
          retryAfter: retryAfterSeconds
        }), {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": retryAfterSeconds.toString(),
            "X-RateLimit-Limit": totalLimit.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": Math.ceil((Date.now() + rateLimiterError.msBeforeNext) / 1e3).toString()
          }
        });
      }
    } else if (isApi) {
      console.log(`[Middleware] Rate limit skipped for excluded API: ${pathname}`);
    }
    const isProtectedRoute = !isApi && !isAuthPage;
    if (isProtectedRoute && !isAuthenticated(authToken)) {
      console.warn(`[Middleware] Tidak terautentikasi. Mengarahkan ke login.`);
      const redirectUrlWithProtocol = ensureProtocol(DOMAIN_URL, DEFAULT_PROTOCOL);
      return NextResponse.redirect(`${redirectUrlWithProtocol}/login`);
    }
    (async () => {
      try {
        const baseURL = ensureProtocol(DOMAIN_URL, DEFAULT_PROTOCOL);
        if (isApi && !isVisitorApi && !isAuthApi && !isGeneralApi) {
          await axios.get(`${baseURL}/api/visitor/req`, {
            headers: {
              "Content-Type": "application/json"
            },
            timeout: 5e3
          });
          console.log(`[Visitor Log] Logged API request for: ${pathname}`);
        } else if (!isApi) {
          await axios.get(`${baseURL}/api/visitor/visit`, {
            headers: {
              "Content-Type": "application/json"
            },
            timeout: 5e3
          });
          console.log(`[Visitor Log] Logged page visit for: ${pathname}`);
          await axios.post(`${baseURL}/api/visitor/info`, {
            route: pathname,
            time: new Date().toISOString(),
            hit: 1
          }, {
            headers: {
              "Content-Type": "application/json"
            },
            timeout: 5e3
          });
          console.log(`[Visitor Log] Logged page info for: ${pathname}`);
        } else {
          console.log(`[Visitor Log] Skipped logging for route: ${pathname}`);
        }
      } catch (err) {
        console.error(`[Visitor Log] Pencatatan pengunjung gagal untuk ${pathname}:`, err.message);
      }
    })();
    const responseTime = Date.now() - requestStartTime;
    console.log(`[Middleware] ${req.method} ${req.url} - ${response.status || 200} (${responseTime}ms)`);
    return response;
  } catch (error) {
    console.error("[Middleware] Kesalahan yang tidak tertangani:", error);
    return new NextResponse(JSON.stringify({
      status: "error",
      code: 500,
      message: "Kesalahan Server Internal"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
      }
    });
  }
}