# Third-party notices

單字火箭 ships data and code from these projects. Each section names the pinned commit and the files that use it. The full Apache License 2.0 text is in `licenses/Apache-2.0.txt`, and the ECDICT MIT text is in `licenses/ECDICT-MIT.txt`.

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

## tesseract.js-core

- Source: https://github.com/naptha/tesseract.js-core at `acffef2b66eb44a31df297e11d905f4b39001068`
- Used for: `docs/ocr/tesseract-core-simd-lstm.wasm.js` and `docs/ocr/tesseract-core-lstm.wasm.js`, copied unchanged
- License: Apache License 2.0. The files contain Tesseract OCR compiled to WebAssembly.

## tessdata_fast

- Source: https://github.com/tesseract-ocr/tessdata_fast at `87416418657359cb625c412a48b6e1d6d41c29bd`
- Used for: `docs/ocr/eng-fast.js`, which holds `eng.traineddata` encoded as base64
- License: Apache License 2.0
