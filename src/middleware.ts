import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/config";

/**
 * Edge gate. Uses the provider-free config so no native module or database
 * driver is pulled into the edge bundle. The real check is `requireAdmin()`.
 */
export const { auth: middleware } = NextAuth(authConfig);

export default middleware;

export const config = {
  matcher: ["/admin/:path*"],
};
