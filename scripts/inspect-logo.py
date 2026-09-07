#!/usr/bin/env python3
"""Inspect a logo master: dimensions, alpha, baked padding, dominant colors,
and how it sits against the DESIGN.md navy/green tokens."""
import sys, math
from collections import Counter
from PIL import Image

NAVY  = (0x10, 0x29, 0x4B)
GREEN = (0x17, 0xA6, 0x6B)

def hexs(c): return "#%02X%02X%02X" % c[:3]

def srgb_to_lab(c):
    def f(u):
        u /= 255.0
        return u/12.92 if u <= 0.04045 else ((u+0.055)/1.055) ** 2.4
    r, g, b = (f(x) for x in c[:3])
    X = r*0.4124564 + g*0.3575761 + b*0.1804375
    Y = r*0.2126729 + g*0.7151522 + b*0.0721750
    Z = r*0.0193339 + g*0.1191920 + b*0.9503041
    Xn, Yn, Zn = 0.95047, 1.0, 1.08883
    def g_(t): return t ** (1/3) if t > 216/24389 else (841/108)*t + 4/29
    fx, fy, fz = g_(X/Xn), g_(Y/Yn), g_(Z/Zn)
    return (116*fy - 16, 500*(fx-fy), 200*(fy-fz))

def de76(a, b):
    la, lb = srgb_to_lab(a), srgb_to_lab(b)
    return math.sqrt(sum((x-y)**2 for x, y in zip(la, lb)))

def relative_luminance(c):
    def f(u):
        u /= 255.0
        return u/12.92 if u <= 0.03928 else ((u+0.055)/1.055) ** 2.4
    r, g, b = (f(x) for x in c[:3])
    return 0.2126*r + 0.7152*g + 0.0722*b

def contrast(a, b):
    la, lb = relative_luminance(a), relative_luminance(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)

def main(path):
    im = Image.open(path)
    print(f"file            : {path}")
    print(f"format / mode   : {im.format} / {im.mode}")
    print(f"dimensions      : {im.width} x {im.height}px  (aspect {im.width/im.height:.3f})")

    has_alpha_ch = im.mode in ("RGBA", "LA") or "transparency" in im.info
    rgba = im.convert("RGBA")
    alpha = rgba.getchannel("A")
    amin, amax = alpha.getextrema()
    transparent_px = sum(n for v, n in enumerate(alpha.histogram()) if v < 250)
    total = im.width * im.height
    print(f"alpha channel   : {'yes' if has_alpha_ch else 'NO'}"
          f"   (alpha range {amin}-{amax}; {transparent_px} of {total} px "
          f"= {100*transparent_px/total:.1f}% non-opaque)")
    if has_alpha_ch and amin == 255:
        print("                  -> channel present but fully opaque: effectively a flat background")

    # --- baked padding: bbox of alpha, and bbox of non-white ink ---
    abox = alpha.getbbox() if amin < 255 else None
    if abox:
        l, t, r, b = abox
        print(f"alpha bbox      : {abox}  -> padding L{l} T{t} R{im.width-r} B{im.height-b}")
    rgb = im.convert("RGB")
    # non-white mask (composited on white so transparent areas read as white)
    flat = Image.new("RGB", rgba.size, (255, 255, 255))
    flat.paste(rgba, mask=alpha)
    ink = flat.point(lambda v: 0 if v > 244 else 255).convert("L")
    ibox = ink.getbbox()
    if ibox:
        l, t, r, b = ibox
        print(f"ink bbox (vs white): {ibox}  -> padding L{l} T{t} R{im.width-r} B{im.height-b}"
              f"  ({100*l/im.width:.1f}% / {100*t/im.height:.1f}% / "
              f"{100*(im.width-r)/im.width:.1f}% / {100*(im.height-b)/im.height:.1f}%)")

    # --- dominant colors (ignore transparent + near-white/near-black paper) ---
    small = rgba.resize((min(400, im.width), min(400, im.height)))
    px = list(small.getdata())
    ink_px = [p[:3] for p in px if p[3] > 200]
    q = Image.new("RGB", (len(ink_px), 1))
    q.putdata(ink_px)
    pal = q.quantize(colors=12, method=Image.Quantize.MEDIANCUT).convert("RGB")
    counts = Counter(pal.getdata())
    print("\ndominant colors (opaque pixels, median-cut, top 8):")
    for c, n in counts.most_common(8):
        print(f"  {hexs(c):8s}  {100*n/len(ink_px):5.1f}%   "
              f"dE76 vs navy {de76(c, NAVY):6.1f} | vs green {de76(c, GREEN):6.1f}")

    print("\npalette check:")
    for name, tok in (("navy  #10294B", NAVY), ("green #17A66B", GREEN)):
        best = min(counts.most_common(8), key=lambda kv: de76(kv[0], tok))
        print(f"  {name}: nearest logo color {hexs(best[0])} dE76={de76(best[0], tok):.1f} "
              f"({'match' if de76(best[0],tok)<10 else 'near-miss - two-of-a-kind risk' if de76(best[0],tok)<25 else 'distinct'})")
        print(f"     contrast on white: {contrast(tok,(255,255,255)):.2f}:1")

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "public/brand/cida-logo.png")
