"""Write docs/ocr/ from the pinned PaddleOCR models and onnxruntime-web. Stdlib only.

Usage: python3 -I tools/build_ocr.py .cache/src docs/ocr
"""
import json, os, sys, tarfile, zipfile

SRC, OUT = sys.argv[1], sys.argv[2]
WHEEL = os.path.join(SRC, 'rapidocr-3.10.0-py3-none-any.whl')
ORT = os.path.join(SRC, 'onnxruntime-web-1.30.0.tgz')
MODELS = ('PP-OCRv6_det_small.onnx', 'PP-OCRv6_rec_small.onnx')
RUNTIME = ('ort.wasm.min.js', 'ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm')


def varint(buf, i):
    n = shift = 0
    while True:
        b = buf[i]; i += 1
        n |= (b & 0x7F) << shift; shift += 7
        if b < 0x80:
            return n, i


def fields(buf):
    i = 0
    while i < len(buf):
        key, i = varint(buf, i)
        num, wire = key >> 3, key & 7
        if wire == 0:
            val, i = varint(buf, i)
        elif wire == 1:
            val, i = buf[i:i + 8], i + 8
        elif wire == 2:
            size, i = varint(buf, i)
            val, i = buf[i:i + size], i + size
        elif wire == 5:
            val, i = buf[i:i + 4], i + 4
        else:
            raise ValueError('unsupported wire type %d' % wire)
        yield num, val


def metadata(model):
    out = {}
    for num, val in fields(model):
        if num == 14:  # ModelProto.metadata_props
            entry = dict(fields(val))
            out[entry[1].decode()] = entry[2].decode()
    return out


os.makedirs(OUT, exist_ok=True)
for name in os.listdir(OUT):
    if name != 'ocr-worker.js':
        os.remove(os.path.join(OUT, name))
with zipfile.ZipFile(WHEEL) as whl:
    for name in MODELS:
        data = whl.read('rapidocr/models/' + name)
        open(os.path.join(OUT, name), 'wb').write(data)
        if 'rec' in name:
            chars = metadata(data)['character'].split('\n')
            with open(os.path.join(OUT, 'keys.json'), 'w', encoding='utf-8') as f:
                json.dump([''] + chars + [' '], f, ensure_ascii=False, separators=(',', ':'))
with tarfile.open(ORT) as tgz:
    for name in RUNTIME:
        open(os.path.join(OUT, name), 'wb').write(tgz.extractfile('package/dist/' + name).read())
print('ocr assets written to', OUT)
