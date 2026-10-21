/* ═══ Co-op screens ═════════════════════════════════════════════════════════
   The title screen gets a “Two players” row: create a campaign, join one,
   resume, recover. In play: a small status badge, a feed at the edge of the
   screen, the campaign board (I) and the campaign panel (pause menu). */

const coopEl=(id,parent)=>{ const d=document.createElement('div'); d.id=id; const p=parent||document.body; p&&p.appendChild&&p.appendChild(d); return d; };
const elLobby=coopEl('coopLobby');
const elBoard=coopEl('coopBoard',document.getElementById('vp'));
const elFeed=coopEl('coopFeed',document.getElementById('vp'));
const elCoopHud=coopEl('coopHud',document.getElementById('vp'));
const qa_=(root,sel,fn)=>{ (root.querySelectorAll(sel)||[]).forEach(b=>{ b.onclick=ev=>{ ev&&ev.stopPropagation&&ev.stopPropagation(); fn(b,ev); }; }); };
const val_=(root,sel)=>{ const e=root.querySelector(sel); return e?String(e.value||'').trim():''; };
function copyText(t){ try{ navigator.clipboard.writeText(t); toast('Copied'); }catch(e){ toast('Select the text and copy it'); } }
function downloadJSON(name,obj){ try{ const u=URL.createObjectURL(new Blob([JSON.stringify(obj)],{type:'application/json'})), a=document.createElement('a'); a.href=u; a.download=name; document.body.appendChild(a); a.click(); a.remove(); }catch(e){ toast('Couldn’t make the file here'); } }
const ROLE_BLURB={observer:'Reads records, timelines and photographs. Sees altered documents, finds the pattern, and can tell which theory the evidence actually supports. Can over-read.',
  interrogator:'Reads people. Witnesses open up to him; some will talk to nobody else. Can push, protect or confront, and knows which theory is wrong. Can push too hard.'};

/* ── the feed and the badge ────────────────────────────────────────────── */
function renderFeed(){ if(!COOP.on){ elFeed.classList.remove('on'); return; } elFeed.classList.add('on');
  const now=S.time||0, L=COOP.feed.slice(-5);
  elFeed.innerHTML=L.map(m=>`<div class="cf ${m.kind||''}" style="animation-delay:-${Math.max(0,now-(m.at||0)).toFixed(1)}s"><i>${esc_(m.t)}</i>${m.who?`<b>${esc_(m.who)}</b> `:''}${esc_(m.text)}</div>`).join(''); }
function coopWaiting(){ if(!COOP.on||!coopState()) return 0; let n=0;
  for(const id of jointIds()){ const s=jointState(id), rd=jointRound(id); if(rd&&!(rd===1?s.r1:s.r2)[COOP.seat]) n++; }
  return n+Object.values(myPriv().notes||{}).filter(x=>!x.shared).length; }
function coopHud(){ if(!COOP.on){ elCoopHud.classList.remove('on'); return; } elCoopHud.classList.add('on');
  const st=COOP.client?COOP.client.status:'offline', w=coopWaiting();
  const dot=st==='online'?(partnerOnline()?'on':'half'):'off';
  elCoopHud.innerHTML=`<span class="dot ${dot}"></span>${esc_(heroLabel(COOP.hero))} · ${esc_(roleLabel(COOP.role))}<small>${esc_(coopStatusWord())}</small>${w?`<em title="Things waiting on you — I">${w}</em>`:''}`; }

/* ── the board ─────────────────────────────────────────────────────────── */
const BOARD={open:false,tab:'now',msg:''};
function jointIds(){ const SH=coopShared(), ids=new Set(Object.keys(JOINT).filter(id=>{ try{ return JOINT[id].avail&&JOINT[id].avail(); }catch(e){ return false; } }));
  for(const k of Object.keys(SH.votes||{})) ids.add(k.replace(/-r2$/,''));
  return [...ids].filter(id=>jointDef(id)&&!(SH.final||{})[id]); }
function openBoard(tab){ if(!COOP.on||!S.running||S.cut) return; if(dlg.open) closeDlg(); if(S.caseOpen&&!BOARD.open) closeJournal();
  BOARD.open=true; S.caseOpen=true; if(tab) BOARD.tab=tab; document.exitPointerLock?.(); clearHeld(); elBoard.classList.add('on'); sfx('switch'); renderBoard(); }
function closeBoard(){ BOARD.open=false; S.caseOpen=false; elBoard.classList.remove('on');
  if(BOARD.tab==='chron'&&COOP.meta){ COOP.meta.seenChron=(coopState()&&coopState().chron||[]).length; coopStoreMeta(COOP.meta); } coopHud(); }
{ const was=closeJournal; closeJournal=function(){ if(BOARD.open){ closeBoard(); return; } was(); }; }
{ const was=inputDown; inputDown=function(code,e){ if(BOARD.open&&codesOf('coopBoard').includes(code)){ closeBoard(); return; } return was(code,e); }; }
function jointCard(id){ const J=jointDef(id), s=jointState(id), rd=jointRound(id), me=COOP.seat, pa=partnerSeat(), P=esc_(partnerName());
  const opt=x=>esc_((J.opts.find(o=>o.id===x)||{}).t||x);
  let h=`<div class="cb-joint"><small>${J.theory?'Theory · sealed':J.sealed?'Joint decision · sealed · permanent':'Joint decision · permanent'}</small><h4>${esc_(J.title)}</h4><p>${esc_(J.q||'')}</p>`;
  if(J.theory){ const mine=(rd===1?s.r1:s.r2)[me]; h+=mine?`<p class="w">You answered. ${rd===2?'Waiting for '+P+' to answer the debate.':'Waiting for '+P+'.'}</p>`:`<p class="w">${rd===2?'You disagree. The debate is open in the case file.':'Answer it in the case file.'}</p><button data-jcase="${esc_(J.theory)}">Open the case file</button>`; return h+'</div>'; }
  if(rd===2) h+=`<div class="co-debate"><p><b>You</b> ${opt(s.r1[me])}</p><p><b>${P}</b> ${opt(s.r1[pa])}</p></div>`;
  const mine=(rd===1?s.r1:s.r2)[me];
  if(mine) h+=`<p class="w">You chose: ${opt(mine)}. ${partnerOnline()?'Waiting for '+P+'.':P+' is away; this waits for them.'}</p>`;
  else { if(!J.sealed&&rd===1&&s.r1[pa]) h+=`<p class="w">${P} chose: ${opt(s.r1[pa])}</p>`;
    if(rd===2){ h+=`<button class="jo" data-jv="${id}|${s.r1[me]}">Stand by mine</button><button class="jo" data-jv="${id}|${s.r1[pa]}">Go with ${P}’s</button><p class="w">If you still disagree after this, it’s recorded that way.</p>`; }
    else for(const o of J.opts) h+=`<button class="jo" data-jv="${id}|${o.id}">${esc_(o.t)}</button>`; }
  return h+'</div>'; }
function renderBoard(){ if(!BOARD.open) return; const C=coopState(), T=BOARD.tab, me=COOP.seat, P=esc_(partnerName());
  const tabs=[['now','Waiting on you'],['notebook','Your notebook'],['ledger','Contradictions'],['chron','Chronicle'],['people','People']];
  let h=`<div class="jr-book cb"><div class="jr-tabs">`+tabs.map(([k,l])=>`<button class="jr-tab${T===k?' on':''}" data-bt="${k}">${l}${k==='notebook'?` <em>${Object.values(myPriv().notes||{}).filter(x=>!x.shared).length||''}</em>`:''}</button>`).join('')
    +`<button class="jr-x" data-bx>Close · I</button></div><div class="jr-page">`;
  if(!C){ h+='<p class="jr-empty">The campaign hasn’t loaded yet.</p>'; }
  else if(T==='now'){ const ids=jointIds();
    h+=`<header><small>${esc_(C.title)} · ${esc_(coopStatusWord())}</small><h2>The board</h2><p>You are ${esc_(heroLabel(COOP.hero))}, the ${esc_(roleLabel(COOP.role))}. ${P} is ${esc_(heroLabel(partnerHero()))}, the ${esc_(roleLabel(seatInfo(partnerSeat()).role))}.</p></header>`;
    h+=ids.length?ids.map(jointCard).join(''):'<p class="jr-empty">Nothing is waiting on both of you right now.</p>';
    const SH=C.shared||{}, cl=Object.values(SH.clues||{}), mine=cl.filter(x=>x.by===me).length;
    h+=`<h3>The shared file</h3><p class="cb-p">${mine} piece${mine===1?'':'s'} of evidence from you, ${cl.length-mine} from ${P}. ${Object.keys(SH.links||{}).length} deduction${Object.keys(SH.links||{}).length===1?'':'s'}.</p><button data-jcase="rot">Open the case file (J)</button>`;
    if(CASES.rot&&!S.flags.ch1_done){ const Q=openQuestions(CASES.rot); if(Q.length) h+='<h3>Open questions — The Rot</h3><ul class="jr-q">'+Q.map(q=>`<li>${esc_(q)}</li>`).join('')+'</ul>'; }
    const done=Object.entries(SH.final||{}); if(done.length) h+='<h3>Settled</h3>'+done.map(([id,f])=>{ const J=jointDef(id); if(!J) return ''; const o=(J.opts.find(x=>x.id===f.pick)||{}).t;
      return `<p class="cb-p"><b>${esc_(J.title)}</b> — ${f.pick?esc_(o)+(f.how==='debated'?' (after a debate)':''):'contested'}</p>`; }).join(''); }
  else if(T==='notebook'){ const N=Object.entries(myPriv().notes||{}).sort((a,b)=>(b[1].t||0)-(a[1].t||0));
    h+=`<header><small>Only you can see this</small><h2>Your notebook</h2><p>What people told you, what you heard and what you saw that nobody else did. Share what you choose; ${P} only knows what you share or what they found themselves.</p></header>`;
    h+=N.length?N.map(([id,n])=>`<div class="cb-note${n.shared?' sh':''}"><b>${esc_(n.title)}</b>${n.who?`<small>${esc_(n.who)}</small>`:''}<p>${esc_(n.text)}</p>${n.shared?'<i>shared</i>':`<button data-share="${esc_(id)}">Share with ${P}</button>`}</div>`).join(''):'<p class="jr-empty">Nothing private yet.</p>';
    const SN=(C.shared.notes||[]).filter(n=>n.by!==me); if(SN.length) h+=`<h3>What ${P} shared</h3>`+SN.map(n=>`<div class="cb-note sh"><b>${esc_(n.title)}</b><p>${esc_(n.text)}</p></div>`).join(''); }
  else if(T==='ledger'){ const R=ledgerRows();
    h+=`<header><small>Claims that can’t all be true</small><h2>Contradiction ledger</h2><p>Your account and ${P}’s, side by side. Things you can both check for yourselves are marked; agreeing on those is how you find out what’s real.</p></header>`;
    h+=R.length?`<div class="cb-ledger">`+R.map(r=>`<div class="lr ${r.status}"><div class="lt"><b>${esc_(r.title)}</b>${r.verifiable?'<small>you can both check this</small>':''}<em>${{agree:'agree',contradiction:'contradiction',waiting:'waiting for '+P,flag:'not freely given'}[r.status]}</em></div>`
      +`<p><i>You</i> ${r.mine?esc_(r.mine.text):'—'}</p>${r.status!=='flag'?`<p><i>${P}</i> ${r.theirs?esc_(r.theirs.text):'—'}</p>`:''}</div>`).join('')+'</div>':'<p class="jr-empty">No contradictions yet. That won’t last.</p>'; }
  else if(T==='chron'){ const L=C.chron||[], seen=COOP.meta.seenChron||0;
    h+=`<header><small>${esc_(C.title)}</small><h2>Chronicle</h2><p>Discoveries, theories, decisions, and what changed between people. The newest is at the bottom.</p></header><div class="cb-chron">`;
    L.forEach((e,i)=>{ if(i===seen&&seen>0&&seen<L.length) h+='<div class="cb-since">since you were last here</div>';
      const d=e.t?new Date(e.t):null; h+=`<p class="k-${esc_(e.kind||'')}"><i>${d?esc_(d.toLocaleDateString(undefined,{month:'short',day:'numeric'})+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')):''}</i>${esc_(e.text)}</p>`; });
    h+='</div>'; }
  else if(T==='people'){ const me_=S.hero, who=[partnerHero(),'sarah'].concat(S.flags.lil_met?['lilith']:[]);
    h+=`<header><small>How things stand</small><h2>People</h2><p>How you feel is yours. How they feel, you can only read as well as you understand them.</p></header>`;
    for(const x of who){ const out=relGet(me_,x), back=relGet(x,me_), can=out.understanding>=2||x===partnerHero();
      h+=`<div class="cb-person"><b>${esc_(relName(x))}</b><p><i>You</i> ${esc_(relWords(out,x==='lilith'?'self':''))}</p><p><i>${esc_(relName(x))}</i> ${can?esc_(relWords(back,'')):'you can’t read them well enough yet'}</p></div>`; }
    const H=relHistory().filter(r=>r.a===me_||r.b===me_).slice(-8).reverse();
    if(H.length) h+='<h3>Lately</h3>'+H.map(r=>`<p class="cb-p">${esc_(relName(r.a))} → ${esc_(relName(r.b))}: ${esc_(r.why)}${r.pub?'':' <small>(private)</small>'}</p>`).join(''); }
  h+='</div></div>'; elBoard.innerHTML=h;
  qa_(elBoard,'[data-bt]',b=>{ if(BOARD.tab==='chron'&&COOP.meta){ COOP.meta.seenChron=(coopState().chron||[]).length; coopStoreMeta(COOP.meta); } BOARD.tab=b.dataset.bt; renderBoard(); });
  qa_(elBoard,'[data-bx]',()=>closeBoard());
  qa_(elBoard,'[data-share]',b=>{ shareNote(b.dataset.share); renderBoard(); });
  qa_(elBoard,'[data-jcase]',b=>{ closeBoard(); openJournal(b.dataset.jcase); });
  qa_(elBoard,'[data-jv]',b=>{ const [id,ch]=b.dataset.jv.split('|'); const J=jointDef(id);
    const go=()=>{ jointVote(id,ch); openBoard(); };
    if(J&&!J.theory){ closeBoard(); openMenu('Commit to this?',(J.opts.find(o=>o.id===ch)||{}).t+`\n\nThis needs both of you, and it can’t be undone.`,[{text:'Yes.',act:go},{text:'Not yet.',act:()=>openBoard()}]); }
    else go(); });
}

/* ── the lobby, on the title screen ────────────────────────────────────── */
const LOBBY={view:'home',msg:'',join:null,client:null,offer:null,created:null,code:null,back:null};
function openLobby(view,o={}){ LOBBY.view=view||'home'; LOBBY.msg=o.msg||''; Object.assign(LOBBY,o); elLobby.classList.add('on'); renderLobby(); }
function closeLobby(){ elLobby.classList.remove('on'); if(LOBBY.client&&LOBBY.view!=='started'){ try{ LOBBY.client.close(); }catch(e){} LOBBY.client=null; } }
function lobbyCampaigns(){ return coopList().map(coopMeta).filter(Boolean).sort((a,b)=>(b.last||0)-(a.last||0)); }
function renderLobby(){ const V=LOBBY.view; let h='<div class="st-box co-lb"><h1>Two players</h1>';
  if(V==='home'){
    h+=`<div class="st-sub">One campaign, two brothers, two people. Each of you walks your own copy of Oakhaven; the case, the decisions and the people are shared. Neither of you can solve it alone. Talk over whatever voice or text chat you already use; the game gives you different things to talk about.</div>`;
    const L=lobbyCampaigns();
    if(L.length){ h+='<h2>Your campaigns</h2>'; for(const m of L){ const st=m.replica, p=st&&st.seats?Object.entries(st.seats).find(([k])=>k!==m.seat):null, pn=p?(p[1].name||heroLabel(p[1].hero)):'';
      h+=`<div class="co-camp"><div><b>${esc_(m.title||m.cid)}</b><small>${esc_(heroLabel(m.hero))}, the ${esc_(roleLabel(m.role))}${m.seat==='A'?' · host':''}${pn?' · with '+esc_(pn):p&&!p[1].claimed?' · nobody in the other seat yet':''}${st&&st.closed?' · closed':''} · ${m.last?esc_(ago(m.last)):''}</small></div>`
        +`<button class="opt on" data-res="${esc_(m.cid)}">Resume</button><button class="opt" data-forget="${esc_(m.cid)}">Forget</button></div>`; } }
    h+=`<div class="st-btns"><button class="opt" data-v="create">Create a campaign</button><button class="opt" data-v="join">Join with an invitation</button><button class="opt" data-v="recover">Recover access</button><button class="opt" data-close>Back</button></div>`; }
  else if(V==='create'){
    h+=`<div class="st-sub">You’ll host. Hosting means admin (inviting, removing, closing), not more story or more evidence.</div><h2>The campaign</h2>`
      +`<div class="st-row"><label>Name it</label><input type="text" class="nm-in" id="coT" maxlength="40" value="Oakhaven"></div>`
      +`<div class="st-row"><label>What should your brother call you?</label><input type="text" class="nm-in" id="coN" maxlength="24" placeholder="your name"></div>`
      +`<h2>Your brother <small>locked for this campaign</small></h2><div class="co-pick">`+COOP_HEROES.map(x=>`<button class="opt${LOBBY.hero===x?' on':''}" data-hero="${x}">${heroLabel(x)}</button>`).join('')+`</div>`
      +`<h2>Your role <small>locked; your brother gets the other one</small></h2><div class="co-pick">`+COOP_ROLES.map(r=>`<button class="opt co-role${LOBBY.role===r?' on':''}" data-role="${r}"><b>The ${roleLabel(r)}</b><span>${ROLE_BLURB[r]}</span></button>`).join('')+`</div>`
      +`<h2>Connection</h2><div class="co-pick"><button class="opt${LOBBY.mode!=='server'?' on':''}" data-mode="p2p">Browser to browser</button><button class="opt${LOBBY.mode==='server'?' on':''}" data-mode="server">Campaign server</button></div>`
      +(LOBBY.mode==='server'?`<div class="st-row"><label>Server address</label><input type="text" class="nm-in" id="coS" placeholder="wss://your-server.example/ws"></div><div class="st-note">See server/README in the download. Both of you connect to it; it keeps the campaign even when you’re both away.</div>`
        :`<div class="st-note">Your browser holds the campaign. Your brother can play while you’re offline, but anything you need to decide together waits until you’re both in. Keep the campaign file (you can download it in play) in case you clear your browser.</div>`)
      +(LOBBY.msg?`<div class="co-msg">${esc_(LOBBY.msg)}</div>`:'')
      +`<div class="st-btns"><button class="opt" data-v="home">Back</button><button class="opt on" data-create>Create</button></div>`; }
  else if(V==='created'){ const m=LOBBY.created, link=coopInviteLinkFor(m);
    h+=`<div class="st-sub">“${esc_(m.title)}” is open. You are ${esc_(heroLabel(m.hero))}, the ${esc_(roleLabel(m.role))}. Send your brother the link <em>and</em>, separately, the code. The link alone doesn’t get anyone in.</div>`
      +`<h2>Invitation link</h2><div class="co-code"><code>${esc_(link)}</code><button class="opt" data-copy="${esc_(link)}">Copy</button></div>`
      +`<h2>Invitation code <small>shown once · works once · 7 days</small></h2><div class="co-code"><code class="big">${esc_(LOBBY.code)}</code><button class="opt" data-copy="${esc_(LOBBY.code)}">Copy</button></div>`
      +`<div class="st-note">They’ll be ${esc_(heroLabel(coopOther(m.hero,COOP_HEROES)))}, the ${esc_(roleLabel(coopOther(m.role,COOP_ROLES)))}. You can make a new invitation any time from the campaign panel in the pause menu.</div>`
      +`<div class="st-btns"><button class="opt on" data-start="${esc_(m.cid)}">Start playing</button></div>`; }
  else if(V==='join'){ const J=LOBBY.join||{};
    h+=`<div class="st-sub">Paste the link your brother sent and type the code they gave you. The host needs to have the campaign open (or it needs to be on a campaign server).</div>`
      +`<div class="st-row"><label>Invitation link or campaign id</label><input type="text" class="nm-in" id="coL" value="${esc_(J.cid?coopInviteLinkFor(J):'')}"></div>`
      +`<div class="st-row"><label>Invitation code</label><input type="text" class="nm-in" id="coC" maxlength="20" placeholder="XXXXX-XXXXX"></div>`
      +`<div class="st-row"><label>What should your brother call you?</label><input type="text" class="nm-in" id="coN" maxlength="24" placeholder="your name"></div>`
      +(LOBBY.msg?`<div class="co-msg">${esc_(LOBBY.msg)}</div>`:'')
      +`<div class="st-btns"><button class="opt" data-v="home">Back</button><button class="opt on" data-peek>Check the invitation</button></div>`; }
  else if(V==='offer'){ const o=LOBBY.offer;
    h+=`<div class="st-sub">“${esc_(o.title)}”${o.host?', hosted by '+esc_(o.host):''}.</div><h2>Your seat</h2>`
      +`<p class="co-offer">You’ll play <b>${esc_(heroLabel(o.hero))}</b>, <b>the ${esc_(roleLabel(o.role))}</b>.</p><p class="co-role-d">${esc_(ROLE_BLURB[o.role])}</p>`
      +(o.replacing?`<p class="co-role-d">Someone held this seat before you. You take over ${esc_(heroLabel(o.hero))} as the story left him.</p>`:'')
      +`<div class="st-note">This is permanent for this campaign, even if you reconnect from somewhere else.</div>`
      +(LOBBY.msg?`<div class="co-msg">${esc_(LOBBY.msg)}</div>`:'')
      +`<div class="st-btns"><button class="opt" data-v="home">Not now</button><button class="opt on" data-claim>Take the seat</button></div>`; }
  else if(V==='recover'){
    h+=`<div class="st-sub">If you cleared your browser or changed computers: paste your recovery code (from the campaign panel), or, if you were the host of a browser-to-browser campaign, load your campaign file.</div>`
      +`<div class="st-row"><label>Recovery code</label><input type="text" class="nm-in" id="coR" placeholder="OAK1-…"></div>`
      +`<div class="st-row"><label>Campaign file</label><input type="file" id="coF" accept=".json,application/json"></div>`
      +(LOBBY.msg?`<div class="co-msg">${esc_(LOBBY.msg)}</div>`:'')
      +`<div class="st-btns"><button class="opt" data-v="home">Back</button><button class="opt on" data-recover>Recover</button></div>`; }
  else if(V==='wait'){ h+=`<div class="st-sub">${esc_(LOBBY.msg||'Connecting…')}</div><div class="st-btns"><button class="opt" data-v="home">Cancel</button></div>`; }
  h+='</div>'; elLobby.innerHTML=h;
  qa_(elLobby,'[data-v]',b=>{ if(LOBBY.client&&b.dataset.v==='home'){ try{ LOBBY.client.close(); }catch(e){} LOBBY.client=null; } openLobby(b.dataset.v); });
  qa_(elLobby,'[data-close]',()=>closeLobby());
  qa_(elLobby,'[data-hero]',b=>{ LOBBY.hero=b.dataset.hero; lobbyKeep(); renderLobby(); });
  qa_(elLobby,'[data-role]',b=>{ LOBBY.role=b.dataset.role; lobbyKeep(); renderLobby(); });
  qa_(elLobby,'[data-mode]',b=>{ LOBBY.mode=b.dataset.mode; lobbyKeep(); renderLobby(); });
  qa_(elLobby,'[data-copy]',b=>copyText(b.dataset.copy));
  qa_(elLobby,'[data-res]',b=>lobbyResume(b.dataset.res));
  qa_(elLobby,'[data-forget]',b=>{ const m=coopMeta(b.dataset.forget);
    if(m&&m.seat==='A'&&m.mode==='p2p'){ LOBBY.msg=''; if(!lobbyConfirm('You host this campaign in this browser. Forgetting it here deletes the campaign for both of you unless you have the campaign file. Forget it anyway?')) return; coopForget(m.cid,true); }
    else coopForget(b.dataset.forget); renderLobby(); });
  qa_(elLobby,'[data-create]',()=>lobbyCreate());
  qa_(elLobby,'[data-start]',b=>{ const m=coopMeta(b.dataset.start); closeLobby(); lobbyStart(m); });
  qa_(elLobby,'[data-peek]',()=>lobbyPeek());
  qa_(elLobby,'[data-claim]',()=>lobbyClaim());
  qa_(elLobby,'[data-recover]',()=>lobbyRecover());
  const t=elLobby.querySelector('#coT'); if(t&&LOBBY.ft!=null) t.value=LOBBY.ft; const n=elLobby.querySelector('#coN'); if(n&&LOBBY.fn!=null) n.value=LOBBY.fn;
}
function lobbyKeep(){ LOBBY.ft=val_(elLobby,'#coT')||LOBBY.ft; LOBBY.fn=val_(elLobby,'#coN')||LOBBY.fn; }
function lobbyConfirm(q){ try{ return window.confirm(q); }catch(e){ return true; } }
function coopInviteLinkFor(m){ const save=COOP.meta; COOP.meta=m; const l=coopInviteLink(); COOP.meta=save; return l; }
/* host-side invitation before the session is running (browser-to-browser) */
function coopInviteOffline(meta){ const C=coopLoadAuth(meta.cid); if(!C) return null; const code=coopRand(10);
  coopApply(C,'A',{op:'invite',hash:coopCodeHash(C.id,code),exp:Date.now()+7*864e5,t:Date.now(),by:'A',v:C.v+1}); coopSaveAuth(C);
  meta.replica=coopView(C,'A'); coopStoreMeta(meta); return coopFmt(code); }
function lobbyCreate(){ lobbyKeep(); const title=LOBBY.ft||'Oakhaven', name=LOBBY.fn||'', hero=LOBBY.hero, role=LOBBY.role;
  if(!hero||!role){ LOBBY.msg='Choose your brother and your role.'; renderLobby(); return; }
  if(LOBBY.mode==='server'){ const server=val_(elLobby,'#coS'); if(!/^wss?:\/\//.test(server)){ LOBBY.msg='The server address starts with wss:// (or ws:// for testing).'; renderLobby(); return; }
    openLobby('wait',{msg:'Creating the campaign on the server…'});
    coopCreateServer({title,name,hero,role,server},(err,meta)=>{ if(err){ openLobby('create',{msg:'The server said no: '+err}); return; }
      lobbyServerInvite(meta); });
    return; }
  const meta=coopCreateLocal({title,name,hero,role,signal:COOP_NET.signal}); const code=coopInviteOffline(meta);
  openLobby('created',{created:meta,code}); }
/* on a server the invitation is made over the connection */
function lobbyServerInvite(meta){ const cl=new CoopClient(meta,coopStoreMeta);
  cl.on('status',s=>{ if(s==='online'){ const code=coopRand(10); cl.send({op:'invite',hash:coopCodeHash(meta.cid,code),exp:Date.now()+7*864e5},ok=>{
      cl.close(); openLobby('created',{created:meta,code:ok?coopFmt(code):'(make one in the campaign panel)'}); }); } });
  coopThen(coopDial(meta),L=>cl.use(L),()=>openLobby('home',{msg:'Couldn’t reach the server.'})); }
function lobbyStart(meta){ if(!meta) return; try{ S.settings&&!S.settings.warned&&typeof showWarning==='function'?showWarning(()=>coopBegin(meta)):coopBegin(meta); }catch(e){ console.error(e); coopBegin(meta); } }
function lobbyResume(cid){ const m=coopMeta(cid); if(!m) return; closeLobby(); lobbyStart(m); }
function lobbyPeek(){ const raw=val_(elLobby,'#coL'), code=val_(elLobby,'#coC'); LOBBY.fn=val_(elLobby,'#coN');
  let j=null; if(/#join=/.test(raw)) j=coopParseJoin(raw.slice(raw.indexOf('#'))); else if(/^[A-Za-z0-9]{6,16}$/.test(raw)) j={cid:raw.toUpperCase(),mode:'p2p',server:null,signal:null};
  if(!j){ LOBBY.msg='That doesn’t look like an Oakhaven invitation link.'; renderLobby(); return; }
  if(!code){ LOBBY.msg='Type the invitation code too. It isn’t in the link, on purpose.'; renderLobby(); return; }
  const meta={cid:j.cid,seat:null,token:null,mode:j.mode,server:j.server,signal:j.signal,title:'',hero:null,role:null,name:LOBBY.fn,created:Date.now(),last:Date.now(),replica:null,outbox:[]};
  LOBBY.join=meta; LOBBY.code=code; openLobby('wait',{msg:'Knocking…'});
  const cl=new CoopClient(meta,()=>{}); LOBBY.client=cl;
  const fail=code=>openLobby('join',{msg:{badcode:'That code doesn’t match this campaign.',noinvite:'There’s no open invitation. It may have expired or been used; ask for a new one.',taken:'Both seats are already taken.',closed:'The host closed this campaign.',nocampaign:'There’s no campaign with that id here.'}[code]||'Couldn’t join: '+code});
  cl.on('offer',o=>openLobby('offer',{offer:o})).on('joinError',fail).on('status',s=>{ if(s==='denied') fail('nocampaign'); });
  coopThen(coopDial(meta),L=>cl.peek(L,code),()=>openLobby('join',{msg:meta.mode==='server'?'Can’t reach the campaign server.':'Can’t reach the host. They need to have the campaign open in their browser right now.'})); }
function lobbyClaim(){ const cl=LOBBY.client, meta=LOBBY.join; if(!cl||!cl.link){ openLobby('join',{msg:'The connection dropped. Try again.'}); return; }
  cl.on('status',s=>{ if(s==='online'){ const st=cl.state, me=st.seats[cl.meta.seat]; Object.assign(meta,{seat:cl.meta.seat,hero:me.hero,role:me.role,title:st.title,replica:st});
      coopStoreMeta(meta); LOBBY.view='started'; LOBBY.client=null; elLobby.classList.remove('on'); lobbyStart2(meta,cl); } });
  cl.store=coopStoreMeta; cl.claim(cl.link,LOBBY.code,LOBBY.fn||''); }
function lobbyStart2(meta,cl){ try{ if(S.settings&&!S.settings.warned&&typeof showWarning==='function'){ showWarning(()=>coopBegin(meta,cl)); return; } }catch(e){} coopBegin(meta,cl); }
function lobbyRecover(){ const code=val_(elLobby,'#coR'), f=elLobby.querySelector('#coF'), file=f&&f.files&&f.files[0];
  if(file){ const r=new FileReader(); r.onload=()=>{ let a=null; try{ a=JSON.parse(r.result); }catch(e){} const err=coopImportArchive(a); openLobby(err?'recover':'home',{msg:err||'Restored. Resume it below.'}); }; r.readAsText(file); return; }
  if(!code){ LOBBY.msg='Paste a recovery code or choose a campaign file.'; renderLobby(); return; }
  const err=coopImportCode(code); openLobby(err?'recover':'home',{msg:err||'Recovered. Resume it below.'}); }

/* the title screen row */
(function coopRow(){ const pk=document.getElementById('pk'); if(!pk||!pk.parentNode||!pk.parentNode.insertBefore) return;
  const row=document.createElement('div'); row.className='co-row';
  const n=lobbyCampaigns().length;
  row.innerHTML=`<b>Two players</b><span>A campaign for two: one of you the Observer, one the Interrogator.${n?` You have ${n} campaign${n>1?'s':''}.`:''}</span><button class="opt on" data-co>Play together…</button>`;
  pk.parentNode.insertBefore(row,pk); const b=row.querySelector('[data-co]'); if(b) b.onclick=()=>openLobby('home'); })();
/* arriving through an invitation link */
(function coopHash(){ let h=''; try{ h=location.hash; }catch(e){} const j=coopParseJoin(h); if(!j) return;
  const mine=coopMeta(j.cid); if(mine&&mine.token) { openLobby('home',{msg:''}); return; }
  openLobby('join',{join:Object.assign({seat:null},j)}); })();

/* ── the campaign panel, in play ───────────────────────────────────────── */
function openCampaignPanel(back){ if(!COOP.on) return; LOBBY.back=back||null; S.caseOpen=true; document.exitPointerLock?.(); clearHeld(); elLobby.classList.add('on'); renderPanel(); }
function closePanel(){ elLobby.classList.remove('on'); S.caseOpen=false; const b=LOBBY.back; LOBBY.back=null; if(b) b(); }
function renderPanel(){ const C=coopState(), m=COOP.meta, host=COOP.seat==='A', P=esc_(partnerName()), ps=seatInfo(partnerSeat())||{};
  let h=`<div class="st-box co-lb"><h1>Campaign</h1><div class="st-sub">“${esc_(m.title)}” · ${m.mode==='server'?'campaign server':'browser to browser'+(host?' · hosted here':'')}</div>`;
  h+=`<h2>Seats <small>locked</small></h2><p class="co-seat">You: ${esc_(myName())} — ${esc_(heroLabel(COOP.hero))}, the ${esc_(roleLabel(COOP.role))}${host?' · host':''}</p>`
    +`<p class="co-seat">${ps.claimed?P+' — ':'Nobody yet — '}${esc_(heroLabel(partnerHero()))}, the ${esc_(roleLabel(ps.role||coopOther(COOP.role,COOP_ROLES)))} · ${ps.revoked?'removed':ps.claimed?(partnerOnline()?'here':'away'):'not joined'}</p>`;
  h+=`<h2>Connection</h2><p class="co-seat">${esc_(coopStatusWord())}${host&&m.mode==='p2p'&&COOP.hostNote?' · '+esc_(COOP.hostNote):''}${COOP.client&&COOP.client.outbox.length?` · ${COOP.client.outbox.length} change${COOP.client.outbox.length>1?'s':''} waiting to send`:''}</p>`;
  if(LOBBY.msg) h+=`<div class="co-msg">${esc_(LOBBY.msg)}</div>`;
  if(LOBBY.code) h+=`<h2>Invitation <small>shown once</small></h2><div class="co-code"><code>${esc_(coopInviteLink())}</code><button class="opt" data-copy="${esc_(coopInviteLink())}">Copy link</button></div><div class="co-code"><code class="big">${esc_(LOBBY.code)}</code><button class="opt" data-copy="${esc_(LOBBY.code)}">Copy code</button></div>`;
  h+='<div class="st-btns co-wrap">';
  if(host){ h+=`<button class="opt" data-inv>New invitation</button>`; if(ps.claimed) h+=`<button class="opt" data-rm>Remove ${P}</button>`;
    h+=C&&C.closed?`<button class="opt" data-reopen>Reopen the campaign</button>`:`<button class="opt" data-closec>Close the campaign</button>`; }
  h+=`<button class="opt" data-rc>Show my recovery code</button><button class="opt" data-dl>Download campaign file</button><button class="opt" data-recon>Reconnect now</button>`;
  if(!host) h+=`<button class="opt" data-leave>Leave this campaign</button>`;
  h+=`<button class="opt on" data-back>Back</button></div>`;
  if(LOBBY.rc) h+=`<h2>Recovery code <small>keep it like a password</small></h2><div class="co-code"><code>${esc_(coopRecoveryCode())}</code><button class="opt" data-copy="${esc_(coopRecoveryCode())}">Copy</button></div><div class="st-note">With this code you can get back into your seat from any browser. Anyone with it can too.</div>`;
  if(m.mode==='p2p'){ const s=m.signal||{};
    h+=`<h2>Signalling <small>advanced</small></h2><div class="st-note">By default the two browsers find each other through PeerJS’s free public server. You can run your own (npx peerjs --port 9000) and point both browsers at it. Applies on next connect.</div>`
      +`<div class="st-row"><label>Host</label><input type="text" class="nm-in" id="sgH" value="${esc_(s.host||'')}" placeholder="0.peerjs.com (default)"></div>`
      +`<div class="st-row"><label>Port · path</label><input type="text" class="nm-in" id="sgP" value="${esc_(s.host?(s.port||443)+' '+(s.path||'/'):'')}" placeholder="443 /"></div>`
      +`<div class="st-row"><label>TURN server (optional)</label><input type="text" class="nm-in" id="sgT" value="${esc_(s.ice&&s.ice[0]?[s.ice[0].urls,s.ice[0].username||'',s.ice[0].credential||''].join(' '):'')}" placeholder="turn:host:3478 user pass"></div>`
      +`<div class="st-btns"><button class="opt" data-sig>Save signalling</button></div>`; }
  h+='</div>'; elLobby.innerHTML=h;
  const say_=t=>{ LOBBY.msg=t; renderPanel(); };
  qa_(elLobby,'[data-copy]',b=>copyText(b.dataset.copy));
  qa_(elLobby,'[data-back]',()=>{ LOBBY.code=null; LOBBY.rc=false; LOBBY.msg=''; closePanel(); });
  qa_(elLobby,'[data-inv]',()=>{ LOBBY.code=coopInvite(ok=>say_(ok?'Invitation ready. The old one, if any, no longer works.':'The campaign didn’t accept the invitation.')); renderPanel(); });
  qa_(elLobby,'[data-rm]',()=>{ if(!lobbyConfirm(`Remove ${partnerName()} from the campaign? Their seat stays ${heroLabel(partnerHero())}, the ${roleLabel(ps.role)}; nothing is erased. You can invite them, or someone else, again.`)) return;
    cop({op:'revoke',seat:partnerSeat()},ok=>{ if(ok) chron('admin',`${myName()} removed ${partnerName()} from the campaign.`); say_(ok?'Removed. Their credential no longer works.':'That didn’t work.'); }); });
  qa_(elLobby,'[data-closec]',()=>{ if(!lobbyConfirm('Close the campaign? Nothing is erased; it’s archived and you can reopen it.')) return; chron('admin',`${myName()} closed the campaign.`); cop({op:'close'},ok=>say_(ok?'Closed. It’s archived.':'That didn’t work.')); });
  qa_(elLobby,'[data-reopen]',()=>cop({op:'reopen'},ok=>{ if(ok) chron('admin',`${myName()} reopened the campaign.`); say_(ok?'Reopened.':'That didn’t work.'); }));
  qa_(elLobby,'[data-rc]',()=>{ LOBBY.rc=!LOBBY.rc; renderPanel(); });
  qa_(elLobby,'[data-dl]',()=>{ requestAutosave(); writeSave('auto'); downloadJSON(`oakhaven-${m.cid}.json`,coopArchive()); });
  qa_(elLobby,'[data-recon]',()=>{ coopReconnectNow(); say_('Reconnecting…'); });
  qa_(elLobby,'[data-leave]',()=>{ if(!lobbyConfirm('Leave this campaign on this browser? Your seat stays yours; with your recovery code you can come back.')) return; coopForget(m.cid); location.reload(); });
  qa_(elLobby,'[data-sig]',()=>{ const host_=val_(elLobby,'#sgH'), pp=val_(elLobby,'#sgP').split(/\s+/), tt=val_(elLobby,'#sgT').split(/\s+/);
    m.signal=host_?{host:host_,port:+pp[0]||443,path:pp[1]||'/',secure:(+pp[0]||443)!==9000&&(+pp[0]||443)!==80,ice:tt[0]?[{urls:tt[0],username:tt[1]||undefined,credential:tt[2]||undefined}]:null}:(tt[0]?{ice:[{urls:tt[0],username:tt[1]||undefined,credential:tt[2]||undefined}]}:null);
    coopStoreMeta(m); say_('Saved. It applies the next time you connect.'); });
}
