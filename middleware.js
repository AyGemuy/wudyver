import {
  NextResponse
} from "next/server";

export const config = {
  matcher: ["/", "/dashboard/:path*", "/playground/:path*", "/docs/:path*", "/pages/:path*", "/authentication/:path*"]
};
const REQUESTS = new Map();

export async function middleware(req) {
  const authTokenCookie = req.cookies.get("auth_token");
  const isAuthenticated = authTokenCookie ? true : false;
  if (!isAuthenticated && !req.nextUrl.pathname.startsWith("/api") && !req.nextUrl.pathname.startsWith("/authentication")) {
    return NextResponse.redirect(`${req.nextUrl.origin}/authentication/sign-in`);
  }
  if (req.nextUrl.pathname.startsWith("/api") && !["/api/visitor", "/api/user", "/api/general"].some(route => req.nextUrl.pathname.startsWith(route))) {
  const ip = req.ip || req.headers.get("x-forwarded-for") || "unknown";
    const now = Date.now();

    const lastRequestTime = REQUESTS.get(ip) || 0;

    if (now - lastRequestTime < 1000) {
      return new NextResponse(
        JSON.stringify({
          error: "Rate limit exceeded. Please wait 1 second before making another request.",
        }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }
    REQUESTS.set(ip, now);
    try {
      const [hitResponse, reqResponse] = await Promise.all([
        fetch(`${req.nextUrl.origin}/api/visitor/info`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            route: req.nextUrl.pathname,
            time: new Date().toISOString(),
            hit: 1,
          }),
        }),
        fetch(`${req.nextUrl.origin}/api/visitor/req`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }),
      ]);

      if (hitResponse.ok) {
        const result = await hitResponse.json();
        console.log(result?.message);
      } else {
        console.error(hitResponse.statusText);
      }

      if (reqResponse.ok) {
        const result = await reqResponse.json();
        console.log(result?.message);
      } else {
        console.error(reqResponse.statusText);
      }
    } catch (error) {
      console.error(error);
    }
  } else if (["/dashboard", "/playground", "/docs", "/pages"].some(route => req.nextUrl.pathname.startsWith(route))) {
    try {
      const visitResponse = await fetch(`${req.nextUrl.origin}/api/visitor/visit`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (visitResponse.ok) {
        const result = await visitResponse.json();
        console.log(result?.message);
      } else {
        console.error(visitResponse.statusText);
      }
    } catch (error) {
      console.error(error);
    }
  }
  return NextResponse.next();
}