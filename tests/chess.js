/* 1.11: chess. The rules (perft against published counts), SAN/PGN, game
   endings, the fallback engine, the characters, the table props, winnings. */
const {load}=require('./harness');
const vm=require('vm');
let fails=0; const ok=(c,m)=>{ if(!c){ console.log('  FAIL:',m); fails++; } };
const K=load({isolated:true,globals:{setTimeout,clearTimeout}}); const E=s=>vm.runInContext(s,K);
let t=0; const ks=n=>{ for(let i=0;i<n;i++){ t+=16; K.frame(t); } };

console.log('— rules: perft');
const perft=(fen,d)=>E(`chPerft(chFromFEN(${JSON.stringify(fen)}),${d})`);
const START='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
for(const [fen,d,n] of [[START,1,20],[START,2,400],[START,3,8902],[START,4,197281],
  ['r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',1,48],
  ['r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',2,2039],
  ['r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',3,97862],
  ['8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1',4,43238],
  ['r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1',3,9467],
  ['rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8',3,62379],
  ['r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10',3,89890]]){
  const got=perft(fen,d); ok(got===n,`perft ${d} of ${fen.split(' ')[0]}: ${got}, want ${n}`); }

console.log('— FEN, SAN, PGN');
ok(E(`chFEN(chFromFEN(${JSON.stringify(START)}))`)===START,'FEN round trip');
const play=(moves,fen)=>E(`(()=>{ const st=chFromFEN(${JSON.stringify(fen||START)}); const out=[]; for(const s of ${JSON.stringify(moves)}){ const m=chFromSAN(st,s); if(!m) return 'bad:'+s; out.push(chSAN(st,m)); chMake(st,m); } return {out,fen:chFEN(st),status:chStatus(st)}; })()`);
{ const r=play(['f3','e5','g4','Qh4']); ok(r.out&&r.out[3]==='Qh4#'&&r.status&&r.status.why==='checkmate'&&r.status.result==='0-1','fool’s mate not seen: '+JSON.stringify(r)); }
{ const r=play(['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','Nf6','O-O','Be7']); ok(r.out&&r.out[8]==='O-O'&&/1RK1/.test(r.fen.split(' ')[0]),'castling'); }
{ const r=play(['e4','d5','e5','f5','exf6']); ok(r.out&&r.out[4]==='exf6'&&r.fen.startsWith('rnbqkbnr/ppp1p1pp/5P2'),'en passant: '+JSON.stringify(r)); }
{ const r=play(['a8=Q+'],'7k/P7/8/8/8/8/8/K7 w - - 0 1'); ok(r.out&&r.out[0]==='a8=Q+','promotion SAN: '+JSON.stringify(r)); }
{ const r=play(['Nbd2'],'4k3/8/8/8/8/5N2/8/1N2K3 w - - 0 1'); ok(r.out&&r.out[0]==='Nbd2','disambiguation: '+JSON.stringify(r)); }
{ const r=play(['Qf7'],'7k/8/6K1/5Q2/8/8/8/8 w - - 0 1'); ok(r.out&&r.out[0]==='Qf7'&&r.status&&r.status.why==='stalemate','stalemate by move: '+JSON.stringify(r)); }
ok(E(`chStatus(chFromFEN('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')).why`)==='stalemate','stalemate');
ok(E(`chStatus(chFromFEN('8/8/4k3/8/8/2BK4/8/8 w - - 0 1')).why`)==='insufficient material','K+B v K');
ok(!E(`chStatus(chFromFEN('8/8/4k3/8/8/2NK4/8/1N6 w - - 0 1'))`),'K+NN v K is not dead by rule');
ok(E(`chStatus(chFromFEN('8/8/4k3/8/8/3K4/8/8 w - - 0 80')).why`)==='insufficient material','bare kings');
ok(E(`chStatus(chFromFEN('8/8/4k3/8/8/3K4/8/7R w - - 100 80')).why`)==='the fifty-move rule','fifty moves');
{ const r=play(['Nf3','Nf6','Ng1','Ng8','Nf3','Nf6','Ng1','Ng8']); ok(r.status&&r.status.why==='threefold repetition','threefold: '+JSON.stringify(r.status)); }

console.log('— the fallback engine');
ok(E(`chUCI(chSearch(chFromFEN('6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1'),{depth:3,ms:2000}).move)`)==='d1d8','misses mate in one');
ok(E(`chUCI(chSearch(chFromFEN('4k3/8/8/3q4/8/8/3R4/3K4 w - - 0 1'),{depth:3,ms:2000}).move)`)==='d2d5','won’t take a hanging queen');
ok(E(`(()=>{ const st=chFromFEN(); const r=chSearch(st,{depth:3,ms:1500}); return !!chFindUCI(st,chUCI(r.move)); })()`),'engine move not legal');

console.log('— a game against a character');
E('localStorage.clear&&localStorage.clear()');
E("chessSetOpt('engine','own'); chessSetOpt('colour','w')");
E('openChess()'); ok(E('CX.open')&&/Play the town/.test(E('elChess.innerHTML')),'no chess room');
ok(/Marla Ostrowski/.test(E('elChess.innerHTML')),'Marla not on the list');
ok(!E("chessOpen_(chFoe('chuck'))")&&E("chessOpen_(chFoe('marla'))"),'unlocking by act');
ok(!E("chessOpen_(chFoe('formless'))"),'the Formless One before any ending');
E("chessNew('ai',{foe:'marla',me:'w'})"); ok(E('CG.mode')==='ai'&&E("CX.view")==='game','no game');
ok(/cz-board/.test(E('elChess.innerHTML'))&&(E('elChess.innerHTML').match(/class="cz-sq/g)||[]).length===64,'board not drawn');
ok(E("chessHuman(chFindUCI(CG.st,'e2e4'))")&&E('CG.sans[0]')==='e4','could not move');
ok(!E("chessHuman(chFindUCI(CG.st,'d2d4'))"),'moved out of turn');
/* the character answers (the small engine runs on a timer here) */
const wait=(cond,ms=8000)=>new Promise(res=>{ const t0=Date.now(); const f=()=>{ if(cond()) return res(true); if(Date.now()-t0>ms) return res(false); setTimeout(f,20); }; f(); });
(async()=>{
  ok(await wait(()=>E('CG.ucis.length')===2),'Marla never moved');
  ok(E('CG.st.turn')==='w','not white to move after her reply');
  E('chessUndo()'); ok(E('CG.ucis.length')===0&&E('CG.helped'),'take-back');
  /* persistence */
  E("chessHuman(chFindUCI(CG.st,'d2d4'))"); await wait(()=>E('CG.ucis.length')===2);
  ok(E('chessData().cur&&chessData().cur.ucis.length')===2,'unfinished game not kept');
  E('closeChess()'); ok(!E('CX.open'),'did not close');
  /* PGN */
  E("chessNew('hot',{names:{w:'Ann',b:'Bo'}})"); for(const u of ['f2f3','e7e5','g2g4','d8h4']) E(`chessHuman(chFindUCI(CG.st,'${u}'))`);
  const pgn=E('chessPGN()'); ok(/\[White "Ann"\]/.test(pgn)&&/1\. f3 e5 2\. g4 Qh4# 0-1/.test(pgn)&&E('CG.over.why')==='checkmate','PGN: '+pgn);
  ok(E("chessRec('hot').b")===1,'hot-seat tally');
  /* a win in a run pays once */
  K.begin('dean'); ks(2); K.skipCutscene(); ks(3);
  const cash0=K.S.cash; E("chessNew('ai',{foe:'earl',me:'w',fen:'6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1'})");
  E("chessHuman(chFindUCI(CG.st,'d1d8'))"); ok(E('CG.over&&CG.over.result')==='1-0','mate not registered');
  ok(K.S.cash===cash0+25&&K.S.flags.chess_earl,'no winnings: '+(K.S.cash-cash0));
  E("chessNew('ai',{foe:'earl',me:'w',fen:'6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1'})"); E("chessHuman(chFindUCI(CG.st,'d1d8'))"); ok(K.S.cash===cash0+25,'paid twice');
  ok(E("chessRec('earl').w")===2,'record');
  /* draw offers */
  E("chessNew('ai',{foe:'sarah',me:'w'})"); E('chessOfferDraw()'); ok(!E('CG.over'),'Sarah took a draw on move one');
  /* the table props */
  for(const [sid,foe] of [['motel','marla'],['library','sarah'],['lounge','juno']]){
    const e=E(`SECTORS.${sid}.entities.find(e=>e.chess==='${foe}')`); ok(e&&typeof E(`USES['chess_${foe}']`)==='function','no chess table in '+sid);
    if(e) ok(!E(`solidAt(SECTORS.${sid},${e.x|0},${e.y|0})`),'table inside a wall in '+sid); }
  E('S.caseOpen=false'); E("USES.chess_sarah()"); ok(E('CX.open')&&E('CG.foe.id')==='sarah'&&K.S.caseOpen,'the library board');
  E('closeChess()'); ok(!K.S.caseOpen,'caseOpen stuck');
  /* pause menu */
  E('openPause()'); ok(E("dlg.avail.some(c=>c.text==='Chess')"),'no Chess in the pause menu'); E('closeDlg()');
  /* every character has lines and a portrait look */
  for(const f of E('CH_FOES')){ ok(f.lines&&f.lines.hi&&f.lines.win&&f.lines.lose&&f.lines.dYes,'lines for '+f.id); ok(E(`!!LOOKS[chVal(chFoe('${f.id}').look)]`),'look for '+f.id); }
  console.log(fails?`${fails} failure(s)`:'All checks passed'); process.exit(fails?1:0);
})();
