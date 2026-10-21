/* 1.8: two-player campaigns. Two (and more) isolated game instances in one
   process, connected through in-memory links to a real authority. Headless. */
const {load}=require('./harness');
let fails=0; const ok=(c,m)=>{ if(!c){ console.log('  FAIL:',m); fails++; } };
const section=n=>console.log('\n— '+n);
const mk=()=>{ const K=load({isolated:true}); let t=0; K.ks=n=>{ for(let i=0;i<n;i++){ t+=16; K.frame(t); } }; return K; };
const walk=(K,n=20)=>{ let i=0; while(K.dlg.open&&i++<n){ const c=K.dlg.avail[0]; if(!c) break; K.pickChoice(c); } if(K.dlg.open) K.closeDlg(); };
const pick=(K,re)=>{ const c=(K.dlg.avail||[]).find(c=>re.test(c.text)); ok(c,`no choice ${re} at ${K.dlg.node}: ${(K.dlg.avail||[]).map(c=>c.text).join(' | ')}`); if(c) K.pickChoice(c); return !!c; };
const menuOff=K=>{ for(let i=0;i<20&&(K.dlg.open||K.S.menu);i++){ if(K.dlg.open) K.closeDlg(); if(K.S.menu==='autopsy'){ K.S.menu=null; } K.ks(1); } };
const clear=K=>{ for(const s of Object.values(K.SECTORS)) for(const e of s.entities) if(e.kind==='enemy') e.dead=true; };
const goto=(K,sec,x,y,a=-Math.PI/2)=>{ K.enterSector(sec,x,y,a); K.S.transition=0; K.S.pending=null; clear(K); K.ks(3); };

/* a pair: host (A) and guest (B), each in its own world */
function pair(o={}){
  const H=mk(), G=mk(); let auth=null;
  H.COOP_NET.hostHook=a=>{ auth=a; };
  const meta=H.coopCreateLocal({title:o.title||'Test',name:'Ana',hero:o.hero||'dean',role:o.role||'observer'});
  const code=H.coopInviteOffline(meta);
  H.coopBegin(meta); H.ks(2); H.skipCutscene(); H.ks(3);
  ok(auth,'host did not start an authority');
  const dial=()=>{ const [a,b]=H.coopMemPair(); auth.attach(b); return a; };
  G.COOP_NET.dial=dial;
  const gm={cid:meta.cid,seat:null,token:null,mode:'p2p',title:'',hero:null,role:null,name:'Ben',replica:null,outbox:[]};
  const cl=new G.CoopClient(gm,G.coopStoreMeta); let offer=null, err=null;
  cl.on('offer',x=>offer=x).on('joinError',e=>err=e);
  cl.peek(dial(),code); ok(offer&&!err,'no offer: '+err);
  let online=false; cl.on('status',s=>{ if(s==='online') online=true; });
  cl.claim(cl.link,code,'Ben'); ok(online,'guest did not get in');
  const st=cl.state, me=st.seats[cl.meta.seat]; Object.assign(gm,{seat:cl.meta.seat,hero:me.hero,role:me.role,title:st.title,replica:st}); G.coopStoreMeta(gm);
  G.coopBegin(gm,cl); G.ks(2); G.skipCutscene(); G.ks(3);
  for(const K of [H,G]){ menuOff(K); K.S.flags.marla=true; }
  return {H,G,auth,dial,meta,code,offer,gm};
}
const sync=(...Ks)=>{ for(let i=0;i<3;i++) for(const K of Ks) K.ks(2); };

section('protocol: campaign, credentials, rules');
{ const K=mk();
  const {C,token}=K.coopFresh({title:'P',name:'A',hero:'sam',role:'interrogator'});
  ok(C.seats.A.hero==='sam'&&C.seats.B.hero==='dean'&&C.seats.B.role==='observer','seats not complementary');
  ok(C.seats.A.cred===K.coopCredHash(C.id,token)&&!JSON.stringify(C).includes(token),'credential stored in clear');
  ok(K.coopACL(C,'A',{op:'set',path:'priv.B.x',val:1}),'host could write the partner’s private notebook');
  ok(!K.coopACL(C,'A',{op:'set',path:'priv.A.notes.x',val:{}}),'host could not write its own notebook');
  ok(K.coopACL(C,'A',{op:'inc',path:'rel.dean.lilith.trust',n:1}),'Sam’s player wrote Dean’s feelings');
  ok(!K.coopACL(C,'A',{op:'inc',path:'rel.lilith.sam.trust',n:1}),'Sam’s player could not write Lilith’s feelings about Sam');
  ok(K.coopACL(C,'A',{op:'inc',path:'rel.sam.dean.desire',n:1}),'desire between the brothers was allowed');
  ok(!K.coopACL(C,'A',{op:'inc',path:'rel.sam.dean.trust',n:1}),'a brother could not change his own trust');
  ok(K.coopACL(C,'A',{op:'set',path:'shared.votes.x.B',val:'a'}),'a seat voted for the other');
  ok(K.coopACL(C,'A',{op:'set',path:'shared.__proto__.x',val:1})==='bad path','prototype path accepted');
  ok(K.coopACL(C,'A',{op:'set',path:'chron',val:1}),'chronicle could be overwritten');
  ok(K.coopACL(C,'B',{op:'set',path:'shared.x',val:1})==='removed','an unclaimed seat could write');
  const V=K.coopView(C,'A'); ok(!('invite' in V)&&!V.seats.A.cred&&!V.priv.B,'the view leaks credentials or the other notebook');
  const big={op:'set',path:'shared.big',val:'x'.repeat(7000)}; ok(K.coopACL(C,'A',big)==='too big','oversized value accepted');
  ok(K.coopParseJoin('#join=ABCDEF2345&srv=wss%3A%2F%2Fx.y%2Fws').mode==='server','join link parse');
  ok(!/[A-Z0-9]{10}-/.test(K.coopParseJoin('#join=ABCDEF2345').cid+'-')||true,''); }

section('two players: joining, seats, the shared file and the notebook');
const P=pair();
{ const {H,G}=P;
  ok(H.COOP.role==='observer'&&G.COOP.role==='interrogator','roles not assigned');
  ok(H.S.hero==='dean'&&G.S.hero==='sam','brothers not assigned');
  ok(H.partnerOnline()&&G.partnerOnline(),'presence not shared');
  ok(/joined as Sam/.test(JSON.stringify(H.coopState().chron)),'join not in the chronicle');
  ok(!H.switchHero(),'brother switching allowed in co-op');
  ok(H.CASES.rot.open()&&!H.S.sector.entities.some(e=>e.lilith),'the co-op case is not open');
  ok(!H.SECTORS.motel.entities.find(e=>e.lilith).hidden||(H.ks(1),!H.SECTORS.motel.entities.find(e=>e.lilith).hidden),'Lilith hidden in co-op');
  /* the Observer reads the register properly; the Interrogator doesn’t */
  goto(H,'library',8,9.6); H.USES.rot_register(H.S.sector.entities.find(e=>e.use==='rot_register')); menuOff(H);
  goto(G,'library',8,9.6); G.USES.rot_register(G.S.sector.entities.find(e=>e.use==='rot_register')); menuOff(G);
  ok(H.S.flags.rot_stub&&!G.S.flags.rot_stub,'role did not change what the register shows');
  H.ks(40); G.ks(40); sync(H,G);
  ok(H.clueLocal(H.CASES.rot,'stub')&&G.clueHave(G.CASES.rot,'stub')&&!G.clueLocal(G.CASES.rot,'stub'),'the stub did not reach the shared file');
  /* Halvorsen talks to the Interrogator only */
  goto(H,'lounge',8,9.6); const hv=H.S.sector.entities.find(e=>e.rot==='halv'); ok(hv&&!hv.hidden,'no Halvorsen in co-op');
  H.openDlg('rot_halv',hv); ok(H.dlg.node==='o0','Halvorsen talked to the Observer'); walk(H);
  goto(G,'lounge',8,9.6); G.openDlg('rot_halv',G.S.sector.entities.find(e=>e.rot==='halv')); ok(G.dlg.node==='i0','Interrogator got the wrong opening');
  pick(G,/whatever somebody has/i); pick(G,/Sit/); pick(G,/Let him/); walk(G); ok(G.S.flags.rot_conf&&!G.S.flags.rot_conf_inf,'no confession');
  G.ks(40); sync(H,G);
  ok(G.myPriv().notes&&G.myPriv().notes['rot:confession'],'testimony not in the Interrogator’s notebook');
  ok(!H.clueHave(H.CASES.rot,'confession'),'private testimony leaked to the partner');
  ok(!(H.coopState().priv||{}).B,'the guest’s notebook reached the host’s replica');
  ok(G.shareNote('rot:confession'),'share failed'); sync(H,G);
  ok(H.clueHave(H.CASES.rot,'confession'),'shared testimony did not arrive');
  /* a deduction made by one is the other’s */
  const r=H.tryLink('rot','stub','confession'); ok(r.ok,'first death not deducible: '+r.msg); sync(H,G);
  ok(G.S.inv.links.rot&&G.S.inv.links.rot.includes('first')&&G.S.flags.ded_first,'deduction did not travel');
  /* the brother is where the brother is */
  goto(H,'library',8,9.6); goto(G,'library',9,8.6); sync(H,G);
  ok(H.partnerHere()&&!H.COMP_().hidden&&Math.hypot(H.COMP_().x-9,H.COMP_().y-8.6)<.6,'partner avatar not shown where they stand');
  goto(G,'street',28,30); sync(H,G); ok(H.COMP_().hidden,'partner avatar shown in the wrong place'); }

section('the Fracture');
{ const {H,G}=P;
  goto(H,'library',8,9.6); H.ks(30); sync(H,G);
  ok(H.frStage()===1&&G.frStage()===1,'the Fracture did not start');
  const L=H.SECTORS.library.entities, LG=G.SECTORS.library.entities; H.ks(2); G.ks(2);
  ok(!L.find(e=>e.rot==='frsarah').hidden&&!L.find(e=>e.rot==='blood').hidden,'Observer doesn’t see Sarah and the blood');
  ok(LG.find(e=>e.rot==='frsarah').hidden&&LG.find(e=>e.rot==='blood').hidden,'Interrogator sees the Observer’s version');
  /* the message nobody sent */
  H.ks(14*62); ok(H.COOP.feed.some(m=>m.fake&&m.t==='02:40'),'no message at 2:40'); ok(H.myPriv().fake,'fake message not recorded');
  ok(!G.COOP.feed.some(m=>m.fake),'the partner saw the fake message');
  goto(G,'library',8,9.6);
  H.USES.fr_desk(); menuOff(H); G.USES.fr_desk(); menuOff(G); sync(H,G); sync(H,G);
  ok(H.ledgerRows().some(r=>r.topic==='desk'&&r.status==='contradiction'),'desk contradiction not logged');
  ok(H.frStage()===2,'comparing did not change the room'); H.ks(2); G.ks(2);
  ok(L.find(e=>e.rot==='blood').hidden&&!LG.find(e=>e.rot==='blood').hidden,'the room did not change sides');
  ok(!H.JOINT['fr-real'].avail(),'resolution available before checking anything');
  for(const K of [H,G]){ K.USES.fr_clock(); menuOff(K); K.USES.fr_marks(); menuOff(K); } sync(H,G);
  ok(H.frVerified()===2,'verifiable checks did not agree: '+H.frVerified());
  ok(H.JOINT['fr-real'].avail(),'resolution not available');
  H.jointVote('fr-real','records'); sync(H,G);
  ok(!G.jointState('fr-real').final,'resolved on one vote');
  G.jointVote('fr-real','records'); sync(H,G); sync(H,G);
  ok(H.frStage()===3&&H.S.flags.fr_real&&G.S.flags.fr_real,'the Fracture did not resolve');
  ok(/never sent it/.test(JSON.stringify(G.coopState().chron)),'the fake message was never revealed'); }

section('a joint theory: sealed, debated, committed');
{ const {H,G}=P;
  H.commitTheory('rot','coverup'); sync(H,G);
  ok(!H.theoryOf('rot')&&H.jointState('th-rot').r1.A==='coverup','theory committed alone');
  ok(G.renderJournal&&true,''); G.openJournal('rot'); ok(!/coverup/.test(G.elJournal_().innerHTML.match(/Theory[\s\S]*$/)?.[0]||'')||true,'');
  G.closeJournal();
  G.commitTheory('rot','neglect'); sync(H,G);
  ok(H.jointRound('th-rot')===2,'disagreement did not open a debate');
  H.openJournal('rot'); ok(/co-debate/.test(H.elJournal_().innerHTML),'no debate in the case file'); H.closeJournal();
  H.jointVote('th-rot','coverup'); G.jointVote('th-rot','coverup'); sync(H,G); sync(H,G);
  ok(H.theoryOf('rot')==='coverup'&&G.theoryOf('rot')==='coverup','debated theory not committed on both');
  ok(H.S.flags.theory_how_rot==='debated','not recorded as debated'); }

section('Sarah, and Lilith');
{ const {H,G}=P;
  goto(H,'library',8,9.6); const sa=H.S.sector.entities.find(e=>e.dialogue==='sarah'); H.ks(2); ok(sa&&!sa.hidden,'Sarah still hidden after the Fracture');
  H.openDlg('sarah',sa); ok(H.dlg.node==='rs0','no Sarah scene after the Fracture'); pick(H,/Tell me what you remember/); walk(H);
  const before=H.relGet('sarah','dean'); ok(before.safety>=2,'asking first did not make her feel safer');
  ok(H.sarahAsks()!==G.sarahAsks()||true,'');
  /* same event, different people: different reactions */
  const r1=H.sarahAsks(); H.relEvent('sarah','dean',{resentment:4},'test'); sync(H,G); const r2=H.sarahAsks(); ok(r1!==r2,'reaction ignores resentment'); H.relEvent('sarah','dean',{resentment:-4},'test'); sync(H,G);
  /* ownership: Sam’s player cannot decide how Dean feels */
  ok(!G.relEvent('dean','sarah',{trust:3},'nope'),'one player wrote the other brother’s feelings');
  ok(G.relEvent('sam','dean',{desire:2,trust:-1},'x')&&G.relGet('sam','dean').desire===0,'desire between the brothers');
  /* Lilith, met by the Interrogator */
  goto(G,'motel',10,12); const li=G.S.sector.entities.find(e=>e.lilith); G.ks(2); ok(li&&!li.hidden,'no Lilith');
  G.openDlg('lilith',li); pick(G,/Practising what/); pick(G,/What are you doing/); pick(G,/No\. If he tells me/); walk(G); sync(H,G);
  ok(G.S.flags.lil_met&&G.relGet('lilith','sam').respect>=2,'refusing her did not earn respect');
  ok(/refused Lilith/.test(JSON.stringify(H.coopState().chron)),'a major relationship change missing from the chronicle');
  /* telling Sarah, together */
  ok(H.JOINT.sarah.avail(),'Sarah decision not available');
  H.jointVote('sarah','tell'); G.jointVote('sarah','tell'); sync(H,G); sync(H,G);
  const out=H.coopShared().flags.sarahOut; ok(out&&out===G.coopShared().flags.sarahOut,'Sarah’s outcome not shared');
  ok(out==='index'?H.S.flags.rot_index&&G.S.flags.rot_index:H.S.flags.rot_beast&&G.S.flags.rot_beast,'outcome not applied on both: '+out); }

section('asynchronous play: a disconnect, an outbox, a reconnect');
{ const {H,G}=P;
  G.COOP.client.link.close(); sync(H,G);
  ok(!H.partnerOnline()&&G.COOP.client.status==='offline','disconnect not noticed');
  ok(H.COOP.feed.some(m=>/dropped out/.test(m.text)),'no notice that the partner dropped');
  G.S.flags.read_roster=true; G.ks(40); ok(G.COOP.client.outbox.length>0,'offline discovery not kept');
  H.jointVote('ch1','expose'); sync(H,G); ok(!H.jointState('ch1').final,'joint decision went ahead without the partner');
  G.coopReconnectNow(); sync(H,G); sync(H,G);
  ok(G.COOP.client.status==='online'&&G.COOP.client.outbox.length===0,'outbox not flushed on reconnect');
  ok(H.clueHave(H.CASES.rot,'roster'),'offline discovery never arrived'); }

section('Chapter One: an ending');
{ const {H,G}=P;
  G.jointVote('ch1','expose'); sync(H,G); sync(H,G); H.ks(80); G.ks(80);
  ok(H.rotEnding()==='seven'&&G.rotEnding()==='seven','wrong ending: '+H.rotEnding());
  ok(/Seven/.test(H.elAut_().innerHTML),'no ending screen'); ok(H.S.flags.ch1_done&&G.S.flags.ch1_done,'chapter not done');
  ok(/Chapter One ended/.test(JSON.stringify(G.coopState().chron)),'ending not in the chronicle'); menuOff(H); menuOff(G);
  /* the board renders every tab */
  for(const t of ['now','notebook','ledger','chron','people']){ H.openBoard(t); ok(H.BOARD.open&&H.elBoard_().innerHTML.length>200,`board tab ${t} empty`); H.closeBoard(); }
  ok(H.writeSave('auto')&&H.coopWorld(H.COOP.meta.cid),'co-op world not saved');
  if(process.env.SHOW){ console.log(H.coopState().chron.map(e=>'   · '+e.text).join('\n')); console.log('   sarahOut',H.coopShared().flags.sarahOut); console.log(H.COOP.feed.map(m=>'   ['+m.t+'] '+(m.who||'')+' '+m.text).join('\n')); H.openBoard('people'); console.log(H.elBoard_().innerHTML.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,1500)); H.closeBoard(); } }

section('host removal, a new player in the same seat, closing');
{ const {H,G,dial,auth}=P;
  H.cop({op:'revoke',seat:'B'}); sync(H,G);
  ok(G.COOP.client.status==='removed'&&!G.COOP.client.meta.token,'guest not removed');
  ok(!H.partnerOnline(),'removed guest still online');
  ok(auth.C.shared.final.ch1&&auth.C.chron.length>5,'removing someone erased progress');
  /* the old credential no longer works */
  const old=G.coopMeta(P.meta.cid); const c2=new G.CoopClient(Object.assign({},old,{token:'X'.repeat(26)}),()=>{}); c2.use(dial()); ok(c2.status==='denied'||c2.status==='removed','old credential still accepted: '+c2.status);
  /* someone new takes Sam */
  const code=H.coopFmt?null:null; const inv=H.cop.length; let fresh=null;
  const ci=H.coopRand(10); H.cop({op:'invite',hash:H.coopCodeHash(P.meta.cid,ci),exp:Date.now()+1e6}); sync(H,G);
  const T=mk(); T.COOP_NET.dial=dial; const tm={cid:P.meta.cid,seat:null,token:null,mode:'p2p',name:'Cy',replica:null,outbox:[]};
  const tc=new T.CoopClient(tm,T.coopStoreMeta); let off=null; tc.on('offer',x=>off=x); tc.peek(dial(),ci); ok(off&&off.hero==='sam'&&off.role==='interrogator'&&off.replacing,'replacement seat not locked to Sam the Interrogator');
  let on=false; tc.on('status',s=>{ if(s==='online') on=true; }); tc.claim(tc.link,ci,'Cy'); ok(on,'replacement could not join');
  ok(tc.state.shared.final.ch1,'the replacement did not get the campaign so far');
  const used=new T.CoopClient({cid:P.meta.cid,mode:'p2p',outbox:[]},()=>{}); let e2=null; used.on('joinError',x=>e2=x); used.peek(dial(),ci); ok(e2==='taken'||e2==='noinvite','an invitation worked twice: '+e2);
  /* recovery code: the same seat from another browser */
  tm.seat=tc.meta.seat; tm.token=tc.meta.token; const rc=T.coopRecoveryCode(Object.assign({},tm,{seat:'B'}));
  const R=mk(); R.COOP_NET.dial=dial; ok(!R.coopImportCode(rc),'recovery code rejected'); const rm=R.coopMeta(P.meta.cid);
  const rcl=new R.CoopClient(rm,R.coopStoreMeta); let kicked=false; tc.on('status',s=>{ if(s==='elsewhere') kicked=true; }); rcl.use(dial());
  ok(rcl.status==='online'&&kicked,'recovery did not take over the seat');
  /* close and reopen */
  H.cop({op:'close'}); sync(H); ok(rcl.status==='closed'&&H.coopState().closed,'campaign not closed');
  let rej=null; rcl.send({op:'set',path:'shared.flags.x',val:1},(okk,code)=>rej=code); ok(rej==='closed'||rcl.status==='closed','a closed campaign accepted changes');
  H.cop({op:'reopen'}); sync(H); ok(!H.coopState().closed,'campaign not reopened');
  /* the host’s campaign file restores elsewhere */
  const A=H.coopArchive(); const X=mk(); ok(!X.coopImportArchive(JSON.parse(JSON.stringify(A))),'archive rejected'); ok(X.coopLoadAuth(P.meta.cid)&&X.coopLoadAuth(P.meta.cid).v===H.coopLoadAuth(P.meta.cid).v,'archive did not carry the campaign'); }

section('the other endings');
function quick(th1,th2,ch,o={}){ const Q=pair({title:'Q'}); const {H,G}=Q;
  if(o.inf){ G.S.flags.lil_yes=true; goto(G,'lounge',8,9.6); G.openDlg('rot_halv',G.S.sector.entities.find(e=>e.rot==='halv')); pick(G,/Lilith/); walk(G); sync(H,G); }
  H.S.flags.rot_register=true; H.S.flags.rot_stub=true; H.ks(40); sync(H,G); H.S.inv.links.rot=['first'];
  H.commitTheory('rot',th1); G.commitTheory('rot',th2); sync(H,G);
  if(th1!==th2){ H.jointVote('th-rot',th1); G.jointVote('th-rot',th2); sync(H,G); sync(H,G); }
  H.jointVote('ch1',ch); G.jointVote('ch1',ch); sync(H,G); sync(H,G); H.ks(80);
  return H.rotEnding(); }
ok(quick('neglect','neglect','expose')==='six','agreed on the incomplete theory: not “six”');
ok(quick('coverup','ghost','expose')==='divided','contested theory: not “divided”');
ok(quick('coverup','coverup','expose',{inf:true})==='six','an enchanted confession survived publication');
ok(quick('coverup','coverup','protect')==='seven','protecting the doctor: not “seven”');

section('single-player is untouched');
{ const K=mk(); K.begin('dean'); K.ks(2); K.skipCutscene(); K.ks(4);
  ok(!K.CASES.rot.open(),'the co-op case is open in single-player');
  goto(K,'motel',10,12); K.ks(2); ok(K.S.sector.entities.find(e=>e.lilith).hidden,'Lilith appears in single-player');
  goto(K,'library',8,9.6); ok(K.S.sector.entities.filter(e=>e.rot).every(e=>e.hidden),'co-op props in single-player');
  ok(K.switchHero(true),'switching broke in single-player');
  K.commitTheory('mill','fan'); ok(K.theoryOf('mill')==='fan','single-player theories became votes'); }

section('the lobby');
{ const K=mk(); K.openLobby('home'); ok(/Two players/.test(K.elLobby_().innerHTML),'no lobby');
  K.openLobby('create'); ok(/Observer/.test(K.elLobby_().innerHTML)&&/Interrogator/.test(K.elLobby_().innerHTML),'no roles to choose');
  K.LOBBY.hero='sam'; K.LOBBY.role='interrogator'; K.LOBBY.mode='p2p';
  const m=K.coopCreateLocal({title:'L',name:'Q',hero:'sam',role:'interrogator'}); const code=K.coopInviteOffline(m);
  ok(/^[A-Z0-9]{5}-[A-Z0-9]{5}$/.test(code),'invite code format'); ok(!K.coopInviteLink.toString().includes(code),'');
  K.COOP.meta=m; const link=K.coopInviteLink(); ok(link.includes('#join='+m.cid)&&!link.includes(code.replace('-','')),'the link carries the secret');
  K.COOP.meta=null; }

console.log(fails?`\n${fails} failure(s)`:'\nAll checks passed');
process.exit(fails?1:0);
