"""Streamlit web UI: upload images, remove backgrounds locally, download a ZIP.

No upload to any server — the images stay in this process on your machine.
"""

from __future__ import annotations

import io
import zipfile

import streamlit as st
from PIL import Image

from bgremove import core

st.set_page_config(page_title="Batch Background Remover", page_icon="✂️")
st.title("✂️ Batch Background Remover")
st.write(
    "Remove backgrounds from product photos — free, local, no upload. "
    "Powered by rembg (U2-Net). First run downloads the ~170 MB model once."
)

with st.sidebar:
    st.header("Settings")
    model = st.selectbox(
        "Model",
        ["u2net", "u2net_human_seg", "u2netp", "isnet-general-use"],
        help="u2net is the general-purpose default; u2net_human_seg is for people.",
    )
    alpha_matting = st.checkbox(
        "Refine edges (alpha matting)",
        value=False,
        help="Slower, but better on hair and fine edges.",
    )
    bg_choice = st.selectbox(
        "Background", ["transparent", "white", "black", "custom colour"]
    )
    bg_value = "transparent"
    if bg_choice == "custom colour":
        bg_value = st.color_picker("Pick a colour", "#ffffff")
    elif bg_choice in ("white", "black"):
        bg_value = bg_choice

    st.sidebar.markdown("---")
    st.sidebar.link_button("⭐ Star on GitHub", "https://github.com/mrabr381/batch-background-remover")
    st.sidebar.link_button("☕ Buy me a coffee", "https://www.buymeacoffee.com/muhammadabubakar")

uploads = st.file_uploader(
    "Upload images (PNG / JPG / WebP)",
    type=["png", "jpg", "jpeg", "webp"],
    accept_multiple_files=True,
)

if uploads:
    try:
        background = core.parse_background(bg_value)
    except ValueError as exc:
        st.error(str(exc))
        st.stop()

    results = []
    progress = st.progress(0, text="Removing backgrounds…")
    for i, up in enumerate(uploads):
        img = Image.open(up).convert("RGB")
        cleaned = core.remove_background(
            img, model=model, alpha_matting=alpha_matting
        )
        cleaned = core.apply_background(cleaned, background)
        results.append((up.name, img, cleaned))
        progress.progress((i + 1) / len(uploads), text=f"Done {up.name}")
    progress.empty()

    for name, before, after in results:
        st.subheader(name)
        stats = core.measure(after if after.mode == "RGBA" else after.convert("RGBA"))
        st.caption(
            f"Transparent {stats['transparent_pct']}% · "
            f"opaque {stats['opaque_pct']}% · edge {stats['semi_transparent_pct']}%"
        )
        c1, c2 = st.columns(2)
        c1.image(before, caption="Before", use_container_width=True)
        c2.image(after, caption="After", use_container_width=True)

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for name, _before, after in results:
            out = io.BytesIO()
            fmt = "PNG" if after.mode == "RGBA" else "JPEG"
            after.save(out, format=fmt)
            stem = name.rsplit(".", 1)[0]
            zf.writestr(f"{stem}_clean.{fmt.lower()}", out.getvalue())
    st.download_button(
        "⬇ Download all cleaned images (ZIP)",
        data=buf.getvalue(),
        file_name="cleaned.zip",
        mime="application/zip",
    )
else:
    st.info(
        "No images yet. To try it without your own photos, run "
        "`python scripts/make_sample.py` and upload the files from "
        "`sample_data/`."
    )
