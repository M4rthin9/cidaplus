import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { NextResponse } from "next/server";
import { cacheHeaders, resolveMediaPath } from "@/lib/media/storage";

/**
 * Serves derivatives from MEDIA_DIR.
 *
 * Mounted at /media/* rather than /api/media/* on purpose: §11 tells Cloudflare
 * to cache /media/* aggressively and to BYPASS cache on /api/*, so serving here
 * from an /api path would silently make every image uncacheable at the edge —
 * on a host with no guaranteed international bandwidth (§2).
 *
 * Caddy can take this path over verbatim in phase 11 without any URL changing.
 */

const CONTENT_TYPES: Record<string, string> = {
  avif: "image/avif",
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
): Promise<Response> {
  const { key } = await params;

  const filePath = resolveMediaPath(key);
  if (!filePath) return new NextResponse("Not found", { status: 404 });

  const extension = filePath.split(".").pop()?.toLowerCase() ?? "";
  const contentType = CONTENT_TYPES[extension];
  if (!contentType) return new NextResponse("Not found", { status: 404 });

  const info = await stat(filePath).catch(() => null);
  if (!info?.isFile()) return new NextResponse("Not found", { status: 404 });

  const stream = Readable.toWeb(createReadStream(filePath)) as WebReadableStream<Uint8Array>;

  return new NextResponse(stream as unknown as BodyInit, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(info.size),
      ...cacheHeaders(`${filePath}:${info.size}:${info.mtimeMs}`),
    },
  });
}
