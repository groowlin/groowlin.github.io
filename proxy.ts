import { NextResponse } from "next/server";
import { auth } from "@/auth";

const ADMIN_PREFIX = "/admin";
const ADMIN_API_PREFIX = "/api/admin";

function isAdminPath(pathname: string) {
  return pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`);
}

function isAdminApiPath(pathname: string) {
  return pathname === ADMIN_API_PREFIX || pathname.startsWith(`${ADMIN_API_PREFIX}/`);
}

export default auth((req) => {
  const pathname = req.nextUrl.pathname;
  const session = req.auth;
  const allowedGithubId = process.env.GITHUB_ALLOWED_USER_ID;
  const isLoginPage = pathname === "/admin/login";

  if (isLoginPage && session) {
    return NextResponse.redirect(new URL("/admin", req.nextUrl));
  }

  if (isLoginPage) {
    return NextResponse.next();
  }

  if (!isAdminPath(pathname) && !isAdminApiPath(pathname)) {
    return NextResponse.next();
  }

  if (!session?.user?.id) {
    if (isAdminApiPath(pathname)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const loginUrl = new URL("/admin/login", req.nextUrl);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!allowedGithubId || session.user.id !== allowedGithubId) {
    if (isAdminApiPath(pathname)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"]
};
