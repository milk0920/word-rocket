"""Copy the pinned Tesseract core and wrap the English model for docs/ocr. Stdlib only.

Usage: python3 -I tools/build_ocr.py <src dir> <out dir>
"""
import base64, os, shutil, sys

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
for name in ('tesseract-core-simd-lstm.wasm.js', 'tesseract-core-lstm.wasm.js'):
    shutil.copyfile(os.path.join(SRC, 'tesseract.js-core', name), os.path.join(OUT, name))
model = open(os.path.join(SRC, 'tessdata_fast', 'eng.traineddata'), 'rb').read()
with open(os.path.join(OUT, 'eng-fast.js'), 'w') as f:
    f.write('self.ENG_TRAINEDDATA_B64="' + base64.b64encode(model).decode() + '";\n')
print('ocr assets written to', OUT)
