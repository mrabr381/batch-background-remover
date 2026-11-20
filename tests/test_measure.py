"""Tests for the alpha-measurement maths (bgremove.core).

The expected percentages are the verified numbers recorded in the
README / sample_output/stats.json (bottle 86.1%, mug 79.38%, sneaker
79.45% transparent; corners alpha 0; centres alpha 254-255). The tests
rebuild images with those exact pixel counts and check measure()
returns the same numbers, so the maths — not the model — is under test.
No model download is needed: nothing here calls remove_background().
"""

import json
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

from bgremove.core import (
    apply_background,
    centre_alpha,
    corner_alpha,
    iter_images,
    measure,
    parse_background,
)

REPO = Path(__file__).resolve().parent.parent


def rgba_from_alpha(alpha):
    """RGBA image whose alpha channel is the given 2-D numpy array."""
    h, w = alpha.shape
    rgb = np.full((h, w, 3), 200, dtype=np.uint8)
    arr = np.dstack([rgb, alpha.astype(np.uint8)])
    return Image.fromarray(arr, mode="RGBA")


def test_measure_fully_transparent():
    img = rgba_from_alpha(np.zeros((100, 100), dtype=np.uint8))
    result = measure(img)
    assert result["transparent_pct"] == 100.0
    assert result["semi_transparent_pct"] == 0.0
    assert result["opaque_pct"] == 0.0
    assert result["bbox"] is None


def test_measure_fully_opaque():
    img = rgba_from_alpha(np.full((100, 100), 255, dtype=np.uint8))
    result = measure(img)
    assert result["transparent_pct"] == 0.0
    assert result["opaque_pct"] == 100.0
    assert result["bbox"] == [0, 0, 100, 100]


def test_measure_mixed_exact_fractions():
    # 100x100 = 10,000 px: 50% transparent, 5% edge, 45% opaque.
    alpha = np.zeros((100, 100), dtype=np.uint8)
    alpha.flat[5000:5500] = 128
    alpha.flat[5500:] = 255
    result = measure(rgba_from_alpha(alpha))
    assert result["transparent_pct"] == 50.0
    assert result["semi_transparent_pct"] == 5.0
    assert result["opaque_pct"] == 45.0


def test_measure_bottle_fixture_numbers():
    # The recorded bottle run: 600x600, 86.1% transparent, 0.98% edge,
    # 12.93% opaque (percentages rounded to 2 dp, so opaque is checked
    # with a 0.02 tolerance for the rounding).
    alpha = np.zeros((600, 600), dtype=np.uint8)
    alpha.flat[309960 : 309960 + 3528] = 128  # 0.98% semi-transparent
    alpha.flat[309960 + 3528 :] = 255  # the rest opaque
    result = measure(rgba_from_alpha(alpha))
    assert result["transparent_pct"] == pytest.approx(86.1, abs=0.01)
    assert result["semi_transparent_pct"] == pytest.approx(0.98, abs=0.01)
    assert result["opaque_pct"] == pytest.approx(12.93, abs=0.02)


def test_corner_alpha_and_centre_alpha():
    alpha = np.full((200, 200), 255, dtype=np.uint8)
    alpha[0, 0] = alpha[0, -1] = alpha[-1, 0] = alpha[-1, -1] = 0
    alpha[100, 100] = 254
    img = rgba_from_alpha(alpha)
    assert corner_alpha(img) == {
        "top_left": 0,
        "top_right": 0,
        "bottom_left": 0,
        "bottom_right": 0,
    }
    assert centre_alpha(img) == 254


def test_parse_background():
    assert parse_background("transparent") == "transparent"
    assert parse_background("white") == (255, 255, 255)
    assert parse_background("black") == (0, 0, 0)
    assert parse_background("#ff8800") == (255, 136, 0)
    with pytest.raises(ValueError):
        parse_background("not-a-colour")


def test_apply_background():
    img = rgba_from_alpha(np.zeros((10, 10), dtype=np.uint8))
    assert apply_background(img, "transparent").mode == "RGBA"
    white = apply_background(img, (255, 255, 255))
    assert white.mode == "RGB"
    assert white.getpixel((0, 0)) == (255, 255, 255)


def test_iter_images_only_lists_images(tmp_path):
    (tmp_path / "a.png").write_bytes(b"")
    (tmp_path / "b.jpg").write_bytes(b"")
    (tmp_path / "notes.txt").write_bytes(b"")
    assert [p.name for p in iter_images(tmp_path)] == ["a.png", "b.jpg"]


def test_recorded_fixture_stats_match_readme():
    """sample_output/stats.json holds the verified PIL-fixture numbers."""
    stats = json.loads((REPO / "sample_output" / "stats.json").read_text())
    by_input = {s["input"]: s for s in stats}
    assert by_input["bottle.png"]["transparent_pct"] == 86.1
    assert by_input["mug.png"]["transparent_pct"] == 79.38
    assert by_input["sneaker.png"]["transparent_pct"] == 79.45
    for s in stats:
        total = (
            s["transparent_pct"] + s["semi_transparent_pct"] + s["opaque_pct"]
        )
        assert total == pytest.approx(100.0, abs=0.05)


def test_real_photo_stats():
    """The real Pexels photo run (see README): corners 0, product kept."""
    stats = json.loads(
        (REPO / "sample_output" / "real_photo_stats.json").read_text()
    )
    assert stats["input"] == "red-mug.jpg"
    assert stats["transparent_pct"] == 95.81
    assert stats["semi_transparent_pct"] == 0.61
    assert stats["opaque_pct"] == 3.57
    assert stats["corners_alpha"] == {
        "top_left": 0,
        "top_right": 0,
        "bottom_left": 0,
        "bottom_right": 0,
    }
    assert stats["product_centre_alpha"] == 254
    assert stats["bbox"] == [716, 439, 995, 648]
