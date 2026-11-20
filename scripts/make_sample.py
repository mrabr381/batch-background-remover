"""Generate the 3 sample product images with PIL (no real photos, no stock).

Each image is a simple, solid-colour product-like shape on a plain,
contrasting background — the kind of clean packshot rembg handles well.
Run:  python scripts/make_sample.py
Writes: sample_data/mug.png, sample_data/sneaker.png, sample_data/bottle.png
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

SIZE = (600, 600)
OUT = Path(__file__).resolve().parent.parent / "sample_data"


def mug() -> Image.Image:
    """A coffee mug: red body + handle on a pale-blue background."""
    img = Image.new("RGB", SIZE, (183, 216, 240))
    d = ImageDraw.Draw(img)
    # body
    d.rounded_rectangle([170, 180, 400, 460], radius=28, fill=(198, 60, 48))
    # handle (ring on the right side)
    d.ellipse([390, 240, 480, 380], outline=(198, 60, 48), width=26)
    # rim highlight
    d.rounded_rectangle([170, 180, 400, 210], radius=14, fill=(224, 92, 78))
    # coffee surface
    d.ellipse([190, 185, 380, 215], fill=(84, 48, 24))
    return img


def sneaker() -> Image.Image:
    """A trainer: white upper + orange sole on a pale-grey background."""
    img = Image.new("RGB", SIZE, (226, 226, 226))
    d = ImageDraw.Draw(img)
    # sole
    d.rounded_rectangle([90, 400, 520, 460], radius=22, fill=(232, 116, 28))
    # upper (chunky shoe silhouette)
    d.polygon(
        [(110, 400), (150, 280), (250, 250), (330, 290), (470, 330), (510, 400)],
        fill=(245, 245, 245),
    )
    # toe cap + heel
    d.pieslice([90, 330, 200, 430], start=90, end=270, fill=(40, 90, 160))
    d.rectangle([440, 300, 510, 400], fill=(40, 90, 160))
    # laces
    for i, y in enumerate(range(300, 360, 18)):
        d.line([(250 + i * 8, y), (300 + i * 8, y + 8)], fill=(60, 60, 60), width=5)
    return img


def bottle() -> Image.Image:
    """A drinks bottle: green glass body + cap on a pale-yellow background."""
    img = Image.new("RGB", SIZE, (244, 238, 200))
    d = ImageDraw.Draw(img)
    # body
    d.rounded_rectangle([230, 200, 370, 480], radius=30, fill=(34, 139, 92))
    # shoulder + neck
    d.polygon([(230, 230), (270, 150), (330, 150), (370, 230)], fill=(34, 139, 92))
    d.rectangle([272, 110, 328, 155], fill=(34, 139, 92))
    # cap
    d.rounded_rectangle([262, 82, 338, 115], radius=8, fill=(200, 40, 40))
    # label
    d.rectangle([230, 300, 370, 400], fill=(250, 250, 240))
    d.rectangle([250, 330, 350, 345], fill=(34, 139, 92))
    d.rectangle([250, 360, 330, 372], fill=(200, 40, 40))
    return img


GENERATORS = {"mug.png": mug, "sneaker.png": sneaker, "bottle.png": bottle}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, fn in GENERATORS.items():
        path = OUT / name
        fn().save(path)
        print(f"wrote {path} ({path.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
