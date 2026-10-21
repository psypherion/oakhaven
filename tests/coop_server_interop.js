/* 1.8: the game talking to the optional Python campaign server over a real
   WebSocket. Starts uvicorn on a temporary database. Headless. */
const {load}=require('./harness'), {spawn}=require('child_process'), path=require('path'), os=require('os');
let fails=0; const ok=(c,m)=>{ if(!c){ console.log('  FAIL:',m); fails++; } };
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const until=async(f,ms=8000)=>{ const t=Date.now(); while(Date.now()-t<ms){ try{ if(f()) return true; }catch(e){} await sleep(50); } return false; };
const mk=()=>{ const K=load({isolated:true,globals:{WebSocket}}); let t=0; K.ks=n=>{ for(let i=0;i<n;i++){ t+=16; K.frame(t); } }; return K; };
(async()=>{
  const db=path.join(os.tmpdir(),'oak_coop_'+process.pid+'.sqlite');
  const srv=spawn('python3',['-m','uvicorn','server.coop_server:app','--host','127.0.0.1','--port','8178'],{cwd:path.join(__dirname,'..'),env:{...process.env,OAK_DB:db},stdio:'ignore'});
  const URL='ws://127.0.0.1:8178/ws';
  try{
    let up=false; for(let i=0;i<60&&!up;i++){ await sleep(200); try{ up=(await fetch('http://127.0.0.1:8178/health')).ok; }catch(e){} }
    ok(up,'server did not start'); if(!up) throw new Error('no server');
    const H=mk(), G=mk();
    let meta=null, err=null; H.coopCreateServer({title:'Over the wire',name:'Ana',hero:'sam',role:'observer',server:URL},(e,m)=>{ err=e; meta=m; });
    ok(await until(()=>meta||err),'create timed out'); ok(meta&&!err,'create failed: '+err);
    ok(meta.hero==='sam'&&meta.role==='observer'&&meta.mode==='server','created seat wrong');
    H.coopBegin(meta); H.ks(2); H.skipCutscene(); H.ks(3);
    ok(await until(()=>H.COOP.client.status==='online'),'host not online on the server');
    let code=null; const shown=H.coopInvite(ok_=>{ code=ok_?shown:null; }); ok(await until(()=>code),'invite not accepted');
    const gm={cid:meta.cid,seat:null,token:null,mode:'server',server:URL,name:'Ben',outbox:[]};
    const cl=new G.CoopClient(gm,G.coopStoreMeta); let offer=null; cl.on('offer',o=>offer=o);
    const L=await G.coopDialWS(URL); cl.peek(L,code.replace('-','')); ok(await until(()=>offer),'no offer from the server');
    ok(offer&&offer.hero==='dean'&&offer.role==='interrogator','offer wrong');
    let on=false; cl.on('status',s=>{ if(s==='online') on=true; }); cl.claim(cl.link,code,'Ben'); ok(await until(()=>on),'claim failed');
    Object.assign(gm,{seat:cl.meta.seat,hero:cl.state.seats[cl.meta.seat].hero,role:cl.state.seats[cl.meta.seat].role,title:cl.state.title,replica:cl.state}); G.coopStoreMeta(gm);
    G.coopBegin(gm,cl); G.ks(2); G.skipCutscene(); G.ks(3);
    ok(await until(()=>H.partnerOnline()&&G.partnerOnline()),'presence over the server');
    /* evidence and a private note */
    H.S.flags.rot_register=true; H.S.flags.rot_stub=true; H.ks(40);
    ok(await until(()=>G.clueHave(G.CASES.rot,'stub')),'shared evidence did not arrive through the server');
    G.S.flags.rot_conf=true; G.ks(40); ok(await until(()=>G.myPriv().notes&&G.myPriv().notes['rot:confession']),'notebook entry not stored');
    ok(!H.clueHave(H.CASES.rot,'confession')&&!(H.coopState().priv||{}).B,'a private note reached the host');
    /* the host leaves; the server keeps the campaign; the guest goes on */
    H.COOP.client.close(); ok(await until(()=>!G.partnerOnline()),'host leaving not noticed');
    G.jointVote('sarah','watch'); G.S.flags.read_roster=true; G.ks(40);
    ok(await until(()=>G.COOP.client.outbox.length===0),'with a server, the guest’s changes go through while the host is away');
    H.coopReconnectNow(); ok(await until(()=>H.COOP.client.status==='online'&&H.clueHave(H.CASES.rot,'roster')),'host did not catch up from the server');
    ok((H.jointState('sarah').r1||{}).B==='watch','vote made while the host was away is missing');
    /* removal */
    H.cop({op:'revoke',seat:'B'}); ok(await until(()=>G.COOP.client.status==='removed'),'guest not removed via the server');
    G.coopReconnectNow(); await sleep(600); ok(G.COOP.client.status!=='online','removed guest got back in');
  }catch(e){ console.error(e); fails++; }
  finally{ srv.kill(); try{ require('fs').unlinkSync(db); }catch(e){} }
  console.log(fails?`\n${fails} failure(s)`:'\nAll checks passed'); process.exit(fails?1:0);
})();
