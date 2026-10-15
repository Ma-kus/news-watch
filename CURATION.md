# 每日必讀 20 則 — 策展流程 (給 AI 助理)

腳本只負責蒐集;**選 20 則、翻譯、撰寫**兩種視角**分析(總編輯、CEO/COO)由助理完成**。

## 每日流程 (台灣時間 08:30)
1. `cd /workspace/news-watch && python3 collect.py` → 產生 `data/candidates.json`(過去 24 小時候選池,約 900+ 則)、`data/archive/pool-YYYY-MM-DD.json`(永久累積的全部新聞)。
2. 讀取 `config/preferences.json`(使用者條件;若使用者貼來新的 JSON,先覆寫此檔)與 `data/candidates.json`(已依 score 排序;含 lens/companies/keywords/region)。
3. 選 20 則:
   - 四大視角:A 重要廠商動態(新品/技術突破/購併/合作/策略)、B 台灣產業關聯(對台廠/供應鏈有重大影響)、C 科技政策(全球或台灣,影響產業發展)、D 政經財務變化(戰爭、疫情、通膨、關稅、利率…)。
   - 依 `lenses.*.weight` 分配比例(weight 越高名額越多),`enabled=false` 的視角不選(W 除外)。
   - `region_weight` 決定台灣 vs 全球比重;`watchlist_companies` 優先;`boost_keywords` 僅作加分、`exclude_keywords` 排除。
   - `extra_focus_today` 當天必須納入考量(candidates 中 `focus=true` 為其搜尋結果)。
   - `wildcard_slots` 個名額留給「意外重要」(category = `W`):不符合關鍵字/公司,但對產業有重大影響者(可從 `wildcard=true` 或任何候選挑選)。
   - 去除重複事件(同一事件多家報導只留最權威/最原始一則)。
   - 只選過去 24 小時內;**url 必須取自 candidates.json**(Google News 連結),不得捏造。
4. 英文外電:`title_zh` 為繁體中文翻譯、`title_en` 為英文標題 → UI 顯示中英對照。中文來源 `title_en` 設 `""`。
4b. 分析:針對同一批 20 則,各寫一份 `analysis_editor`(資深 B2B 科技媒體總編輯:對台灣產業意義/影響、值得追蹤議題、報導角度)與 `analysis_executive`(科技公司 CEO/COO:如何評估產業意義與影響、決策考量、後續追蹤)。僅依 20 則內容撰寫,不得捏造事實;未證實消息(單一來源/據報)必須明確標示。內文以 `#排名`(如 #3)引用新聞,UI 會轉成可點連結。`analysis` 改為選填的 2–4 句總覽。
5. 寫出 `data/brief.json`,再複製為 `data/archive/brief-YYYY-MM-DD.json`。
6. `python3 validate_brief.py` 必須 OK。
7. `./deploy.sh`(推送;會更新 brief-index.json)。

## brief.json schema
```json
{
  "date": "2026-10-16",                      // 台灣日期
  "generated_at": "2026-10-16T08:25:00+08:00",
  "analysis": "選填:今日總覽 (舊版 brief 為 >=3 段完整分析,UI 仍可顯示)",
  "analysis_editor": {
    "persona_title": "總編輯視角:資深 B2B 科技媒體總編輯",
    "summary": "段落1\n\n段落2\n\n段落3",     // >=2 段(空行分隔),繁體中文,可用 #3 引用新聞
    "implications_taiwan": ["..."],           // >=3
    "story_angles": ["..."],                  // >=3 報導切入角度
    "questions_to_track": ["..."]             // >=4
  },
  "analysis_executive": {
    "persona_title": "CEO/COO 視角:科技公司高階主管",
    "summary": "段落1\n\n段落2",
    "implications_taiwan": ["..."],
    "decision_considerations": ["..."],       // >=3,涵蓋供應鏈/客戶/資本支出/合作/風險
    "questions_to_track": ["..."]
  },
  "items": [                                  // 剛好 20 筆,rank 1..20
    {
      "rank": 1,
      "category": "A",                        // A|B|C|D|W
      "title_original": "原文標題",
      "title_zh": "繁體中文標題",
      "title_en": "English title or \"\"",
      "source": "Reuters",
      "url": "https://...",                   // 取自 candidates.json
      "published_at": "2026-10-16T05:12:00+00:00",
      "why_it_matters": "1-2 句:為何重要、對台灣/全球影響",
      "angle": "報導切入角度/題材建議",
      "companies": ["TSMC", "Nvidia"]
    }
  ]
}
```
類別:A 重要廠商動態 / B 台灣產業關聯 / C 科技政策 / D 政經財務變化 / W 意外重要。

## preferences.json
`{lenses:{A..D:{enabled,weight}}, watchlist_companies[], boost_keywords[], exclude_keywords[], region_weight:{taiwan,global}, extra_focus_today, wildcard_slots}`。網頁「條件設定」存於瀏覽器 localStorage,使用者按「複製設定」貼給助理,助理寫入此檔後套用於**明天**的 brief,並清空 `extra_focus_today`(視使用者意願)。公司別名/搜尋詞在 `config/watchlist.json`;視角查詢詞在 `config/lenses.json`。

## 全部新聞封存
`data/archive/pool-YYYY-MM-DD.json` 每日累積(同日重跑會合併),`pool-index.json` 為日期索引;UI 「全部新聞」分頁依日期延遲載入,並以 brief 的 url 標記當日 Top 20。`brief-index.json` 為有 brief 的日期清單。
