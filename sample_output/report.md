# Batch Background Removal — Report

Images processed: **3**

| Input | Output | Size | Transparent | Semi-transparent | Opaque | Time |
|-------|--------|------|-------------|------------------|--------|------|
| bottle.png | bottle_clean.png | 600×600 | 86.1% | 0.98% | 12.93% | 7.1s |
| mug.png | mug_clean.png | 600×600 | 79.38% | 1.25% | 19.38% | 1.82s |
| sneaker.png | sneaker_clean.png | 600×600 | 79.45% | 1.16% | 19.39% | 2.08s |

## How to read this

- **Transparent %** — pixels fully removed (the old background).
- **Semi-transparent %** — edge pixels (feathering / anti-aliasing). A clean cut on a simple product photo is usually under 5%.
- **Opaque %** — pixels kept (the product itself).
