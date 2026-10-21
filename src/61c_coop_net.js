/* ═══ Co-op: connections and local storage ═════════════════════════════════
   Browser-to-browser (default): the host's browser runs the authority and
   listens on a PeerJS id derived from the campaign id; the partner dials it.
   PeerJS's free public signalling server only introduces the two browsers;
   the game traffic goes directly between them (WebRTC, encrypted). A custom
   signalling server and TURN relays can be set in the campaign panel.
   Campaign server (optional): both players connect to server/coop_server.py
   over a WebSocket; the server is the authority and the host can be offline.

   Kept in this browser (localStorage):
     oakhaven.coop.list           the campaigns this browser belongs to
     oakhaven.coop.c.<id>         your seat, your credential, a replica of the
                                  campaign and your unsent changes
     oakhaven.coop.auth.<id>      host only, browser-to-browser: the
                                  authoritative campaign
     oakhaven.coop.world.<id>     your own copy of the town for that campaign */

const COOP_LS='oakhaven.coop.';
const COOP_NET={signal:null, dial:null, hostHook:null};
function coopLSget(k){ try{ const v=localStorage.getItem(COOP_LS+k); return v?JSON.parse(v):null; }catch(e){ return null; } }
function coopLSset(k,v){ try{ if(v==null) localStorage.removeItem(COOP_LS+k); else localStorage.setItem(COOP_LS+k,JSON.stringify(v)); return true; }catch(e){ console.error('coop storage',e); return false; } }
function coopList(){ return (coopLSget('list')||[]).filter(cid=>coopLSget('c.'+cid)); }
function coopMeta(cid){ return coopLSget('c.'+cid); }
function coopStoreMeta(m){ if(!m||!m.cid) return; coopLSset('c.'+m.cid,m); const L=coopLSget('list')||[]; if(!L.includes(m.cid)){ L.push(m.cid); coopLSset('list',L); } }
function coopLoadAuth(cid){ return coopLSget('auth.'+cid); }
function coopSaveAuth(C){ coopLSset('auth.'+C.id,C); }
function coopWorld(cid){ return coopLSget('world.'+cid); }
/* leaving forgets your copy; a host's authoritative copy is kept unless asked */
function coopForget(cid,alsoAuth){ coopLSset('c.'+cid,null); coopLSset('world.'+cid,null); if(alsoAuth) coopLSset('auth.'+cid,null);
  coopLSset('list',(coopLSget('list')||[]).filter(x=>x!==cid)); }

/* ── PeerJS, turned into a script only when needed ─────────────────────── */
let PEERJS_P=null;
function loadPeerJS(){
  if(typeof window!=='undefined'&&typeof window.Peer==='function') return Promise.resolve();
  if(PEERJS_P) return PEERJS_P;
  PEERJS_P=new Promise((res,rej)=>{ try{
    const url=URL.createObjectURL(new Blob([PEERJS_SRC],{type:'text/javascript'})), s=document.createElement('script');
    s.src=url; s.onload=()=>res(); s.onerror=()=>{ PEERJS_P=null; rej(new Error('PeerJS failed to load')); }; document.head.appendChild(s);
  }catch(e){ PEERJS_P=null; rej(e); } });
  return PEERJS_P;
}
function coopPeerOpts(meta){ const s=(meta&&meta.signal)||COOP_NET.signal, o={debug:0};
  if(s&&s.host) Object.assign(o,{host:s.host,port:+s.port||(s.secure===false?80:443),path:s.path||'/',secure:s.secure!==false,key:s.key||'peerjs'});
  if(s&&Array.isArray(s.ice)&&s.ice.length) o.config={iceServers:s.ice};
  return o; }
const coopPeerId=cid=>'oakhaven-c1-'+String(cid).toLowerCase();
function coopWrapConn(c,extra){
  const L={onmsg:null,onclose:null,send(m){ try{ if(c.open) c.send(m); }catch(e){} },close(){ try{ c.close(); }catch(e){} if(extra) extra(); }};
  let gone=false; const end=()=>{ if(gone) return; gone=true; if(extra) extra(); L.onclose&&L.onclose(); };
  c.on('data',d=>{ let m=d; if(typeof d==='string') try{ m=JSON.parse(d); }catch(e){ return; } if(m&&typeof m==='object'&&L.onmsg) L.onmsg(m); });
  c.on('close',end); c.on('error',end);
  return L; }
/* the host listens */
function coopHostP2P(auth,meta,cb){
  return loadPeerJS().then(()=>{ const P=new window.Peer(coopPeerId(auth.C.id),coopPeerOpts(meta));
    P.on('open',()=>cb('open')); P.on('connection',c=>c.on('open',()=>auth.attach(coopWrapConn(c))));
    P.on('disconnected',()=>{ cb('lost'); setTimeout(()=>{ try{ if(!P.destroyed) P.reconnect(); }catch(e){} },2500); });
    P.on('error',e=>cb('error',e&&e.type)); return P; }); }
/* the partner dials */
function coopDialP2P(meta){
  return loadPeerJS().then(()=>new Promise((res,rej)=>{ const P=new window.Peer(coopPeerOpts(meta)); let done=false;
    const fail=t=>{ if(done) return; done=true; clearTimeout(timer); try{ P.destroy(); }catch(e){} rej(new Error(t)); };
    const timer=setTimeout(()=>fail('timeout'),20000);
    P.on('open',()=>{ const c=P.connect(coopPeerId(meta.cid),{reliable:true});
      c.on('open',()=>{ if(done) return; done=true; clearTimeout(timer); res(coopWrapConn(c,()=>{ try{ P.destroy(); }catch(e){} })); });
      c.on('error',()=>fail('conn')); });
    P.on('error',e=>fail(e&&e.type||'error')); })); }
/* or a campaign server */
function coopDialWS(url){
  return new Promise((res,rej)=>{ let ws; try{ ws=new WebSocket(url); }catch(e){ return rej(e); }
    const L={onmsg:null,onclose:null,send(m){ if(ws.readyState===1) ws.send(JSON.stringify(m)); },close(){ try{ ws.close(); }catch(e){} }};
    let opened=false;
    ws.onopen=()=>{ opened=true; res(L); };
    ws.onerror=()=>{ if(!opened) rej(new Error('server unreachable')); };
    ws.onmessage=e=>{ let m; try{ m=JSON.parse(e.data); }catch(_){ return; } L.onmsg&&L.onmsg(m); };
    ws.onclose=()=>{ if(opened&&L.onclose) L.onclose(); }; }); }
function coopDial(meta){
  if(COOP_NET.dial) return COOP_NET.dial(meta);                  // tests
  return meta.mode==='server'?coopDialWS(meta.server):coopDialP2P(meta); }
const coopThen=(r,ok,bad)=>{ if(r&&typeof r.then==='function') r.then(ok,bad); else if(r) ok(r); else bad(new Error('no link')); };

/* ── creating a campaign ───────────────────────────────────────────────── */
/* browser-to-browser: made here, held here */
function coopCreateLocal({title,name,hero,role,signal}){
  const {C,token}=coopFresh({title,name,hero,role,now:Date.now()});
  coopSaveAuth(C);
  const meta={cid:C.id,seat:'A',token,mode:'p2p',signal:signal||null,server:null,title:C.title,hero:C.seats.A.hero,role:C.seats.A.role,name:C.seats.A.name,
    created:Date.now(),last:Date.now(),replica:coopView(C,'A'),outbox:[]};
  coopStoreMeta(meta); return meta; }
/* on a server: the server makes it, we keep the credential */
function coopCreateServer({title,name,hero,role,server},done){
  const token=coopRand(26);
  coopThen(coopDialWS(server),L=>{
    L.onmsg=m=>{ if(m.type==='welcome'){ const st=m.state, meta={cid:st.id,seat:m.seat,token,mode:'server',server,signal:null,title:st.title,hero:st.seats[m.seat].hero,role:st.seats[m.seat].role,name,
        created:Date.now(),last:Date.now(),replica:st,outbox:[]};
        coopStoreMeta(meta); L.onmsg=null; L.close(); done(null,meta); }
      else if(m.type==='err'){ L.close(); done(m.code); } };
    L.send({type:'create',proto:COOP_PROTO,title,name,hero,role,token}); },e=>done(e.message||'server unreachable')); }
/* a fresh invitation: the code is shown once; only its hash is stored */
function coopInvite(cb){ const C=coopState(); if(!C) return null; const code=coopRand(10);
  cop({op:'invite',hash:coopCodeHash(C.id,code),exp:Date.now()+7*864e5},cb); return coopFmt(code); }
function coopInviteLink(){ const m=COOP.meta; if(!m) return ''; let base='';
  try{ base=location.origin+location.pathname; }catch(e){ base='oakhaven.html'; }
  let h='#join='+m.cid; if(m.mode==='server') h+='&srv='+encodeURIComponent(m.server);
  else if(m.signal&&m.signal.host) h+='&sig='+encodeURIComponent(JSON.stringify({host:m.signal.host,port:m.signal.port,path:m.signal.path,secure:m.signal.secure}));
  return base+h; }
function coopParseJoin(hash){ const o={}; String(hash||'').replace(/^#/,'').split('&').forEach(p=>{ const [k,v]=p.split('='); if(k) o[k]=v?decodeURIComponent(v):''; });
  if(!o.join) return null; const r={cid:o.join.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,16),mode:o.srv?'server':'p2p',server:o.srv||null,signal:null};
  if(o.sig) try{ const s=JSON.parse(o.sig); if(s&&typeof s.host==='string') r.signal={host:s.host,port:+s.port||443,path:String(s.path||'/'),secure:s.secure!==false}; }catch(e){}
  return r; }

/* ── recovery ──────────────────────────────────────────────────────────── */
/* a recovery code is your seat's credential: keep it like a password */
function coopRecoveryCode(meta){ meta=meta||COOP.meta; if(!meta||!meta.token) return '';
  return ['OAK1',meta.cid,meta.seat,meta.token].join('-')+(meta.mode==='server'?'@'+meta.server:''); }
function coopParseRecovery(code){
  const s=String(code||'').trim(); const at=s.indexOf('@'); const body=at>=0?s.slice(0,at):s, server=at>=0?s.slice(at+1):null;
  const p=body.split('-'); if(p.length!==4||p[0]!=='OAK1'||!/^[A-Z0-9]{6,16}$/.test(p[1])||!/^[AB]$/.test(p[2])||!/^[A-Z0-9]{20,40}$/.test(p[3])) return null;
  return {cid:p[1],seat:p[2],token:p[3],mode:server?'server':'p2p',server}; }
/* the whole thing, for a host who might clear their browser */
function coopArchive(){ const m=COOP.meta; if(!m) return null;
  return {kind:'oakhaven-campaign',v:1,saved:Date.now(),meta:Object.assign({},m,{replica:null,outbox:[]}),auth:m.mode==='p2p'&&m.seat==='A'?coopLoadAuth(m.cid):null,world:coopWorld(m.cid)}; }
function coopImportArchive(a){
  if(!a||a.kind!=='oakhaven-campaign'||!a.meta||!a.meta.cid) return 'That isn’t an Oakhaven campaign file.';
  if(a.auth&&a.auth.id!==a.meta.cid) return 'The file is damaged.';
  const cur=coopLoadAuth(a.meta.cid);
  if(a.auth&&(!cur||cur.v<=a.auth.v)) coopSaveAuth(a.auth);
  const meta=Object.assign({},a.meta,{replica:a.auth?coopView(a.auth,a.meta.seat):null,outbox:[]});
  coopStoreMeta(meta); if(a.world) coopLSset('world.'+meta.cid,a.world); return null; }
function coopImportCode(code){
  const r=coopParseRecovery(code); if(!r) return 'That doesn’t look like a recovery code.';
  const old=coopMeta(r.cid)||{};
  const meta=Object.assign({title:old.title||'Recovered campaign',hero:old.hero||null,role:old.role||null,name:old.name||'',created:old.created||Date.now(),replica:old.replica||null,outbox:[]},old,r,{last:Date.now()});
  if(r.mode==='p2p'&&r.seat==='A'&&!coopLoadAuth(r.cid)) return 'You were the host. In browser-to-browser mode the campaign lives in the host’s browser: restore it from your campaign file instead.';
  coopStoreMeta(meta); return null; }
