# 审美分享+复刻

我是 [阿哲Phil](https://x.com/Formulasearch)，每天在 X 上发一期「审美分享」：一个具体的审美问题，一条可复用的解法。

这个仓库把其中选中的期数复刻成两类资产：

| 类型 | 是什么 | 适合的期数 |
|---|---|---|
| **Skill** | 给 Claude 用的风格编译器：把一种视觉风格拆成确定性模块，输入主题即输出成品提示词 | 生图风格类（故障艺术、文字肖像……） |
| **代码模板** | 单文件、零构建的 HTML/CSS/JS 实现，双击即开，改改就能用 | 界面交互类、排版布局类 |

## 目录

| 期数 | 主题 | 类型 | 拿走 | 原帖 |
|---|---|---|---|---|
| 05 | [故障艺术 × 文字肖像](005-typographic-portrait/) | 代码模板 + 可嵌入引擎 | [在线玩](https://fanzr-arch.github.io/Phil-aesthetic-formulas/005-typographic-portrait/template/) | [X](https://x.com/Formulasearch) |
| 06 | [模块网格拼贴海报](006-grid-collage-poster/) | 代码模板 + 可嵌入引擎 | [在线玩](https://fanzr-arch.github.io/Phil-aesthetic-formulas/006-grid-collage-poster/template/) | [X](https://x.com/Formulasearch) |

## 怎么用

### Skill

1. 把对应期数下的 `skill/` 整个文件夹拷到你的 skills 目录，并按 skill 名重命名：
   - Claude Code：`~/.claude/skills/<skill-name>/`（Windows：`C:\Users\<你>\.claude\skills\<skill-name>\`）
2. 对 Claude 说出该期 README 里写明的触发词即可。

### 代码模板

- 本地：双击打开该期 `template/index.html`
- 在线：点目录表里的「拿走」预览链接

## 发布范围

这里只发布可直接预览、下载或复用的最终版本。制作过程、内部策略、研究素材、草稿和本地工具不收录在公开仓库中。

代码模板保持零依赖、零构建、单文件优先，便于拿走即用。

## 关注

每天的分享在 X：[@Formulasearch](https://x.com/Formulasearch)
