"""Render a card thumbnail for each PDF in the newsletter archive.

The archive used to draw thumbnails in the browser with pdf.js, which meant
every visitor downloaded the full PDFs and a 372KB library to see six small
pictures, and a <canvas> has no natural size so landscape sheets were stretched
into the portrait card. Thumbnails are pre-rendered instead: one .webp beside
each .pdf, always 600x800, with the sheet centred on a #2D2D2D letterbox. That
gives landscape and portrait sheets the same card shape.

Dev-time tool, not part of the site. scripts/ is in .assetsignore, so nothing
here is served. Needs PyMuPDF and Pillow, which the site itself does not.

    python scripts/make-pdf-thumbs.py                    # every PDF, skipping current ones
    python scripts/make-pdf-thumbs.py path/to/one.pdf    # just this one
    python scripts/make-pdf-thumbs.py --force            # rebuild everything
"""

import glob
import os
import sys

import fitz  # PyMuPDF
from PIL import Image

WIDTH, HEIGHT = 600, 800
LETTERBOX = (0x2D, 0x2D, 0x2D)  # --dark, the same colour as the site footer
QUALITY = 84
SOURCES = ("pdfs/flyers/*.pdf", "pdfs/newsletters/*.pdf")


def render(pdf_path):
    """Write <pdf_path>.webp and return (sheet_size, letterbox_bar_px, bytes)."""
    doc = fitz.open(pdf_path)
    page = doc[0]
    pw, ph = page.rect.width, page.rect.height

    # Contain: scale so the whole sheet fits, never crop it.
    scale = min(WIDTH / pw, HEIGHT / ph)
    # Rasterise at 2x then downsample, so text on a dense flyer stays legible.
    pix = page.get_pixmap(matrix=fitz.Matrix(scale * 2, scale * 2))
    sheet = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    doc.close()

    sheet = sheet.resize((round(pw * scale), round(ph * scale)), Image.LANCZOS)
    canvas = Image.new("RGB", (WIDTH, HEIGHT), LETTERBOX)
    canvas.paste(sheet, ((WIDTH - sheet.width) // 2, (HEIGHT - sheet.height) // 2))

    dest = os.path.splitext(pdf_path)[0] + ".webp"
    canvas.save(dest, "WEBP", quality=QUALITY, method=6)

    bar = (HEIGHT - sheet.height) // 2 if sheet.height < HEIGHT else (WIDTH - sheet.width) // 2
    return dest, sheet.size, bar, os.path.getsize(dest)


def main(argv):
    force = "--force" in argv
    named = [a for a in argv if not a.startswith("--")]

    if named:
        targets = named
    else:
        targets = sorted(p for pattern in SOURCES for p in glob.glob(pattern))

    if not targets:
        print("no PDFs found")
        return 1

    for pdf in targets:
        if not os.path.exists(pdf):
            print(f"  missing: {pdf}")
            return 1
        dest = os.path.splitext(pdf)[0] + ".webp"
        # Skip thumbnails that are already newer than their PDF.
        if not force and not named and os.path.exists(dest) \
                and os.path.getmtime(dest) >= os.path.getmtime(pdf):
            print(f"  up to date  {os.path.basename(dest)}")
            continue
        _, size, bar, nbytes = render(pdf)
        shape = "landscape" if size[0] > size[1] else "portrait"
        print(f"  wrote       {os.path.basename(dest):32} {shape:9} "
              f"sheet {size[0]}x{size[1]}  bar {bar}px  {nbytes // 1024} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
