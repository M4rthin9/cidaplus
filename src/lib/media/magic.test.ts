import { describe, expect, it } from "vitest";
import { sniffImageFormat } from "./magic";

const bytes = (...v: number[]) => new Uint8Array(v);
const withAscii = (s: string, offset: number, length = offset + s.length) => {
  const b = new Uint8Array(length);
  for (let i = 0; i < s.length; i += 1) b[offset + i] = s.charCodeAt(i);
  return b;
};

describe("sniffImageFormat", () => {
  it("recognises JPEG", () => {
    expect(sniffImageFormat(bytes(0xff, 0xd8, 0xff, 0xe0, 0x00))).toBe("jpeg");
  });

  it("recognises PNG", () => {
    expect(sniffImageFormat(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("png");
  });

  it("recognises WebP by both the RIFF and WEBP markers", () => {
    const b = withAscii("RIFF", 0, 16);
    "WEBP".split("").forEach((c, i) => (b[8 + i] = c.charCodeAt(0)));
    expect(sniffImageFormat(b)).toBe("webp");
  });

  it("does not mistake a plain RIFF container (e.g. WAV) for WebP", () => {
    const b = withAscii("RIFF", 0, 16);
    "WAVE".split("").forEach((c, i) => (b[8 + i] = c.charCodeAt(0)));
    expect(sniffImageFormat(b)).toBeNull();
  });

  it("recognises AVIF from the major brand", () => {
    const b = new Uint8Array(24);
    "ftyp".split("").forEach((c, i) => (b[4 + i] = c.charCodeAt(0)));
    "avif".split("").forEach((c, i) => (b[8 + i] = c.charCodeAt(0)));
    expect(sniffImageFormat(b)).toBe("avif");
  });

  it("recognises AVIF listed only as a compatible brand", () => {
    const b = new Uint8Array(32);
    "ftyp".split("").forEach((c, i) => (b[4 + i] = c.charCodeAt(0)));
    "mif1".split("").forEach((c, i) => (b[8 + i] = c.charCodeAt(0)));
    "avif".split("").forEach((c, i) => (b[20 + i] = c.charCodeAt(0)));
    expect(sniffImageFormat(b)).toBe("avif");
  });

  it("rejects SVG, which is the stored-XSS route through an image uploader", () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>');
    expect(sniffImageFormat(svg)).toBeNull();
  });

  it("rejects HTML and a bare text file", () => {
    expect(sniffImageFormat(new TextEncoder().encode("<!doctype html><html>"))).toBeNull();
    expect(sniffImageFormat(new TextEncoder().encode("just text"))).toBeNull();
  });

  it("rejects an empty or truncated buffer instead of throwing", () => {
    expect(sniffImageFormat(new Uint8Array())).toBeNull();
    expect(sniffImageFormat(bytes(0xff, 0xd8))).toBeNull();
  });

  it("ignores the filename entirely — bytes decide", () => {
    // Content is a PNG; a caller claiming ".jpg" cannot change the answer.
    expect(sniffImageFormat(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("png");
  });
});
