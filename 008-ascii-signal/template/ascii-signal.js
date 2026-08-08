(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const inputCanvas = document.createElement('canvas');
  const inputCtx = inputCanvas.getContext('2d', { willReadFrequently: true });
  const sampleCanvas = document.createElement('canvas');
  const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
  const outputCanvas = $('ascii-canvas');
  const outputCtx = outputCanvas.getContext('2d');
  const dropZone = $('drop-zone');

  const CHARSETS = {
    standard: '@WozLzf1+,. ',
    dense: '$@B%8&WM#*oahkbdpqwmZ0OQLCJUYXzcvunxrjft/\\|()1{}[]?-_+~i!lI;:,\"^`\'. ',
    blocks: '█▓▒░ ',
    binary: '10 '
  };

  // 每档字符的视觉密度接近；同档替换可以增加纹理，但不会破坏明暗结构。
  const STANDARD_BANDS = [
    '@&$8%B', 'WM#*', 'oahkbdpq', 'wmZO0Q', 'LCJUYX',
    'zcvunxrj', 'ft/\\|()', '1{}[]?-_', '+~i!lI;:', ',."^`\' ', ' '
  ];

  const PALETTES = {
    paper: { paper: '#ffffff', ink: '#111111' },
    black: { paper: '#111111', ink: '#ffffff' }
  };

  const state = {
    columns: 108,
    contrast: 1.08,
    texture: .72,
    invert: false,
    color: true,
    charset: 'standard',
    customCharset: '',
    palette: 'paper',
    sourceName: '内置测试图',
    sourceWidth: 0,
    sourceHeight: 0,
    ascii: '',
    pixels: null,
    rows: 0
  };

  function drawDemoSource() {
    inputCanvas.width = 1200;
    inputCanvas.height = 1500;
    const ctx = inputCtx;
    const w = inputCanvas.width;
    const h = inputCanvas.height;
    ctx.fillStyle = '#edf1eb';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#151a16';
    ctx.fillRect(0, 0, w, 112);
    ctx.fillStyle = '#61a86d';
    ctx.fillRect(78, 70, 570, 15);
    ctx.save();
    ctx.translate(w * .5, h * .51);
    ctx.rotate(-.19);
    ctx.fillStyle = '#151a16';
    ctx.beginPath();
    ctx.ellipse(0, 0, 310, 485, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#edf1eb';
    ctx.beginPath();
    ctx.ellipse(-20, -36, 178, 278, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#61a86d';
    ctx.fillRect(-400, 265, 800, 46);
    ctx.restore();
    ctx.fillStyle = '#151a16';
    ctx.font = '800 144px Georgia, serif';
    ctx.fillText('A', 76, 342);
    ctx.font = '800 46px "Cascadia Mono", monospace';
    ctx.fillText('SIGNAL / 08', 84, 1260);
    ctx.font = '28px "Cascadia Mono", monospace';
    ctx.fillText('DROP YOUR OWN IMAGE TO REPLACE', 86, 1320);
    state.sourceName = '内置测试图';
    state.sourceWidth = w;
    state.sourceHeight = h;
  }

  function loadDefaultImage() {
    if (!window.ASCII_SIGNAL_DEFAULT_IMAGE) return;
    const image = new Image();
    image.onload = () => setSource(image, '默认测试图');
    image.onerror = () => { $('status-main').textContent = '内置测试图读取失败'; };
    image.src = window.ASCII_SIGNAL_DEFAULT_IMAGE;
  }

  function getCharacters() {
    // 尾部空格也是字符表的一部分：它通常正好负责最亮的区域，不能 trim 掉。
    const custom = state.customCharset;
    return custom.length >= 2 && custom.trim().length ? custom : CHARSETS[state.charset];
  }

  function stableNoise(x, y) {
    const value = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return value - Math.floor(value);
  }

  function selectGlyph(lightness, x, y) {
    const hasCustomSet = state.customCharset.length >= 2 && state.customCharset.trim().length;
    if (!hasCustomSet && state.charset === 'standard') {
      const bandIndex = Math.min(STANDARD_BANDS.length - 1, Math.floor(lightness * STANDARD_BANDS.length));
      const glyphs = STANDARD_BANDS[bandIndex];
      const available = Math.max(1, Math.ceil(glyphs.length * state.texture));
      return glyphs[Math.min(glyphs.length - 1, Math.floor(stableNoise(x, y) * available))];
    }

    const glyphs = getCharacters();
    const jitter = (stableNoise(x, y) - .5) * state.texture * .075;
    const adjusted = Math.max(0, Math.min(1, lightness + jitter));
    return glyphs[Math.min(glyphs.length - 1, Math.floor(adjusted * glyphs.length))];
  }

  function updateColorVariables() {
    const palette = PALETTES[state.palette];
    document.documentElement.style.setProperty('--signal-paper', palette.paper);
    document.documentElement.style.setProperty('--signal-ink', palette.ink);
  }

  function convert() {
    if (!inputCanvas.width || !inputCanvas.height) return;
    const columns = state.columns;
    const rows = Math.max(1, Math.round((inputCanvas.height / inputCanvas.width) * columns * .52));
    sampleCanvas.width = columns;
    sampleCanvas.height = rows;
    sampleCtx.imageSmoothingEnabled = true;
    sampleCtx.imageSmoothingQuality = 'high';
    sampleCtx.drawImage(inputCanvas, 0, 0, columns, rows);
    const pixels = sampleCtx.getImageData(0, 0, columns, rows).data;
    state.pixels = new Uint8ClampedArray(pixels);
    const lines = [];

    for (let y = 0; y < rows; y += 1) {
      let line = '';
      for (let x = 0; x < columns; x += 1) {
        const offset = (y * columns + x) * 4;
        const alpha = pixels[offset + 3] / 255;
        let lightness = (pixels[offset] * .2126 + pixels[offset + 1] * .7152 + pixels[offset + 2] * .0722) / 255;
        lightness = Math.min(1, Math.max(0, (lightness - .5) * state.contrast + .5));
        lightness = lightness * alpha + (1 - alpha);
        if (state.invert) lightness = 1 - lightness;
        line += selectGlyph(lightness, x, y);
      }
      lines.push(line);
    }

    state.ascii = lines.join('\n');
    state.rows = rows;
    $('ascii-text').textContent = state.ascii;
    $('grid-meta').textContent = `${columns} × ${rows}`;
    render();
  }

  function render() {
    if (!state.ascii) return;
    const rect = dropZone.getBoundingClientRect();
    const outerPadding = Math.min(40, Math.max(16, rect.width * .04));
    const maxWidth = Math.max(10, rect.width - outerPadding * 2);
    const maxHeight = Math.max(10, rect.height - outerPadding * 2);
    const lineHeightRatio = 1.08;
    const charWidthRatio = .602;
    const fontSize = Math.max(4, Math.min(18, maxWidth / (state.columns * charWidthRatio), maxHeight / (state.rows * lineHeightRatio)));
    const cssWidth = Math.ceil(state.columns * fontSize * charWidthRatio);
    const cssHeight = Math.ceil(state.rows * fontSize * lineHeightRatio);
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    outputCanvas.width = Math.ceil(cssWidth * ratio);
    outputCanvas.height = Math.ceil(cssHeight * ratio);
    outputCanvas.style.width = `${cssWidth}px`;
    outputCanvas.style.height = `${cssHeight}px`;

    const palette = PALETTES[state.palette];
    outputCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
    outputCtx.fillStyle = palette.paper;
    outputCtx.fillRect(0, 0, cssWidth, cssHeight);
    drawAsciiField(cssWidth, cssHeight, fontSize, lineHeightRatio);
    outputCtx.font = `${fontSize}px/1 "Cascadia Mono", "SFMono-Regular", Consolas, monospace`;
    outputCtx.textBaseline = 'top';
    const lines = state.ascii.split('\n');
    const lineHeight = fontSize * lineHeightRatio;
    if (!state.color || !state.pixels) {
      outputCtx.fillStyle = palette.ink;
      lines.forEach((line, index) => outputCtx.fillText(line, 0, index * lineHeight));
      return;
    }

    lines.forEach((line, row) => {
      for (let column = 0; column < line.length; column += 1) {
        const glyph = line[column];
        if (glyph === ' ') continue;
        const offset = (row * state.columns + column) * 4;
        const alpha = state.pixels[offset + 3] / 255;
        outputCtx.fillStyle = `rgb(${state.pixels[offset]} ${state.pixels[offset + 1]} ${state.pixels[offset + 2]} / ${alpha})`;
        outputCtx.fillText(glyph, column * fontSize * charWidthRatio, row * lineHeight);
      }
    });
  }

  // 空白不是另加一层 UI，而是输出画布本身的极淡字符场。
  // 用稳定的取样规律保留终端纸面的秩序感，同时不干扰图像主体。
  function drawAsciiField(width, height, fontSize, lineHeightRatio) {
    const isDark = state.palette === 'black';
    const xStep = Math.max(16, fontSize * 2.65);
    const yStep = Math.max(16, fontSize * lineHeightRatio * 2.65);
    outputCtx.fillStyle = isDark ? 'rgb(255 255 255 / 0.075)' : 'rgb(18 28 21 / 0.055)';
    for (let y = yStep; y < height; y += yStep) {
      const row = Math.floor(y / yStep);
      for (let x = xStep; x < width; x += xStep) {
        const column = Math.floor(x / xStep);
        if ((row * 11 + column * 7) % 9 === 0) outputCtx.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
    }
  }

  function setSource(image, name) {
    const maxSourceSide = 2400;
    const scale = Math.min(1, maxSourceSide / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
    const width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
    const height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
    inputCanvas.width = width;
    inputCanvas.height = height;
    inputCtx.clearRect(0, 0, width, height);
    inputCtx.drawImage(image, 0, 0, width, height);
    state.sourceName = name;
    state.sourceWidth = image.naturalWidth || image.width;
    state.sourceHeight = image.naturalHeight || image.height;
    $('source-name').textContent = name;
    $('source-meta').textContent = `${state.sourceWidth} × ${state.sourceHeight}`;
    $('status-main').textContent = '图像已转换为字符信号';
    convert();
  }

  function readFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      $('status-main').textContent = '请选择 JPG、PNG、WebP、GIF 或 BMP 图片';
      $('status-main').classList.add('error-line');
      return;
    }
    $('status-main').classList.remove('error-line');
    $('status-main').textContent = '正在读取图片…';
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      setSource(image, file.name);
      URL.revokeObjectURL(url);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      $('status-main').textContent = '图片读取失败，请换一张再试';
      $('status-main').classList.add('error-line');
    };
    image.src = url;
  }

  async function copyText() {
    const button = $('copy-text');
    try {
      await navigator.clipboard.writeText(state.ascii);
      button.querySelector('span').textContent = '已复制';
      button.querySelector('small').textContent = `${state.rows} 行字符`;
    } catch {
      const text = $('ascii-text');
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(text);
      selection.removeAllRanges();
      selection.addRange(range);
      button.querySelector('span').textContent = '请按 Ctrl+C';
    }
    window.setTimeout(() => {
      button.querySelector('span').textContent = '复制文字';
      button.querySelector('small').textContent = 'ASCII TXT';
    }, 1500);
  }

  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function syncControls() {
    $('columns-output').textContent = state.columns;
    $('contrast-output').textContent = `${Math.round(state.contrast * 100)}%`;
    $('texture-output').textContent = `${Math.round(state.texture * 100)}%`;
    document.querySelectorAll('[data-charset]').forEach((button) => button.classList.toggle('active', button.dataset.charset === state.charset && !state.customCharset.trim()));
    document.querySelectorAll('[data-palette]').forEach((button) => button.classList.toggle('active', button.dataset.palette === state.palette));
    document.querySelectorAll('[data-color-mode]').forEach((button) => button.classList.toggle('active', (button.dataset.colorMode === 'color') === state.color));
  }

  $('upload-trigger').addEventListener('click', () => $('image-file').click());
  $('image-file').addEventListener('change', (event) => readFile(event.target.files[0]));
  dropZone.addEventListener('click', () => $('image-file').click());
  dropZone.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); $('image-file').click(); } });
  ['dragenter', 'dragover'].forEach((eventName) => dropZone.addEventListener(eventName, (event) => { event.preventDefault(); $('workspace').classList.add('dragging'); }));
  ['dragleave', 'drop'].forEach((eventName) => dropZone.addEventListener(eventName, (event) => { event.preventDefault(); $('workspace').classList.remove('dragging'); }));
  dropZone.addEventListener('drop', (event) => readFile(event.dataTransfer.files[0]));
  document.addEventListener('paste', (event) => {
    const imageItem = [...event.clipboardData.items].find((item) => item.type.startsWith('image/'));
    if (imageItem) readFile(imageItem.getAsFile());
  });

  $('columns').addEventListener('input', (event) => { state.columns = Number(event.target.value); syncControls(); convert(); });
  $('contrast').addEventListener('input', (event) => { state.contrast = Number(event.target.value) / 100; syncControls(); convert(); });
  $('texture').addEventListener('input', (event) => { state.texture = Number(event.target.value); syncControls(); convert(); });
  $('invert').addEventListener('change', (event) => { state.invert = event.target.checked; convert(); });
  $('custom-charset').addEventListener('input', (event) => { state.customCharset = event.target.value; syncControls(); convert(); });
  document.querySelectorAll('[data-palette]').forEach((button) => button.addEventListener('click', () => {
    state.palette = button.dataset.palette;
    syncControls();
    updateColorVariables();
    render();
  }));
  document.querySelectorAll('[data-color-mode]').forEach((button) => button.addEventListener('click', () => {
    state.color = button.dataset.colorMode === 'color';
    syncControls();
    render();
  }));
  document.querySelectorAll('[data-charset]').forEach((button) => button.addEventListener('click', () => {
    state.charset = button.dataset.charset;
    state.customCharset = '';
    $('custom-charset').value = '';
    syncControls();
    convert();
  }));
  $('copy-text').addEventListener('click', copyText);
  $('download-text').addEventListener('click', () => download(new Blob([state.ascii], { type: 'text/plain;charset=utf-8' }), 'ascii-signal.txt'));
  $('download-image').addEventListener('click', () => outputCanvas.toBlob((blob) => { if (blob) download(blob, 'ascii-signal.png'); }, 'image/png'));

  let resizeTimer;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(render, 100);
  });
  let panelRenderFrame = 0;
  window.addEventListener('formula-lab:panel', () => {
    window.cancelAnimationFrame(panelRenderFrame);
    panelRenderFrame = window.requestAnimationFrame(render);
  });

  drawDemoSource();
  updateColorVariables();
  syncControls();
  $('source-name').textContent = state.sourceName;
  $('source-meta').textContent = `${state.sourceWidth} × ${state.sourceHeight}`;
  convert();
  loadDefaultImage();
})();
