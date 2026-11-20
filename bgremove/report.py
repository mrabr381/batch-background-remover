"""Markdown report writer for batch runs."""

from __future__ import annotations

import json
from pathlib import Path


def write_report(stats_list: list[dict], out_path: Path) -> None:
    """Write a Markdown report with one row per processed image."""
    lines = [
        "# Batch Background Removal — Report",
        "",
        f"Images processed: **{len(stats_list)}**",
        "",
        "| Input | Output | Size | Transparent | Semi-transparent | Opaque | Time |",
        "|-------|--------|------|-------------|------------------|--------|------|",
    ]
    for s in stats_list:
        lines.append(
            f"| {s['input']} | {s['output']} | {s['width']}×{s['height']} "
            f"| {s['transparent_pct']}% | {s['semi_transparent_pct']}% "
            f"| {s['opaque_pct']}% | {s['seconds']}s |"
        )
    lines += [
        "",
        "## How to read this",
        "",
        "- **Transparent %** — pixels fully removed (the old background).",
        "- **Semi-transparent %** — edge pixels (feathering / anti-aliasing). "
        "A clean cut on a simple product photo is usually under 5%.",
        "- **Opaque %** — pixels kept (the product itself).",
        "",
    ]
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text("\n".join(lines), encoding="utf-8")


def write_stats_json(stats_list: list[dict], out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(stats_list, indent=2), encoding="utf-8")
