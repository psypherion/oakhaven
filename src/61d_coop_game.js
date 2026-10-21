/* ═══ Co-op in the game ════════════════════════════════════════════════════
   Each player walks their own copy of Oakhaven; the campaign is what they
   share. What travels between them:
     · evidence: documents, places, photographs and records go into the shared
       case file the moment either brother finds them. What somebody SAID to
       you, what you heard and what you saw that nobody else did goes into
       your personal notebook, and stays there until you share it;
     · deductions, once either of you makes them;
     · theories, submitted sealed and revealed together. Agreement commits
       the theory; disagreement opens a debate with the evidence on the
       table; if you still disagree the case is recorded as contested;
     · decisions: some are yours alone (and your brother hears about them),
       some need both of you to confirm;
     · relationships, the chronicle, and where your brother is standing.

   The two roles change what you can do, not just what you say:
     the Observer reads records, timelines and alterations; reads patterns on
       the board (the hunch), and sees which theories the evidence supports;
     the Interrogator reads people; witnesses trust him a little more, some
       will only talk to him, and he can tell which theory is wrong (the gut).
   The host runs the campaign. The host does not get more story. */

const COOP={on:false,meta:null,client:null,auth:null,peer:null,seat:null,role:null,hero:null,applying:false,
  pres:{}, feed:[], known:new Set(), seenLinks:new Set(), applied:new Set(), finalSent:{}, hostNote:'', retryN:0, retryT:null, ephT:0, scanT:0, lastPres:null, seenChron:0};
const AUTO_KINDS=new Set(['doc','place','photo','note','record']);
function coopOn(){ return COOP.on; }
function coopState(){ return COOP.client&&COOP.client.state; }
function coopShared(){ const C=coopState(); return (C&&C.shared)||{clues:{},links:{},votes:{},final:{},decisions:{},ledger:[],notes:[],flags:{}}; }
function myPriv(){ const C=coopState(); return (C&&C.priv&&C.priv[COOP.seat])||{}; }
function partnerSeat(){ return COOP.seat==='A'?'B':'A'; }
function seatInfo(seat){ const C=coopState(); return C&&C.seats[seat]; }
function partnerHero(){ const p=seatInfo(partnerSeat()); return p?p.hero:coopOther(COOP.hero,COOP_HEROES); }
function nameOfSeat(seat){ const s=seatInfo(seat); return s?(s.name||heroLabel(s.hero)):'?'; }
function partnerName(){ return nameOfSeat(partnerSeat()); }
function myName(){ return nameOfSeat(COOP.seat); }
function partnerOnline(){ return !!(COOP.client&&COOP.client.online&&COOP.client.online[partnerSeat()]); }
function partnerJoined(){ const p=seatInfo(partnerSeat()); return !!(p&&p.claimed); }
function partnerHere(){ const p=COOP.pres[partnerSeat()]; return !!(partnerOnline()&&p&&S.sector&&p.sec===S.sector.id); }
function myRole(){ return COOP.on?COOP.role:'both'; }
function isObserver(){ return !COOP.on||COOP.role==='observer'; }
function isInterrogator(){ return !COOP.on||COOP.role==='interrogator'; }
function cop(op,cb){ if(COOP.client) return COOP.client.send(op,cb); }
function chron(kind,text,o){ if(COOP.on) cop({op:'push',path:'chron',val:Object.assign({kind,text},o||{})}); }
const clock_=()=>{ const d=new Date(); return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); };

/* ── starting a session ────────────────────────────────────────────────── */
function coopBegin(meta,client){
  COOP.on=true; COOP.meta=meta; COOP.seat=meta.seat; COOP.hero=meta.hero; COOP.role=meta.role;
  COOP.known=new Set(); COOP.seenLinks=new Set(); COOP.applied=new Set(); COOP.finalSent={}; COOP.feed=[];
  COOP.seenChron=meta.seenChron||0;
  const c=client||new CoopClient(meta,coopStoreMeta);
  c.store=coopStoreMeta; c.h={};
  c.on('change',coopChanged).on('status',coopStatusChanged).on('presence',coopPresence).on('eph',coopEph).on('bye',coopBye).on('rejected',coopRejected);
  COOP.client=c;
  meta.last=Date.now(); coopStoreMeta(meta);
  try{ if(/join=/.test(location.hash)) history.replaceState(null,'',location.pathname+location.search); }catch(e){}
  const w=coopWorld(meta.cid);
  if(w&&validSave(w)&&w.hero===meta.hero) restore(w); else begin(meta.hero);
  coopHud(); coopApplyShared();
  if(!c.link) coopConnect(); else coopStatusChanged(c.status);
  feedSys(`Campaign “${meta.title}”. You are ${heroLabel(meta.hero)}, the ${roleLabel(meta.role)}.`);
  if(COOP.seenChron&&coopState()&&(coopState().chron||[]).length>COOP.seenChron) later(3,()=>openBoard('chron'));
}
function coopConnect(){
  const m=COOP.meta, cl=COOP.client; if(!m||!cl) return;
  if(m.mode==='p2p'&&m.seat==='A'){
    if(!COOP.auth){ const C=coopLoadAuth(m.cid);
      if(!C){ COOP.hostNote='This browser no longer holds the campaign. Restore it from your campaign file.'; cl.setStatus('offline','noauth'); return; }
      COOP.auth=new CoopAuthority(C,coopSaveAuth); }
    const [a,b]=coopMemPair(); COOP.auth.attach(b); cl.use(a);
    if(COOP_NET.hostHook) COOP_NET.hostHook(COOP.auth);
    else if(!COOP.peer){ COOP.hostNote='Opening the line…';
      coopHostP2P(COOP.auth,m,(s,why)=>{ COOP.hostNote=s==='open'?'Listening for your brother.':s==='lost'?'Lost the signalling server; retrying…':
          why==='unavailable-id'?'This campaign is already open in another tab or browser.':why==='network'||why==='server-error'?'Can’t reach the signalling server. Your brother can’t join until it’s back.':'Connection trouble: '+(why||s);
        coopHud(); }).then(P=>{ COOP.peer=P; },e=>{ COOP.hostNote='Couldn’t start browser-to-browser play: '+(e&&e.message||e); coopHud(); }); }
    return; }
  coopThen(coopDial(m),L=>cl.use(L),()=>{ cl.setStatus('offline','unreachable'); });
}
function coopRetry(){
  if(COOP.retryT||!COOP.on) return; const st=COOP.client&&COOP.client.status;
  if(['removed','denied','closed','elsewhere'].includes(st)) return;
  if(COOP.meta.mode==='p2p'&&COOP.seat==='A') return;
  const d=[1,2,4,8,15,30][Math.min(5,COOP.retryN++)];
  COOP.retryT=setTimeout(()=>{ COOP.retryT=null; if(COOP.on&&COOP.client.status==='offline') coopConnect(); },d*1000);
}
function coopReconnectNow(){ if(COOP.retryT){ clearTimeout(COOP.retryT); COOP.retryT=null; } COOP.retryN=0; coopConnect(); }

/* ── events from the campaign ──────────────────────────────────────────── */
function coopStatusChanged(s,why){
  if(s==='online'){ COOP.retryN=0; feedSys(partnerJoined()?`Connected. ${partnerOnline()?partnerName()+' is here.':partnerName()+' is away; their part of the case waits for them.'}`:'Connected. Nobody has taken the other seat yet.'); }
  if(s==='offline'){ if(why!=='noauth') feedSys(COOP.seat==='A'&&COOP.meta.mode==='p2p'?COOP.hostNote:'Can’t reach the campaign. You can keep investigating; what you find waits in your outbox.'); coopRetry(); }
  if(s==='removed') coopNotice('Removed from the campaign','The host removed you from this campaign. Your copy of the town and the case file stay on this browser, but nothing you do now reaches the campaign. Ask the host for a new invitation if this was a mistake.');
  if(s==='denied') coopNotice('Not allowed in','The campaign didn’t accept this browser’s credential. If you cleared your browser or changed computers, use your recovery code from the campaign screen.');
  if(s==='closed') coopNotice('Campaign closed','The host closed this campaign. Nothing was erased: it is archived, and the host can reopen it.');
  if(s==='elsewhere') coopNotice('Opened somewhere else','You opened this campaign in another tab or browser. This one has stepped aside.');
  coopHud();
}
function coopNotice(title,text){ if(!S.running) return; later(.2,()=>{ if(dlg.open||S.menu) closeDlg(); openMenu(title,text,[{text:'Understood'}]); }); }
function coopPresence(o){ const was=COOP.lastPres, p=partnerSeat(); COOP.lastPres={...o};
  if(was&&was[p]!==o[p]&&partnerJoined()&&COOP.client&&['online','connecting'].includes(COOP.client.status)) feedSys(o[p]?`${partnerName()} is back.`:`${partnerName()} dropped out. Joint decisions will wait for them.`);
  coopHud(); }
function coopBye(why){ coopHud(); }
function coopRejected(code,op){ if(code==='conflict') return; if(code==='closed'||code==='removed') return;
  console.warn('coop: rejected',code,op); }
function coopChanged(kind,ev){
  const C=coopState(); if(!C) return;
  if(C.closed&&COOP.client.status!=='closed') COOP.client.setStatus('closed');
  if(kind==='ev'&&ev&&ev.by!==COOP.seat) coopPartnerEvent(ev);
  coopApplyShared(); coopHud(); if(BOARD.open) renderBoard(); if(S.caseOpen) try{ renderJournal(); }catch(e){}
}
const COOP_SYNC=[];       // f(C): content reacting to the shared state
function coopApplyShared(){
  const C=coopState(); if(!C||!S.running) return; const SH=C.shared||{};
  for(const key in (SH.links||{})){ if(COOP.seenLinks.has(key)) continue; const [cid,lid]=key.split(':'), c=CASES[cid], L=c&&c.links.find(l=>l.id===lid);
    if(!L) continue; COOP.seenLinks.add(key); if(haveLink(cid,lid)) continue;
    COOP.applying=true; try{ (S.inv.links[cid]=S.inv.links[cid]||[]).push(lid); S.flags['ded_'+lid]=true; if(L.fx) try{ L.fx(); }catch(e){} addNoteRaw('ded_'+lid,'Deduction — '+L.t,L.x); } finally{ COOP.applying=false; } }
  for(const id of Object.keys(SH.votes||{}).concat(Object.keys(SH.final||{}))) jointTick(id.replace(/-r2$/,''));
  for(const f of COOP_SYNC) try{ f(C); }catch(e){ console.error(e); }
}
function coopPartnerEvent(ev){
  const p=ev.path||'', who=nameOfSeat(ev.by);
  if(p.startsWith('shared.clues.')&&ev.val){ const [cid,k]=p.slice(13).split(':'), c=CASES[cid], q=c&&c.clues[k], text=q&&`${q.k==='talk'||q.k==='sound'?'shared':'found'} “${q.t}”`;
    if(q&&!COOP.feed.slice(-6).some(m=>m.text===text)) feedPush({who,text,kind:'find'}); }
  else if(p.startsWith('shared.links.')&&ev.val){ const [cid,lid]=p.slice(13).split(':'), L=CASES[cid]&&CASES[cid].links.find(l=>l.id===lid); if(L) feedPush({who,text:`connected: ${L.t}`,kind:'find'}); }
  else if(p.startsWith('shared.votes.')){ const id=p.split('.')[2].replace(/-r2$/,''), J=jointDef(id); if(J) feedPush({who,text:J.sealed?`submitted — ${J.title} (sealed)`:`chose — ${J.title}`,kind:'vote'}); }
  else if(p==='shared.notes'&&ev.val) feedPush({who,text:`shared a note: “${ev.val.title}”`,kind:'find'});
  else if(p.startsWith('shared.decisions.')&&ev.val) coopPartnerDecided(p.slice(17),ev.val);
  else if(p==='chron'&&ev.val&&ev.val.feed) feedPush({who:['fracture','joint','ending','rel'].includes(ev.val.kind)?null:who,text:ev.val.feed,kind:ev.val.kind});
}

/* ── the shared case file ──────────────────────────────────────────────── */
const clueLocal=clueHave;
clueHave=function(c,k){ if(clueLocal(c,k)) return true; if(!COOP.on) return false; const s=coopShared().clues; return !!(s&&s[c.id+':'+k]); };
function clueShared(c,k){ const s=coopShared().clues; return s&&s[c.id+':'+k]; }
/* what you find goes out; what you're told stays yours until you share it */
function coopScan(){
  if(!COOP.on||!COOP.client) return;
  for(const c of Object.values(CASES)){ if(!c.clues) continue;
    for(const k in c.clues){ const key=c.id+':'+k; if(COOP.known.has(key)) continue;
      let have=false; try{ have=clueLocal(c,k); }catch(e){} if(!have) continue; COOP.known.add(key);
      if(clueShared(c,k)) continue;
      const q=c.clues[k], text=typeof q.x==='function'?q.x():q.x;
      if(AUTO_KINDS.has(q.k)&&!q.personal){ cop({op:'set',path:'shared.clues.'+key,val:{by:COOP.seat,kind:q.k,title:q.t},expect:null},ok=>{
          if(ok&&!((coopState()||{}).chron||[]).some(e=>e.kind==='find'&&e.text.includes('“'+q.t+'”'))) chron('find',`${myName()} found “${q.t}” — ${c.title}.`); }); }
      else noteMine(key,q.t,text,q.k,key,q.who); } }
}
function noteMine(nid,title,text,kind,key,who){
  if(!COOP.on) return; const N=myPriv().notes||{}; if(N[nid]) return;
  cop({op:'set',path:`priv.${COOP.seat}.notes.${nid}`,val:{title,text:String(text||''),kind,key:key||null,who:who||null,t:Date.now()},expect:null},ok=>{
    if(ok) feedSys(`Notebook: “${title}”. Only you have this. Share it from the board (I).`); });
}
function shareNote(nid){
  const n=(myPriv().notes||{})[nid]; if(!n||n.shared) return false;
  if(n.key){ const [cid,k]=n.key.split(':'), c=CASES[cid];
    cop({op:'set',path:'shared.clues.'+n.key,val:{by:COOP.seat,kind:n.kind,title:n.title,shared:true},expect:null}); }
  else cop({op:'push',path:'shared.notes',val:{title:n.title,text:n.text,kind:n.kind}});
  cop({op:'set',path:`priv.${COOP.seat}.notes.${nid}.shared`,val:true});
  chron('share',`${myName()} shared “${n.title}”.`); sfx('switch'); return true;
}
/* deductions travel; a deduction made from a private note shares the note */
{ const was=tryLink; tryLink=function(cid,a,b){ const r=was(cid,a,b);
    if(r.ok&&COOP.on&&!COOP.applying){ const key=cid+':'+r.link.id; COOP.seenLinks.add(key);
      for(const k of [a,b]){ const nid=cid+':'+k, n=(myPriv().notes||{})[nid]; if(n&&!n.shared) shareNote(nid); }
      cop({op:'set',path:'shared.links.'+key,val:{by:COOP.seat},expect:null},ok=>{ if(ok) chron('deduce',`${myName()} connected: ${r.link.t}.`); }); }
    return r; }; }
/* the journal shows where a piece of evidence came from */
{ const was=clueBadge; clueBadge=function(c,k){ if(!COOP.on) return was(c,k);
    const sh=clueShared(c,k), mine=clueLocal(c,k), n=(myPriv().notes||{})[c.id+':'+k];
    if(n&&!n.shared) return '<small class="co-b priv">your notebook · not shared</small>';
    if(sh&&sh.by!==COOP.seat&&!mine) return `<small class="co-b">from ${esc_(nameOfSeat(sh.by))}</small>`;
    return ''; }; }
/* the roles at the board */
canHunch=()=>COOP.on?COOP.role==='observer':isSam();
canGut=()=>COOP.on?COOP.role==='interrogator':isDean();
hunchLabel=()=>COOP.on?'Observer’s read':'Sam’s hunch';
gutLabel=()=>COOP.on?'Interrogator’s gut':'Dean’s gut';
/* people open up to the Interrogator; the Observer sees what was edited */
{ const was=trustOf; trustOf=function(id){ return was(id)+(COOP.on&&COOP.role==='interrogator'?1:0); }; }
{ const was=noteView; noteView=function(n){ const r=was(n); if(COOP.on&&COOP.role==='interrogator') r.edited=false; return r; }; }

/* ── joint choices: sealed, revealed, debated ──────────────────────────── */
/* JOINT[id]={title, q, opts:[{id,t,support?}], sealed, avail(), apply(final)}.
   Theories are joint choices with id 'th-<case>'. */
const JOINT={};
function jointDef(id){ if(JOINT[id]) return JOINT[id];
  if(id.startsWith('th-')){ const c=CASES[id.slice(3)]; if(!c||!c.theory) return null;
    return {title:c.title,q:c.theory.q,opts:c.theory.opts,sealed:true,theory:c.id,apply:f=>applyTheoryFinal(c.id,f)}; }
  return null; }
function jointState(id){ const SH=coopShared(); return {r1:(SH.votes||{})[id]||{}, r2:(SH.votes||{})[id+'-r2']||{}, final:(SH.final||{})[id]||null}; }
function jointRound(id){ const s=jointState(id); if(s.final) return 0; return s.r1.A&&s.r1.B&&s.r1.A!==s.r1.B?2:1; }
function jointVote(id,choice){
  const J=jointDef(id); if(!J||!J.opts.some(o=>o.id===choice)) return false;
  if(!COOP.on){ J.apply({pick:choice,how:'solo'}); return true; }
  const s=jointState(id), rd=jointRound(id); if(!rd) return false;
  if((rd===1?s.r1:s.r2)[COOP.seat]) return false;
  if(rd===1) chron('vote',`${myName()} ${J.sealed?'submitted a sealed answer':'answered'} — ${J.title}`);
  cop({op:'set',path:`shared.votes.${id}${rd===2?'-r2':''}.${COOP.seat}`,val:choice});
  feedSys(rd===2?'Answer given. If you still disagree, it will be recorded that way.':partnerJoined()?`Submitted. It stays sealed until ${partnerName()} answers.`:'Submitted. It waits for your brother.');
  sfx('switch'); return true;
}
function jointTick(id){
  const J=jointDef(id); if(!J) return; const s=jointState(id);
  if(s.final){ if(!COOP.applied.has(id)){ COOP.applied.add(id); try{ J.apply(s.final); }catch(e){ console.error(e); } } return; }
  const A=s.r1.A, B=s.r1.B; if(!A||!B) return;
  let f=null;
  if(A===B) f={pick:A,how:'agreed'};
  else if(s.r2.A&&s.r2.B) f=s.r2.A===s.r2.B?{pick:s.r2.A,how:'debated',picks:{A,B}}:{pick:null,how:'contested',picks:{A:s.r2.A,B:s.r2.B}};
  if(!f||COOP.finalSent[id]) return; COOP.finalSent[id]=true;
  const opt=x=>(J.opts.find(o=>o.id===x)||{}).t||x;
  cop({op:'set',path:'shared.final.'+id,val:f,expect:null},ok=>{ if(!ok) return;
    chron('joint',f.pick?`${J.title} — ${f.how==='agreed'?'you agreed':'you agreed after a debate'}: “${opt(f.pick)}”`:`${J.title} — contested. ${nameOfSeat('A')} held “${opt(f.picks.A)}”; ${nameOfSeat('B')} held “${opt(f.picks.B)}”`,{feed:f.pick?'agreed — '+J.title:'contested — '+J.title}); });
}
function applyTheoryFinal(cid,f){
  if(theoryOf(cid)||S.flags['theory_'+cid]==='contested') return;
  if(f.pick){ COOP.applying=true; try{ commitTheory(cid,f.pick); } finally{ COOP.applying=false; } S.flags['theory_how_'+cid]=f.how; }
  else { S.flags['theory_'+cid]='contested';
    addNoteRaw('theory_'+cid,'Theory — '+CASES[cid].title,`You and ${partnerName()} couldn’t agree. The file holds both theories, and neither.`); }
  try{ relBrothers(f.how==='agreed'?{trust:1}:f.how==='debated'?{understanding:1}:{resentment:1},f.how==='agreed'?'agreed on a theory':f.how==='debated'?'argued a theory through':'could not agree on a theory'); }catch(e){}
}
{ const was=commitTheory; commitTheory=function(cid,oid){ if(!COOP.on||COOP.applying) return was(cid,oid); jointVote('th-'+cid,oid); }; }
/* the theory section of the journal, in co-op */
function supportHTML(c,o){ if(!o.support) return '';
  const held=o.support.filter(l=>haveLink(c.id,l)), L=id=>(c.links.find(x=>x.id===id)||{}).t||id;
  return held.length?`<small class="co-sup">supported by: ${held.map(id=>esc_(L(id))).join(' · ')}${held.length<o.support.length?' · and something you haven’t found':''}</small>`
    :`<small class="co-sup none">${o.support.length?'nothing you hold supports this yet':'nothing in the file supports this'}</small>`; }
{ const was=theoryBlock; theoryBlock=function(c,D){
    if(!COOP.on||!c.theory||!coopState()) return was(c,D);
    const id='th-'+c.id, s=jointState(id), me=COOP.seat, pa=partnerSeat(), P=esc_(partnerName()), T=c.theory, opt=x=>(T.opts.find(o=>o.id===x)||{}).t||x;
    if(theoryOf(c.id)){ const how=S.flags['theory_how_'+c.id]; return was(c,D).replace('<p class="q">',`<p class="co-how">${how==='debated'?'Agreed with '+P+' after a debate.':'Agreed with '+P+'.'}</p><p class="q">`); }
    let h=`<h3>Theory <i>sealed until you both answer</i></h3><div class="jr-theory"><p class="q">${esc_(T.q)}</p>`;
    if(S.flags['theory_'+c.id]==='contested'&&s.final){ const pk=s.final.picks||{};
      return h+`<p class="pick wrong">Contested.</p><p class="verdict">You held: ${esc_(opt(pk[me]))}<br>${P} held: ${esc_(opt(pk[pa]))}</p></div>`; }
    const rd=jointRound(id);
    if(rd===1&&!s.r1[me]){
      if(!D.length&&!Object.keys(coopShared().links||{}).some(k=>k.startsWith(c.id+':'))) return h+'<p class="jr-empty">Connect some evidence first.</p></div>';
      for(const o of T.opts){ const struck=S.inv.gut[c.id]===o.id;
        h+=`<button class="jr-opt${struck?' struck':''}" data-theory="${o.id}"${struck?' disabled':''}>${esc_(o.t)}${struck?` <small>(${gutLabel()}: no)</small>`:''}${COOP.role==='observer'?supportHTML(c,o):''}</button>`; }
      if(canGut()&&!S.inv.gut[c.id]) h+=`<button class="jr-gut" data-gut>${gutLabel()}</button>`;
      return h+`<p class="jr-warn">${s.r1[pa]?P+' has already answered. You’ll both see each other’s answer when you commit.':'You each answer on your own; nobody sees the other’s answer until both are in.'}</p></div>`; }
    if(rd===1) return h+`<p class="pick">You said: ${esc_(opt(s.r1[me]))}</p><p class="verdict">Waiting for ${P}${partnerOnline()?'':' (away — this waits for them)'}.</p></div>`;
    /* the debate */
    const ev=Object.keys(coopShared().links||{}).filter(k=>k.startsWith(c.id+':')).map(k=>(c.links.find(l=>l.id===k.split(':')[1])||{}).t).filter(Boolean);
    h+=`<div class="co-debate"><p><b>You</b> ${esc_(opt(s.r1[me]))}${COOP.role==='observer'?supportHTML(c,T.opts.find(o=>o.id===s.r1[me])||{}):''}</p><p><b>${P}</b> ${esc_(opt(s.r1[pa]))}${COOP.role==='observer'?supportHTML(c,T.opts.find(o=>o.id===s.r1[pa])||{}):''}</p>`
      +`<p class="co-ev">On the table: ${ev.length?ev.map(esc_).join(' · '):'no deductions yet — that’s worth saying out loud'}.</p></div>`;
    if(!s.r2[me]) h+=`<button class="jr-opt" data-r2="${s.r1[me]}">Stand by mine</button><button class="jr-opt" data-r2="${s.r1[pa]}">Go with ${P}’s</button><p class="jr-warn">Talk it through first. If you still disagree after this, the case is recorded as contested.</p>`;
    else h+=`<p class="verdict">You chose: ${esc_(opt(s.r2[me]))}. Waiting for ${P}.</p>`;
    return h+'</div>'; }; }
JR_BIND.push(on=>on('[data-r2]',b=>{ jointVote('th-'+JR.tab,b.dataset.r2); renderJournal(); }));

/* ── decisions one of you makes alone ──────────────────────────────────── */
{ const was=decide; decide=function(cid,what){ was(cid,what);
    if(!COOP.on||COOP.applying) return;
    const SH=coopShared(), path='shared.decisions.'+cid+((SH.decisions||{})[cid]?'-'+COOP.seat:'');
    cop({op:'set',path,val:{what,by:COOP.seat,hero:COOP.hero}});
    const c=CASES[cid], w=(typeof PREFS!=='undefined'&&PREFS[cid]&&PREFS[cid].why[what])||what;
    chron('decision',`${myName()} decided, alone: ${w} — ${c?c.title:cid}.`,{feed:'decided: '+w}); }; }
/* …and the other hears about it, and feels about it, in their own way */
function coopPartnerDecided(cid,v){
  const p=typeof PREFS!=='undefined'&&PREFS[cid]; if(!p||!v||v.by===COOP.seat) return;
  const want=p[COOP.hero], agree=v.what===want, w=p.why[v.what]||v.what;
  relEvent(COOP.hero,partnerHero(),agree?{respect:1}:{understanding:1,resentment:1},`${partnerName()} chose ${w} without you`,{major:false});
  feedPush({who:partnerName(),text:`decided: ${w}`,kind:'decision'});
  later(1.5,()=>say(COOP.hero,agree?'Huh. I’d have done the same.':`${heroLabel(partnerHero())} went with ${w}. Okay. We’re talking about that later.`,3.4));
}

/* ── your personal world, your partner in it ───────────────────────────── */
{ const was=updateCompanion; updateCompanion=function(dt){
    if(!COOP.on) return was(dt);
    const c=COMP; if(!c) return; const p=COOP.pres[partnerSeat()], here=partnerHere()&&!S.driving;
    c.hidden=!here; c.name=partnerName();
    if(here){ if(p.cos&&COSTUMES[partnerHero()]&&COSTUMES[partnerHero()][p.cos]) c.look=COSTUMES[partnerHero()][p.cos].look;
      const d=Math.hypot(p.x-c.x,p.y-c.y);
      if(d>4||c.fresh){ c.x=p.x; c.y=p.y; c.fresh=false; } else { const k=Math.min(1,dt*10); c.x+=(p.x-c.x)*k; c.y+=(p.y-c.y)*k; }
      c.face=p.a; c.moving=!!p.mv; if(p.mv) c.animT+=dt*4.8; }
    else c.fresh=true;
    COOP.ephT-=dt; if(COOP.ephT<=0&&S.sector){ COOP.ephT=.12; const lp=COOP.lastXY||[0,0], mv=Math.hypot(S.px-lp[0],S.py-lp[1])>.01; COOP.lastXY=[S.px,S.py];
      const d={sec:S.sector.id,x:+S.px.toFixed(2),y:+S.py.toFixed(2),a:+S.angle.toFixed(2),cos:S.costume,mv};
      const sig=JSON.stringify(d); if(sig!==COOP.lastEph){ COOP.lastEph=sig; COOP.client&&COOP.client.sendEph({pos:d}); } }
    COOP.scanT-=dt; if(COOP.scanT<=0){ COOP.scanT=.6; coopScan(); const now=Date.now(); if(COOP.client) COOP.client.tick(now); if(COOP.auth) COOP.auth.tick(now); }
  }; }
function coopEph(seat,d){ if(!d||typeof d!=='object') return;
  if(d.pos&&typeof d.pos==='object'){ const q=d.pos; if(typeof q.x==='number'&&typeof q.y==='number'&&typeof q.sec==='string') COOP.pres[seat]={sec:q.sec,x:q.x,y:q.y,a:+q.a||0,cos:String(q.cos||''),mv:!!q.mv}; }
  if(typeof d.ping==='string'&&PINGS[d.ping]){ feedPush({who:nameOfSeat(seat),text:PINGS[d.ping]+(d.where?' — '+String(d.where).slice(0,40):''),kind:'ping'}); sfx('switch'); } }
/* quick signals: for when you aren't on voice chat */
const PINGS={here:'Come here.',found:'I found something.',careful:'Careful.',ok:'I’m okay.',wait:'Wait for me.',board:'Look at the board.'};
function sendPing(k){ if(!COOP.on) return; COOP.client.sendEph({ping:k,where:S.sector.name}); feedPush({who:'You',text:PINGS[k],kind:'ping'}); }
function openPings(){ openMenu(`Signal ${partnerName()}`,partnerOnline()?'They’ll see it at the edge of their screen.':`${partnerName()} is away. Signals aren’t kept.`,
  Object.entries(PINGS).map(([k,t])=>({text:t,act:()=>sendPing(k)})).concat([{text:'Never mind'}])); }
/* your brother's lines only play when your brother is actually there */
{ const was=say; say=function(who,text,dur,opt={}){ if(COOP.on&&S.running&&who===partnerHero()&&!opt.coop&&!partnerHere()) return; return was(who,text,dur,opt); }; }
{ const was=switchBlock; switchBlock=function(){ if(COOP.on) return 'Your brother is locked to this campaign'; return was(); }; }
/* one world save per campaign; the slots are for single-player */
{ const was=writeSave; writeSave=function(slot){ if(!COOP.on) return was(slot); if(!canSave()) return false;
    try{ const d=snapshot(); d.coop=COOP.meta.cid; localStorage.setItem(COOP_LS+'world.'+COOP.meta.cid,JSON.stringify(d)); return true; }catch(e){ console.error('save failed',e); return false; } }; }
{ const was=openPause; openPause=function(){ was(); if(!COOP.on||!dlg.open||!dlg.avail) return;
    const L=dlg.avail.filter(c=>!/^Play as |^Load game|^Save game/.test(c.text));
    const i=Math.max(1,L.findIndex(c=>c.text==='Controls'));
    L.splice(i,0,{text:'Campaign board',note:'I',act:()=>{ closeDlg(); openBoard(); }},{text:'Campaign…',note:COOP.client?coopStatusWord():'',act:()=>{ closeDlg(); openCampaignPanel(openPause); }},
      {text:`Signal ${partnerName()}`,act:()=>{ closeDlg(); openPings(); }});
    dlg.avail=L; renderChoices(L.map(c=>({text:c.text,note:c.note,act:c.act||null}))); }; }
function coopStatusWord(){ const s=COOP.client&&COOP.client.status;
  return s==='online'?(partnerOnline()?`${partnerName()} is here`:partnerJoined()?`${partnerName()} is away`:'waiting for your brother'):s==='connecting'?'connecting…':s==='removed'?'removed':s==='closed'?'closed':'offline'; }

/* ── the feed ──────────────────────────────────────────────────────────── */
function feedPush(m){ const e=Object.assign({t:clock_(),at:S.time||0},m); COOP.feed.push(e); if(COOP.feed.length>60) COOP.feed.shift(); renderFeed(); return e; }
function feedSys(text){ return feedPush({who:null,text,kind:'sys'}); }

/* the inputs */
if(!ACTIONS.some(a=>a.id==='coopBoard')){
  ACTIONS.push({id:'coopBoard',label:'Campaign board (co-op)',group:'Interface',keys:['KeyI',null],pad:null});
  if(typeof ACT_BY_ID==='object') ACT_BY_ID.coopBoard=ACTIONS.at(-1); loadControls(); }
PRESS.coopBoard=()=>{ if(!COOP.on){ toast('The campaign board is for two-player campaigns'); return; } BOARD.open?closeBoard():openBoard(); };
WHEEL_ITEMS.splice(WHEEL_ITEMS.length-1,0,{id:'coopsig',label:'Signal brother',hint:()=>COOP.on?(partnerOnline()?`${partnerName()} is online`:`${partnerName()} is away`):'Two-player campaigns only',act:()=>COOP.on?openPings():toast('Two-player campaigns only')});
/* leaving the page closes the line cleanly, so your brother hears about it now, not in thirty seconds */
try{ addEventListener('pagehide',()=>{ try{ if(COOP.client&&COOP.client.link) COOP.client.link.close(); }catch(e){} try{ if(COOP.peer) COOP.peer.destroy(); }catch(e){} }); }catch(e){}
