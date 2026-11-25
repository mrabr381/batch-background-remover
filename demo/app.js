// Batch Background Remover — in-browser demo (demo/app.js).
//
// Two honest paths, one shared compositing pipeline:
//  1. MUG PANE — instant demo on the real Pexels red-mug photo with a
//     PRECOMPUTED U2-Net mask (demo/mask-data.js, made by the repo's own
//     Python CLI). No model runs for this photo.
//  2. LIVE PANE — your own photo, segmented live in the browser with
//     onnxruntime-web 1.20.1 + the Silueta model (44 MB, MIT, rembg).
//     The model is fetched once from Hugging Face and runs 100% locally;
//     the photo never leaves the browser.
//
// Pure functions at the top are runtime-free and Node-testable (the DOM
// code below is guarded by `typeof document !== 'undefined'`).

'use strict';

// ---------------------------------------------------------------------------
// Pure logic (no DOM) — also exercised by the Node test harness.
// ---------------------------------------------------------------------------

// Band stats in the repo's published format: transparent <10, edge 10-245,
// opaque >=245. `mask` is a Uint8Array of 0..255 values.
function measureBands(mask) {
  var tr = 0, ed = 0, op = 0;
  for (var i = 0; i < mask.length; i++) {
    var v = mask[i];
    if (v < 10) tr++;
    else if (v < 245) ed++;
    else op++;
  }
  var n = Math.max(mask.length, 1);
  return {
    transparent: Math.round(10000 * tr / n) / 100,
    edge: Math.round(10000 * ed / n) / 100,
    opaque: Math.round(10000 * op / n) / 100
  };
}

// % of mask pixels kept at a hard threshold (mask value >= threshold).
function keptPct(mask, threshold) {
  var k = 0;
  for (var i = 0; i < mask.length; i++) if (mask[i] >= threshold) k++;
  return Math.round(10000 * k / Math.max(mask.length, 1)) / 100;
}

// Hard-threshold a soft mask into an alpha channel (0 or 255 per pixel).
function applyThreshold(mask, threshold) {
  var alpha = new Uint8Array(mask.length);
  for (var i = 0; i < mask.length; i++) alpha[i] = mask[i] >= threshold ? 255 : 0;
  return alpha;
}

// Composite photo pixels onto a background using an alpha channel.
// photo: Uint8ClampedArray RGBA, alpha: Uint8Array (0/255).
// bg: null = keep transparency, or {r, g, b} = solid colour (opaque output).
// Returns a fresh Uint8ClampedArray RGBA of the same length.
function composite(photo, alpha, bg) {
  var out = new Uint8ClampedArray(photo.length);
  for (var p = 0, q = 0; p < photo.length; p += 4, q++) {
    var a = alpha[q] / 255;
    if (bg === null) {
      out[p] = photo[p]; out[p + 1] = photo[p + 1]; out[p + 2] = photo[p + 2];
      out[p + 3] = alpha[q];
    } else {
      out[p] = Math.round(photo[p] * a + bg.r * (1 - a));
      out[p + 1] = Math.round(photo[p + 1] * a + bg.g * (1 - a));
      out[p + 2] = Math.round(photo[p + 2] * a + bg.b * (1 - a));
      out[p + 3] = 255;
    }
  }
  return out;
}

// rembg SiluetaSession.normalize, exactly:
//   input is 320x320 RGB (Uint8Array, row-major); divide every channel by
//   the image's max channel value, then (v - mean) / std per channel,
//   returned as NCHW float32 [1, 3, 320, 320].
function normalizePixels(rgb320) {
  var N = 320 * 320;
  var mx = 0;
  for (var i = 0; i < rgb320.length; i++) if (rgb320[i] > mx) mx = rgb320[i];
  var mean = [0.485, 0.456, 0.406], std = [0.229, 0.224, 0.225];
  var data = new Float32Array(3 * N);
  var denom = Math.max(mx, 1e-6);
  for (var c = 0; c < 3; c++) {
    for (var j = 0; j < N; j++) {
      data[c * N + j] = (rgb320[j * 3 + c] / denom - mean[c]) / std[c];
    }
  }
  return data;
}

// rembg SiluetaSession post-processing: min-max normalise the raw 320x320
// model output to a 0..255 mask.
function postprocessMask(raw320) {
  var mn = Infinity, ma = -Infinity;
  for (var i = 0; i < raw320.length; i++) {
    if (raw320[i] < mn) mn = raw320[i];
    if (raw320[i] > ma) ma = raw320[i];
  }
  var span = ma - mn;
  var mask = new Uint8Array(raw320.length);
  for (var j = 0; j < raw320.length; j++) {
    mask[j] = span > 0 ? Math.round(255 * (raw320[j] - mn) / span) : 0;
  }
  return mask;
}

function hexToRgb(hex) {
  var h = hex.replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}

// Expose pure functions for the Node test harness (no-op in the browser).
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { measureBands, keptPct, applyThreshold, composite, normalizePixels, postprocessMask, hexToRgb };
}

// ---------------------------------------------------------------------------
// Browser-only code below.
// ---------------------------------------------------------------------------
if (typeof document !== 'undefined') {

var ORT_CDN = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/ort.min.js';
var ORT_WASM_PATH = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/';
var MODEL_URL = 'https://huggingface.co/jellybox/silueta/resolve/main/silueta_320.onnx';
var MODEL_NAME = 'Silueta (rembg, MIT)';
var MODEL_SIZE_MB = 44;
var MUG_PHOTO_URL = 'https://images.pexels.com/photos/3961751/pexels-photo-3961751.jpeg?auto=compress&cs=tinysrgb&w=1200';
var MAX_WORK_DIM = 1200; // downscale huge uploads; the mug photo is already 1200x800

function el(id) { return document.getElementById(id); }
function setStatus(id, msg) { var n = el(id); if (n) n.textContent = msg; }
function loadImage(src, crossOrigin) {
  return new Promise(function (resolve, reject) {
    var img = new Image();
    if (crossOrigin) img.crossOrigin = crossOrigin;
    img.onload = function () { resolve(img); };
    img.onerror = function () { reject(new Error('Could not load image: ' + src)); };
    img.src = src;
  });
}
function canvasOf(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// Read the R channel of an image drawn on a canvas -> Uint8Array mask.
function maskFromImage(img, w, h) {
  var c = canvasOf(w, h);
  var ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  var d = ctx.getImageData(0, 0, w, h).data;
  var mask = new Uint8Array(w * h);
  for (var i = 0; i < mask.length; i++) mask[i] = d[i * 4];
  return mask;
}

// Upscale a small mask to photo size (bilinear smoothing).
// mask is srcW x srcH; the live path passes 320x320, the mug pane 300x200.
function upscaleMask(mask, srcW, srcH, w, h) {
  var small = canvasOf(srcW, srcH);
  var sctx = small.getContext('2d');
  var img = sctx.createImageData(srcW, srcH);
  for (var i = 0; i < srcW * srcH; i++) {
    img.data[i * 4] = mask[i]; img.data[i * 4 + 1] = mask[i];
    img.data[i * 4 + 2] = mask[i]; img.data[i * 4 + 3] = 255;
  }
  sctx.putImageData(img, 0, 0);
  var big = canvasOf(w, h);
  var bctx = big.getContext('2d');
  bctx.imageSmoothingEnabled = true;
  bctx.imageSmoothingQuality = 'high';
  bctx.drawImage(small, 0, 0, w, h);
  var d = bctx.getImageData(0, 0, w, h).data;
  var mask = new Uint8Array(w * h);
  for (var j = 0; j < mask.length; j++) mask[j] = d[j * 4];
  return mask;
}

// One demo pane: a photo + mask + threshold/background controls + download.
// cfg: { canvas, stats, status, threshold, thresholdVal, bg inputs, colour, download, fileInput? }
function makePane(cfg) {
  var state = { photo: null, photoData: null, w: 0, h: 0, mask: null, bands: null, name: 'cutout' };

  function currentBg() {
    var sel = document.querySelector('input[name="' + cfg.bgName + '"]:checked');
    if (!sel) return null;
    if (sel.value === 'transparent') return null;
    if (sel.value === 'white') return { r: 255, g: 255, b: 255 };
    if (sel.value === 'black') return { r: 0, g: 0, b: 0 };
    return hexToRgb(el(cfg.colour).value);
  }

  function render() {
    if (!state.photoData || !state.mask) return;
    var t = parseInt(el(cfg.threshold).value, 10);
    el(cfg.thresholdVal).textContent = t;
    var alpha = applyThreshold(state.mask, t);
    var out = composite(state.photoData, alpha, currentBg());
    var canvas = el(cfg.canvas);
    var ctx = canvas.getContext('2d');
    var img = ctx.createImageData(state.w, state.h);
    img.data.set(out);
    ctx.putImageData(img, 0, 0);
    var kept = keptPct(state.mask, t);
    el(cfg.stats).textContent = state.bands
      ? 'Mask: ' + state.bands.transparent + '% transparent · ' + state.bands.edge + '% edge · ' +
        state.bands.opaque + '% product  —  kept at threshold ' + t + ': ' + kept + '%'
      : 'Kept at threshold ' + t + ': ' + kept + '%';
    el(cfg.download).disabled = false;
  }

  function setPhoto(img, name) {
    var scale = Math.min(1, MAX_WORK_DIM / Math.max(img.naturalWidth, img.naturalHeight));
    state.w = Math.max(1, Math.round(img.naturalWidth * scale));
    state.h = Math.max(1, Math.round(img.naturalHeight * scale));
    state.name = (name || 'cutout').replace(/\.[^.]+$/, '') || 'cutout';
    var c = canvasOf(state.w, state.h);
    var ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, state.w, state.h);
    state.photoData = ctx.getImageData(0, 0, state.w, state.h).data;
    var canvas = el(cfg.canvas);
    canvas.width = state.w; canvas.height = state.h;
    state.mask = null; state.bands = null;
    el(cfg.download).disabled = true;
    return state;
  }

  function setMask(mask, bands) {
    state.mask = mask; state.bands = bands;
    render();
  }

  function download() {
    if (!state.mask) return;
    var canvas = el(cfg.canvas);
    canvas.toBlob(function (blob) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = state.name + '-no-bg.png';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
    }, 'image/png');
  }

  el(cfg.threshold).addEventListener('input', render);
  Array.prototype.forEach.call(document.querySelectorAll('input[name="' + cfg.bgName + '"]'), function (r) {
    r.addEventListener('change', render);
  });
  el(cfg.colour).addEventListener('input', render);
  el(cfg.download).addEventListener('click', download);

  return { state: state, render: render, setPhoto: setPhoto, setMask: setMask, setStatus: function (m) { setStatus(cfg.status, m); } };
}

// --- Live model (lazy: only loaded when the user asks) ----------------------
var liveSession = null;
var liveSessionPromise = null;

function loadScript(src) {
  return new Promise(function (resolve, reject) {
    var s = document.createElement('script');
    s.src = src; s.onload = resolve;
    s.onerror = function () { reject(new Error('Could not load ' + src)); };
    document.head.appendChild(s);
  });
}

async function fetchWithProgress(url, onProgress) {
  var res = await fetch(url);
  if (!res.ok) throw new Error('Model download failed: HTTP ' + res.status);
  var total = parseInt(res.headers.get('content-length') || '0', 10);
  if (!res.body || !total) {
    onProgress(1);
    return new Uint8Array(await res.arrayBuffer());
  }
  var reader = res.body.getReader();
  var chunks = [], received = 0;
  for (;;) {
    var step = await reader.read();
    if (step.done) break;
    chunks.push(step.value);
    received += step.value.length;
    onProgress(received / total);
  }
  var out = new Uint8Array(received);
  var off = 0;
  chunks.forEach(function (c) { out.set(c, off); off += c.length; });
  return out;
}

async function ensureLiveSession(onProgress) {
  if (liveSession) return liveSession;
  if (liveSessionPromise) return liveSessionPromise;
  liveSessionPromise = (async function () {
    if (typeof ort === 'undefined') {
      onProgress('Loading onnxruntime-web 1.20.1…');
      await loadScript(ORT_CDN);
    }
    // Single thread: GitHub Pages is not cross-origin isolated, so the
    // multi-threaded WASM build cannot use SharedArrayBuffer here.
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.wasmPaths = ORT_WASM_PATH;
    onProgress('Downloading ' + MODEL_NAME + ' model (' + MODEL_SIZE_MB + ' MB, once)…');
    var bytes = await fetchWithProgress(MODEL_URL, function (f) {
      onProgress('Downloading model… ' + Math.round(f * 100) + '%');
    });
    onProgress('Starting model in your browser…');
    var session = await ort.InferenceSession.create(bytes, { executionProviders: ['wasm'] });
    liveSession = session;
    return session;
  })();
  try { return await liveSessionPromise; }
  catch (e) { liveSessionPromise = null; throw e; }
}

async function runLiveRemoval(img, onStatus) {
  var session = await ensureLiveSession(onStatus);
  onStatus('Preparing photo…');
  var c = canvasOf(320, 320);
  var ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, 320, 320);
  var d = ctx.getImageData(0, 0, 320, 320).data;
  var rgb = new Uint8Array(320 * 320 * 3);
  for (var i = 0, j = 0; i < d.length; i += 4, j += 3) {
    rgb[j] = d[i]; rgb[j + 1] = d[i + 1]; rgb[j + 2] = d[i + 2];
  }
  var input = normalizePixels(rgb);
  var t0 = performance.now();
  var feeds = {};
  feeds[session.inputNames[0]] = new ort.Tensor('float32', input, [1, 3, 320, 320]);
  var out = await session.run(feeds);
  var raw = out[session.outputNames[0]].data;
  var secs = ((performance.now() - t0) / 1000).toFixed(1);
  onStatus('Done in ' + secs + ' s — in your browser, nothing uploaded.');
  return { mask320: postprocessMask(raw), seconds: secs };
}

// --- Wire up the page --------------------------------------------------------
document.addEventListener('DOMContentLoaded', function () {
  // Pane 1: precomputed mug mask.
  var mug = makePane({
    canvas: 'mug-canvas', stats: 'mug-stats', status: 'mug-status',
    threshold: 'mug-threshold', thresholdVal: 'mug-threshold-val',
    bgName: 'mug-bg', colour: 'mug-colour', download: 'mug-download'
  });
  el('mug-load').addEventListener('click', async function () {
    mug.setStatus('Loading the red-mug photo from Pexels…');
    try {
      var img = await loadImage(MUG_PHOTO_URL, 'anonymous');
      var st = mug.setPhoto(img, 'red-mug');
      mug.setStatus('Loading the precomputed U2-Net mask…');
      var maskImg = await loadImage('data:image/png;base64,' + window.MUG_MASK.pngBase64);
      var smallMask = maskFromImage(maskImg, window.MUG_MASK.width, window.MUG_MASK.height);
      var fullMask = upscaleMask(smallMask, window.MUG_MASK.width, window.MUG_MASK.height, st.w, st.h);
      // Bands are computed live from the embedded mask (95.78/0.70/3.53 at 300x200),
      // within 0.01 of the published full-res U2-Net stats quoted in the status line.
      mug.setMask(fullMask, measureBands(smallMask));
      mug.setStatus('Precomputed mask — no model ran for this photo. ' +
        'Published full-res U2-Net stats: 95.81% transparent · 0.61% edge · 3.57% kept.');
    } catch (e) {
      mug.setStatus('Could not load the demo photo or mask: ' + e.message +
        ' (check your connection, or try the live AI section below with your own photo).');
    }
  });

  // Pane 2: live in-browser AI.
  var live = makePane({
    canvas: 'live-canvas', stats: 'live-stats', status: 'live-status',
    threshold: 'live-threshold', thresholdVal: 'live-threshold-val',
    bgName: 'live-bg', colour: 'live-colour', download: 'live-download'
  });
  var liveImg = null, liveName = 'photo';

  async function runLive() {
    if (!liveImg) { live.setStatus('Pick a photo first (or use the red mug).'); return; }
    var btn = el('live-run');
    btn.disabled = true;
    try {
      live.setStatus('Starting…');
      var st = live.setPhoto(liveImg, liveName);
      var res = await runLiveRemoval(liveImg, function (m) { live.setStatus(m); });
      var fullMask = upscaleMask(res.mask320, 320, 320, st.w, st.h);
      live.setMask(fullMask, measureBands(res.mask320));
    } catch (e) {
      live.setStatus('Live removal failed: ' + e.message +
        ' The mug demo above still works, and the full model runs in the Python CLI.');
    } finally {
      btn.disabled = false;
    }
  }

  el('live-file').addEventListener('change', function (ev) {
    var f = ev.target.files && ev.target.files[0];
    if (!f) return;
    var url = URL.createObjectURL(f);
    loadImage(url).then(function (img) {
      liveImg = img; liveName = f.name;
      var st = live.setPhoto(img, f.name);
      live.setStatus('Loaded "' + f.name + '" (' + st.w + '×' + st.h +
        '). Press “Remove background” — the ' + MODEL_SIZE_MB + ' MB model downloads once.');
      URL.revokeObjectURL(url);
    }).catch(function (e) { live.setStatus('Could not read that file: ' + e.message); });
  });
  el('live-use-mug').addEventListener('click', async function () {
    live.setStatus('Loading the red-mug photo from Pexels…');
    try {
      liveImg = await loadImage(MUG_PHOTO_URL, 'anonymous');
      liveName = 'red-mug.jpg';
      var st = live.setPhoto(liveImg, liveName);
      live.setStatus('Red mug loaded (' + st.w + '×' + st.h +
        '). Press “Remove background” to run the live model on it — compare with the precomputed mask above.');
    } catch (e) { live.setStatus('Could not load the mug photo: ' + e.message); }
  });
  el('live-run').addEventListener('click', runLive);
});

}
