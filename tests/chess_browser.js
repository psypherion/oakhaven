/* 1.11 chess in a real browser: the room, Stockfish in a worker (the CDN
   request is answered from a local copy), clicking and dragging, promotion,
   the clock, the offline fallback, a phone in landscape, and two browsers
   playing each other through a local PeerJS server.
     node tests/chess_browser.js [outdir]
   Needs Playwright, the `peer` package and a local stockfish.asm.js
   (SF_JS, default /tmp/claude-0/sf/stockfish.asm.js). */
const path=require('path'), fs=require('fs'), http=require('http'), {spawn}=require('child_process');
const {chromium}=(()=>{try{return require('playwright')}catch(e){return require('/opt/npm-tools/node_modules/playwright')}})();
const ROOT=path.resolve(__dirname,'..'), OUT=process.argv[2]||path.join(require('os').tmpdir(),'oak_chess'); fs.mkdirSync(OUT,{recursive:true});
const SF_JS=process.env.SF_JS||'/tmp/claude-0/sf/stockfish.asm.js';
let fails=0; const ok=(c,m)=>{ console.log((c?'ok   ':'FAIL ')+m); if(!c) fails++; };
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const peer=spawn(process.execPath,[path.join(__dirname,'peer_server.js'),'9178'],{stdio:'ignore'});
  const srv=http.createServer((q,r)=>{ const f=path.join(ROOT,decodeURIComponent(q.url.split('?')[0])); if(!f.startsWith(ROOT)||!fs.existsSync(f)){ r.writeHead(404); r.end(); return; } r.writeHead(200,{'content-type':'text/html'}); fs.createReadStream(f).pipe(r); }).listen(8178,'127.0.0.1');
  await sleep(1200);
  const b=await chromium.launch({args:['--use-gl=swiftshader']});
  const init=()=>{ try{ if(!localStorage.getItem('oakhaven.settings.v1')) localStorage.setItem('oakhaven.settings.v1',JSON.stringify({warned:true,hints:false,fourth:false,useLoc:false,renderer:'crisp'})); }catch(e){} };
  const mk=async(vp,offline)=>{ const ctx=await b.newContext({viewport:vp||{width:1366,height:800},hasTouch:!!(vp&&vp.touch)}); await ctx.addInitScript(init);
    await ctx.route(/cdn\.jsdelivr\.net\/npm\/stockfish/,rt=>offline?rt.abort():rt.fulfill({status:200,contentType:'text/javascript',body:fs.readFileSync(SF_JS)}));
    const p=await ctx.newPage(); p.errs=[]; p.on('pageerror',e=>p.errs.push(e.message)); await p.goto('http://127.0.0.1:8178/oakhaven.html'); await sleep(500); return p; };
  const until=async(p,fn,arg,ms=20000)=>{ const t=Date.now(); while(Date.now()-t<ms){ try{ if(await p.evaluate(fn,arg)) return true; }catch(e){} await sleep(150); } return false; };
  const shot=(p,n)=>p.screenshot({path:path.join(OUT,n)});
  const sqXY=async(p,sq)=>p.evaluate(sq=>{ const r=document.querySelector(`#chess [data-sq="${sq}"]`).getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; },sq);
  const sqN=s=>'abcdefgh'.indexOf(s[0])+8*(+s[1]-1);
  const click=async(p,s)=>{ const c=await sqXY(p,sqN(s)); await p.mouse.click(c.x,c.y); await sleep(60); };

  /* ── the room, from the title screen ── */
  const P=await mk();
  ok(await P.$('#chessRow [data-chess-open]')!==null,'a Chess button on the title screen');
  await P.click('#chessRow [data-chess-open]'); await sleep(300); await shot(P,'01_lobby.png');
  ok(await P.evaluate(()=>document.querySelectorAll('#chess .cz-foe').length===12),'twelve opponents');
  await P.evaluate(()=>{ const d=JSON.parse(localStorage.getItem('oakhaven.progress')||'null'); }); /* first-time player: later acts are veiled */
  ok(await P.evaluate(()=>document.querySelectorAll('#chess .cz-foe.locked').length>=5),'later characters are locked');
  /* unlock them for the look of it */
  await P.evaluate(()=>{ localStorage.setItem(PROG_KEY,JSON.stringify({act:4,endings:['rot']})); renderChess(); }); await sleep(200); await shot(P,'02_lobby_all.png');
  /* Crowley, with Stockfish */
  await P.click('#chess .cz-foe[data-czf="crowley"]'); await sleep(300);
  ok(await until(P,()=>SF.state==='ready',null,30000),'Stockfish loaded into a worker');
  const meW=await P.evaluate(()=>CG.me==='w'); if(!meW) await until(P,()=>CG.ucis.length===1,null,15000);
  await click(P,meW?'e2':'e7'); ok(await P.evaluate(()=>document.querySelectorAll('#chess .cz-sq.dot').length===2),'legal-move dots shown'); await shot(P,'03_selected.png');
  await click(P,meW?'e4':'e5');
  ok(await until(P,(n)=>CG.ucis.length===n,meW?2:3,15000),'Crowley (Stockfish) replied');
  /* a drag */
  const from=await sqXY(P,sqN(meW?'g1':'g8')), to=await sqXY(P,sqN(meW?'f3':'f6'));
  await P.mouse.move(from.x,from.y); await P.mouse.down(); await P.mouse.move((from.x+to.x)/2,(from.y+to.y)/2,{steps:5}); await shot(P,'04_drag.png'); await P.mouse.move(to.x,to.y,{steps:5}); await P.mouse.up();
  ok(await until(P,(n)=>CG.ucis.length>=n,meW?4:5,15000),'a dragged move, and his answer');
  await sleep(400); await shot(P,'05_game_crowley.png');
  ok(await P.evaluate(()=>/Engine: Stockfish 10/.test(document.querySelector('#chess .cz-eng').textContent)),'engine named in the room');
  /* promotion */
  await P.evaluate(()=>chessNew('ai',{foe:'kevin',me:'w',fen:'7k/P7/8/8/8/8/6K1/8 w - - 0 1'})); await sleep(200);
  await click(P,'a7'); await click(P,'a8'); await sleep(150); ok(await P.$('#chess .cz-promo')!==null,'promotion picker'); await shot(P,'06_promotion.png');
  await P.click('#chess .cz-promo [data-czp="n"]'); ok(await P.evaluate(()=>CG.sans[0]==='a8=N'),'under-promoted to a knight');
  /* mate and the end card */
  await P.evaluate(()=>chessNew('ai',{foe:'castiel',me:'w',fen:'6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1'})); await click(P,'d1'); await click(P,'d8'); await sleep(250);
  ok(await P.evaluate(()=>CG.over&&CG.over.result==='1-0'),'back-rank mate'); await shot(P,'07_mate.png');
  /* hot seat with a clock */
  await P.click('#chess [data-cz="lobby"]'); await P.click('#chess [data-czt="hot"]'); await sleep(100);
  await P.selectOption('#chess [data-czs="tc"]','5+0'); await shot(P,'08_hot_setup.png'); await P.click('#chess [data-cz="hot"]'); await sleep(100);
  await click(P,'e2'); await click(P,'e4'); await sleep(200); ok(await P.evaluate(()=>CX.flip===true),'board turned for Black');
  await click(P,'e7'); await click(P,'e5'); await sleep(1300);
  ok(await P.evaluate(()=>chessClockLeft('w')<300000&&chessClockLeft('b')===300000),'the clock runs for the side to move'); await shot(P,'09_hot_clock.png');
  /* pause menu, in a run */
  await P.evaluate(()=>closeChess()); await P.click('.go[data-h="dean"]'); await sleep(800);
  await P.evaluate(()=>{ skipCutscene(); S.cardQ.length=0; S.card=null; enterSector('library',8,9.6,-Math.PI/2); }); await sleep(300);
  const tb=await P.evaluate(()=>{ const e=S.sector.entities.find(e=>e.chess==='sarah'); S.px=e.x; S.py=e.y+1.1; S.pa=-Math.PI/2; return !!e; }); ok(tb,'a chessboard in the library'); await sleep(300); await shot(P,'10_library_table.png');
  await P.evaluate(()=>USES.chess_sarah()); await sleep(300); ok(await P.evaluate(()=>CX.open&&CG.foe.id==='sarah'),'Sarah sits down'); await shot(P,'11_sarah.png');
  ok(!P.errs.length,'no page errors'+(P.errs.length?': '+P.errs.slice(0,3).join(' | '):''));

  /* ── offline: the built-in engine stands in ── */
  const Q=await mk(null,true);
  await Q.evaluate(()=>{ openChess(); chessNew('ai',{foe:'chuck',me:'w'}); chessHuman(chFindUCI(CG.st,'d2d4')); });
  ok(await until(Q,()=>CG.ucis.length===2,null,20000),'Chuck plays without Stockfish');
  ok(await Q.evaluate(()=>SF.state==='off'&&/Stockfish unreachable/.test(document.querySelector('#chess .cz-eng').textContent)),'and says so');

  /* ── a phone in landscape ── */
  const M=await mk({width:915,height:412,touch:true});
  await M.evaluate(()=>{ chessSetOpt('engine','own'); openChess(); chessNew('ai',{foe:'juno',me:'w'}); }); await sleep(300);
  const fit=await M.evaluate(()=>{ const r=document.querySelector('#chess .cz-board').getBoundingClientRect(); return r.bottom<=window.innerHeight+1&&r.right<=window.innerWidth&&r.width>250; });
  ok(fit,'the board fits a phone held sideways'); await M.tap('#chess [data-sq="12"]').catch(()=>{}); const c=await sqXY(M,28); await M.touchscreen.tap(c.x,c.y);
  ok(await until(M,()=>CG.ucis.length>=1,null,5000),'tap to move on a phone'); await sleep(900); await shot(M,'12_phone.png');

  /* ── two browsers ── */
  const A=await mk(), B=await mk();
  for(const p of [A,B]) await p.evaluate(()=>{ COOP_NET.signal={host:'127.0.0.1',port:9178,path:'/',secure:false}; });
  await A.evaluate(()=>{ chessSetOpt('name','Ana'); chessSetOpt('colour','w'); chessSetOpt('tc','10+5'); openChess(); CX.tab='net'; renderChess(); });
  await A.click('#chess [data-cz="host"]'); ok(await until(A,()=>/is open/.test(CN.status)),'room opened');
  const code=await A.evaluate(()=>CN.code); await shot(A,'13_net_host.png');
  await B.evaluate(()=>{ chessSetOpt('name','Bo'); openChess(); CX.tab='net'; renderChess(); });
  await B.fill('#chess [data-czs="code"]',code); await B.click('#chess [data-cz="join"]');
  ok(await until(A,()=>CG&&CG.mode==='net')&&await until(B,()=>CG&&CG.mode==='net'),'both at the board');
  ok(await B.evaluate(()=>CG.me==='b'&&CX.flip&&CG.names.w==='Ana'),'guest has black, board turned');
  await click(A,'d2'); await click(A,'d4'); ok(await until(B,()=>CG.ucis.length===1),'move crossed the wire');
  await click(B,'d7'); await click(B,'d5'); ok(await until(A,()=>CG.ucis.length===2),'and back');
  ok(await A.evaluate(()=>!chessHuman(chFindUCI(CG.st,'d5d4'))),'can’t move the other side');
  await shot(A,'14_net_A.png'); await shot(B,'15_net_B.png');
  await B.click('#chess [data-cz="draw"]'); ok(await until(A,()=>CG.drawFrom==='them'),'draw offer arrives');
  await A.click('#chess [data-cz="drawyes"]'); ok(await until(B,()=>CG.over&&CG.over.why==='agreement'),'draw agreed on both');
  await A.click('#chess [data-cz="again"]'); await B.click('#chess [data-cz="again"]');
  ok(await until(A,()=>CG.ucis.length===0&&!CG.over&&CG.me==='b')&&await until(B,()=>CG.me==='w'),'rematch with colours swapped');
  await B.evaluate(()=>closeChess()); await B.close();
  ok(await until(A,()=>CG.over&&/left/.test(CG.over.why)||/dead/.test(CN.status),null,15000),'a dropped line ends the game');
  for(const p of [A,M,Q]) ok(!p.errs.length,'no page errors'+(p.errs.length?': '+p.errs.slice(0,3).join(' | '):''));
  await b.close(); srv.close(); peer.kill(); console.log(fails?`\n${fails} failure(s)`:'\nAll checks passed'); process.exit(fails?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
