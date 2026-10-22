/* ═══ Chess: the rules ═════════════════════════════════════════════════════
   A complete, self-contained rules engine: legal moves (castling, en
   passant, promotion), check, mate, stalemate, the fifty-move rule,
   threefold repetition, insufficient material; FEN in and out; SAN and UCI.
   Squares are 0..63, a1=0, h1=7, a8=56. White pieces are upper case.
   Verified by perft in tests/chess.js. */

const CH_FILES='abcdefgh';
const chSq=s=>CH_FILES.indexOf(s[0])+8*(+s[1]-1);
const chName=i=>CH_FILES[i&7]+((i>>3)+1);
const chColor=p=>p?(p===p.toUpperCase()?'w':'b'):null;
const CH_START='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const N_OFF=[[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]], K_OFF=[[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
const B_DIR=[[1,1],[1,-1],[-1,1],[-1,-1]], R_DIR=[[1,0],[-1,0],[0,1],[0,-1]];
function chFromFEN(fen){ const [pos,turn,castle,ep,half,full]=(fen||CH_START).trim().split(/\s+/); const b=new Array(64).fill(null);
  let r=7,f=0; for(const c of pos){ if(c==='/'){ r--; f=0; } else if(/\d/.test(c)) f+=+c; else { b[r*8+f]=c; f++; } }
  const st={b,turn:turn||'w',castle:castle&&castle!=='-'?castle:'',ep:ep&&ep!=='-'?chSq(ep):-1,half:+half||0,full:+full||1,hist:[],keys:[]};
  st.keys.push(chKey(st)); return st; }
function chFEN(st){ let s=''; for(let r=7;r>=0;r--){ let e=0; for(let f=0;f<8;f++){ const p=st.b[r*8+f]; if(!p){ e++; continue; } if(e){ s+=e; e=0; } s+=p; } if(e) s+=e; if(r) s+='/'; }
  return `${s} ${st.turn} ${st.castle||'-'} ${st.ep>=0?chName(st.ep):'-'} ${st.half} ${st.full}`; }
function chKey(st){ return chFEN(st).split(' ').slice(0,4).join(' '); }
function chClone(st){ return {b:st.b.slice(),turn:st.turn,castle:st.castle,ep:st.ep,half:st.half,full:st.full,hist:[],keys:st.keys.slice()}; }
function chAttacked(b,sq,by){ const r=sq>>3, f=sq&7, up=by==='w';
  const at=(rr,ff)=>rr>=0&&rr<8&&ff>=0&&ff<8?b[rr*8+ff]:undefined;
  const P=up?'P':'p', N=up?'N':'n', B=up?'B':'b', R=up?'R':'r', Q=up?'Q':'q', K=up?'K':'k';
  const pr=up?r-1:r+1; if(at(pr,f-1)===P||at(pr,f+1)===P) return true;
  for(const [dr,df] of N_OFF) if(at(r+dr,f+df)===N) return true;
  for(const [dr,df] of K_OFF) if(at(r+dr,f+df)===K) return true;
  for(const [dr,df] of B_DIR){ let rr=r+dr, ff=f+df; while(rr>=0&&rr<8&&ff>=0&&ff<8){ const p=b[rr*8+ff]; if(p){ if(p===B||p===Q) return true; break; } rr+=dr; ff+=df; } }
  for(const [dr,df] of R_DIR){ let rr=r+dr, ff=f+df; while(rr>=0&&rr<8&&ff>=0&&ff<8){ const p=b[rr*8+ff]; if(p){ if(p===R||p===Q) return true; break; } rr+=dr; ff+=df; } }
  return false; }
const chKingSq=(b,c)=>b.indexOf(c==='w'?'K':'k');
function chInCheck(st,c){ c=c||st.turn; return chAttacked(st.b,chKingSq(st.b,c),c==='w'?'b':'w'); }
function chPseudo(st){ const b=st.b, c=st.turn, them=c==='w'?'b':'w', M=[];
  const add=(from,to,extra)=>M.push(Object.assign({from,to,piece:b[from],cap:b[to]},extra||{}));
  for(let s=0;s<64;s++){ const p=b[s]; if(!p||chColor(p)!==c) continue; const r=s>>3, f=s&7, t=p.toLowerCase();
    if(t==='p'){ const d=c==='w'?1:-1, last=c==='w'?7:0, home=c==='w'?1:6, r1=r+d;
      const push=(to,extra)=>{ if((to>>3)===last) for(const q of 'qrbn') add(s,to,Object.assign({promo:c==='w'?q.toUpperCase():q},extra)); else add(s,to,extra); };
      if(r1>=0&&r1<8&&!b[r1*8+f]){ push(r1*8+f); if(r===home&&!b[(r+2*d)*8+f]) add(s,(r+2*d)*8+f,{dbl:true}); }
      for(const df of [-1,1]){ const ff=f+df; if(ff<0||ff>7||r1<0||r1>7) continue; const to=r1*8+ff;
        if(b[to]&&chColor(b[to])===them) push(to); else if(to===st.ep) add(s,to,{ep:true,cap:c==='w'?'p':'P'}); }
      continue; }
    if(t==='n'||t==='k'){ for(const [dr,df] of t==='n'?N_OFF:K_OFF){ const rr=r+dr, ff=f+df; if(rr<0||rr>7||ff<0||ff>7) continue; const to=rr*8+ff; if(!b[to]||chColor(b[to])===them) add(s,to); }
      if(t==='k'){ const rank=c==='w'?0:56, K=c==='w'?'K':'k', Q=c==='w'?'Q':'q', R=c==='w'?'R':'r';
        if(s===rank+4&&!chAttacked(b,s,them)){
          if(st.castle.includes(K)&&b[rank+7]===R&&!b[rank+5]&&!b[rank+6]&&!chAttacked(b,rank+5,them)&&!chAttacked(b,rank+6,them)) add(s,rank+6,{castle:'k'});
          if(st.castle.includes(Q)&&b[rank]===R&&!b[rank+1]&&!b[rank+2]&&!b[rank+3]&&!chAttacked(b,rank+3,them)&&!chAttacked(b,rank+2,them)) add(s,rank+2,{castle:'q'}); } }
      continue; }
    const dirs=t==='b'?B_DIR:t==='r'?R_DIR:B_DIR.concat(R_DIR);
    for(const [dr,df] of dirs){ let rr=r+dr, ff=f+df; while(rr>=0&&rr<8&&ff>=0&&ff<8){ const to=rr*8+ff; if(b[to]){ if(chColor(b[to])===them) add(s,to); break; } add(s,to); rr+=dr; ff+=df; } } }
  return M; }
/* make a move; returns an undo record */
function chMake(st,m){ const b=st.b, u={m,castle:st.castle,ep:st.ep,half:st.half,full:st.full,keys:st.keys.length};
  const p=b[m.from], c=st.turn;
  b[m.to]=m.promo||p; b[m.from]=null;
  if(m.ep) b[m.to+(c==='w'?-8:8)]=null;
  if(m.castle){ const rank=c==='w'?0:56; if(m.castle==='k'){ b[rank+5]=b[rank+7]; b[rank+7]=null; } else { b[rank+3]=b[rank]; b[rank]=null; } }
  let cs=st.castle; const strip=(sq)=>{ if(sq===0) cs=cs.replace('Q',''); if(sq===7) cs=cs.replace('K',''); if(sq===56) cs=cs.replace('q',''); if(sq===63) cs=cs.replace('k',''); };
  if(p==='K') cs=cs.replace('K','').replace('Q',''); if(p==='k') cs=cs.replace('k','').replace('q',''); strip(m.from); strip(m.to); st.castle=cs;
  st.ep=m.dbl?(m.from+m.to)/2:-1;
  st.half=(p.toLowerCase()==='p'||m.cap)?0:st.half+1; if(c==='b') st.full++;
  st.turn=c==='w'?'b':'w'; st.keys.push(chKey(st)); return u; }
function chUnmake(st,u){ const m=u.m, b=st.b, c=st.turn==='w'?'b':'w';
  b[m.from]=m.piece; b[m.to]=m.ep?null:(m.cap||null);
  if(m.ep) b[m.to+(c==='w'?-8:8)]=m.cap;
  if(m.castle){ const rank=c==='w'?0:56; if(m.castle==='k'){ b[rank+7]=b[rank+5]; b[rank+5]=null; } else { b[rank]=b[rank+3]; b[rank+3]=null; } }
  st.turn=c; st.castle=u.castle; st.ep=u.ep; st.half=u.half; st.full=u.full; st.keys.length=u.keys; }
function chLegal(st){ const out=[], c=st.turn; for(const m of chPseudo(st)){ const u=chMake(st,m); if(!chInCheck(st,c)) out.push(m); chUnmake(st,u); } return out; }
function chPerft(st,d){ if(!d) return 1; let n=0; for(const m of chLegal(st)){ const u=chMake(st,m); n+=chPerft(st,d-1); chUnmake(st,u); } return n; }
const chUCI=m=>chName(m.from)+chName(m.to)+(m.promo?m.promo.toLowerCase():'');
function chFindUCI(st,uci){ return chLegal(st).find(m=>chUCI(m)===String(uci).toLowerCase())||null; }
function chSAN(st,m,legal){ legal=legal||chLegal(st); let s;
  if(m.castle) s=m.castle==='k'?'O-O':'O-O-O';
  else { const t=m.piece.toUpperCase();
    if(t==='P') s=(m.cap?CH_FILES[m.from&7]+'x':'')+chName(m.to)+(m.promo?'='+m.promo.toUpperCase():'');
    else { const others=legal.filter(o=>o.from!==m.from&&o.piece===m.piece&&o.to===m.to); let dis='';
      if(others.length){ const sameF=others.some(o=>(o.from&7)===(m.from&7)), sameR=others.some(o=>(o.from>>3)===(m.from>>3));
        dis=!sameF?CH_FILES[m.from&7]:!sameR?String((m.from>>3)+1):chName(m.from); }
      s=t+dis+(m.cap?'x':'')+chName(m.to); } }
  const u=chMake(st,m); const chk=chInCheck(st), mate=chk&&!chLegal(st).length; chUnmake(st,u);
  return s+(mate?'#':chk?'+':''); }
function chFromSAN(st,san){ const clean=String(san).replace(/[+#?!]/g,''); const L=chLegal(st); return L.find(m=>chSAN(st,m,L).replace(/[+#]/g,'')===clean)||null; }
function chInsufficient(b){ const P=b.filter(Boolean).filter(p=>p.toLowerCase()!=='k'); if(!P.length) return true;
  if(P.length===1&&'nb'.includes(P[0].toLowerCase())) return true;
  if(P.every(p=>p.toLowerCase()==='b')){ const col=new Set(); b.forEach((p,i)=>{ if(p&&p.toLowerCase()==='b') col.add(((i>>3)+(i&7))%2); }); return col.size===1; }
  return false; }
/* the state of play: null, or {over:true, result:'1-0'|'0-1'|'1/2-1/2', why} */
function chStatus(st){ const L=chLegal(st);
  if(!L.length) return chInCheck(st)?{over:true,result:st.turn==='w'?'0-1':'1-0',why:'checkmate'}:{over:true,result:'1/2-1/2',why:'stalemate'};
  if(st.half>=100) return {over:true,result:'1/2-1/2',why:'the fifty-move rule'};
  const k=st.keys[st.keys.length-1]; if(st.keys.filter(x=>x===k).length>=3) return {over:true,result:'1/2-1/2',why:'threefold repetition'};
  if(chInsufficient(st.b)) return {over:true,result:'1/2-1/2',why:'insufficient material'};
  return null; }

/* ═══ A small engine of our own, for when Stockfish can't be reached ═══════
   Negamax with alpha-beta, a capture search, piece-square tables and
   iterative deepening against a time budget. It plays a sound club game;
   the characters' weaker settings also make it miss things on purpose. */
const CH_VAL={p:100,n:320,b:330,r:500,q:900,k:0};
const CH_PST={
  p:[0,0,0,0,0,0,0,0, 5,10,10,-20,-20,10,10,5, 5,-5,-10,0,0,-10,-5,5, 0,0,0,20,20,0,0,0, 5,5,10,25,25,10,5,5, 10,10,20,30,30,20,10,10, 50,50,50,50,50,50,50,50, 0,0,0,0,0,0,0,0],
  n:[-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,5,5,0,-20,-40, -30,5,10,15,15,10,5,-30, -30,0,15,20,20,15,0,-30, -30,5,15,20,20,15,5,-30, -30,0,10,15,15,10,0,-30, -40,-20,0,0,0,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50],
  b:[-20,-10,-10,-10,-10,-10,-10,-20, -10,5,0,0,0,0,5,-10, -10,10,10,10,10,10,10,-10, -10,0,10,10,10,10,0,-10, -10,5,5,10,10,5,5,-10, -10,0,5,10,10,5,0,-10, -10,0,0,0,0,0,0,-10, -20,-10,-10,-10,-10,-10,-10,-20],
  r:[0,0,0,5,5,0,0,0, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 5,10,10,10,10,10,10,5, 0,0,0,0,0,0,0,0],
  q:[-20,-10,-10,-5,-5,-10,-10,-20, -10,0,5,0,0,0,0,-10, -10,5,5,5,5,5,0,-10, 0,0,5,5,5,5,0,-5, -5,0,5,5,5,5,0,-5, -10,0,5,5,5,5,0,-10, -10,0,0,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20],
  k:[20,30,10,0,0,10,30,20, 20,20,0,0,0,0,20,20, -10,-20,-20,-20,-20,-20,-20,-10, -20,-30,-30,-40,-40,-30,-30,-20, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30]};
function chEval(st){ let s=0; for(let i=0;i<64;i++){ const p=st.b[i]; if(!p) continue; const t=p.toLowerCase(), w=p!==t, idx=w?i:(7-(i>>3))*8+(i&7);
    s+=(w?1:-1)*(CH_VAL[t]+CH_PST[t][idx]); } return st.turn==='w'?s:-s; }
function chOrder(M){ return M.sort((a,b)=>((b.cap?CH_VAL[b.cap.toLowerCase()]*10-CH_VAL[b.piece.toLowerCase()]:0)+(b.promo?800:0))-((a.cap?CH_VAL[a.cap.toLowerCase()]*10-CH_VAL[a.piece.toLowerCase()]:0)+(a.promo?800:0))); }
function chSearch(st,opt){ const t0=Date.now(), limit=opt.ms||600, maxD=opt.depth||4; let nodes=0, stop=false, best=null, bestScore=0;
  const quiesce=(a,b,qd)=>{ const sp=chEval(st); if(sp>=b) return b; if(sp>a) a=sp; if(qd>6) return a;
    for(const m of chOrder(chLegal(st).filter(m=>m.cap||m.promo))){ const u=chMake(st,m); const sc=-quiesce(-b,-a,qd+1); chUnmake(st,u); if(sc>=b) return b; if(sc>a) a=sc; } return a; };
  const neg=(d,a,b,ply)=>{ if((++nodes&1023)===0&&Date.now()-t0>limit) stop=true; if(stop) return 0;
    const L=chLegal(st); if(!L.length) return chInCheck(st)?-100000+ply:0;
    if(ply&&(st.half>=100||st.keys.filter(k=>k===st.keys[st.keys.length-1]).length>=2)) return 0;
    if(d<=0) return quiesce(a,b,0);
    let bm=null; for(const m of chOrder(L)){ const u=chMake(st,m); const sc=-neg(d-1,-b,-a,ply+1); chUnmake(st,u); if(stop) return 0;
      if(sc>a){ a=sc; bm=m; if(ply===0){ best=m; bestScore=sc; } } if(a>=b) break; }
    return a; };
  const root=chClone(st); st=root; let done=null, doneScore=0;
  for(let d=1;d<=maxD;d++){ best=null; neg(d,-1e9,1e9,0); if(stop) break; if(best){ done=best; doneScore=bestScore; } }
  const L=chLegal(st); if(!done) done=chOrder(L)[0];
  /* weak characters sometimes play the second-best, or just a reasonable move */
  if(opt.blunder&&Math.random()<opt.blunder&&L.length>1){ const alts=chOrder(L.slice()).slice(0,Math.min(5,L.length)); done=alts[(Math.random()*alts.length)|0]; }
  return {move:done,score:doneScore,nodes}; }
