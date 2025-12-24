import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import { RateLimiterMemory } from "rate-limiter-flexible";
import requestIp from "request-ip";

export const config = {
  matcher: ["/api/:path*", "/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|workbox-.*).*)"]
};

function getClientIp(req) {
  try {
    const headers = {};
    req.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });
    
    const requestLike = {
      headers: headers,
      connection: {
        remoteAddress: req.ip || headers["x-forwarded-for"] || headers["x-real-ip"]
      },
      socket: {
        remoteAddress: req.ip || headers["x-forwarded-for"] || headers["x-real-ip"]
      },
      info: {
        remoteAddress: req.ip || headers["x-forwarded-for"] || headers["x-real-ip"]
      }
    };
    
    const clientIp = requestIp.getClientIp(requestLike);
    if (clientIp && clientIp !== "::1" && clientIp !== "127.0.0.1") {
      return clientIp;
    }
    
    const fallbackIp = req.ip || 
      headers["cf-connecting-ip"] || 
      headers["x-real-ip"] || 
      headers["x-forwarded-for"]?.split(",")[0]?.trim() || 
      headers["x-client-ip"] || 
      headers["x-forwarded"] || 
      headers["forwarded-for"] || 
      headers["forwarded"] || 
      "unknown";
    
    console.log(`[IP-Detection] request-ip result: ${clientIp}, fallback: ${fallbackIp}`);
    return fallbackIp;
  } catch (error) {
    console.error("[IP-Detection] Error in getClientIp:", error);
    return req.ip || req.headers.get("x-forwarded-for") || "unknown";
  }
}

const DOMAIN_URL = apiConfig.DOMAIN_URL || "wudysoft.xyz";
const NEXTAUTH_SECRET = apiConfig.JWT_SECRET;
const DEFAULT_PROTOCOL = "https://";

const axiosInstance = axios.create({
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "User-Agent": "NextJS-Middleware/1.0"
  }
});

const LIMIT_POINTS = apiConfig?.LIMIT_POINTS || 100;
const LIMIT_DURATION = apiConfig?.LIMIT_DURATION || 60;
const PAGE_LIMIT_POINTS = apiConfig?.PAGE_LIMIT_POINTS || 30;
const PAGE_LIMIT_DURATION = apiConfig?.PAGE_LIMIT_DURATION || 60;

const rateLimiter = new RateLimiterMemory({
  points: LIMIT_POINTS,
  duration: LIMIT_DURATION
});

const pageRateLimiter = new RateLimiterMemory({
  points: PAGE_LIMIT_POINTS,
  duration: PAGE_LIMIT_DURATION
});

function ensureProtocol(url, defaultProtocol) {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return defaultProtocol + url;
  }
  return url;
}

function addSecurityHeaders(response) {
  // Header keamanan dasar tanpa CSP
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  
  return response;
}

function addCorsHeaders(response) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version, Origin, X-CSRF-Token");
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Max-Age", "86400");
  
  return response;
}

function addRateLimitHeaders(response, rateLimiterRes = null, totalLimit = null, rateLimitType = "api") {
  const limit = totalLimit || (rateLimitType === "api" ? LIMIT_POINTS : PAGE_LIMIT_POINTS);
  const duration = rateLimitType === "api" ? LIMIT_DURATION : PAGE_LIMIT_DURATION;
  
  if (rateLimiterRes) {
    response.headers.set("X-RateLimit-Limit", limit.toString());
    response.headers.set("X-RateLimit-Remaining", rateLimiterRes.remainingPoints?.toString() || "0");
    response.headers.set("X-RateLimit-Reset", Math.ceil((Date.now() + (rateLimiterRes.msBeforeNext || 0)) / 1000).toString());
  } else {
    response.headers.set("X-RateLimit-Limit", limit.toString());
    response.headers.set("X-RateLimit-Remaining", limit.toString());
    response.headers.set("X-RateLimit-Reset", Math.ceil(Date.now() / 1000 + duration).toString());
  }
  
  return response;
}

async function performTracking(req) {
  try {
    const currentUrl = new URL(req.url);
    const currentPathname = currentUrl.pathname;
    const baseURL = ensureProtocol(DOMAIN_URL, DEFAULT_PROTOCOL);
    
    const isApiRoute = currentPathname.startsWith("/api");
    const isVisitorApi = currentPathname.includes("/api/visitor");
    const isAuthApi = currentPathname.includes("/api/auth");
    const isGeneralApi = currentPathname.includes("/api/general");
    const isAuthPage = currentPathname === "/login" || currentPathname === "/register";
    
    if (isApiRoute && !isVisitorApi && !isAuthApi && !isGeneralApi) {
      await axiosInstance.get(`${baseURL}/api/visitor/req`);
    } else if (!isApiRoute && !isAuthPage) {
      await axiosInstance.get(`${baseURL}/api/visitor/visit`);
      await axiosInstance.post(`${baseURL}/api/visitor/info`, {
        route: currentPathname,
        time: new Date().toISOString(),
        hit: 1
      });
    }
  } catch (err) {
    console.error(`[Middleware-Tracking] Gagal mencatat pengunjung: ${err.message}`);
  }
}

function addNoCacheHeaders(response) {
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  
  return response;
}

export async function middleware(req) {
  const url = new URL(req.url);
  const { pathname } = url;
  
  const isStaticAsset = 
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/manifest.json') ||
    pathname.startsWith('/sw.js') ||
    pathname.startsWith('/workbox-') ||
    /\.(jpg|jpeg|png|gif|svg|ico|webp|avif|bmp|tiff|mp4|webm|ogg|mp3|wav|flac|aac|m4a|oga|weba|mov|avi|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|rtf|md|json|xml|csv|yml|yaml|js|ts|woff|woff2|ttf|eot|otf|sfnt|zip|rar|7z|tar|gz|bz2)$/i.test(pathname);
  
  if (isStaticAsset) {
    return NextResponse.next();
  }
  
  const ipAddress = getClientIp(req);
  
  let response = NextResponse.next();
  
  try {
    const isApiRoute = pathname.startsWith("/api");
    
    if (isApiRoute && req.method === "OPTIONS") {
      response = new NextResponse(null, { status: 200 });
      response = addCorsHeaders(response);
      response = addSecurityHeaders(response);
      response = addNoCacheHeaders(response);
      
      return response;
    }
    
    const isLoginRoute = pathname === "/login";
    const isRegisterRoute = pathname === "/register";
    const isAuthPage = isLoginRoute || isRegisterRoute;
    const isRootRoute = pathname === "/";
    const isVisitorApi = pathname.includes("/api/visitor");
    const isAuthApi = pathname.includes("/api/auth");
    const isGeneralApi = pathname.includes("/api/general");
    
    const nextAuthToken = await getToken({
      req: req,
      secret: NEXTAUTH_SECRET
    });
    
    const isAuthenticated = !!nextAuthToken;
    
    let rateLimiterRes = null;
    let rateLimitType = isApiRoute ? "api" : "page";
    
    try {
      if (isApiRoute && !isVisitorApi && !isAuthApi && !isGeneralApi) {
        rateLimiterRes = await rateLimiter.consume(ipAddress, 1);
      } else if (!isApiRoute) {
        rateLimiterRes = await pageRateLimiter.consume(ipAddress, 1);
      }
    } catch (rateLimiterError) {
      const retryAfterSeconds = Math.ceil((rateLimiterError.msBeforeNext || 60000) / 1000);
      const totalLimit = rateLimitType === "api" ? LIMIT_POINTS : PAGE_LIMIT_POINTS;
      
      response = new NextResponse(JSON.stringify({
        status: "error",
        code: 429,
        message: `Terlalu banyak permintaan. Silakan coba lagi dalam ${retryAfterSeconds} detik.`
      }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": retryAfterSeconds.toString()
        }
      });
      
      response = addSecurityHeaders(response);
      if (isApiRoute) response = addCorsHeaders(response);
      response = addNoCacheHeaders(response);
      
      response.headers.set("X-RateLimit-Remaining", "0");
      
      await performTracking(req);
      return response;
    }
    
    response = addSecurityHeaders(response);
    if (isApiRoute) {
      response = addCorsHeaders(response);
      response = addNoCacheHeaders(response);
    }
    
    response = addRateLimitHeaders(response, rateLimiterRes, null, rateLimitType);
    
    const redirectUrlWithProtocol = ensureProtocol(DOMAIN_URL, DEFAULT_PROTOCOL);
    
    if (isApiRoute) {
      if (req.method === "GET") {
        const searchParams = url.searchParams;
        if (!searchParams.has('_t')) {
          searchParams.set('_t', Date.now().toString());
          const newUrl = new URL(req.url);
          newUrl.search = searchParams.toString();
          response = NextResponse.rewrite(newUrl);
        }
      }
      
      await performTracking(req);
      return response;
    }
    
    if (isAuthenticated) {
      if (isAuthPage || isRootRoute) {
        response = NextResponse.redirect(`${redirectUrlWithProtocol}/analytics`);
        response = addSecurityHeaders(response);
        await performTracking(req);
        return response;
      }
      
      await performTracking(req);
      return response;
    } else {
      const isPublicPath = isAuthPage;
      
      if (!isPublicPath) {
        response = NextResponse.redirect(`${redirectUrlWithProtocol}/login`);
        response = addSecurityHeaders(response);
        await performTracking(req);
        return response;
      }
      
      await performTracking(req);
      return response;
    }
  } catch (error) {
    console.error("[Middleware-Error] Kesalahan tidak tertangani:", error);
    
    response = new NextResponse(JSON.stringify({
      status: "error",
      code: 500,
      message: "Kesalahan Server Internal"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
    
    response = addSecurityHeaders(response);
    if (pathname.startsWith("/api")) {
      response = addCorsHeaders(response);
      response = addNoCacheHeaders(response);
    }
    
    return response;
  }
}