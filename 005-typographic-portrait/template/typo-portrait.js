/*!
 * typo-portrait.js — 文字肖像生成器
 * 审美分享-05 · https://github.com/FANzR-arch/Phil-aesthetic-formulas
 *
 * 零依赖，纯 canvas。拿去直接用：
 *   const p = TypoPortrait.create(canvas, { words: ['Prompt'], motion: 'glitch' });
 *   await p.setImage('photo.jpg');
 *   p.play();
 *
 * MIT License
 */
(function (global) {
  'use strict';

  var DEFAULTS = {
    words: ['Formulasearch', 'Prompt', 'Design', 'Phil'],  // 原样输出，不改大小写
    density: 0.58,          // 0..1  网格密度
    cling: 0.74,            // 0..1  越高文字越只贴主体与轮廓，背景越干净
    invert: false,          // 背景判断偶尔会反（构图特殊时），勾上即可换到另一侧
    size: 15,               // 基础字号（以 1400px 宽为基准）
    defocus: 0.35,          // 0..1  失焦文字比例，让文字与人物共享景深
    blur: 52,               // 动态模糊位移长度
    angle: 90,              // 模糊方向（度）
    falloff: 0,             // 0 = 相机快门（盒式，PS 同款）；1 = 三角衰减，两端渐隐
    contrast: 1.4,
    color: false,           // false = 黑白
    tint: 0.7,              // 0..1  文字从照片取色的强度
    sat: 1,                 // 照片饱和度（仅彩色模式）
    seed: 7,
    motion: 'none',         // none | glitch（文字随机闪烁）
    intensity: 0.5,         // 0..1  有多少字参与闪烁（满值约四分之一的字）
    speed: 1,               // 闪烁频率倍数，1 ≈ 每秒重掷 7 次
    background: null,       // null = 自动（近白）
    maxWidth: 1400,
    font: '"Helvetica Neue", Arial, "Microsoft YaHei", sans-serif'
  };

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function clamp255(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }

  /* 整数 → [0,1) 的散列。逐帧逐字调用，必须免分配 */
  function hash01(n) {
    n = (n ^ 61) ^ (n >>> 16);
    n = n + (n << 3) | 0;
    n = n ^ (n >>> 4);
    n = Math.imul(n, 0x27d4eb2d);
    n = n ^ (n >>> 15);
    return (n >>> 0) / 4294967296;
  }

  function newCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  /* ---------------------------------------------------------------
     动态模糊：沿直线方向的一维盒式滤波，与 Photoshop 的 Motion Blur 同族。

     照抄相机的物理行为 —— 快门开启期间感光元件对场景做的是「均匀积分」，
     所以核函数是等权重的盒，而不是高斯。三个必须做对的地方：

     1. 线性光空间。照片以 sRGB 伽马编码存储，直接平均像素值物理上是错的，
        结果偏暗发闷（深色主体 + 浅背景时尤其明显）。必须先解码到线性光、
        在线性光里平均、再编码回去。这一步对画面的改善比其它任何调参都大。
     2. 滑动求和。窗口右移时加一个进入的像素、减一个离开的像素，
        每像素 O(1)，模糊长度再大也不变慢，且不会出现离散重影。
     3. 边缘复制。先把四边像素向外延展再模糊，位移不会在画幅边缘吃出空白。

     任意角度的做法是把图旋到「模糊方向 = 水平」，按行做，再转回来。
     0°/90°/180°/270° 时旋转是无损的，也就是最常用的几档没有任何重采样损失。
     --------------------------------------------------------------- */

  var SRGB2LIN = new Float32Array(256);
  for (var _i = 0; _i < 256; _i++) {
    var _v = _i / 255;
    SRGB2LIN[_i] = _v <= 0.04045 ? _v / 12.92 : Math.pow((_v + 0.055) / 1.055, 2.4);
  }
  var LIN2SRGB = new Uint8Array(4096);
  for (var _j = 0; _j < 4096; _j++) {
    var _l = _j / 4095;
    var _s = _l <= 0.0031308 ? _l * 12.92 : 1.055 * Math.pow(_l, 1 / 2.4) - 0.055;
    LIN2SRGB[_j] = Math.round(Math.max(0, Math.min(1, _s)) * 255);
  }

  /* 一行的盒式模糊，滑动求和。radius 支持小数，拖动滑杆时不会跳档 */
  function boxRow(src, dst, n, radius) {
    if (radius < 0.5) { for (var q = 0; q < n * 3; q++) dst[q] = src[q]; return; }
    var r = Math.floor(radius);
    var frac = radius - r;
    var norm = 1 / (2 * r + 1 + 2 * frac);
    var last = n - 1;

    for (var ch = 0; ch < 3; ch++) {
      var S = 0, i, k;
      for (i = -r; i <= r; i++) {
        k = i < 0 ? 0 : i > last ? last : i;
        S += src[k * 3 + ch];
      }
      for (var x = 0; x < n; x++) {
        var lo = x - r - 1; lo = lo < 0 ? 0 : lo;
        var hi = x + r + 1; hi = hi > last ? last : hi;
        dst[x * 3 + ch] = (S + frac * (src[lo * 3 + ch] + src[hi * 3 + ch])) * norm;

        var out = x - r; out = out < 0 ? 0 : out;          // 离开窗口的像素
        S += src[hi * 3 + ch] - src[out * 3 + ch];         // hi 即 x+1+r，进入窗口的像素
      }
    }
  }

  function blurRows(data, n, rows, len, falloff) {
    var lin = new Float32Array(n * 3);
    var a = new Float32Array(n * 3);
    var b = new Float32Array(n * 3);
    var c = new Float32Array(n * 3);

    var boxR = (len - 1) / 2;
    // 两次半长盒卷积 = 三角核，总宽度不变，两端自然渐隐
    var halfR = Math.max(0, (len / 2 - 1) / 2);
    var soft = falloff > 0.001;

    for (var y = 0; y < rows; y++) {
      var off = y * n * 4, i, p;

      for (i = 0; i < n; i++) {
        p = off + i * 4;
        lin[i * 3]     = SRGB2LIN[data[p]];
        lin[i * 3 + 1] = SRGB2LIN[data[p + 1]];
        lin[i * 3 + 2] = SRGB2LIN[data[p + 2]];
      }

      boxRow(lin, a, n, boxR);
      if (soft) {
        boxRow(lin, b, n, halfR);
        boxRow(b, c, n, halfR);
        for (i = 0; i < n * 3; i++) a[i] += (c[i] - a[i]) * falloff;
      }

      for (i = 0; i < n; i++) {
        p = off + i * 4;
        var v0 = a[i * 3], v1 = a[i * 3 + 1], v2 = a[i * 3 + 2];
        data[p]     = LIN2SRGB[v0 <= 0 ? 0 : v0 >= 1 ? 4095 : (v0 * 4095) | 0];
        data[p + 1] = LIN2SRGB[v1 <= 0 ? 0 : v1 >= 1 ? 4095 : (v1 * 4095) | 0];
        data[p + 2] = LIN2SRGB[v2 <= 0 ? 0 : v2 >= 1 ? 4095 : (v2 * 4095) | 0];
      }
    }
  }

  /* 四边像素向外延展，模糊时边缘不会吃进空白 */
  function edgePad(src, W, H, pad) {
    var c = newCanvas(W + pad * 2, H + pad * 2);
    var x = c.getContext('2d');
    x.drawImage(src, pad, pad);
    x.drawImage(src, 0, 0, 1, H, 0, pad, pad, H);
    x.drawImage(src, W - 1, 0, 1, H, pad + W, pad, pad, H);
    x.drawImage(src, 0, 0, W, 1, pad, 0, W, pad);
    x.drawImage(src, 0, H - 1, W, 1, pad, pad + H, W, pad);
    x.drawImage(src, 0, 0, 1, 1, 0, 0, pad, pad);
    x.drawImage(src, W - 1, 0, 1, 1, pad + W, 0, pad, pad);
    x.drawImage(src, 0, H - 1, 1, 1, 0, pad + H, pad, pad);
    x.drawImage(src, W - 1, H - 1, 1, 1, pad + W, pad + H, pad, pad);
    return c;
  }

  function rotateInto(src, sw, sh, rad, DW, DH) {
    var c = newCanvas(DW, DH);
    var x = c.getContext('2d');
    x.translate(DW / 2, DH / 2);
    x.rotate(rad);
    x.drawImage(src, -sw / 2, -sh / 2, sw, sh);
    return c;
  }

  function motionBlur(src, W, H, len, angleDeg, falloff) {
    if (len < 1) return src;

    var pad = Math.ceil(len / 2) + 2;
    var PW = W + pad * 2, PH = H + pad * 2;
    var padded = edgePad(src, W, H, pad);

    var rad = -angleDeg * Math.PI / 180;          // 转到「模糊方向 = 水平」
    var ca = Math.abs(Math.cos(rad)), sa = Math.abs(Math.sin(rad));
    var RW = Math.ceil(PW * ca + PH * sa);
    var RH = Math.ceil(PW * sa + PH * ca);

    var rot = rotateInto(padded, PW, PH, rad, RW, RH);

    /*
      只沿模糊轴降采样再算。盒式模糊会把该方向上高于 1/len 的频率全部抹掉，
      所以按 len/8 的间距取样完全够用，而垂直于模糊方向的细节一点没动。
      长模糊因此快 3～5 倍，画面看不出差别。
    */
    var q = Math.max(0.18, Math.min(1, 8 / len));
    var BW = q < 1 ? Math.max(4, Math.round(RW * q)) : RW;
    var work = rot;
    if (q < 1) {
      work = newCanvas(BW, RH);
      work.getContext('2d').drawImage(rot, 0, 0, RW, RH, 0, 0, BW, RH);
    }

    var wx = work.getContext('2d', { willReadFrequently: true });
    var id = wx.getImageData(0, 0, BW, RH);
    blurRows(id.data, BW, RH, len * (BW / RW), falloff);
    wx.putImageData(id, 0, 0);

    var full = work;
    if (q < 1) {
      full = newCanvas(RW, RH);
      full.getContext('2d').drawImage(work, 0, 0, BW, RH, 0, 0, RW, RH);
    }

    var back = rotateInto(full, RW, RH, -rad, PW, PH);
    var outC = newCanvas(W, H);
    outC.getContext('2d').drawImage(back, pad, pad, W, H, 0, 0, W, H);
    return outC;
  }

  /* 低分辨率采样图：文字靠它判断该放多密、多大、什么颜色 */
  function sampler(src, W, H) {
    var f = 6;
    var sw = Math.max(2, Math.ceil(W / f));
    var sh = Math.max(2, Math.ceil(H / f));
    var c = newCanvas(sw, sh);
    var x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(src, 0, 0, sw, sh);
    var d = x.getImageData(0, 0, sw, sh).data;

    function idx(px, py) {
      var ix = Math.min(sw - 1, Math.max(0, Math.round(px / f)));
      var iy = Math.min(sh - 1, Math.max(0, Math.round(py / f)));
      return (iy * sw + ix) * 4;
    }
    function rgb(px, py) { var i = idx(px, py); return [d[i], d[i + 1], d[i + 2]]; }
    function lum(px, py) {
      var i = idx(px, py);
      return (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
    }
    function grad(px, py) {
      var s = f * 2.5;
      return Math.abs(lum(px + s, py) - lum(px - s, py)) +
             Math.abs(lum(px, py + s) - lum(px, py - s));
    }

    /*
      背景亮度 = 画面外围一圈的中位亮度。

      有了它才能区分「亮底暗主体」和「暗底亮主体」——
      文字该聚的是偏离背景的地方，不是一味往暗处聚。

      别用全图直方图的众数：那假设背景占地最大，但一件纯黑西装会把
      亮度全堆进同一个桶，而带渐变的背景会摊到好几个桶，众数于是选中主体，
      整个判断反过来。人像照片的四边几乎总是背景，这个假设稳得多，
      也不在乎主体平不平。
    */
    var m = Math.max(1, Math.round(Math.min(sw, sh) * 0.08));
    var edge = [];
    for (var ey = 0; ey < sh; ey++) {
      var onTopBottom = ey < m || ey >= sh - m;
      for (var ex = 0; ex < sw; ex++) {
        if (!onTopBottom && ex >= m && ex < sw - m) { ex = sw - m - 1; continue; }
        var t = (ey * sw + ex) * 4;
        edge.push((0.299 * d[t] + 0.587 * d[t + 1] + 0.114 * d[t + 2]) / 255);
      }
    }
    edge.sort(function (a, b) { return a - b; });
    var bgLum = edge.length ? edge[edge.length >> 1] : 0.5;

    return { rgb: rgb, lum: lum, grad: grad, bgLum: bgLum };
  }

  /*
    文字配色。核心是明暗反转：暗处放浅字、亮处放深字，
    保证任何位置都读得出来，又不脱离照片本身。
    彩色模式下先提饱和度再向白/黑推，颜色不会被推没。
  */
  function textColor(o, px, py, L, smp, rng) {
    var light = L < 0.44;                       // 底暗 → 用浅色字
    if (!o.color || o.tint <= 0.001) {
      var shade = light ? Math.round(228 + rng() * 24) : Math.round(12 + rng() * 72);
      return [shade, shade, shade];
    }
    var c = smp.rgb(px, py);
    var y = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
    var boost = 1 + 1.4 * o.tint;               // 先提饱和，抵消后面推向黑白的损失
    var out = [
      clamp255(y + (c[0] - y) * boost),
      clamp255(y + (c[1] - y) * boost),
      clamp255(y + (c[2] - y) * boost)
    ];
    var target = light ? 255 : 0;
    var k = (light ? 0.72 + rng() * 0.2 : 0.68 + rng() * 0.22) * (1 - 0.35 * o.tint);
    return out.map(function (v) { return Math.round(v + (target - v) * k); });
  }

  function create(canvas, options) {
    var ctx = canvas.getContext('2d');
    var o = {};
    for (var k in DEFAULTS) o[k] = DEFAULTS[k];
    if (options) for (var k2 in options) if (options[k2] !== undefined) o[k2] = options[k2];

    var img = null;
    var plate = null;       // 背景版：底色 + 模糊后的照片，逐帧不变，一次烘焙
    var items = null;       // 文字散布结果（缓存）
    var softC = null, softX = null;   // 失焦文字的离屏层
    var W = 0, H = 0, scale = 1;
    var dirtyBase = true, dirtyItems = true;
    var raf = 0, playing = false, startedAt = 0, pausedT = 0;

    function invalidate(what) {
      if (what === 'items') dirtyItems = true;
      else { dirtyBase = true; dirtyItems = true; }
    }

    function ensureSize() {
      var iw = img.width, ih = img.height;
      var s = Math.min(o.maxWidth / iw, o.maxWidth / ih, 1.6);
      var nw = Math.round(iw * s), nh = Math.round(ih * s);
      if (nw !== W || nh !== H) {
        W = nw; H = nh;
        canvas.width = W; canvas.height = H;
        softC = newCanvas(W, H); softX = softC.getContext('2d');
        dirtyBase = dirtyItems = true;
      }
      scale = W / 1400;
    }

    function buildBase() {
      var ph = newCanvas(W, H);
      var pctx = ph.getContext('2d');
      pctx.filter = o.color
        ? 'saturate(' + o.sat + ') contrast(' + o.contrast + ') brightness(1.03)'
        : 'grayscale(1) contrast(' + o.contrast + ') brightness(1.05)';
      pctx.drawImage(img, 0, 0, W, H);

      var blurred = motionBlur(ph, W, H, o.blur * scale, o.angle, o.falloff);

      // 底色 + 收边柔化一次性烘焙进背景版，动效逐帧只需一次 drawImage
      plate = newCanvas(W, H);
      var px = plate.getContext('2d');
      px.fillStyle = o.background || (o.color ? '#f3f2ef' : '#f2f2ef');
      px.fillRect(0, 0, W, H);
      px.filter = 'blur(' + Math.max(1, 2.2 * scale) + 'px)';
      px.drawImage(blurred, 0, 0);
      px.filter = 'none';

      sampleSrc = blurred;
      dirtyBase = false;
    }
    var sampleSrc = null;

    function buildItems() {
      var smp = sampler(sampleSrc, W, H);
      var rng = mulberry32(o.seed * 1013 + 17);
      var words = (o.words || []).map(function (s) { return String(s).trim(); })
                                 .filter(function (s) { return s.length; });
      if (!words.length) words = ['Prompt'];

      var seen = {}, letters = [];
      words.forEach(function (w) {
        if (w.length < 2) return;
        w.split('').forEach(function (ch) {
          if (ch.trim() && !seen[ch]) { seen[ch] = 1; letters.push(ch); }
        });
      });

      var step = (70 - 46 * o.density) * scale;
      items = [];
      for (var gy = step * 0.6; gy < H - step * 0.2; gy += step) {
        for (var gx = step * 0.6; gx < W - step * 0.2; gx += step) {
          var px = gx + (rng() - 0.5) * step * 0.95;
          var py = gy + (rng() - 0.5) * step * 0.95;
          var L = smp.lum(px, py);
          var g = Math.min(1, smp.grad(px, py) * 2.4);

          // 与背景的偏离度，而非绝对暗度：亮底暗主体、暗底亮主体都成立
          var dev = Math.min(1, Math.abs(L - smp.bgLum) * 1.7);
          if (o.invert) dev = 1 - dev;

          // cling 越高，文字越只长在主体和轮廓上，背景越干净
          var focus = 0.75 * Math.pow(dev, 1.5) + 0.55 * g;
          var p = 0.06 + o.cling * focus + (1 - o.cling) * 0.35;
          if (rng() > p) continue;

          var useLetter = letters.length && rng() < 0.16;
          var raw = useLetter
            ? letters[Math.floor(rng() * letters.length)]
            : words[Math.floor(rng() * words.length)];

          var sz = o.size * scale * (0.45 + rng() * 1.0);
          sz *= 0.75 + 0.5 * Math.min(1, dev * 1.2 + g);     // 主体/轮廓上的字更大
          if (rng() < 0.045) sz *= 1.9;

          var alpha = 0.16 + 0.84 * Math.pow(rng(), 1.5);
          alpha *= 0.35 + 0.65 * Math.min(1, dev * 1.6 + g * 1.2);
          if (L < 0.44) alpha = Math.max(alpha, 0.5);         // 暗底上的字保底可读

          items.push({
            x: px, y: py, sz: sz, alpha: alpha,
            txt: raw,
            rgb: textColor(o, px, py, L, smp, rng),
            weight: rng() < 0.45 ? 700 : 500,
            soft: rng() < o.defocus,
            phase: rng() * Math.PI * 2,
            drift: 0.5 + rng()
          });
        }
      }
      dirtyItems = false;
    }

    /*
      文字层。motion 为 glitch 时，每一小段时间重掷一次骰子，
      让一部分字直接消失、另一部分突然变亮 —— 故障感来自出现与消失本身。

      失焦的字全部先画进离屏画布，最后整体模糊一次再贴回来。
      千万不要给每次 fillText 单独设 ctx.filter —— 那是逐字一次滤镜操作，
      几百个字就能把帧率打到个位数。
    */
    function paintText(x2, t) {
      var flick = o.motion === 'glitch' && t > 0 && o.intensity > 0.001;
      var step = flick ? Math.floor(t * 7 * o.speed) : 0;

      softX.clearRect(0, 0, W, H);
      softX.textAlign = x2.textAlign = 'center';
      softX.textBaseline = x2.textBaseline = 'middle';

      // 第一趟只画失焦字（进离屏），第二趟画清晰字（直接进目标）
      for (var pass = 0; pass < 2; pass++) {
        var soft = pass === 0;
        var g = soft ? softX : x2;

        for (var i = 0; i < items.length; i++) {
          var it = items[i];
          if (it.soft !== soft) continue;

          var a = it.alpha;

          if (flick) {
            var gr = hash01((step * 374761393 + i * 31) | 0);
            if (gr < 0.16 * o.intensity) continue;                    // 消失
            if (gr > 1 - 0.09 * o.intensity) { a *= 2.4; if (a > 1) a = 1; }  // 骤亮
          }

          g.font = it.weight + ' ' + it.sz + 'px ' + o.font;
          if ('letterSpacing' in g) g.letterSpacing = (it.sz * 0.05) + 'px';
          g.fillStyle = 'rgba(' + it.rgb[0] + ',' + it.rgb[1] + ',' + it.rgb[2] + ',' + a + ')';
          g.fillText(it.txt, it.x, it.y);
        }

        if (soft) {                                   // 整层一次性模糊后贴回
          x2.filter = 'blur(' + Math.max(1.2, 2.2 * scale) + 'px)';
          x2.drawImage(softC, 0, 0);
          x2.filter = 'none';
        }
      }
    }

    function drawFrame(t) {
      if (!img) return;
      ensureSize();
      if (dirtyBase) buildBase();
      if (dirtyItems) buildItems();

      ctx.filter = 'none';
      ctx.drawImage(plate, 0, 0);
      paintText(ctx, t);
    }

    function loop(now) {
      if (!playing) return;
      drawFrame((now - startedAt) / 1000);
      raf = requestAnimationFrame(loop);
    }

    var api = {
      get options() { var c = {}; for (var i in o) c[i] = o[i]; return c; },

      setOptions: function (patch) {
        var structural = false;
        for (var key in patch) {
          if (patch[key] === undefined || o[key] === patch[key]) continue;
          o[key] = patch[key];
          if (key !== 'motion' && key !== 'speed' && key !== 'intensity') structural = true;
        }
        if (structural) {
          var onlyItems = Object.keys(patch).every(function (key) {
            return ['words', 'density', 'cling', 'invert', 'size', 'defocus',
                    'tint', 'seed', 'font', 'motion', 'speed', 'intensity'].indexOf(key) >= 0;
          });
          invalidate(onlyItems ? 'items' : 'all');
        }
        if (!playing) api.render();
        return api;
      },

      setImage: function (source) {
        if (typeof source === 'string' || source instanceof Blob) {
          return new Promise(function (resolve, reject) {
            var im = new Image();
            im.crossOrigin = 'anonymous';
            var url = typeof source === 'string' ? source : URL.createObjectURL(source);
            im.onload = function () {
              if (source !== url) URL.revokeObjectURL(url);
              img = im; invalidate('all');
              if (!playing) api.render();
              resolve(api);
            };
            im.onerror = function () { reject(new Error('图片加载失败: ' + url)); };
            im.src = url;
          });
        }
        img = source; invalidate('all');
        if (!playing) api.render();
        return Promise.resolve(api);
      },

      render: function () { drawFrame(playing ? (performance.now() - startedAt) / 1000 : pausedT); return api; },

      play: function () {
        if (playing || o.motion === 'none') return api;
        playing = true;
        startedAt = performance.now() - pausedT * 1000;
        raf = requestAnimationFrame(loop);
        return api;
      },

      pause: function () {
        if (!playing) return api;
        pausedT = (performance.now() - startedAt) / 1000;
        playing = false;
        cancelAnimationFrame(raf);
        return api;
      },

      get playing() { return playing; },

      reseed: function () { o.seed++; invalidate('items'); if (!playing) api.render(); return api; },

      toDataURL: function (type, q) { return canvas.toDataURL(type || 'image/png', q); },

      destroy: function () { playing = false; cancelAnimationFrame(raf); img = plate = items = null; }
    };

    return api;
  }

  var TypoPortrait = { create: create, DEFAULTS: DEFAULTS, version: '1.0.0' };

  if (typeof module === 'object' && module.exports) module.exports = TypoPortrait;
  else global.TypoPortrait = TypoPortrait;

})(typeof self !== 'undefined' ? self : this);
