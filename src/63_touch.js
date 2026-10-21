/* ═══ Phones and tablets: landscape touch play ═════════════════════════════
   On a touch screen (or with Settings → Touch → On) the game fills the
   screen sideways and draws its own controls:

     left thumb    a floating stick wherever you put it down; push it to the
                   rim to run
     right thumb   drag anywhere empty to look; the buttons sit in an arc
                   under it: fire (hold), use, jump, crouch (hold), special,
                   next weapon, rite / alt
     top edge      pause, map, case file, phone, quick wheel (press and
                   slide), torch, med kit, campaign board in co-op,
                   fullscreen
     ✕             backs out of the map, phone, shop, camera and wheel

   Every button simply presses the key it stands for, so rebinding, the
   tutorial hints and everything else keep working. Dialogue choices, the
   journal, the board and menus are ordinary buttons and take taps. In
   portrait the game asks you to turn the phone. */

SET_DEFAULT.touch='auto'; SET_DEFAULT.touchLook=1; SET_DEFAULT.touchSize=1;
(function loadTouchSettings(){ let o={}; try{ o=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')||{}; }catch(e){}
  S.settings.touch=['auto','on','off'].includes(o.touch)?o.touch:'auto';
  S.settings.touchLook=typeof o.touchLook==='number'?o.touchLook:1; S.settings.touchSize=typeof o.touchSize==='number'?o.touchSize:1; })();
{ const was=saveSettings; saveSettings=function(){ was(); try{ const o=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')||{};
    o.touch=S.settings.touch; o.touchLook=S.settings.touchLook; o.touchSize=S.settings.touchSize; localStorage.setItem(SETTINGS_KEY,JSON.stringify(o)); }catch(e){} }; }
SET_ROWS.push({h:'Touch'},
  {k:'touch',label:'Touch controls',opts:[['auto','Automatic'],['on','On'],['off','Off']],note:'Automatic turns them on for phones and tablets. Play in landscape; the game goes fullscreen when you start, where the browser allows it.'},
  {k:'touchLook',label:'Look speed',opts:[[.6,'Slow'],[1,'Normal'],[1.5,'Fast'],[2.2,'Very fast']]},
  {k:'touchSize',label:'Button size',opts:[[.85,'Small'],[1,'Medium'],[1.2,'Large']]});

function touchDevice(){ try{ return (typeof matchMedia==='function'&&matchMedia('(pointer: coarse)').matches)||(typeof navigator!=='undefined'&&navigator.maxTouchPoints>1&&typeof matchMedia==='function'&&matchMedia('(hover: none)').matches); }catch(e){ return false; } }
function touchOn(){ const t=S.settings.touch; return t==='on'||(t==='auto'&&touchDevice()); }

const TOUCH={on:false,el:null,joy:null,look:null,wheel:null,held:{},mx:0,my:0,run:false,ring:null,knob:null,skip:null,back:null};
const TB=[ // id, label, code or action, kind, css position class
  ['fire','FIRE','Mouse0','hold','b-fire'],['use','USE','@interact','tap','b-use'],['jump','JUMP','@jump','tap','b-jump'],
  ['crouch','DUCK','@crouch','hold','b-crouch'],['special','Q','@special','tap','b-special'],['next','⟳','@nextWeapon','tap','b-next'],
  ['alt','ALT','Mouse2','hold','b-alt'],
  ['pause','❚❚','Escape','tap','t-pause'],['map','MAP','@map','tap','t-map'],['case','FILE','@caseFile','tap','t-case'],['phone','PHONE','@phone','tap','t-phone'],
  ['wheel','WHEEL','@quick','wheel','t-wheel'],['torch','TORCH','@torch','tap','t-torch'],['med','MED','@medkit','tap','t-med'],['kick','KICK','@kick','tap','t-kick'],['board','BOARD','@coopBoard','tap','t-board'],['full','⛶','!full','tap','t-full'],
];
const codeFor=c=>c[0]==='@'?(codesOf(c.slice(1)).find(k=>!k.startsWith('Pad'))||codesOf(c.slice(1))[0]||null):c;
function touchBuild(){
  const vp=document.getElementById('vp'); if(!vp||TOUCH.el) return;
  const d=document.createElement('div'); d.id='touch'; vp.appendChild(d); TOUCH.el=d;
  const btn=([id,l,,,cls])=>`<button class="tb ${cls}" data-tb="${id}">${l}</button>`;
  d.innerHTML=TB.filter(b=>b[4][0]==='b').map(btn).join('')+'<div class="t-bar">'+TB.filter(b=>b[4][0]==='t').map(btn).join('')+'</div>'
    +'<div class="t-ring"><div class="t-knob"></div></div><button class="tb t-skip" data-tx="skip">Skip ›</button><button class="tb t-back" data-tx="back">✕</button>';
  TOUCH.ring=d.querySelector('.t-ring'); TOUCH.knob=d.querySelector('.t-knob');
  const opt={passive:false};
  d.addEventListener('touchstart',touchStart,opt); d.addEventListener('touchmove',touchMove,opt);
  d.addEventListener('touchend',touchEnd,opt); d.addEventListener('touchcancel',touchEnd,opt);
  /* the rotate-your-phone card */
  const r=document.createElement('div'); r.id='rotate'; r.innerHTML='<div><b>⟲</b><p>Turn your phone sideways.</p><small>Oakhaven plays in landscape.</small></div>'; document.body.appendChild(r);
}
function touchApply(){ const on=touchOn(); TOUCH.on=on;
  try{ document.body.classList.toggle('touch',on); }catch(e){}
  if(on) touchBuild();
  try{ document.documentElement.style.setProperty('--tbs',String(S.settings.touchSize||1)); }catch(e){}
  if(on&&!S.running&&S.renderer==='doom'&&!S.settings.rendererChosen){ setRenderer('fill'); try{ syncPickers(); }catch(e){} }
  fitCab(); }
/* fill the screen sideways */
function fitCab(){ try{ const cab=document.getElementById('cab'); if(!cab) return; const aspect=IW*MODE.par/IH;
  cab.style.width=TOUCH.on?`min(100vw, calc(100dvh * ${aspect.toFixed(3)}))`:`min(97vw, calc((100vh - 60px) * ${aspect.toFixed(3)}), 1320px)`; }catch(e){} }
{ const was=setPixelMode; setPixelMode=function(k){ was(k); fitCab(); }; }
{ const was=setRenderer; setRenderer=function(k){ const r=was(k); if(r&&S.running===false&&TOUCH.el) S.settings.rendererChosen=true; return r; }; }

function tbPress(id,down){
  const b=TB.find(x=>x[0]===id); if(!b) return; const [,, c, kind]=b;
  if(c==='!full'){ if(down) touchFullscreen(true); return; }
  const code=codeFor(c); if(!code) return;
  if(down){ S.lastInput='touch'; inputDown(code,null); if(kind==='tap') inputUp(code); try{ navigator.vibrate&&navigator.vibrate(8); }catch(e){} }
  else if(kind!=='tap') inputUp(code);
}
function touchStart(e){
  e.preventDefault();
  for(const t of e.changedTouches){
    const tgt=t.target&&t.target.closest?t.target.closest('[data-tb],[data-tx]'):null;
    if(tgt&&tgt.dataset.tx){ if(tgt.dataset.tx==='skip') inputDown('Enter',null), inputUp('Enter'); else inputDown('Escape',null), inputUp('Escape'); continue; }
    if(tgt){ const id=tgt.dataset.tb; TOUCH.held[t.identifier]={id,x:t.clientX,y:t.clientY}; tgt.classList.add('on'); tbPress(id,true);
      if(id==='wheel') TOUCH.wheel=t.identifier; continue; }
    const r=TOUCH.el.getBoundingClientRect(), fx=(t.clientX-r.left)/r.width;
    if(fx<.42&&TOUCH.joy==null){ TOUCH.joy={id:t.identifier,x:t.clientX,y:t.clientY}; TOUCH.ring.style.left=(t.clientX-r.left)+'px'; TOUCH.ring.style.top=(t.clientY-r.top)+'px'; TOUCH.ring.classList.add('on'); TOUCH.knob.style.transform='translate(-50%,-50%)'; }
    else if(TOUCH.look==null) TOUCH.look={id:t.identifier,x:t.clientX,y:t.clientY};
  }
}
function touchMove(e){
  e.preventDefault();
  for(const t of e.changedTouches){
    if(TOUCH.joy&&t.identifier===TOUCH.joy.id){ const R=46*(S.settings.touchSize||1); let dx=(t.clientX-TOUCH.joy.x)/R, dy=(t.clientY-TOUCH.joy.y)/R; const m=Math.hypot(dx,dy);
      if(m>1){ dx/=m; dy/=m; } TOUCH.mx=Math.abs(dx)<.12?0:dx; TOUCH.my=Math.abs(dy)<.12?0:dy; TOUCH.run=m>1.15;
      TOUCH.knob.style.transform=`translate(calc(-50% + ${dx*R}px), calc(-50% + ${dy*R}px))`; continue; }
    const h=TOUCH.held[t.identifier];
    if(h&&h.id==='wheel'&&S.wheel){ S.wheel.ax+=(t.clientX-h.x)*2; S.wheel.ay+=(t.clientY-h.y)*2; h.x=t.clientX; h.y=t.clientY; wheelAim(); continue; }
    if(TOUCH.look&&t.identifier===TOUCH.look.id){ const dx=t.clientX-TOUCH.look.x, dy=t.clientY-TOUCH.look.y; TOUCH.look.x=t.clientX; TOUCH.look.y=t.clientY; touchLook(dx,dy); }
  }
}
function touchEnd(e){
  e.preventDefault();
  for(const t of e.changedTouches){
    if(TOUCH.joy&&t.identifier===TOUCH.joy.id){ TOUCH.joy=null; TOUCH.mx=TOUCH.my=0; TOUCH.run=false; TOUCH.ring.classList.remove('on'); }
    if(TOUCH.look&&t.identifier===TOUCH.look.id) TOUCH.look=null;
    const h=TOUCH.held[t.identifier]; if(h){ delete TOUCH.held[t.identifier]; tbPress(h.id,false); if(h.id==='wheel') TOUCH.wheel=null;
      const b=TOUCH.el.querySelector(`[data-tb="${h.id}"]`); if(b) b.classList.remove('on'); }
  }
}
function touchLook(dx,dy){
  if(!S.running||S.cut||dlg.open||S.menu||CTRL.open||S.mapOpen||S.caseOpen) return;
  if(S.wheel){ S.wheel.ax+=dx*2; S.wheel.ay+=dy*2; wheelAim(); return; }
  const k=(S.settings.touchLook||1)*(CTRL.opts.mouseSens||1);
  if(S.driving){ S.angle+=dx*.004*k; return; }
  S.angle+=dx*.0062*k;
  if(MODE.pitch==='shear') S.pitch=clamp(S.pitch-dy*1.1*(IH/270)*k*(CTRL.opts.invertMouse?-1:1),-IH*.28,IH*.28);
}
/* the stick drives the same analogue path as a controller */
{ const was=pollPad; pollPad=function(dt){ was(dt); if(!TOUCH.on) return;
    if(TOUCH.joy){ PAD.mx=TOUCH.mx; PAD.my=TOUCH.my; }
    keys.ShiftLeft=TOUCH.run?true:(TOUCH.joy?false:keys.ShiftLeft);
    touchFrame(); }; }
/* which buttons make sense right now */
function touchFrame(){ const d=TOUCH.el; if(!d) return;
  const free=S.running&&!S.cut&&!dlg.open&&!S.menu&&!S.mapOpen&&!S.caseOpen&&!S.phoneOpen&&!CTRL.open&&!S.camMode&&!S.dead;
  const back=S.running&&(S.mapOpen||S.phoneOpen||S.menu==='shop'||!!S.camMode||!!S.wheel);
  d.classList.toggle('play',free); d.classList.toggle('cut',!!(S.running&&S.cut)); d.classList.toggle('back',!!back&&!S.wheel);
  d.classList.toggle('cam',!!S.camMode); d.classList.toggle('coop',typeof COOP!=='undefined'&&COOP.on); d.classList.toggle('drive',!!S.driving);
  d.classList.toggle('off',!S.running);
  if(!free&&TOUCH.joy){ TOUCH.joy=null; TOUCH.mx=TOUCH.my=0; TOUCH.run=false; TOUCH.ring&&TOUCH.ring.classList.remove('on'); } }
/* fullscreen and landscape, where the browser allows */
function touchFullscreen(toggle){ try{ const de=document.documentElement;
    if(toggle&&document.fullscreenElement){ document.exitFullscreen(); return; }
    const p=de.requestFullscreen?de.requestFullscreen({navigationUI:'hide'}):de.webkitRequestFullscreen?de.webkitRequestFullscreen():null;
    const lock=()=>{ try{ screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape').catch(()=>{}); }catch(e){} };
    if(p&&p.then) p.then(lock,()=>{}); else lock(); }catch(e){} }
{ const was=begin; begin=function(h){ if(TOUCH.on) touchFullscreen(false); return was(h); }; }
{ const was=restore; restore=function(d){ if(TOUCH.on) touchFullscreen(false); return was(d); }; }
/* a renderer as wide as the screen: 270 lines, edge to edge on a phone */
PIXEL_MODES.fill={name:'Fill screen',w:480,h:270,par:1,quantise:false,pitch:'shear',dim:.55};
{ const i=RENDERERS.findIndex(r=>r.key==='hd'); RENDERERS.splice(i<0?RENDERERS.length:i,0,{key:'fill',label:'Fill screen',mode:'fill',ascii:0,note:'Made for phones: 270 lines high and exactly as wide as your screen, so the picture fills it edge to edge with no bars.'}); }
function fillSize(){ let a=1.78; try{ a=Math.max(innerWidth,innerHeight)/Math.max(1,Math.min(innerWidth,innerHeight)); }catch(e){}
  a=Math.min(2.4,Math.max(1.33,a)); const w=Math.round(270*a/2)*2, M=PIXEL_MODES.fill; if(M.w===w) return false; M.w=w; M.name=`Fill screen ${w}×270`; return true; }
fillSize();
(function fillButton(){ const hd=document.querySelector('.rp[data-r="hd"]'); if(!hd||!hd.parentNode) return; const b=document.createElement('button'); b.className='opt rp'; b.dataset.r='fill'; b.textContent='Fill screen';
  b.onclick=()=>{ setRenderer('fill'); syncPickers(); }; hd.parentNode.insertBefore(b,hd); })();
addEventListener('resize',()=>{ if(fillSize()&&MODE===PIXEL_MODES.fill) setPixelMode('fill'); fitCab(); });
{ const was=settingsChanged; settingsChanged=function(){ was(); touchApply(); }; }
touchApply();
(function restoreFill(){ let o={}; try{ o=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')||{}; }catch(e){}
  if(o.renderer==='fill'){ setRenderer('fill'); try{ syncPickers(); }catch(e){} } })();
