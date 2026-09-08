import createIntlMiddleware from "next-intl/middleware";
import NextAuth from "next-auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth/config";
import { routing } from "@/i18n/routing";

/**
 * Two jobs, split by path.
 *
 * `/admin/*` goes through the Auth.js edge gate, which uses the provider-free
 * config so no native module or database driver is pulled into the edge bundle.
 * That gate is a cheap "is there a token" check — the real one is
 * `requireAdmin()`, which runs in the Node runtime.
 *
 * Everything public goes through next-intl, which resolves the locale from the
 * path and rewrites to `/[locale]/...`. It must not run on `/admin`, `/media`
 * or `/api`: those are not locale-scoped, and a rewrite would break them.
 */
const intlMiddleware = createIntlMiddleware(routing);

const { auth } = NextAuth(authConfig);

/**
 * The path, forwarded so a server component can mark the active nav item
 * without becoming a client component. `next/headers` exposes no request URL.
 */
function withPathname(response: NextResponse, pathname: string): NextResponse {
  response.headers.set("x-pathname", pathname);
  return response;
}

const adminGate = auth((request) => {
  return withPathname(NextResponse.next(), request.nextUrl.pathname);
});

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    // The typed signature of an Auth.js middleware is wider than what Next
    // passes it; the cast keeps the call honest without an `any`.
    return (adminGate as unknown as (req: NextRequest) => ReturnType<typeof adminGate>)(request);
  }

  return withPathname(intlMiddleware(request), pathname);
}

export const config = {
  /**
   * Skip Next internals, the media route (§14 decision 16 — Cloudflare caches
   * `/media/*`, and a locale rewrite there would be nonsense), the API, and any
   * path with a file extension.
   */
  matcher: ["/((?!_next|media|api|.*\\..*).*)"],
};
