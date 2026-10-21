/* ═══ Four protagonists: relationships ══════════════════════════════════════
   Dean, Sam, Lilith and Sarah each feel something separate about each of the
   others, along eight lines that move independently:

     trust · affection · respect · desire · understanding · resentment ·
     emotional safety · supernatural influence

   rel[a][b] is how a feels about b. It is never symmetric: Lilith can be
   learning to respect Dean while Dean is under her influence; Sarah can feel
   safe with Sam and resent Dean for the same night. Influence measures how
   far something supernatural is bending a's view of b; desire it produced is
   not affection, and the game never counts it as such.

   The brothers are brothers. There is no desire line between them, ever;
   their bond is trust, respect, understanding, resentment and the rest.

   Every change is a structured event with a reason. In co-op each player
   writes only their own brother's side of things (how he feels, and how the
   people he talks to come to feel about him); major changes go into the
   chronicle where both of you can see them, personal ones stay private.
   Nothing here is a meter to fill. Kindness does not buy romance, and
   romance is never needed to finish a case. */

/* where everyone starts */
const REL_BASE={
  dean:{sam:{trust:5,affection:7,respect:3,understanding:4,safety:3}, sarah:{}, lilith:{}},
  sam:{dean:{trust:5,affection:7,respect:5,understanding:5,safety:4}, sarah:{}, lilith:{}},
  sarah:{dean:{safety:1}, sam:{safety:1}},
  lilith:{dean:{}, sam:{}},
};
function relRaw(){ return COOP.on?((coopState()&&coopState().rel)||{}):(inv_().rel=inv_().rel||{}); }
function relGet(a,b){ const o={}; for(const v of REL_VARS) o[v]=0; Object.assign(o,(REL_BASE[a]||{})[b]||{});
  const d=(relRaw()[a]||{})[b]||{}; for(const v of REL_VARS) if(typeof d[v]==='number') o[v]=Math.max(-10,Math.min(10,o[v]+d[v]));
  if(COOP_HEROES.includes(a)&&COOP_HEROES.includes(b)) o.desire=0;
  return o; }
const relOwner=(a,b)=>COOP_HEROES.includes(a)?a:b;
const relMine=(a,b)=>!COOP.on||relOwner(a,b)===COOP.hero;
/* o.major: shown in the chronicle to both players. Otherwise private. */
function relEvent(a,b,d,why,o={}){
  if(!REL_CAST.includes(a)||!REL_CAST.includes(b)||a===b||!d) return false;
  const D={}; for(const [k,n] of Object.entries(d)) if(REL_VARS.includes(k)&&n) D[k]=n;
  if(COOP_HEROES.includes(a)&&COOP_HEROES.includes(b)) delete D.desire;
  if(!Object.keys(D).length) return false;
  const rec={a,b,d:D,why:String(why||''),kind:o.kind||'moment'};
  if(COOP.on){ if(!relMine(a,b)) return false;
    for(const [k,n] of Object.entries(D)) cop({op:'inc',path:`rel.${a}.${b}.${k}`,n});
    if(o.major){ cop({op:'push',path:'relLog',val:rec}); chron('rel',o.line||`${relName(a)} and ${relName(b)}: ${why}.`); }
    else cop({op:'set',path:`priv.${COOP.seat}.rlog.r${Date.now().toString(36)}${coopRand(3)}`,val:Object.assign({t:Date.now()},rec)});
  } else { const R=relRaw(); R[a]=R[a]||{}; const x=R[a][b]=R[a][b]||{};
    for(const [k,n] of Object.entries(D)) x[k]=Math.max(-10,Math.min(10,(x[k]||0)+n));
    const I=inv_(); (I.relLog=I.relLog||[]).push(Object.assign({t:Date.now(),major:!!o.major},rec)); if(I.relLog.length>400) I.relLog.shift(); }
  return true; }
function relBrothers(d,why){ if(!COOP.on) return; relEvent(COOP.hero,partnerHero(),d,why); }
function relName(x){ return x==='dean'||x==='sam'?(COOP.on&&seatInfo(COOP.hero===x?COOP.seat:partnerSeat())?nameOfSeat(COOP.hero===x?COOP.seat:partnerSeat()):heroLabel(x)):x==='lilith'?'Lilith':'Sarah'; }
/* history: the shared one, and your own */
function relHistory(){ if(!COOP.on) return (inv_().relLog||[]).slice();
  const C=coopState(); const pub=((C&&C.relLog)||[]).map(r=>Object.assign({pub:true},r)), mine=Object.values(myPriv().rlog||{});
  return pub.concat(mine).sort((x,y)=>(x.t||0)-(y.t||0)); }
/* a reaction depends on where things stand: the first rule that fits */
function relReact(rules,fallback){ for(const [ok,line] of rules) try{ if(ok()) return typeof line==='function'?line():line; }catch(e){} return typeof fallback==='function'?fallback():fallback; }
/* words, not numbers. What you can read of someone else depends on how well
   you understand them. */
function relWords(r,who){ const w=[];
  if(r.influence>=3) w.push(who==='self'?'not entirely your own thoughts about her':'under someone’s influence');
  if(r.trust>=5) w.push('trusts'); else if(r.trust>=2) w.push('trusts, mostly'); else if(r.trust<=-2) w.push('doesn’t trust');
  if(r.affection>=5) w.push('cares, a lot'); else if(r.affection>=2) w.push('fond');
  if(r.respect>=3) w.push('respects'); else if(r.respect<=-2) w.push('doesn’t respect');
  if(r.desire>=3) w.push('drawn to');
  if(r.resentment>=3) w.push('resents'); else if(r.resentment>=1) w.push('a grudge, small');
  if(r.safety>=3) w.push('feels safe'); else if(r.safety<=-2) w.push('on guard');
  if(r.understanding>=3) w.push('understands');
  return w.length?w.join(' · '):'nothing settled yet'; }

/* ═══ Lilith ═════════════════════════════════════════════════════════════
   The Demon Queen who wants to be human. She has spent a very long time
   making people believe her choices were theirs. She wants to love without
   possessing, and possession is the only intimacy she has ever known. Her
   gift is real: she can reveal what people hide and make them say it. Every
   use of it bends whoever asked her, and whatever she draws out of someone
   is not evidence they gave freely. Whether she is redeemable, or just
   patient, is something the brothers find out separately. */
Object.assign(LOOKS,{
  lilith:{skin:[226,206,198], hair:{style:'long',col:[18,12,16]}, eyes:{col:[60,40,36]}, lip:[132,34,46],
    top:{kind:'coat',col:[40,14,22],long:52}, legs:{kind:'skirt',col:[22,12,16],hose:[40,26,30]}, shoes:[16,10,12], extras:['highcollar','crimsonthread'], outline:[16,4,8]},
  lilith_true:{skin:[200,176,178], hair:{style:'wild',col:[10,6,10]}, eyes:{kind:'glow',col:[20,10,14]}, lip:[70,10,20],
    top:{kind:'coat',col:[26,6,12],long:53}, legs:{kind:'skirt',col:[14,6,8],hose:[30,14,18]}, shoes:[10,6,8], extras:['highcollar','crimsonthread','silvercrown'],
    tint:[60,0,20], tintAmt:.22, outline:[0,0,0]},
});
Object.assign(SPEAKERS,{lilith:{name:'Lilith',col:'#c87888'}});
if(typeof NAMES==='object'&&!NAMES.lilith){ NAME_DEFAULT.lilith='Lilith'; NAMES.lilith=NAMES.lilith||'Lilith'; }
{ const M=SECTORS.motel; if(M) M.entities.push(npc_('lilith',3.1,9.2,'lilith','A woman in the lobby chair',{h:1.76,face:0,lilith:true,hidden:true})); }
INV_UPDATES.push(()=>{ const e=SECTORS.motel&&SECTORS.motel.entities.find(x=>x.lilith); if(e) e.hidden=!COOP.on; });

const LL=(t,n,fx,req)=>D_(t,n,fx,req);
const lilR=()=>relGet('lilith',S.hero), meL=()=>relGet(S.hero,'lilith');
DIALOGUE.lilith={port:'lilith',start:()=>S.flags.lil_met?'lz':'l0',nodes:{
  l0:{speaker:'A woman in the lobby chair',text:"She is sitting in the vinyl chair by the ice machine with her hands folded the wrong way, like someone who learned patience from a painting of it.\n\n\"Sit, if you like,\" she says. \"I'm practising.\"",
    choices:[LL('“Practising what?”','l1'),
      LL('[Read her] She isn’t waiting for anyone. She’s waiting to be asked something.','l1r',null,()=>isInterrogator()),
      LL('[Look closer] Her reflection in the ice machine is a second behind her.','l1o',null,()=>isObserver())]},
  l1r:{speaker:'A woman in the lobby chair',text:"You watch her hands. She wants something and she is ashamed of wanting it, which is a strange thing to see on a face that old.\n\nShe notices you noticing. \"Oh, you're the one who reads people. How restful for you.\"",
    choices:[LL('[…]','l1',{now:()=>relEvent(S.hero,'lilith',{understanding:1},'read her')})]},
  l1o:{speaker:'A woman in the lobby chair',text:"The chrome on the ice machine shows her a beat late, the way old video drifts out of sync.\n\nShe follows your eyes. \"Old habit. I am usually somewhere else a moment before I arrive.\"",
    choices:[LL('[…]','l1',{now:()=>relEvent(S.hero,'lilith',{understanding:1},'saw what she is')})]},
  l1:{speaker:'Lilith',port:'lilith',text:"\"Asking,\" she says. \"I have never once had to ask anyone for anything. It is much harder than the stories make it sound.\"\n\nShe looks at you, and for one blink her eyes are black to the rim. Then brown.\n\n\"Lilith. You've heard the stories. Most of them were written by men I said no to.\"",
    choices:[LL('“What are you doing in Oakhaven?”','l2'),LL('“Get away from me, demon.”','lout')]},
  lout:{speaker:'Lilith',text:"\"This is a motel lobby. It's the only room in town where nobody wants anything from me.\" A pause. \"Until now. You want me gone. That is still a want.\"\n\nShe doesn't move.",
    choices:[LL('[…]','l2',{now:()=>{ relEvent('lilith',S.hero,{resentment:2,trust:-1},'told to go'); relEvent(S.hero,'lilith',{trust:-1},'a demon'); }})]},
  l2:{speaker:'Lilith',text:()=>"\"The same as you. Somebody is lying about the dead.\"\n\nShe tilts her head toward the street. \"There is a doctor drinking in the Velvet Hour so that he won't have to say what he did. I could make him want to tell you. It would feel, to him, like his own idea. It always does.\"\n\n\"Do you want me to?\""+(meL().influence>=1?'\n\n(It is very hard, suddenly, to think of a reason to say no.)':''),
    choices:[LL('“Yes. Make him talk.”','lyes'),LL('“No. If he tells me, it has to be because he chooses to.”','lno'),
      LL('“What do you get out of it?”','lwhy',null,()=>!S.flags.lil_why),LL('“Why are you asking me? You could just do it.”','lask',null,()=>!S.flags.lil_ask)]},
  lwhy:{speaker:'Lilith',text:"\"Practice.\" She smiles without much in it. \"And an hour in a room with someone who doesn't want anything from me. You're failing at that, by the way. Everyone does.\"",
    choices:[LL('[…]','l2',{flag:'lil_why',now:()=>relEvent(S.hero,'lilith',{understanding:2},'asked what she gets')})]},
  lask:{speaker:'Lilith',text:"\"Because that's the part I'm practising.\" For a second she looks genuinely tired. \"I could. I always could. Do you know what it's like to be able to make anyone love you and never once know if they did?\"",
    choices:[LL('[…]','l2',{flag:'lil_ask',now:()=>{ relEvent(S.hero,'lilith',{understanding:1,affection:1},'heard why she asks'); relEvent('lilith',S.hero,{safety:1},'asked her why'); }})]},
  lyes:{speaker:'Lilith',port:'lilith_true',text:"\"There.\" Something in the room tightens, like a held breath. \"You see how easy that was? That's the whole problem.\"\n\n\"Go and sit with him. Say my name under your breath. He will tell you everything, and he will think it was courage.\"\n\nYou will remember, later, that you didn't decide this. It just seemed like the obvious thing.",
    choices:[LL('[…]','l3',{flag:'lil_yes',now:()=>{ relEvent(S.hero,'lilith',{influence:2,desire:1},'accepted her help',{major:true,line:`${relName(S.hero)} accepted Lilith’s help.`}); relEvent('lilith',S.hero,{respect:-1,affection:1},'he said yes'); }})]},
  lno:{speaker:'Lilith',text:()=>"She is quiet for long enough that the ice machine cycles.\n\n\"That's the first time anyone has said that to me as if it were a rule,\" she says, \"rather than a price.\""+(lilR().understanding>=1?'\n\n"Thank you. I mean it. I think I mean it. It is hard to tell, from in here."':''),
    choices:[LL('[…]','l3',{flag:'lil_no',now:()=>{ relEvent('lilith',S.hero,{respect:2,trust:1,understanding:1},'he said no',{}); relEvent(S.hero,'lilith',{respect:1},'refused her',{major:true,line:`${relName(S.hero)} refused Lilith’s help, and told her why.`}); }})]},
  l3:{speaker:'Lilith',text:"\"One more thing, free.\" She stands. \"This week three people in this town have told you ‘it was my decision.’ Count them. People who decide things for themselves don't all use the same sentence.\"\n\nThe bell over the door doesn't ring when she leaves. It rings a moment later, for nobody.",
    choices:[LL('[…]',null,{flag:'lil_met',now:()=>{ S.flags.met_lilith=true; const e=S.sector.entities.find(x=>x.lilith); if(e) e.face=Math.PI; }})]},
  lz:{speaker:'Lilith',text:()=>relReact([
      [()=>lilR().resentment>=2,"\"You came back to look at a demon. Say what you came to say.\""],
      [()=>meL().influence>=3,"\"You look at me like you've already agreed to something.\" She leans away from you, deliberately. \"You haven't. Remember that. I'm trying to.\""],
      [()=>lilR().respect>=2&&lilR().trust>=1,"\"You said no to me once and meant it. I keep thinking about it, which is new.\""],
      [()=>S.flags.lil_yes&&S.flags.rot_conf_inf,"\"He told you. He doesn't know why he told you. Neither, I think, do you.\""],
    ],"\"Still practising,\" she says. \"Ask me something. Properly.\""),
    choices:[LL('“What do you want, Lilith?”','lw2',null,()=>!S.flags.lil_w2),LL('[Leave her be.]',null)]},
  lw2:{speaker:'Lilith',text:()=>relReact([
      [()=>relGet(S.hero,'lilith').understanding>=2,"\"To be wanted by someone I didn't touch.\" She says it fast, like ripping off tape. \"Don't make it a quest. I'll ruin it.\""],
    ],"\"Everyone asks that as if the answer would help them.\" She smiles. \"Ask me again when you've known me longer than a week.\""),
    choices:[LL('[…]',null,{flag:'lil_w2',now:()=>relEvent(S.hero,'lilith',{understanding:1},'asked what she wants')})]},
}};
