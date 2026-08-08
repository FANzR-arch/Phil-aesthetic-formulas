# Formula Lab UI Kit v3.0

这是本仓库唯一的 UI 源码，不是给页面在线依赖的全局框架。每期发布时，
`ui-shell.css`、`ui-shell.js`、`lab-tokens.css` 和 `v3-shell.css` 都会复制到该期的
`template/`，因此下载单期文件夹、GitHub Pages 子路径和 `file://` 都可靠。

## 固定组件

| 组件 | 固定职责 | 可变内容 |
| --- | --- | --- |
| `lab-panel` | 参数面板、收起行为、移动端底部面板 | 宽度、颜色、标题、说明 |
| `lab-section` | 参数分组与编号 | 组数、组名、控件 |
| `lab-field` / `lab-control-row` / `lab-check` | 输入、滑杆、勾选控件 | 字段名称、范围、默认值 |
| `lab-segmented` | 互斥选项与状态 | 选项内容 |
| `lab-panel__actions` + `lab-action` | 底部高频动作 | 具体事件与辅助说明 |
| `lab-stage` | 作品区、状态栏、返回入口 | 画布、作品视觉、状态 |
| `lab-dialog` | 标准弹窗、焦点管理、Esc 与遮罩关闭 | 弹窗内容与项目专用导出逻辑 |
| `gallery.js` | 画廊卡片与首屏缩略图 | `projects.js` 的项目数据 |

## 固定交互契约

- 项目只覆盖主题变量、字体和作品舞台，不重写面板、字段、按钮、弹窗、通知或移动端折叠行为。
- `lab-panel__actions` 是唯一底部操作区；两列或三列使用 `lab-panel__actions--two-up` / `lab-panel__actions--three-up`，窄屏三列自动回落为两列。
- 弹窗使用 `data-lab-dialog`、`hidden`、`aria-labelledby`，由 `FormulaLabShell.openDialog()` 与 `closeDialog()` 管理。
- UI 动效固定在 token 中：抽屉 `240ms`，反馈 `160–180ms`，只使用 `transform` / `opacity`；作品引擎自行决定视觉效果但必须支持暂停与减弱动态。

新增工具从 `_template/` 开始；不要从旧期复制其内联控件样式。作品本身可以
覆盖颜色、字体、画布比例和舞台视觉，但不要改变上述组件的层级、焦点样式和
移动端收起逻辑。

`v3-shell.css` 固定标题层级、控件节奏、单行数值、选中/悬浮状态、画板缩放与
坐标网格。`v3-normalize.js` 只用于 005、006 这类旧结构适配，新项目不得依赖它；
新项目必须直接使用标准组件类。完整验收规则见仓库根目录的 `UI_SHELL.md`。

## 日常操作

```powershell
# 新一期自动带 v3 本地快照
.\tools\new-issue.ps1 -Number 9 -Slug example -Title "示例工具"

# 明确要升级已发布工具时，才同步全部本地快照
.\tools\sync-lab-shell.ps1 -All

# 验收固定结构和运行时文件
.\tools\check-lab-ui.ps1 -Strict
```

## 开源基础

`lab-tokens.css` 本地保留了 [Open Props](https://github.com/argyleink/open-props)
的一小组 spacing / easing token（MIT），并由 Shell 与画廊共同使用。完整声明在
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)。没有 CDN、npm 安装或运行时依赖。
