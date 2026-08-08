/* Formula Lab Shell v2.0.0 — fixed interaction components, no runtime dependency. */
(() => {
  'use strict';

  const copy = Object.freeze({
    allProjects: '全部实验',
    collapsePanel: '收起参数面板',
    expandPanel: '展开参数面板',
    importImage: '导入图像',
    randomize: '随机配方',
    save: '保存配方',
    reset: '重置',
    export: '导出 PNG',
    ready: '就绪'
  });

  const create = Object.freeze({
    section: ({ number, title, content }) => `<section class="lab-section" aria-labelledby="lab-section-${number}"><div class="lab-section__heading"><span>${number}</span><h2 id="lab-section-${number}">${title}</h2></div>${content}</section>`,
    action: ({ label, hint = '', accent = false, id = '' }) => `<button${id ? ` id="${id}"` : ''} class="lab-action${accent ? ' lab-action--accent' : ''}" type="button"><span>${label}</span>${hint ? `<small>${hint}</small>` : ''}</button>`,
    stageLink: () => '<a class="lab-stage__id lab-gallery-link" href="../../" aria-label="返回全部实验"><i></i><span>全部实验</span></a>'
  });

  function panelState(root = document) {
    const body = root.body || document.body;
    const panel = root.getElementById ? root.getElementById('control-panel') : document.getElementById('control-panel');
    const toggle = root.querySelector ? root.querySelector('[data-lab-panel-toggle]') : document.querySelector('[data-lab-panel-toggle]');
    return { body, panel, toggle };
  }

  function setPanelCollapsed(collapsed, root = document) {
    const { body, toggle } = panelState(root);
    if (!body || !toggle) return false;
    body.classList.toggle('panel-collapsed', collapsed);
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.setAttribute('aria-label', collapsed ? copy.expandPanel : copy.collapsePanel);
    const icon = toggle.querySelector('span');
    if (icon) icon.textContent = collapsed ? '→' : '←';
    window.dispatchEvent(new CustomEvent('formula-lab:panel', { detail: { collapsed } }));
    return true;
  }

  function mountSegmented(group) {
    const buttons = [...group.querySelectorAll('button')];
    if (!buttons.length || group.dataset.labMounted) return;
    group.dataset.labMounted = 'true';
    group.setAttribute('role', 'group');
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.classList.contains('active'))));
    group.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button || !group.contains(button)) return;
      buttons.forEach(item => {
        const active = item === button;
        item.classList.toggle('active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      group.dispatchEvent(new CustomEvent('formula-lab:segmented', { bubbles: true, detail: { value: button.dataset.value || button.value || button.textContent.trim() } }));
    });
  }

  function mountCopy(root) {
    root.querySelectorAll('[data-lab-copy]').forEach(node => {
      const value = copy[node.dataset.labCopy];
      if (value) node.textContent = value;
    });
  }

  function audit(root = document) {
    const required = [
      ['.lab-app', '页面根节点缺少 .lab-app'],
      ['#control-panel.lab-panel', '缺少固定参数面板 #control-panel.lab-panel'],
      ['[data-lab-panel-toggle]', '缺少参数面板收起按钮'],
      ['.lab-stage', '缺少固定作品舞台 .lab-stage']
    ];
    const issues = required.filter(([selector]) => !root.querySelector(selector)).map(([, message]) => message);
    return Object.freeze({ valid: issues.length === 0, issues });
  }

  function mount(root = document) {
    const { body, panel, toggle } = panelState(root);
    if (!body || !panel || !toggle || body.dataset.labMounted) return audit(root);
    body.dataset.labMounted = 'true';
    toggle.addEventListener('click', () => setPanelCollapsed(!body.classList.contains('panel-collapsed'), root));
    toggle.setAttribute('aria-label', copy.collapsePanel);
    root.querySelectorAll('.lab-segmented').forEach(mountSegmented);
    mountCopy(root);
    root.addEventListener('keydown', event => {
      if (event.key === 'Escape' && window.matchMedia('(max-width: 760px)').matches && !body.classList.contains('panel-collapsed')) setPanelCollapsed(true, root);
    });
    const report = audit(root);
    body.dataset.labReady = report.valid ? 'true' : 'false';
    window.dispatchEvent(new CustomEvent('formula-lab:ready', { detail: report }));
    return report;
  }

  window.FormulaLabShell = Object.freeze({ version: '2.0.0', copy, create, mount, audit, setPanelCollapsed, isPanelCollapsed: () => document.body.classList.contains('panel-collapsed') });
  mount();
})();
