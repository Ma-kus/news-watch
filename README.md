# 科技新聞每日必讀
靜態網頁 (GitHub Pages) + Python 收集器。詳見 CURATION.md。
- `python3 collect.py` → data/candidates.json + data/archive/pool-DATE.json (+ index)。`--raw` 另產生舊版關鍵字 feed。
- 助理策展 → data/brief.json → `python3 validate_brief.py` → `./deploy.sh`
- 條件設定存於瀏覽器 localStorage,由使用者複製 JSON 給助理。
