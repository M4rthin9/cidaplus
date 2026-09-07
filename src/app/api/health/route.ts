import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Container health check. Deliberately does not touch the database — phase 1 owns that. */
export function GET() {
  return NextResponse.json({ status: "ok" }, { status: 200 });
}
