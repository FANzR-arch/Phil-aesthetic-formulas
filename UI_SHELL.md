# Formula Lab UI Kit v2.1

Formula Lab UI Kit 是本仓库所有交互型审美工具的统一组件包。它固定操作习惯、控件层级、响应式行为和用语，不固定作品风格。

唯一源码在 [`tools/formula-lab/`](tools/formula-lab/README.md)。其中的 `lab-tokens.css` 本地采用 Open Props 的小型 MIT token 子集，保证间距和动效节奏一致，同时不引入 CDN 或构建依赖。

## 文件结构

每一期的 `template/` 都保留自己的完整快照：

```text
template/
├─ index.html
├─ ui-shell.css
├─ ui-shell.js
├─ lab-tokens.css
└─ 本期引擎与素材文件
```

页面不从仓库根目录加载共享 CSS/JS，也不使用 CDN。发布后的旧作品不会因为 Shell 后续升级而被意外改变。

## 页面契约

最小结构如下：

```html
<body class="lab-app">
  <aside class="lab-panel" id="control-panel">…</aside>

  <button class="lab-panel-toggle"
          data-lab-panel-toggle
          aria-controls="control-panel"
          aria-expanded="true">
    <span aria-hidden="true">←</span>
  </button>

  <main class="lab-stage">…</main>
  <script src="ui-shell.js"></script>
</body>
```

稳定组件：

- `.lab-panel__header`：期数、标题与一句话说明
- `.lab-panel__scroll`：可滚动参数区
- `.lab-section`、`.lab-section__heading`：编号参数分组
- `.lab-field`、`.lab-control-row`、`.lab-check`、`.lab-segmented`：通用控件
- `.lab-panel__actions`、`.lab-action`：固定底部动作区
- `.lab-stage__header`、`.lab-stage__body`：画布状态与作品区域

固定组件的详细职责和可变边界见 [`tools/formula-lab/README.md`](tools/formula-lab/README.md)。画廊不再手写重复卡片，而从 `tools/formula-lab/projects.js` 的项目数据渲染。

Shell 脚本只负责面板展开与收起，并对外提供：

```js
FormulaLabShell.setPanelCollapsed(true);
FormulaLabShell.isPanelCollapsed();
FormulaLabShell.openDialog('export-dialog');
FormulaLabShell.closeDialog('export-dialog');
```

## 固定动效与弹窗契约

- `.lab-panel__actions` 是唯一底部操作区；两列或三列操作使用 `.lab-panel__actions--two-up` / `.lab-panel__actions--three-up`，项目内不得重写按钮网格。
- `.lab-dialog` 与 `.lab-dialog__surface` 是唯一弹窗结构，必须带 `data-lab-dialog`、`hidden` 和 `aria-labelledby`。
- 抽屉只使用 `transform`，统一 `240ms var(--lab-ease-drawer)`；点击与颜色反馈统一 `160–180ms`。
- hover 位移只允许在 `(hover: hover) and (pointer: fine)` 下出现。减弱动态时取消位移和持续运动，但保留必要的颜色与透明度反馈。

## 主题变量

每一期可以在自己的样式中覆盖：

```css
:root {
  --lab-paper: oklch(95.2% .012 92);
  --lab-panel: oklch(97.4% .009 92);
  --lab-ink: oklch(20% .012 92);
  --lab-accent: oklch(89% .205 120);
  --lab-stage-bg: oklch(16% .01 92);
  --lab-panel-width: 360px;
  --lab-font-display: Georgia, "Songti SC", serif;
}
```

不要覆盖通用焦点样式、44px 触控目标、移动端底部面板和 `panel-collapsed` 行为，除非本期有经过验证的特殊需求。

## 新建与升级

新建一期仍使用：

```powershell
tools/new-issue.ps1 -Number 8 -Slug example -Title "示例工具"
```

脚本会复制 `_template/`，因此新项目自动带上当前 UI Kit 本地快照。

旧项目默认冻结。需要升级时，从唯一源码显式同步，再检查桌面、手机、面板收起和项目核心交互：

```powershell
.\tools\sync-lab-shell.ps1 -Issue 008-ascii-signal
.\tools\check-lab-ui.ps1 -Strict
```

需要统一升级全部已发布工具时才使用 `-All`；不要批量静默覆盖。

## 部署到个人网站

直接放在任意子目录即可，例如：

```text
https://example.com/labs/005-typographic-portrait/template/
```

所有资源都使用相对路径，所以域名、网站框架和子目录深度不会影响运行。不要添加指向站点根目录的 `<base href="/">`。

如果个人网站已有自己的导航和全局 CSS，优先用 `iframe` 嵌入，隔离双方样式：

```html
<iframe
  src="/labs/005-typographic-portrait/template/"
  title="文字肖像生成器"
  loading="lazy"
  allow="clipboard-write"
  style="width:100%;height:100dvh;border:0">
</iframe>
```

也可以把它作为独立全屏路由直接打开。Shell 默认占满视口，适合 `/labs/...` 这类工具页面；若必须与网站页头共存，再由网站路由层分配剩余高度。

## 发布前检查

- 本地 HTTP 与双击 `file://` 都能打开
- 桌面端面板可收起，画布能扩展
- 390px 宽度下参数面板位于底部且可收起
- 键盘焦点清晰，按钮和控件可操作
- 控制台没有资源 404 或脚本错误
- 项目目录单独复制到其他子目录后仍能运行
