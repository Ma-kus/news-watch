# Changelog
格式依 [Keep a Changelog](https://keepachangelog.com/),版本依 [SemVer](https://semver.org/)。

> 註:本專案早期未使用版本標籤。`v1.0.0` 與 `v2.0.0` 為**事後補標(retrospective)**,分別標在當時最接近的提交(v1.0.0 = `25c134c`,v2.0.0 = `d121cff`);`v2.1.0` 標於文件合併後的 `main`。

## [2.1.0] - 2026-10-16
### Added
- 雙視角分析:`analysis_editor`(資深 B2B 科技媒體總編輯)與 `analysis_executive`(科技公司 CEO/COO),各含對台灣產業意義、追蹤問題,以及報導角度或決策考量。
- UI 視角切換與並排顯示;分析內文 `#n` 可連結到對應新聞。
- `validate_brief.py` 新增雙視角欄位驗證;`analysis` 改為選填總覽。
- 工程文件:`docs/`(需求、架構、決策、營運、開發紀錄)、`tools/`(腳本,路徑改為 repo 相對)、`.gitignore`、issue 範本。
### Changed
- 每日 08:30 例行流程與 `CURATION.md` 更新為雙視角版本。
- 腳本移至 `tools/`;`deploy.sh` 支援 `SRC` 環境變數。

## [2.0.0] - 2026-10-15
### Changed (breaking)
- 產品由「關鍵字新聞清單」重新設計為「編輯每日簡報」:每日必讀 20 則 + 綜合分析 + 中英對照標題 + 原文連結,蒐集窗口為 08:30 前 24 小時。
- 資料結構改為 `candidates.json` / `brief.json` / `archive/pool-DATE.json` / `archive/brief-DATE.json`;`config/topics.json` 淘汰。
### Added
- 條件設定:四大視角 A–D 權重、關注公司清單、加分/排除關鍵字、台灣/全球比重、今日額外關注、意外重要名額 W。
- 「全部新聞」分頁:每日累積、全文搜尋、多維度篩選。
- AI 助理策展流程(`CURATION.md`)與 `validate_brief.py`。

## [1.0.0] - 2026-10-15
### Added
- 初版:靜態 SPA + `collect.py`(Google News RSS)+ `server.py`;依 25 組使用者關鍵字蒐集中英文新聞(首次 687 則,48 小時)。
- 分類/語言/日期篩選與搜尋;每日 08:30(Asia/Taipei)自動更新。
- 以 `deploy.sh` 部署到 GitHub Pages(Ma-kus/news-watch)。
### Known issues
- 公開通道(tunnel)因對外網路限制失敗,改採 GitHub Pages;設定面板無法在公開站儲存。
