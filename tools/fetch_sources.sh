#!/bin/bash
# Fetch the pinned dictionary and OCR sources into .cache/src (not committed).
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
download() {  # download <file> <url> <sha256>
  local file=".cache/src/$1"
  if [ -f "$file" ] && echo "$3  $file" | sha256sum -c --status; then return; fi
  mkdir -p .cache/src
  curl -fsSL -o "$file" "$2"
  echo "$3  $file" | sha256sum -c --status || { echo "checksum mismatch: $1" >&2; exit 1; }
}
fetch ECDICT https://github.com/skywind3000/ECDICT.git 39cfb9672c0906b63569e0453c2e6abfb9ab182a /ecdict.csv /LICENSE
fetch OpenCC https://github.com/BYVoid/OpenCC.git fae2a0a911c30764e669a7d8b0591cd8e852934a /data/dictionary/ /LICENSE
download rapidocr-3.10.0-py3-none-any.whl \
  https://files.pythonhosted.org/packages/59/07/203065283bba0c5e9c10af3602dc25ab3e59ee54dc2d1d22c8faeabf5ed8/rapidocr-3.10.0-py3-none-any.whl \
  2fc34e26cd0f48514804a94f8832283039c7334076bff60768b1fed9ad068050
download onnxruntime-web-1.30.0.tgz \
  https://registry.npmjs.org/onnxruntime-web/-/onnxruntime-web-1.30.0.tgz \
  d2228df7e4616bc3348bf504ee888f3bec43789a273f0a63f3e68d203ce3bf71
echo "sources ready in .cache/src"
