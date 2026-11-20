"""Core background-removal logic (rembg / U2-Net, local CPU inference).

The U2-Net model (~170 MB) is downloaded once, on first use, from the
rembg model host (GitHub releases) and cached in ~/.u2net. After that the
tool works fully offline.
"""

from __future__ import annotations

import io
import re
import time
from pathlib import Path

from PIL import Image

SUPPORTED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp"}

# rembg session is created lazily so `--help` and error paths never trigger
# a model download.
_session = None


def get_session(model: str = "u2net"):
    """Return a cached rembg session (downloads the model on first call)."""
    global _session
    if _session is None:
        from rembg import new_session

        _session = new_session(model)
    return _session


def remove_background(
    image: Image.Image,
    model: str = "u2net",
    alpha_matting: bool = False,
    alpha_matting_foreground_threshold: int = 240,
    alpha_matting_background_threshold: int = 10,
    alpha_matting_erode_size: int = 10,
) -> Image.Image:
    """Remove the background of a PIL image. Returns an RGBA image."""
    from rembg import remove

    session = get_session(model)
    kwargs = {}
    if alpha_matting:
        kwargs = {
            "alpha_matting": True,
            "alpha_matting_foreground_threshold": alpha_matting_foreground_threshold,
            "alpha_matting_background_threshold": alpha_matting_background_threshold,
            "alpha_matting_erode_size": alpha_matting_erode_size,
        }
    out = remove(image, session=session, **kwargs)
    if isinstance(out, bytes):
        return Image.open(io.BytesIO(out)).convert("RGBA")
    return out.convert("RGBA")


def measure(image: Image.Image) -> dict:
    """Measure the alpha mask of an RGBA image (numbers, not eyeballing).

    Returns transparent / semi-transparent / opaque pixel fractions, the
    bounding box of the opaque region, and the size. A good cut has:
    corners transparent, the product centre opaque, and only a thin
    semi-transparent edge band.
    """
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    w, h = rgba.size
    total = w * h
    hist = alpha.histogram()  # 256 bins, 0..255
    transparent = sum(hist[0:10])
    semi = sum(hist[10:246])
    opaque = sum(hist[246:256])
    bbox = alpha.getbbox()  # bounding box of non-zero alpha
    return {
        "width": w,
        "height": h,
        "total_pixels": total,
        "transparent_pct": round(100 * transparent / total, 2),
        "semi_transparent_pct": round(100 * semi / total, 2),
        "opaque_pct": round(100 * opaque / total, 2),
        "bbox": list(bbox) if bbox else None,
    }


def corner_alpha(image: Image.Image) -> dict:
    """Alpha values at the four corners — background corners must be ~0."""
    rgba = image.convert("RGBA")
    w, h = rgba.size
    px = rgba.load()
    return {
        "top_left": px[0, 0][3],
        "top_right": px[w - 1, 0][3],
        "bottom_left": px[0, h - 1][3],
        "bottom_right": px[w - 1, h - 1][3],
    }


def centre_alpha(image: Image.Image) -> int:
    """Alpha at the image centre — the product centre must be ~255."""
    rgba = image.convert("RGBA")
    w, h = rgba.size
    return rgba.load()[w // 2, h // 2][3]


_HEX_COLOR = re.compile(r"^#([0-9a-fA-F]{6})$")


def parse_background(value: str) -> str | tuple:
    """Parse --bg: 'transparent', 'white', 'black', or '#RRGGBB'."""
    v = value.strip().lower()
    if v in ("transparent", "none"):
        return "transparent"
    if v == "white":
        return (255, 255, 255)
    if v == "black":
        return (0, 0, 0)
    m = _HEX_COLOR.match(value.strip())
    if m:
        hx = m.group(1)
        return (int(hx[0:2], 16), int(hx[2:4], 16), int(hx[4:6], 16))
    raise ValueError(
        f"invalid background {value!r}: use transparent, white, black or #RRGGBB"
    )


def apply_background(image: Image.Image, background: str | tuple) -> Image.Image:
    """Composite an RGBA image onto a background. Returns RGBA (transparent)
    or RGB (solid background)."""
    rgba = image.convert("RGBA")
    if background == "transparent":
        return rgba
    bg = Image.new("RGBA", rgba.size, (*background, 255))
    return Image.alpha_composite(bg, rgba).convert("RGB")


def process_file(
    in_path: Path,
    out_path: Path,
    model: str = "u2net",
    background: str | tuple = "transparent",
    alpha_matting: bool = False,
) -> dict:
    """Remove the background of one file. Returns stats + timing."""
    started = time.monotonic()
    with Image.open(in_path) as im:
        im = im.convert("RGB")
        result = remove_background(im, model=model, alpha_matting=alpha_matting)
        result = apply_background(result, background)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    result.save(out_path)
    stats = measure(result if result.mode == "RGBA" else result.convert("RGBA"))
    stats.update(
        {
            "input": in_path.name,
            "output": out_path.name,
            "seconds": round(time.monotonic() - started, 2),
            "format": out_path.suffix.lstrip(".").upper(),
            "mode": result.mode,
        }
    )
    return stats


def iter_images(input_dir: Path) -> list[Path]:
    """Image files in a directory (sorted, supported extensions only)."""
    return sorted(
        p
        for p in input_dir.iterdir()
        if p.is_file() and p.suffix.lower() in SUPPORTED_EXTENSIONS
    )
