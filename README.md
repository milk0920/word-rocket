# 單字火箭

孩子用 Android 手機或平板自己練英文聽寫的網頁。拍下單字表、貼上或打字輸入單字，就能聽發音拼字。答錯的字變成隕石，練到連續答對兩次為止，最後打倒怪物、登陸新星球。

網址：https://milk0920.github.io/word-rocket/

第一次打開時選冒險主題：「遨遊星際」或「英雄對決」。兩種主題的練習方式、單字清單、錯題本和收藏都共用，之後可以在設定裡切換。

## 給孩子用

1. 用 Chrome 打開上面的網址。
2. 在 Chrome 選單按「加到主畫面」，之後從主畫面的圖示打開。
3. 按綠色按鈕打開 Google 智慧鏡頭，拍單字表，選「文字」、「全選」、「複製」，回到單字火箭按「貼上單字」。也可以按「上傳單字表照片」直接辨識，印刷和手寫的單字表都可以。辨識完請看一下有沒有認錯的字。

第一次上傳照片要下載約 30 MB 的辨識程式，請在 Wi-Fi 下使用。

單字清單、錯題本和星球只存在這台裝置的瀏覽器裡，不會上傳。照片在裝置上辨識，也不會上傳。

## 修改網頁

網頁的原始碼是 `app.src.html`。字典不直接寫在裡面，而是建置時放進去。

1. 修改 `app.src.html`。
2. 重新產生網頁：

   ```bash
   python3 -I tools/build_app.py data/dict.json app.src.html docs/index.html
   ```

3. 執行測試：

   ```bash
   python3 -m unittest discover -v tests
   npm install --no-save --no-package-lock playwright@1.63.0
   npx playwright install chromium
   node tests/e2e.js
   ```

4. 量效能（不在 CI 裡跑）：

   ```bash
   node tests/perf.js 5
   ```

   它模擬 Moto G4、CPU 降速 4 倍、Fast 3G 網路，量首頁可以操作的時間和照片辨識時間，超過上限就失敗。

GitHub Pages 發布 `main` 分支的 `docs/` 資料夾。

## 修改字典

字典 `data/dict.json` 由 ECDICT 和 OpenCC 產生，照片辨識用 PaddleOCR 的 PP-OCRv6 模型和 onnxruntime-web。來源固定在 `tools/fetch_sources.sh` 寫的 commit 和檔案雜湊值。

- 要修正某個字的中文意思，編輯 `tools/overrides.json`。
- 要加入字典沒有的字或片語，編輯 `tools/supplement.json`。

然後重新產生字典和網頁：

```bash
./tools/fetch_sources.sh
python3 -I tools/build_dict.py .cache/src data
python3 -I tools/build_app.py data/dict.json app.src.html docs/index.html
```

CI 的 `reproduce` 工作會從固定的來源重新產生 `data/dict.json`、`docs/ocr/` 和 `docs/index.html`，跟 repo 裡的檔案不同就失敗。

## 授權

本專案的程式碼使用 MIT 授權，見 `LICENSE`。字典資料和照片辨識程式來自其他專案，見 `THIRD_PARTY_NOTICES.md`。
