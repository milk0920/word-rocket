// End-to-end checks on emulated Android devices. Run: node tests/e2e.js
// Needs the playwright package and its Chromium. Screenshots go to $SHOTS (default test-results/).
const { chromium, devices } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SHOTS = process.env.SHOTS || path.join(ROOT, 'test-results');
const PORT = 8765;
const URL = `http://127.0.0.1:${PORT}/index.html`;
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
async function check(name, fn) {
  try { await fn(); results.push([name, 'pass']); console.log(`PASS ${name}`); }
  catch (e) { results.push([name, 'FAIL']); console.log(`FAIL ${name}\n  ${e.message}`); }
}
function assert(ok, msg) { if (!ok) throw new Error(msg); }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const OCR_EXPECTED = ['breakfast', 'brush', 'teeth', 'wash', 'face', 'school bus', 'lunch', 'get up', 'homework',
  'take a shower', 'go to bed', "o'clock", 'afternoon', 'evening', 'usually', 'yo-yo'];

async function open(browser, device, extra = {}) {
  const { theme, ...opts } = extra;
  const ctx = await browser.newContext({ ...devices[device], ...opts });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', e => page.errors.push(e.message));
  await page.goto(URL);
  if (await page.$eval('#vPick', e => !e.hidden)) await page.click({ hero: '#pickHero', block: '#pickBlock' }[extra.theme] || '#pickSpace');
  return page;
}
async function words(page) { return page.$$eval('#wlist .item b', els => els.map(e => e.textContent)); }
async function noHorizontalScroll(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
}
async function answer(page, right) {
  const w = await page.evaluate(() => window.__wr.S.queue[window.__wr.S.i]);
  await page.fill('#ans', right ? `  ${w.toUpperCase()} ` : 'qqq');
  await page.click('#qForm button');
  if (right) await page.waitForTimeout(1700); else { await page.click('#next'); }
}
async function uploadPhoto(page, file) {
  await page.click('#homeBtn');
  await page.evaluate(() => { document.querySelector('#s3').hidden = true; });
  await page.evaluate(() => { document.querySelector('#photo').value = ''; });
  await page.setInputFiles('#photo', path.join(__dirname, 'fixtures', file));
  await page.waitForFunction(() => !document.querySelector('#s3').hidden ||
    /沒有/.test(document.querySelector('#ocrMsg').textContent), null, { timeout: 120000 });
  return words(page);
}

(async () => {
  const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: path.join(ROOT, 'docs'), stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 800));
  const browser = await chromium.launch();
  try {
    await check('parse and answer rules', async () => {
      const page = await open(browser, 'Pixel 7');
      const got = await page.evaluate(() => window.__wr.parse('Unit 3 單字\n1. apple 蘋果\n2. ice cream 冰淇淋\n3. Monday\n4. went\n5. MRT 捷運\n6. yo-yo\n7. teeth n. 牙齒   8. umbrella 雨傘\n2. ice cream'));
      assert(same(got, ['apple', 'ice cream', 'Monday', 'went', 'MRT', 'yo-yo', 'teeth', 'umbrella']), JSON.stringify(got));
      const rules = await page.evaluate(() => { const s = window.__wr.same; return [s('yo yo', 'yo-yo'), s('ICE  cream', 'ice cream'), s('yoyo', 'yo-yo'),
        s('ｂｏｗｌｉｎｇ\u3000ｂｕｍｐｅｒｓ', 'bowling bumpers'), s('bowling\u200b bumpers', 'bowling bumpers'), s('bowling\u00a0bumpers ', 'bowling bumpers'), s('bowlin bumpers', 'bowling bumpers')]; });
      assert(same(rules, [true, true, false, true, true, true, false]), JSON.stringify(rules));
    });

    await check('lane 1 full mission on Pixel 7', async () => {
      const page = await open(browser, 'Pixel 7');
      await page.click('#toPaste');
      await page.fill('#paste', '1. apple 蘋果\n2. ice cream 冰淇淋\n3. teeth');
      await page.click('#clean');
      await page.click('#launch');
      await page.waitForSelector('#vQuiz:not([hidden])');
      let wrongs = 1, beltMiss = 1;
      for (let guard = 0; guard < 40; guard++) {
        if (await page.$eval('#vLand', e => !e.hidden)) break;
        if (await page.$eval('#vResult', e => !e.hidden)) { await page.click('#rNext'); continue; }
        const phase = await page.evaluate(() => window.__wr.S.phase);
        let right = true;
        if (phase === 'full' && wrongs) { right = false; wrongs--; }
        else if (phase === 'belt' && beltMiss) { right = false; beltMiss--; }
        await answer(page, right);
      }
      assert(await page.$eval('#vLand', e => !e.hidden), 'never reached the landing screen');
      await page.screenshot({ path: path.join(SHOTS, 'full-mission.png') });
      assert(page.errors.length === 0, page.errors.join('; '));
    });

    await check('hero theme: picker, full mission, shared records', async () => {
      const page = await open(browser, 'Pixel 7', { theme: 'hero' });
      assert(await page.$eval('#launch', e => e.textContent) === '出發！', 'hero launch label');
      await page.click('#toPaste');
      await page.fill('#paste', 'apple\nice cream');
      await page.click('#clean');
      await page.click('#launch');
      await page.waitForSelector('#vQuiz:not([hidden])');
      assert(await page.$eval('#bubble', e => !e.hidden), 'goblin taunt bubble shown');
      let wrongs = 1;
      for (let guard = 0; guard < 30; guard++) {
        if (await page.$eval('#vLand', e => !e.hidden)) break;
        if (await page.$eval('#vResult', e => !e.hidden)) { await page.click('#rNext'); continue; }
        const phase = await page.evaluate(() => window.__wr.S.phase);
        await answer(page, !(phase === 'full' && wrongs-- > 0));
      }
      assert(await page.$eval('#vLand', e => !e.hidden), 'never reached the chest');
      assert(await page.$eval('#landArt', e => e.innerHTML.includes('寶箱')), 'chest art');
      await page.screenshot({ path: path.join(SHOTS, 'hero-win.png') });
      await page.click('#setBtn');
      await page.selectOption('#theme', 'space');
      await page.reload();
      assert(await page.$eval('#vPick', e => !e.hidden), 'picker shown on every open');
      assert(await page.$eval('#pickSpace .last', e => !e.hidden), 'last-played badge on the space card');
      await page.click('#pickSpace');
      assert(await page.$eval('#launch', e => e.textContent) === '發射！', 'space label after switching');
      assert(await page.$eval('#planetN', e => e.textContent) === '1', 'medal counted as a planet in the shared record');
      assert(page.errors.length === 0, page.errors.join('; '));
    });

    await check('block theme: third picker card, full mission, gold block', async () => {
      const page = await open(browser, 'Galaxy S5', { theme: 'block' });
      assert(await page.$eval('#theme', e => e.value) === 'block', 'block theme chosen');
      assert(await page.$eval('#sub', e => e.textContent).then(t => t.includes('方塊勇者')), 'block subtitle');
      await page.click('#toPaste');
      await page.fill('#paste', 'apple\ntiger');
      await page.click('#clean');
      await page.click('#launch');
      await page.waitForSelector('#vQuiz:not([hidden])');
      assert(await page.$eval('#target', e => e.innerHTML.includes('殭屍')), 'zombie on the surface');
      let wrongs = 1;
      for (let guard = 0; guard < 30; guard++) {
        if (await page.$eval('#vLand', e => !e.hidden)) break;
        if (await page.$eval('#vResult', e => !e.hidden)) { await page.click('#rNext'); continue; }
        const phase = await page.evaluate(() => window.__wr.S.phase);
        if (phase === 'belt') assert(await page.$eval('#target', e => e.innerHTML.includes('鐵甲殭屍')), 'armored zombie in the mine');
        await answer(page, !(phase === 'full' && wrongs-- > 0));
      }
      assert(await page.$eval('#landArt', e => e.innerHTML.includes('金方塊')), 'gold block on the win screen');
      assert(await noHorizontalScroll(page), 'S5 width');
      await page.screenshot({ path: path.join(SHOTS, 'block-win.png') });
      assert(page.errors.length === 0, page.errors.join('; '));
    });

    await check('WR-2 offline: page, practice and cached photo recognition', async () => {
      const ctx = await browser.newContext({ ...devices['Galaxy Tab S4'] });
      const page = await ctx.newPage();
      page.errors = []; page.on('pageerror', e => page.errors.push(e.message));
      await page.goto(URL);
      await page.waitForFunction(() => navigator.serviceWorker.controller || navigator.serviceWorker.ready.then(() => true), null, { timeout: 20000 });
      await page.reload();
      await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 20000 });
      if (await page.$eval('#vPick', e => !e.hidden)) await page.click('#pickSpace');
      const first = await uploadPhoto(page, 'mild.jpg');
      assert(first.length === 16, 'online recognition ' + first.length);
      await ctx.setOffline(true);
      await page.reload();
      assert(await page.$eval('#vPick', e => !e.hidden), 'picker shows offline');
      await page.click('#pickSpace');
      assert(await page.$eval('#vHome', e => !e.hidden), 'home shows offline');
      const second = await uploadPhoto(page, 'clean.png');
      await page.screenshot({ path: path.join(SHOTS, 'offline-photo.png') });
      assert(second.length === 16, 'offline recognition ' + second.length);
      await page.click('#launch');
      await page.waitForSelector('#vQuiz:not([hidden])');
      await ctx.setOffline(false);
      assert(page.errors.length === 0, page.errors.join('; '));
      await ctx.close();
    });

    await check('WR-3 hints: few words, missing voice, in-app browser', async () => {
      const page = await open(browser, 'Galaxy Tab S4');
      const got = await uploadPhoto(page, 'one-word.png');
      assert(same(got, ['telescope']), JSON.stringify(got));
      assert(await page.$eval('#fewNote', e => !e.hidden), 'few-words hint');
      await page.click('#setBtn');
      await page.selectOption('#accent', 'en-GB');
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(SHOTS, 'voice-hint.png') });
      const hasGb = await page.evaluate(() => speechSynthesis.getVoices().some(v => /en[-_]GB/i.test(v.lang)));
      assert(await page.$eval('#voiceMsg', e => !e.hidden) === !hasGb, 'voice hint matches the installed voices');
      assert(await page.$eval('#inAppNote', e => e.hidden), 'no in-app banner in Chrome');
      const inApp = await open(browser, 'Galaxy Tab S4', { userAgent: devices['Galaxy Tab S4'].userAgent.replace(')', '; wv)') });
      assert(await inApp.$eval('#inAppNote', e => !e.hidden), 'in-app banner in a WebView');
    });

    for (const [device, shot] of [['Galaxy S5', 's5-wrong.png'], ['Galaxy Tab S4 landscape', 'tab-landscape.png']]) {
      await check(`lanes 2-3 layout on ${device}`, async () => {
        const page = await open(browser, device);
        assert(await noHorizontalScroll(page), 'home scrolls sideways');
        await page.click('#toPaste');
        await page.fill('#paste', 'convenience store\nyo-yo\napple');
        await page.click('#clean');
        assert(await noHorizontalScroll(page), 'confirm scrolls sideways');
        await page.click('#launch');
        await page.waitForSelector('#vQuiz:not([hidden])');
        assert(await noHorizontalScroll(page), 'quiz scrolls sideways');
        await page.fill('#ans', 'zzz');
        await page.click('#qForm button');
        assert(await noHorizontalScroll(page), 'wrong-answer view scrolls sideways');
        await page.screenshot({ path: path.join(SHOTS, shot) });
      });
    }

    for (const [file, shot] of [['clean.png', 'ocr-clean.png'], ['mild.jpg', 'ocr-mild.png']]) {
      await check(`lanes 4-5 photo recognition ${file}`, async () => {
        const page = await open(browser, 'Galaxy Tab S4');
        const got = await uploadPhoto(page, file);
        await page.screenshot({ path: path.join(SHOTS, shot) });
        assert(same([...got].sort(), [...OCR_EXPECTED].sort()), `got ${JSON.stringify(got)}`);  // the quiz shuffles, so order does not matter
      });
    }

    await check('lane 6 typing input', async () => {
      const page = await open(browser, 'Galaxy Tab S4');
      await page.click('#toType');
      const msgs = [];
      for (const w of ['apple', 'Ice cream', 'apple', '蘋果', 'yo-yo']) {
        await page.fill('#addWord', w);
        await page.press('#addWord', 'Enter');
        msgs.push(await page.$eval('#addMsg', e => e.hidden ? '' : e.textContent));
      }
      await page.screenshot({ path: path.join(SHOTS, 'typing.png') });
      assert(same(await words(page), ['apple', 'ice cream', 'yo-yo']), JSON.stringify(await words(page)));
      assert(msgs[2].includes('已經在清單') && msgs[3].includes('英文字母'), JSON.stringify(msgs));
    });

    await check('lanes 7-8 records and accent survive a reload', async () => {
      const page = await open(browser, 'Pixel 7');
      await page.click('#toPaste');
      await page.fill('#paste', 'apple');
      await page.click('#clean');
      await page.click('#launch');
      await page.waitForSelector('#vQuiz:not([hidden])');
      await answer(page, false);
      await page.click('#setBtn');
      await page.selectOption('#accent', 'en-GB');
      await page.reload();
      const state = await page.evaluate(() => JSON.parse(localStorage.getItem('wordRocket.v1')));
      await page.screenshot({ path: path.join(SHOTS, 'reload.png') });
      assert(state.settings.accent === 'en-GB', 'accent lost');
      assert(Object.keys(state.lists).length === 1 && 'apple' in state.book, JSON.stringify(state));
      assert(await page.$eval('#bookN', e => e.textContent) === '1', 'book badge');
    });

    await check('lane 9 Google Lens link on Android', async () => {
      const page = await open(browser, 'Galaxy Tab S4');
      const href = await page.$eval('#openLens', e => e.href);
      await page.screenshot({ path: path.join(SHOTS, 'lens-link.png') });
      assert(href.startsWith('intent:#Intent;') && href.includes('package=com.google.ar.lens') &&
        href.includes('lens.google.com'), href);
    });

    await check('lane 10 mistake book clears after two right answers', async () => {
      const page = await open(browser, 'Pixel 7');
      await page.evaluate(() => localStorage.setItem('wordRocket.v1', JSON.stringify({ lists: {}, book: { apple: 0 }, planets: [], settings: { bookOn: true, rate: 0.9, accent: 'en-US', theme: 'space' } })));
      await page.reload();
      await page.click('#bookBtn');
      await page.click('#bGo');
      await answer(page, true);
      await page.click('#rNext');
      await answer(page, true);
      await page.screenshot({ path: path.join(SHOTS, 'book.png') });
      const book = await page.evaluate(() => JSON.parse(localStorage.getItem('wordRocket.v1')).book);
      assert(same(book, {}), JSON.stringify(book));
    });
  } finally {
    await browser.close();
    server.kill();
  }
  const failed = results.filter(r => r[1] !== 'pass').length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})();
