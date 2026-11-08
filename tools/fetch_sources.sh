#!/bin/bash
# Fetch the pinned dictionary sources into .cache/src (not committed).
set -euo pipefail
cd "$(dirname "$0")/.."
fetch() {  # fetch <dir> <repo url> <sha> [sparse paths...]
  local dir=".cache/src/$1" url=$2 sha=$3; shift 3
  if [ "$(git -C "$dir" rev-parse HEAD 2>/dev/null)" = "$sha" ]; then return; fi
  rm -rf "$dir"; mkdir -p "$dir"
  git -C "$dir" init -q
  git -C "$dir" remote add origin "$url"
  if [ $# -gt 0 ]; then git -C "$dir" sparse-checkout set --no-cone "$@"; fi
  git -C "$dir" fetch -q --depth 1 --filter=blob:none origin "$sha"
  git -C "$dir" checkout -q FETCH_HEAD
}
fetch ECDICT https://github.com/skywind3000/ECDICT.git 39cfb9672c0906b63569e0453c2e6abfb9ab182a /ecdict.csv /LICENSE
fetch OpenCC https://github.com/BYVoid/OpenCC.git fae2a0a911c30764e669a7d8b0591cd8e852934a /data/dictionary/ /LICENSE
fetch tesseract.js-core https://github.com/naptha/tesseract.js-core.git acffef2b66eb44a31df297e11d905f4b39001068 /tesseract-core-simd-lstm.wasm.js /tesseract-core-lstm.wasm.js /LICENSE
fetch tessdata_fast https://github.com/tesseract-ocr/tessdata_fast.git 87416418657359cb625c412a48b6e1d6d41c29bd /eng.traineddata /LICENSE
echo "sources ready in .cache/src"
