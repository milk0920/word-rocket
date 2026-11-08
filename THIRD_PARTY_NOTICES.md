# Third-party notices

單字火箭 ships data, models and code from these projects. Each section names the pinned commit and the files that use it. The full Apache License 2.0 text is in `licenses/Apache-2.0.txt`, and the ECDICT MIT text is in `licenses/ECDICT-MIT.txt`.

## ECDICT

- Source: https://github.com/skywind3000/ECDICT at `39cfb9672c0906b63569e0453c2e6abfb9ab182a`
- Used for: the English words and Chinese meanings in `data/dict.json` and `docs/index.html`
- License: MIT

```
MIT License

Copyright (c) 2025 Linwei

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## OpenCC

- Source: https://github.com/BYVoid/OpenCC at `fae2a0a911c30764e669a7d8b0591cd8e852934a`
- Used for: the simplified-to-Taiwan-traditional tables that `tools/build_dict.py` applies to the meanings
- License: Apache License 2.0

## PaddleOCR PP-OCRv6 models, from RapidOCR

- Source: the `rapidocr` 3.10.0 wheel on PyPI, sha256 `2fc34e26cd0f48514804a94f8832283039c7334076bff60768b1fed9ad068050`
- Used for: `docs/ocr/PP-OCRv6_det_small.onnx`, `docs/ocr/PP-OCRv6_rec_small.onnx`, copied unchanged, and `docs/ocr/keys.json`, the character list read from the recognition model
- License: Apache License 2.0. The model weights are by Baidu and the PaddleOCR rights holders. See `licenses/RapidOCR-MODEL_LICENSES.md`.

## onnxruntime-web

- Source: the `onnxruntime-web` 1.30.0 package on npm, sha256 `d2228df7e4616bc3348bf504ee888f3bec43789a273f0a63f3e68d203ce3bf71`
- Used for: `docs/ocr/ort.wasm.min.js`, `docs/ocr/ort-wasm-simd-threaded.mjs`, `docs/ocr/ort-wasm-simd-threaded.wasm`, copied unchanged
- License: MIT. The npm package has no license file, so `licenses/onnxruntime-MIT.txt` is the LICENSE from https://github.com/microsoft/onnxruntime at tag `v1.30.0`.
