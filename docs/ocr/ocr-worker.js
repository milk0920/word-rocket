/* Word Rocket OCR worker: PaddleOCR PP-OCRv6 small (Apache-2.0) on onnxruntime-web (MIT), one thread. */
let ready = null;

function init(base) {
  if (!ready) ready = (async () => {
    importScripts(base + 'ort.wasm.min.js');
    ort.env.wasm.wasmPaths = base;
    ort.env.wasm.numThreads = 1;
    const [det, rec, keys] = await Promise.all([
      ort.InferenceSession.create(base + 'PP-OCRv6_det_small.onnx'),
      ort.InferenceSession.create(base + 'PP-OCRv6_rec_small.onnx'),
      fetch(base + 'keys.json').then(r => r.json()),
    ]);
    return { det, rec, keys };
  })();
  return ready;
}

function canvasOf(bitmap, sx, sy, sw, sh, w, h) {
  const c = new OffscreenCanvas(w, h);
  c.getContext('2d').drawImage(bitmap, sx, sy, sw, sh, 0, 0, w, h);
  return c;
}

// PaddleOCR input: BGR channels, (x / 255 - 0.5) / 0.5, NCHW.
function tensorOf(canvas) {
  const { width: W, height: H } = canvas;
  const d = canvas.getContext('2d').getImageData(0, 0, W, H).data, n = W * H;
  const f = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) {
    f[i] = d[i * 4 + 2] / 127.5 - 1;
    f[n + i] = d[i * 4 + 1] / 127.5 - 1;
    f[2 * n + i] = d[i * 4] / 127.5 - 1;
  }
  return new ort.Tensor('float32', f, [1, 3, H, W]);
}

// Text boxes from the DB probability map: threshold 0.3, 2x2 dilation, box score >= 0.5, unclip ratio 1.6.
// The long side is capped at 1280 px; the prototype showed the same accuracy as 2400 px at a third of the time.
async function detect(det, bitmap) {
  const h0 = bitmap.height, w0 = bitmap.width;
  let r = Math.min(h0, w0) < 736 ? 736 / Math.min(h0, w0) : 1;
  if (Math.max(h0, w0) * r > 1280) r = 1280 / Math.max(h0, w0);
  const H = Math.max(32, Math.round(h0 * r / 32) * 32), W = Math.max(32, Math.round(w0 * r / 32) * 32);
  const out = (await det.run({ x: tensorOf(canvasOf(bitmap, 0, 0, w0, h0, W, H)) }))[det.outputNames[0]].data;
  const on = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (out[y * W + x] <= 0.3) continue;
    on[y * W + x] = 1;
    if (x + 1 < W) on[y * W + x + 1] = 1;
    if (y + 1 < H) on[(y + 1) * W + x] = 1;
    if (x + 1 < W && y + 1 < H) on[(y + 1) * W + x + 1] = 1;
  }
  const seen = new Uint8Array(W * H), boxes = [];
  for (let s = 0; s < W * H; s++) {
    if (!on[s] || seen[s]) continue;
    const stack = [s]; seen[s] = 1;
    let x0 = W, y0 = H, x1 = 0, y1 = 0, sum = 0, cnt = 0;
    while (stack.length) {
      const p = stack.pop(), x = p % W, y = (p / W) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      sum += out[p]; cnt++;
      if (x > 0 && on[p - 1] && !seen[p - 1]) { seen[p - 1] = 1; stack.push(p - 1); }
      if (x + 1 < W && on[p + 1] && !seen[p + 1]) { seen[p + 1] = 1; stack.push(p + 1); }
      if (y > 0 && on[p - W] && !seen[p - W]) { seen[p - W] = 1; stack.push(p - W); }
      if (y + 1 < H && on[p + W] && !seen[p + W]) { seen[p + W] = 1; stack.push(p + W); }
    }
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    if (Math.min(bw, bh) < 3 || sum / cnt < 0.5) continue;
    const grow = bw * bh * 1.6 / (2 * (bw + bh));
    const bx0 = Math.max(0, x0 - grow), by0 = Math.max(0, y0 - grow), bx1 = Math.min(W, x1 + grow), by1 = Math.min(H, y1 + grow);
    if (Math.min(bx1 - bx0, by1 - by0) < 5) continue;
    boxes.push([bx0 * w0 / W, by0 * h0 / H, bx1 * w0 / W, by1 * h0 / H]);
  }
  return boxes;
}

// CTC greedy decode: index 0 is blank; repeats collapse.
async function recognize(rec, keys, bitmap, b) {
  const w = b[2] - b[0], h = b[3] - b[1], W = Math.max(16, Math.ceil(48 * w / h));
  const o = (await rec.run({ x: tensorOf(canvasOf(bitmap, b[0], b[1], w, h, W, 48)) }))[rec.outputNames[0]];
  const [, T, C] = o.dims, d = o.data;
  let text = '', prev = -1, conf = 0, n = 0;
  for (let t = 0; t < T; t++) {
    let best = 0, bv = -1;
    for (let k = 0; k < C; k++) { const v = d[t * C + k]; if (v > bv) { bv = v; best = k; } }
    if (best !== 0 && best !== prev) { text += keys[best]; conf += bv; n++; }
    prev = best;
  }
  return n && conf / n >= 0.5 ? text : '';
}

// Boxes whose vertical centers are close form one line, read left to right.
function lines(boxes, texts) {
  const items = boxes.map((b, i) => ({ b, t: texts[i], cy: (b[1] + b[3]) / 2, h: b[3] - b[1] })).filter(it => it.t);
  items.sort((a, b) => a.cy - b.cy);
  const rows = [];
  for (const it of items) {
    const row = rows[rows.length - 1];
    if (row && Math.abs(it.cy - row.cy) < Math.min(it.h, row.h) / 2) row.items.push(it);
    else rows.push({ cy: it.cy, h: it.h, items: [it] });
  }
  return rows.map(r => r.items.sort((a, b) => a.b[0] - b.b[0]).map(it => it.t).join('  '));
}

onmessage = async (e) => {
  const { base, image } = e.data;
  try {
    postMessage({ stage: 'load' });
    const { det, rec, keys } = await init(base);
    postMessage({ stage: 'read' });
    const bitmap = await createImageBitmap(new Blob([image]));
    const boxes = await detect(det, bitmap);
    const texts = [];
    for (const b of boxes) texts.push(await recognize(rec, keys, bitmap, b));
    bitmap.close();
    postMessage({ lines: lines(boxes, texts) });
  } catch (err) {
    ready = null;
    postMessage({ error: String(err && err.message || err) });
  }
};
