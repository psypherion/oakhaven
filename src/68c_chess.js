/* ═══ Chess: the table ═════════════════════════════════════════════════════
   Play the town, play each other on one screen, or play across the wire.
   The town's players are driven by Stockfish 10 (GPL) fetched at run time
   from jsDelivr into a Web Worker, so the game file itself stays free of
   GPL code; with no connection the same characters fall back to the small
   engine in 68a. Each character has a strength, a temper and a mouth. */

const CHESS_KEY='oakhaven.chess.v1';
function chessData(){ try{ const d=JSON.parse(localStorage.getItem(CHESS_KEY)||'null'); if(d&&typeof d==='object') return Object.assign({rec:{},opt:{},cur:null},d); }catch(e){} return {rec:{},opt:{},cur:null}; }
function chessSave(d){ try{ localStorage.setItem(CHESS_KEY,JSON.stringify(d)); }catch(e){} }
function chessOpt(){ return Object.assign({colour:'w',engine:'auto',dots:true,tc:'none',flip:true,sound:true,name:''},chessData().opt); }
function chessSetOpt(k,v){ const d=chessData(); d.opt[k]=v; chessSave(d); }
function chessRec(id){ return Object.assign({w:0,l:0,d:0},chessData().rec[id]); }
function chessTally(id,res){ const d=chessData(); const r=Object.assign({w:0,l:0,d:0},d.rec[id]); r[res]=(r[res]||0)+1; d.rec[id]=r; chessSave(d); }

/* ── who you can play ─────────────────────────────────────────────────────
   skill: Stockfish's Skill Level (0–20) and its think time; own: the
   fallback engine's depth and how often it lets a move slip. */
const chBro=()=>(typeof S==='object'&&S.hero==='sam')?'dean':'sam';
const CH_FOES=[
  {id:'marla',name:'Marla Ostrowski',look:'marla',role:'Night clerk',act:1,skill:0,ms:120,stake:15,
   style:'Plays the way she signs the ledger: one careful line at a time, and never looks up.',
   lines:{hi:['Pull up the stool. I play with the night porter, but he died in ’09.','You can be white. Guests go first.'],
     take:['Mm. I’ll write that down.','That one was a guest, too.'],lost:['Oh. Well. Somebody has to check out.'],
     check:['Check, is it? Says so in the rules.'],ahead:['Don’t look at me like that, I’m only counting.'],behind:['I’ve lost to worse. Not many.'],
     win:['Thirty-one years at that desk. You learn to wait for people to make a mistake.'],lose:['Good game, hon. Room key’s on the hook.'],draw:['Even. Like the books.'],
     dYes:'Fine. I’m tired anyway.',dNo:'No, I think I’ll see it through.'}},
  {id:'earl',name:'Earl Duchesne',look:'earl',role:'Earl’s Pawn & Loan',act:1,skill:3,ms:200,stake:25,
   style:'Treats every trade as a sale. Will happily give you a pawn if it costs you a rook later.',
   lines:{hi:['Five bucks a game. No refunds.','I’ve got a board in the back. Pieces are all original. Mostly.'],
     take:['Sold.','That one I’ll take on consignment.'],lost:['Hey. That was collateral.'],check:['Check. Read the fine print.'],
     ahead:['Interest is compounding, friend.'],behind:['I’ve been in deeper holes. Literal ones.'],
     win:['Pleasure doing business.'],lose:['Fine. Fine. Take it out of my till.'],draw:['Even trade. I hate those.'],dYes:'Deal.',dNo:'Not at that price.'}},
  {id:'juno',name:'Juno',look:'juno',role:'The Velvet Hour',act:1,skill:5,ms:250,stake:30,
   style:'Bar chess. Fast, loose, all attack. Pours you a drink and goes for your king.',
   lines:{hi:['Last round’s on the house if you beat me. Nobody does.','I learned this from a man who owed me money.'],
     take:['That’s a tax.','Don’t look so hurt. It’s a game.'],lost:['Okay, that one stung. Pain is a tax, right?'],check:['Check, sweetheart.'],
     ahead:['You’re drinking slower. That means you’re losing.'],behind:['Huh. You’re better sober.'],
     win:['Tab’s open. Come back when you’re thirsty for another.'],lose:['Well. Look at you. Drink’s on me.'],draw:['A draw. How very sober of us.'],dYes:'Fine. Cheers.',dNo:'Not a chance, honey.'}},
  {id:'brother',name:()=>`${nmC(chBro())} ${nmC('family')}`,look:()=>chBro()==='dean'?'dean_leather':'sam_canvas',role:'Your brother',act:1,skill:7,ms:300,stake:0,
   style:()=>chBro()==='dean'?'Charges. Kicks the door in with his queen and asks questions later.':'Plays the book. Read three openings in a motel once, and remembers all of them.',
   lines:{hi:[()=>chBro()==='dean'?'Dad taught us on a travel set with a bottle cap for a bishop. Don’t cry about it.':'Best of three. Loser drives the night shift.'],
     take:[()=>chBro()==='dean'?'Ha. Ganked.':'Sorry. Not sorry.'],lost:[()=>chBro()==='dean'?'Son of a— fine.':'Okay. I saw that. I just… didn’t.'],
     check:[()=>chBro()==='dean'?'Check, princess.':'Check.'],ahead:['You’re thinking too hard.'],behind:['Okay. Okay. I’ve got this.'],
     win:[()=>chBro()==='dean'?'And that is why I drive.':'Loser drives.'],lose:[()=>chBro()==='dean'?'Fine. You win. Don’t make it weird.':'Okay. Rematch. Tomorrow.'],
     draw:['Call it.'],dYes:'Yeah, alright.',dNo:'Nope. Play it out.'}},
  {id:'sarah',name:()=>`${nmC('sarah')} Lindqvist`,look:'sarah',role:'Librarian',act:1,skill:9,ms:400,stake:40,
   style:'Correspondence chess with three players in Ohio since 1998. Solid, exact, quietly ruthless.',
   lines:{hi:['Quietly, please. This is still a library.','I have a board under the returns desk. Pete used to play.'],
     take:['Shh.','Filed.'],lost:['That is overdue.'],check:['Check. Please lower your voice.'],ahead:['You can renew the position, if you like.'],behind:['Hm. Interesting. I’ll want that line written down.'],
     win:['Pete would have liked you. He lost the same way.'],lose:['Well played. I’ll stamp that in the book.'],draw:['A draw. Accurate.'],dYes:'Agreed.',dNo:'I would rather finish the chapter.'}},
  {id:'alistair',name:'Father Alistair',look:'alistair',role:'St. Brendan’s',act:3,skill:11,ms:500,stake:50,
   style:'Patient as a confessional. Lets you overextend, then forgives you very slowly.',
   lines:{hi:['Sit. A game is a kind of prayer: you choose, and then you live with it.'],take:['Go in peace.','Absolved.'],lost:['Every sacrifice means something. That one meant I wasn’t looking.'],
     check:['Check, my son.'],ahead:['You hurry. The Lord does not hurry.'],behind:['Mercy is not the same as winning. I know that better than most.'],
     win:['There. Now go and sleep.'],lose:['Well. I have lost worse things than a game.'],draw:['Peace, then.'],dYes:'Peace.',dNo:'Not yet. Not yet.'}},
  {id:'kevin',name:'Kevin Tran',look:'kevin',role:'Prophet of the Lord',act:2,skill:13,ms:600,stake:55,
   style:'AP Calculus and a direct line to the Word of God. Calculates everything, and apologises for it.',
   lines:{hi:['I was in chess club. I was also in every other club. Sit.'],take:['Sorry. It was mathematically correct.'],lost:['That’s fine. That’s fine. I have a plan.'],
     check:['Check. I think. Yes, check.'],ahead:['I’m seeing about eleven moves ahead and I don’t love what’s in them for you.'],behind:['This isn’t on any of the tablets.'],
     win:['Good game! My mom says I have to say that.'],lose:['Okay. Okay. That’s going on my record, isn’t it.'],draw:['A draw. My mom would say a draw is a loss you didn’t study for.'],dYes:'Sure. Yes. Thank you.',dNo:'I can still win this, statistically.'}},
  {id:'castiel',name:'Castiel',look:'castiel',role:'Angel of the Lord',act:3,skill:15,ms:700,stake:60,
   style:'Plays with terrible, literal honesty. Never bluffs. Has never once needed to.',
   lines:{hi:['I have watched this game since it was played with river stones. I would like to try it.'],take:['I am taking this piece.','Your knight is gone. I’m sorry.'],lost:['I did not foresee that. Which is unusual.'],
     check:['Your king is in danger. That is what “check” means.'],ahead:['You should know that you are losing.'],behind:['I am… uncomfortable.'],
     win:['That was enjoyable. Is that the correct word?'],lose:['I understand this game better now. Thank you.'],draw:['Neither of us is defeated. That is good.'],dYes:'Yes.',dNo:'No. I believe I can still win.'}},
  {id:'lilith',name:'Lilith',look:'lilith',role:'The Demon Queen',act:3,skill:16,ms:800,stake:65,
   style:'The queen is not her favourite piece. It is her self-portrait.',
   lines:{hi:['I used to make people believe their moves were their own. Now I only want to watch you choose.'],take:['Mine.','I asked nicely.'],lost:['How rude. How very human.'],
     check:['Check. Feel that? That’s what it’s like to be cornered.'],ahead:['You’re practising losing. It suits you.'],behind:['Mm. You’re interesting after all.'],
     win:['Thank you for the game. I meant that. I’m practising.'],lose:['Oh. You actually beat me. Do it again some time.'],draw:['Restraint. I’m learning.'],dYes:'Since you asked.',dNo:'No. I don’t think so.'}},
  {id:'crowley',name:'Crowley',look:'crowley',role:'King of the Crossroads',act:2,skill:18,ms:1000,stake:80,
   style:'Has been playing for souls since before your great-grandfather lost his. Plays for the deal, not the board.',
   lines:{hi:['A friendly game. Stakes are nominal. Your soul, say, at a deep discount. Kidding. Mostly.'],take:['Lovely. Into the pile.','That one I’ll keep for the collection.'],lost:['Moose-sized blunder on my part. Don’t get used to it.'],
     check:['Check, darling.'],ahead:['You know, I could make all this go away. One little signature.'],behind:['I don’t like this. I’m going to have someone look into you.'],
     win:['Hello, boys. And goodbye.'],lose:['Fine. FINE. Best of seven.'],draw:['A draw. Contract void. How tedious.'],dYes:'Deal. No kiss required.',dNo:'Read the fine print, love. No.'}},
  {id:'chuck',name:'Chuck',look:'chuck',role:'The author',act:4,skill:20,ms:1400,stake:100,
   style:'Knows how this one ends. Wrote it. Plays anyway, because he likes the part in the middle.',
   lines:{hi:['I know how this ends. I wrote it. Let’s play anyway, the middle’s the good part.'],take:['Sorry. Edit.','Cut that scene.'],lost:['Huh. I didn’t write that. Did I write that?'],
     check:['Check. Spoiler.'],ahead:['You can still turn it around. Statistically. I mean, no. But spiritually.'],behind:['Okay, this is new. I like new.'],
     win:['The end. Mostly.'],lose:['Well. Look at that. A plot twist.'],draw:['Open ending. Critics hate those.'],dYes:'Sure. Let’s call it a cliffhanger.',dNo:'No, I want to see what happens.'}},
  {id:'formless',name:'The Formless One',look:'shade',role:'What waits at the end',act:5,skill:20,ms:2500,stake:0,
   style:'No face, no clock, no hurry. Stockfish at full strength, thinking as long as it likes.',
   lines:{hi:['…you came back to the board. Good. Sit with me.'],take:['…'],lost:['…interesting.'],check:['…check.'],ahead:['…'],behind:['…you see further than I thought.'],
     win:['…again, when you’re ready.'],lose:['…you have become something. I wonder what.'],draw:['…balance.'],dYes:'…yes.',dNo:'…no.'}},
];
const chFoe=id=>CH_FOES.find(f=>f.id===id);
const chVal=v=>typeof v==='function'?v():v;
const chPick=a=>{ a=(a||[]).map(chVal); return a.length?a[(Math.random()*a.length)|0]:''; };
function chessReach(){ let a=1; try{ a=Math.max(a,loadProgress().act||1); }catch(e){} if(typeof S==='object'&&S.running&&S.act) a=Math.max(a,S.act); return a; }
function chessEnded(){ try{ return (loadProgress().endings||[]).length>0; }catch(e){ return false; } }
function chessOpen_(f){ return f.id==='formless'?chessEnded():chessReach()>=f.act; }
/* the fallback engine's version of each character */
const chOwnOpt=f=>({depth:f.skill<3?1:f.skill<8?2:f.skill<14?3:4,ms:250+f.skill*45,blunder:Math.max(0,.42-f.skill*.035)});

/* ── Stockfish, fetched when first needed ─────────────────────────────── */
const SF={state:'idle',w:null,p:null,q:[],wait:null,url:'https://cdn.jsdelivr.net/npm/stockfish@10.0.2/src/stockfish.asm.js',name:'Stockfish 10'};
function sfLoad(){
  if(SF.state==='ready') return Promise.resolve(true);
  if(SF.p) return SF.p;
  if(typeof Worker!=='function'||typeof fetch!=='function'||typeof Blob!=='function'){ SF.state='off'; return Promise.resolve(false); }
  SF.state='loading'; chessEngineNote();
  SF.p=new Promise(res=>{ let done=false, tm=0;
    const fin=ok=>{ if(done) return; done=true; clearTimeout(tm); SF.state=ok?'ready':'off'; SF.wait=null;
      if(!ok){ try{ SF.w&&SF.w.terminate(); }catch(e){} SF.w=null; SF.p=null; } chessEngineNote(); res(ok); };
    tm=setTimeout(()=>fin(false),25000);
    fetch(SF.url).then(r=>{ if(!r.ok) throw new Error('http '+r.status); return r.text(); }).then(txt=>{
      const w=new Worker(URL.createObjectURL(new Blob([txt],{type:'text/javascript'}))); SF.w=w;
      w.onmessage=e=>sfLine(String(e&&e.data!=null?e.data:'')); w.onerror=()=>fin(false);
      SF.wait=l=>{ if(l.startsWith('uciok')) w.postMessage('isready'); else if(l.startsWith('readyok')) fin(true); };
      w.postMessage('uci');
    }).catch(()=>fin(false)); });
  return SF.p; }
function sfLine(l){ if(SF.wait){ SF.wait(l); return; }
  const j=SF.q[0]; if(!j) return;
  const m=/score (cp|mate) (-?\d+)/.exec(l); if(m&&l.startsWith('info')) j.score=m[1]==='mate'?(+m[2]>0?99999:-99999):+m[2];
  if(l.startsWith('bestmove')){ SF.q.shift(); clearTimeout(j.tm); const mv=l.split(/\s+/)[1]; if(!j.dead) j.res(mv&&mv!=='(none)'?{uci:mv,score:j.score}:null); } }
function sfBest(fen,skill,ms){ return new Promise(res=>{ if(SF.state!=='ready'||!SF.w) return res(null);
  const j={res,dead:false,score:null}; j.tm=setTimeout(()=>{ j.dead=true; res(null); },ms+15000); SF.q.push(j);
  const w=SF.w; w.postMessage('setoption name Skill Level value '+Math.max(0,Math.min(20,skill|0)));
  w.postMessage('position fen '+fen); w.postMessage('go movetime '+Math.max(50,ms|0)); }); }
function sfCancel(){ for(const j of SF.q) if(!j.dead){ j.dead=true; clearTimeout(j.tm); j.res(null); } if(SF.q.length&&SF.w) try{ SF.w.postMessage('stop'); }catch(e){} }

/* ── the small engine, in a worker of its own when the browser allows ── */
let CH_W=null; const CH_WQ={};
function chOwnWorker(){ if(CH_W!==null) return CH_W;
  try{ if(typeof Worker!=='function') throw 0;
    const fns={chSq,chName,chColor,chKingSq,chUCI,chFromFEN,chFEN,chKey,chClone,chAttacked,chInCheck,chPseudo,chMake,chUnmake,chLegal,chEval,chOrder,chSearch};
    const consts={CH_FILES,CH_START,N_OFF,K_OFF,B_DIR,R_DIR,CH_VAL,CH_PST};
    const src=Object.entries(consts).map(([k,v])=>`var ${k}=${JSON.stringify(v)};`).join('\n')+'\n'+Object.entries(fns).map(([k,v])=>`var ${k}=${v.toString()};`).join('\n')+
      '\nonmessage=function(e){ var d=e.data, st=chFromFEN(d.fen); if(d.keys) st.keys=d.keys; var r=chSearch(st,d.opt); postMessage({id:d.id,uci:r.move?chUCI(r.move):null,score:r.score}); };';
    CH_W=new Worker(URL.createObjectURL(new Blob([src],{type:'text/javascript'})));
    CH_W.onmessage=e=>{ const d=e.data, f=CH_WQ[d.id]; if(f){ delete CH_WQ[d.id]; f({uci:d.uci,score:d.score}); } };
    CH_W.onerror=()=>{ CH_W=false; for(const k in CH_WQ){ const f=CH_WQ[k]; delete CH_WQ[k]; f(null); } };
  }catch(e){ CH_W=false; }
  return CH_W; }
let CH_WID=0;
function chOwnBest(st,opt){ const w=chOwnWorker();
  if(w) return new Promise(res=>{ const id=++CH_WID; CH_WQ[id]=res; w.postMessage({id,fen:chFEN(st),keys:st.keys.slice(),opt}); });
  return new Promise(res=>setTimeout(()=>{ const r=chSearch(chClone(st),opt); res({uci:r.move?chUCI(r.move):null,score:r.score}); },0)); }

/* ── a game ───────────────────────────────────────────────────────────── */
/* CG: mode 'ai'|'hot'|'net'; me: the colour the local player has (ai/net) */
let CG=null;
const CH_TC={none:{t:0,inc:0,label:'No clock'},'3+2':{t:180,inc:2,label:'3 + 2'},'5+0':{t:300,inc:0,label:'5 min'},'10+5':{t:600,inc:5,label:'10 + 5'},'15+10':{t:900,inc:10,label:'15 + 10'},'30+0':{t:1800,inc:0,label:'30 min'}};
function chessNew(mode,o){ o=o||{};
  const st=chFromFEN(o.fen||CH_START);
  CG={mode,foe:o.foe?chFoe(o.foe):null,me:o.me||'w',st,start:chFEN(st),sans:[],ucis:[],over:null,gen:(CG&&CG.gen||0)+1,thinking:false,helped:false,
    tc:o.tc||'none',clock:null,last:null,names:o.names||null,drawFrom:null,bubble:'',inRun:typeof S==='object'&&!!S.running,hint:null};
  const T=CH_TC[CG.tc]; if(T&&T.t) CG.clock={w:T.t*1000,b:T.t*1000,inc:T.inc*1000,at:0};
  CX.sel=-1; CX.flip=mode==='hot'?false:CG.me==='b'; CX.view='game';
  if(CG.foe) chessSay(chPick(CG.foe.lines.hi));
  for(const u of o.ucis||[]){ const m=chFindUCI(CG.st,u); if(!m) break; chessApply(m,true); }
  chessPersist(); renderChess(); chessMaybeAI(); }
function chessTurnIsMine(){ if(!CG||CG.over) return false; if(CG.mode==='hot') return true; return CG.st.turn===CG.me; }
/* apply a legal move (from any source) */
function chessApply(m,quiet){ const G=CG, st=G.st, L=chLegal(st), san=chSAN(st,m,L), mover=st.turn;
  /* the clocks start once Black has made a first move */
  if(G.clock&&!quiet){ const now=Date.now(), n=G.ucis.length; if(n>=2&&G.clock.at) G.clock[mover]=Math.max(0,G.clock[mover]-(now-G.clock.at))+G.clock.inc; G.clock.at=n>=1?now:0; }
  chMake(st,m); G.sans.push(san); G.ucis.push(chUCI(m)); G.last=m; G.hint=null; G.drawFrom=null;
  if(!quiet) chessSfx(m,san);
  const s=chStatus(st); if(s) chessEnd(s,quiet);
  else if(!quiet&&G.foe){ const foeMoved=mover!==G.me;
    if(san.includes('+')&&foeMoved&&Math.random()<.7) chessSay(chPick(G.foe.lines.check));
    else if(m.cap&&foeMoved&&Math.random()<.45) chessSay(chPick(G.foe.lines.take));
    else if(m.cap&&!foeMoved&&Math.random()<.4) chessSay(chPick(G.foe.lines.lost));
    else if(foeMoved&&G.sans.length>14&&Math.random()<.12){ const mat=chMaterial(st.b), mine=G.me==='w'?mat:-mat; if(mine<-250) chessSay(chPick(G.foe.lines.ahead)); else if(mine>250) chessSay(chPick(G.foe.lines.behind)); } }
  return san; }
function chMaterial(b){ let s=0; for(const p of b) if(p) s+=(p===p.toUpperCase()?1:-1)*CH_VAL[p.toLowerCase()]; return s; }
function chessEnd(s,quiet){ const G=CG; G.over=s; if(G.clock) G.clock.at=0; sfCancel();
  if(quiet) return;
  const winC=s.result==='1-0'?'w':s.result==='0-1'?'b':null;
  if(G.mode==='ai'&&G.foe){ const res=!winC?'d':winC===G.me?'w':'l'; chessTally(G.foe.id,res);
    chessSay(chPick(res==='w'?G.foe.lines.lose:res==='l'?G.foe.lines.win:G.foe.lines.draw));
    if(res==='w') chessReward(G.foe); }
  else if(G.mode==='net'){ chessTally('net',!winC?'d':winC===G.me?'w':'l'); }
  else if(G.mode==='hot') chessTally('hot',winC||'d');
  const d=chessData(); d.cur=null; chessSave(d);
  chessSfxEnd(); }
/* winning against the town, during a run, is worth something once */
function chessReward(f){ if(!CG||!CG.inRun||typeof S!=='object'||!S.running||!f.stake) return;
  if(CG.helped){ CX.note='No winnings for a game with take-backs or hints.'; return; }
  S.flags=S.flags||{}; const k='chess_'+f.id; if(S.flags[k]) return; S.flags[k]=true;
  S.cash=(S.cash||0)+f.stake; CX.note=`${chVal(f.name)} pays up: $${f.stake}.`; try{ toast(CX.note); }catch(e){} }
function chessPersist(){ if(!CG||CG.mode==='net') return; const d=chessData();
  d.cur=CG.over?null:{mode:CG.mode,foe:CG.foe&&CG.foe.id,me:CG.me,ucis:CG.ucis.slice(),tc:CG.mode==='hot'?CG.tc:'none',fen:CG.start}; chessSave(d); }
function chessMaybeAI(){ const G=CG; if(!G||G.over||G.mode!=='ai'||G.st.turn===G.me||G.thinking) return;
  G.thinking=true; const gen=G.gen, ply=G.ucis.length, f=G.foe, t0=Date.now(); renderChessSide();
  const own=()=>chOwnBest(G.st,chOwnOpt(f));
  const go=chessOpt().engine==='own'?own():sfLoad().then(ok=>ok?sfBest(chFEN(G.st),f.skill,f.ms):null).then(r=>r||own());
  go.then(r=>{ const wait=Math.max(0,(f.id==='formless'?900:380)-(Date.now()-t0));
    setTimeout(()=>{ if(CG!==G||G.gen!==gen||G.over||G.ucis.length!==ply) return; G.thinking=false;
      const m=r&&r.uci?chFindUCI(G.st,r.uci):null; const mv=m||chLegal(G.st)[0]; if(!mv) return;
      if(r&&r.score!=null) G.eval=r.score;
      chessApply(mv); chessPersist(); renderChess(); },wait); }); }
function chessHuman(m){ const G=CG; if(!G||!m||!chessTurnIsMine()) return false;
  chessApply(m); CX.sel=-1;
  if(G.mode==='net') chessNetSend({t:'move',uci:chUCI(m),ply:G.ucis.length-1,clock:G.clock?{w:G.clock.w,b:G.clock.b}:null});
  if(G.mode==='hot'&&chessOpt().flip&&!G.over) CX.flip=G.st.turn==='b';
  chessPersist(); renderChess(); chessMaybeAI(); return true; }
function chessUndo(){ const G=CG; if(!G||G.mode==='net'||!G.ucis.length) return;
  sfCancel(); G.thinking=false; G.gen++; const back=G.mode==='ai'?(G.st.turn===G.me?2:1):1;
  const keep=G.ucis.slice(0,Math.max(0,G.ucis.length-back)); const o={foe:G.foe&&G.foe.id,me:G.me,tc:G.tc,names:G.names,fen:G.start};
  const was={helped:true,bubble:G.bubble}; CG=null; chessNew(G.mode,Object.assign(o,{ucis:keep})); Object.assign(CG,was); if(G.foe) CG.bubble=''; renderChess(); }
function chessResign(){ const G=CG; if(!G||G.over) return; const loser=G.mode==='hot'?G.st.turn:G.me;
  if(G.mode==='net') chessNetSend({t:'resign'});
  chessEnd({over:true,result:loser==='w'?'0-1':'1-0',why:(G.mode==='hot'?(loser==='w'?'White':'Black'):'you')+' resigned'}); renderChess(); }
function chessOfferDraw(){ const G=CG; if(!G||G.over) return;
  if(G.mode==='hot'){ chessEnd({over:true,result:'1/2-1/2',why:'agreement'}); renderChess(); return; }
  if(G.mode==='net'){ chessNetSend({t:'draw'}); CX.note='Draw offered.'; renderChessSide(); return; }
  /* a character takes a draw when the game is level and long, or when they're losing */
  const mat=chMaterial(G.st.b), foeSide=G.me==='w'?-mat:mat, ev=G.eval!=null?G.eval:null;
  const yes=G.ucis.length>=40&&Math.abs(foeSide)<150||foeSide<-300||(ev!=null&&ev<-250);
  chessSay(yes?G.foe.lines.dYes:G.foe.lines.dNo);
  if(yes){ chessEnd({over:true,result:'1/2-1/2',why:'agreement'}); }
  renderChess(); }
function chessHint(){ const G=CG; if(!G||!chessTurnIsMine()||G.mode==='net') return; G.helped=true; CX.note='Thinking…'; renderChessSide();
  const gen=G.gen, ply=G.ucis.length;
  const p=chessOpt().engine==='own'?chOwnBest(G.st,{depth:4,ms:900}):sfLoad().then(ok=>ok?sfBest(chFEN(G.st),20,800):null).then(r=>r||chOwnBest(G.st,{depth:4,ms:900}));
  p.then(r=>{ if(CG!==G||G.gen!==gen||G.ucis.length!==ply) return; const m=r&&r.uci&&chFindUCI(G.st,r.uci); G.hint=m||null; CX.note=m?'Try '+chSAN(G.st,m)+'.':''; renderChess(); }); }
function chessPGN(){ const G=CG; if(!G) return ''; const d=new Date(), pad=n=>String(n).padStart(2,'0');
  const nm=c=>{ if(G.mode==='ai') return c===G.me?(chessOpt().name||'You'):chVal(G.foe.name); if(G.names) return G.names[c]; return c==='w'?'White':'Black'; };
  const res=G.over?G.over.result:'*';
  let h=`[Event "Oakhaven"]\n[Site "Oakhaven"]\n[Date "${d.getFullYear()}.${pad(d.getMonth()+1)}.${pad(d.getDate())}"]\n[White "${nm('w')}"]\n[Black "${nm('b')}"]\n[Result "${res}"]\n`;
  if(G.start!==CH_START) h+=`[SetUp "1"]\n[FEN "${G.start}"]\n`;
  const st0=chFromFEN(G.start); let mv='', n=st0.full, t=st0.turn;
  G.sans.forEach((s,i)=>{ if(t==='w') mv+=n+'. '; else if(i===0) mv+=n+'... '; mv+=s+' '; if(t==='b') n++; t=t==='w'?'b':'w'; });
  return h+'\n'+(mv+res).replace(/(.{1,78})(\s|$)/g,'$1\n').trim()+'\n'; }

/* ── a little sound ───────────────────────────────────────────────────── */
function chessSfx(m,san){ try{ if(!chessOpt().sound||typeof AU!=='object'||!AU.ctx) return;
  if(san.includes('#')) { tn({f:180,to:90,dur:.5,gain:.25,type:'triangle'}); return; }
  if(san.includes('+')) tn({f:520,to:480,dur:.12,gain:.12,type:'sine'});
  nb({dur:m.cap?.09:.05,freq:m.cap?1600:2400,to:m.cap?500:900,type:'bandpass',q:3,gain:m.cap?.5:.32}); tn({f:m.cap?140:190,to:90,dur:.07,gain:.22,type:'triangle'}); }catch(e){} }
function chessSfxEnd(){ try{ if(!chessOpt().sound||typeof AU!=='object'||!AU.ctx) return; tn({f:220,to:110,dur:.7,gain:.18,type:'sine'}); }catch(e){} }

/* ── across the wire: PeerJS, with a short room code ─────────────────── */
const CN={peer:null,link:null,code:'',role:null,status:'',name:'',theirName:'',again:false};
const chessPeerId=c=>'oakhaven-chess1-'+String(c).toLowerCase();
function chessCode(){ const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s=''; for(let i=0;i<5;i++) s+=A[(Math.random()*A.length)|0]; return s; }
function chessNetSend(m){ try{ CN.link&&CN.link.send(m); }catch(e){} }
function chessNetDrop(){ try{ CN.link&&CN.link.close(); }catch(e){} try{ CN.peer&&CN.peer.destroy(); }catch(e){} CN.link=null; CN.peer=null; CN.role=null; CN.code=''; }
function chessNetStatus(s){ CN.status=s; if(CX.open) (CX.view==='game'?renderChessSide:renderChess)(); }
function chessHost(){ chessNetDrop(); CN.role='host'; CN.code=chessCode(); CN.name=chessOpt().name||'Host'; chessNetStatus('Opening a room…');
  const code=CN.code;
  loadPeerJS().then(()=>{ if(CN.code!==code) return; const P=new window.Peer(chessPeerId(code),coopPeerOpts(null)); CN.peer=P;
    P.on('open',()=>chessNetStatus('Room '+code+' is open. Give your friend the code.'));
    P.on('connection',c=>c.on('open',()=>{ if(CN.link){ try{ c.close(); }catch(e){} return; } chessNetLink(coopWrapConn(c)); }));
    P.on('error',e=>{ if(e&&e.type==='unavailable-id'){ chessHost(); return; } chessNetStatus('Couldn’t open a room ('+(e&&e.type||'error')+').'); });
  }).catch(()=>chessNetStatus('Couldn’t load the network code.')); }
function chessJoin(code){ code=String(code||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,''); if(code.length<4){ chessNetStatus('That code looks short.'); return; }
  chessNetDrop(); CN.role='guest'; CN.code=code; CN.name=chessOpt().name||'Guest'; chessNetStatus('Dialling '+code+'…');
  loadPeerJS().then(()=>new Promise((res,rej)=>{ const P=new window.Peer(coopPeerOpts(null)); CN.peer=P; let done=false;
    const fail=t=>{ if(done) return; done=true; clearTimeout(tm); rej(new Error(t)); }; const tm=setTimeout(()=>fail('timeout'),20000);
    P.on('open',()=>{ const c=P.connect(chessPeerId(code),{reliable:true}); c.on('open',()=>{ if(done) return; done=true; clearTimeout(tm); res(coopWrapConn(c)); }); c.on('error',()=>fail('conn')); });
    P.on('error',e=>fail(e&&e.type==='peer-unavailable'?'no such room':(e&&e.type||'error'))); }))
  .then(L=>chessNetLink(L)).catch(e=>{ chessNetStatus('Couldn’t join: '+(e&&e.message||'error')+'.'); try{ CN.peer&&CN.peer.destroy(); }catch(x){} CN.peer=null; }); }
function chessNetLink(L){ CN.link=L;
  L.onclose=()=>{ CN.link=null; if(CG&&CG.mode==='net'&&!CG.over){ chessEnd({over:true,result:CG.me==='w'?'1-0':'0-1',why:'your opponent left'}); } chessNetStatus('The line went dead.'); if(CX.open) renderChess(); };
  L.onmsg=m=>chessNetMsg(m);
  if(CN.role==='guest') chessNetSend({t:'hi',name:CN.name}); else chessNetStatus('Someone is at the door…'); }
function chessNetStart(){ /* the host deals: colours and the clock */
  const pick=chessOpt().colour, hc=pick==='r'?(Math.random()<.5?'w':'b'):pick, tc=chessOpt().tc;
  const names={[hc]:CN.name,[hc==='w'?'b':'w']:CN.theirName||'Guest'};
  chessNetSend({t:'start',you:hc==='w'?'b':'w',tc,names});
  chessNew('net',{me:hc,tc,names}); chessNetStatus('Connected to '+(CN.theirName||'your friend')+'.'); }
function chessNetMsg(m){ if(!m||typeof m.t!=='string') return;
  const G=CG&&CG.mode==='net'?CG:null;
  switch(m.t){
    case 'bye': { const L=CN.link; if(L&&L.onclose){ const f=L.onclose; L.onclose=null; f(); } try{ L&&L.close(); }catch(e){} return; }
    case 'hi': if(CN.role!=='host') return; CN.theirName=String(m.name||'Guest').slice(0,24); chessNetStart(); return;
    case 'start': if(CN.role!=='guest') return; if(m.you!=='w'&&m.you!=='b') return; CN.theirName=String((m.names&&m.names[m.you==='w'?'b':'w'])||'Host').slice(0,24);
      chessNew('net',{me:m.you,tc:CH_TC[m.tc]?m.tc:'none',names:{w:String(m.names&&m.names.w||'White').slice(0,24),b:String(m.names&&m.names.b||'Black').slice(0,24)}});
      chessNetStatus('Connected to '+CN.theirName+'.'); return;
    case 'move': { if(!G||G.over||G.st.turn===G.me||m.ply!==G.ucis.length) return; const mv=chFindUCI(G.st,m.uci); if(!mv) return;
      chessApply(mv); if(G.clock&&m.clock){ const them=G.me==='w'?'b':'w'; if(typeof m.clock[them]==='number') G.clock[them]=m.clock[them]; }
      renderChess(); return; }
    case 'resign': if(!G||G.over) return; chessEnd({over:true,result:G.me==='w'?'1-0':'0-1',why:'your opponent resigned'}); renderChess(); return;
    case 'flag': if(!G||G.over) return; chessEnd({over:true,result:G.me==='w'?'1-0':'0-1',why:'your opponent ran out of time'}); renderChess(); return;
    case 'draw': if(!G||G.over) return; G.drawFrom='them'; CX.note=(CN.theirName||'Your opponent')+' offers a draw.'; renderChess(); return;
    case 'drawyes': if(!G||G.over) return; chessEnd({over:true,result:'1/2-1/2',why:'agreement'}); renderChess(); return;
    case 'drawno': if(!G) return; CX.note='Draw declined.'; renderChessSide(); return;
    case 'again': if(!G||!G.over) return; if(CN.again){ CN.again=false; if(CN.role==='host') chessNetRematch(); } else { CN.again='them'; CX.note=(CN.theirName||'Your opponent')+' wants a rematch.'; renderChess(); } return;
    case 'rematch': if(CN.role!=='guest') return; CN.again=false; chessNew('net',{me:m.you,tc:CH_TC[m.tc]?m.tc:'none',names:m.names||G&&G.names}); return;
  } }
function chessNetRematch(){ const G=CG, me=G.me==='w'?'b':'w', names={w:G.names.b,b:G.names.w};
  chessNetSend({t:'rematch',you:me==='w'?'b':'w',tc:G.tc,names}); CN.again=false; chessNew('net',{me,tc:G.tc,names}); }
function chessAskRematch(){ if(!CN.link) return; if(CN.again==='them'){ CN.again=false; if(CN.role==='host') chessNetRematch(); else chessNetSend({t:'again'}); return; }
  CN.again=true; chessNetSend({t:'again'}); CX.note='Rematch offered.'; renderChessSide(); }

/* ── the clock ─────────────────────────────────────────────────────────── */
function chessClockLeft(c){ const G=CG; if(!G||!G.clock) return 0; let t=G.clock[c]; if(!G.over&&G.clock.at&&G.st.turn===c) t-=Date.now()-G.clock.at; return Math.max(0,t); }
const chClockText=ms=>{ const s=Math.ceil(ms/1000); return s>=60?`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`:ms<10000?(ms/1000).toFixed(1):'0:'+String(s).padStart(2,'0'); };
function chessTick(){ const G=CG; if(!CX.open||!G||!G.clock||G.over) return;
  for(const c of ['w','b']){ const el=elChess.querySelector('[data-clk="'+c+'"]'); if(el){ const ms=chessClockLeft(c); el.textContent=chClockText(ms); el.classList.toggle('run',G.st.turn===c&&!!G.clock.at); el.classList.toggle('low',ms<20000); } }
  const c=G.st.turn; if(G.clock.at&&chessClockLeft(c)<=0){ G.clock[c]=0;
    const mine=G.mode==='hot'||c===G.me; if(G.mode==='net'&&!mine) return; /* their clock: their side calls it */
    if(G.mode==='net') chessNetSend({t:'flag'});
    const other=c==='w'?'b':'w', win=chInsufficient(G.st.b.map(p=>p&&chColor(p)===other?p:(p&&p.toLowerCase()==='k'?p:null)));
    chessEnd({over:true,result:win?'1/2-1/2':(c==='w'?'0-1':'1-0'),why:win?'time, with nothing left to mate':(c==='w'?'White':'Black')+' ran out of time'}); renderChess(); } }
let CH_TICK=0;

/* ═══ the room ═════════════════════════════════════════════════════════ */
const CX={open:false,back:null,view:'lobby',tab:'foes',sel:-1,flip:false,drag:null,promo:null,note:'',focus:null};
const elChess=(()=>{ const d=document.createElement('div'); d.id='chess'; document.body&&document.body.appendChild&&document.body.appendChild(d); return d; })();
function openChess(back,o){ o=o||{}; CX.open=true; CX.back=back||null; CX.note='';
  if(typeof S==='object'&&S.running){ try{ document.exitPointerLock?.(); }catch(e){} try{ clearHeld(); }catch(e){} S.caseOpen=true; }
  elChess.classList.add('on');
  if(!CH_TICK&&typeof setInterval==='function') CH_TICK=setInterval(()=>{ try{ chessTick(); }catch(e){} },100);
  if(o.foe){ const f=chFoe(o.foe); if(f){ const pick=chessOpt().colour, me=pick==='r'?(Math.random()<.5?'w':'b'):pick; chessNew('ai',{foe:f.id,me}); return; } }
  if(!CG||CX.view!=='game') CX.view='lobby';
  renderChess(); if(chessOpt().engine!=='own'&&SF.state==='idle') sfLoad(); }
function closeChess(){ CX.open=false; if(CN.link||CN.peer){ chessNetSend({t:'bye'}); const L=CN.link; CN.link=null; if(L) L.onclose=null; setTimeout(()=>{ try{ L&&L.close(); }catch(e){} try{ CN.peer&&CN.peer.destroy(); }catch(e){} CN.peer=null; CN.role=null; CN.code=''; CN.status=''; },300); } if(CH_TICK&&typeof clearInterval==='function'){ clearInterval(CH_TICK); CH_TICK=0; } elChess.classList.remove('on'); CX.drag=null; CX.promo=null;
  if(typeof S==='object'&&S.running) S.caseOpen=false; const b=CX.back; CX.back=null; if(b) b(); }
function chessSay(t){ if(!CG) return; CG.bubble=chVal(t)||''; }
function chessEngineNote(){ const el=elChess.querySelector&&elChess.querySelector('.cz-eng'); if(el) el.innerHTML=chessEngineText(); }
function chessEngineText(){ if(chessOpt().engine==='own') return 'Engine: built-in';
  return SF.state==='ready'?'Engine: Stockfish 10':SF.state==='loading'?'Engine: loading Stockfish…':SF.state==='off'?'Engine: built-in (Stockfish unreachable)':'Engine: Stockfish 10 (loads on first move)'; }
const esc_c=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
function chessPortrait(look,expr){ try{ return portraitCanvas(look,expr||0).toDataURL(); }catch(e){ return ''; } }

function renderChess(){ if(!elChess) return;
  const head=`<div class="cz-top"><h1>Chess</h1><span class="cz-eng">${chessEngineText()}</span><span class="cz-sp"></span>`+
    (CX.view==='game'?`<button class="opt" data-cz="lobby">Tables</button>`:'')+`<button class="opt" data-cz="close">Close · Esc</button></div>`;
  elChess.innerHTML=head+(CX.view==='game'&&CG?chessGameHTML():chessLobbyHTML());
  chessWire(); }
/* the lobby: three tables */
function chessLobbyHTML(){ const O=chessOpt(), d=chessData(), tab=CX.tab;
  const tabs=[['foes','Play the town'],['hot','Two at one table'],['net','Across the wire']].map(([k,l])=>`<button class="cz-tab${tab===k?' on':''}" data-czt="${k}">${l}</button>`).join('');
  const seg=(k,opts)=>`<div class="cz-seg">${opts.map(([v,l])=>`<button class="${O[k]===v?'on':''}" data-czo="${k}" data-czv="${v}">${l}</button>`).join('')}</div>`;
  const tcSel=`<select data-czs="tc">${Object.entries(CH_TC).map(([k,v])=>`<option value="${k}"${O.tc===k?' selected':''}>${v.label}</option>`).join('')}</select>`;
  let body='';
  if(d.cur&&d.cur.ucis&&d.cur.ucis.length){ const f=d.cur.foe&&chFoe(d.cur.foe);
    body+=`<div class="cz-resume">An unfinished game${f?' against '+esc_c(chVal(f.name)):d.cur.mode==='hot'?' at one table':''}, ${Math.ceil(d.cur.ucis.length/2)} moves in. <button class="opt" data-cz="resume">Resume</button> <button class="opt" data-cz="discard">Abandon</button></div>`; }
  if(tab==='foes'){
    body+=`<div class="cz-opts"><label>You play</label>${seg('colour',[['w','White'],['b','Black'],['r','Either']])}<label>Engine</label>${seg('engine',[['auto','Stockfish'],['own','Built-in']])}<label>Show moves</label>${seg('dots',[[true,'On'],[false,'Off']])}</div>`;
    body+='<div class="cz-foes">'+CH_FOES.map(f=>{ const open=chessOpen_(f), r=chessRec(f.id), pips=Math.round(f.skill/20*9)+1;
      const lock=f.id==='formless'?'After an ending':'Meet them in Act '+['','I','II','III','IV'][f.act];
      return `<button class="cz-foe${open?'':' locked'}${CX.focus===f.id?' focus':''}" ${open?`data-czf="${f.id}"`:'disabled'}>`+
        `<img src="${open?chessPortrait(chVal(f.look)):''}" alt="">`+
        `<b>${open?esc_c(chVal(f.name)):'Unknown'}</b><small>${open?esc_c(f.role):esc_c(lock)}</small>`+
        `<i class="cz-pips">${'◆'.repeat(pips)}<em>${'◇'.repeat(10-pips)}</em></i>`+
        (open?`<span class="cz-style">${esc_c(chVal(f.style))}</span><span class="cz-rec">${r.w}–${r.l}–${r.d}${f.stake&&typeof S==='object'&&S.running&&!(S.flags||{})['chess_'+f.id]?` · wins $${f.stake}`:''}</span>`:'')+`</button>`; }).join('')+'</div>';
  } else if(tab==='hot'){
    const r=chessRec('hot');
    body+=`<div class="cz-card"><h2>Two players, one board</h2><p>Pass the phone, or share the keyboard. White moves first.</p>`+
      `<div class="cz-opts"><label>Clock</label>${tcSel}<label>Turn the board each move</label>${seg('flip',[[true,'Yes'],[false,'No']])}<label>Show moves</label>${seg('dots',[[true,'On'],[false,'Off']])}</div>`+
      `<p class="cz-dim">Games here: White ${r.w}, Black ${r.b||0}, drawn ${r.d}.</p><button class="opt big" data-cz="hot">Set up the board</button></div>`;
  } else {
    const r=chessRec('net');
    body+=`<div class="cz-card"><h2>Play a friend online</h2><p>One of you opens a room and reads out the code; the other types it in. Moves travel peer to peer.</p>`+
      `<div class="cz-opts"><label>Your name</label><input data-czs="name" maxlength="24" value="${esc_c(O.name)}" placeholder="Hunter"><label>Host plays</label>${seg('colour',[['w','White'],['b','Black'],['r','Either']])}<label>Clock (host sets)</label>${tcSel}</div>`+
      `<div class="cz-net"><button class="opt big" data-cz="host">Open a room</button><span>or</span><input data-czs="code" maxlength="6" placeholder="CODE" class="cz-code"><button class="opt big" data-cz="join">Join</button></div>`+
      (CN.code&&CN.role==='host'?`<div class="cz-room">${esc_c(CN.code)}</div>`:'')+
      `<p class="cz-status">${esc_c(CN.status)}</p><p class="cz-dim">Online record: ${r.w} won, ${r.l} lost, ${r.d} drawn.</p></div>`;
  }
  return `<div class="cz-tabs">${tabs}</div><div class="cz-lobby">${body}</div>`; }
/* the game: board in the middle, a player either side */
function chessGameHTML(){ const G=CG;
  return `<div class="cz-game"><div class="cz-side cz-them">${chessPlayerHTML(chessTopColour())}</div>`+
    `<div class="cz-mid"><div class="cz-frame"><div class="cz-board" data-czb>${chessBoardHTML()}</div>${chessCoordsHTML()}</div></div>`+
    `<div class="cz-side cz-us"><div class="cz-mine">${chessPlayerHTML(chessTopColour()==='w'?'b':'w')}</div><div class="cz-panel">${chessPanelHTML()}</div></div></div>`; }
function chessTopColour(){ return CX.flip?'w':'b'; }
function chessPlayerHTML(c){ const G=CG; let name, img='', who;
  if(G.mode==='ai'){ if(c===G.me){ name=chessOpt().name||(typeof S==='object'&&S.hero?nmC(S.hero):'You'); who='you'; img=chessPortrait(typeof S==='object'&&S.running&&typeof costumeLook==='function'?costumeLook():(typeof S==='object'&&S.hero==='sam'?'sam_canvas':'dean_leather')); }
    else { name=chVal(G.foe.name); who='foe'; img=chessPortrait(chVal(G.foe.look)); } }
  else { name=G.names?G.names[c]:(c==='w'?'White':'Black'); who=G.mode==='net'&&c===G.me?'you':'p'; }
  const caps=chessCaptured(c), turn=!G.over&&G.st.turn===c;
  return `<div class="cz-player${turn?' turn':''}">`+(img?`<img class="cz-port" src="${img}" alt="">`:`<div class="cz-chip ${c}"><img src="${chPieceSVG(c==='w'?'K':'k')}" alt=""></div>`)+
    `<div class="cz-pinfo"><b>${esc_c(name)}</b><small>${c==='w'?'White':'Black'}${who==='foe'?' · '+esc_c(G.foe.role):''}${turn&&G.thinking&&who==='foe'?' · thinking…':''}</small>`+
    `<div class="cz-caps">${caps.map(p=>`<img src="${chPieceSVG(p)}" alt="">`).join('')}${chessMatDiff(c)}</div></div>`+
    (G.clock?`<div class="cz-clock" data-clk="${c}">${chClockText(chessClockLeft(c))}</div>`:'')+`</div>`+
    (who==='foe'&&G.bubble?`<div class="cz-bubble">${esc_c(G.bubble)}</div>`:''); }
/* the pieces this colour has taken */
function chessCaptured(c){ const start={p:8,n:2,b:2,r:2,q:1}, have={p:0,n:0,b:0,r:0,q:0}, them=c==='w'?'b':'w';
  for(const p of CG.st.b) if(p&&chColor(p)===them&&p.toLowerCase()!=='k') have[p.toLowerCase()]++;
  const out=[]; for(const t of 'qrbnp'){ const n=Math.max(0,start[t]-have[t]); for(let i=0;i<n;i++) out.push(them==='w'?t.toUpperCase():t); } return out; }
function chessMatDiff(c){ const m=chMaterial(CG.st.b), v=Math.round((c==='w'?m:-m)/100); return v>0?`<span class="cz-plus">+${v}</span>`:''; }
function chessBoardHTML(){ const G=CG, st=G.st, L=chessTurnIsMine()?chLegal(st):[], sel=CX.sel, dots=chessOpt().dots;
  const targets=sel>=0?L.filter(m=>m.from===sel):[], tset=new Set(targets.map(m=>m.to)), chk=chInCheck(st)?chKingSq(st.b,st.turn):-1;
  let h=''; for(let row=0;row<8;row++) for(let col=0;col<8;col++){
    const sq=CX.flip?(row*8+(7-col)):((7-row)*8+col), light=((sq>>3)+(sq&7))%2===1, p=st.b[sq];
    const cls=['cz-sq',light?'l':'d'];
    if(G.last&&(sq===G.last.from||sq===G.last.to)) cls.push('last'); if(sq===sel) cls.push('sel'); if(sq===chk) cls.push('chk');
    if(G.hint&&(sq===G.hint.from||sq===G.hint.to)) cls.push('hint');
    if(tset.has(sq)&&dots) cls.push(p||targets.some(m=>m.to===sq&&m.ep)?'cap':'dot');
    if(CX.drag&&CX.drag.sq===sq&&CX.drag.moved) cls.push('lift');
    h+=`<div class="${cls.join(' ')}" data-sq="${sq}">${p?`<img src="${chPieceSVG(p)}" alt="${p}" draggable="false">`:''}</div>`; }
  if(CX.promo){ const {to,c}=CX.promo, col=CX.flip?7-(to&7):(to&7), top=(c==='w')!==CX.flip;
    h+=`<div class="cz-promo" style="left:${col*12.5}%;${top?'top:0':'bottom:0'}">`+(top?'qrbn':'nbrq').split('').map(t=>`<button data-czp="${t}"><img src="${chPieceSVG(c==='w'?t.toUpperCase():t)}" alt=""></button>`).join('')+`<button class="x" data-czp="x">✕</button></div>`; }
  if(G.over) h+=`<div class="cz-over"><b>${G.over.result==='1/2-1/2'?'Drawn':(G.over.result==='1-0'?'White':'Black')+' wins'}</b><small>by ${esc_c(G.over.why)}</small></div>`;
  return h; }
function chessCoordsHTML(){ const f=CX.flip?'hgfedcba':'abcdefgh', r=CX.flip?'12345678':'87654321';
  return `<div class="cz-files">${f.split('').map(x=>`<span>${x}</span>`).join('')}</div><div class="cz-ranks">${r.split('').map(x=>`<span>${x}</span>`).join('')}</div>`; }
function chessPanelHTML(){ const G=CG; const st0=chFromFEN(G.start);
  let moves='', n=st0.full; const off=st0.turn==='b'?1:0;
  for(let i=-off;i<G.sans.length;i+=2){ const a=i>=0?G.sans[i]:'…', b=G.sans[i+1]; moves+=`<div class="cz-mv"><i>${n}.</i><span${i===G.sans.length-1?' class="cur"':''}>${esc_c(a)}</span><span${i+1===G.sans.length-1?' class="cur"':''}>${b?esc_c(b):''}</span></div>`; n++; }
  const net=G.mode==='net', status=G.over?`${G.over.result==='1/2-1/2'?'Draw':(G.over.result==='1-0'?'White':'Black')+' wins'} — ${G.over.why}.`:
    (chInCheck(G.st)?'Check. ':'')+(G.mode==='hot'?(G.st.turn==='w'?'White':'Black')+' to move.':G.st.turn===G.me?'Your move.':(net?(CN.theirName||'They')+' to move.':chVal(G.foe.name)+' to move.'));
  const btn=(k,l,on=true)=>`<button class="opt" data-cz="${k}"${on?'':' disabled'}>${l}</button>`;
  let b='';
  if(!G.over){ b+=btn('resign','Resign'); b+=G.drawFrom==='them'?btn('drawyes','Accept draw')+btn('drawno','Decline'):btn('draw',G.mode==='hot'?'Agree a draw':'Offer draw');
    if(!net){ b+=btn('undo','Take back',G.ucis.length>0); b+=btn('hint','Hint',chessTurnIsMine()); } }
  else { b+=net?(CN.link?btn('again',CN.again==='them'?'Accept rematch':'Rematch'):''):btn('again','Play again'); }
  b+=btn('flip','Flip')+btn('pgn','Copy PGN');
  return `<div class="cz-status">${esc_c(status)}</div>${CX.note?`<div class="cz-note">${esc_c(CX.note)}</div>`:''}${net?`<div class="cz-note dim">${esc_c(CN.status)}</div>`:''}`+
    `<div class="cz-moves" data-czm>${moves||'<div class="cz-dim">No moves yet.</div>'}</div><div class="cz-btns">${b}</div>`; }
function renderChessSide(){ if(!CX.open||CX.view!=='game'||!CG) return renderChess();
  const a=elChess.querySelector('.cz-them'), b=elChess.querySelector('.cz-mine'), p=elChess.querySelector('.cz-panel');
  if(!a||!b||!p) return renderChess();
  a.innerHTML=chessPlayerHTML(chessTopColour()); b.innerHTML=chessPlayerHTML(chessTopColour()==='w'?'b':'w'); p.innerHTML=chessPanelHTML(); chessWire(); }

/* ── input ─────────────────────────────────────────────────────────────── */
function chessWire(){ const all=(s,f)=>(elChess.querySelectorAll(s)||[]).forEach(f);
  all('[data-cz]',b=>b.onclick=()=>chessAct(b.dataset.cz));
  all('[data-czt]',b=>b.onclick=()=>{ CX.tab=b.dataset.czt; renderChess(); });
  all('[data-czo]',b=>b.onclick=()=>{ const v=b.dataset.czv; chessSetOpt(b.dataset.czo,v==='true'?true:v==='false'?false:v); if(b.dataset.czo==='engine'&&v!=='own') sfLoad(); renderChess(); });
  all('[data-czs]',el=>{ const k=el.dataset.czs; if(k==='code') return; el.onchange=()=>chessSetOpt(k,el.value); });
  all('[data-czf]',b=>b.onclick=()=>{ const pick=chessOpt().colour, me=pick==='r'?(Math.random()<.5?'w':'b'):pick; chessNew('ai',{foe:b.dataset.czf,me}); });
  all('[data-czp]',b=>b.onclick=e=>{ e.stopPropagation(); const t=b.dataset.czp, P=CX.promo; CX.promo=null; if(t==='x'||!P){ renderChess(); return; }
    const m=chLegal(CG.st).find(m=>m.from===P.from&&m.to===P.to&&m.promo&&m.promo.toLowerCase()===t); if(m) chessHuman(m); else renderChess(); });
  const mv=elChess.querySelector('[data-czm]'); if(mv) mv.scrollTop=mv.scrollHeight;
  const bd=elChess.querySelector('[data-czb]'); if(bd) bd.onpointerdown=chessDown; }
function chessAct(k){ const G=CG;
  switch(k){
    case 'close': closeChess(); return;
    case 'lobby': CX.view='lobby'; CX.promo=null; renderChess(); return;
    case 'hot': { const O=chessOpt(); chessNew('hot',{tc:O.tc,names:{w:'White',b:'Black'}}); return; }
    case 'host': chessHost(); renderChess(); return;
    case 'join': { const el=elChess.querySelector('[data-czs="code"]'); chessJoin(el&&el.value); renderChess(); return; }
    case 'resume': { const c=chessData().cur; if(!c) return; chessNew(c.mode,{foe:c.foe,me:c.me,ucis:c.ucis,tc:c.tc,fen:c.fen,names:c.mode==='hot'?{w:'White',b:'Black'}:null}); if(CG.clock) CG.clock=null; return; }
    case 'discard': { const d=chessData(); d.cur=null; chessSave(d); renderChess(); return; }
    case 'resign': chessResign(); return;
    case 'draw': chessOfferDraw(); return;
    case 'drawyes': chessNetSend({t:'drawyes'}); chessEnd({over:true,result:'1/2-1/2',why:'agreement'}); renderChess(); return;
    case 'drawno': chessNetSend({t:'drawno'}); G.drawFrom=null; CX.note=''; renderChessSide(); return;
    case 'undo': chessUndo(); return;
    case 'hint': chessHint(); return;
    case 'flip': CX.flip=!CX.flip; renderChess(); return;
    case 'pgn': { const t=chessPGN(); try{ navigator.clipboard.writeText(t).then(()=>{ CX.note='PGN copied.'; renderChessSide(); },()=>{ CX.note='Couldn’t reach the clipboard.'; renderChessSide(); }); }catch(e){ CX.note='Couldn’t reach the clipboard.'; renderChessSide(); } return; }
    case 'again': if(G.mode==='net'){ chessAskRematch(); return; }
      if(G.mode==='ai'){ chessNew('ai',{foe:G.foe.id,me:G.me==='w'?'b':'w'}); return; } chessNew('hot',{tc:G.tc,names:G.names}); return;
  } }
function chessSqAt(e){ const bd=elChess.querySelector('[data-czb]'); if(!bd) return -1; const r=bd.getBoundingClientRect();
  const col=Math.floor((e.clientX-r.left)/r.width*8), row=Math.floor((e.clientY-r.top)/r.height*8); if(col<0||col>7||row<0||row>7) return -1;
  return CX.flip?row*8+(7-col):(7-row)*8+col; }
function chessCanLift(sq){ const G=CG, p=G&&G.st.b[sq]; return !!p&&chessTurnIsMine()&&chColor(p)===G.st.turn; }
function chessTry(from,to){ const G=CG, ms=chLegal(G.st).filter(m=>m.from===from&&m.to===to); if(!ms.length) return false;
  if(ms.length>1&&ms[0].promo){ CX.promo={from,to,c:G.st.turn}; CX.sel=-1; renderChess(); return true; }
  return chessHuman(ms[0]); }
function chessDown(e){ if(!CG||CX.promo) return; if(e.button!=null&&e.button!==0) return; const sq=chessSqAt(e); if(sq<0) return; e.preventDefault&&e.preventDefault();
  if(CX.sel>=0&&CX.sel!==sq&&chessTry(CX.sel,sq)) return;
  if(chessCanLift(sq)){ const had=CX.sel===sq; CX.sel=sq; CX.drag={sq,x:e.clientX,y:e.clientY,moved:false,had}; renderChess(); }
  else { CX.sel=-1; renderChess(); } }
function chessGhost(e){ let g=document.getElementById('czGhost'); const D=CX.drag; if(!D) return;
  if(!g){ g=document.createElement('img'); g.id='czGhost'; g.src=chPieceSVG(CG.st.b[D.sq]); document.body.appendChild(g); }
  const bd=elChess.querySelector('[data-czb]'), w=bd?bd.getBoundingClientRect().width/8:60; g.style.width=g.style.height=w*1.08+'px'; g.style.left=(e.clientX-w*.54)+'px'; g.style.top=(e.clientY-w*.62)+'px'; }
window.addEventListener&&window.addEventListener('pagehide',()=>{ if(CN.link) chessNetSend({t:'bye'}); });
window.addEventListener&&window.addEventListener('pointermove',e=>{ const D=CX.drag; if(!D||!CX.open) return;
  if(!D.moved&&Math.hypot(e.clientX-D.x,e.clientY-D.y)>5){ D.moved=true; const el=elChess.querySelector(`[data-sq="${D.sq}"]`); if(el) el.classList.add('lift'); }
  if(D.moved) chessGhost(e); });
window.addEventListener&&window.addEventListener('pointerup',e=>{ const D=CX.drag; if(!D) return; CX.drag=null; const g=document.getElementById('czGhost'); if(g) g.remove();
  if(!CX.open||!CG) return; const sq=chessSqAt(e);
  if(D.moved){ if(sq>=0&&sq!==D.sq&&chessTry(D.sq,sq)) return; renderChess(); return; }
  if(D.had&&sq===D.sq){ CX.sel=-1; renderChess(); } });

/* keys: Esc leaves (or closes a promotion picker); F flips */
{ const was=inputDown; inputDown=function(code,e){ if(CX.open){ const t=e&&e.target;
    if(t&&(t.tagName==='INPUT'||t.tagName==='SELECT')){ if(code==='Escape') t.blur(); return; }
    if(code==='Escape'||code==='Pad1'){ if(CX.promo){ CX.promo=null; renderChess(); } else if(CX.view==='game'&&CX.sel>=0){ CX.sel=-1; renderChess(); } else closeChess(); }
    else if(code==='KeyF'&&CX.view==='game'){ CX.flip=!CX.flip; renderChess(); }
    return; } return was(code,e); }; }

/* ── ways in ──────────────────────────────────────────────────────────── */
(function chessRow(){ const opts=document.querySelector('#boot .opts'); if(!opts||!opts.appendChild) return;
  const row=document.createElement('div'); row.className='row'; row.id='chessRow';
  row.innerHTML='<span>Play</span><button class="opt" data-chess-open>Chess</button>';
  opts.appendChild(row); const b=row.querySelector('[data-chess-open]'); if(b) b.onclick=()=>openChess(); })();
{ const was=openPause; openPause=function(){ was(); if(!dlg.open||!dlg.avail||(typeof COOP!=='undefined'&&COOP.on)) return;
    const i=dlg.avail.findIndex(c=>c.text==='Controls'); if(i<0) return;
    dlg.avail.splice(i,0,{text:'Chess',note:'a game at the table',act:()=>{ closeDlg(); openChess(openPause); }});
    renderChoices(dlg.avail.map(c=>({text:c.text,note:c.note,act:c.act||null}))); }; }
/* boards in the world: the motel desk, the library, the bar */
Object.assign(SPR,{
  chesstable: art(22,18,A=>{ const wood=[92,62,38], dark=[60,40,24];
    A.rect(3,9,4,17,C(dark)); A.rect(17,9,18,17,C(dark)); A.rect(1,7,20,9,C(wood)); A.line(1,9,20,9,C(dk(wood,.7)));
    for(let r=0;r<2;r++) for(let i=0;i<8;i++) A.rect(3+i*2,5+r,4+i*2,5+r,C((i+r)%2?[226,210,172]:[70,46,30]));
    A.rect(2,4,19,4,C(dark));
    for(const [x,c] of [[5,[240,232,210]],[8,[240,232,210]],[13,[40,34,38]],[16,[40,34,38]]]){ A.rect(x,2,x,3,C(c)); A.set(x,1,C(c)); }
    A.rect(10,0,10,3,C([200,160,70])); A.shade(.14); A.outline(rgb(8,6,4)); })});
function chessSpot(sec,x,y){ for(let r=0;r<=3;r+=.5) for(let a=0;a<8;a++){ const px=x+Math.cos(a*Math.PI/4)*r, py=y+Math.sin(a*Math.PI/4)*r;
    if(px<1.2||py<1.2||px>sec.W-1.2||py>sec.H-1.2) continue; if(solidAt(sec,px|0,py|0)) continue;
    if((sec.entities||[]).some(e=>!e.hidden&&Math.hypot(e.x-px,e.y-py)<1.1)) continue; if(Object.keys(sec.doors||{}).some(k=>{ const [dx,dy]=k.split(',').map(Number); return Math.hypot(dx+.5-px,dy+.5-py)<1.6; })) continue;
    return {x:px,y:py}; } return null; }
for(const [sid,x,y,foe,label] of [['motel',4.5,8.5,'marla','Play chess with Marla'],['library',14,5.2,'sarah','Play chess with Sarah'],['lounge',12.6,10,'juno','Play chess with Juno']]){
  const sec=typeof SECTORS==='object'&&SECTORS[sid]; if(!sec) continue; const p=chessSpot(sec,x,y); if(!p) continue;
  sec.entities.push({kind:'prop',m:'chesstable',x:p.x,y:p.y,r:.35,h:.62,use:'chess_'+foe,useName:label,chess:foe});
  USES['chess_'+foe]=()=>{ if(typeof COOP!=='undefined'&&COOP.on){ toast('Not during a two-player campaign'); return; } openChess(null,{foe}); }; }
