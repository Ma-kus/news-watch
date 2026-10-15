#!/bin/bash
# Daily pipeline tail: collect -> refresh brief index -> sync site files into the Pages checkout -> commit & push.
# Repo-relative: run from a clone. Optionally keep a separate working dir (SRC) that holds the live data;
# by default SRC == this repo and the script just collects + commits.
#   SRC=/workspace/news-watch tools/deploy.sh      # production layout (working dir -> deploy checkout)
set -euo pipefail
DST="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="${SRC:-$DST}"
export NEWS_WATCH_ROOT="$SRC"
mkdir -p "$SRC/data/archive"
python3 "$DST/tools/collect.py"
python3 - "$SRC" <<'PY'
import os,re,json,sys
a=sys.argv[1]+"/data/archive"
json.dump(sorted(f[6:-5] for f in os.listdir(a) if re.fullmatch(r"brief-\d{4}-\d\d-\d\d\.json",f)),open(a+"/brief-index.json","w"))
PY
cd "$DST"; git pull -q --rebase origin main || true
if [ "$SRC" != "$DST" ]; then
  cp "$SRC"/index.html "$SRC"/style.css "$SRC"/app.js "$SRC"/CURATION.md "$DST"/
  mkdir -p config && cp "$SRC"/config/{preferences,watchlist,lenses}.json config/
  rm -rf data; mkdir -p data/archive
  cp "$SRC"/data/archive/pool-*.json "$SRC"/data/archive/brief-*.json data/archive/ 2>/dev/null || true
  [ -f "$SRC/data/brief.json" ] && cp "$SRC/data/brief.json" data/
fi
git add -A
if git diff --cached --quiet; then echo "no changes"; else git commit -qm "Update $(date +%F\ %H:%M)" && git push -q origin main && echo pushed; fi
