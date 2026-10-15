#!/usr/bin/env python3
"""Collect news from Google News RSS. Stdlib only.
build_raw -> data/news.json (全部新聞); build_candidates -> data/candidates.json (24h pool for AI curation).
This script never writes brief.json."""
import json, os, sys, time, urllib.request, urllib.parse, re, html
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from datetime import datetime, timezone, timedelta
from concurrent.futures import ThreadPoolExecutor
ROOT=os.environ.get("NEWS_WATCH_ROOT") or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # repo root (parent of tools/)
TZ=timezone(timedelta(hours=8))
LOC={"zh":"hl=zh-TW&gl=TW&ceid=TW:zh-Hant","en":"hl=en-US&gl=US&ceid=US:en"}
def fetch(job):
    topic,lang,q,hours=job
    when=f"{max(1,hours//24)}d"
    url="https://news.google.com/rss/search?q="+urllib.parse.quote(f'{q} when:{when}')+"&"+LOC[lang]
    for _ in range(3):
        try:
            data=urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0"}),timeout=20).read()
            return job,ET.fromstring(data)
        except Exception as e:
            err=e; time.sleep(1.5)
    print("FAIL",q,err,file=sys.stderr); return job,None
def build_raw():
    cfg=json.load(open(f"{ROOT}/config/topics.json",encoding="utf-8"))
    hours=cfg.get("max_age_hours",48); cap=cfg.get("max_items_per_query",15)
    now=datetime.now(timezone.utc); cutoff=now-timedelta(hours=hours)
    jobs=[];meta={}
    for c in cfg["categories"]:
        for t in c["topics"]:
            meta[t["id"]]=(c["id"],t["name"])
            for lang in("zh","en"):
                for q in t.get(lang,[]): jobs.append((t["id"],lang,q,hours))
    items={}
    with ThreadPoolExecutor(6) as ex:
        for (tid,lang,q,_),root in ex.map(fetch,jobs):
            if root is None: continue
            n=0
            for it in root.iter("item"):
                if n>=cap: break
                try: pub=parsedate_to_datetime(it.findtext("pubDate")).astimezone(timezone.utc)
                except Exception: continue
                if pub<cutoff: continue
                title=html.unescape(it.findtext("title") or "").strip()
                src=it.find("source"); source=(src.text if src is not None else "") or ""
                if source and title.endswith(" - "+source): title=title[:-len(source)-3]
                link=it.findtext("link")
                key=re.sub(r"\W+","",title.lower())[:80]
                n+=1
                if key in items:
                    if tid not in items[key]["topics"]: items[key]["topics"].append(tid)
                    continue
                items[key]={"title":title,"source":source,"link":link,"published":pub.isoformat(),
                  "lang":"zh" if re.search(r"[\u4e00-\u9fff]",title) else "en","topics":[tid]}
    out=sorted(items.values(),key=lambda x:x["published"],reverse=True)
    for i in out: i["categories"]=sorted({meta[t][0] for t in i["topics"]})
    today=datetime.now(TZ).strftime("%Y-%m-%d")
    doc={"date":today,"generated_at":now.isoformat(),"count":len(out),"items":out}
    os.makedirs(f"{ROOT}/data/archive",exist_ok=True)
    for p in (f"{ROOT}/data/news.json",f"{ROOT}/data/archive/{today}.json"):
        json.dump(doc,open(p,"w",encoding="utf-8"),ensure_ascii=False,indent=1)
    idx=sorted(f[:-5] for f in os.listdir(f"{ROOT}/data/archive") if f.endswith(".json"))
    json.dump(idx,open(f"{ROOT}/data/archive/index.json","w"))
    print(f"collected {len(out)} unique items")

def load(p,default=None):
    try: return json.load(open(f"{ROOT}/{p}",encoding="utf-8"))
    except Exception: return default
TRUSTED=("reuters","bloomberg","financial times","wsj","wall street journal","cnbc","digitimes","電子時報","經濟日報","工商時報","數位時報","techcrunch","the verge","nikkei","focus taiwan","中央社","ctee","technews","科技新報","anandtech","semianalysis","the information","tom's hardware","ithome","ieee","econ","科技產業資訊室","聯合新聞網","鉅亨","財訊","pr newswire","business wire")
def build_candidates():
    pref=load("config/preferences.json",{}); wl=load("config/watchlist.json",{"companies":[]}); lz=load("config/lenses.json")
    hours=24; now=datetime.now(timezone.utc); cutoff=now-timedelta(hours=hours)
    allco={c["id"]:c for c in wl["companies"]}
    wanted=[allco[n] for n in pref.get("watchlist_companies",list(allco)) if n in allco]
    # companies in preferences but not in watchlist.json: generic query
    for n in pref.get("watchlist_companies",[]):
        if n not in allco: wanted.append({"id":n,"name":n,"zh":n,"en":n,"taiwan":False})
    jobs=[]  # (kind,key,lang,query)
    for c in wanted:
        jobs.append(("company",c["id"],"zh",c["zh"])); jobs.append(("company",c["id"],"en",c["en"]))
    for L,v in lz["lenses"].items():
        if not pref.get("lenses",{}).get(L,{}).get("enabled",True): continue
        for lang,qs in v["queries"].items():
            for q in qs: jobs.append(("lens",L,lang,q))
    for lang,qs in lz["wildcard"].items():
        for q in qs: jobs.append(("wild","W",lang,q))
    focus=[x.strip() for x in re.split(r"[\n;；]+",pref.get("extra_focus_today","") or "") if x.strip()]
    for q in focus: jobs.append(("focus","F","zh" if re.search(r"[\u4e00-\u9fff]",q) else "en",q))
    cap=12; pool={}
    with ThreadPoolExecutor(6) as ex:
        for (kind,key,lang,q),root in ex.map(lambda j:(j,fetch((j[1],j[2],j[3],hours))[1]),jobs):
            if root is None: continue
            n=0
            for it in root.iter("item"):
                if n>=cap: break
                try: pub=parsedate_to_datetime(it.findtext("pubDate")).astimezone(timezone.utc)
                except Exception: continue
                if pub<cutoff: continue
                title=html.unescape(it.findtext("title") or "").strip()
                src=it.find("source"); source=(src.text if src is not None else "") or ""
                if source and title.endswith(" - "+source): title=title[:-len(source)-3]
                k=re.sub(r"\W+","",title.lower())[:80]; n+=1
                c=pool.setdefault(k,{"title":title,"source":source,"url":it.findtext("link"),"published_at":pub.isoformat(),
                  "lang":"zh" if re.search(r"[\u4e00-\u9fff]",title) else "en","lenses":[],"companies":[],"wildcard":False,"focus":False,"hits":0})
                c["hits"]+=1
                if kind=="lens" and key not in c["lenses"]: c["lenses"].append(key)
                if kind=="company" and key not in c["companies"]: c["companies"].append(key)
                if kind=="wild": c["wildcard"]=True
                if kind=="focus": c["focus"]=True
    boosts=pref.get("boost_keywords",[]); excl=[e.lower() for e in pref.get("exclude_keywords",[])]
    rw=pref.get("region_weight",{"taiwan":50,"global":50}); tw=rw.get("taiwan",50)/50.0
    out=[]; dropped=0
    for c in pool.values():
        t=c["title"].lower()
        if any(e and e in t for e in excl): dropped+=1; continue
        # also match company names appearing in title
        for co in wanted:
            if co["id"] in c["companies"]: continue
            
            hit=bool(re.search(r"(?<![A-Za-z])"+re.escape(co["id"])+r"(?![A-Za-z])",c["title"],re.I))
            hit=hit or any(w in c["title"] for w in co["zh"].split() if re.search(r"[\u4e00-\u9fff]",w))
            if hit: c["companies"].append(co["id"])
        c["keywords"]=[b for b in boosts if b.lower() in t]
        score=0.0
        for L in c["lenses"]:
            score+=lz["lens_base_score"].get(L,2)*pref.get("lenses",{}).get(L,{}).get("weight",3)/3
        score+=2.0*min(len(c["companies"]),3)
        score+=0.7*min(len(c["keywords"]),3)
        score+=0.8*min(c["hits"]-1,5)  # cross-query popularity
        if c["focus"]: score+=4
        if any(x in c["source"].lower() for x in TRUSTED): score+=1.5
        taiwan=any(allco.get(x,{}).get("taiwan") for x in c["companies"]) or bool(re.search(r"台灣|台積|台廠|台股|鴻海|聯發科|Taiwan",c["title"]))
        c["region"]="taiwan" if taiwan else "global"
        if taiwan: score*=0.5+tw*0.5
        else: score*=0.5+(2-tw)*0.5
        if c["wildcard"] and not (c["lenses"] or c["companies"]): score+=1
        c["score"]=round(score,2); c["taiwan_related"]=taiwan
        c["lens"]=c.pop("lenses"); del c["hits"]
        out.append(c)
    out.sort(key=lambda x:x["score"],reverse=True)
    for i,c in enumerate(out,1): c["id"]=i
    today=datetime.now(TZ).strftime("%Y-%m-%d")
    doc={"date":today,"generated_at":now.isoformat(),"window_hours":hours,"count":len(out),"dropped_by_exclude":dropped,
         "preferences_snapshot":pref,"queries_run":len(jobs),"candidates":out}
    json.dump(doc,open(f"{ROOT}/data/candidates.json","w",encoding="utf-8"),ensure_ascii=False,indent=1)
    # persistent per-day pool archive (merged with earlier runs of the same day), plus index
    pp=f"{ROOT}/data/archive/pool-{today}.json"; prev=load(f"data/archive/pool-{today}.json",{"items":[]})
    m={re.sub(r"\W+","",x["title"].lower())[:80]:x for x in prev.get("items",[])}
    for c in out:
        k=re.sub(r"\W+","",c["title"].lower())[:80]
        if k not in m or c["score"]>=m[k].get("score",0): m[k]=c
    items=sorted(m.values(),key=lambda x:x["score"],reverse=True)
    for i,c in enumerate(items,1): c["id"]=i
    json.dump({"date":today,"generated_at":now.isoformat(),"count":len(items),"items":items},open(pp,"w",encoding="utf-8"),ensure_ascii=False,separators=(",",":"))
    ds=sorted(f[5:-5] for f in os.listdir(f"{ROOT}/data/archive") if re.fullmatch(r"pool-\d{4}-\d\d-\d\d\.json",f))
    json.dump([{"date":d,"count":(load(f"data/archive/pool-{d}.json",{}) or {}).get("count",0),"brief":os.path.exists(f"{ROOT}/data/archive/brief-{d}.json")} for d in ds],open(f"{ROOT}/data/archive/pool-index.json","w"))
    bs=sorted(f[6:-5] for f in os.listdir(f"{ROOT}/data/archive") if re.fullmatch(r"brief-\d{4}-\d\d-\d\d\.json",f))
    json.dump(bs,open(f"{ROOT}/data/archive/brief-index.json","w"))
    print(f"candidates: {len(out)} (queries {len(jobs)}, excluded {dropped})")
if __name__=="__main__":
    os.makedirs(f"{ROOT}/data/archive",exist_ok=True)
    if "--raw" in sys.argv: build_raw()  # legacy keyword feed, optional
    build_candidates()
