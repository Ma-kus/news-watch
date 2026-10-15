const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fj=async u=>{const r=await fetch(u+(u.includes("?")?"&":"?")+"t="+Date.now());if(!r.ok)throw 0;return r.json()};
const CAT={A:"重要廠商動態",B:"台灣產業關聯",C:"科技政策",D:"政經財務變化",W:"意外重要"};
const fmt=t=>new Date(t).toLocaleString("zh-TW",{timeZone:"Asia/Taipei",hour12:false,month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"});
document.querySelectorAll("#tabs button").forEach(b=>b.onclick=()=>{document.querySelectorAll("#tabs button").forEach(x=>x.classList.toggle("on",x==b));document.querySelectorAll(".tab").forEach(t=>t.hidden=t.id!=b.dataset.tab);if(b.dataset.tab=="all")initAll()});
/* ---------- brief ---------- */
async function initBrief(){
  let idx=[];try{idx=await fj("data/archive/brief-index.json")}catch{}
  $("#bdate").innerHTML='<option value="">最新</option>'+idx.slice().reverse().map(d=>`<option>${d}</option>`).join("");
  $("#bdate").onchange=loadBrief;loadBrief();
}
/* persona analysis */
const paras=t=>String(t||"").split(/\n\s*\n/).filter(x=>x.trim()).map(p=>`<p>${refs(esc(p)).replace(/\n/g,"<br>")}</p>`).join("");
const refs=h=>h.replace(/#(\d{1,2})(?!\d)/g,(m,n)=>+n>=1&&+n<=20?`<a class="ref" href="#item-${n}" data-r="${n}">#${n}</a>`:m);
const lis=(t,a)=>a&&a.length?`<h4>${t}</h4><ul>${a.map(x=>`<li>${refs(esc(x))}</li>`).join("")}</ul>`:"";
function personaCard(o,extraT,extraK){return `<h2>${esc(o.persona_title)}</h2>${paras(o.summary)}${lis("對台灣產業的意涵",o.implications_taiwan)}${lis(extraT,o[extraK])}${lis("後續追蹤問題",o.questions_to_track)}`}
function analysisHTML(b){
  const ed=b.analysis_editor,ex=b.analysis_executive;
  if(!ed&&!ex)return `<div class="analysis"><h2>📝 綜合分析</h2>${paras(b.analysis)}</div>`;
  return (b.analysis?`<div class="analysis"><h2>📝 今日總覽</h2>${paras(b.analysis)}</div>`:"")+
   `<div class="ptabs"><button class="on" data-p="ed">📰 總編輯視角</button><button data-p="ex">🏢 CEO/COO 視角</button><button data-p="both">並排</button></div>
   <div class="pwrap" id="pwrap" data-mode="ed">${ed?`<div class="analysis pc" data-p="ed">${personaCard(ed,"可切入的報導角度","story_angles")}</div>`:""}${ex?`<div class="analysis pc ex" data-p="ex">${personaCard(ex,"決策考量與行動評估","decision_considerations")}</div>`:""}</div>`;
}
document.addEventListener("click",e=>{const t=e.target.closest(".ptabs button");if(t){document.querySelectorAll(".ptabs button").forEach(x=>x.classList.toggle("on",x==t));$("#pwrap").dataset.mode=t.dataset.p;return}
  const r=e.target.closest("a.ref");if(r){e.preventDefault();const el=document.getElementById("item-"+r.dataset.r);if(el){el.scrollIntoView({behavior:"smooth",block:"center"});el.classList.add("flash");setTimeout(()=>el.classList.remove("flash"),1800)}}});
async function loadBrief(){
  const d=$("#bdate").value;let b;
  try{b=await fj(d?`data/archive/brief-${d}.json`:"data/brief.json")}catch{
    $("#bmeta").textContent="";
    $("#bbody").innerHTML='<div class="empty">📭 今日必讀 20 則尚未產生<br>每天 08:30 (台灣時間) 由助理從候選新聞中挑選、翻譯並撰寫綜合分析。<br>你可以先到「全部新聞」瀏覽已蒐集的新聞。</div>';return}
  $("#bmeta").textContent=`${b.date} ・ 產生於 ${b.generated_at?fmt(b.generated_at):"—"} (台灣時間)`;
  $("#bbody").innerHTML=analysisHTML(b)+
   b.items.map(i=>`<div class="it" id="item-${i.rank}"><div class="rk">${i.rank}</div><div><a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.title_zh||i.title_original)}${i.title_en?`<span class="en">${esc(i.title_en)}</span>`:""}</a>
   <div class="sub"><span class="badge c${i.category}">${i.category} ${CAT[i.category]||""}</span>${esc(i.source)} ・ ${i.published_at?fmt(i.published_at):""}${(i.companies||[]).map(c=>`<span class="tag">${esc(c)}</span>`).join("")}</div>
   <div class="why">💡 ${esc(i.why_it_matters)}</div><div class="angle">🎯 切入角度:${esc(i.angle)}</div></div></div>`).join("");
}
/* ---------- all news ---------- */
let pidx=null,pools={},tops={},loaded=new Set(),shown=200;
async function initAll(){
  if(pidx)return;
  try{pidx=await fj("data/archive/pool-index.json")}catch{pidx=[]}
  if(!pidx.length){$("#ameta").textContent="尚無封存新聞";return}
  const last=pidx[pidx.length-1].date;$("#from").value=$("#to").value=last;$("#from").min=$("#to").min=pidx[0].date;$("#from").max=$("#to").max=last;
  await loadRange();
}
async function loadRange(all){
  let f=$("#from").value,t=$("#to").value;if(all){f=pidx[0].date;t=pidx[pidx.length-1].date;$("#from").value=f;$("#to").value=t}
  const ds=pidx.filter(p=>p.date>=f&&p.date<=t).map(p=>p.date);
  $("#ameta").textContent="載入中…";
  await Promise.all(ds.filter(d=>!pools[d]).map(async d=>{
    try{const p=await fj(`data/archive/pool-${d}.json`);pools[d]=p.items.map(i=>({...i,day:d}))}catch{pools[d]=[]}
    try{const b=await fj(`data/archive/brief-${d}.json`);tops[d]=new Set(b.items.map(x=>x.url))}catch{tops[d]=new Set()}
  }));
  loaded=new Set(ds);fillOptions();render();
}
function cur(){return [...loaded].sort().flatMap(d=>pools[d])}
function fillOptions(){
  const it=cur(),keep=id=>$(id).value;
  const fill=(id,vals,label)=>{const v=keep(id);$(id).innerHTML=`<option value="">${label}</option>`+vals.map(x=>`<option>${esc(x)}</option>`).join("");$(id).value=v};
  const cnt=a=>{const m={};a.forEach(x=>m[x]=(m[x]||0)+1);return Object.entries(m).sort((a,b)=>b[1]-a[1]).map(e=>e[0])};
  fill("#fco",cnt(it.flatMap(i=>i.companies||[])),"全部公司");fill("#fkw",cnt(it.flatMap(i=>i.keywords||[])),"全部主題關鍵字");fill("#fsrc",cnt(it.map(i=>i.source)).slice(0,150),"全部來源");
}
function render(){
  const q=$("#aq").value.trim().toLowerCase().split(/\s+/).filter(Boolean),L=$("#flens").value,C=$("#fco").value,K=$("#fkw").value,G=$("#flang").value,S=$("#fsrc").value,T=$("#ftop").checked;
  let r=cur().filter(i=>{
    const top=tops[i.day]?.has(i.url);
    if(T&&!top)return false;if(G&&i.lang!=G)return false;if(S&&i.source!=S)return false;if(C&&!(i.companies||[]).includes(C))return false;if(K&&!(i.keywords||[]).includes(K))return false;
    if(L&&!(L=="W"?i.wildcard:(i.lens||[]).includes(L)))return false;
    if(q.length){const h=(i.title+" "+i.source+" "+(i.companies||[]).join(" ")+" "+(i.keywords||[]).join(" ")).toLowerCase();if(!q.every(w=>h.includes(w)))return false}
    return true});
  r.sort($("#fsort").value=="score"?(a,b)=>b.score-a.score:(a,b)=>b.published_at.localeCompare(a.published_at));
  $("#ameta").textContent=`已載入 ${loaded.size} 天、共 ${cur().length} 則 ・ 符合 ${r.length} 則`;
  $("#alist").innerHTML=r.slice(0,shown).map(i=>`<div class="ai"><a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.title)}</a>${tops[i.day]?.has(i.url)?'<span class="tag top">★ Top 20</span>':""}
   <div class="sub">${esc(i.source)} ・ ${fmt(i.published_at)} ・ ${i.lang=="zh"?"中":"EN"} ・ 分數 ${i.score}${(i.lens||[]).map(l=>`<span class="badge c${l}">${l}</span>`).join("")}${(i.companies||[]).map(c=>`<span class="tag">${esc(c)}</span>`).join("")}${(i.keywords||[]).map(c=>`<span class="tag">#${esc(c)}</span>`).join("")}</div></div>`).join("")||'<div class="empty">沒有符合的新聞</div>';
  $("#more").hidden=r.length<=shown;$("#more").onclick=()=>{shown+=200;render()};
}
["#aq","#flens","#fco","#fkw","#flang","#fsrc","#fsort","#ftop"].forEach(s=>$(s).addEventListener(s=="#aq"?"input":"change",()=>{shown=200;render()}));
$("#from").onchange=$("#to").onchange=()=>loadRange();$("#loadAll").onclick=()=>loadRange(true);
/* ---------- preferences ---------- */
let P,DEF;
async function initCfg(){
  DEF=await fj("config/preferences.json");
  try{P=JSON.parse(localStorage.getItem("prefs"))}catch{}
  P=P||JSON.parse(JSON.stringify(DEF));drawCfg();
}
const save=()=>localStorage.setItem("prefs",JSON.stringify(P));
function chips(id,key){$(id).innerHTML=P[key].map((x,i)=>`<span class="chip">${esc(x)}<button data-k="${key}" data-i="${i}">✕</button></span>`).join("")}
function drawCfg(){
  $("#lensEd").innerHTML=Object.keys(CAT).filter(k=>k!="W").map(k=>`<div class="row"><label><input type="checkbox" data-l="${k}" ${P.lenses[k].enabled?"checked":""}> ${k} ${CAT[k]}</label><input type="range" min="0" max="10" data-w="${k}" value="${P.lenses[k].weight}"><b>${P.lenses[k].weight}</b></div>`).join("");
  chips("#wl","watchlist_companies");chips("#bk","boost_keywords");chips("#ek","exclude_keywords");
  $("#rw").value=P.region_weight.taiwan;$("#rwv").textContent=`台灣 ${P.region_weight.taiwan}% / 全球 ${100-P.region_weight.taiwan}%`;
  $("#focus").value=P.extra_focus_today;$("#wc").value=P.wildcard_slots;
}
document.addEventListener("click",e=>{const b=e.target.closest("[data-k]");if(b){P[b.dataset.k].splice(+b.dataset.i,1);save();drawCfg()}});
$("#lensEd").oninput=e=>{const t=e.target;if(t.dataset.l)P.lenses[t.dataset.l].enabled=t.checked;if(t.dataset.w)P.lenses[t.dataset.w].weight=+t.value;save();drawCfg()};
[["wl","watchlist_companies"],["bk","boost_keywords"],["ek","exclude_keywords"]].forEach(([p,k])=>{
  const add=()=>{const v=$("#"+p+"In").value.trim();if(v&&!P[k].includes(v)){P[k].push(v);save();drawCfg()}$("#"+p+"In").value=""};
  $("#"+p+"Add").onclick=add;$("#"+p+"In").onkeydown=e=>{if(e.key=="Enter")add()}});
$("#rw").oninput=e=>{P.region_weight={taiwan:+e.target.value,global:100-e.target.value};save();drawCfg()};
$("#focus").oninput=e=>{P.extra_focus_today=e.target.value;save()};
$("#wc").oninput=e=>{P.wildcard_slots=Math.max(0,Math.min(10,+e.target.value||0));save()};
$("#reset").onclick=()=>{P=JSON.parse(JSON.stringify(DEF));save();drawCfg()};
$("#copy").onclick=async()=>{const s=JSON.stringify(P,null,1);$("#out").hidden=false;$("#out").value=s;$("#out").select();
  try{await navigator.clipboard.writeText(s);$("#cmsg").textContent="✅ 已複製,請貼給助理,將套用於明天的每日必讀"}catch{document.execCommand("copy");$("#cmsg").textContent="已選取內容,請手動複製 (Ctrl/Cmd+C)"}};
initBrief();initCfg();
