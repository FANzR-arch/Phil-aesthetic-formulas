# Formula Lab Shell v1

Formula Lab Shell 是本仓库所有交互型审美工具的统一外壳。它固定操作习惯，不固定作品风格。

## 文件结构

每一期的 `template/` 都保留自己的完整快照：

```text
template/
├─ index.html
├─ ui-shell.css
├─ ui-shell.js
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

Shell 脚本只负责面板展开与收起，并对外提供：

```js
FormulaLabShell.setPanelCollapsed(true);
FormulaLabShell.isPanelCollapsed();
```

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

脚本会复制 `_template/`，因此新项目自动带上当前 Shell 版本。

旧项目默认冻结。需要升级时，把 `_template/template/ui-shell.css` 和 `ui-shell.js` 复制到目标项目，再检查桌面、手机、面板收起和项目核心交互；不要批量静默覆盖所有已发布项目。

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
