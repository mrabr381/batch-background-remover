# ✂️ Batch Background Remover

[![Python 3.10+](https://img.shields.io/badge/python-3.10%2B-blue.svg)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![No API key](https://img.shields.io/badge/API%20key-none%20required-brightgreen.svg)](#quickstart)
[![Runs locally](https://img.shields.io/badge/runs-100%25%20local-informational.svg)](#how-it-works)
[![Streamlit](https://img.shields.io/badge/UI-Streamlit-red.svg)](#web-app)

Batch-remove backgrounds from product photos — **free, local, no upload, no
per-image fee, no API key**. Built on [rembg](https://github.com/danielgatis/rembg)
(U2-Net, MIT-licensed model) running on your own CPU, with a simple web UI to
review before/after and download everything as a ZIP.

> **Live demo:** a real sample report with measured numbers —
> [sample report page](sample_output/index.html) (works on GitHub Pages, no
> server needed) — or run the web app on Streamlit Community Cloud
> (one-click deploy, see [Live demo](#live-demo)).

## Table of contents

- [Before / after (real measured results)](#before--after-real-measured-results)
- [Why not a paid tool?](#why-not-a-paid-tool)
- [Quickstart](#quickstart)
- [CLI reference](#cli-reference)
- [Web app](#web-app)
- [How it works](#how-it-works)
- [Live demo](#live-demo)
- [Honest limitations](#honest-limitations)
- [Project structure](#project-structure)
- [Contributing](#contributing)

## Before / after (real measured results)

The 3 bundled sample images are simple PIL-drawn product shapes on plain
backgrounds (not real product photos — they exist to prove the pipeline works
and to give measurable numbers). Run on CPU, U2-Net model:

| Image | Before | After | Transparent | Edge | Product kept |
|-------|--------|-------|-------------|------|--------------|
| Bottle | green bottle on pale yellow | transparent PNG | **86.1%** | 0.98% | 12.93% opaque |
| Mug | red mug + handle on pale blue | transparent PNG | **79.38%** | 1.25% | 19.38% opaque |
| Sneaker | white trainer on pale grey | transparent PNG | **79.45%** | 1.16% | 19.39% opaque |

Quality checks, measured not eyeballed:

- **All 4 corners of every output measure alpha 0** — the background is fully gone.
- **Every product centre measures alpha 254–255** — the product is fully kept.
- **Edge band is ~1%** — no halo, no cut-off edges. The detected bounding boxes
  match the drawn products almost exactly (e.g. mug `[164, 174, 486, 467]`
  vs drawn body 170–400 + handle to 480).
- **Deterministic** — two runs on the same input produce byte-identical PNGs
  (verified with md5sum).

Full numbers: [sample_output/report.md](sample_output/report.md) ·
[sample_output/stats.json](sample_output/stats.json).

## Why not a paid tool?

| | Batch Background Remover | Paid background-removal tools |
|---|---|---|
| Price | **$0, forever** | Charge per image or per month (subscription) |
| Privacy | Images never leave your machine | Your product photos are uploaded to their servers |
| Batch | Whole folder in one command | Often one-by-one or capped per plan |
| Limits | None (your CPU is the only limit) | Credits / monthly caps |
| Edge control | `--alpha-matting` for hair & fine edges | Usually a paid tier |
| Works offline | Yes, after the one-time ~176 MB model download | No |

No prices are quoted for paid tools here because they change and were not
re-verified for this README — the point is the model, not the price tag: paid
tools charge per image or per month; this one charges nothing.

## Quickstart

```bash
git clone https://github.com/mrabr381/batch-background-remover.git
cd batch-background-remover
python -m venv .venv
.venv/bin/pip install -r requirements.txt

# Recreate the 3 sample images (they are generated locally, not committed)
python scripts/make_sample.py

# Clean a whole folder
.venv/bin/python -m bgremove --input sample_data --out clean/
```

First run downloads the U2-Net model once (~176 MB) into `~/.u2net`; after
that the tool works fully offline. On a 4-core CPU, expect ~2 s per 600×600
image after the first one (which includes model load).

## CLI reference

```
python -m bgremove --input photos/ --out clean/ [options]
```

| Option | Default | What it does |
|--------|---------|--------------|
| `--input` | — (required) | Folder of input images (png, jpg, jpeg, webp, bmp) |
| `--out` | — (required) | Folder for cleaned images |
| `--format` | `png` | `png` keeps transparency; `jpg` needs a background (defaults to white) |
| `--bg` | `transparent` | `transparent`, `white`, `black`, or `#RRGGBB` |
| `--alpha-matting` | off | Refine edges (slower, better on hair / fine edges) |
| `--model` | `u2net` | `u2net`, `u2net_human_seg` (people), `u2netp` (small/fast), `isnet-general-use` |
| `--report` | — | Write a Markdown report to this path |
| `--stats-json` | — | Write per-image stats JSON to this path |

Examples:

```bash
# Transparent PNGs (for listings, thumbnails, design work)
.venv/bin/python -m bgremove --input photos/ --out clean/

# White-background JPGs (for marketplaces that reject transparency)
.venv/bin/python -m bgremove --input photos/ --out clean/ --format jpg --bg white

# People photos, with edge refinement + a report
.venv/bin/python -m bgremove --input portraits/ --out clean/ \
  --model u2net_human_seg --alpha-matting --report report.md
```

Exit codes: `0` success · `1` input folder missing, no images, or an unreadable
file · `2` bad arguments (e.g. invalid `--bg` colour).

## Web app

```bash
.venv/bin/streamlit run app.py
```

Upload several images, pick a model and background, preview before/after side
by side with the measured transparency numbers, and download all cleaned
images as a ZIP. Nothing is uploaded anywhere — Streamlit runs on your machine
(or on Streamlit Cloud, where the images stay in your own app session).

## How it works

1. **rembg + U2-Net** segments the foreground on your CPU (ONNX Runtime).
   The model is downloaded once from the rembg model host and cached.
2. **Alpha matting (optional)** refines the mask around fine edges.
3. **Background** is applied: keep transparency (PNG), or composite onto a
   solid colour (JPG or PNG).
4. **Measurement** — every output is scored (transparent / edge / opaque %,
   bounding box, corner + centre alpha) so a bad cut is a number, not a feeling.

## Live demo

- ✅ **Already built:** [sample_output/index.html](sample_output/index.html) —
  static page with the real sample numbers and before/after images. The images
  are generated locally by `scripts/make_sample.py` (binary files are never
  committed), so on GitHub Pages each image slot shows a text note instead of
  a broken image until you generate them locally.
  **ABR's step (2 min):** repo Settings → Pages → Source: Deploy from a
  branch → `main`, folder `/ (root)` → Save. Live at
  `https://mrabr381.github.io/batch-background-remover/sample_output/`.
- ✅ **Streamlit Cloud ready:** `app.py` at the repo root, clean
  `requirements.txt`. **ABR's step (1 click):** share.streamlit.io →
  Create app → repo `mrabr381/batch-background-remover`, branch `main`, file
  `app.py` → Deploy. No key needed. Note: the first run downloads the
  ~176 MB model into the app's filesystem, so the first removal takes longer.

## Honest limitations

- **Hair, fur, glass and fine edges are hard.** U2-Net does well on solid
  product shots; wispy hair or transparent glass can leave a halo or a hole.
  `--alpha-matting` helps, but it is not magic — check the edge % in the report.
- **Busy or same-colour backgrounds confuse it.** A white mug on a white
  background is a genuinely hard case for any segmentation model. Plain,
  contrasting backgrounds work best.
- **CPU speed.** ~2 s per 600×600 image on a 4-core CPU; large photos
  (4000×3000) take noticeably longer. No GPU support in this repo.
- **Model download.** The first run needs internet for the one-time ~176 MB
  U2-Net download. After that, fully offline.
- **Sample images are drawings, not photos.** They prove the pipeline and give
  measurable numbers; your own photos are the real test. Real product photos
  with shadows, reflections or clutter will score worse than the samples.

## Project structure

```
batch-background-remover/
├── README.md, LICENSE (MIT), .gitignore, requirements.txt
├── app.py                          # Streamlit web app (repo root, deploy-ready)
├── bgremove/
│   ├── __init__.py
│   ├── __main__.py                 # python -m bgremove
│   ├── cli.py                      # args, exit codes 0/1/2
│   ├── core.py                     # rembg session, removal, measurement, backgrounds
│   └── report.py                   # Markdown report + stats JSON writers
├── scripts/
│   └── make_sample.py              # regenerates the 3 sample images (PIL, no photos)
├── sample_data/                    # generated locally, never committed
│   └── mug.png / sneaker.png / bottle.png
└── sample_output/                  # real measured report + stats + index.html demo
    ├── report.md / stats.json
    └── index.html
```

## Contributing

Issues and pull requests are welcome. Please keep the quality promise: no
invented numbers, no hardcoded results, and every new metric covered by a
measurement on the sample images.
