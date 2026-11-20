"""CLI: python -m bgremove --input photos/ --out clean/ [--format png] ..."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from . import core
from .report import write_report, write_stats_json


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="bgremove",
        description="Batch-remove backgrounds from product photos, locally "
        "with rembg (U2-Net). No upload, no per-image fee, no API key.",
    )
    p.add_argument("--input", required=True, help="folder of input images")
    p.add_argument("--out", required=True, help="folder for cleaned images")
    p.add_argument(
        "--format",
        choices=["png", "jpg"],
        default="png",
        help="output format: png keeps transparency, jpg needs a background (default: png)",
    )
    p.add_argument(
        "--bg",
        default="transparent",
        help="background for the output: transparent, white, black or #RRGGBB "
        "(jpg output defaults to white when --bg is transparent)",
    )
    p.add_argument(
        "--alpha-matting",
        action="store_true",
        help="refine edges with alpha matting (slower, better on hair/fine edges)",
    )
    p.add_argument(
        "--model",
        default="u2net",
        choices=["u2net", "u2net_human_seg", "u2netp", "isnet-general-use"],
        help="rembg model (default: u2net)",
    )
    p.add_argument("--report", help="write a Markdown report to this path")
    p.add_argument("--stats-json", help="write per-image stats JSON to this path")
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    in_dir = Path(args.input)
    out_dir = Path(args.out)

    if not in_dir.is_dir():
        print(f"Error: input folder not found: {in_dir}", file=sys.stderr)
        return 1
    images = core.iter_images(in_dir)
    if not images:
        print(f"Error: no supported images in {in_dir} "
              f"(supported: {', '.join(sorted(core.SUPPORTED_EXTENSIONS))})",
              file=sys.stderr)
        return 1

    try:
        background = core.parse_background(args.bg)
    except ValueError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 2
    if args.format == "jpg" and background == "transparent":
        background = (255, 255, 255)

    stats_list = []
    for img_path in images:
        suffix = ".png" if args.format == "png" else ".jpg"
        out_path = out_dir / f"{img_path.stem}_clean{suffix}"
        try:
            stats = core.process_file(
                img_path,
                out_path,
                model=args.model,
                background=background,
                alpha_matting=args.alpha_matting,
            )
        except Exception as exc:  # corrupt file, unreadable image, ...
            print(f"Error: could not process {img_path.name}: {exc}", file=sys.stderr)
            return 1
        stats_list.append(stats)
        print(f"  {stats['input']} -> {stats['output']} "
              f"({stats['transparent_pct']}% transparent, {stats['seconds']}s)")

    if args.report:
        write_report(stats_list, Path(args.report))
        print(f"Report: {args.report}")
    if args.stats_json:
        write_stats_json(stats_list, Path(args.stats_json))
        print(f"Stats: {args.stats_json}")

    print(f"Done — {len(stats_list)} image(s) cleaned into {out_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
