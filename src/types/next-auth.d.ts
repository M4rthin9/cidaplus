import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "owner" | "editor";
      sessionVersion: number;
    } & DefaultSession["user"];
  }

  interface User {
    role: "owner" | "editor";
    sessionVersion: number;
  }
}

/**
 * `next-auth/jwt` is a bare re-export of `@auth/core/jwt`, so augmenting the
 * alias has no effect — the interface has to be reopened where it is declared.
 */
declare module "@auth/core/jwt" {
  interface JWT {
    uid: string;
    role: "owner" | "editor";
    sessionVersion: number;
  }
}
