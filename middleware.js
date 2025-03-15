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
    origin,
    pathname
  } = url;
  const userAgent = req.headers.get("user-agent") || "";
  const parsedUserAgent = new UAParser.UAParser(userAgent);

  if (parsedUserAgent.getBrowser().name === undefined) {
    return NextResponse.json({ error: "Akses ditolak! User-Agent tidak diizinkan." }, { status: 403 });
  }
  const authTokenCookie = cookies().get("auth_token");
  const isAuthenticated = Boolean(authTokenCookie);
  if (!isAuthenticated && !pathname.includes("api") && !pathname.includes("authentication")) {
    return NextResponse.redirect(`${origin}/authentication/sign-in`);
  }
  const dashboardRoutes = ["dashboard", "playground", "docs", "pages"];
  if (!dashboardRoutes.some(route => pathname.includes(route))) {
    try {
      const reqLog = await fetch(`${origin}/api/visitor/req`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      });
      console.log(await reqLog.json());
    } catch (error) {
      console.error("Error fetching request log:", error);
    }
    try {
      const infoLog = await fetch(`${origin}/api/visitor/info`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          route: pathname,
          time: new Date().toISOString(),
          hit: 1
        })
      });
      console.log(await infoLog.json());
    } catch (error) {
      console.error("Error posting visitor info:", error);
    }
  } else {
    try {
      const visitLog = await fetch(`${origin}/api/visitor/visit`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      });
      console.log(await visitLog.json());
    } catch (error) {
      console.error("Error fetching visit log:", error);
    }
  }
  return NextResponse.next();
}