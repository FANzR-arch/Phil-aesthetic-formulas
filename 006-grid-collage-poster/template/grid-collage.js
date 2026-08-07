/*!
 * grid-collage.js —— 模块网格拼贴海报引擎
 * 一句话被拆成若干文字块沿之字形下行，图块吸附到同一套网格上填补空隙。
 * 零依赖，单文件。MIT。
 */
(function (global) {
'use strict';

var DEFAULTS = {
  /* ---- 画幅 ---- */
  width: 1080,          // 导出宽（px）
  height: 1350,         // 导出高（px）
  cols: 14,             // 网格列数；行数由「格子必须是正方形」推出
  margin: 1.2,          // 网格四周留白（单位：格）

  /* ---- 颜色 ---- */
  paper: '#e8e5db',
  ink: '#111111',
  gridAlpha: 0.16,      // 网格线相对墨色的不透明度
  gridWidth: 1,         // 网格线宽（按 1080 宽等比缩放）

  /* ---- 文字 ---- */
  // 空行分块，块内换行即换行。每块是阅读路径上的一站。
  text: 'EVERYTHING\nYOU CALL\nTASTE\n\nIS A GRID\nPLUS A LIST\nOF THINGS\n\nSOMEONE\nDECIDED\nTO LEAVE\nOUT',
  fontFamily: '"Helvetica Neue", Helvetica, Arial, "Segoe UI", sans-serif',
  fontWeight: 700,
  // 字号 = 格子边长 × 此值。0.76 让最宽的一行占网格宽度约 34%（参考图约 32%），
  // 再大就会把图块挤到没地方放 —— 这两个值是连动的，别只调一个。
  fontSize: 0.76,
  lineHeight: 1.05,     // 行距倍数（这类海报要压到 1.0 附近）
  tracking: -0.015,     // 字距，相对字号
  uppercase: true,
  centerFirst: true,    // 第一块居中，其余左对齐
  textPad: 1,           // 文字四周的保护带（格）——图块不许进来
  textPanel: true,      // 文字块用纸色底板盖掉身下的网格线

  footer: 'X.COM/FORMULASEARCH',
  footerSize: 0.26,

  /* ---- 图块 ---- */
  tiles: 12,            // 图块总数
  logoRatio: 0.28,      // 其中 1×1 小方块（logo 格）的比例
  bleed: 1,             // 允许几块探出网格边缘一格
  tileGutter: 1,        // 图块之间至少空几格——原图里没有任何两块是贴边的
  // 允许的跨格尺寸，全部是整格
  sizePool: [[2,3],[3,2],[2,2],[3,4],[4,3],[3,3],[2,4],[4,2],[4,4]],
  // 未放图片时的占位色
  palette: ['#b8492a','#2f6fae','#7d8a8f','#3a2b23','#c98a2e','#5d6b4a','#cdbfa2','#101820'],

  seed: 7,
};

var GLYPHS = ['circle','ring','square','triangle','cross','bar'];
var OB = 3;             // 占位表的越界余量

/* ---------- 工具 ---------- */

function mulberry32(a){
  return function(){
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function clamp(v, a, b){ return v < a ? a : v > b ? b : v; }

function hexToRgba(hex, alpha){
  var h = String(hex).replace('#','');
  if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  var n = parseInt(h, 16);
  return 'rgba(' + (n>>16 & 255) + ',' + (n>>8 & 255) + ',' + (n & 255) + ',' + alpha + ')';
}

/** 感知亮度 0～1，用来在深色主题下反转 logo 卡片 */
function lum(hex){
  var h = String(hex).replace('#','');
  if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  var n = parseInt(h, 16) || 0;
  return (0.2126 * (n>>16 & 255) + 0.7152 * (n>>8 & 255) + 0.0722 * (n & 255)) / 255;
}

function toImage(src){
  return new Promise(function(resolve, reject){
    if (!src) return reject(new Error('grid-collage: 空图片源'));
    if (typeof HTMLImageElement !== 'undefined' && src instanceof HTMLImageElement){
      if (src.complete && src.naturalWidth) return resolve(src);
      src.addEventListener('load', function(){ resolve(src); }, { once: true });
      src.addEventListener('error', reject, { once: true });
      return;
    }
    if (typeof HTMLCanvasElement !== 'undefined' && src instanceof HTMLCanvasElement) return resolve(src);
    if (typeof Blob !== 'undefined' && src instanceof Blob){
      // 走 FileReader 转 data URI：blob: 链接在部分浏览器导出时会污染画布
      var fr = new FileReader();
      fr.onload = function(){ toImage(fr.result).then(resolve, reject); };
      fr.onerror = reject;
      fr.readAsDataURL(src);
      return;
    }
    var im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = function(){ resolve(im); };
    im.onerror = function(){ reject(new Error('grid-collage: 图片加载失败')); };
    im.src = src;
  });
}

function drawCover(ctx, img, x, y, w, h){
  var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  var s = Math.max(w / iw, h / ih), dw = iw * s, dh = ih * s;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}

/* ---------- 主体 ---------- */

function GridCollage(canvas, options){
  if (!canvas) throw new Error('grid-collage: 需要一个 canvas');
  this.canvas = canvas;
  this.ctx = canvas.getContext('2d');
  this.options = Object.assign({}, DEFAULTS, options || {});
  this.images = [];          // 下标 = 照片图块序号
  this._build();
}

var proto = GridCollage.prototype;

proto.setOptions = function(patch){
  Object.assign(this.options, patch || {});
  this._build();
  return this;
};

proto.reseed = function(seed){
  this.options.seed = (seed == null) ? (Math.random() * 1e9) | 0 : seed;
  this._build();
  return this;
};

/** 按顺序填入照片图块；list 元素可以是 URL / File / Blob / <img> / <canvas> */
proto.setImages = function(list, from){
  var self = this, start = from || 0;
  return Promise.all([].map.call(list || [], function(src, i){
    return self.setImageAt(start + i, src).catch(function(){});
  }));
};

proto.setImageAt = function(index, src){
  var self = this;
  return toImage(src).then(function(img){
    self.images[index] = img;
    self._paint();
    return img;
  });
};

proto.clearImages = function(){ this.images = []; this._paint(); return this; };

/**
 * 这一版实际放下了多少块。`tiles` 是上限不是保证：文字占满或画幅太扁时
 * 会有图块放不下。界面要照实显示，不然用户拖 12 张图进来只有 6 张生效。
 */
proto.stats = function(){
  var L = this._L;
  return {
    requested: Math.max(0, this.options.tiles | 0),
    placed: L ? L.tiles.length : 0,
    photos: L ? L.photoCount : 0,     // 能接图片的格子数 = setImages 的有效长度
  };
};

/**
 * 任何「占 col,row 起 cw×ch 格」的东西 → 像素矩形。文字底板和图块共用同一套坐标。
 *
 * inset=true 返回「两条网格线之间」的可涂区域：左上各让开一个线宽。
 * 线宽 lw 的竖线画在 [gridX(i), gridX(i)+lw)，所以矩形从 x0 铺到 x1 时，
 * 左边那条线会被盖掉、右边那条不会 —— 不让开的话四条边就有两种深浅。
 * 探出网格的那几条边本来就没有线，不让开。
 */
proto._rect = function(box, inset){
  var L = this._L;
  var x0 = L.gridX(box.col), x1 = L.gridX(box.col + box.cw);
  var y0 = L.gridY(box.row), y1 = L.gridY(box.row + box.ch);
  if (!inset) return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  var l = (box.col >= 0 && box.col <= L.cols) ? L.lw : 0;
  var t = (box.row >= 0 && box.row <= L.rows) ? L.lw : 0;
  return { x: x0 + l, y: y0 + t, w: x1 - x0 - l, h: y1 - y0 - t };
};

/** 画布坐标 → 照片图块序号；不在任何照片图块上返回 -1 */
proto.photoAt = function(x, y){
  var L = this._L; if (!L) return -1;
  for (var i = 0; i < L.tiles.length; i++){
    if (L.tiles[i].slot < 0) continue;
    var r = this._rect(L.tiles[i]);
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return L.tiles[i].slot;
  }
  return -1;
};

proto.toDataURL = function(type, quality){ return this.canvas.toDataURL(type || 'image/png', quality); };

proto.destroy = function(){ this._L = null; this.images = []; };

/* ---------- 布局 ---------- */

proto._build = function(){
  var o = this.options, ctx = this.ctx;
  var rnd = mulberry32(o.seed | 0);

  this.canvas.width = o.width;
  this.canvas.height = o.height;

  // 格子必须是正方形，所以先由列数定边长，再由高度反推行数。
  // 列数要先夹紧再拿去算边长：两处用不同的 cols，网格会宽到画布外面去。
  var cols = Math.max(4, o.cols | 0);
  var margin = Math.max(0, o.margin) || 0;
  var cell = o.width / (cols + 2 * margin);
  var rows = Math.max(4, Math.floor((o.height - 2 * margin * cell) / cell));
  var gx = (o.width - cols * cell) / 2;
  var gy = (o.height - rows * cell) / 2;

  // 全画面唯一的坐标来源：网格线、文字底板、图块一律从这两个函数取位置。
  // 谁要是自己拿 gx + i * cell 算浮点数，就会和网格线错开半个到一个像素。
  function gridX(i){ return Math.round(gx + i * cell); }
  function gridY(j){ return Math.round(gy + j * cell); }

  /* --- 文字：先量后排 --- */
  var raw = String(o.text).split(/\n\s*\n+/);
  var blocks = [];
  for (var b = 0; b < raw.length; b++){
    var lines = raw[b].split('\n').map(function(s){ return s.trim(); }).filter(Boolean);
    if (o.uppercase) lines = lines.map(function(s){ return s.toUpperCase(); });
    if (lines.length) blocks.push({ lines: lines });
  }

  var fontPx = cell * o.fontSize;
  var setFont = function(px){
    ctx.font = o.fontWeight + ' ' + px + 'px ' + o.fontFamily;
    if ('letterSpacing' in ctx) ctx.letterSpacing = (o.tracking * px).toFixed(2) + 'px';
  };

  // 统一字号：先按基准量一遍，超出网格宽度就整体缩，保证所有块字号一致
  setFont(fontPx);
  var widest = 0, i, j;
  for (i = 0; i < blocks.length; i++)
    for (j = 0; j < blocks[i].lines.length; j++)
      widest = Math.max(widest, ctx.measureText(blocks[i].lines[j]).width);
  if (widest > cols * cell * 0.96){
    fontPx *= (cols * cell * 0.96) / widest;
    setFont(fontPx);
  }

  var lineAdv, capOff;
  function measureBlocks(){
    setFont(fontPx);
    lineAdv = fontPx * o.lineHeight;
    capOff = fontPx * 0.74;                 // 基线到大写字母顶端
    var need = 0;
    for (var a = 0; a < blocks.length; a++){
      var bl = blocks[a], mw = 0;
      for (var b2 = 0; b2 < bl.lines.length; b2++)
        mw = Math.max(mw, ctx.measureText(bl.lines[b2]).width);
      bl.textW = mw;
      // 底板要能完整装下墨迹：上到大写字母顶端，下到字母下伸部
      bl.textH = (bl.lines.length - 1) * lineAdv + capOff + fontPx * (o.uppercase ? 0.10 : 0.21);
      // 各留半格余量，免得字正好顶在底板边上、和网格线咬在一起
      bl.cw = Math.min(cols, Math.ceil((bl.textW + cell * 0.5) / cell));
      bl.ch = Math.ceil((bl.textH + cell * 0.5) / cell);
      need += bl.ch;
    }
    return need;
  }
  var needRows = measureBlocks();

  /* --- 占位表：文字、落款、图块都往这里登记，各自带自己的保护带 --- */
  var W = cols + 2 * OB, H = rows + 2 * OB;
  var busy = new Uint8Array(W * H);
  function id(c, r){ return (r + OB) * W + (c + OB); }
  function mark(c, r, w, h){
    for (var y = r; y < r + h; y++){
      if (y < -OB || y >= rows + OB) continue;
      for (var x = c; x < c + w; x++){
        if (x < -OB || x >= cols + OB) continue;
        busy[id(x, y)] = 1;
      }
    }
  }
  function isFree(c, r, w, h){
    for (var y = r; y < r + h; y++){
      if (y < -OB || y >= rows + OB) return false;
      for (var x = c; x < c + w; x++){
        if (x < -OB || x >= cols + OB) return false;
        if (busy[id(x, y)]) return false;
      }
    }
    return true;
  }

  /* --- 落款：先占位，否则最后一块文字会压在上面 --- */
  var footer = null;
  if (o.footer){
    var fpx = cell * o.footerSize;
    ctx.font = '400 ' + fpx + 'px ui-monospace, Consolas, monospace';
    if ('letterSpacing' in ctx) ctx.letterSpacing = (fpx * 0.12).toFixed(2) + 'px';
    var fw = ctx.measureText(o.footer).width;
    // 位置同样只从 gridX/gridY 取，不自己算浮点
    footer = { px: fpx, x: gridX(0) + cell * 0.18, y: gridY(rows) - cell * 0.35 };
    var fc = Math.ceil((fw + cell * 0.18) / cell) + 1;   // 右侧留一格，别让图块贴上来
    mark(0, rows - 1, fc, 1);
  }

  /* --- 文字块之字形下行 ---
     纵向：按顺序往下摞，空隙随机分配——16:9 这种扁画幅靠分带会直接把三块叠在一起。
     横向：左 / 偏右交替。阅读顺序本身就是构图，所以这里是规则不是随机。 */
  var textRows = footer ? rows - 1 : rows;      // 最后一行留给落款

  // 竖着放不下就把字号收到放得下为止
  for (var guard = 0; needRows > textRows && fontPx > cell * 0.22 && guard < 60; guard++){
    fontPx *= 0.93;
    needRows = measureBlocks();
  }

  // 剩余行数当作 n+1 段空隙分掉，保证块与块之间永远不重叠。
  // 块间的空隙权重高于上下两端：全随机会让两块贴在一起、另一头空一大片。
  var slack = Math.max(0, textRows - needRows);
  var wsum = 0, weights = [];
  for (i = 0; i <= blocks.length; i++){
    var atEdge = (i === 0 || i === blocks.length);
    weights.push(atEdge ? 0.25 + rnd() * 0.45 : 0.80 + rnd() * 0.50);
    wsum += weights[i];
  }
  var cursor = 0;
  for (i = 0; i < blocks.length; i++){
    var bk = blocks[i];
    cursor += Math.floor(slack * weights[i] / wsum);

    var base = (i % 2 === 0) ? 0.06 : 0.52;
    var col = Math.round(clamp(base + rnd() * 0.16, 0, 1) * Math.max(0, cols - bk.cw));

    bk.col = col; bk.row = clamp(cursor, 0, Math.max(0, textRows - bk.ch));
    cursor = bk.row + bk.ch;
    mark(col - o.textPad, bk.row - o.textPad, bk.cw + o.textPad * 2, bk.ch + o.textPad * 2);
  }

  /* --- 图块散布 ---
     两条硬规则：图块之间至少空 gutter 格（原图里没有任何两块贴边），
     以及彼此中心不得比 dmin 更近——纯随机会把它们叠成一整条。
     采样用「最远候选点」（Mitchell best-candidate），放不下就放宽 dmin、再不行就降尺寸。 */
  var tiles = [];
  var total = Math.max(0, o.tiles | 0);
  var nLogo = Math.round(total * clamp(o.logoRatio, 0, 1));
  var gut = Math.max(0, o.tileGutter | 0);
  var order = [];
  for (i = 0; i < total; i++) order.push(i < total - nLogo ? 'photo' : 'logo');
  // 洗牌，让 logo 格穿插在照片之间而不是全挤在最后
  for (i = order.length - 1; i > 0; i--){
    j = (rnd() * (i + 1)) | 0;
    var tmp = order[i]; order[i] = order[j]; order[j] = tmp;
  }

  // 占位色和标记都按洗过的顺序轮着取，纯随机会连出三块同色
  var bag = o.palette.slice(), glyphBag = GLYPHS.slice();
  function shuffle(a){
    for (var x = a.length - 1; x > 0; x--){
      var y = (rnd() * (x + 1)) | 0, s = a[x]; a[x] = a[y]; a[y] = s;
    }
    return a;
  }
  shuffle(bag); shuffle(glyphBag);

  // 返回平方距离：只用来比大小，省掉每次采样的开方
  function nearest2(cx, cy){
    var near = Infinity;
    for (var q = 0; q < tiles.length; q++){
      var dx = cx - tiles[q].cx, dy = cy - tiles[q].cy, d = dx * dx + dy * dy;
      if (d < near) near = d;
    }
    return near;
  }

  function tryPlace(tw, th, dmin, onEdge){
    var best = null, bestScore = -1, c, r, near;

    // dmin < 0 是最后的兜底：随机采样会漏掉稀疏的空位，直接全盘扫一遍，
    // 有位置就一定放得下。少的那几块图对用户是实打实的缺失，值得这点开销。
    if (dmin < 0 && !onEdge){
      for (r = 0; r <= rows - th; r++){
        for (c = 0; c <= cols - tw; c++){
          if (!isFree(c, r, tw, th)) continue;
          near = nearest2(c + tw / 2, r + th / 2);
          if (near > bestScore){ bestScore = near; best = { c: c, r: r, w: tw, h: th }; }
        }
      }
      return best;
    }

    var lim = dmin > 0 ? dmin * dmin : 0;
    for (var t = 0, got = 0; t < 160 && got < 24; t++){
      if (onEdge){
        var edge = (rnd() * 4) | 0;
        if (edge === 0){ r = -1; c = (rnd() * (cols - tw + 1)) | 0; }
        else if (edge === 1){ r = rows - th + 1; c = (rnd() * (cols - tw + 1)) | 0; }
        else if (edge === 2){ c = -1; r = (rnd() * (rows - th + 1)) | 0; }
        else { c = cols - tw + 1; r = (rnd() * (rows - th + 1)) | 0; }
      } else {
        c = (rnd() * (cols - tw + 1)) | 0;
        r = (rnd() * (rows - th + 1)) | 0;
      }
      if (!isFree(c, r, tw, th)) continue;
      near = nearest2(c + tw / 2, r + th / 2);
      if (near < lim) continue;
      got++;
      if (near > bestScore){ bestScore = near; best = { c: c, r: r, w: tw, h: th }; }
    }
    return best;
  }

  // 期望的最近邻间距：格子总数摊到每块上，再取根号
  var dmin0 = total ? Math.max(2.4, Math.sqrt(cols * rows / total) * 0.85) : 0;
  var bleedLeft = Math.max(0, o.bleed | 0);
  var slot = 0;

  for (var k = 0; k < order.length; k++){
    var isLogo = order[k] === 'logo';
    // 照片最小 2×2：降到 1×1 就和 logo 格混为一谈了，宁可这一块不放
    var pool = isLogo ? [[1, 1]]
                      : [o.sizePool[(rnd() * o.sizePool.length) | 0], [2, 2]];
    var wantBleed = !isLogo && bleedLeft > 0 && rnd() < 0.55;

    var best = null, used = false;
    for (var si = 0; si < pool.length && !best; si++){
      for (var dm = dmin0; ; dm = dm > 0.5 ? dm * 0.6 : -1){
        if (wantBleed && si === 0){
          best = tryPlace(pool[si][0], pool[si][1], dm, true);
          if (best){ used = true; break; }
        }
        best = tryPlace(pool[si][0], pool[si][1], dm, false);
        if (best || dm < 0) break;
      }
    }
    if (!best) continue;
    if (used) bleedLeft--;

    // 图块四周留出 gutter 格：不让两块连成一片
    mark(best.c - gut, best.r - gut, best.w + gut * 2, best.h + gut * 2);
    tiles.push({
      col: best.c, row: best.r, cw: best.w, ch: best.h,
      cx: best.c + best.w / 2, cy: best.r + best.h / 2,
      slot: isLogo ? -1 : slot++,
      color: bag[tiles.length % bag.length],
      glyph: glyphBag[tiles.length % glyphBag.length],
    });
  }

  this._L = {
    cell: cell, cols: cols, rows: rows, gx: gx, gy: gy, gridX: gridX, gridY: gridY,
    lw: Math.max(1, Math.round(o.gridWidth * (o.width / 1080))),
    blocks: blocks, fontPx: fontPx, lineAdv: lineAdv, capOff: capOff,
    footer: footer, tiles: tiles, photoCount: slot,
  };
  this._paint();
  return this;
};

/* ---------- 绘制 ---------- */

proto._paint = function(){
  var o = this.options, ctx = this.ctx, L = this._L;
  if (!L) return;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, o.width, o.height);
  ctx.fillStyle = o.paper;
  ctx.fillRect(0, 0, o.width, o.height);

  /* 网格：整张画一次，是画面里唯一的一次描线。
     文字底板和图块的「边框」不再另外描 —— 它们本来就是这些网格线，
     只要填充精确落在两条线之间，边框就天然和网格同粗同深。
     另外描一遍的话，没被填充盖掉的那两条边会叠成两倍深，四条边深浅不一。 */
  if (o.gridAlpha > 0){
    var off = (L.lw % 2 ? 0.5 : 0);   // 奇数线宽偏半像素，否则 1px 会糊成 2px 的灰带
    var gL = L.gridX(0), gR = L.gridX(L.cols), gT = L.gridY(0), gB = L.gridY(L.rows);
    ctx.strokeStyle = hexToRgba(o.ink, o.gridAlpha);
    ctx.lineWidth = L.lw;
    ctx.beginPath();
    for (var i = 0; i <= L.cols; i++){
      ctx.moveTo(L.gridX(i) + off, gT); ctx.lineTo(L.gridX(i) + off, gB);
    }
    for (var j = 0; j <= L.rows; j++){
      ctx.moveTo(gL, L.gridY(j) + off); ctx.lineTo(gR, L.gridY(j) + off);
    }
    ctx.stroke();
  }

  // 文字底板：盖掉内部的网格线，四周那一圈原样留着当边框
  if (o.textPanel){
    ctx.fillStyle = o.paper;
    for (var p = 0; p < L.blocks.length; p++){
      var pr = this._rect(L.blocks[p], true);
      ctx.fillRect(pr.x, pr.y, pr.w, pr.h);
    }
  }

  // 图块：同样让开一圈，图片贴着网格线而不是压在上面
  for (var t = 0; t < L.tiles.length; t++){
    var ti = L.tiles[t], tr = this._rect(ti, true);
    var img = ti.slot >= 0 ? this.images[ti.slot] : null;
    if (img){ drawCover(ctx, img, tr.x, tr.y, tr.w, tr.h); continue; }
    if (ti.slot < 0){ this._logo(ti, tr); continue; }
    ctx.fillStyle = ti.color;
    ctx.fillRect(tr.x, tr.y, tr.w, tr.h);
  }

  // 文字
  ctx.fillStyle = o.ink;
  ctx.textBaseline = 'alphabetic';
  ctx.font = o.fontWeight + ' ' + L.fontPx + 'px ' + o.fontFamily;
  if ('letterSpacing' in ctx) ctx.letterSpacing = (o.tracking * L.fontPx).toFixed(2) + 'px';

  for (var b = 0; b < L.blocks.length; b++){
    var bk = L.blocks[b], bkr = this._rect(bk, true);
    // 文字在自己这块整格底板里居中，不贴顶——贴顶会让最后一行离底边远得很怪
    var left = bkr.x + (bkr.w - bk.textW) / 2;
    var top = bkr.y + (bkr.h - bk.textH) / 2;
    var center = o.centerFirst && b === 0;
    for (var k = 0; k < bk.lines.length; k++){
      var line = bk.lines[k];
      var lx = left;
      if (center) lx = left + (bk.textW - ctx.measureText(line).width) / 2;
      ctx.fillText(line, lx, top + L.capOff + k * L.lineAdv);
    }
  }

  // 落款
  if (L.footer){
    ctx.fillStyle = o.ink;
    ctx.font = '400 ' + L.footer.px + 'px ui-monospace, Consolas, monospace';
    if ('letterSpacing' in ctx) ctx.letterSpacing = (L.footer.px * 0.12).toFixed(2) + 'px';
    ctx.fillText(o.footer, L.footer.x, L.footer.y);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }
};

/** logo 格：白底 + 一个几何标记，占位到你换成真的品牌图为止 */
proto._logo = function(ti, r0){
  var ctx = this.ctx, o = this.options;
  // 墨色本身是浅色时（深色纸的配色）白卡上的标记会看不见，整张卡反过来
  ctx.fillStyle = lum(o.ink) > 0.5 ? '#111111' : '#ffffff';
  ctx.fillRect(r0.x, r0.y, r0.w, r0.h);

  var cx = r0.x + r0.w / 2, cy = r0.y + r0.h / 2, r = r0.w * 0.22;
  ctx.fillStyle = o.ink; ctx.strokeStyle = o.ink;
  ctx.lineWidth = Math.max(1, r0.w * 0.07);
  ctx.beginPath();
  switch (ti.glyph){
    case 'circle': ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); break;
    case 'ring':   ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); break;
    case 'square': ctx.fillRect(cx - r, cy - r, r * 2, r * 2); break;
    case 'triangle':
      ctx.moveTo(cx, cy - r * 1.15); ctx.lineTo(cx + r, cy + r * 0.8);
      ctx.lineTo(cx - r, cy + r * 0.8); ctx.closePath(); ctx.fill(); break;
    case 'cross':
      ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy);
      ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r); ctx.stroke(); break;
    default:
      ctx.fillRect(cx - r * 1.1, cy - r * 0.28, r * 2.2, r * 0.56); break;
  }
};

/* ---------- 导出 ---------- */

GridCollage.DEFAULTS = DEFAULTS;
GridCollage.create = function(canvas, options){ return new GridCollage(canvas, options); };

if (typeof module !== 'undefined' && module.exports) module.exports = GridCollage;
else global.GridCollage = GridCollage;

})(typeof window !== 'undefined' ? window : this);
