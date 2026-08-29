from pathlib import Path

from PIL import Image, ImageOps

SOURCE = Path(r"C:\Users\jtange\Downloads\summer-photo-live-review\OWNER-EDITING\FINAL-24")
ALTERNATES = Path(r"C:\Users\jtange\Downloads\summer-photo-live-review\OWNER-EDITING\FINAL-MANUAL-PASS")
OUTPUT = Path(r"C:\Users\jtange\luana-english-school\photos\summer-2026")
OG_IMAGE = OUTPUT / "summer-og.webp"
EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def save_variant(image: Image.Image, destination: Path, width: int, quality: int) -> None:
    variant = image.copy()
    if variant.width > width:
        height = round(variant.height * width / variant.width)
        variant = variant.resize((width, height), Image.Resampling.LANCZOS)
    destination.parent.mkdir(parents=True, exist_ok=True)
    variant.save(destination, "WEBP", quality=quality, method=6)


def main() -> None:
    sources = sorted(
        path for path in SOURCE.iterdir()
        if path.is_file()
        and path.suffix.lower() in EXTENSIONS
        and path.name != "FINAL-24-CONTACT-SHEET.jpg"
    )
    if len(sources) != 24:
        raise RuntimeError(f"Expected 24 final photos, found {len(sources)}")

    for source in sources:
        with Image.open(source) as opened:
            image = ImageOps.exif_transpose(opened).convert("RGB")
            save_variant(image, OUTPUT / "1600" / f"{source.stem}.webp", 1600, 84)
            save_variant(image, OUTPUT / "960" / f"{source.stem}.webp", 960, 80)

    replacement_names = [
        "W3-D5-05-Hug-Hug-Bouldering-Field-Trip.jpg",
        "W3-D5-07-Hug-Hug-Bouldering-Field-Trip.jpg",
        "W3-D5-11-Hug-Hug-Bouldering-Field-Trip.jpg",
    ]
    for name in replacement_names:
        source = ALTERNATES / name
        with Image.open(source) as opened:
            image = ImageOps.exif_transpose(opened).convert("RGB")
            save_variant(image, OUTPUT / "1600" / f"{source.stem}.webp", 1600, 84)
            save_variant(image, OUTPUT / "960" / f"{source.stem}.webp", 960, 80)

    og_sources = [
        SOURCE / "W1-D4-01-Japan-Matsuri.jpg",
        SOURCE / "W2-D3-07-Tides-Waves.jpg",
        SOURCE / "W3-D5-09-Hug-Hug-Bouldering-Field-Trip.jpg",
    ]
    canvas = Image.new("RGB", (1200, 630), "#11293c")
    panel_width = canvas.width // len(og_sources)
    for index, source in enumerate(og_sources):
        with Image.open(source) as opened:
            image = ImageOps.exif_transpose(opened).convert("RGB")
            panel = ImageOps.fit(image, (panel_width, canvas.height), method=Image.Resampling.LANCZOS)
            canvas.paste(panel, (index * panel_width, 0))
    canvas.save(OG_IMAGE, "WEBP", quality=88, method=6)

    print(f"Prepared {len(sources)} photos at 1600px and 960px")
    print(f"Prepared social preview: {OG_IMAGE.name}")


if __name__ == "__main__":
    main()
