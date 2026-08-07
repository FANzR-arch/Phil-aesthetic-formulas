/* Formula Lab Shell v1.0 — shared shell behavior only. */
(() => {
  'use strict';

  const body = document.body;
  const panel = document.getElementById('control-panel');
  const toggle = document.querySelector('[data-lab-panel-toggle]');
  if (!body || !panel || !toggle) return;

  const isNarrow = () => window.matchMedia('(max-width: 760px)').matches;

  function setPanelCollapsed(collapsed) {
    body.classList.toggle('panel-collapsed', collapsed);
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.setAttribute('aria-label', collapsed ? '展开参数面板' : '收起参数面板');
    const icon = toggle.querySelector('span');
    if (icon) icon.textContent = collapsed ? '→' : '←';
    window.dispatchEvent(new CustomEvent('formula-lab:panel', { detail: { collapsed } }));
  }

  toggle.addEventListener('click', () => setPanelCollapsed(!body.classList.contains('panel-collapsed')));
  toggle.setAttribute('aria-label', '收起参数面板');

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && isNarrow() && !body.classList.contains('panel-collapsed')) {
      setPanelCollapsed(true);
    }
  });

  window.FormulaLabShell = Object.freeze({
    setPanelCollapsed,
    isPanelCollapsed: () => body.classList.contains('panel-collapsed')
  });
})();
