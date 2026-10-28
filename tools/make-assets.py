#!/usr/bin/env python3
"""Generate raster assets for SAVE THE TIGERS (run once; outputs are committed).

  python3 tools/make-assets.py [path/to/qr-source.png]

Creates in src/assets/: icon-192.png, icon-512.png, apple-touch-icon.png,
og-image.jpg (1200x630), support-upi.webp + support-upi.png (optimised QR),
and src/favicon.ico (copied to the site root by the build).
Requires Pillow (pip install pillow).
"""
import math
import os
import sys

from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "src", "assets")
os.makedirs(OUT, exist_ok=True)

BG = (11, 19, 14)          # #0B130E
AMBER = (255, 154, 31)     # #FF9A1F
ORANGE = (232, 89, 12)     # #E8590C
TEXT = (234, 242, 236)
MUTED = (157, 179, 164)
SS = 4                     # supersampling factor for smooth edges


def bezier(p0, p1, p2, p3, n=24):
    pts = []
    for i in range(n + 1):
        t = i / n
        x = (1 - t) ** 3 * p0[0] + 3 * (1 - t) ** 2 * t * p1[0] + 3 * (1 - t) * t ** 2 * p2[0] + t ** 3 * p3[0]
        y = (1 - t) ** 3 * p0[1] + 3 * (1 - t) ** 2 * t * p1[1] + 3 * (1 - t) * t ** 2 * p2[1] + t ** 3 * p3[1]
        pts.append((x, y))
    return pts


def quad(p0, p1, p2, n=20):
    return [((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t ** 2 * p2[0],
             (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t ** 2 * p2[1])
            for t in (i / n for i in range(n + 1))]


# Same geometry as the SVG logo (64 x 64 box)
PAD = (bezier((32, 29), (41, 29), (49, 37), (49, 46))
       + bezier((49, 46), (49, 53), (43.5, 56.5), (38, 54.5))
       + bezier((38, 54.5), (34.5, 53.3), (29.5, 53.3), (26, 54.5))
       + bezier((26, 54.5), (20.5, 56.5), (15, 53), (15, 46))
       + bezier((15, 46), (15, 37), (23, 29), (32, 29)))
TOES = [(13, 27, 5.2, 7.2, -24), (25, 16, 5.4, 7.8, -9), (39, 16, 5.4, 7.8, 9), (51, 27, 5.2, 7.2, 24)]
STRIPES = [quad((17, 41), (24, 43), (28, 50)), quad((47, 41), (40, 43), (36, 50))]


def paw_mask(canvas, box, ox, oy, stripes=True):
    """L-mode mask of the paw drawn at box x box px, top-left at (ox, oy), on a canvas x canvas image."""
    big = canvas * SS
    k = box * SS / 64.0
    mask = Image.new("L", (big, big), 0)
    d = ImageDraw.Draw(mask)

    def tx(p):
        return (ox * SS + p[0] * k, oy * SS + p[1] * k)

    d.polygon([tx(p) for p in PAD], fill=255)
    for cx, cy, rx, ry, ang in TOES:
        layer = Image.new("L", (big, big), 0)
        ld = ImageDraw.Draw(layer)
        c = tx((cx, cy))
        ld.ellipse([c[0] - rx * k, c[1] - ry * k, c[0] + rx * k, c[1] + ry * k], fill=255)
        layer = layer.rotate(-ang, center=c, resample=Image.BICUBIC)  # SVG rotate is clockwise
        mask = ImageChops.lighter(mask, layer)
    if stripes:
        d = ImageDraw.Draw(mask)
        w = 2.6 * k
        for path in STRIPES:
            pts = [tx(p) for p in path]
            d.line(pts, fill=0, width=int(w), joint="curve")
            for p in (pts[0], pts[-1]):
                d.ellipse([p[0] - w / 2, p[1] - w / 2, p[0] + w / 2, p[1] + w / 2], fill=0)
    return mask.resize((canvas, canvas), Image.LANCZOS)


def gradient(w, h):
    g = Image.new("RGB", (w, h))
    px = g.load()
    for y in range(h):
        for x in range(w):
            t = (x / max(w - 1, 1) + y / max(h - 1, 1)) / 2
            px[x, y] = tuple(int(AMBER[i] + (ORANGE[i] - AMBER[i]) * t) for i in range(3))
    return g


def draw_paw(img, box, ox, oy, opacity=1.0, stripes=True):
    """Composite a gradient paw onto an RGB(A) image."""
    w, h = img.size
    canvas = max(w, h)
    mask = paw_mask(canvas, box, ox, oy, stripes).crop((0, 0, w, h))
    if opacity < 1:
        mask = mask.point(lambda v: int(v * opacity))
    img.paste(gradient(w, h), (0, 0), mask)


def font(size, bold=True):
    names = ["DejaVuSans-Bold.ttf", "LiberationSans-Bold.ttf", "NotoSans-Bold.ttf"] if bold else \
            ["DejaVuSans.ttf", "LiberationSans-Regular.ttf", "NotoSans-Regular.ttf"]
    for base in ("/usr/share/fonts/truetype/dejavu", "/usr/share/fonts/truetype/liberation",
                 "/usr/share/fonts/truetype/noto", "/usr/share/fonts/opentype/noto"):
        for n in names:
            p = os.path.join(base, n)
            if os.path.exists(p):
                return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def spaced(draw, xy, text, fnt, fill, spacing=0):
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=fnt, fill=fill)
        x += draw.textlength(ch, font=fnt) + spacing
    return x


# ---------- App icons (solid background so they also work as maskable icons) ----------
def square_icon(size, pad_ratio):
    img = Image.new("RGB", (size, size), BG)
    box = int(size * (1 - 2 * pad_ratio))
    off = (size - box) // 2
    draw_paw(img, box, off, off - int(box * 0.02))
    return img


square_icon(512, 0.2).save(os.path.join(OUT, "icon-512.png"), optimize=True)
square_icon(192, 0.2).save(os.path.join(OUT, "icon-192.png"), optimize=True)
square_icon(180, 0.16).save(os.path.join(OUT, "apple-touch-icon.png"), optimize=True)

# favicon.ico: rounded dark square with paw, 16/32/48
ico_base = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
rr = Image.new("L", (256 * SS, 256 * SS), 0)
ImageDraw.Draw(rr).rounded_rectangle([0, 0, 256 * SS - 1, 256 * SS - 1], radius=56 * SS, fill=255)
rr = rr.resize((256, 256), Image.LANCZOS)
ico_base.paste(Image.new("RGBA", (256, 256), BG + (255,)), (0, 0), rr)
draw_paw(ico_base, 200, 28, 24, stripes=False)
ico_base.save(os.path.join(ROOT, "src", "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)])

# ---------- Open Graph / Twitter card image (1200 x 630) ----------
W, H = 1200, 630
og = Image.new("RGB", (W, H), BG)
glow = Image.new("RGB", (W, H), BG)
gd = ImageDraw.Draw(glow)
for r in range(520, 0, -8):
    a = 1 - r / 520
    col = tuple(int(BG[i] + (c - BG[i]) * a * 0.22) for i, c in enumerate((255, 154, 31)))
    gd.ellipse([W - 80 - r, -80 - r, W - 80 + r, -80 + r], fill=col)
og = glow
# faint paw trail
for i, (x, y, s) in enumerate([(480, 70, 84), (620, 20, 84), (760, 80, 84), (900, 30, 84), (1040, 90, 84)]):
    draw_paw(og, s, x, y, opacity=0.12, stripes=False)
# main mark
draw_paw(og, 230, 80, 150)
draw_paw(og, 120, 250, 70, opacity=0.35, stripes=False)
d = ImageDraw.Draw(og)
spaced(d, (360, 190), "SAVE THE", font(44), MUTED, 10)
# gradient "TIGERS"
txt_layer = Image.new("L", (W, H), 0)
ImageDraw.Draw(txt_layer).text((354, 232), "TIGERS", font=font(150), fill=255)
og.paste(gradient(W, H), (0, 0), txt_layer)
d = ImageDraw.Draw(og)
d.text((360, 410), "3,682 wild tigers in India (2022 estimate)", font=font(36, False), fill=TEXT)
d.text((360, 462), "Facts  |  Threats  |  How to help", font=font(28, False), fill=MUTED)
d.rectangle([0, H - 14, W, H], fill=AMBER)
d.text((80, H - 70), "savethetiger.site", font=font(26), fill=AMBER)
og.save(os.path.join(OUT, "og-image.jpg"), quality=86, optimize=True, progressive=True)

# ---------- UPI QR: resize to 2x display size, save lossless WebP + optimised PNG ----------
src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "tools", "qr-source.png")
if os.path.exists(src):
    qr = Image.open(src).convert("RGB").resize((336, 336), Image.LANCZOS)
    qr.save(os.path.join(OUT, "support-upi.webp"), lossless=True, quality=100, method=6)
    qr.save(os.path.join(OUT, "support-upi.png"), optimize=True)
else:
    print("QR source not found, skipped:", src)

for f in sorted(os.listdir(OUT)):
    print(f"{f:24s} {os.path.getsize(os.path.join(OUT, f)):>8,d} bytes")
print(f"{'favicon.ico':24s} {os.path.getsize(os.path.join(ROOT, 'src', 'favicon.ico')):>8,d} bytes")
