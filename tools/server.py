#!/usr/bin/env python3
"""Static server + POST /api/topics to save config/topics.json (so Settings panel can persist)."""
import http.server, json, os, sys
ROOT=os.environ.get("NEWS_WATCH_ROOT") or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # repo root (parent of tools/)
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s,*a,**k): super().__init__(*a,directory=ROOT,**k)
    def end_headers(s):
        s.send_header("Cache-Control","no-cache"); super().end_headers()
    def do_POST(s):
        if s.headers.get("Cf-Connecting-Ip") or s.headers.get("X-Forwarded-For") or s.headers.get("Cf-Ray"):
            s.send_error(403,"Saving disabled over public URL"); return
        if s.path!="/api/topics": s.send_error(404); return
        try:
            d=json.loads(s.rfile.read(int(s.headers.get("Content-Length",0))))
            assert isinstance(d.get("categories"),list)
            json.dump(d,open(f"{ROOT}/config/topics.json","w",encoding="utf-8"),ensure_ascii=False,indent=1)
            s.send_response(200); s.end_headers(); s.wfile.write(b'{"ok":true}')
        except Exception as e:
            s.send_error(400,str(e))
http.server.ThreadingHTTPServer(("0.0.0.0",int(sys.argv[1]) if len(sys.argv)>1 else 8080),H).serve_forever()
