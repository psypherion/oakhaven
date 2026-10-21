/* 1.8: two real browsers, connected browser-to-browser over WebRTC through a
   local PeerJS signalling server. Creates a campaign through the lobby, joins
   it from an invitation link, plays the chapter's key beats, then tests a
   reload, the host going offline and coming back, and the host removing
   the partner. Screenshots go to the output folder.
     node tests/coop_browser.js [outdir]
   Needs the `peer` npm package (PEER_BIN) and Playwright. */
const path=require('path'), fs=require('fs'), http=require('http'), {spawn}=require('child_process');
const {chromium}=(()=>{try{return require('playwright')}catch(e){return require('/opt/npm-tools/node_modules/playwright')}})();
const ROOT=path.resolve(__dirname,'..'), OUT=process.argv[2]||path.join(require('os').tmpdir(),'oak_coop'); fs.mkdirSync(OUT,{recursive:true});
const PEER_BIN=path.join(__dirname,'peer_server.js');
let fails=0; const ok=(c,m)=>{ console.log((c?'ok   ':'FAIL ')+m); if(!c) fails++; };
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  /* a signalling server and a web server */
  const peer=spawn(process.execPath,[PEER_BIN,'9177'],{stdio:'ignore'});
  const srv=http.createServer((q,r)=>{ const f=path.join(ROOT,decodeURIComponent(q.url.split('?')[0].split('#')[0])); if(!f.startsWith(ROOT)||!fs.existsSync(f)){ r.writeHead(404); r.end(); return; } r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html':'application/octet-stream'}); fs.createReadStream(f).pipe(r); }).listen(8177,'127.0.0.1');
  await sleep(1200);
  const b=await chromium.launch({args:['--use-gl=swiftshader','--use-fake-ui-for-media-stream']});
  const mkPage=async ctx=>{ const p=await ctx.newPage(); p.errs=[]; p.on('pageerror',e=>p.errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error'&&!/bigdatacloud|net::|Failed to fetch|favicon/.test(m.text())) p.errs.push(m.text()); }); return p; };
  const init=()=>{ try{ localStorage.setItem('oakhaven.settings.v1',JSON.stringify({warned:true,hints:false,fourth:false,useLoc:false})); }catch(e){} };
  const cA=await b.newContext({viewport:{width:1280,height:760}}), cB=await b.newContext({viewport:{width:1280,height:760}});
  await cA.addInitScript(init); await cB.addInitScript(init);
  const H=await mkPage(cA), G=await mkPage(cB);
  const URL0='http://127.0.0.1:8177/oakhaven.html';
  const shot=(p,n)=>p.screenshot({path:path.join(OUT,n)});
  const until=async(p,fn,arg,ms=20000)=>{ const t=Date.now(); while(Date.now()-t<ms){ try{ if(await p.evaluate(fn,arg)) return true; }catch(e){} await sleep(200); } return false; };
  const quiet=p=>p.evaluate(()=>{ try{ skipCutscene(); }catch(e){} S.cardQ.length=0; S.card=null; if(dlg.open) closeDlg(); setRenderer('crisp'); });

  /* ── host: create through the lobby ── */
  await H.goto(URL0); await sleep(500);
  await H.evaluate(()=>{ COOP_NET.signal={host:'127.0.0.1',port:9177,path:'/',secure:false}; });
  await H.click('.co-row [data-co]'); await sleep(200); await shot(H,'01_lobby_home.png');
  await H.click('[data-v="create"]'); await sleep(150);
  await H.fill('#coT','Night Shift'); await H.fill('#coN','Ana');
  await H.click('[data-hero="dean"]'); await H.click('[data-role="observer"]'); await sleep(150); await shot(H,'02_lobby_create.png');
  await H.click('[data-create]'); await sleep(250); await shot(H,'03_lobby_invite.png');
  const link=await H.$eval('.co-code code',e=>e.textContent), code=await H.$eval('.co-code code.big',e=>e.textContent);
  ok(/#join=[A-Z0-9]+/.test(link)&&!link.includes(code.replace('-','')),'invitation link has the id and not the code');
  await H.click('[data-start]'); await sleep(900); await quiet(H);
  ok(await until(H,()=>/Listening/.test(COOP.hostNote)),'host is listening on the signalling server');

  /* ── guest: open the link, type the code ── */
  await G.goto(link.replace(/^https?:\/\/[^/]+\/[^#]*/,URL0)); await sleep(600);
  ok(await G.evaluate(()=>elLobby.classList.contains('on')&&LOBBY.view==='join'),'the invitation link opens the join screen');
  await G.fill('#coC',code); await G.fill('#coN','Ben'); await G.click('[data-peek]');
  ok(await until(G,()=>LOBBY.view==='offer'),'guest got an offer over WebRTC'); await shot(G,'04_lobby_offer.png');
  ok(await G.evaluate(()=>LOBBY.offer.hero==='sam'&&LOBBY.offer.role==='interrogator'),'offer is Sam, the Interrogator');
  await G.click('[data-claim]');
  ok(await until(G,()=>COOP.on&&S.running&&COOP.client.status==='online'),'guest is in the game and online'); await quiet(G);
  ok(await until(H,()=>partnerOnline()),'host sees the guest');
  await H.evaluate(()=>{ S.flags.marla=true; enterSector('library',8,9.6,-Math.PI/2); }); await G.evaluate(()=>{ S.flags.marla=true; enterSector('library',9.2,8.4,-Math.PI/2); });
  ok(await until(H,()=>partnerHere()&&!COMP.hidden),'host sees Sam standing in the library');
  await H.evaluate(()=>{ S.angle=-.6; }); await sleep(500); await shot(H,'05_host_sees_partner.png');

  /* ── the split investigation ── */
  await H.evaluate(()=>{ USES.rot_register(); }); await sleep(200); await shot(H,'06_observer_register.png'); await H.evaluate(()=>closeDlg());
  await G.evaluate(()=>{ USES.rot_register(); }); await sleep(200); await shot(G,'07_interrogator_register.png'); await G.evaluate(()=>closeDlg());
  ok(await until(G,()=>clueHave(CASES.rot,'stub')&&!clueLocal(CASES.rot,'stub')),'the Observer’s stub reached the Interrogator’s case file');
  await G.evaluate(()=>{ enterSector('lounge',8,9.6,-Math.PI/2); }); await sleep(400);
  await G.evaluate(()=>{ const e=S.sector.entities.find(x=>x.rot==='halv'); S.px=11.1; S.py=7.4; S.angle=-Math.PI/2; openDlg('rot_halv',e); }); await sleep(300); await shot(G,'08_halvorsen.png');
  await G.evaluate(()=>{ const p=re=>{ const c=dlg.avail.find(c=>re.test(c.text)); pickChoice(c); }; p(/Whatever somebody/); p(/Sit/); p(/Let him/); }); await sleep(200); await shot(G,'09_confession.png');
  await G.evaluate(()=>{ while(dlg.open&&dlg.avail&&dlg.avail[0]) pickChoice(dlg.avail[0]); if(dlg.open) closeDlg(); });
  ok(await until(G,()=>myPriv().notes&&myPriv().notes['rot:confession']),'the confession went to the Interrogator’s notebook');
  await G.evaluate(()=>openBoard('notebook')); await sleep(300); await shot(G,'10_board_notebook.png');
  await G.evaluate(()=>{ shareNote('rot:confession'); closeBoard(); });
  ok(await until(H,()=>clueHave(CASES.rot,'confession')),'the shared confession reached the Observer');
  await H.evaluate(()=>{ tryLink('rot','stub','confession'); openJournal('rot'); }); await sleep(300); await shot(H,'11_casefile_coop.png'); await H.evaluate(()=>closeJournal());

  /* ── the Fracture ── */
  await G.evaluate(()=>enterSector('library',8,9.6,-Math.PI/2));
  ok(await until(H,()=>frStage()===1),'the Fracture begins');
  for(const p of [H,G]) await p.evaluate(()=>{ S.px=13.3; S.py=8.3; S.angle=-1.42; S.glitchA=0; });
  await sleep(1200); await shot(H,'12_fracture_observer.png'); await shot(G,'13_fracture_interrogator.png');
  await H.evaluate(()=>{ USES.fr_desk(); closeDlg(); }); await G.evaluate(()=>{ USES.fr_desk(); closeDlg(); });
  ok(await until(H,()=>frStage()===2),'comparing the desk changes the room');
  await sleep(900); await shot(H,'14_fracture_shifted_observer.png'); await shot(G,'15_fracture_shifted_interrogator.png');
  for(const p of [H,G]) await p.evaluate(()=>{ USES.fr_clock(); closeDlg(); USES.fr_marks(); closeDlg(); });
  ok(await until(H,()=>frVerified()===2),'both players verified the clock and the door');
  await H.evaluate(()=>openBoard('ledger')); await sleep(300); await shot(H,'16_board_ledger.png'); await H.evaluate(()=>closeBoard());
  /* the message that was never sent: force it here rather than wait */
  await G.evaluate(()=>{ enterSector('street',28,30,-Math.PI/2); }); await H.evaluate(()=>{ COOP.fakeT=99; });
  ok(await until(H,()=>COOP.feed.some(m=>m.fake)),'a message arrived at 2:40'); await sleep(300); await shot(H,'17_fake_message.png');
  ok(!(await G.evaluate(()=>COOP.feed.some(m=>m.fake))),'the partner never sent it');
  await H.evaluate(()=>openBoard('now')); await sleep(200); await shot(H,'18_board_joint.png'); await H.evaluate(()=>closeBoard());
  await H.evaluate(()=>jointVote('fr-real','records')); await G.evaluate(()=>jointVote('fr-real','records'));
  ok(await until(G,()=>frStage()===3&&S.flags.fr_real),'the Fracture resolves when both agree');

  /* ── the theory: sealed, then a debate ── */
  await H.evaluate(()=>commitTheory('rot','coverup')); await G.evaluate(()=>commitTheory('rot','ghost'));
  ok(await until(H,()=>jointRound('th-rot')===2),'disagreement opens the debate');
  await H.evaluate(()=>openJournal('rot')); await sleep(300); await H.evaluate(()=>{ const pg=document.querySelector('#journal .jr-page'); if(pg) pg.scrollTop=pg.scrollHeight; }); await sleep(150); await shot(H,'19_debate.png'); await H.evaluate(()=>closeJournal());
  await H.evaluate(()=>jointVote('th-rot','coverup')); await G.evaluate(()=>jointVote('th-rot','coverup'));
  ok(await until(G,()=>theoryOf('rot')==='coverup'),'the debated theory is committed for both');

  /* ── reload: the guest comes back to the same seat ── */
  await G.evaluate(()=>{ writeSave('auto'); }); await G.reload(); await sleep(600);
  if(!(await G.evaluate(()=>elLobby.classList.contains('on')))) await G.click('.co-row [data-co]'); await sleep(200); await shot(G,'20_lobby_resume.png');
  await G.click('[data-res]'); await sleep(900); await quiet(G);
  ok(await until(G,()=>COOP.client.status==='online'&&COOP.role==='interrogator'&&theoryOf('rot')==='coverup'),'the guest is back as Sam, with the campaign intact');

  /* ── the host goes offline; the guest keeps going; the host returns ── */
  await H.evaluate(()=>{ writeSave('auto'); }); const hostCid=await H.evaluate(()=>COOP.meta.cid); await H.close();
  ok(await until(G,()=>!partnerOnline()&&COOP.client.status!=='online',null,30000),'the guest notices the host is gone');
  await G.evaluate(()=>{ S.flags.read_roster=true; });
  ok(await until(G,()=>COOP.client.outbox.length>0),'what the guest finds while alone waits in the outbox');
  await G.evaluate(()=>jointVote('sarah','watch'));
  const H2=await mkPage(cA); await H2.goto(URL0); await sleep(500);
  await H2.evaluate(cid=>{ document.querySelector('.co-row [data-co]').click(); }); await sleep(200); await H2.click(`[data-res="${hostCid}"]`); await sleep(900); await quiet(H2);
  ok(await until(H2,()=>/Listening/.test(COOP.hostNote)),'host is listening again');
  await G.evaluate(()=>coopReconnectNow());
  ok(await until(G,()=>COOP.client.status==='online'&&COOP.client.outbox.length===0),'the guest reconnects and the outbox empties');
  ok(await until(H2,()=>clueHave(CASES.rot,'roster')),'what the guest found offline reached the host');
  ok(await until(H2,()=>(jointState('sarah').r1||{}).B==='watch'),'a vote cast while the host was away was kept');
  await H2.evaluate(()=>jointVote('sarah','watch'));
  await H2.evaluate(()=>{ jointVote('ch1','expose'); }); await G.evaluate(()=>jointVote('ch1','expose'));
  ok(await until(H2,()=>S.flags.ch1_done&&/Seven/.test(elAut.innerHTML)),'the chapter ends for the host'); await sleep(400); await shot(H2,'21_ending.png');
  ok(await until(G,()=>S.flags.ch1_done),'the chapter ends for the guest');
  await H2.evaluate(()=>{ elAut.classList.remove('on'); S.menu=null; openBoard('chron'); }); await sleep(300); await shot(H2,'22_board_chronicle.png'); await H2.evaluate(()=>closeBoard());
  await G.evaluate(()=>{ elAut.classList.remove('on'); S.menu=null; openBoard('people'); }); await sleep(300); await shot(G,'23_board_people.png'); await G.evaluate(()=>closeBoard());

  /* ── the host removes the guest ── */
  await H2.evaluate(()=>openCampaignPanel()); await sleep(200); await shot(H2,'24_campaign_panel.png');
  await H2.evaluate(()=>{ cop({op:'revoke',seat:'B'}); });
  ok(await until(G,()=>COOP.client.status==='removed'),'the guest is told they were removed'); await sleep(500); await shot(G,'25_removed.png');
  ok(await until(H2,()=>!partnerOnline()),'the host no longer sees the guest');
  await G.evaluate(()=>coopReconnectNow()); await sleep(2500);
  ok(await G.evaluate(()=>COOP.client.status!=='online'),'the removed guest can’t get back in');
  ok(await H2.evaluate(()=>coopState().shared.final.ch1&&coopState().chron.length>10),'removal didn’t erase anything');

  for(const p of [G,H2]) if(p.errs.length) console.log('page errors:',p.errs.slice(0,6));
  ok(!G.errs.length&&!H2.errs.length,'no page errors');
  await b.close(); srv.close(); peer.kill();
  console.log(fails?`\n${fails} failure(s)`:'\nAll checks passed'); process.exit(fails?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
