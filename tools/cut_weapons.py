"""Cut the painted first-person weapon sheet (3 frames per weapon) and the
item sheet into one embedded atlas for the game.

  python3 tools/cut_weapons.py <viewmodel_sheet.png> <item_sheet.png> <out_dir>

Writes atlas.png and meta.json. The viewmodel sheet has a baked checkerboard
background and caption banners; both are removed here."""
import sys, json
import numpy as np
from PIL import Image
from scipy import ndimage

VM, ITEMS, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
im = np.array(Image.open(VM).convert('RGB')).astype(int)
H, W, _ = im.shape
sat = im.max(2) - im.min(2); val = im.max(2)

# caption banners: wide, short, very dark components
dark = val < 50
lab, n = ndimage.label(dark)
labels = []
for sl in ndimage.find_objects(lab):
    ys, xs = sl; h = ys.stop - ys.start; w = xs.stop - xs.start
    if 12 <= h <= 50 and w >= 90 and w / h > 3:
        labels.append((ys.start, ys.stop, xs.start, xs.stop))
frames = sorted([l for l in labels if l[1] - l[0] <= 24], key=lambda l: (l[0] // 40, l[2]))
rows = sorted(set(l[0] // 40 for l in frames))
ROWTOP = {}
titles = sorted([l for l in labels if l[1] - l[0] > 24])
NAMES = ['revolver', 'shotgun', 'flare', 'crowbar', 'knife', 'angelblade', 'archangel', 'ring', 'holywater', 'journal', 'lantern', 'torch']
POSE = ['idle', 'attack', 'alt']
assert len(frames) == 36, len(frames)

def checker(region):
    s = sat[region]; v = val[region]
    return (s < 12) & (((v >= 244)) | ((v >= 212) & (v <= 230)))

out = []
for ri, r in enumerate(rows):
    fr = [f for f in frames if f[0] // 40 == r]
    top_lab = fr[0][0]
    prev_title = [t for t in titles if t[1] <= top_lab]
    y0 = (max(t[1] for t in prev_title) + 2) if prev_title else 0
    y1 = top_lab - 1
    cx = [(f[2] + f[3]) / 2 for f in fr]
    for i, f in enumerate(fr):
        x0 = int(0 if i == 0 else (cx[i - 1] + cx[i]) / 2)
        x1 = int(W if i == len(fr) - 1 else (cx[i] + cx[i + 1]) / 2)
        reg = (slice(y0, y1), slice(x0, x1))
        cand = checker(reg)
        lb, nn = ndimage.label(cand)
        bg = np.zeros_like(cand)
        border = set(np.unique(np.concatenate([lb[0], lb[-1], lb[:, 0], lb[:, -1]]))) - {0}
        sizes = ndimage.sum(cand, lb, range(1, nn + 1))
        for k in range(1, nn + 1):
            if k in border or sizes[k - 1] >= 120:
                bg |= lb == k
        # soften: anything enclosed by background that is near-white and tiny also goes
        fg = ~bg
        fg = ndimage.binary_opening(fg, iterations=1)
        lb2, n2 = ndimage.label(fg)
        if n2:
            s2 = ndimage.sum(fg, lb2, range(1, n2 + 1))
            keep = np.zeros(n2 + 1, bool); keep[1:] = s2 >= 60
            fg = keep[lb2]
        ys, xs = np.nonzero(fg)
        if not len(ys):
            continue
        by0, by1, bx0, bx1 = ys.min(), y1 - y0, xs.min(), xs.max() + 1   # keep the bottom edge: arms come up from it
        rgb = im[reg][by0:by1, bx0:bx1].copy(); a = fg[by0:by1, bx0:bx1].copy()
        r, g, bl = rgb[..., 0], rgb[..., 1], rgb[..., 2]; sat_ = rgb.max(2) - rgb.min(2); v_ = rgb.max(2)
        # glow painted over the checkerboard (muzzle flash, arcs, flame): smooth it and make it emissive
        glow = a & (v_ > 150) & (((r - bl) > 40) | ((bl - r) > 40))
        glow_zone = ndimage.binary_dilation(glow, iterations=4)
        halo = glow_zone & (sat_ < 30) & (v_ > 195)
        hl, hn = ndimage.label(halo)
        if hn:
            outside = ndimage.binary_dilation(~a, iterations=1)
            touch = np.unique(hl[outside & halo]); touch = touch[touch > 0]
            a &= ~np.isin(hl, touch)
        if glow.any():
            sm = np.stack([ndimage.uniform_filter(np.where(glow, rgb[..., c], 0).astype(float), 7) for c in range(3)], -1)
            wt = ndimage.uniform_filter(glow.astype(float), 7)[..., None]
            smooth = np.clip(sm / np.maximum(wt, 1e-3), 0, 255)
            soft = glow & (sat_ < 120)
            rgb[soft] = smooth[soft]
        lb3, n3 = ndimage.label(a)
        if n3:
            s3 = ndimage.sum(a, lb3, range(1, n3 + 1)); keep = np.zeros(n3 + 1, bool); keep[1:] = s3 >= 250; a = keep[lb3]
        # stray pieces that are mostly checkerboard white
        lb4, n4 = ndimage.label(a)
        for k in range(1, n4 + 1):
            m = lb4 == k
            if sat_[m].mean() < 40 and v_[m].mean() > 185: a &= ~m
        # glow: warm or cold paint over the old checkerboard. Recolour its pale
        # parts and thin its outer edge with a dither so it reads as light.
        gl = a & glow_zone & ~( (v_ < 150) )
        pale = gl & (sat_ < 80) & (v_ > 190)
        warm = (r.astype(int) - bl) >= 0
        rgb[pale & warm] = (255, 196, 120); rgb[pale & ~warm] = (170, 212, 255)
        solid = a & ~gl
        if solid.any():
            dist = ndimage.distance_transform_edt(~solid)
            yy, xx = np.indices(a.shape)
            far = gl & (dist > 5) & (((yy + xx) % 2) == 1)
            farther = gl & (dist > 14) & (((yy // 2 + xx // 2) % 2) == 1)
            a &= ~(far | farther)
        # defringe: pale pixels on the outer edge are checkerboard bleeding through
        for _ in range(4):
            edge = a & ndimage.binary_dilation(~a, iterations=1)
            a &= ~(edge & (sat_ < 50) & (v_ > 190))
        hot = (glow | gl | ((v_ > 215) & ((r - bl) > 70))) & a
        alpha = np.where(a, np.where(hot, 254, 255), 0).astype(np.uint8)
        idx = len(out)
        out.append(dict(name=NAMES[idx // 3], pose=POSE[idx % 3], img=np.dstack([rgb, alpha]).astype(np.uint8)))

# the item sheet (real alpha): components in reading order
it = np.array(Image.open(ITEMS).convert('RGBA'))
A = it[..., 3] > 40
lb, n = ndimage.label(ndimage.binary_closing(A, iterations=6))
objs = []
for k, sl in enumerate(ndimage.find_objects(lb)):
    ys, xs = sl
    if (ys.stop - ys.start) * (xs.stop - xs.start) < 2500:
        continue
    objs.append((ys, xs, k + 1))
objs.sort(key=lambda o: ((o[0].start + o[0].stop) // 2 > 340, o[1].start))
ITEM_NAMES = ['revolver', 'shotgun', 'flare', 'crossbow', 'rifle', 'crowbar', 'knife', 'angelblade', 'holywater', 'journal', 'ring', 'lantern', 'torch', 'fusee']
print('items found', len(objs))
items = []
for i, (ys, xs, k) in enumerate(objs[:len(ITEM_NAMES)]):
    m = (lb[ys, xs] == k)
    img = it[ys, xs].copy(); img[..., 3] = np.where(m, img[..., 3], 0)
    items.append(dict(name=ITEM_NAMES[i], img=img))

# pack: frames at full size, items at most 220 px wide
def shrink(a, maxw):
    h, w = a.shape[:2]
    if w <= maxw:
        return a
    s = maxw / w
    return np.array(Image.fromarray(a, 'RGBA').resize((maxw, max(1, int(h * s))), Image.LANCZOS))
# first-person frames for the two weapons the viewmodel sheet doesn't draw: made from the item art
byname = {i['name']: i['img'] for i in items}
def tight(a):
    ys, xs = np.nonzero(a[..., 3] > 20); return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
extra = []
rif = tight(byname['rifle']); rif = np.array(Image.fromarray(rif, 'RGBA').rotate(-8, expand=True, resample=Image.BICUBIC)); rif = tight(rif)
cb = tight(byname['crossbow']); cb = np.array(Image.fromarray(cb, 'RGBA').rotate(62, expand=True, resample=Image.BICUBIC)); cb = tight(cb)
for nm, img in (('rifle', rif), ('crossbow', cb)):
    h, w = img.shape[:2]; s = 230 / max(h, w)
    img = np.array(Image.fromarray(img, 'RGBA').resize((max(1, int(w * s)), max(1, int(h * s))), Image.LANCZOS))
    for pose in ('idle', 'attack', 'alt'):
        extra.append(dict(name=nm, pose=pose, img=img))
for itm in items:
    itm['img'] = shrink(itm['img'], 300)
allp = out + extra + items
AW = 2048; x = y = rowh = 0; meta = {'frames': {}, 'items': {}}
pos = []
for p in allp:
    h, w = p['img'].shape[:2]
    if x + w > AW:
        x = 0; y += rowh + 2; rowh = 0
    pos.append((x, y)); x += w + 2; rowh = max(rowh, h)
AH = y + rowh
atlas = np.zeros((AH, AW, 4), np.uint8)
for p, (px, py) in zip(allp, pos):
    h, w = p['img'].shape[:2]; atlas[py:py + h, px:px + w] = p['img']
    if 'pose' in p:
        meta['frames'].setdefault(p['name'], {})[p['pose']] = [px, py, w, h]
    else:
        meta['items'][p['name']] = [px, py, w, h]
Image.fromarray(atlas, 'RGBA').save(OUT + '/atlas.png', optimize=True)
Image.fromarray(atlas, 'RGBA').save(OUT + '/atlas.webp', quality=82, method=6, alpha_quality=90)
json.dump(meta, open(OUT + '/meta.json', 'w'))
prev = Image.new('RGBA', (AW, AH), (255, 0, 255, 255)); prev.alpha_composite(Image.fromarray(atlas, 'RGBA')); prev.convert('RGB').save(OUT + '/preview.png')
print('atlas', AW, AH, 'frames', len(out), 'items', len(items))
