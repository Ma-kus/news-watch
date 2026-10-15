# 營運手冊 (Operations)

## 1. 每日流程
排程:routine `automation-1792071396324`,每天 08:30 Asia/Taipei。
1. `collect.py`:產生 `data/candidates.json` 與 `data/archive/pool-DATE.json`。
2. AI 助理依 [CURATION.md](../CURATION.md) 與 `config/preferences.json` 選 20、翻譯、寫雙視角分析 → `data/brief.json`,複製為 `data/archive/brief-DATE.json`。
3. `python3 tools/validate_brief.py` 必須 OK(錯誤則修正重跑)。
4. `tools/deploy.sh`(production 以 `SRC=/workspace/news-watch` 執行):更新索引、同步、commit、push。
5. 助理傳送當日重點給使用者。
備註:收集失敗時,`deploy.sh` 仍可推送既有簡報;若簡報未產生,網站顯示前一日內容。

## 2. 手動部署
```bash
SRC=/workspace/news-watch tools/deploy.sh   # 或在 clone 內直接 tools/deploy.sh
```
Pages 於 push 後約 1 分鐘更新。確認:`curl -sI https://ma-kus.github.io/news-watch/ | head -1` 應為 200。

## 3. 套用使用者貼來的設定
1. 在網站「條件設定」頁複製 JSON。
2. 貼給助理;助理驗證為合法 JSON、結構符合 `docs/ARCHITECTURE.md` §4.4。
3. 覆寫 `config/preferences.json`(必要時同步 `watchlist.json`/`lenses.json`),commit。
4. 隔天 08:30 起生效;「今日額外關注」只影響當日。

## 4. 故障排除
| 症狀 | 處理 |
|---|---|
| 網站 404 / 未更新 | 檢查 repo Settings → Pages 為 main / root;`.nojekyll` 存在;查看 Actions 的 pages build |
| `validate_brief.py` 失敗 | 依訊息補欄位(20 則、rank、雙視角必填欄位),URL 必須取自候選池 |
| 候選數量為 0 | 檢查對外網路 / Google News RSS 是否被擋;重跑 `collect.py` |
| push 被拒 | `git pull --rebase origin main` 後重試;確認 `gh auth status` |
| 設定面板儲存無效 | 預期行為(靜態站),請貼 JSON 給助理 |
| 全部新聞缺某日 | 確認 `data/archive/pool-DATE.json` 與 `pool-index.json` |

## 5. 版本發佈流程
1. 功能分支 → PR → 合併 main。
2. 更新 `CHANGELOG.md`。
3. `git tag -a vX.Y.Z -m "..." && git push origin vX.Y.Z`;`gh release create vX.Y.Z --notes-file ...`。

## 6. 安全
- repo 不得含 token、密鑰、`.env`(已列入 `.gitignore`)。
- gh CLI 以 device flow 授權,憑證僅存於執行環境,不在 repo。
- 網站公開,僅放公開新聞資料。
