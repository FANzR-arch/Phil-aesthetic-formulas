const canvas = document.getElementById('canvas');
const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true }) || canvas.getContext('experimental-webgl');

const FORMAT_SIZES = {
  square: [1080, 1080],
  poster: [1080, 1350],
  story: [1080, 1920],
  wide: [1920, 1080],
};

const STORAGE_KEY = 'liquid-screen-lab-state-v5';
const SAVED_PARAMETERS_KEY = 'liquid-screen-lab-saved-parameters-v1';
const MAX_SAVED_PARAMETERS = 12;

const DEFAULTS = {
  canvasWidth: 1080,
  canvasHeight: 1350,
  timeScale: 0.18,
  flowStrength: 0.92,
  fieldZoom: 1.0,
  fieldRotation: 0,
  fieldOffsetX: 0,
  fieldOffsetY: 0,
  patternAmp: 9.0,
  patternFreq: 0.86,
  minCircleSize: 3.2,
  circleStrength: 0.82,
  distortX: 7.0,
  distortY: 14.0,
  contrast: 0.94,
  inkBalance: -0.06,
  bloomStrength: 0.16,
  exposure: 1.02,
  saturation: 1.02,
  iridescence: 0.94,
  colorCycles: 0.72,
  paletteShift: 0,
  colorTintR: 1.0,
  colorTintG: 1.0,
  colorTintB: 1.0,
  halftoneAmount: 0.18,
  halftoneScale: 0.46,
  halftoneAngle: 0,
  halftoneThreshold: 0,
  rgbScreenShift: 0.45,
  grainAmount: 0.012,
};

const PRESETS = {
  iris: {
    label: 'Black / Iris', note: '深黑虹彩', swatch: '#d6ff3f', seed: 937,
    values: { ...DEFAULTS },
  },
  milk: {
    label: 'Milk / Soft', note: '柔白乳化', swatch: '#f6ead0', seed: 1841,
    values: { ...DEFAULTS, timeScale: 0.12, flowStrength: 0.58, fieldZoom: 0.86, patternAmp: 5.6, patternFreq: 0.48, minCircleSize: 5.2, circleStrength: 0.42, distortX: 3.4, distortY: 6.8, inkBalance: 0.72, bloomStrength: 0.12, exposure: 1.1, contrast: 0.7, saturation: 0.68, grainAmount: 0.006, halftoneAmount: 0.04, halftoneScale: 0.34, rgbScreenShift: 0.08, iridescence: 0.5, colorCycles: 0.34, paletteShift: 0.08, colorTintR: 1.08, colorTintG: 1.02, colorTintB: 0.9 },
  },
  screen: {
    label: 'RGB Screen', note: '高密错版', swatch: '#ff614a', seed: 7253,
    values: { ...DEFAULTS, timeScale: 0.2, flowStrength: 1.18, fieldZoom: 1.18, patternAmp: 11.5, patternFreq: 1.26, minCircleSize: 2.0, circleStrength: 1.18, distortX: 12.0, distortY: 18.0, inkBalance: 0.02, bloomStrength: 0.08, contrast: 1.22, exposure: 0.96, saturation: 1.18, grainAmount: 0.038, halftoneAmount: 0.92, halftoneScale: 1.18, halftoneAngle: 0.22, halftoneThreshold: 0.15, rgbScreenShift: 1.72, iridescence: 0.8, colorCycles: 1.12, paletteShift: 0.46 },
  },
  oil: {
    label: 'Oil Film', note: '细密油膜', swatch: '#8bbcff', seed: 286,
    values: { ...DEFAULTS, timeScale: 0.08, flowStrength: 0.72, fieldZoom: 1.34, patternAmp: 15.8, patternFreq: 0.38, minCircleSize: 5.8, circleStrength: 0.68, distortX: 4.2, distortY: 14.5, inkBalance: 0.18, contrast: 1.02, bloomStrength: 0.12, exposure: 1.06, saturation: 1.18, iridescence: 1.0, colorCycles: 1.82, paletteShift: 0.16, halftoneAmount: 0.02, halftoneScale: 0.68, rgbScreenShift: 0.12, grainAmount: 0.004, colorTintR: 0.92, colorTintG: 1.02, colorTintB: 1.08 },
  },
  poster: {
    label: 'Print Poster', note: '粗颗粒海报', swatch: '#ffd541', seed: 641,
    values: { ...DEFAULTS, timeScale: 0.14, flowStrength: 0.86, fieldZoom: 0.78, fieldRotation: -0.18, patternAmp: 7.4, patternFreq: 1.08, minCircleSize: 2.4, circleStrength: 1.4, distortX: 10.0, distortY: 7.0, inkBalance: -0.28, contrast: 1.46, bloomStrength: 0.02, exposure: 0.88, saturation: 1.28, iridescence: 0.52, colorCycles: 0.26, paletteShift: 0.68, halftoneAmount: 0.74, halftoneScale: 0.72, halftoneThreshold: 0.46, halftoneAngle: -0.16, rgbScreenShift: 0.42, grainAmount: 0.1, colorTintR: 1.12, colorTintG: 0.9, colorTintB: 0.76 },
  },
  vapor: {
    label: 'Vapor Veil', note: '低对比薄雾', swatch: '#f4a9cf', seed: 124,
    values: { ...DEFAULTS, timeScale: 0.06, flowStrength: 0.38, fieldZoom: 1.56, fieldOffsetY: -0.12, patternAmp: 4.2, patternFreq: 0.26, minCircleSize: 6.6, circleStrength: 0.26, distortX: 2.2, distortY: 4.4, inkBalance: 0.82, contrast: 0.58, bloomStrength: 0.34, exposure: 1.16, saturation: 0.5, iridescence: 0.42, colorCycles: 0.22, paletteShift: 0.3, halftoneAmount: 0.0, rgbScreenShift: 0.0, grainAmount: 0.008, colorTintR: 0.94, colorTintG: 1.0, colorTintB: 1.08 },
  },
};

const LOTTERY_PROFILES = [
  {
    id: 'prism-surge', label: 'PRISM SURGE', note: '棱镜洪流', bases: ['iris', 'oil'],
    ranges: {
      timeScale: [0.07, 0.2], flowStrength: [1.15, 1.9], fieldZoom: [0.55, 1.08],
      patternAmp: [16, 29], patternFreq: [0.28, 0.72], minCircleSize: [3.8, 7.4],
      circleStrength: [0.9, 1.8], distortX: [18, 34], distortY: [18, 35], contrast: [1.02, 1.55],
      inkBalance: [-0.34, 0.08], bloomStrength: [0.12, 0.48], exposure: [0.94, 1.18],
      saturation: [1.35, 1.92], iridescence: [0.92, 1], colorCycles: [1.65, 2.95],
      halftoneAmount: [0, 0.16], halftoneScale: [0.28, 0.8], rgbScreenShift: [0.08, 0.62],
      grainAmount: [0.002, 0.024], colorTintR: [0.82, 1.3], colorTintG: [0.8, 1.28], colorTintB: [0.88, 1.36],
    },
  },
  {
    id: 'ink-vortex', label: 'INK VORTEX', note: '黑墨漩涡', bases: ['iris', 'poster'],
    ranges: {
      timeScale: [0.04, 0.13], flowStrength: [1.1, 1.75], fieldZoom: [0.48, 0.9],
      patternAmp: [18, 30], patternFreq: [0.2, 0.52], minCircleSize: [4.5, 8],
      circleStrength: [1.35, 2.55], distortX: [22, 35], distortY: [10, 30], contrast: [1.55, 2.16],
      inkBalance: [-0.92, -0.46], bloomStrength: [0.06, 0.3], exposure: [0.68, 0.98],
      saturation: [0.85, 1.45], iridescence: [0.58, 0.96], colorCycles: [0.4, 1.15],
      halftoneAmount: [0.08, 0.42], halftoneScale: [0.24, 0.66], rgbScreenShift: [0.1, 0.8],
      grainAmount: [0.018, 0.08], colorTintR: [0.7, 1.22], colorTintG: [0.72, 1.18], colorTintB: [0.86, 1.42],
    },
  },
  {
    id: 'screen-crash', label: 'SCREEN CRASH', note: '三色错版', bases: ['screen', 'poster'],
    ranges: {
      timeScale: [0.08, 0.22], flowStrength: [0.72, 1.5], fieldZoom: [0.72, 1.58],
      patternAmp: [7, 20], patternFreq: [0.82, 2.2], minCircleSize: [0.6, 3.1],
      circleStrength: [1.05, 2.4], distortX: [8, 25], distortY: [8, 30], contrast: [1.35, 2.05],
      inkBalance: [-0.42, 0.16], bloomStrength: [0, 0.14], exposure: [0.78, 1.08],
      saturation: [1.15, 1.85], iridescence: [0.36, 0.82], colorCycles: [0.18, 0.8],
      halftoneAmount: [0.78, 1], halftoneScale: [0.72, 1.78], rgbScreenShift: [1.45, 3],
      grainAmount: [0.045, 0.16], halftoneThreshold: [-0.45, 0.72],
      colorTintR: [0.92, 1.42], colorTintG: [0.7, 1.18], colorTintB: [0.72, 1.34],
    },
  },
  {
    id: 'pearl-storm', label: 'PEARL STORM', note: '珍珠风暴', bases: ['milk', 'vapor'],
    ranges: {
      timeScale: [0.035, 0.11], flowStrength: [1.05, 1.82], fieldZoom: [0.5, 1.12],
      patternAmp: [15, 28], patternFreq: [0.22, 0.62], minCircleSize: [4.2, 7.8],
      circleStrength: [0.52, 1.42], distortX: [15, 33], distortY: [18, 35], contrast: [0.52, 0.94],
      inkBalance: [0.38, 0.9], bloomStrength: [0.48, 1.28], exposure: [1.12, 1.52],
      saturation: [0.72, 1.32], iridescence: [0.72, 1], colorCycles: [0.7, 1.85],
      halftoneAmount: [0, 0.1], halftoneScale: [0.18, 0.56], rgbScreenShift: [0, 0.22],
      grainAmount: [0.002, 0.018], colorTintR: [0.94, 1.25], colorTintG: [0.92, 1.24], colorTintB: [0.98, 1.38],
    },
  },
  {
    id: 'acid-poster', label: 'ACID POSTER', note: '酸性海报', bases: ['poster', 'screen'],
    ranges: {
      timeScale: [0.06, 0.18], flowStrength: [0.78, 1.56], fieldZoom: [0.62, 1.22],
      patternAmp: [9, 24], patternFreq: [0.68, 1.75], minCircleSize: [1.1, 4.2],
      circleStrength: [1.25, 2.8], distortX: [12, 31], distortY: [7, 28], contrast: [1.42, 2.18],
      inkBalance: [-0.72, -0.08], bloomStrength: [0, 0.12], exposure: [0.7, 1.02],
      saturation: [1.45, 2], iridescence: [0.48, 0.92], colorCycles: [0.14, 0.66],
      halftoneAmount: [0.52, 0.92], halftoneScale: [0.38, 1.15], rgbScreenShift: [0.45, 1.8],
      grainAmount: [0.085, 0.23], halftoneThreshold: [0.12, 1.1],
      colorTintR: [1.08, 1.5], colorTintG: [0.48, 1.02], colorTintB: [0.42, 1.22],
    },
  },
  {
    id: 'liquid-chrome', label: 'LIQUID CHROME', note: '液态铬', bases: ['oil', 'iris'],
    ranges: {
      timeScale: [0.045, 0.14], flowStrength: [0.88, 1.6], fieldZoom: [0.52, 1.18],
      patternAmp: [18, 30], patternFreq: [0.18, 0.48], minCircleSize: [4.8, 8],
      circleStrength: [0.62, 1.48], distortX: [22, 35], distortY: [22, 35], contrast: [1.48, 2.12],
      inkBalance: [-0.52, -0.12], bloomStrength: [0.28, 0.88], exposure: [0.86, 1.16],
      saturation: [0.45, 0.92], iridescence: [0.86, 1], colorCycles: [1.28, 2.7],
      halftoneAmount: [0, 0.08], halftoneScale: [0.2, 0.54], rgbScreenShift: [0, 0.28],
      grainAmount: [0, 0.012], colorTintR: [0.72, 1.08], colorTintG: [0.82, 1.18], colorTintB: [1.02, 1.48],
    },
  },
];

const CONTROL_GROUPS = [
  {
    index: '03', label: '运动', open: true,
    controls: [
      ['timeScale', '速度', 0, 1.5, 0.01],
      ['flowStrength', '流动幅度', 0, 2, 0.01],
      ['fieldZoom', '画面缩放', 0.35, 3, 0.01],
      ['fieldRotation', '构图旋转', -3.14, 3.14, 0.01],
      ['fieldOffsetX', '水平位移', -1.5, 1.5, 0.01],
      ['fieldOffsetY', '垂直位移', -1.5, 1.5, 0.01],
    ],
  },
  {
    index: '04', label: '形态', open: true,
    controls: [
      ['patternAmp', '纹理振幅', 1, 30, 0.1],
      ['patternFreq', '纹理频率', 0.15, 4, 0.01],
      ['minCircleSize', '斑块尺寸', 0, 8, 0.05],
      ['circleStrength', '斑块强度', 0, 3, 0.01],
      ['distortX', '水平扭曲', 0, 35, 0.1],
      ['distortY', '垂直扭曲', 0, 35, 0.1],
      ['contrast', '形态对比', 0.35, 2.2, 0.01],
    ],
  },
  {
    index: '05', label: '虹彩与明暗', open: false,
    controls: [
      ['iridescence', '虹彩混合', 0, 1, 0.01],
      ['inkBalance', '明暗平衡', -1, 1, 0.01],
      ['colorCycles', '色带数量', 0.05, 3, 0.01],
      ['paletteShift', '色相相位', 0, 1, 0.01],
      ['exposure', '曝光', 0.35, 1.8, 0.01],
      ['saturation', '饱和度', 0, 2, 0.01],
      ['bloomStrength', '泛光', 0, 2.5, 0.01],
      ['colorTintR', '红通道', 0.25, 1.5, 0.01],
      ['colorTintG', '绿通道', 0.25, 1.5, 0.01],
      ['colorTintB', '蓝通道', 0.25, 1.5, 0.01],
    ],
  },
  {
    index: '06', label: '网点与质感', open: false,
    controls: [
      ['halftoneAmount', '网点混合', 0, 1, 0.01],
      ['halftoneScale', '网点密度', 0.12, 2, 0.01],
      ['halftoneAngle', '网点角度', -1.57, 1.57, 0.01],
      ['halftoneThreshold', '网点阈值', -2, 2, 0.01],
      ['rgbScreenShift', 'RGB 错版', 0, 3, 0.01],
      ['grainAmount', '颗粒', 0, 0.25, 0.001],
    ],
  },
];

let params = { ...DEFAULTS };
let randomSeed = 937;
let activePresetId = 'iris';
let resetPresetId = 'iris';
let customMixLabel = 'CUSTOM MIX';
let lastLotteryProfileId = '';
let savedRecipes = [];
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
let isPlaying = !reducedMotionQuery.matches;
let animationID = null;
let time = 0;
let timeOffset = performance.now();
let pausedAt = 0;
let frameCount = 0;
let lastFpsTime = performance.now();
let toastTimer;
const controlInputs = new Map();

function syncPlayPauseButton() {
  const button = document.getElementById('playPauseBtn');
  if (!button) return;
  button.querySelector('.action-icon').textContent = isPlaying ? '⏸' : '▶';
  button.querySelector('b').textContent = isPlaying ? '暂停' : '播放';
}

if (!gl) {
  document.body.innerHTML = '<p class="webgl-error">此浏览器未启用 WebGL，无法运行生成器。</p>';
  throw new Error('WebGL not supported');
}

function compileShader(source, type) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compilation error: ${message}`);
  }
  return shader;
}

const program = gl.createProgram();
gl.attachShader(program, compileShader(document.getElementById('vertexShader').textContent, gl.VERTEX_SHADER));
gl.attachShader(program, compileShader(document.getElementById('fragmentShader').textContent, gl.FRAGMENT_SHADER));
gl.linkProgram(program);
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
gl.useProgram(program);

const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
const positionLocation = gl.getAttribLocation(program, 'position');
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

const uniformNames = [
  'time', 'resolution', 'seed', 'timeScale', 'patternAmp', 'patternFreq',
  'bloomStrength', 'saturation', 'grainAmount', 'colorTint', 'minCircleSize',
  'circleStrength', 'distortX', 'distortY', 'halftoneAmount', 'halftoneScale',
  'rgbScreenShift', 'iridescence', 'colorCycles', 'fieldZoom', 'fieldRotation',
  'fieldOffsetX', 'fieldOffsetY', 'flowStrength', 'contrast', 'exposure',
  'paletteShift', 'inkBalance', 'halftoneThreshold', 'halftoneAngle',
];
const uniforms = Object.fromEntries(uniformNames.map(name => [name, gl.getUniformLocation(program, name)]));

function formatValue(value, step) {
  const decimals = step < 0.01 ? 3 : step < 0.1 ? 2 : step < 1 ? 1 : 0;
  return Number(value).toFixed(decimals);
}

function buildInterface() {
  const presetList = document.getElementById('preset-list');
  Object.entries(PRESETS).forEach(([id, preset]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'preset-button';
    button.dataset.preset = id;
    button.style.setProperty('--swatch', preset.swatch);
    button.innerHTML = `<b>${preset.label}</b><small>${preset.note}</small>`;
    button.addEventListener('click', () => applyPreset(id));
    presetList.appendChild(button);
  });

  const groupsRoot = document.getElementById('control-groups');
  CONTROL_GROUPS.forEach(group => {
    const section = document.createElement('section');
    section.className = 'control-group';
    const details = document.createElement('details');
    details.open = group.open;
    details.innerHTML = `<summary><span class="group-index">${group.index}</span><strong>${group.label}</strong></summary><div class="controls-body"></div>`;
    const body = details.querySelector('.controls-body');

    group.controls.forEach(([key, label, min, max, step]) => {
      const row = document.createElement('div');
      row.className = 'control-row';
      const valueId = `${key}-value`;
      row.innerHTML = `<label for="${key}-control">${label}</label><input id="${key}-control" type="range" min="${min}" max="${max}" step="${step}" value="${params[key]}"><output id="${valueId}" class="control-value">${formatValue(params[key], step)}</output>`;
      const input = row.querySelector('input');
      const output = row.querySelector('output');
      input.addEventListener('input', () => {
        params[key] = Number(input.value);
        updateRange(input);
        output.value = formatValue(params[key], step);
        activePresetId = 'custom';
        updateInterfaceState();
        updateUniforms();
        persistState();
      });
      controlInputs.set(key, { input, output, step });
      body.appendChild(row);
    });

    section.appendChild(details);
    groupsRoot.appendChild(section);
  });

  document.querySelectorAll('[data-format]').forEach(button => {
    button.addEventListener('click', () => setFormat(button.dataset.format));
  });
  document.getElementById('seed-input').addEventListener('change', event => setSeed(event.target.value));
  document.getElementById('seed-prev').addEventListener('click', () => setSeed(randomSeed - 1));
  document.getElementById('seed-next').addEventListener('click', () => setSeed(randomSeed + 1));
  document.getElementById('nudge-button').addEventListener('click', runLottery);
  document.getElementById('save-parameters-button').addEventListener('click', () => saveCurrentParameters());
  document.getElementById('reset-button').addEventListener('click', resetCurrentPreset);
  document.getElementById('copy-button').addEventListener('click', copyParameters);
  document.getElementById('import-parameters-button').addEventListener('click', importParameterJSON);
  document.getElementById('saved-recipes').addEventListener('click', handleSavedRecipeAction);
  document.getElementById('randomizeBtn').addEventListener('click', randomizeSeed);
  document.getElementById('playPauseBtn').addEventListener('click', togglePlayPause);
  document.getElementById('saveBtn').addEventListener('click', saveImage);
  document.getElementById('exportVideoBtn').addEventListener('click', () => {
    toggleVideoRecord();
  });
  document.getElementById('zen-mode-button').addEventListener('click', toggleZenMode);
  restoreSavedRecipes();
  renderSavedRecipes();
}

function updateRange(input) {
  const min = Number(input.min);
  const max = Number(input.max);
  const progress = ((Number(input.value) - min) / (max - min)) * 100;
  input.style.setProperty('--range-progress', `${progress}%`);
}

function syncControls() {
  controlInputs.forEach(({ input, output, step }, key) => {
    input.value = params[key];
    output.value = formatValue(params[key], step);
    updateRange(input);
  });
}

function updateInterfaceState() {
  const preset = PRESETS[activePresetId];
  document.getElementById('active-preset').textContent = preset ? preset.label.toUpperCase() : customMixLabel;
  document.getElementById('seed-readout').textContent = `SEED ${randomSeed}`;
  document.getElementById('seed-input').value = randomSeed;
  document.querySelectorAll('[data-preset]').forEach(button => button.classList.toggle('active', button.dataset.preset === activePresetId));
}

function updateUniforms() {
  gl.uniform1f(uniforms.timeScale, params.timeScale);
  gl.uniform1f(uniforms.patternAmp, params.patternAmp);
  gl.uniform1f(uniforms.patternFreq, params.patternFreq);
  gl.uniform1f(uniforms.bloomStrength, params.bloomStrength);
  gl.uniform1f(uniforms.saturation, params.saturation);
  gl.uniform1f(uniforms.grainAmount, params.grainAmount);
  gl.uniform3f(uniforms.colorTint, params.colorTintR, params.colorTintG, params.colorTintB);
  gl.uniform1f(uniforms.minCircleSize, params.minCircleSize);
  gl.uniform1f(uniforms.circleStrength, params.circleStrength);
  gl.uniform1f(uniforms.distortX, params.distortX);
  gl.uniform1f(uniforms.distortY, params.distortY);
  gl.uniform1f(uniforms.halftoneAmount, params.halftoneAmount);
  gl.uniform1f(uniforms.halftoneScale, params.halftoneScale);
  gl.uniform1f(uniforms.rgbScreenShift, params.rgbScreenShift);
  gl.uniform1f(uniforms.iridescence, params.iridescence);
  gl.uniform1f(uniforms.colorCycles, params.colorCycles);
  gl.uniform1f(uniforms.fieldZoom, params.fieldZoom);
  gl.uniform1f(uniforms.fieldRotation, params.fieldRotation);
  gl.uniform1f(uniforms.fieldOffsetX, params.fieldOffsetX);
  gl.uniform1f(uniforms.fieldOffsetY, params.fieldOffsetY);
  gl.uniform1f(uniforms.flowStrength, params.flowStrength);
  gl.uniform1f(uniforms.contrast, params.contrast);
  gl.uniform1f(uniforms.exposure, params.exposure);
  gl.uniform1f(uniforms.paletteShift, params.paletteShift);
  gl.uniform1f(uniforms.inkBalance, params.inkBalance);
  gl.uniform1f(uniforms.halftoneThreshold, params.halftoneThreshold);
  gl.uniform1f(uniforms.halftoneAngle, params.halftoneAngle);
}

function updateCanvasSize() {
  canvas.width = Math.round(params.canvasWidth / 4) * 4;
  canvas.height = Math.round(params.canvasHeight / 4) * 4;
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
  if (!isPlaying) drawScene();
}

function setFormat(format) {
  const size = FORMAT_SIZES[format];
  if (!size) return;
  [params.canvasWidth, params.canvasHeight] = size;
  document.querySelectorAll('[data-format]').forEach(button => button.classList.toggle('active', button.dataset.format === format));
  updateCanvasSize();
  persistState();
}

function syncFormatButtons() {
  const match = Object.entries(FORMAT_SIZES).find(([, [width, height]]) => width === params.canvasWidth && height === params.canvasHeight);
  document.querySelectorAll('[data-format]').forEach(button => button.classList.toggle('active', Boolean(match) && button.dataset.format === match[0]));
}

function setSeed(value) {
  randomSeed = Math.max(0, Math.min(99999, Math.round(Number(value) || 0)));
  gl.uniform1f(uniforms.seed, randomSeed);
  timeOffset = performance.now();
  pausedAt = 0;
  updateInterfaceState();
  persistState();
  if (!isPlaying) drawScene();
}

function applyPreset(id) {
  const preset = PRESETS[id];
  if (!preset) return;
  activePresetId = id;
  resetPresetId = id;
  customMixLabel = 'CUSTOM MIX';
  const canvasWidth = params.canvasWidth;
  const canvasHeight = params.canvasHeight;
  Object.assign(params, preset.values, { canvasWidth, canvasHeight });
  setSeed(preset.seed);
  syncControls();
  updateUniforms();
  updateCanvasSize();
  updateInterfaceState();
  persistState();
}

function resetCurrentPreset() {
  applyPreset(PRESETS[resetPresetId] ? resetPresetId : 'iris');
  showToast('已恢复配方');
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function clampParameter(key, value) {
  const control = CONTROL_GROUPS.flatMap(group => group.controls).find(([controlKey]) => controlKey === key);
  if (!control) return value;
  return Math.max(control[2], Math.min(control[3], value));
}

function runLottery() {
  const profileCandidates = LOTTERY_PROFILES.filter(profile => profile.id !== lastLotteryProfileId);
  const profile = profileCandidates[Math.floor(Math.random() * profileCandidates.length)];
  const baseCandidates = profile.bases.filter(id => id !== resetPresetId);
  const baseId = baseCandidates[Math.floor(Math.random() * baseCandidates.length)] || profile.bases[0];
  const preset = PRESETS[baseId];
  const canvasWidth = params.canvasWidth;
  const canvasHeight = params.canvasHeight;
  Object.assign(params, preset.values, { canvasWidth, canvasHeight });

  Object.entries(profile.ranges).forEach(([key, [min, max]]) => {
    params[key] = clampParameter(key, randomBetween(min, max));
  });

  params.fieldRotation = randomBetween(-3.14, 3.14);
  params.fieldOffsetX = randomBetween(-0.85, 0.85);
  params.fieldOffsetY = randomBetween(-0.85, 0.85);
  params.paletteShift = Math.random();
  params.halftoneAngle = randomBetween(-1.57, 1.57);

  activePresetId = 'custom';
  resetPresetId = baseId;
  lastLotteryProfileId = profile.id;
  customMixLabel = `LOTTERY / ${profile.label}`;
  let nextSeed = Math.floor(Math.random() * 100000);
  if (nextSeed === randomSeed) nextSeed = (nextSeed + 1) % 100000;
  setSeed(nextSeed);
  syncControls();
  updateUniforms();
  updateInterfaceState();
  persistState();
  showToast(`抽中 ${profile.note} · ${nextSeed}`);
}

function persistState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ params, seed: randomSeed, preset: activePresetId, resetPreset: resetPresetId, customLabel: customMixLabel }));
  } catch (_) { /* file mode can deny storage in hardened browsers */ }
}

function restoreState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || !saved.params) return false;
    Object.assign(params, DEFAULTS, saved.params);
    randomSeed = Number.isFinite(saved.seed) ? saved.seed : 937;
    activePresetId = saved.preset || 'custom';
    resetPresetId = PRESETS[saved.resetPreset] ? saved.resetPreset : (PRESETS[activePresetId] ? activePresetId : 'iris');
    customMixLabel = saved.customLabel || 'CUSTOM MIX';
    return true;
  } catch (_) {
    return false;
  }
}

function restoreSavedRecipes() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVED_PARAMETERS_KEY));
    savedRecipes = Array.isArray(saved) ? saved.slice(0, MAX_SAVED_PARAMETERS) : [];
  } catch (_) {
    savedRecipes = [];
  }
}

function persistSavedRecipes() {
  try {
    localStorage.setItem(SAVED_PARAMETERS_KEY, JSON.stringify(savedRecipes));
  } catch (_) {
    showToast('浏览器无法保存参数');
  }
}

function currentParameterLabel() {
  const preset = PRESETS[activePresetId];
  if (preset) return preset.label.toUpperCase();
  return customMixLabel.replace('LOTTERY / ', '') || 'CUSTOM MIX';
}

function saveCurrentParameters(labelOverride = '') {
  const record = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    label: labelOverride || currentParameterLabel(),
    seed: randomSeed,
    params: { ...params },
  };
  savedRecipes.unshift(record);
  savedRecipes = savedRecipes.slice(0, MAX_SAVED_PARAMETERS);
  persistSavedRecipes();
  renderSavedRecipes();
  document.getElementById('archive-details').open = true;
  showToast(`已保存 SEED ${randomSeed}`);
  return record;
}

function renderSavedRecipes() {
  const root = document.getElementById('saved-recipes');
  const count = document.getElementById('saved-count');
  if (!root || !count) return;
  count.textContent = String(savedRecipes.length);
  root.replaceChildren();

  if (!savedRecipes.length) {
    const empty = document.createElement('p');
    empty.className = 'saved-empty';
    empty.textContent = '还没有存档。点击底部“保存”，收藏当前效果。';
    root.appendChild(empty);
    return;
  }

  savedRecipes.forEach((record, index) => {
    const item = document.createElement('article');
    item.className = 'saved-recipe';

    const loadButton = document.createElement('button');
    loadButton.type = 'button';
    loadButton.className = 'saved-recipe-load';
    loadButton.dataset.archiveAction = 'load';
    loadButton.dataset.archiveId = record.id;

    const title = document.createElement('b');
    title.textContent = `${String(index + 1).padStart(2, '0')} / ${record.label || 'SAVED'}`;
    const meta = document.createElement('span');
    meta.textContent = `SEED ${record.seed}`;
    const size = document.createElement('small');
    size.textContent = `${record.params?.canvasWidth || 1080} × ${record.params?.canvasHeight || 1350}`;
    loadButton.append(title, meta, size);

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'saved-recipe-delete';
    deleteButton.dataset.archiveAction = 'delete';
    deleteButton.dataset.archiveId = record.id;
    deleteButton.setAttribute('aria-label', `删除 ${record.label || '参数存档'}`);
    deleteButton.textContent = '×';

    item.append(loadButton, deleteButton);
    root.appendChild(item);
  });
}

function normalizeParameterSnapshot(source) {
  if (!source || typeof source !== 'object') throw new Error('Invalid parameter data');
  const payload = source.params && typeof source.params === 'object'
    ? { ...source.params, seed: source.seed ?? source.params.seed }
    : source;
  const hasKnownParameter = Object.keys(DEFAULTS).some(key => Number.isFinite(Number(payload[key])));
  if (!hasKnownParameter) throw new Error('No supported parameters');

  const normalizedParams = { ...DEFAULTS };
  Object.keys(DEFAULTS).forEach(key => {
    const value = Number(payload[key]);
    if (!Number.isFinite(value)) return;
    if (key === 'canvasWidth' || key === 'canvasHeight') {
      normalizedParams[key] = Math.max(256, Math.min(4096, Math.round(value)));
    } else {
      normalizedParams[key] = clampParameter(key, value);
    }
  });

  const seedValue = Number(payload.seed ?? source.seed);
  const normalizedSeed = Math.max(0, Math.min(99999, Math.round(Number.isFinite(seedValue) ? seedValue : randomSeed)));
  return { seed: normalizedSeed, params: normalizedParams };
}

function applyParameterSnapshot(source, label = 'SAVED MIX') {
  const snapshot = normalizeParameterSnapshot(source);
  Object.assign(params, snapshot.params);
  activePresetId = 'custom';
  customMixLabel = label;
  setSeed(snapshot.seed);
  syncControls();
  syncFormatButtons();
  updateUniforms();
  updateCanvasSize();
  updateInterfaceState();
  persistState();
}

function handleSavedRecipeAction(event) {
  const button = event.target.closest('[data-archive-action]');
  if (!button) return;
  const record = savedRecipes.find(item => item.id === button.dataset.archiveId);
  if (!record) return;

  if (button.dataset.archiveAction === 'load') {
    applyParameterSnapshot(record, `SAVED / ${record.label || 'MIX'}`);
    showToast(`已载入 SEED ${record.seed}`);
    return;
  }

  savedRecipes = savedRecipes.filter(item => item.id !== record.id);
  persistSavedRecipes();
  renderSavedRecipes();
  showToast('存档已删除');
}

function importParameterJSON() {
  const input = document.getElementById('parameter-json');
  const raw = input.value.trim();
  if (!raw) {
    showToast('请先粘贴参数 JSON');
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    applyParameterSnapshot(parsed, 'IMPORTED MIX');
    saveCurrentParameters('IMPORTED');
    input.value = '';
  } catch (_) {
    showToast('JSON 格式或参数无效');
  }
}

async function copyParameters() {
  const text = JSON.stringify({ seed: randomSeed, ...params }, null, 2);
  try {
    await navigator.clipboard.writeText(text);
  } catch (_) {
    const area = document.createElement('textarea');
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
  showToast('参数已复制');
}

function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1700);
}

function togglePlayPause() {
  const button = document.getElementById('playPauseBtn');
  if (isPlaying) {
    cancelAnimationFrame(animationID);
    pausedAt = time;
    isPlaying = false;
    button.querySelector('.action-icon').textContent = '▶';
    button.querySelector('b').textContent = '播放';
  } else {
    timeOffset = performance.now() - pausedAt;
    isPlaying = true;
    animationID = requestAnimationFrame(render);
    button.querySelector('.action-icon').textContent = 'Ⅱ';
    button.querySelector('b').textContent = '暂停';
  }
}

if (typeof reducedMotionQuery.addEventListener === 'function') {
  reducedMotionQuery.addEventListener('change', event => {
    if (event.matches && isPlaying) togglePlayPause();
  });
}

function toggleZenMode() {
  const isZen = document.body.classList.toggle('zen');
  const button = document.getElementById('zen-mode-button');
  button.setAttribute('aria-pressed', String(isZen));
  button.setAttribute('title', isZen ? '退出专注模式 (Z)' : '专注模式 (Z)');
  button.querySelector('.action-icon').textContent = isZen ? '×' : '⌗';
  button.querySelector('b').textContent = isZen ? '退出专注' : '专注';
}

function startFromZeroTime() {
  timeOffset = performance.now();
  pausedAt = 0;
  if (!isPlaying) togglePlayPause();
}

function refreshPattern() {
  randomizeSeed();
}

function randomizeSeed() {
  let nextSeed = Math.floor(Math.random() * 100000);
  if (nextSeed === randomSeed) nextSeed = (nextSeed + 1) % 100000;
  setSeed(nextSeed);
  showToast(`种子 ${nextSeed}`);
}

function randomizeInputs() {
  runLottery();
}

function drawScene() {
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function render(timestamp) {
  if (!isPlaying) return;
  time = timestamp - timeOffset;
  gl.uniform1f(uniforms.time, time * 0.001);
  gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);

  frameCount += 1;
  if (timestamp - lastFpsTime >= 600) {
    const fps = Math.round(frameCount * 1000 / (timestamp - lastFpsTime));
    document.getElementById('fpsIndicator').textContent = `FPS ${fps}`;
    frameCount = 0;
    lastFpsTime = timestamp;
  }

  if (typeof recordVideoState === 'undefined' || !recordVideoState || useMobileRecord) drawScene();
  animationID = requestAnimationFrame(render);
}

window.addEventListener('keydown', event => {
  if (event.target.matches('input')) return;
  if (event.code === 'Space') { event.preventDefault(); togglePlayPause(); }
  if (event.code === 'KeyR' && !event.repeat) refreshPattern();
  if (event.code === 'KeyS') saveImage();
  if (event.code === 'KeyV') toggleVideoRecord();
  if (event.code === 'KeyT') startFromZeroTime();
  if (event.code === 'KeyZ') toggleZenMode();
});

buildInterface();
restoreState();
syncControls();
syncFormatButtons();
updateInterfaceState();
updateCanvasSize();
gl.uniform1f(uniforms.seed, randomSeed);
updateUniforms();
syncPlayPauseButton();
if (isPlaying) animationID = requestAnimationFrame(render);
else drawScene();

window.params = params;
window.applyPreset = applyPreset;
window.setSeed = setSeed;
