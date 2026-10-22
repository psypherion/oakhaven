/* ═══ Chess: the pieces ════════════════════════════════════════════════════
   A gothic set drawn in SVG on a 100×100 grid. Light is carved bone with
   gilt bands; dark is blackened iron with a crimson ember inside the
   slits and windows. Every piece stands on the same two-step plinth so
   the set reads as one family: the pawn is a hooded acolyte with an ember behind the eyes, the rook a
   chapel tower with a lancet window, the knight a lean horse with a
   braided mane, the bishop a mitre split by its slit, the queen a spiked
   crown of orbs, the king a closed crown under an iron cross. */

const CH_SET={
  w:{hi:'#fbf3df',mid:'#e6d6b2',lo:'#b39c72',line:'#3b2a16',trim:'#c9a043',trimLo:'#8a6a22',slot:'#4a3620',glow:null},
  b:{hi:'#5a525a',mid:'#2b262c',lo:'#0f0c10',line:'#050304',trim:'#a3271f',trimLo:'#5c120e',slot:'#ff6a2a',glow:'#ff3d14'}};
/* the plinth all pieces share */
const CH_PLINTH='<path class="f" d="M17 93 L83 93 Q84 88 80 86 L20 86 Q16 88 17 93 Z"/><path class="t" d="M23 86 L77 86 L74 80 Q50 77 26 80 Z"/>';
const CH_SHAPES={
  p:CH_PLINTH+'<g transform="translate(5 8.6) scale(.9)">'+
    '<path class="f" d="M31 80 Q33 69 41 63 L59 63 Q67 69 69 80 Z"/>'+
    '<path class="t" d="M37 63 L63 63 L60 57 L40 57 Z"/>'+
    '<circle class="f" cx="50" cy="42" r="13"/>'+
    '<path class="d" d="M38.5 46 Q38 31 50 29 Q62 31 61.5 46" fill="none"/>'+
    '<path class="s" d="M46 44 Q50 41.5 54 44 Q50 46.5 46 44 Z"/></g>',
  r:CH_PLINTH+
    '<path class="f" d="M30 80 L34 46 L66 46 L70 80 Z"/>'+
    '<path class="t" d="M31 50 L69 50 L68 45 L32 45 Z"/>'+
    '<path class="f" d="M27 45 L73 45 L73 22 L65 22 L65 29 L57 29 L57 22 L43 22 L43 29 L35 29 L35 22 L27 22 Z"/>'+
    '<path class="s" d="M45 74 L45 62 Q45 55 50 52 Q55 55 55 62 L55 74 Z"/>'+
    '<path class="d" d="M34 58 L66 58 M33 68 L67 68" fill="none"/>'+
    '<path class="s" d="M48.5 32 L51.5 32 L51.5 41 L48.5 41 Z"/>',
  n:CH_PLINTH+
    '<path class="f" d="M30 80 Q29 66 36 57 Q41 51 41 46 Q35 49 30 51 Q26 53 23 51 Q18 48 19 44 L27 30 Q32 20 43 16 L45 9 L50 14 L54 9 L56 16 Q67 20 70 33 Q74 47 70 62 Q68 72 70 80 Z"/>'+
    '<path class="t" d="M32 80 L68 80 L67 74 L33 74 Z"/>'+
    '<path class="d" d="M56 17 Q66 24 67 36 Q69 46 66 56 Q64 64 66 72" fill="none"/>'+
    '<path class="d" d="M60 21 L64 24 M63 30 L67 32 M65 39 L69 40 M65 48 L69 48 M64 57 L68 56" fill="none"/>'+
    '<path class="s" d="M39 27 Q43 24 46 28 Q43 31 39 27 Z"/>'+
    '<circle class="s" cx="24.5" cy="45" r="1.8"/>'+
    '<path class="d" d="M21 49 Q25 50 29 48 M35 38 Q37 43 41 46" fill="none"/>',
  b:CH_PLINTH+
    '<path class="f" d="M32 80 Q38 68 43 60 L57 60 Q62 68 68 80 Z"/>'+
    '<path class="t" d="M38 60 L62 60 L59 54 L41 54 Z"/>'+
    '<path class="f" d="M50 16 Q66 30 63 45 Q60 53 50 54 Q40 53 37 45 Q34 30 50 16 Z"/>'+
    '<path class="s" d="M55.5 24 L58.5 26 L48 43 L45 41 Z"/>'+
    '<path class="t" d="M39 47 Q50 51 61 47 L60.5 50.5 Q50 54 39.5 50.5 Z"/>'+
    '<circle class="t" cx="50" cy="12" r="4.2"/>',
  q:CH_PLINTH+
    '<path class="f" d="M30 80 Q37 64 42 52 L58 52 Q63 64 70 80 Z"/>'+
    '<path class="t" d="M36 52 L64 52 L61 46 L39 46 Z"/>'+
    '<path class="f" d="M35 46 L26 23 L39 35 L43 15 L50 31 L57 15 L61 35 L74 23 L65 46 Z"/>'+
    '<path class="t" d="M35 46 L65 46 L66.5 41 Q50 37 33.5 41 Z"/>'+
    '<circle class="t" cx="26" cy="21" r="3.6"/><circle class="t" cx="43" cy="13" r="3.6"/><circle class="t" cx="57" cy="13" r="3.6"/><circle class="t" cx="74" cy="21" r="3.6"/>'+
    '<path class="s" d="M50 66 L46.5 72 L50 78 L53.5 72 Z"/>'+
    '<path class="d" d="M40 64 Q50 61 60 64" fill="none"/>',
  k:CH_PLINTH+
    '<path class="f" d="M30 80 Q37 63 42 51 L58 51 Q63 63 70 80 Z"/>'+
    '<path class="t" d="M36 51 L64 51 L61 45 L39 45 Z"/>'+
    '<path class="f" d="M37 45 Q28 33 35 27 Q42 22 50 30 Q58 22 65 27 Q72 33 63 45 Z"/>'+
    '<path class="t" d="M37 45 L63 45 L64.5 40.5 Q50 37 35.5 40.5 Z"/>'+
    '<path class="t" d="M47 3 L53 3 L53 10 L60 10 L60 16 L53 16 L53 28 L47 28 L47 16 L40 16 L40 10 L47 10 Z"/>'+
    '<path class="s" d="M48.5 66 L51.5 66 L51.5 76 L48.5 76 Z M45 69 L55 69 L55 72 L45 72 Z"/>'+
    '<path class="d" d="M40 63 Q50 60 60 63" fill="none"/>'};
const CH_SVG_CACHE={};
function chPieceSVG(p){ if(CH_SVG_CACHE[p]) return CH_SVG_CACHE[p];
  const c=chColor(p), t=p.toLowerCase(), K=CH_SET[c], g='g'+c;
  const glow=K.glow?`<filter id="e${c}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`:'';
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>`+
    `<linearGradient id="${g}" x1="0" y1="0" x2="1" y2="0.35"><stop offset="0" stop-color="${K.hi}"/><stop offset=".45" stop-color="${K.mid}"/><stop offset="1" stop-color="${K.lo}"/></linearGradient>`+
    `<linearGradient id="t${c}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${K.trim}"/><stop offset="1" stop-color="${K.trimLo}"/></linearGradient>${glow}</defs>`+
    `<style>.f{fill:url(#${g});stroke:${K.line};stroke-width:2.2;stroke-linejoin:round}.t{fill:url(#t${c});stroke:${K.line};stroke-width:1.8;stroke-linejoin:round}`+
    `.s{fill:${K.slot};${K.glow?`filter:url(#e${c});`:''}}.d{stroke:${c==='w'?'rgba(59,42,22,.55)':'rgba(255,255,255,.14)'};stroke-width:1.4;stroke-linecap:round}</style>`+
    `<ellipse cx="50" cy="94" rx="31" ry="3.2" fill="rgba(0,0,0,.35)"/>${CH_SHAPES[t]}</svg>`;
  return CH_SVG_CACHE[p]='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg); }
