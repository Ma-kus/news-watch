const $=s=>document.querySelector(s);
let cfg,doc,st={q:"",lang:"all",cat:"all",topic:"all"};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fj=async u=>{const r=await fetch(u+"?t="+Date.now());if(!r.ok)throw 0;return r.json()};
async function init(){
  cfg=await fj("config/topics.json");
  let idx=[];try{idx=await fj("data/archive/index.json")}catch{}
  const sel=$("#date");sel.innerHTML='<option value="">今日 (最新)</option>'+idx.slice().reverse().map(d=>`<option>${d}</option>`).join("");
  sel.onchange=load;await load();
}
async function load(){
  const d=$("#date").value;
  try{doc=await fj(d?`data/archive/${d}.json`:"data/news.json")}catch{doc={items:[],count:0}}
  render();
}
function topicMap(){const m={};cfg.categories.forEach(c=>c.topics.forEach(t=>m[t.id]={...t,cat:c.id,catName:c.name}));return m}
function render(){
  const tm=topicMap();
  const base=doc.items.filter(i=>(st.lang=="all"||i.lang==st.lang)&&(!st.q||(i.title+i.source).toLowerCase().includes(st.q.toLowerCase())));
  const cnt={},ccnt={};
  base.forEach(i=>{i.topics.forEach(t=>{if(tm[t])cnt[t]=(cnt[t]||0)+1});(i.categories||[]).forEach(c=>ccnt[c]=(ccnt[c]||0)+1)});
  $("#meta").textContent=`${doc.date||""} ・ 共 ${doc.count} 則 ・ 顯示 ${base.length} 則 ・ 更新於 ${doc.generated_at?new Date(doc.generated_at).toLocaleString("zh-TW",{timeZone:"Asia/Taipei"}):"—"}`;
  const chip=(on,l,a)=>`<button class="chip ${on?"on":""}" ${a}>${l}</button>`;
  $("#cats").innerHTML=chip(st.cat=="all","全部分類",'data-c="all"')+cfg.categories.map(c=>chip(st.cat==c.id,`${esc(c.name)} <small>${ccnt[c.id]||0}</small>`,`data-c="${c.id}"`)).join("");
  const ts=Object.values(tm).filter(t=>st.cat=="all"||t.cat==st.cat);
  $("#chips").innerHTML=chip(st.topic=="all","全部主題",'data-t="all"')+ts.map(t=>chip(st.topic==t.id,`${esc(t.name)} <small>${cnt[t.id]||0}</small>`,`data-t="${t.id}"`)).join("");
  let h="";
  for(const c of cfg.categories){if(st.cat!="all"&&st.cat!=c.id)continue;
    for(const t of c.topics){if(st.topic!="all"&&st.topic!=t.id)continue;
      const its=base.filter(i=>i.topics.includes(t.id));if(!its.length)continue;
      h+=`<section><h2>${esc(t.name)} <small>${esc(c.name)} ・ ${its.length}</small></h2>`+its.map(i=>`<div class="item"><a href="${esc(i.link)}" target="_blank" rel="noopener">${esc(i.title)}</a><div class="sub">${esc(i.source)} ・ ${new Date(i.published).toLocaleString("zh-TW",{timeZone:"Asia/Taipei",hour12:false})} ・ ${i.lang=="zh"?"中":"EN"}${i.topics.filter(x=>x!=t.id&&tm[x]).map(x=>`<span class="tag">${esc(tm[x].name)}</span>`).join("")}</div></div>`).join("")+"</section>";
    }}
  $("#list").innerHTML=h||'<div class="empty">沒有符合的新聞</div>';
}
$("#q").oninput=e=>{st.q=e.target.value;render()};
$("#lang").onclick=e=>{const l=e.target.dataset.l;if(!l)return;st.lang=l;document.querySelectorAll("#lang button").forEach(b=>b.classList.toggle("on",b.dataset.l==l));render()};
$("#cats").onclick=e=>{const b=e.target.closest("[data-c]");if(b){st.cat=b.dataset.c;st.topic="all";render()}};
$("#chips").onclick=e=>{const b=e.target.closest("[data-t]");if(b){st.topic=b.dataset.t;render()}};
// settings
const L=s=>s.split(/[,，]/).map(x=>x.trim()).filter(Boolean);
function edit(){
  $("#ed").innerHTML=cfg.categories.map((c,ci)=>`<div class="cat" data-ci="${ci}"><div class="row"><input class="cn" value="${esc(c.name)}"><button data-act="dc">刪分類</button></div>`+
   `<div class="t"><b>主題名稱</b><b>中文關鍵字</b><b>English keywords</b><span></span></div>`+
   c.topics.map(t=>`<div class="t" data-id="${esc(t.id)}"><input class="tn" value="${esc(t.name)}"><input class="tz" value="${esc(t.zh.join(", "))}"><input class="te" value="${esc(t.en.join(", "))}"><button data-act="dt">✕</button></div>`).join("")+
   `<button data-act="at">+ 新主題</button></div>`).join("");
}
function collectCfg(){
  const o={...cfg,categories:[]};
  document.querySelectorAll("#ed .cat").forEach((el,i)=>{
    const old=cfg.categories[i]||{};const c={id:old.id||"c"+Date.now()+i,name:el.querySelector(".cn").value,topics:[]};
    el.querySelectorAll(".t[data-id]").forEach((r,j)=>c.topics.push({id:r.dataset.id,name:r.querySelector(".tn").value,zh:L(r.querySelector(".tz").value),en:L(r.querySelector(".te").value)}));
    o.categories.push(c)});
  o.updated=new Date().toISOString();return o;
}
$("#cfgBtn").onclick=()=>{edit();$("#msg").textContent="";$("#dlg").showModal()};
$("#close").onclick=()=>$("#dlg").close();
$("#ed").onclick=e=>{const a=e.target.dataset.act;if(!a)return;cfg=collectCfg();const ci=+e.target.closest(".cat").dataset.ci;
  if(a=="dc")cfg.categories.splice(ci,1);
  if(a=="at")cfg.categories[ci].topics.push({id:"t"+Date.now(),name:"新主題",zh:[],en:[]});
  if(a=="dt"){const j=[...e.target.closest(".cat").querySelectorAll(".t[data-id]")].indexOf(e.target.closest(".t"));cfg.categories[ci].topics.splice(j,1)}
  edit()};
$("#addCat").onclick=()=>{cfg=collectCfg();cfg.categories.push({id:"c"+Date.now(),name:"新分類",topics:[]});edit()};
$("#dl").onclick=()=>{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(collectCfg(),null,1)],{type:"application/json"}));a.download="topics.json";a.click()};
$("#save").onclick=async()=>{cfg=collectCfg();try{const r=await fetch("/api/topics",{method:"POST",body:JSON.stringify(cfg)});if(!r.ok)throw 0;$("#msg").textContent="✅ 已儲存。執行 collect.py 後新關鍵字生效。";render()}catch{$("#msg").textContent="ℹ️ 在 GitHub Pages 上無法儲存設定。請編輯儲存庫中的 config/topics.json(可先按「下載 JSON」取得修改後內容)。"}};
init();
