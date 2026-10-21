/* ═══ Cases ═════════════════════════════════════════════════════════════════
   The case file is a hunter's journal now. Every case has the same bones:

     arrive → investigate → build a theory → prepare → resolve → record

   Clues arrive from what you read, who you talk to, what you photograph and
   where you stand. On the board you connect two clues; if they really do
   belong together you get a deduction, and deductions open new things to say
   and new ways to end the case. When you think you know, you commit to a
   theory. You can be wrong. The town will print what you got wrong.

   After a case closes there is an autopsy (what happened, what caused it,
   what is still open), and the next morning the Oakhaven Ledger has the
   story, and OakhavenTalk has opinions. The paper is always dated Sunday,
   October 4th. It has been Sunday, October 4th for a while. */

const CASES={};            // id → case definition
S.inv={links:{},theory:{},closed:{},news:[],hint:{},gut:{},seen:{},decisions:{}};
function defCase(c){ CASES[c.id]=c; c.links=c.links||[]; return c; }
function caseList(){ return Object.values(CASES).filter(c=>c.open()).sort((a,b)=>a.n-b.n); }
function clueHave(c,k){ const q=c.clues[k]; try{ return !!(q&&q.have()); }catch(e){ return false; } }
function haveLink(cid,lid){ return (S.inv.links[cid]||[]).includes(lid); }
function deduced(lid){ for(const k in S.inv.links) if(S.inv.links[k].includes(lid)) return true; return false; }
function theoryOf(cid){ return S.inv.theory[cid]||null; }
function theoryRight(cid){ const c=CASES[cid], t=theoryOf(cid); return !!(c&&t&&c.theory.opts.find(o=>o.id===t)?.ok); }
function caseClosed(cid){ return !!S.inv.closed[cid]; }
function caseDecision(cid){ return S.inv.decisions[cid]||null; }
function decide(cid,what){ S.inv.decisions[cid]=what; S.flags['dec_'+cid+'_'+what]=true; }

/* connect two clues */
function tryLink(cid,a,b){
  const c=CASES[cid]; if(!c||a===b) return {ok:false,msg:'Pick two different pieces of evidence.'};
  const L=c.links.find(l=>(l.a===a&&l.b===b)||(l.a===b&&l.b===a));
  if(!L){ S.inv.tries=(S.inv.tries||0)+1;
    const no=isDean()?['Nope. Those two aren’t talking to each other.','Doesn’t fit. Don’t force it.','I’ve got nothing there.']
                     :['No. There’s no line between those, not yet.','That’s pattern-matching, not evidence.','I want that to connect. It doesn’t.'];
    return {ok:false,msg:no[(S.inv.tries)%no.length]}; }
  if(haveLink(cid,L.id)) return {ok:false,msg:'You already made that connection.',link:L};
  (S.inv.links[cid]=S.inv.links[cid]||[]).push(L.id); S.flags['ded_'+L.id]=true;
  if(L.fx) try{ L.fx(); }catch(e){}
  sfx('riteEnd'); addNoteRaw('ded_'+L.id,'Deduction — '+L.t,L.x);
  return {ok:true,link:L};
}
function commitTheory(cid,oid){
  const c=CASES[cid]; if(!c||theoryOf(cid)) return;
  const o=c.theory.opts.find(x=>x.id===oid); if(!o) return;
  S.inv.theory[cid]=oid; S.flags['theory_'+cid]=o.ok?'right':'wrong';
  if(o.ok){ S.cash+=c.theory.reward||25; sfx('buy'); } else sfx('riteFail');
  addNoteRaw('theory_'+cid,`Theory — ${c.title}`,(o.ok?c.theory.right:c.theory.wrong)||o.t);
  if(c.theory.fx) try{ c.theory.fx(o.ok); }catch(e){}
}
/* Sam sees patterns; Dean trusts his gut (in co-op: the Observer and the Interrogator) */
function canHunch(){ return isSam(); }
function canGut(){ return isDean(); }
function hunchLabel(){ return 'Sam’s hunch'; }
function gutLabel(){ return 'Dean’s gut'; }
const JR_BIND=[];
function clueBadge(c,k){ return ''; }
function samHunch(cid){
  const c=CASES[cid]; if(!canHunch()||S.inv.hint[cid]>=hunchMax(cid)) return null;
  const L=c.links.find(l=>!haveLink(cid,l.id)&&clueHave(c,l.a)&&clueHave(c,l.b)); if(!L) return null;
  S.inv.hint[cid]=(S.inv.hint[cid]||0)+1; return L;
}
function hunchMax(cid){ return 1+Math.floor((S.inv.links[cid]||[]).length/2); }
function deanGut(cid){
  const c=CASES[cid]; if(!canGut()||S.inv.gut[cid]) return null;
  const wrong=c.theory.opts.filter(o=>!o.ok); if(!wrong.length) return null;
  const w=wrong[0]; S.inv.gut[cid]=w.id; return w;
}

/* close a case: the autopsy, then the morning paper */
const AUTOPSY_Q=[];
function closeCase(cid,o={}){
  if(caseClosed(cid)) return; const c=CASES[cid]; if(!c) return;
  S.inv.closed[cid]=true; S.flags['closed_'+cid]=true;
  const P=c.paper?c.paper():null;
  if(P){ const photo=P.photo?bestPhoto(P.photo):null;
    S.inv.news.push({cid,title:c.title,head:P.head,deck:P.deck,body:P.body,by:P.by||'Ledger staff',photo:photo?photo.id:null,
      photoThumb:photo?photo.thumb:null,cap:P.cap||'',date:P.date||null,forum:c.forum?c.forum():[],ed:S.inv.news.length+1}); }
  if(!o.quiet) AUTOPSY_Q.push(cid);
}
function bestPhoto(subjects){ for(const s of [].concat(subjects)){ const p=GALLERY.find(x=>x.subjects&&x.subjects.includes(s)); if(p) return p; } return null; }
function updateCases(dt){
  if(!AUTOPSY_Q.length||!S.running||S.cut||dlg.open||S.menu||S.caseOpen||S.phoneOpen||S.cardQ.length||S.transition>0||S.dead) return;
  showAutopsy(AUTOPSY_Q.shift());
}

/* ── the journal ──────────────────────────────────────────────────────── */
const JR={tab:null,sel:[],msg:'',flash:null};
const elJournal=(()=>{ const vp=document.getElementById('vp'), d=document.createElement('div'); d.id='journal'; vp&&vp.appendChild&&vp.appendChild(d); return d; })();
function openJournal(tab){
  if(!S.running||S.cut||dlg.open) return;
  S.caseOpen=true; S.caseSeen=S.notes.length; document.exitPointerLock?.(); clearHeld();
  if(tab) JR.tab=tab; else if(!JR.tab||(JR.tab!=='people'&&JR.tab!=='notes'&&!CASES[JR.tab]?.open())){ const L=caseList().filter(c=>!caseClosed(c.id)), unseen=c=>Object.keys(c.clues).filter(k=>clueHave(c,k)&&!S.inv.seen[c.id+':'+k]).length;
    L.sort((a,b)=>unseen(b)-unseen(a)||a.n-b.n); JR.tab=(L[0]||caseList().at(-1)||{id:'notes'}).id; }
  JR.sel=[]; JR.msg=''; elJournal.classList.add('on'); sfx('switch'); renderJournal();
}
function closeJournal(){ S.caseOpen=false; elJournal.classList.remove('on'); }
const KIND_ICON={doc:'▤',talk:'❝',photo:'◉',place:'⌖',note:'✎',record:'▦',sound:'♪'};
function renderJournal(){
  const L=caseList(); let h='<div class="jr-book"><div class="jr-tabs">';
  for(const c of L){ const n=c.clues?Object.keys(c.clues).filter(k=>clueHave(c,k)&&!S.inv.seen[c.id+':'+k]).length:0;
    h+=`<button class="jr-tab${JR.tab===c.id?' on':''}${caseClosed(c.id)?' closed':''}" data-tab="${c.id}"><small>${esc_(c.kicker||'')}</small>${esc_(c.title)}${n?`<em>${n}</em>`:''}</button>`; }
  h+=`<button class="jr-tab${JR.tab==='people'?' on':''}" data-tab="people"><small>Who’s who</small>People</button>`;
  h+=`<button class="jr-tab${JR.tab==='notes'?' on':''}" data-tab="notes"><small>Everything</small>Notes</button>`;
  h+=`<button class="jr-tab${JR.tab==='log'?' on':''}" data-tab="log"><small>Every line</small>Transcript</button>`;
  h+=`<button class="jr-x" data-close>Close · Esc</button></div><div class="jr-page">`;
  const c=CASES[JR.tab];
  if(c){
    h+=`<header><small>${esc_(c.kicker||'')} · ${caseClosed(c.id)?'Closed':'Open'}</small><h2>${esc_(c.title)}</h2><p>${esc_(typeof c.summary==='function'?c.summary():c.summary)}</p></header>`;
    /* evidence: what you observed, then what people told you */
    const ks=Object.keys(c.clues), have=ks.filter(k=>clueHave(c,k)), miss=ks.length-have.length;
    const card=k=>{ const q=c.clues[k]; S.inv.seen[c.id+':'+k]=true;
      const img=q.img?q.img():null, used=c.links.some(l=>haveLink(c.id,l.id)&&(l.a===k||l.b===k)), sel=JR.sel.includes(k), hint=JR.flash&&(JR.flash.a===k||JR.flash.b===k);
      const ann=(S.inv.ann&&S.inv.ann[c.id+':'+k])||null, tr=q.k==='talk'&&q.trust?trustWord(q.trust):'';
      return `<button class="jr-card k-${q.k}${sel?' sel':''}${used?' used':''}${hint?' hint':''}" data-clue="${k}">${img?`<img src="${img}" alt="">`:''}<i>${KIND_ICON[q.k]||'•'}</i><b>${esc_(q.t)}</b><span>${esc_(typeof q.x==='function'?q.x():q.x)}</span>${q.who?`<small>${esc_(q.who)}${tr?' · '+tr:''}</small>`:''}${ann?`<em class="ann">${esc_(ann)}</em>`:''}${clueBadge(c,k)}</button>`; };
    const facts=have.filter(k=>c.clues[k].k!=='talk'), claims=have.filter(k=>c.clues[k].k==='talk');
    const mf=ks.filter(k=>c.clues[k].k!=='talk').length-facts.length, mc=ks.filter(k=>c.clues[k].k==='talk').length-claims.length;
    h+=`<h3>Evidence <i>what you observed</i><span>${facts.length} found${mf?` · ${mf} not found`:''}</span></h3><div class="jr-cards">`;
    h+=facts.map(card).join(''); for(let i=0;i<mf;i++) h+=`<div class="jr-card missing"><b>███████</b><span>Not found yet.</span></div>`;
    h+='</div>';
    h+=`<h3>Witnesses <i>what people claim</i><span>${claims.length} heard${mc?` · ${mc} not yet`:''}</span></h3><div class="jr-cards">`;
    h+=claims.map(card).join('')||(mc?'':'<p class="jr-empty">No testimony in this case.</p>'); for(let i=0;i<mc;i++) h+=`<div class="jr-card missing"><b>███████</b><span>Someone you haven’t asked.</span></div>`;
    h+='</div>';
    if(!caseClosed(c.id)||c.links.some(l=>!haveLink(c.id,l.id))){
      h+=`<div class="jr-bar"><span>${JR.sel.length===2?'Connect these two?':JR.sel.length===1?'Pick a second piece of evidence.':'Pick two pieces of evidence to connect them.'}</span>`
        +(JR.sel.length===2?'<button data-link>Connect</button>':'')
        +(canHunch()&&(S.inv.hint[c.id]||0)<hunchMax(c.id)?`<button data-hunch title="Reads patterns">${hunchLabel()}</button>`:'')
        +'</div>';
      if(JR.msg) h+=`<div class="jr-msg">${esc_(JR.msg)}</div>`;
    }
    /* deductions */
    const D=c.links.filter(l=>haveLink(c.id,l.id));
    h+=`<h3>Deductions <span>${D.length} of ${c.links.length}</span></h3>`;
    if(!D.length) h+='<p class="jr-empty">Nothing connected yet.</p>';
    for(const l of D){ const mine=isDean()?l.dean:l.sam, theirs=isDean()?l.sam:l.dean;
      h+=`<div class="jr-ded${JR.flash&&JR.flash.id===l.id&&JR.flash.fresh?' fresh':''}"><b>${esc_(l.t)}</b><p>${esc_(l.x)}</p>`
        +(mine?`<p class="v ${S.hero}">${esc_(SPEAKERS[S.hero].name)}: “${esc_(mine)}”</p>`:'')
        +(theirs?`<p class="v ${brother()}">${esc_(SPEAKERS[brother()].name)}: “${esc_(theirs)}”</p>`:'')
        +(l.opens?`<p class="opens">Opens: ${esc_(l.opens)}</p>`:'')+'</div>'; }
    /* open questions */
    const Q=openQuestions(c);
    if(Q.length){ h+='<h3>Open questions</h3><ul class="jr-q">'+Q.map(q=>`<li>${esc_(q)}</li>`).join('')+'</ul>'; }
    /* theory */
    h+=theoryBlock(c,D);
    /* what happened afterwards */
    if(caseClosed(c.id)){ h+='<div class="jr-after"><button data-autopsy>Read the autopsy</button>'+(S.inv.news.some(n=>n.cid===c.id)?'<button data-paper>Read the Ledger</button>':'')+'</div>'; }
  }
  else if(JR.tab==='people'){
    h+='<header><small>Oakhaven</small><h2>People</h2><p>Who you’ve met, and what you know.</p></header><div class="jr-people">';
    for(const p of PEOPLE){ if(!S.flags[p.flag]) continue; const look=typeof p.look==='function'?p.look():p.look, nm=typeof p.name==='function'?p.name():p.name, ln=typeof p.line==='function'?p.line():p.line;
      let src=''; try{ src=portraitCanvas(look,0).toDataURL(); }catch(e){}
      h+=`<div class="jr-person">${src?`<img src="${src}" alt="">`:''}<b>${esc_(nm)}</b><span>${esc_(ln)}</span>${personExtra(p)}</div>`; }
    h+='</div>';
  }
  else if(JR.tab==='log'){
    h+='<header><small>Every line</small><h2>Transcript</h2><p>Everything that was said, most recent first.</p></header><div class="jr-log">';
    let place=null;
    for(const l of (S.transcript||[]).slice().reverse()){ if(l.place!==place){ place=l.place; h+=`<h4>${esc_(place)}</h4>`; }
      h+=`<p class="${l.who==='narr'?'n':''}">${l.nm?`<b>${esc_(l.nm)}</b> `:''}${esc_(l.text)}</p>`; }
    h+=(S.transcript||[]).length?'':'<p class="jr-empty">Nothing yet.</p>';
  }
  else {
    h+='<header><small>Everything</small><h2>Notes</h2></header><div class="jr-notes">';
    h+=S.notes.slice().reverse().map(n=>{ const N=noteView(n); return `<div class="${N.edited?'edited':''}"><b>${esc_(N.title)}</b>${N.struck?`<p class="struck">${esc_(N.struck)}</p>`:''}<p>${esc_(N.text)}</p>${N.ann.map(a=>`<em class="ann ${a.who}">${esc_(a.text)}</em>`).join('')}${N.edited?'<small class="edit">this entry has been edited</small>':''}</div>`; }).join('')||'<p class="jr-empty">Nothing yet.</p>';
    h+='</div>';
  }
  h+='</div></div>';
  elJournal.innerHTML=h;
  const on=(sel,fn)=>elJournal.querySelectorAll(sel).forEach(b=>b.onclick=ev=>{ ev.stopPropagation(); fn(b); });
  on('[data-tab]',b=>{ JR.tab=b.dataset.tab; JR.sel=[]; JR.msg=''; JR.flash=null; renderJournal(); });
  on('[data-close]',()=>closeJournal());
  on('[data-clue]',b=>{ const k=b.dataset.clue; JR.flash=null; JR.msg='';
    if(JR.sel.includes(k)) JR.sel=JR.sel.filter(x=>x!==k); else { JR.sel.push(k); if(JR.sel.length>2) JR.sel.shift(); }
    sfx('switch'); renderJournal(); });
  on('[data-link]',()=>{ const [a,b]=JR.sel, r=tryLink(JR.tab,a,b); JR.sel=[];
    JR.msg=r.ok?'':r.msg; JR.flash=r.ok?{id:r.link.id,fresh:true}:null; if(!r.ok) sfx('deny'); renderJournal(); });
  on('[data-hunch]',()=>{ const L=samHunch(JR.tab); JR.flash=L?{a:L.a,b:L.b}:null; JR.msg=L?'Sam: “Look at those two together.”':'Sam: “Nothing’s jumping out. We need more.”'; renderJournal(); });
  on('[data-gut]',()=>{ const w=deanGut(JR.tab); JR.msg=w?'Dean: “Not that one. I don’t know why. Not that one.”':''; renderJournal(); });
  on('[data-theory]',b=>{ const id=b.dataset.theory, o=CASES[JR.tab].theory.opts.find(x=>x.id===id);
    closeJournal(); openMenu('Commit to this?',o.t+'\n\nYou can’t take it back.',[
      {text:'Yes. That’s what happened.',act:()=>{ commitTheory(JR.tab,id); openJournal(JR.tab); }},{text:'Not yet.',act:()=>openJournal(JR.tab)}]); });
  on('[data-autopsy]',()=>{ closeJournal(); showAutopsy(JR.tab,true); });
  for(const f of JR_BIND) try{ f(on); }catch(e){ console.error(e); }
  on('[data-paper]',()=>{ const n=S.inv.news.find(x=>x.cid===JR.tab); closeJournal(); showPaper(n,true); });
}
function theoryBlock(c,D){ let h='';
    const T=c.theory, t=theoryOf(c.id);
    if(T){ h+=`<h3>Theory</h3><div class="jr-theory"><p class="q">${esc_(T.q)}</p>`;
      if(t){ const o=T.opts.find(x=>x.id===t); h+=`<p class="pick ${o.ok?'right':'wrong'}">You said: ${esc_(o.t)}</p>`+(caseClosed(c.id)?`<p class="verdict">${esc_(o.ok?T.right:T.wrong)}</p>`:'<p class="verdict">Committed. You’ll find out if it holds.</p>'); }
      else if(!D.length) h+='<p class="jr-empty">Connect some evidence first.</p>';
      else { for(const o of T.opts){ const struck=S.inv.gut[c.id]===o.id;
          h+=`<button class="jr-opt${struck?' struck':''}" data-theory="${o.id}"${struck?' disabled':''}>${esc_(o.t)}${struck?' <small>(${gutLabel()}: no)</small>':''}</button>`; }
        if(canGut()&&!S.inv.gut[c.id]) h+=`<button class="jr-gut" data-gut>${gutLabel()}</button>`;
        h+='<p class="jr-warn">You only get to commit once.</p>'; }
      h+='</div>'; }
  return h; }
function personExtra(p){ const f=S.flags, x=[];
  if(p.flag==='met_nurse'&&f.halvorsen_trusted) x.push('Trusted you with the clinic records.');
  if(p.flag==='met_sarah'&&f.sarah_crew) x.push('Knows all six were line three.');
  return x.length?`<small>${esc_(x.join(' '))}</small>`:''; }

/* ── the autopsy ──────────────────────────────────────────────────────── */
const elAut=(()=>{ const vp=document.getElementById('vp'), d=document.createElement('div'); d.id='autopsy'; vp&&vp.appendChild&&vp.appendChild(d); return d; })();
let AUT=null;
function showAutopsy(cid,replay){
  const c=CASES[cid]; if(!c||!c.autopsy) return;
  const A=c.autopsy(); AUT={cid,replay,back:S.menu==='end'?'end':null};
  S.menu='autopsy'; document.exitPointerLock?.(); clearHeld();
  const lay=(n,t,x)=>`<section><small>Layer 0${n}</small><h4>${t}</h4>${[].concat(x).map(p=>`<p>${esc_(p)}</p>`).join('')}</section>`;
  const T=c.theory&&theoryOf(cid)?c.theory.opts.find(o=>o.id===theoryOf(cid)):null;
  elAut.innerHTML=`<div class="au-sheet"><small class="k">Case autopsy · ${esc_(c.kicker||'')}</small><h2>${esc_(c.title)}</h2>`
    +(T?`<p class="th ${T.ok?'right':'wrong'}">Your theory: ${esc_(T.t)} <b>${T.ok?'— it held.':'— it didn’t.'}</b></p>`:'<p class="th">You never committed to a theory.</p>')
    +lay(1,'What happened',A.what)+lay(2,'What caused it',A.cause)+lay(3,'What remains unresolved',A.open)
    +`<div class="au-v"><p class="dean"><b>Dean</b> ${esc_(A.dean||'')}</p><p class="sam"><b>Sam</b> ${esc_(A.sam||'')}</p></div>`
    +`<div class="au-btns"><button data-next>${S.inv.news.some(n=>n.cid===cid)?'The next morning →':'Close'}</button></div></div>`;
  elAut.classList.add('on'); sfx('bell');
  const nb_=elAut.querySelector('[data-next]'); if(nb_) nb_.onclick=autopsyNext;
}
function autopsyNext(){
  if(!AUT) return; if(AUT.paper){ paperDone(); return; }
  const {cid,replay,back}=AUT;
  const n=S.inv.news.find(x=>x.cid===cid);
  if(n){ showPaper(n,replay); return; }
  AUT=null; elAut.classList.remove('on'); elAut.innerHTML=''; S.menu=back||null;
}
function paperDone(){ const replay=AUT&&AUT.replay, back=AUT&&AUT.back; elAut.classList.remove('on'); elAut.innerHTML=''; S.menu=back||null; AUT=null;
  if(!replay){ toast('The Ledger is on your phone — News'); S.newsUnread=(S.newsUnread||0)+1; } }
function showPaper(n,replay){
  if(!n){ elAut.classList.remove('on'); S.menu=null; return; }
  const back=(AUT&&AUT.back)||(S.menu==='end'?'end':null); S.menu='autopsy'; AUT={cid:n.cid,replay,paper:true,back};
  const date=n.date||'Sunday, October 4';
  elAut.innerHTML=`<div class="np"><div class="np-mast">The Oakhaven Ledger</div><div class="np-ed">${date} · Morning edition · No. ${4100+n.ed} · 50¢</div>`
    +`<h2>${esc_(n.head)}</h2><p class="np-deck">${esc_(n.deck)}</p><p class="np-by">By ${esc_(n.by)}</p>`
    +(n.photoThumb?`<figure><img src="${(GALLERY.find(p=>p.id===n.photo)||{}).data||n.photoThumb}" alt=""><figcaption>${esc_(n.cap||'Photo submitted by a reader.')}</figcaption></figure>`:'')
    +`<div class="np-cols">${n.body.map(p=>`<p>${esc_(p)}</p>`).join('')}</div>`
    +`<div class="np-forum"><div class="fh">OakhavenTalk › Local news › “${esc_(n.head)}”</div>${n.forum.map(f=>`<div class="fp"><b>${esc_(f.u)}</b><span>${esc_(f.t)}</span></div>`).join('')}</div>`
    +`<div class="au-btns"><button data-done>Fold the paper</button></div></div>`;
  elAut.classList.add('on'); sfx('switch');
  const b=elAut.querySelector('[data-done]'); if(b) b.onclick=paperDone;
  if(!replay) S.flags['read_paper_'+n.cid]=true;
}

function addSector(s){ s.ambBase=s.ambient; SECTORS[s.id]=s; pack(s); return s; }
/* ── interactables with behaviour: e.use = key into USES ───────────────── */
const USES={};
/* ── the Impala as a hub: drive somewhere, talk it over, the radio ─────── */
const DESTS={};       // id → {name, sector, x,y,a, avail:()=>bool, why}
function defDest(d){ DESTS[d.id]=d; }
function driveTo(id){
  const d=DESTS[id]; if(!d) return;
  if(d.blocked&&d.blocked()){ say('narr',d.blocked(),4,{now:true}); return; }
  S.transition=1.1; S.pending={to:d.sector,x:d.x,y:d.y,a:d.a}; sfx('engine'); toast(`Driving — ${d.name}`);
  if(d.onArrive) later(.8,d.onArrive);
}
function hubMenu(car){
  const opts=Object.values(DESTS).filter(d=>d.avail()&&d.sector!==S.sector.id).map(d=>({text:'Drive to '+d.name,note:d.note?d.note():'',act:()=>driveTo(d.id)}));
  const items=[];
  if(S.sector.id==='street') items.push({text:'Drive', act:()=>enterCar(car)});
  items.push(...opts);
  items.push({text:'Talk it over with '+(isDean()?'Sam':'Dean'),act:impalaTalk},{text:'Turn on the radio',act:radio},
    {text:'Open the trunk', note:S.trunk>0?`resupply ×${S.trunk}`:'empty for now', act:openTrunk},
    {text:'Change clothes', act:openWardrobe},{text:'Leave it'});
  openMenu('The Impala','A black 1967 four-door, older than both of you. The closest thing either of you has had to a house.',items);
}
/* a parked Impala in a remote sector */
const impala_=(x,y,face)=>({kind:'vehicle',car:'sedan_black',name:'Impala',x,y,r:.75,h:1.45,face,speed:0,parked:true});

/* what the brothers say about the open case */
function impalaTalk(){
  const c=caseList().filter(c=>!caseClosed(c.id)).at(-1)||caseList().at(-1);
  const lines=c&&c.talk?c.talk():[[brother(),'We keep driving. That’s the plan. That’s always been the plan.']];
  lines.forEach(([w,t],i)=>say(w,t,null,{now:i===0}));
}
const RADIO=[];      // {when:()=>bool, lines:[...]} — the newest match plays
function radio(){
  const R=RADIO.filter(r=>r.when()).at(-1); sfx('static');
  if(!R){ say('narr','Static. Under it, very faintly, a bell.',3,{now:true}); return; }
  R.lines.forEach((t,i)=>say('caller',t,null,{now:i===0,name:R.name||'KOAK 1340 AM'})); if(R.fx) R.fx();
}
