(function normalizeFormulaLabLegacyControls() {
  function run() {
    const root = document.querySelector('.app-controls');
    if (!root || root.dataset.v3Normalized === 'true') return;
    root.dataset.v3Normalized = 'true';

    const firstGroupTitle = document.body.dataset.v3FirstGroup;
    const firstControl = root.querySelector(':scope > .ctl, :scope > .lab-field');
    if (firstGroupTitle && firstControl) {
      const heading = document.createElement('div');
      heading.className = 'grp v3-injected-group';
      heading.textContent = firstGroupTitle;
      root.insertBefore(heading, firstControl);
    }

    root.querySelectorAll(':scope > .grp').forEach((heading, index) => {
      heading.dataset.v3Index = String(index + 1).padStart(2, '0');
    });

    root.querySelectorAll(':scope > .ctl').forEach(control => {
      const range = control.querySelector(':scope > input[type="range"]');
      const label = control.querySelector(':scope > label');
      if (!range || !label) return;

      const output = label.querySelector('output');
      control.classList.add('v3-range-row');
      if (output) control.append(output);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
})();
