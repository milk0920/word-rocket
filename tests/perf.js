// Perf probe from the WR-1 plan. Run: node tests/perf.js [runs]
// Moto G4 emulation, CPU throttled 4x, Fast 3G network, gzip like GitHub Pages.
// home = time until the page script has run. Prints median and range per metric.
const { chromium, devices } = require('playwright');
const http = require('http');
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const RUNS = Number(process.argv[2] || 5);
const PORT = 8766;
const URL = `http://127.0.0.1:${PORT}/index.html`;
const FAST_3G = { offline: false, latency: 563, downloadThroughput: (1.6 * 1024 * 1024) / 8 * 0.9, uploadThroughput: (750 * 1024) / 8 * 0.9 };
const EXPECTED = 16;

const median = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

async function run(browser) {
  const ctx = await browser.newContext({ ...devices['Moto G4'] });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', FAST_3G);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const t0 = Date.now();
  await page.goto(URL, { waitUntil: 'commit' });
  await page.waitForFunction(() => window.__wr, null, { timeout: 120000 });
  const home = (Date.now() - t0) / 1000;
  const ocr = async () => {
    await page.click('#homeBtn');
    await page.evaluate(() => { document.querySelector('#s3').hidden = true; document.querySelector('#photo').value = ''; });
    const t = Date.now();
    await page.setInputFiles('#photo', path.join(__dirname, 'fixtures', 'mild.jpg'));
    await page.waitForFunction(() => !document.querySelector('#s3').hidden, null, { timeout: 300000 });
    const n = await page.$$eval('#wlist .item', e => e.length);
    if (n !== EXPECTED) throw new Error(`recognized ${n} words, expected ${EXPECTED}`);
    return (Date.now() - t) / 1000;
  };
  const first = await ocr();
  const warm = await ocr();
  await ctx.close();
  return { home, first, warm };
}

(async () => {
  // GitHub Pages serves gzip, so the probe does too.
  const DOCS = path.join(__dirname, '..', 'docs');
  const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript' };
  const server = http.createServer((req, res) => {
    const file = path.join(DOCS, decodeURIComponent(req.url.split('?')[0]));
    if (!file.startsWith(DOCS) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Content-Encoding': 'gzip' });
    res.end(zlib.gzipSync(fs.readFileSync(file)));
  }).listen(PORT, '127.0.0.1');
  const browser = await chromium.launch();
  const rows = [];
  try {
    for (let i = 0; i < RUNS; i++) { const r = await run(browser); rows.push(r); console.log(`run ${i + 1}`, JSON.stringify(r)); }
  } finally { await browser.close(); server.close(); }
  const budgets = { home: 4, first: 40, warm: 8 };
  let failed = false;
  for (const k of Object.keys(budgets)) {
    const v = rows.map(r => r[k]);
    const ok = median(v) <= budgets[k];
    failed ||= !ok;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${k}: median ${median(v).toFixed(1)} s, range ${Math.min(...v).toFixed(1)} to ${Math.max(...v).toFixed(1)} s, budget ${budgets[k]} s, ${RUNS} runs`);
  }
  process.exit(failed ? 1 : 0);
})();
