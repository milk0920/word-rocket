/* Word Rocket OCR worker: Tesseract (Apache-2.0) via tesseract.js-core, English LSTM model from tessdata_fast. */
let ready = null;
function init(base) {
  if (!ready) ready = (async () => {
    const simd = WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11]));
    importScripts(base + (simd ? 'tesseract-core-simd-lstm.wasm.js' : 'tesseract-core-lstm.wasm.js'));
    const M = await TesseractCore({ locateFile: f => base + f });
    importScripts(base + 'eng-fast.js');
    const s = atob(self.ENG_TRAINEDDATA_B64); self.ENG_TRAINEDDATA_B64 = null;
    const bin = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) bin[i] = s.charCodeAt(i);
    M.FS.writeFile('./eng.traineddata', bin);
    const api = new M.TessBaseAPI();
    if (api.Init(null, 'eng', 1) === -1) throw new Error('init failed');
    return { M, api };
  })();
  return ready;
}
onmessage = async (e) => {
  const { base, image } = e.data;
  try {
    postMessage({ stage: 'load' });
    const { M, api } = await init(base);
    postMessage({ stage: 'read' });
    M.FS.writeFile('/input', new Uint8Array(image));
    if (api.SetImageFile(1, 0) === 1) throw new Error('bad image');
    api.SetVariable('tessedit_pageseg_mode', '3');
    api.Recognize(null);
    const tsv = api.GetTSVText(0);
    api.Clear();
    postMessage({ tsv });
  } catch (err) {
    ready = null;
    postMessage({ error: String(err && err.message || err) });
  }
};
