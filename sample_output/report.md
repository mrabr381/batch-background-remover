# Batch Background Removal — Report

Images processed: **3** (PIL-drawn offline test fixture)

| Input | Output | Size | Transparent | Semi-transparent | Opaque | Time |
|-------|--------|------|-------------|------------------|--------|------|
| bottle.png | bottle_clean.png | 600×600 | 86.1% | 0.98% | 12.93% | 7.1s |
| mug.png | mug_clean.png | 600×600 | 79.38% | 1.25% | 19.38% | 1.82s |
| sneaker.png | sneaker_clean.png | 600×600 | 79.45% | 1.16% | 19.39% | 2.08s |

## Real photo test (not a drawing)

A real product photo — a red enamel mug on a plain white background,
photo by Andreea Ch on Pexels
(<https://www.pexels.com/photo/red-mug-3961751/>, Pexels License, free
to use), 1200×800, cleaned on CPU with U2-Net, verified 2026-11-20:

| Input | Size | Transparent | Semi-transparent | Opaque | Corners | Product centre |
|-------|------|-------------|------------------|--------|---------|----------------|
| red-mug.jpg | 1200×800 | **95.81%** | 0.61% | 3.57% | alpha 0 | alpha 254 |

The photo is a binary JPG and is not in the repo. Download it and
reproduce the run:

```bash
curl -L -o red-mug.jpg "https://images.pexels.com/photos/3961751/pexels-photo-3961751.jpeg?auto=compress&cs=tinysrgb&w=1200"
python -m bgremove --input <folder-with-red-mug.jpg> --out clean/
```

Full measured stats: `real_photo_stats.json`. The mug sits right of
centre, so the image-centre pixel is background (alpha 0); the product
centre — middle of the detected bounding box `[716, 439, 995, 648]` —
measures alpha 254.

## How to read this

- **Transparent %** — pixels fully removed (the old background).
- **Semi-transparent %** — edge pixels (feathering / anti-aliasing). A clean cut on a simple product photo is usually under 5%.
- **Opaque %** — pixels kept (the product itself).
