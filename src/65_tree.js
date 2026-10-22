/* ═══ The story tree ═══════════════════════════════════════════════════════
   Every act, case, crossing, other place and ending as one branching map.
   Solid lines are the order things happen in; dashed lines are threads that
   tie one story to another (a daughter, a seal, a phone number, an hour).
   Pick any point and play from there in single-player: the game starts a
   fresh run, fills in sensible defaults for everything before that point,
   and puts you where the story is. Places you've been are lit; places from
   acts you haven't reached are veiled unless you ask to see everything. */

const TREE_KEY='oakhaven.tree.v1';
function treeSeen(){ try{ return JSON.parse(localStorage.getItem(TREE_KEY)||'{}')||{}; }catch(e){ return {}; } }
function treeMark(id){ const s=treeSeen(); if(s[id]) return; s[id]=Date.now(); try{ localStorage.setItem(TREE_KEY,JSON.stringify(s)); }catch(e){} }
const tAt=(sec,x,y,a=-Math.PI/2)=>()=>{ enterSector(sec,x,y,a); if(COMP){ COMP.hidden=false; COMP.x=x+.6; COMP.y=y+.4; } };
const tLead=(flag,msgT)=>()=>{ S.flags[flag]=true; if(msgT) toast(msgT); };
const tSeq=(...f)=>()=>{ for(const g of f) g(); };
/* kind: act | case | side | choice | place | end | heir */
const TREE=[
  {id:'arrive',act:1,kind:'act',x:70,y:380,t:'Arrival',k:'2:40 a.m., in the rain',d:'Two brothers, a black Impala and a town with every window dark but one.',seen:()=>true},
  {id:'mill',act:1,kind:'case',x:210,y:300,from:['arrive'],t:'The Green Chain',k:'Act I · Case 1',d:'Six men from one shift, and a ghost still filing a form.',seen:F=>F.millEntered,
    go:tSeq(()=>Object.assign(S.flags,{marla:true,earl:true}),tAt('mill',14,19))},
  {id:'shift',act:1,kind:'case',x:330,y:230,from:['mill'],t:'The Last Shift',k:'Act I · Case 2',d:'A supervisor dead in a room locked from the inside.',seen:F=>F.dw_body||F.read_inspect,
    go:tSeq(()=>Object.assign(S.flags,{marla:true,earl:true,read_inspect:true}),tAt('mill',14,19))},
  {id:'radio',act:1,kind:'side',x:260,y:470,from:['arrive'],t:'The Dead Man on the Radio',k:'Optional',d:'Dispatch takes calls from people who haven’t died yet.',seen:F=>F.radio_lead,
    go:tSeq(()=>Object.assign(S.flags,{marla:true,earl:true,radio_lead:true}),tAt('station',6.5,7.4))},
  {id:'bell',act:1,kind:'side',x:220,y:580,from:['arrive'],t:'The Bell Beneath the Water',k:'Optional',d:'A drowned chapel bell rings once for each death to come.',seen:F=>F.bell_lead,
    go:tSeq(()=>Object.assign(S.flags,{marla:true,bell_lead:true}),tAt('reservoir',20,24.6))},
  {id:'drowned',act:1,kind:'place',x:350,y:640,from:['bell'],t:'1951 · The Drowned Year',k:'Another place',d:'The valley before the water came, and what was done there.',seen:F=>F.dim_drowned_seen,
    go:tSeq(()=>Object.assign(S.flags,{marla:true,bell_lead:true}),tAt('reservoir',23,17),()=>enterDim('drowned'))},
  {id:'act2',act:2,kind:'act',x:470,y:380,from:['mill','shift'],t:'Act II · The Lockdown',k:'The fog comes in',d:'The lamps die. Something has sealed the town.',seen:F=>S.act>=2,go:()=>{}},
  {id:'delia',act:2,kind:'choice',x:590,y:290,from:['act2'],t:'Delia in the bus shelter',k:'Save her, or not',d:'A teacher with something else in the driver’s seat. She can hear everything you say.',seen:F=>F.delia_done},
  {id:'kevin',act:2,kind:'choice',x:690,y:400,from:['delia'],t:'Kevin on Bellweather',k:'Use him, or let him rest',d:'A prophet chained to a tablet, nine days into reading it aloud.',seen:F=>F.kevin_done,
    go:()=>{ freeDelia(); Object.assign(S.flags,{delia_done:true}); S.obj=objIndex('bellweather'); tAt('street',4.4,8.8,-1.75)(); }},
  {id:'crowley',act:2,kind:'choice',x:800,y:310,from:['kevin'],t:'Crowley at the car',k:'The King of the Crossroads',d:'Who bought the mill, and who it was bought for.',seen:F=>F.crowley_done,
    go:()=>{ freeDelia(); Object.assign(S.flags,{delia_done:true,trap_entered:true,kevin_done:true,kevin_rested:true,harvest:true,kevin_checked:true});
      for(const e of SECTORS.trap.entities) if(e.guard) e.dead=true; moveKevin(); S.obj=objIndex('crowley'); tAt('street',28.2,37.4)(); }},
  {id:'road',act:2,kind:'side',x:520,y:540,from:['act2'],t:'The Road That Returns',k:'Optional',d:'Route 9 brings you back.',seen:F=>F.road_lead,go:tSeq(tLead('road_lead'),tAt('route9',5,61.5))},
  {id:'agnes',act:2,kind:'side',x:610,y:620,from:['act2'],t:'The House With One More Room',k:'Optional',d:'114 Larch Street, and a nursery.',seen:F=>F.agnes_lead,go:tSeq(tLead('agnes_lead'),tAt('larch',7.6,10.6,0))},
  {id:'reed',act:2,kind:'side',x:700,y:700,from:['agnes'],t:'The Man Who Came Back Wrong',k:'Optional',d:'Glenn Reed walked out of the fog and ordered his usual.',seen:F=>F.reed_lead,go:tSeq(tLead('reed_lead'),tAt('larch',7.6,10.6,0))},
  {id:'inventory',act:2,kind:'side',x:790,y:540,from:['kevin'],t:'The Inventory of Things That Never Existed',k:'Optional',d:'Price tags on Earl’s step for forty years.',seen:F=>F.iv_lead,
    go:tSeq(()=>Object.assign(S.flags,{delia_done:true,kevin_done:true}),tLead('iv_lead','Lead: Earl’s pawnshop'),tAt('pawn',8,9.6))},
  {id:'contract',act:2,kind:'side',x:880,y:450,from:['crowley'],t:'The Contract Nobody Signed',k:'Optional',d:'Receipts that list memories.',seen:F=>F.ct_lead,
    go:tSeq(()=>Object.assign(S.flags,{delia_done:true}),tLead('ct_lead'),tAt('naomi',5.6,3.5,Math.PI))},
  {id:'saint',act:2,kind:'side',x:880,y:210,from:['crowley'],t:'The Saint in the Walls',k:'Optional',d:'St. Jude’s, out past the mill road.',seen:F=>F.sj_lead,go:tSeq(tLead('sj_lead'),tAt('stjude',11,15.6))},
  {id:'sky',act:2,kind:'side',x:740,y:120,from:['delia'],t:'The Children Who Draw the Same Sky',k:'Optional',d:'Twelve children, one drawing.',seen:F=>F.cs_lead,go:tSeq(tLead('cs_lead'),tAt('school',12,15.6))},
  {id:'ash',act:2,kind:'place',x:540,y:200,from:['delia'],t:'2031 · The Ash',k:'Another place',d:'The town, later. Two graves and a rusted car.',seen:F=>F.dim_ash_seen,go:()=>enterDim('ash')},
  {id:'act3',act:3,kind:'act',x:980,y:380,from:['crowley'],t:'Act III · The Absentee Landlord',k:'The sky tears',d:'An angel falls into the motel lot.',seen:F=>S.act>=3,go:()=>{}},
  {id:'lily',act:3,kind:'case',x:1090,y:290,from:['act3'],t:'The Seventh',k:'Act III · Case 6',d:'A girl in a nightgown, facing away, and a door you’ve opened before.',seen:F=>F.lily_done||F.followed,
    go:()=>{ Object.assign(S.flags,{cas_met:true,followed:true}); S.obj=objIndex('follow'); tAt('street',13.5,19,-Math.PI/2)(); }},
  {id:'clinic',act:3,kind:'side',x:1060,y:540,from:['act3'],t:'The Patient Who Died Tomorrow',k:'Optional',d:'A chart for a man who dies at 2:40 tomorrow.',seen:F=>F.clinic_lead,go:tSeq(tLead('clinic_lead'),tAt('clinic_lot',8.5,6.4))},
  {id:'alistair',act:3,kind:'choice',x:1180,y:420,from:['lily'],t:'Father Alistair’s sermon',k:'St. Brendan’s',d:'A gentle man, sorry about something.',seen:F=>F.alistair_met,
    go:()=>{ Object.assign(S.flags,{cas_met:true,followed:true,lily_done:true,lily_rested:true}); try{ lilyGone(); }catch(e){} S.obj=objIndex('church'); tAt('street',50.6,24)(); }},
  {id:'chuck',act:3,kind:'choice',x:1270,y:300,from:['alistair'],t:'Shurley’s',k:'A man in a bathrobe',d:'Craft beer, and a habit of finishing your sentences.',seen:F=>F.chuck_met,
    go:()=>{ Object.assign(S.flags,{cas_met:true,followed:true,lily_done:true,lily_rested:true,church_in:true,alistair_met:true,alistair_heard:true}); try{ lilyGone(); }catch(e){} S.obj=objIndex('bar'); tAt('street',40.5,16.7)(); }},
  {id:'nave',act:3,kind:'place',x:1180,y:620,from:['clinic'],t:'The Inverted Nave',k:'Another place',d:'A cathedral where the floor is the ceiling, and a choir.',seen:F=>F.dim_nave_seen,go:()=>enterDim('nave')},
  {id:'act4',act:4,kind:'act',x:1380,y:380,from:['chuck'],t:'Act IV · Breaking the Script',k:'Gather what’s left',d:'The people you helped come back with something to give.',seen:F=>S.act>=4,go:()=>{}},
  {id:'broadcast',act:4,kind:'side',x:1450,y:560,from:['act4'],t:'The Last Broadcast',k:'Optional',d:'Channel 4 is showing the two of you, right now.',seen:F=>F.kb_lead,go:tSeq(tLead('kb_lead'),tAt('koak_lot',8,9.6))},
  {id:'cathedral',act:4,kind:'case',x:1500,y:290,from:['act4'],t:'Into St. Brendan’s',k:'It’s breathing',d:'Halls that fold, and gravity with opinions.',seen:F=>F.cath_in,
    go:()=>{ S.flags.cas_open=true; S.obj=objIndex('cathedral'); tAt('cathedral',12.5,30)(); }},
  {id:'altar',act:4,kind:'choice',x:1610,y:380,from:['cathedral'],t:'Twenty to Three',k:'The altar',d:'Somebody is waiting with popcorn. Somebody else is waiting behind him.',seen:F=>!!F.ending||F.altar_talk,
    go:()=>{ S.flags.cas_open=true; tAt('cathedral',12.5,9.4)(); try{ resolveAlistair(false); }catch(e){} }},
  {id:'endA',act:4,kind:'end',x:1740,y:180,from:['altar'],t:'A · The burning',k:'Ending',end:'A'},
  {id:'endB',act:4,kind:'end',x:1760,y:250,from:['altar'],t:'B · The martyr',k:'Ending',end:'B'},
  {id:'endC',act:4,kind:'end',x:1770,y:320,from:['altar'],t:'C · Walking away',k:'Ending',end:'C'},
  {id:'endD',act:4,kind:'end',x:1770,y:390,from:['altar'],t:'D · sys.exit()',k:'Ending',end:'D'},
  {id:'endE',act:4,kind:'end',x:1760,y:460,from:['altar'],t:'E · Liberation',k:'Ending',end:'E'},
  {id:'endF',act:4,kind:'end',x:1745,y:530,from:['altar'],t:'F · Equilibrium',k:'Ending',end:'F'},
  {id:'endG',act:4,kind:'end',x:1725,y:600,from:['altar'],t:'G · Unfinished Sunday',k:'Ending',end:'G'},
  {id:'heir',act:4,kind:'heir',x:1880,y:390,from:['endA','endB','endC','endD','endE','endF','endG'],t:'The one who comes next',k:'After the end',d:'What the Formless One becomes, decided by how you played.'},
];
/* the threads between stories */
const TREE_LINKS=[['mill','lily','Ray Hollis’s daughter'],['bell','crowley','the crossroads seal, 1951'],['radio','clinic','called before they died'],
  ['shift','altar','twenty to three'],['kevin','endD','the prophet’s hands'],['delia','act4','the ones you helped'],['agnes','reed','Larch Street'],
  ['crowley','contract','Crossroads Holdings'],['bell','drowned','the drowned chapel'],['ash','kevin','what Kevin becomes'],['lily','arrive','the text from 0114'],
  ['saint','alistair','the parish'],['sky','nave','the same sky'],['clinic','altar','2:40, on a chart']];
const TN=Object.fromEntries(TREE.map(n=>[n.id,n]));
/* note what this run has touched */
INV_UPDATES.push(()=>{ if(typeof COOP!=='undefined'&&COOP.on) return; const F=S.flags; TREE_T.t=(TREE_T.t||0)+1; if(TREE_T.t%30) return;
  for(const n of TREE) if(n.seen&&!TREE_T.seen[n.id]){ let s=false; try{ s=!!n.seen(F); }catch(e){} if(s){ TREE_T.seen[n.id]=1; treeMark(n.id); } } });
const TREE_T={t:0,seen:{}};
{ const was=recordEnding; recordEnding=function(k){ was(k); treeMark('end'+k); }; }

/* ── the page ──────────────────────────────────────────────────────────── */
const TV={open:false,sel:null,all:false,hero:'dean',back:null};
const elTree=(()=>{ const d=document.createElement('div'); d.id='tree'; document.body&&document.body.appendChild&&document.body.appendChild(d); return d; })();
function treeReached(){ try{ return loadProgress(); }catch(e){ return {act:1,endings:[]}; } }
function treeNodeSeen(n,seen,prog){ if(n.end) return prog.endings.includes(n.end); if(n.kind==='heir') return !!(typeof heirLoad==='function'&&heirLoad()); return !!seen[n.id]||(n.kind==='act'&&prog.act>=n.act); }
function openTree(back){ TV.open=true; TV.back=back||null; if(S.running){ document.exitPointerLock?.(); clearHeld(); S.caseOpen=true; } elTree.classList.add('on'); renderTree(); }
function closeTree(){ TV.open=false; elTree.classList.remove('on'); if(S.running) S.caseOpen=false; const b=TV.back; TV.back=null; if(b) b(); }
function renderTree(){
  const seen=treeSeen(), prog=treeReached(), veil=n=>!TV.all&&n.act>prog.act&&!treeNodeSeen(n,seen,prog);
  const W=1960, H=760, col={act:'#d9a441',case:'#cbbfae',side:'#7fa6d6',choice:'#c07440',place:'#9a7fd6',end:'#b83a3a',heir:'#e7e3d8'};
  let svg=`<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">`;
  svg+=[['Act I',30,400],['Act II',440,920],['Act III',950,1340],['Act IV',1350,1940]].map(([l,a,b],i)=>`<rect x="${a}" y="20" width="${b-a}" height="${H-40}" fill="${i%2?'#0b0f12':'#090c0e'}" rx="6"/><text x="${a+12}" y="44" class="ta">${l}</text>`).join('');
  const curve=(a,b)=>{ const mx=(a.x+b.x)/2; return `M${a.x},${a.y} C${mx},${a.y} ${mx},${b.y} ${b.x},${b.y}`; };
  for(const [a,b,why] of TREE_LINKS){ const A=TN[a], B=TN[b]; if(!A||!B||veil(A)||veil(B)) continue;
    const mx=(A.x+B.x)/2, my=Math.min(A.y,B.y)-80;
    svg+=`<path d="M${A.x},${A.y} Q${mx},${my} ${B.x},${B.y}" class="tl"><title>${esc_(why)}</title></path>`; }
  for(const n of TREE) for(const p of n.from||[]){ const a=TN[p]; if(!a) continue; const lit=treeNodeSeen(a,seen,prog)&&treeNodeSeen(n,seen,prog);
    svg+=`<path d="${curve(a,n)}" class="te${lit?' lit':''}"/>`; }
  for(const n of TREE){ const v=veil(n), s=treeNodeSeen(n,seen,prog), r=n.kind==='act'?13:n.kind==='end'||n.kind==='heir'?9:10, c=col[n.kind];
    svg+=`<g class="tn${s?' seen':''}${TV.sel===n.id?' sel':''}${v?' veil':''}" data-tn="${n.id}" transform="translate(${n.x},${n.y})">`
      +(n.kind==='choice'?`<rect x="-${r}" y="-${r}" width="${r*2}" height="${r*2}" transform="rotate(45)" fill="${s?c:'#0d1114'}" stroke="${c}"/>`:`<circle r="${r}" fill="${s?c:'#0d1114'}" stroke="${c}" stroke-width="${n.kind==='heir'?3:1.5}"/>`)
      +`<text y="${n.y>H/2?r+16:-r-8}" text-anchor="middle" class="tt">${esc_(v?'· · ·':n.t)}</text></g>`; }
  svg+='</svg>';
  const n=TN[TV.sel], v=n&&veil(n);
  let side='';
  if(n){ const heir=n.kind==='heir'&&typeof heirLoad==='function'?heirLoad():null;
    side=`<small>${esc_(n.k||'')}</small><h3>${esc_(v?'Not yet':n.t)}</h3><p>${esc_(v?'You haven’t reached this part of the story. You can still go there.':n.end?(prog.endings.includes(n.end)?'You’ve seen this ending.':'You haven’t seen this ending yet. Every ending is open at the altar.'):n.kind==='heir'?(heir?`${heir.name}, ${heir.age}. ${heir.line}`:'Finish the story once and you’ll meet him.'):n.d||'')}</p>`
      +(n.kind==='heir'?(heir?'<button class="opt on" data-their>Meet him</button>':''):`<button class="opt on" data-tgo>${n.end?'Go to the altar':'Play from here'}</button>`)
      +(n.kind!=='heir'?`<div class="tv-hero">as <button class="opt${TV.hero==='dean'?' on':''}" data-th="dean">${esc_(heroLabel('dean'))}</button><button class="opt${TV.hero==='sam'?' on':''}" data-th="sam">${esc_(heroLabel('sam'))}</button></div>`:'')
      +'<p class="tv-note">Starts a new single-player run from this point. Anything earlier is filled in with sensible defaults.</p>'; }
  else side='<h3>The story tree</h3><p>Every act, case, other place and ending, and the threads that tie them together. Lit points are where you’ve been. Pick any point to read about it or play from it.</p><div class="tv-key"><span class="k act">act</span><span class="k case">case</span><span class="k side">optional case</span><span class="k choice">turning point</span><span class="k place">another place</span><span class="k end">ending</span><span class="k lk">thread</span></div>';
  elTree.innerHTML=`<div class="tv-top"><h1>The story</h1><div><label class="tv-all"><input type="checkbox" data-tall${TV.all?' checked':''}> show everything</label><button class="opt" data-tx>Close · Esc</button></div></div>`
    +`<div class="tv-body"><div class="tv-map">${svg}</div><div class="tv-side">${side}</div></div>`;
  (elTree.querySelectorAll('[data-tn]')||[]).forEach(g=>g.onclick=()=>{ TV.sel=g.dataset.tn; renderTree(); });
  const one=(s,f)=>{ const b=elTree.querySelector(s); if(b) b.onclick=f; };
  one('[data-tx]',()=>closeTree()); one('[data-tgo]',()=>treeJump(TV.sel)); one('[data-their]',()=>{ closeTree(); openHeir(); });
  (elTree.querySelectorAll('[data-th]')||[]).forEach(b=>b.onclick=()=>{ TV.hero=b.dataset.th; renderTree(); });
  const cb=elTree.querySelector('[data-tall]'); if(cb) cb.onchange=()=>{ TV.all=!!cb.checked; renderTree(); };
}
/* ── jumping in ────────────────────────────────────────────────────────── */
function treeJump(id){ const n=TN[id]; if(!n) return;
  const target=n.end?'altar':id;
  if(S.running){ try{ sessionStorage.setItem('oakhaven.jump',JSON.stringify({id:target,hero:TV.hero})); }catch(e){} location.reload(); return; }
  closeTree(); const go=()=>treeStart(target,TV.hero);
  try{ if(S.settings&&!S.settings.warned&&typeof showWarning==='function'){ showWarning(go); return; } }catch(e){}
  go(); }
function treeStart(id,hero){ const n=TN[id]; if(!n) return false;
  BOOT.startAct=n.act; begin(hero||'dean');
  if(S.cut) skipCutscene(); S.cardQ.length=0; S.card=null;
  try{ if(n.go) n.go(); }catch(e){ console.error('tree jump',id,e); }
  if(n.act===1&&n.go) Object.assign(S.flags,{ch1:true});
  showCard(n.k||'',n.t,'You start here',{dur:4.5}); treeMark(id); requestAutosave(); return true; }
(function treeBoot(){ let j=null; try{ j=JSON.parse(sessionStorage.getItem('oakhaven.jump')||'null'); sessionStorage.removeItem('oakhaven.jump'); }catch(e){} if(!j||!TN[j.id]) return;
  TV.hero=j.hero||'dean'; setTimeout(()=>treeStart(j.id,TV.hero),50); })();
{ const was=inputDown; inputDown=function(code,e){ if(TV.open){ if(code==='Escape'||code==='Pad1') closeTree(); return; } return was(code,e); }; }
/* on the title screen, beside Characters and Plot; and on the pause menu */
(function treeButton(){ const row=document.getElementById('codexRow'); if(!row||!row.appendChild) return; const b=document.createElement('button'); b.className='opt'; b.textContent='Story tree'; b.onclick=()=>openTree(); row.appendChild(b); })();
{ const was=openPause; openPause=function(){ was(); if(!dlg.open||!dlg.avail||(typeof COOP!=='undefined'&&COOP.on)) return;
    const i=dlg.avail.findIndex(c=>c.text==='Characters'); if(i<0) return;
    dlg.avail.splice(i,0,{text:'Story tree',note:'jump anywhere',act:()=>{ closeDlg(); openTree(openPause); }});
    renderChoices(dlg.avail.map(c=>({text:c.text,note:c.note,act:c.act||null}))); }; }
