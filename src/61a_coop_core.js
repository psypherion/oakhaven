/* ═══ Co-op campaigns: protocol, authority, replica ════════════════════════
   Two players, one persistent campaign. This file knows nothing about the
   game; it is the bookkeeping underneath.

   · A campaign has a public id (it names the campaign; it is not a password)
     and two seats. Seat A is the host. Each seat has its own random
     credential; the authority keeps only a salted hash of it.
   · A seat's brother and role lock the moment it is claimed and never change,
     even when a removed player is replaced.
   · One copy of the campaign is authoritative: the host's browser in
     browser-to-browser mode, or the optional Python server. Every change is
     an operation sent to the authority, checked (who may write where, and
     compare-and-set where it matters), stamped with a version and sent back
     to every player. Nothing is applied on a player's side until the
     authority has accepted it.
   · Each player keeps a replica and an outbox of unsent operations, so the
     campaign can be reviewed offline and nothing is lost on a disconnect.

   Paths a seat may write:
     shared.*                     anyone (votes.<id>.<seat>: only that seat)
     priv.<seat>.*                only that seat; never sent to the other
     rel.<from>.<to>.<var>        only the player whose brother is in the
                                  pair, and a brother's own feelings only by
                                  his own player; never desire between the
                                  brothers
     chron, relLog                append only
   The Python server (server/coop_server.py) implements the same rules. */

const COOP_PROTO=1;
const REL_VARS=['trust','affection','respect','desire','understanding','resentment','safety','influence'];
const REL_CAST=['dean','sam','lilith','sarah'];
const COOP_HEROES=['dean','sam'], COOP_ROLES=['observer','interrogator'];

/* ── SHA-256 (small, synchronous; the same everywhere the game runs) ─────── */
const SHA_K=(()=>{ const k=[], h=[]; let n=2;
  const prime=p=>{ for(let i=2;i*i<=p;i++) if(p%i===0) return false; return true; };
  while(k.length<64){ if(prime(n)){ if(h.length<8) h.push((Math.pow(n,1/2)%1)*4294967296|0); k.push((Math.pow(n,1/3)%1)*4294967296|0); } n++; }
  return {k,h}; })();
function sha256hex(str){
  const s=unescape(encodeURIComponent(String(str))), bytes=[];
  for(let i=0;i<s.length;i++) bytes.push(s.charCodeAt(i));
  const bitLen=bytes.length*8; bytes.push(0x80); while(bytes.length%64!==56) bytes.push(0);
  for(let i=7;i>=0;i--) bytes.push(i>3?0:(bitLen>>>(i*8))&255);
  const H=SHA_K.h.slice(), K=SHA_K.k, w=new Array(64), r=(x,n)=>(x>>>n)|(x<<(32-n));
  for(let o=0;o<bytes.length;o+=64){
    for(let i=0;i<16;i++) w[i]=(bytes[o+i*4]<<24)|(bytes[o+i*4+1]<<16)|(bytes[o+i*4+2]<<8)|bytes[o+i*4+3];
    for(let i=16;i<64;i++){ const a=w[i-15], b=w[i-2]; w[i]=(w[i-16]+(r(a,7)^r(a,18)^(a>>>3))+w[i-7]+(r(b,17)^r(b,19)^(b>>>10)))|0; }
    let [a,b,c,d,e,f,g,h]=H;
    for(let i=0;i<64;i++){ const t1=(h+(r(e,6)^r(e,11)^r(e,25))+((e&f)^(~e&g))+K[i]+w[i])|0, t2=((r(a,2)^r(a,13)^r(a,22))+((a&b)^(a&c)^(b&c)))|0;
      h=g; g=f; f=e; e=(d+t1)|0; d=c; c=b; b=a; a=(t1+t2)|0; }
    H[0]=(H[0]+a)|0; H[1]=(H[1]+b)|0; H[2]=(H[2]+c)|0; H[3]=(H[3]+d)|0; H[4]=(H[4]+e)|0; H[5]=(H[5]+f)|0; H[6]=(H[6]+g)|0; H[7]=(H[7]+h)|0;
  }
  return H.map(x=>(x>>>0).toString(16).padStart(8,'0')).join('');
}
/* random text from an alphabet without look-alikes (no I, O, 0, 1) */
const COOP_ABC='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function coopRand(n){
  const out=[]; let buf=null;
  try{ if(typeof crypto!=='undefined'&&crypto.getRandomValues){ buf=new Uint8Array(n); crypto.getRandomValues(buf); } }catch(e){ buf=null; }
  for(let i=0;i<n;i++) out.push(COOP_ABC[(buf?buf[i]:Math.floor(Math.random()*256))&31]);
  return out.join('');
}
const coopCredHash=(cid,token)=>sha256hex('oakhaven:'+cid+':'+token);
const coopCodeHash=(cid,code)=>sha256hex('invite:'+cid+':'+String(code).toUpperCase().replace(/[^A-Z0-9]/g,''));
const coopFmt=s=>String(s).match(/.{1,5}/g).join('-');
const coopOther=(x,list)=>list[0]===x?list[1]:list[0];
const coopClone=o=>o==null?o:JSON.parse(JSON.stringify(o));

/* ── paths ─────────────────────────────────────────────────────────────── */
function cPath(p){ if(typeof p!=='string'||!p||p.length>200) return null; const a=p.split('.');
  for(const s of a) if(!s||s==='__proto__'||s==='constructor'||s==='prototype'||!/^[A-Za-z0-9_:\-]{1,64}$/.test(s)) return null;
  return a; }
function cGet(o,a){ for(const k of a){ if(o==null||typeof o!=='object') return undefined; o=Object.prototype.hasOwnProperty.call(o,k)?o[k]:undefined; } return o; }
function cSetIn(o,a,v){ for(let i=0;i<a.length-1;i++){ const k=a[i]; if(o[k]==null||typeof o[k]!=='object'||Array.isArray(o[k])) o[k]={}; o=o[k]; }
  if(v===null||v===undefined) delete o[a[a.length-1]]; else o[a[a.length-1]]=v; }
const LIST_CAP={chron:3000,relLog:2000,'shared.ledger':400,'shared.notes':400,'shared.gifts':400};

/* ── the campaign ──────────────────────────────────────────────────────── */
function coopFresh({title,name,hero,role,now,id,token}){
  id=id||coopRand(10); token=token||coopRand(26);
  hero=COOP_HEROES.includes(hero)?hero:'dean'; role=COOP_ROLES.includes(role)?role:'observer';
  const C={proto:COOP_PROTO, id, title:String(title||'Oakhaven').slice(0,60), created:now||Date.now(), closed:false, v:0,
    seats:{A:{hero,role,name:String(name||'').slice(0,24),host:true,cred:coopCredHash(id,token),revoked:false,joined:now||Date.now()},
           B:{hero:coopOther(hero,COOP_HEROES),role:coopOther(role,COOP_ROLES),name:'',host:false,cred:null,revoked:false,joined:0}},
    invite:null,
    shared:{clues:{},links:{},flags:{},votes:{},final:{},decisions:{},ledger:[],notes:[]},
    priv:{A:{},B:{}}, rel:{}, relLog:[], chron:[], seen:{A:[],B:[]}};
  C.chron.push({kind:'admin',text:`Campaign “${C.title}” opened. ${C.seats.A.name||'The host'} is ${heroLabel(hero)}, the ${roleLabel(role)}.`,by:'A',t:C.created,v:0});
  return {C,token};
}
function heroLabel(h){ return h==='sam'?'Sam':'Dean'; }
function roleLabel(r){ return r==='interrogator'?'Interrogator':'Observer'; }

/* who may do what */
function coopACL(C,seat,op){
  if(!op||typeof op!=='object') return 'bad op';
  const me=C.seats[seat]; if(!me||!me.cred||me.revoked) return 'removed';
  const admin=['invite','revoke','close','reopen','title'];
  if(admin.includes(op.op)){ if(!me.host) return 'host only';
    if(op.op==='revoke'&&(op.seat===seat||!C.seats[op.seat])) return 'bad seat';
    if(op.op==='invite'&&(typeof op.hash!=='string'||op.hash.length!==64)) return 'bad invite';
    if(C.closed&&op.op!=='reopen') return 'closed';
    return null; }
  if(C.closed) return 'closed';
  if(!['set','inc','push'].includes(op.op)) return 'bad op';
  const a=cPath(op.path); if(!a) return 'bad path';
  let sz=0; try{ sz=JSON.stringify(op.val===undefined?null:op.val).length; }catch(e){ return 'bad value'; } if(sz>6000) return 'too big';
  const root=a[0];
  if(root==='shared'){
    if(a[1]==='votes'){ if(a.length!==4||a[3]!==seat||op.op!=='set') return 'not your vote'; }
    if(op.op==='push'&&!LIST_CAP[a.join('.')]) return 'not a list';
    if(op.op!=='push'&&LIST_CAP[a.join('.')]) return 'append only';
    return null; }
  if(root==='priv') return a[1]===seat&&a.length>=3&&op.op!=='push'?null:'not yours';
  if(root==='rel'){
    if(a.length!==4||!REL_CAST.includes(a[1])||!REL_CAST.includes(a[2])||a[1]===a[2]||!REL_VARS.includes(a[3])) return 'bad relationship';
    if(op.op==='push') return 'bad op';
    const owner=COOP_HEROES.includes(a[1])?a[1]:a[2];
    if(owner!==me.hero) return 'not your character';
    if(a[3]==='desire'&&COOP_HEROES.includes(a[1])&&COOP_HEROES.includes(a[2])) return 'they are brothers';
    return null; }
  if(root==='chron'||root==='relLog') return a.length===1&&op.op==='push'?null:'append only';
  return 'bad path';
}
/* apply an accepted operation. Same code on the authority and the replicas. */
function coopApply(C,seat,op){
  switch(op.op){
    case 'set': cSetIn(C,cPath(op.path),coopClone(op.val)); break;
    case 'inc': { const a=cPath(op.path), cur=+cGet(C,a)||0; cSetIn(C,a,Math.max(-10,Math.min(10,cur+(+op.n||0)))); break; }
    case 'push': { const a=cPath(op.path), key=a.join('.'); let L=cGet(C,a); if(!Array.isArray(L)){ L=[]; cSetIn(C,a,L); }
      L.push(coopClone(op.val)); while(L.length>(LIST_CAP[key]||500)) L.shift(); break; }
    case 'invite': C.invite={hash:op.hash,exp:op.exp,bad:0}; break;
    case 'revoke': { const s=C.seats[op.seat]; s.cred=null; s.revoked=true; break; }
    case 'claim': { const s=C.seats[op.seat]; s.cred=op.cred; s.revoked=false; s.name=String(op.name||'').slice(0,24); s.joined=op.t; C.invite=null; break; }
    case 'close': C.closed=true; break;
    case 'reopen': C.closed=false; break;
    case 'title': C.title=String(op.title||C.title).slice(0,60); break;
  }
  if(typeof op.v==='number') C.v=op.v; else C.v++;
}
/* what a seat is allowed to see */
function coopView(C,seat){
  const V=coopClone(C); delete V.invite; delete V.seen;
  for(const k of Object.keys(V.seats)){ const s=V.seats[k]; s.claimed=!!s.cred; delete s.cred; }
  V.priv={[seat]:V.priv[seat]||{}}; V.inviteOpen=!!(C.invite&&C.invite.exp>Date.now());
  return V;
}
const coopPrivOp=op=>op&&typeof op.path==='string'&&op.path.startsWith('priv.');

/* ── the authority ─────────────────────────────────────────────────────── */
class CoopAuthority{
  constructor(C,save){ this.C=C; this.save=save||(()=>{}); this.conns=new Set(); this.now=()=>Date.now(); }
  attach(link){ const conn={link,seat:null,rx:Date.now()}; this.conns.add(conn);
    link.onmsg=m=>{ conn.rx=Date.now(); try{ this.onMsg(conn,m); }catch(e){ console.error('coop authority',e); } };
    link.onclose=()=>{ this.conns.delete(conn); if(conn.seat) this.presence(); };
    return conn; }
  to(conn,m){ try{ conn.link.send(m); }catch(e){} }
  /* a connection that has said nothing for 20 s is gone, whatever the transport thinks */
  tick(now){ for(const c of [...this.conns]) if(c.seat&&now-c.rx>20000){ this.conns.delete(c); try{ c.link.close(); }catch(e){} this.presence(); } }
  online(){ const o={A:false,B:false}; for(const c of this.conns) if(c.seat) o[c.seat]=true; return o; }
  presence(){ const o=this.online(); for(const c of this.conns) if(c.seat) this.to(c,{type:'presence',online:o}); }
  kick(seat,why,except){ let n=0; for(const c of [...this.conns]) if(c.seat===seat&&c!==except){ n++; this.to(c,{type:'bye',why}); c.seat=null; this.conns.delete(c); try{ c.link.close(); }catch(e){} } if(n&&why!=='elsewhere') this.presence(); }
  welcome(conn,seat){ this.kick(seat,'elsewhere',conn); conn.seat=seat; this.to(conn,{type:'welcome',seat,state:coopView(this.C,seat)}); this.presence(); }
  refresh(){ for(const c of this.conns) if(c.seat) this.to(c,{type:'state',state:coopView(this.C,c.seat)}); }
  inviteOk(code){ const I=this.C.invite; if(!I||I.exp<this.now()||I.bad>=6) return 'noinvite';
    if(coopCodeHash(this.C.id,code)!==I.hash){ I.bad++; this.save(this.C); return 'badcode'; } return null; }
  guestSeat(){ return Object.keys(this.C.seats).find(k=>!this.C.seats[k].host); }
  onMsg(conn,m){
    if(!m||typeof m!=='object'||typeof m.type!=='string') return;
    const C=this.C, err=(code,id)=>this.to(conn,{type:'err',code,id});
    if(m.type==='hello'){
      if(m.cid!==C.id) return err('nocampaign'); const s=C.seats[m.seat]; if(!s) return err('denied');
      if(s.revoked) return err('removed'); if(!s.cred||coopCredHash(C.id,String(m.cred||''))!==s.cred) return err('denied');
      return this.welcome(conn,m.seat); }
    if(m.type==='peek'||m.type==='claim'){
      if(m.cid!==C.id) return err('nocampaign'); if(C.closed) return err('closed');
      const seat=this.guestSeat(), s=C.seats[seat];
      if(s.cred&&!s.revoked) return err('taken');
      const bad=this.inviteOk(m.code); if(bad) return err(bad);
      if(m.type==='peek') return this.to(conn,{type:'offer',title:C.title,hero:s.hero,role:s.role,host:C.seats.A.name||'',replacing:!!s.revoked});
      if(typeof m.cred!=='string'||m.cred.length!==64) return err('denied');
      const name=String(m.name||'').replace(/[<>]/g,'').slice(0,24)||heroLabel(s.hero);
      const t=this.now(), was=s.revoked;
      coopApply(C,seat,{op:'claim',seat,cred:m.cred,name,t});
      coopApply(C,seat,{op:'push',path:'chron',val:{kind:'admin',text:`${name} ${was?'took over':'joined as'} ${heroLabel(s.hero)}, the ${roleLabel(s.role)}.`,by:seat,t,v:C.v+1}});
      this.save(C); this.welcome(conn,seat); this.refresh(); return; }
    if(m.type==='op'){
      if(!conn.seat) return err('denied',m.id);
      const seat=conn.seat, seen=(C.seen=C.seen||{})[seat]=(C.seen[seat]||[]);
      if(m.id&&seen.includes(m.id)) return this.to(conn,{type:'ack',id:m.id,ok:true,dup:true});
      const op=m.op, bad=coopACL(C,seat,op);
      if(bad){ if(bad==='removed'){ this.to(conn,{type:'bye',why:'removed'}); try{ conn.link.close(); }catch(e){} return; } return err(bad,m.id); }
      if(op.op!=='revoke'&&op.op!=='close'&&JSON.stringify(C).length>1500000) return err('full',m.id);
      if('expect' in op){ const cur=op.op==='set'?cGet(C,cPath(op.path)):undefined;
        if(JSON.stringify(cur===undefined?null:cur)!==JSON.stringify(op.expect===undefined?null:op.expect)) return err('conflict',m.id); }
      const t=this.now(), v=C.v+1, o=coopClone(op); delete o.expect; o.by=seat; o.t=t; o.v=v;
      if(o.op==='push') o.val=Object.assign({},o.val&&typeof o.val==='object'?o.val:{text:String(o.val)},{by:seat,t,v});
      if(o.op==='invite') o.exp=Math.min(+o.exp||0,t+14*864e5)||t+7*864e5;
      coopApply(C,seat,o);
      if(m.id){ seen.push(m.id); if(seen.length>200) seen.shift(); }
      this.save(C);
      this.to(conn,{type:'ack',id:m.id,ok:true,v});
      if(o.op==='revoke'){ this.kick(o.seat,'removed'); this.refresh(); return; }
      if(['invite','close','reopen','title'].includes(o.op)){ if(o.op==='close') for(const c of this.conns) if(c.seat) this.to(c,{type:'bye',why:'closed',soft:true}); this.refresh(); return; }
      const ev={type:'ev',ev:o}, owner=coopPrivOp(o)?o.path.split('.')[1]:null;
      for(const c of this.conns) if(c.seat&&(!owner||c.seat===owner)) this.to(c,ev);
      return; }
    if(m.type==='eph'&&conn.seat){ for(const c of this.conns) if(c.seat&&c.seat!==conn.seat) this.to(c,{type:'eph',seat:conn.seat,d:m.d}); return; }
    if(m.type==='ping') return this.to(conn,{type:'pong',t:m.t});
  }
}

/* ── links: a link is {send(obj), close(), onmsg, onclose} ─────────────── */
/* in memory, delivered in order without re-entering a handler mid-message */
function coopMemPair(){
  const q=[]; let busy=false, open=true;
  const pump=()=>{ if(busy) return; busy=true; try{ while(q.length){ const [to,m]=q.shift(); if(to.onmsg) to.onmsg(JSON.parse(m)); } } finally{ busy=false; } };
  const mk=()=>({onmsg:null,onclose:null,peer:null,send(m){ if(!open) return; q.push([this.peer,JSON.stringify(m)]); pump(); },
    close(){ if(!open) return; open=false; const a=this, b=this.peer; q.length=0; if(a.onclose) a.onclose(); if(b.onclose) b.onclose(); }});
  const a=mk(), b=mk(); a.peer=b; b.peer=a; return [a,b];
}

/* ── the replica: one player's view of the campaign ────────────────────── */
class CoopClient{
  constructor(meta,store){ this.meta=meta; this.store=store||(()=>{}); this.state=meta.replica||null; this.outbox=meta.outbox||[];
    this.status='offline'; this.online={A:false,B:false}; this.link=null; this.h={}; this.pendingJoin=null; this.retryN=0; }
  on(k,f){ this.h[k]=f; return this; }
  emit(k,...a){ try{ this.h[k]&&this.h[k](...a); }catch(e){ console.error('coop',k,e); } }
  setStatus(s,why){ this.status=s; this.emit('status',s,why); }
  persist(){ this.meta.replica=this.state; this.meta.outbox=this.outbox; this.store(this.meta); }
  use(link){ if(this.link&&this.link!==link) try{ this.link.onclose=null; this.link.close(); }catch(e){}
    this.link=link; this.rx=Date.now(); this.pinged=0; link.onmsg=m=>{ this.rx=Date.now(); this.onMsg(m); }; link.onclose=()=>{ if(this.link!==link) return; this.link=null; this.online={A:false,B:false};
      if(!['removed','closed','denied'].includes(this.status)) this.setStatus('offline'); this.emit('presence',this.online); };
    if(!this.pendingJoin&&!this.meta.token){ this.setStatus('removed'); try{ link.close(); }catch(e){} return; }
    this.setStatus('connecting');
    if(this.pendingJoin) link.send(this.pendingJoin);
    else if(this.meta.token) link.send({type:'hello',proto:COOP_PROTO,cid:this.meta.cid,seat:this.meta.seat,cred:this.meta.token,have:this.state?this.state.v:-1});
  }
  /* cb(ok, code) is called when the authority answers (not across reloads) */
  send(op,cb){ if(this.status==='removed'){ if(cb) cb(false,'removed'); return null; } const id=coopRand(10); this.outbox.push({id,op}); if(cb) (this.cbs=this.cbs||{})[id]=cb; this.persist(); this.flush(); return id; }
  answer(id,ok,code){ const f=this.cbs&&this.cbs[id]; if(f){ delete this.cbs[id]; try{ f(ok,code); }catch(e){ console.error(e); } } }
  flush(){ if((this.status!=='online'&&this.status!=='closed')||!this.link) return; for(const o of this.outbox) if(!o.sent){ o.sent=true; this.link.send({type:'op',id:o.id,op:o.op}); } }
  /* heartbeat: ping every 5 s; nothing heard for 15 s means the line is dead */
  tick(now){ if(!this.link||!['online','closed'].includes(this.status)) return;
    if(now-this.rx>15000){ const l=this.link; try{ l.close(); }catch(e){} if(this.link===l&&l.onclose) l.onclose(); return; }
    if(now-(this.pinged||0)>5000){ this.pinged=now; this.link.send({type:'ping',t:now}); } }
  sendEph(d){ if(this.status==='online'&&this.link) this.link.send({type:'eph',d}); }
  onMsg(m){
    if(!m||typeof m!=='object') return;
    if(m.type==='welcome'||m.type==='state'){
      if(m.type==='welcome'){ this.meta.seat=m.seat; this.pendingJoin=null; this.retryN=0; }
      this.state=m.state; this.meta.title=m.state.title; this.persist();
      if(this.state.closed){ this.setStatus('closed'); this.emit('change','state'); return; }
      if(m.type==='welcome'){ this.setStatus('online'); for(const o of this.outbox) o.sent=false; this.flush(); }
      else if(this.status==='closed') this.setStatus('online');
      this.emit('change','state'); return; }
    if(m.type==='ev'){ if(!this.state) return; coopApply(this.state,m.ev.by,m.ev); this.persist(); this.emit('change','ev',m.ev); return; }
    if(m.type==='ack'){ const i=this.outbox.findIndex(o=>o.id===m.id); if(i>=0) this.outbox.splice(i,1); this.persist(); this.answer(m.id,true); return; }
    if(m.type==='err'){
      if(m.id){ const i=this.outbox.findIndex(o=>o.id===m.id); const o=i>=0?this.outbox.splice(i,1)[0]:null; this.persist(); this.answer(m.id,false,m.code); this.emit('rejected',m.code,o&&o.op); return; }
      if(['removed','denied','nocampaign'].includes(m.code)){ this.setStatus(m.code==='removed'?'removed':'denied',m.code); return; }
      if(m.code==='closed'){ this.setStatus('closed'); return; }
      this.emit('joinError',m.code); return; }
    if(m.type==='offer'){ this.emit('offer',m); return; }
    if(m.type==='presence'){ this.online=m.online; this.emit('presence',m.online); return; }
    if(m.type==='eph'){ this.emit('eph',m.seat,m.d); return; }
    if(m.type==='bye'){ const why=m.why; if(why==='removed'){ this.setStatus('removed'); this.meta.token=null; this.persist(); }
      else if(why==='closed'){ if(this.state) this.state.closed=true; this.setStatus('closed'); }
      else if(why==='elsewhere') this.setStatus('elsewhere');
      this.emit('bye',why); return; }
  }
  /* joining: peek first (no commitment), then claim with a fresh credential */
  peek(link,code){ this.pendingJoin={type:'peek',proto:COOP_PROTO,cid:this.meta.cid,code}; this.use(link); }
  claim(link,code,name){ const token=coopRand(26); this.meta.token=token;
    this.pendingJoin={type:'claim',proto:COOP_PROTO,cid:this.meta.cid,code,name,cred:coopCredHash(this.meta.cid,token)};
    this.persist(); this.use(link); }
  close(){ if(this.link){ const l=this.link; this.link=null; try{ l.close(); }catch(e){} } this.setStatus('offline'); }
}
