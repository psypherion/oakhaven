/* ═══ Release polish ════════════════════════════════════════════════════════
   Settings (volumes, text size, shake, visual intensity, HUD size, hints),
   audio buses with a score and an ambience bed, positional enemy sounds,
   combat feedback (hit markers, damage direction), glints on clues you haven't
   examined, a contextual tutorial, a transcript of every line, keyboard and
   pad navigation for the DOM screens, the content warning and credits. */

/* ── settings ──────────────────────────────────────────────────────────── */
const SETTINGS_KEY='oakhaven.settings.v1';
const SET_DEFAULT={vol:{master:.8,music:.55,amb:.7,fx:.85},textSize:1,shake:1,intensity:1,hud:.78,hints:true,warned:false,tut:{}};
(function loadSettings(){ let o={}; try{ o=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')||{}; }catch(e){}
  const d=JSON.parse(JSON.stringify(SET_DEFAULT)); Object.assign(d,o); d.vol=Object.assign({},SET_DEFAULT.vol,o.vol||{}); d.tut=Object.assign({},o.tut||{});
  Object.assign(S.settings,d); })();
function saveSettings(){ try{ const {vol,textSize,shake,intensity,hud,hints,warned,tut}=S.settings; localStorage.setItem(SETTINGS_KEY,JSON.stringify({vol,textSize,shake,intensity,hud,hints,warned,tut})); }catch(e){} }
function applyAudioSettings(){ if(!AU.ctx) return; const v=S.settings.vol, t=AU.ctx.currentTime;
  AU.master.gain.setTargetAtTime(.7*v.master,t,.05); AU.fx.gain.setTargetAtTime(v.fx,t,.05); AU.amb.gain.setTargetAtTime(v.amb,t,.05); AU.mus.gain.setTargetAtTime(v.music,t,.05); }
function applyTextSize(){ try{ document.documentElement.style.setProperty('--ts',String(S.settings.textSize)); }catch(e){} }
applyTextSize();

const elSettings=(()=>{ const d=document.createElement('div'); d.id='settings'; document.body&&document.body.appendChild&&document.body.appendChild(d); return d; })();
const SET_ROWS=[
  {h:'Sound'},
  {k:'vol.master',label:'Master volume',min:0,max:1,step:.05,pct:true},{k:'vol.music',label:'Music',min:0,max:1,step:.05,pct:true},
  {k:'vol.amb',label:'Ambience',min:0,max:1,step:.05,pct:true},{k:'vol.fx',label:'Effects',min:0,max:1,step:.05,pct:true},
  {h:'Reading'},
  {k:'textSize',label:'Text size',opts:[[.9,'Small'],[1,'Normal'],[1.2,'Large'],[1.45,'Larger']]},
  {k:'subs',label:'Subtitles',opts:[[true,'On'],[false,'Off']]},
  {k:'hints',label:'Tutorial hints',opts:[[true,'On'],[false,'Off']]},
  {h:'Comfort'},
  {k:'shake',label:'Screen shake',min:0,max:1,step:.05,pct:true},
  {k:'intensity',label:'Visual intensity',min:0,max:1,step:.05,pct:true,note:'Grain, colour tearing, glitches and lightning flashes. Lower it if flashing images bother you.'},
  {k:'hud',label:'HUD size',opts:[[.62,'Small'],[.78,'Medium'],[1,'Large']]},
];
const getK=k=>k.split('.').reduce((o,p)=>o[p],S.settings);
function setK(k,v){ const p=k.split('.'); let o=S.settings; while(p.length>1) o=o[p.shift()]; o[p[0]]=v; }
let SET_BACK=null;
function openSettings(back){
  SET_BACK=back||null; S.settingsOpen=true; document.exitPointerLock?.(); clearHeld();
  let h='<div class="st-box"><h1>Settings</h1><div class="st-sub">Saved in this browser. Controls and key bindings are on their own page.</div>';
  for(const r of SET_ROWS){
    if(r.h){ h+=`<h2>${r.h}</h2>`; continue; }
    const v=getK(r.k);
    h+=`<div class="st-row"><label>${r.label}</label>`;
    if(r.opts) h+='<div class="st-opts">'+r.opts.map(([val,n])=>`<button class="opt${v===val?' on':''}" data-k="${r.k}" data-v='${JSON.stringify(val)}'>${n}</button>`).join('')+'</div>';
    else h+=`<input type="range" data-k="${r.k}" min="${r.min}" max="${r.max}" step="${r.step}" value="${v}"><b>${Math.round(v*100)}%</b>`;
    h+='</div>'+(r.note?`<div class="st-note">${r.note}</div>`:'');
  }
  h+=`<div class="st-btns"><button class="opt" data-reset>Reset to defaults</button><button class="opt" data-ctrl>Controls…</button><button class="opt on" data-close>Done</button></div><div class="st-ver">Oakhaven ${BUILD}</div></div>`;
  elSettings.innerHTML=h; elSettings.classList.add('on');
  elSettings.querySelectorAll('input[type=range]').forEach(el=>el.oninput=()=>{ setK(el.dataset.k,+el.value); el.nextElementSibling.textContent=Math.round(el.value*100)+'%'; settingsChanged(); });
  elSettings.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{ setK(b.dataset.k,JSON.parse(b.dataset.v)); settingsChanged(); openSettings(SET_BACK); });
  const one=(s,f)=>{ const b=elSettings.querySelector(s); if(b) b.onclick=f; };
  one('[data-reset]',()=>{ const keep={warned:S.settings.warned,tut:S.settings.tut}; Object.assign(S.settings,JSON.parse(JSON.stringify(SET_DEFAULT)),keep,{subs:true}); settingsChanged(); openSettings(SET_BACK); });
  one('[data-ctrl]',()=>{ closeSettings(true); openControls(); });
  one('[data-close]',()=>closeSettings());
  elSettings.querySelector('[data-close]')?.focus?.();
}
function settingsChanged(){ saveSettings(); applyAudioSettings(); applyTextSize(); if(S.settings.vol.fx>0) sfx('switch'); }
function closeSettings(silent){ S.settingsOpen=false; elSettings.classList.remove('on'); const b=SET_BACK; SET_BACK=null; if(!silent&&b) b(); }

/* the pause menu gets Settings, between Load and Controls */
{ const was=openPause; openPause=function(){ was(); if(!dlg.open||!dlg.avail) return;
    const i=dlg.avail.findIndex(c=>c.text==='Controls'); if(i<0) return;
    dlg.avail.splice(i,0,{text:'Settings',act:()=>openSettings(openPause)}); renderChoices(dlg.avail.map(c=>({text:c.text,note:c.note,act:c.act||null}))); }; }

/* ── audio: score, ambience, position ─────────────────────────────────── */
const SCORE={on:false};
function startScore(){
  if(!AU.ctx||SCORE.on) return; SCORE.on=true; const c=AU.ctx;
  /* the drone: two detuned saws, low-passed, breathing with dread */
  SCORE.f=c.createBiquadFilter(); SCORE.f.type='lowpass'; SCORE.f.frequency.value=180; SCORE.f.Q.value=4;
  SCORE.g=c.createGain(); SCORE.g.gain.value=0; SCORE.f.connect(SCORE.g); SCORE.g.connect(AU.mus);
  SCORE.osc=[55,55.6,82.4].map((f,i)=>{ const o=c.createOscillator(); o.type=i===2?'triangle':'sawtooth'; o.frequency.value=f; o.connect(SCORE.f); o.start(); return o; });
  /* ambience: wind outside, a fluorescent hum inside, machinery in the mill */
  const nsrc=c.createBufferSource(); nsrc.buffer=AU.noise; nsrc.loop=true;
  SCORE.wf=c.createBiquadFilter(); SCORE.wf.type='lowpass'; SCORE.wf.frequency.value=380;
  SCORE.wg=c.createGain(); SCORE.wg.gain.value=0; nsrc.connect(SCORE.wf); SCORE.wf.connect(SCORE.wg); SCORE.wg.connect(AU.amb); nsrc.start();
  SCORE.hum=c.createOscillator(); SCORE.hum.type='sine'; SCORE.hum.frequency.value=60; SCORE.hg=c.createGain(); SCORE.hg.gain.value=0;
  SCORE.hum.connect(SCORE.hg); SCORE.hg.connect(AU.amb); SCORE.hum.start();
  SCORE.next=0;
}
function updateScore(dt){
  if(!AU.ctx||!SCORE.on) return; const c=AU.ctx, t=c.currentTime, s=S.sector||{}, dr=S.dread||0;
  const hunting=S.running&&s.entities?s.entities.some(e=>e.kind==='enemy'&&!e.dead&&e.state==='hunt'):false;
  const act=S.act||1, base=S.running?(.05+dr*.12+(hunting?.06:0)+(act>=3?.04:0)):.03;
  SCORE.g.gain.setTargetAtTime(base,t,.8); SCORE.f.frequency.setTargetAtTime(160+dr*500+(hunting?260:0),t,.6);
  const out=!!s.outdoor, mill=s.id==='mill'||s.id==='maint', cath=s.id==='cathedral';
  SCORE.wg.gain.setTargetAtTime(S.running?(out?.22:.05)*(1+dr*.6):0,t,.5);
  SCORE.hg.gain.setTargetAtTime(S.running&&!out?(mill?.05:cath?.0:.025):0,t,.5);
  SCORE.hum.frequency.setTargetAtTime(mill?47:cath?33:60,t,.5);
  /* phrases: a slow minor figure, more often as things get worse */
  SCORE.next-=dt;
  if(S.running&&SCORE.next<=0){ SCORE.next=(9-dr*5-(hunting?3:0))+Math.random()*4;
    const root=act>=3?98:110, sc=[0,3,7,10,12,15], n=2+(Math.random()*3|0);
    const prev=AU.dest; AU.dest=AU.mus;
    try{ for(let i=0;i<n;i++){ const st=sc[(Math.random()*sc.length)|0]; tn({f:root*Math.pow(2,st/12),dur:2.6,gain:.05+dr*.04,type:'triangle',att:.6,delay:i*.9}); }
      if(cath||dr>.6) tn({f:root/2,to:root/2*.97,dur:4,gain:.06,type:'sawtooth',att:1.4}); }catch(e){}
    AU.dest=prev; }
  if(cath){ const br=.5+.5*Math.sin(S.time*1.1); SCORE.wg.gain.setTargetAtTime(.04+br*.12,t,.3); SCORE.wf.frequency.setTargetAtTime(200+br*260,t,.3); }
  else SCORE.wf.frequency.setTargetAtTime(380,t,.5);
}
/* a sound at a place: quieter with distance, panned by bearing */
function sfxAt(n,x,y){
  if(!AU.ctx||!S.settings.sound){ return; }
  const c=AU.ctx, d=Math.hypot(x-S.px,y-S.py), rel=Math.atan2(y-S.py,x-S.px)-S.angle;
  const g=c.createGain(); g.gain.value=Math.max(.06,Math.min(1,1.6/(1+d*.35)));
  let node=g; if(c.createStereoPanner){ const p=c.createStereoPanner(); p.pan.value=Math.max(-1,Math.min(1,Math.sin(rel))); g.connect(p); p.connect(AU.fx); } else g.connect(AU.fx);
  const prev=AU.dest; AU.dest=node; try{ sfx(n); }finally{ AU.dest=prev; }
  setTimeout(()=>{ try{ g.disconnect(); }catch(e){} },6000);
}

/* ── things you can walk past: walkers and your brother step aside ───── */
{ const was=pushOut; pushOut=function(){
    for(const e of S.sector.entities){ if(e.dead||e.hidden||(e.kind!=='walker'&&e.kind!=='brother')) continue;
      const dx=S.px-e.x, dy=S.py-e.y, d=Math.hypot(dx,dy), m=(e.r||.3)+PR+.12;
      if(d<m&&d>1e-4&&Math.hypot(S.vx,S.vy)>.3){ e.kx=(e.kx||0)-dx/d*2.2; e.ky=(e.ky||0)-dy/d*2.2;
        if(e.kind==='walker'){ e.waitT=0; e.tx=undefined; } } }
    was(); }; }

/* ── a transcript of everything anyone said ───────────────────────────── */
S.transcript=[];
{ const was=say; say=function(who,text,dur,opt={}){ was(who,text,dur,opt);
    if(!text) return; const sp=SPEAKERS[who]||SPEAKERS.narr, nm=opt.name||sp.name||'';
    S.transcript.push({who,nm,text:String(text),place:S.sector?S.sector.name:'',act:S.act});
    if(S.transcript.length>400) S.transcript.splice(0,S.transcript.length-400); }; }

/* ── the tutorial: one hint at a time, when it matters, until you do it ── */
const TUT=[
  {id:'move',when:()=>S.running&&!S.cut&&S.time-(S.playStart||0)>3,text:()=>`${keyName('fwd')}${keyName('left')}${keyName('back')}${keyName('right')} to move · mouse to look · ${keyName('run')} to run`,done:()=>S.tutMoved>4},
  {id:'interact',when:()=>!!lookTarget(),text:()=>`${keyName('interact')} to talk, read, open and examine. Things you haven’t looked at yet glint.`,done:()=>S.tutInteract},
  {id:'journal',when:()=>S.notes.length>=2,text:()=>`${keyName('caseFile')} opens the journal. Connect two pieces of evidence to make a deduction.`,done:()=>S.tutJournal},
  {id:'fight',when:()=>S.sector.entities&&S.sector.entities.some(e=>e.kind==='enemy'&&!e.dead&&e.state==='hunt'),text:()=>`${keyName('fire')} to fire · when something flashes red it’s about to strike: step back. Salt and iron for ghosts.`,done:()=>S.tutFought},
  {id:'phone',when:()=>Object.keys(S.msgs||{}).length>0,text:()=>`${keyName('phone')} opens the phone. ${keyName('camera')} is the camera: it sees what you can’t.`,done:()=>S.phoneOpen||!!S.camMode},
  {id:'map',when:()=>S.time-(S.playStart||0)>90,text:()=>`${keyName('map')} opens the map. The pulsing marker is your objective; hollow diamonds are things nobody’s examined.`,done:()=>S.mapOpen},
  {id:'quick',when:()=>S.time-(S.playStart||0)>180,text:()=>`Hold ${keyName('quick')} for the quick wheel. ${keyName('pause')} pauses, with Settings inside.`,done:()=>!!S.wheel||!!S.menu},
];
let tutCur=null, tutT=0;
function updateTutorial(dt){
  if(!S.settings.hints||!S.running||S.cut){ tutCur=null; return; }
  const T=S.settings.tut;
  if(tutCur){ tutT+=dt; let d=false; try{ d=tutCur.done(); }catch(e){}
    if(d||tutT>28){ T[tutCur.id]=true; saveSettings(); tutCur=null; } return; }
  for(const h of TUT){ if(T[h.id]) continue; let w=false; try{ w=h.when(); }catch(e){} if(w){ tutCur=h; tutT=0; break; } }
}
function drawTutorial(){
  if(!tutCur||dlg.open||S.menu||S.caseOpen||S.phoneOpen) return;
  const W=over.width, H=over.height, u=H/200*Math.max(.8,S.settings.textSize); let s=''; try{ s=tutCur.text(); }catch(e){ return; }
  octx.save(); const fs=Math.round(5.6*u); octx.font=`${fs}px ${FONT}`; const maxW=W*.56, lines=[]; let ln='';
  for(const w of s.split(' ')){ const t=ln?ln+' '+w:w; if(octx.measureText(t).width>maxW&&ln){ lines.push(ln); ln=w; } else ln=t; } if(ln) lines.push(ln);
  const tw=Math.max(...lines.map(l=>octx.measureText(l).width))+18*u, th=lines.length*fs*1.35+6*u, y0=H*.12;
  octx.globalAlpha=Math.min(1,tutT*3); octx.fillStyle='rgba(6,8,10,.9)'; octx.fillRect(W/2-tw/2,y0,tw,th);
  octx.fillStyle='#d9a441'; octx.fillRect(W/2-tw/2,y0,2*u,th);
  lines.forEach((l,i)=>txt(l,W/2,y0+3*u+fs*.68+i*fs*1.35,fs,'#e8dcc4','center','middle')); octx.restore();
}
INV_UPDATES.push(dt=>{ if(Math.hypot(S.vx||0,S.vy||0)>.5) S.tutMoved=(S.tutMoved||0)+dt; });
{ const was=interact; interact=function(){ S.tutInteract=true; was(); }; }
{ const was=openJournal; openJournal=function(t){ S.tutJournal=true; was(t); }; }
{ const was=fire; fire=function(){ if(S.sector.entities.some(e=>e.kind==='enemy'&&e.state==='hunt'&&!e.dead)) S.tutFought=true; was(); }; }

/* ── glints: clues you haven't examined ───────────────────────────────── */
function unexamined(e){ if(e.dead||e.hidden) return false;
  if(e.read) return !S.flags['read_'+e.read];
  if(e.use) return !S.flags['seen_'+e.use]&&e.kind!=='vehicle';
  return false; }
/* mark use-targets as seen when used */
{ const tag=()=>{ for(const k of Object.keys(USES)){ const f=USES[k]; if(f.__tag) continue; const g=function(e){ S.flags['seen_'+k]=true; return f.apply(this,arguments); }; g.__tag=true; USES[k]=g; } };
  tag(); INV_UPDATES.push(()=>{ if(!S.flags.__tagT||S.time-S.flags.__tagT>5){ S.flags.__tagT=S.time; tag(); } }); }
function glintPos(e){
  const dx=e.x-S.px, dy=e.y-S.py, inv=1/(S.plX*S.dirY-S.dirX*S.plY), tx=inv*(S.dirY*dx-S.dirX*dy), ty=inv*(-S.plY*dx+S.plX*dy);
  if(ty<.2) return null; const hz=IH/2+S.pitch, k=IH/ty;
  const sx=(IW/2)*(1+tx/ty), ground=hz+k/2+(S.posZ||0)/ty-(e.z||0)*k, sy=ground-k*((e.h||.5)*.75/1.85);
  return {x:sx*over.width/IW, y:sy*over.height/IH};
}
function drawGlints(){
  if(S.camMode||S.driving||S.cut) return; const s=S.sector, t=S.time;
  for(const e of s.entities){ if(!unexamined(e)) continue; const d=Math.hypot(e.x-S.px,e.y-S.py); if(d>6.5||d<.4) continue;
    if(!los(s,S.px,S.py,e.x,e.y)) continue;
    const p=glintPos(e); if(!p) continue;
    const k=(.5+.5*Math.sin(t*4+e.x*3))*(1-d/6.5), r=(2+k*3)*over.height/400;
    octx.save(); octx.globalAlpha=.35+k*.6; octx.strokeStyle='#ffe8b0'; octx.lineWidth=Math.max(1,r*.35);
    octx.beginPath(); octx.moveTo(p.x-r*2,p.y); octx.lineTo(p.x+r*2,p.y); octx.moveTo(p.x,p.y-r*2); octx.lineTo(p.x,p.y+r*2); octx.stroke(); octx.restore(); }
}

/* ── combat feedback: hit markers and where it came from ───────────────── */
function drawCombatFeedback(){
  const W=over.width, H=over.height, u=H/200, cx=W/2, cy=H/2+S.pitch*(H/IH);
  if(S.hitMark>0){ const k=S.hitKill>0?1.6:1, g=3*u*k, l=3.4*u*k; octx.save(); octx.strokeStyle=S.hitKill>0?'#ff5040':'#f0e0d0'; octx.lineWidth=Math.max(1,u*.8); octx.globalAlpha=Math.min(1,S.hitMark*5);
    octx.beginPath(); for(const [sx,sy] of [[1,1],[1,-1],[-1,1],[-1,-1]]){ octx.moveTo(cx+sx*g,cy+sy*g); octx.lineTo(cx+sx*(g+l),cy+sy*(g+l)); } octx.stroke(); octx.restore(); }
  if(S.hurtDirT>0){ const rel=S.hurtDir-S.angle, a=Math.min(1,S.hurtDirT); octx.save(); octx.strokeStyle=`rgba(220,40,30,${(a*.85).toFixed(3)})`; octx.lineWidth=5*u;
    octx.beginPath(); octx.arc(cx,cy,34*u,rel-Math.PI/2-.35,rel-Math.PI/2+.35); octx.stroke(); octx.restore(); }
}

/* ── keyboard and pad navigation for the DOM screens ──────────────────── */
function navMove(root,code){
  const dir={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0],Pad12:[0,-1],Pad13:[0,1],Pad14:[-1,0],Pad15:[1,0]}[code];
  if(!dir||!root||!root.querySelectorAll) return false;
  const els=[...root.querySelectorAll('button,input')].filter(b=>b.offsetParent!==null&&!b.disabled); if(!els.length) return false;
  const cur=els.includes(document.activeElement)?document.activeElement:null;
  if(!cur){ els[0].focus(); return true; }
  const r=cur.getBoundingClientRect(), cx=r.left+r.width/2, cy=r.top+r.height/2;
  if(cur.tagName==='INPUT'&&dir[0]){ return false; }       // left/right moves a slider
  let best=null, bs=1e9;
  for(const b of els){ if(b===cur) continue; const q=b.getBoundingClientRect(), dx=q.left+q.width/2-cx, dy=q.top+q.height/2-cy;
    const along=dx*dir[0]+dy*dir[1]; if(along<=4) continue; const across=Math.abs(dx*dir[1])+Math.abs(dy*dir[0]); const sc=along+across*2.2; if(sc<bs){ bs=sc; best=b; } }
  if(best){ best.focus(); best.scrollIntoView?.({block:'nearest'}); } return true;
}
function navActivate(root){ const a=document.activeElement; if(a&&root&&root.contains&&root.contains(a)&&a.click){ a.click(); return true; } return false; }
function navRoot(){ if(S.settingsOpen) return elSettings; if(S.menu==='autopsy') return elAut; if(S.caseOpen) return elJournal; if(S.phoneOpen) return elPhone; return null; }
{ const was=inputDown; inputDown=function(code,e){
    const root=navRoot();
    if(root&&!CTRL.capture){
      if(S.settingsOpen&&(code==='Escape'||code==='Pad1')){ e?.preventDefault?.(); closeSettings(); return; }
      if(navMove(root,code)) return;
      if(code==='Pad0'&&navActivate(root)) return;
      if(S.settingsOpen) return;
    }
    was(code,e); }; }

/* ── content warning, credits ─────────────────────────────────────────── */
const elGate=(()=>{ const d=document.createElement('div'); d.id='gate'; document.body&&document.body.appendChild&&document.body.appendChild(d); return d; })();
function showWarning(then){
  elGate.innerHTML=`<div class="gt"><small>Before you go in</small><h1>Oakhaven</h1>
    <p>A horror game about a dying town. It contains:</p>
    <ul><li>supernatural and body horror, and blood</li><li>death, grief, and the death of a child</li><li>suicide (referred to, not shown)</li><li>possession, and the killing of possessed people</li><li>alcohol and drug use</li><li>workplace negligence and corporate harm</li><li>a cult, and the ritual murder of children and women (recorded in documents, never shown)</li><li>domestic abuse (spoken about, and confronted)</li><li>flashing images, screen shake and colour tearing (all adjustable in Settings)</li></ul>
    <p class="fan">If any of this touches your own life, help is there. US: National Domestic Violence Hotline 1-800-799-7233. India: Women Helpline 181, Childline 1098. UK: Refuge 0808 2000 247.</p>
    <p class="fan">Oakhaven is a free, non-commercial fan work. It isn't affiliated with or endorsed by the owners of <i>Supernatural</i>.</p>
    <div class="gb"><button class="opt" data-set>Settings first</button><button class="opt on" data-go>I understand — continue</button></div></div>`;
  elGate.classList.add('on');
  elGate.querySelector('[data-go]').onclick=()=>{ S.settings.warned=true; saveSettings(); elGate.classList.remove('on'); then&&then(); };
  elGate.querySelector('[data-set]').onclick=()=>openSettings(()=>{});
  elGate.querySelector('[data-go]').focus?.();
}
function showCredits(){
  elGate.innerHTML=`<div class="gt cr"><small>Oakhaven ${BUILD}</small><h1>Credits</h1>
    <p><b>Design, writing, code, pixel art and sound:</b> made for this fan project. Everything you see and hear is drawn and synthesised in the browser at runtime: there are no image, audio or font files. Two-player campaigns use PeerJS (MIT licence, peerjs.com).</p>
    <p><b>Characters</b> Dean and Sam Winchester, Castiel, Crowley, Chuck Shurley, Kevin Tran and Juno are from <i>Supernatural</i> (Kripke Enterprises, Wonderland Sound and Vision, Warner Bros. Television). They are used here non-commercially, as a fan work. Every other character, place and case is original to Oakhaven.</p>
    <p><b>Fonts</b> are your system’s monospace and serif fonts.</p>
    <p><b>Touchstones:</b> <i>Fatal Frame</i>, <i>P.T.</i>, <i>Silent Hill</i>, <i>Visage</i>, <i>Doki Doki Literature Club</i>, <i>Inscryption</i>, <i>Mouthwashing</i>, and <i>Doom</i> for the renderer.</p>
    <p><b>Licence:</b> the original code and writing are offered for non-commercial sharing. The <i>Supernatural</i> characters belong to their owners, and this build must not be sold.</p>
    <div class="gb"><button class="opt on" data-x>Close</button></div></div>`;
  elGate.classList.add('on'); elGate.querySelector('[data-x]').onclick=()=>elGate.classList.remove('on');
}
/* boot screen: Settings and Credits buttons, the warning on first launch, a notice after a failed load */
(function bootExtras(){
  const row=document.getElementById('openCtrl'); if(row&&row.parentNode&&row.parentNode.appendChild){
    const b=document.createElement('button'); b.className='opt'; b.textContent='Settings…'; b.onclick=()=>openSettings(); row.parentNode.appendChild(b);
    const c=document.createElement('button'); c.className='opt'; c.textContent='Credits'; c.onclick=showCredits; row.parentNode.appendChild(c); }
  let fail=null; try{ fail=sessionStorage.getItem('oakhaven.loadfail'); sessionStorage.removeItem('oakhaven.loadfail'); }catch(e){}
  if(fail) setTimeout(()=>{ try{ toast('That save couldn’t be loaded. It has been left untouched.'); }catch(e){} },600);
  if(!S.settings.warned) setTimeout(()=>{ if(!S.running) showWarning(); },50);
})();

/* ── per-frame ────────────────────────────────────────────────────────── */
function updatePolish(rdt){
  S.hitMark=Math.max(0,(S.hitMark||0)-rdt); S.hitKill=Math.max(0,(S.hitKill||0)-rdt); S.hurtDirT=Math.max(0,(S.hurtDirT||0)-rdt);
  S.chantStag=Math.max(0,(S.chantStag||0)-rdt);
  updateScore(rdt); updateTutorial(rdt);
}
