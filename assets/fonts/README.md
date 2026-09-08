# Build-time fonts

`anuphan-thai.ttf` and `anuphan-latin.ttf` are TrueType conversions of the woff2 subsets served
from `public/fonts/`. They exist only so `scripts/build-brand-assets.ts` can typeset the
institution's name into `og-default.png`: sharp renders SVG through librsvg, which resolves fonts
through fontconfig, and fontconfig cannot read woff2.

Nothing serves these files — they are outside `public/`.

Regenerate after changing the woff2 subsets:

```
python3 -c "from fontTools.ttLib.woff2 import decompress; \
  decompress('public/fonts/anuphan-thai.woff2', 'assets/fonts/anuphan-thai.ttf'); \
  decompress('public/fonts/anuphan-latin.woff2', 'assets/fonts/anuphan-latin.ttf')"
```

(`pip install fonttools brotli`.) Two files rather than one because fontTools cannot merge two
variable fonts — `VarStore` has no merge logic — and both carry the same family name, so fontconfig
treats them as one family with complementary coverage.
