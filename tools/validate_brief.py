#!/usr/bin/env python3
"""Validate data/brief.json (or a given file). Usage: python3 validate_brief.py [path] [--no-url-check]
Exit 0 = valid. Checks schema, 20 items, ranks, categories, bilingual titles, urls present in candidates pool."""
import json, os, re, sys
ROOT=os.environ.get("NEWS_WATCH_ROOT") or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # repo root (parent of tools/)
args=[a for a in sys.argv[1:] if not a.startswith("--")]
path=args[0] if args else f"{ROOT}/data/brief.json"
errs=[]; warn=[]
def e(m): errs.append(m)
try: d=json.load(open(path,encoding="utf-8"))
except Exception as x: print("FAIL: cannot read/parse",x); sys.exit(1)
if not re.fullmatch(r"\d{4}-\d\d-\d\d",str(d.get("date",""))): e("date must be YYYY-MM-DD (Taiwan date)")
if not d.get("generated_at"): e("generated_at (ISO 8601 with tz) required")
a=d.get("analysis")
if a is not None and not isinstance(a,str): e("analysis must be a string if present")
PERSONAS={"analysis_editor":("story_angles",4),"analysis_executive":("decision_considerations",5)}
if "analysis_editor" in d or "analysis_executive" in d or not a:
    for k,(extra,_) in PERSONAS.items():
        o=d.get(k)
        if not isinstance(o,dict): e(f"{k} required (object)"); continue
        if not str(o.get("persona_title","")).strip(): e(f"{k}.persona_title empty")
        s_=o.get("summary")
        if not isinstance(s_,str) or len([x for x in re.split(r"\n\s*\n",s_) if x.strip()])<2 or len(s_)<300: e(f"{k}.summary must be >=2 paragraphs (blank-line separated), >=300 chars, Traditional Chinese")
        for f,n in (("implications_taiwan",3),("questions_to_track",4),(extra,3)):
            v=o.get(f)
            if not isinstance(v,list) or len(v)<n or not all(isinstance(x,str) and x.strip() for x in v): e(f"{k}.{f} must be list of >={n} non-empty strings")
elif not isinstance(a,str) or len(a.strip())<300: e("legacy brief: analysis must be string >=300 chars")
items=d.get("items")
if not isinstance(items,list): e("items must be a list"); items=[]
if len(items)!=20: e(f"items must have exactly 20 entries (got {len(items)})")
CATS=set("ABCDW"); seen=set(); ranks=[]
S=("title_original","title_zh","title_en","source","url","published_at","why_it_matters","angle")
for i,it in enumerate(items,1):
    p=f"items[{i}]"
    for k in S:
        if not isinstance(it.get(k),str): e(f"{p}.{k} must be string (use \"\" for title_en on Chinese sources)")
    if it.get("category") not in CATS: e(f"{p}.category must be one of A B C D W")
    if not isinstance(it.get("rank"),int): e(f"{p}.rank must be int")
    else: ranks.append(it["rank"])
    if not isinstance(it.get("companies"),list) or not all(isinstance(c,str) for c in it.get("companies",[])): e(f"{p}.companies must be list of strings")
    if not str(it.get("url","")).startswith("http"): e(f"{p}.url must be http(s)")
    if not it.get("title_zh","").strip(): e(f"{p}.title_zh empty")
    if re.search(r"[A-Za-z]{3}",it.get("title_original","")) and not re.search(r"[\u4e00-\u9fff]",it.get("title_original","")) and not it.get("title_en","").strip(): e(f"{p}: English source needs title_en")
    if not it.get("why_it_matters","").strip(): e(f"{p}.why_it_matters empty")
    if not it.get("angle","").strip(): e(f"{p}.angle empty")
    if it.get("url") in seen: e(f"{p}: duplicate url")
    seen.add(it.get("url"))
    try:
        from datetime import datetime; datetime.fromisoformat(it["published_at"].replace("Z","+00:00"))
    except Exception: e(f"{p}.published_at must be ISO 8601")
if ranks and sorted(ranks)!=list(range(1,len(items)+1)): e("ranks must be 1..N unique")
if "--no-url-check" not in sys.argv:
    try:
        pool={c["url"] for c in json.load(open(f"{ROOT}/data/candidates.json",encoding="utf-8"))["candidates"]}
        miss=[i+1 for i,it in enumerate(items) if it.get("url") not in pool]
        if miss: warn.append(f"items {miss} url not found in candidates.json (ok only if deliberately added)")
    except Exception: warn.append("candidates.json not readable; url check skipped")
for w in warn: print("WARN:",w)
if errs:
    print("FAIL"); [print(" -",x) for x in errs]; sys.exit(1)
print("OK: brief valid")
