"""Embed the weapon atlas made by tools/cut_weapons.py into src/57r_vmatlas.js.
   python3 tools/embed_weapons.py <dir with atlas.webp and meta.json>"""
import sys, json, base64
from pathlib import Path
d = Path(sys.argv[1]); root = Path(__file__).resolve().parent.parent
meta = json.load(open(d / 'meta.json'))
b64 = base64.b64encode((d / 'atlas.webp').read_bytes()).decode()
js = f'''/* ═══ Weapon art (1.11) ════════════════════════════════════════════════════
   Painted first-person weapons, three poses each (idle, attack, alt: inspect,
   reload or swing-through), and painted item art for every weapon (used in
   the trunk, the shop and on the ground). One WebP atlas, embedded below and
   decoded once at load; tools/cut_weapons.py and tools/embed_weapons.py make
   it from the two source sheets. Warm and blue glow paint (muzzle flash,
   blade arcs, flame) is marked emissive (alpha 254) so it lights the dark.
   If the image can't be decoded, the procedural drawings in 57s are used. */
const VM_META={json.dumps(meta)};
const VM_ATLAS="data:image/webp;base64,{b64}";
const VM_IMG={{ready:false,frames:{{}},poses:{{}},items:{{}},itemURL:{{}}}};
/* how tall each weapon stands on screen, in the game's 200-line units */
const VM_HEIGHT={{revolver:92,shotgun:96,flare:90,crowbar:104,knife:96,angelblade:104,archangel:110,ring:92,holywater:88,journal:90,lantern:92,torch:100,rifle:100,crossbow:112}};
(function loadVmAtlas(){{ try{{ if(typeof Image==='undefined'||!document.createElement) return; const im=new Image();
  im.onload=()=>{{ try{{ const c=document.createElement('canvas'); c.width=im.width; c.height=im.height; const x=c.getContext('2d'); if(!x||!x.getImageData) return;
      x.drawImage(im,0,0); const D=x.getImageData(0,0,c.width,c.height).data;
      const cut=([ox,oy,w,h])=>{{ const px=new Uint32Array(w*h); for(let y=0;y<h;y++) for(let xx=0;xx<w;xx++){{ const j=((oy+y)*c.width+ox+xx)*4, a=D[j+3]; if(a<110) continue;
          px[y*w+xx]=(((a>=250&&a<=254?254:255)<<24)|(D[j+2]<<16)|(D[j+1]<<8)|D[j])>>>0; }} return {{w,h,px}}; }};
      for(const [k,P] of Object.entries(VM_META.frames)){{ const idle=cut(P.idle), sc=(VM_HEIGHT[k]||92)/Math.max(idle.h,1);
        VM_IMG.frames[k]=Object.assign(idle,{{scale:sc,muzzle:null}});
        VM_IMG.poses[k]={{attack:Object.assign(cut(P.attack),{{scale:sc}}),alt:Object.assign(cut(P.alt),{{scale:sc}})}}; }}
      for(const [k,r] of Object.entries(VM_META.items)){{ try{{ const cv=document.createElement('canvas'); cv.width=r[2]; cv.height=r[3]; cv.getContext('2d').drawImage(im,r[0],r[1],r[2],r[3],0,0,r[2],r[3]);
          VM_IMG.itemURL[k]=cv.toDataURL(); VM_IMG.items[k]=cut(r); }}catch(e){{}} }}
      VM_IMG.ready=true; if(S.running&&typeof rebuildVM==='function') rebuildVM(); }}catch(e){{ console.warn('weapon art',e); }} }};
  im.src=VM_ATLAS; }}catch(e){{}} }})();
'''
(root / 'src' / '57r_vmatlas.js').write_text(js)
print('wrote', len(js))
