/* Formula Lab Gallery v2.0.0 — renders fixed gallery components from project data. */
(() => {
  'use strict';
  const projects = window.FormulaLabProjects || [];
  const root = document.querySelector('[data-lab-gallery]');
  const hero = document.querySelector('[data-lab-hero]');
  const count = document.querySelector('[data-lab-project-count]');
  if (!root || !projects.length) return;

  const pathFor = project => `${project.number}-${project.slug}`;
  const toolFor = project => `${pathFor(project)}/template/`;
  const sourceFor = project => `https://github.com/FANzR-arch/Phil-aesthetic-formulas/tree/main/${pathFor(project)}`;
  const make = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  };
  const image = project => {
    const img = document.createElement('img');
    img.src = project.preview;
    img.alt = `${project.title} 作品预览`;
    img.width = project.width;
    img.height = project.height;
    img.loading = 'lazy';
    return img;
  };
  const link = (href, className, label) => {
    const anchor = make('a', className, label);
    anchor.href = href;
    return anchor;
  };
  const projectCard = (project, index) => {
    const article = make('article', `lab-gallery-card${project.featured ? ' lab-gallery-card--featured' : ''}`);
    const copy = make('div', 'lab-gallery-card__copy');
    const top = make('div', 'lab-gallery-card__top');
    top.append(make('span', 'lab-gallery-card__number', `FORMULA / ${project.number}`));
    top.append(make('span', project.featured ? 'lab-badge lab-badge--accent' : 'lab-badge', project.featured ? '最新' : project.kind));
    const title = make('h3', '', project.title);
    const description = make('p', '', project.description);
    const actions = make('div', 'lab-gallery-card__actions');
    actions.append(link(toolFor(project), 'lab-gallery-action lab-gallery-action--primary', '打开工具'));
    actions.append(link(sourceFor(project), 'lab-gallery-action', '项目说明'));
    actions.append(make('span', 'lab-gallery-card__key', `快捷键 ${index + 1}`));
    copy.append(top, title, description, actions);
    const media = link(toolFor(project), 'lab-gallery-card__media', '');
    media.setAttribute('aria-label', `打开 ${project.title}`);
    media.setAttribute('aria-keyshortcuts', String(index + 1));
    media.append(image(project));
    article.append(copy, media);
    return article;
  };

  projects.forEach((project, index) => root.append(projectCard(project, index)));
  if (count) count.textContent = `共 ${projects.length} 个实验 · 从最新一期开始浏览`;
  if (hero) {
    projects.slice(0, 3).forEach(project => {
      const anchor = link(toolFor(project), 'lab-gallery-hero__item', '');
      anchor.setAttribute('aria-label', `打开 ${project.title}`);
      anchor.append(image(project));
      hero.append(anchor);
    });
  }
  addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    const project = projects[Number(event.key) - 1];
    if (project) location.href = toolFor(project);
  });
})();
