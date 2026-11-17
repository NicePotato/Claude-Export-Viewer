# Claude Export Viewer

[English](README.md) · [Español](README.es.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Русский](README.ru.md) · **简体中文**

一个纯本地的查看器，用于查看你可以从 Claude.ai 下载的数据导出。打开 `conversations.json`
或导出的 zip 文件，即可阅读你的对话，支持分支、搜索、附件、项目、记忆和工件。

不会上传任何内容：页面带有严格的 Content-Security-Policy，无法访问网络。
这是非官方工具，与 Anthropic 无关。

## 功能

- 直接读取导出的原始数据：JSON、zip 或解压后的文件夹。文件类型根据内容检测，
  因此重命名后的文件同样可用。
- Markdown 渲染，支持代码高亮、折叠的思考过程和工具调用、附件、引用。
- 分支：`< 2 / 3 >` 控件可在编辑过或重试过的版本之间切换。
- 全文搜索，并在对话中高亮匹配项。按 `/` 可跳到搜索框。
- 按日期排序，按日期或项目分组。
- 项目包含指令、文档和记忆，以及你归档到其中的对话和工件。
- 没有可读内容的对话会归入*空对话*，并附上从文件中读取到的原因。
- 可将对话、项目、记忆、工件或回顾导出为 Markdown，也可将项目、全部记忆、所有工件或所有回顾导出为 zip。
- 记忆、工件和回顾分别位于各自的分区中。
- 提供英语、西班牙语、德语、法语、俄语和简体中文界面。可在起始页或侧边栏的语言按钮中选择语言，
  该设置同样适用于导出的 Markdown。

## 快速开始

只需要 Python 3，无需构建步骤或额外软件包。

```bash
python serve.py
```

服务运行在 `http://127.0.0.1:5173`（仅限本机），并会自动打开浏览器。在 Windows 上可以运行
`start.bat`。选项：`--port 8080`、`--no-open`。

## 加载导出数据

将文件或文件夹拖放到页面上，或使用**选择文件** / **选择文件夹**。你可以随时添加文件，
它们会合并到已加载的内容中。

| 文件 | 内容 |
| --- | --- |
| `conversations.json` | 全部对话。仅此一个文件就足够 |
| `conversations-XXX.zip` | 同上，zip 压缩版 |
| `projects-XXX.zip` | 项目指令和文档 |
| `memories-XXX.zip` | 全局记忆、项目记忆、记忆文件 |
| `frames-XXX.zip` | 带有可读页面的工件 |
| `feedback-XXX.zip` | 月度回顾 |
| `design_chats-XXX.zip` | 可被识别，但导出中没有这些对话的消息 |

`XXX` 是分卷编号，例如 `000`。

有时 Claude 只会发来一个很小的 `manifest-....json` 下载链接列表。将它拖入页面，
查看器会列出 claude.ai 的链接（不会被打开或保存），方便你下载各个 zip。
这些链接 24 小时后失效。

`users.json` 和 `login_history.json` 等账户文件永远不会被加载。
勾选**在此浏览器中保留已加载的导出**可将其保存到 IndexedDB；点击垃圾桶按钮或**清除**即可删除。

## 说明

- **项目：** 导出数据没有说明对话或工件属于哪个项目。请使用对话或工件中的**项目**菜单，
  或项目中的**添加对话** / **添加工件**。所做的选择仅保存在此浏览器中。
- **空对话：** 查看器无法恢复导出中缺失的文本，也不会猜测原因。
  原因仅限于文件所显示的内容，例如没有消息、所有正文为空，或只有占位文字。
- **隐私：** 没有统计分析、CDN 或远程字体，所有库均已内置。远程图片不会被加载
  （显示为 `[图片: alt]` 链接），消息中的原始 HTML 会被转义，链接仅限 `http`、`https` 和 `mailto`。
  偏好设置保存在 `localStorage` 中。
- **浏览器：** 最新版的 Chrome、Edge、Firefox 或 Safari。
- **限制：** 大约 500 MB 或更大的 `conversations.json` 无法在一个标签页中解析。
  导出中不包含图片和二进制附件，只有它们的名称。

## 开发

普通的 ES 模块，没有打包器，不需要 Node。

```
index.html          入口页面和 CSP
serve.py            127.0.0.1 静态服务器
src/lib/            导入、分支树、搜索、导出、i18n（不涉及 DOM）
src/components/     Preact + htm 视图
src/locales/        翻译：en（基准）、es、de、fr、ru、zh
src/styles.css      样式
fonts/, vendor/     Medeo Mono、内置的库
tests/              浏览器测试套件
```

测试：运行 `python serve.py`，打开 `http://127.0.0.1:5173/tests/`。标签页标题会显示 `PASSED n` 或 `FAILED n`。

翻译：文本位于 `src/locales/<代码>.js`，通过 `src/lib/i18n.js` 中的 `t()` 和 `tn()`（复数）读取。
要添加一种语言，请复制 `en.js`，翻译后在 `i18n.js` 中注册。如果某个语言缺少键、占位符，
或缺少该语言所需的复数形式，测试就会失败。初始语言由浏览器语言决定；所做的选择保存在 `localStorage` 中。

贡献：从 `main` 创建分支（`feature/...`、`fix/...`、`docs/...`），使用
[Conventional Commits](https://www.conventionalcommits.org/)，并在测试通过后提交 pull request。

## 许可证

[MIT](LICENSE)

## 构建所用

[Preact](https://preactjs.com/)、[htm](https://github.com/developit/htm)、[fflate](https://github.com/101arrowz/fflate)、
[marked](https://github.com/markedjs/marked)、[highlight.js](https://highlightjs.org/)、
[Phosphor Icons](https://phosphoricons.com/)（MIT）和 [Medeo Mono](https://github.com/DNFDEVS/medeo-font)（SIL OFL，见 `fonts/OFL.txt`）。
