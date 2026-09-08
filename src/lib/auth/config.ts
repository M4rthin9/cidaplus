import type { NextAuthConfig, Session } from "next-auth";
import type { JWT } from "@auth/core/jwt";

export const LOGIN_PATH = "/admin/login";
export const ADMIN_HOME = "/admin";

/**
 * Edge-safe half of the Auth.js config.
 *
 * The middleware runs on the edge runtime, where neither `@node-rs/argon2`
 * (a native module) nor the postgres driver can load. Everything that needs
 * Node lives in `./index.ts`; this file must stay importable from both.
 *
 * Sessions are JWT because Auth.js refuses database sessions with the
 * credentials provider — @auth/core asserts "Signing in with credentials only
 * supported if JWT strategy is enabled". Revocation is recovered through
 * `users.session_version`, checked server-side in `./session.ts`.
 * SPEC.md §14 decision 13.
 */
export const authConfig = {
  trustHost: true,
  pages: { signIn: LOGIN_PATH, error: LOGIN_PATH },
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  providers: [],
  callbacks: {
    /**
     * Cheap gate only: does a syntactically valid token exist? The
     * authoritative check — active user, current session version, role — is
     * `requireAdmin()`, which runs in the Node runtime where the database is
     * reachable. Middleware exists to avoid rendering an admin shell to an
     * anonymous visitor, not to be the security boundary.
     */
    authorized({ auth, request }) {
      const isLogin = request.nextUrl.pathname.startsWith(LOGIN_PATH);
      const signedIn = Boolean(auth?.user);
      if (isLogin) return true;
      return signedIn;
    },
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.uid = user.id ?? "";
        token.role = user.role;
        token.sessionVersion = user.sessionVersion;
      }
      // Lets a server action refresh the claim after a role change.
      if (trigger === "update" && session && typeof session === "object") {
        const patch = session as Partial<{ role: "owner" | "editor"; sessionVersion: number }>;
        if (patch.role) token.role = patch.role;
        if (typeof patch.sessionVersion === "number") token.sessionVersion = patch.sessionVersion;
      }
      return token;
    },
    /**
     * `token` is annotated explicitly: in the config's own callback type it
     * widens to the `Record<string, unknown>` index signature of `JWT`, so the
     * augmented claims in `src/types/next-auth.d.ts` read back as `unknown`.
     */
    session({ session, token }: { session: Session; token: JWT }) {
      session.user.id = token.uid;
      session.user.role = token.role;
      session.user.sessionVersion = token.sessionVersion;
      return session;
    },
  },
} satisfies NextAuthConfig;
