# 產業新聞觀察站

純 HTML/CSS/JS 靜態網頁 + Python (標準函式庫) 收集器,資料來源為 Google News RSS(zh-TW 與 en-US)。

## 執行
- 收集新聞:`python3 collect.py` → 寫入 `data/news.json` 與 `data/archive/YYYY-MM-DD.json`(日期為台灣時間)
- 啟動網站:`nohup python3 server.py 8080 &` → http://localhost:8080
  (server.py = 靜態伺服器 + 儲存設定的 API;若用 `python3 -m http.server`,設定面板只能「下載 JSON」再手動放到 `config/topics.json`)
- 每天 08:30 (UTC+8) 自動收集(cron,伺服器為 UTC 則 00:30):
  `30 0 * * * cd /workspace/news-watch && python3 collect.py`

## 編輯主題
網頁右上「⚙ 設定」可增刪分類/主題/中英文關鍵字,按儲存寫入 `config/topics.json`;或直接編輯該檔。
`max_age_hours`(預設 48)、`max_items_per_query`(預設 15)可在檔內調整。

## 限制
Google News RSS 連結為轉址連結;單一查詢數量有限;僅在本機可存取,除非另行部署。

## GitHub Pages
線上版為靜態網站,設定面板無法儲存;請編輯 `config/topics.json`。`deploy.sh` 會收集新聞並推送更新。
