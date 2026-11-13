# Backloggd Plus

[English](README.md) · [Русский](README.ru.md) · [中文](README.zh.md) · [Español](README.es.md) · [Português](README.pt.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Polski](README.pl.md)

[![CI](https://github.com/NemoKing1210/backloggd-plus/actions/workflows/ci.yml/badge.svg)](https://github.com/NemoKing1210/backloggd-plus/actions/workflows/ci.yml)
[![Install userscript](https://img.shields.io/badge/Install-userscript-7c5cff?style=for-the-badge)](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/backloggd-plus.user.js)
[![Greasy Fork](https://img.shields.io/badge/Greasy_Fork-587296-1a1d24?style=for-the-badge&labelColor=670000)](https://greasyfork.org/ru/scripts/587296-backloggd-plus)
[![ScriptCat](https://img.shields.io/badge/ScriptCat-7077-1a1d24?style=for-the-badge&labelColor=f59e0b)](https://scriptcat.org/ru/script-show-page/7077)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](https://github.com/NemoKing1210/backloggd-plus/blob/main/LICENSE)
[![Version](https://img.shields.io/badge/version-0.7.100-green?style=for-the-badge)](https://github.com/NemoKing1210/backloggd-plus/blob/main/CHANGELOG.md)

一个扩展 [Backloggd](https://www.backloggd.com) 的用户脚本：添加额外的游戏信息、更丰富的界面和体验改进——无需离开网站。

兼容 [Tampermonkey](https://www.tampermonkey.net/)、[Violentmonkey](https://violentmonkey.github.io/)、[Greasemonkey](https://www.greasespot.net/)、[ScriptCat](https://scriptcat.org/) 以及支持 `// ==UserScript==` 元数据块的其他管理器。

也已发布在 [Greasy Fork](https://greasyfork.org/ru/scripts/587296-backloggd-plus) 和 [ScriptCat](https://scriptcat.org/ru/script-show-page/7077)。

> **注意：** Greasy Fork / ScriptCat 上的目录页面可能落后于本仓库——并非每次发布都能立刻同步过去，抱歉。要获取最新版本，请优先使用 [GitHub raw 安装地址](#快速安装)（或克隆仓库后运行 `npm run build`）。脚本的 `@updateURL` / `@downloadURL` 也指向 GitHub 的 `main` 分支。

> **状态：** 早期（`0.7.100`）。Backloggd 信息增强 + 列表徽章 + Steam / SteamDB → Backloggd 按钮。

## 截图

真实脚本运行在 Backloggd 游戏页面上的效果。

![Backloggd Plus 设置面板，包含通用、资料、游戏页、游戏卡片、翻译、缓存、调试和关于选项卡](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/docs/screenshots/settings-panel.png)

| | |
|---|---|
| ![Backloggd 游戏页面上的 Steam 信息行](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/docs/screenshots/game-page-steam.png)<br>**游戏页面信息行** — Steam：已拥有 · 价格 · 评测 · 标签和分类，SteamDB 详情、Metacritic、Deck/Proton、玩家数、GameStatus | ![Plus 评分、截图画廊和相似游戏](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/docs/screenshots/game-page-stats.png)<br>**评分与附加内容** — Plus 平均评分、Steam 截图画廊、带封面上徽章的相似游戏 |
| ![设置搜索同时筛选所有选项卡](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/docs/screenshots/settings-search.png)<br>**设置搜索** — 一次筛选所有选项卡；匹配项高亮，结果按选项卡分组 | ![包含内置链接和自定义链接的快速链接行](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/docs/screenshots/quick-links.png)<br>**快速链接** — 内置网站加上你自己的 URL 模板，可显示为链接或按钮 |

游戏页面上还有：数据加载时的骨架占位、翻译按钮、Fix match、游戏 ID、SteamDB 图标和封面、导出（Notion CSV / Markdown / JSON），以及悬停封面时的迷你资料。

## 快速安装

1. 安装一个用户脚本管理器（推荐 [Tampermonkey](https://www.tampermonkey.net/)、[Violentmonkey](https://violentmonkey.github.io/) 或 [ScriptCat](https://scriptcat.org/)）。
2. 从 GitHub（下方 raw 地址）、[Greasy Fork](https://greasyfork.org/ru/scripts/587296-backloggd-plus) 或 [ScriptCat](https://scriptcat.org/ru/script-show-page/7077) 安装。

**安装地址（GitHub — 最新）：**

```
https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/backloggd-plus.user.js
```

[![Install](https://img.shields.io/badge/⬇_Install-GitHub_raw-1a1d24?style=for-the-badge&labelColor=7c5cff)](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/backloggd-plus.user.js)
[![Install on Greasy Fork](https://img.shields.io/badge/⬇_Install-Greasy_Fork-1a1d24?style=for-the-badge&labelColor=670000)](https://greasyfork.org/ru/scripts/587296-backloggd-plus)
[![Install on ScriptCat](https://img.shields.io/badge/⬇_Install-ScriptCat-1a1d24?style=for-the-badge&labelColor=f59e0b)](https://scriptcat.org/ru/script-show-page/7077)

### 通过 URL 安装（管理器面板）

| 管理器 | 路径 |
|--------|------|
| Tampermonkey | 面板 → **Utilities** → **Install from URL** |
| Violentmonkey | 面板 → **+** → **Install from URL** |
| Greasemonkey | 附加组件菜单 → **New User Script** → 粘贴 raw 地址 |
| ScriptCat | [脚本页面](https://scriptcat.org/ru/script-show-page/7077) → **Установить скрипт**，或安装[扩展](https://scriptcat.org/)后使用 GitHub raw 地址 |

在管理器面板中安装时，请粘贴上面的 [GitHub 安装地址](#快速安装)。通过目录安装：[Greasy Fork](https://greasyfork.org/ru/scripts/587296-backloggd-plus) · [ScriptCat](https://scriptcat.org/ru/script-show-page/7077)。

### 手动安装

1. 打开本仓库中构建好的 [`backloggd-plus.user.js`](https://github.com/NemoKing1210/backloggd-plus/blob/main/backloggd-plus.user.js)（或克隆后运行 `npm run build`）。
2. 复制文件的全部内容。
3. 在用户脚本管理器中新建脚本并粘贴代码。
4. 保存并启用脚本。

## 更新

脚本包含指向 GitHub raw 文件的 `@updateURL` 和 `@downloadURL` 元数据。支持的管理器会自动检查更新。

维护者的发布步骤：参见 [DEVELOPMENT.md § Releases](https://github.com/NemoKing1210/backloggd-plus/blob/main/DEVELOPMENT.md#releases)。

## 功能

**游戏页面（`/games/{slug}/`）：**

- Platforms 下的原生详情行 — **Steam**（已拥有 · 愿望单 · 价格 · 促销结束 / 近期最低价 · 评测 · 标签）、**SteamDB**（系列 · 支持的系统 · 技术 · 最后记录更新）、**Metacritic**、**OpenCritic**、**HLTB**、**Deck / Proton**、**玩家**、**GameStatus**、**链接**
- **Fix match** — 当商店搜索出错时手动覆盖 Steam App ID（按 slug 保存）；将 App ID 留空可将游戏标记为不在 Steam 上
- SteamDB 视觉元素：标题前的应用图标、**Change cover** 下方的 Logo、在线玩家数
- SteamDB 详情行：系列 / 操作系统来自 Steam 商店 API；技术和最后记录更新在可访问时来自 SteamDB
- Steam 标题下方和日志编辑器中的导出按钮（可选；设置 → 游戏页；Notion CSV / Markdown / JSON）
- 标题后可选的 Backloggd 游戏 ID（设置 → 游戏页；单击复制）
- 游戏描述和评测卡片上的翻译按钮（设置 → 翻译；Google Translate）
- 游戏页面上的 Steam 头图 / 社区图标；游戏统计后的截图画廊
- 截图下方的相似游戏（Steam More Like This），带标签匹配百分比；卡片链接到 Backloggd，并可显示与列表网格相同的封面徽章
- Steam / GameStatus / 评分加载时的骨架占位
- 带网站图标的快速链接（IGDB、Steam、SteamDB、Metacritic、OpenCritic、HLTB、PCGamingWiki、IsThereAnyDeal、GOG DB、GamesLike）；拖动即可排序，并可用 URL 模板添加自己的链接（`{title}` 可选择格式，`{slug}`、`{appid}`、`{year}`、`{id}`），还可选配自定义图标
- 在同一浏览器登录 Steam 时显示 Steam **已拥有** / **愿望单** 徽章（无需 API 密钥）
- 游戏页面和封面网格上的 GameStatus 状态徽章
- 无需 API 密钥即可使用（Steam 商店公开端点 + 会话 userdata + GameStatus / HLTB / ProtonDB 公开 API；OpenCritic 通过 PCGamingWiki 查找，可在设置中选填自己的 RapidAPI 密钥）

**列表 / 搜索 / 日志（封面网格）：**

- `.game-cover` 卡片上的紧凑徽章 — 价格、Steam 评测 %、已拥有、愿望单、GameStatus（进入视口时懒加载；按类型开关在 设置 → 游戏卡片）
- 封面上的迷你资料（默认悬停；或右键 / Shift + 单击）— 标题、Backloggd 评分、平台、Steam 价格/评测、GameStatus、快速链接；卡片等级（Rookie → Legend）跟随 Backloggd 评分（可选视口预加载）
- 相似游戏卡片上也有相同的封面徽章 / 迷你资料（游戏页面条带）

**Steam 应用页面**（`store.steampowered.com/app/*`、`steamcommunity.com/app/*`）：

- 在 `.apphub_OtherSiteInfo` 中注入 Backloggd 图标按钮（与 SteamDB / Community Hub 同样式）
- 链接由 Steam URL 中的 slug 或游戏标题构建

**SteamDB 应用页面**（`steamdb.info/app/*`）：

- 在 `nav.app-links` 中注入 Backloggd 按钮（与 Store / IGDB 相同的 `.btn` 样式）
- 可用时优先使用页面上的 IGDB slug

**设置**（Backloggd 导航栏的 **Plus** 按钮 / 用户脚本管理器菜单）：

- 选项卡面板：通用 · 资料 · 游戏页 · 游戏卡片 · 翻译 · 缓存 · 调试 · 关于
- 设置搜索：在框中输入（或按 `/` / `Ctrl+K`）一次筛选所有选项卡——标签和提示中的匹配项会高亮，结果按选项卡分组，`Esc` 清除
- 界面语言（自动或固定区域）
- 资料：头像和用户名上的迷你资料卡（默认悬停；或右键 / Shift + 单击；可选视口预加载）；卡片内的游戏封面（收藏 / 最近）会打开游戏迷你资料；可关闭按已玩游戏数显示等级外观；个人资料页可按区块开关等级装饰（页头、等级标记、统计、导航、收藏）
- Steam 商店区域（价格货币）
- 各项开关：Steam / 已拥有 / 愿望单 / 标签 / Metacritic / OpenCritic / HLTB / Deck·Proton / GameStatus / 玩家 / SteamDB 图标和 Logo / 截图画廊 / 相似游戏 / 原生统计块 / 游戏 ID / 翻译（描述和评测）/ 列表封面徽章（按类型）/ 游戏迷你资料卡 / 链接 / Steam 和 SteamDB 上的 Backloggd 按钮
- 调试模式：一个面板，包含可点击的来源链接和完整响应转储
- 按站点显示链接（IGDB、Steam、SteamDB、Metacritic、OpenCritic、HLTB、PCGamingWiki、IsThereAnyDeal、GOG DB、GamesLike）
- 缓存时长 + 清除缓存（清理过期项 + 软性 LRU 上限；库和标签映射使用较短 TTL；在线玩家数始终实时）

## 支持的页面

| 网站 | URL 模式 |
|------|----------|
| Backloggd | `https://www.backloggd.com/*` |
| Backloggd（无 www） | `https://backloggd.com/*` |
| Steam 商店（应用） | `https://store.steampowered.com/app/*` |
| Steam 社区（应用） | `https://steamcommunity.com/app/*` |
| SteamDB（应用） | `https://steamdb.info/app/*` |

## 开发与贡献

- [DEVELOPMENT.md](https://github.com/NemoKing1210/backloggd-plus/blob/main/DEVELOPMENT.md) — 本地环境、仓库结构、元数据、权限、发布
- [CONTRIBUTING.md](https://github.com/NemoKing1210/backloggd-plus/blob/main/CONTRIBUTING.md) — PR 规范、约定、本地化、贡献者
- [AGENTS.md](https://github.com/NemoKing1210/backloggd-plus/blob/main/AGENTS.md) — 面向 AI 编码代理的架构说明
- [SECURITY.md](https://github.com/NemoKing1210/backloggd-plus/blob/main/SECURITY.md) — 如何私下报告漏洞、范围，以及脚本如何处理你的数据

```bash
npm install
npm run dev      # Vite 服务 — 安装生成的 "dev:" 用户脚本
npm run build    # 生产构建 → dist/ + 复制到仓库根目录
npm run ci       # 与 GitHub Actions 相同的检查
```

## 与 Backloggd 的关系

本项目**与 Backloggd 无关**。它是一个独立的社区用户脚本。

## 许可证

[MIT](https://github.com/NemoKing1210/backloggd-plus/blob/main/LICENSE) — Copyright (c) 2026 NemoKing
