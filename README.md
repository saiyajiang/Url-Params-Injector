# URL 参数注入器（可视化配置版）

> 说明：本项目由 AI 辅助编写，代码未经大规模生产环境验证，使用前请自行审阅与测试。

Tampermonkey / Violentmonkey 脚本：给指定域名自动追加、覆盖或删除 URL 查询参数。
带**可视化配置面板**和**常用站点预设库**，不用改代码即可管理规则，支持通配域名、路径匹配、三档注入模式、动态变量、规则导入导出。

典型用途：让 Steam 网页端强制显示简体中文（`?l=schinese`）、查看其他区定价（`?cc=us`）、批量去掉 utm 追踪参数等。

## 功能

- 按域名（hostname）匹配，支持 `*.example.com` 通配
- 追加参数，可选「覆盖已有同名参数」或「已存在则跳过」
- 支持删除指定参数（如批量去掉 `utm_*` 追踪参数）
- **内置预设库**：Steam 全站/商店/社区语言、Steam 商店区域、语言+区域组合、去追踪参数，一键添加
- **多域名支持**：一条规则可填多个域名（逗号分隔），如 `*.steampowered.com, steamcommunity.com`
- **三种注入模式**：仅改地址栏 / 刷新页面 / 抢在渲染前跳转
- **路径匹配**：可限定只对某些路径生效（如 Steam 的 `/app/`）
- 动态变量：`{ts}` `{ts_sec}` `{date}` `{random}`，同一页面访问内固定，不会反复跳转
- 劫持 `pushState` / `replaceState`，SPA（Vue / React 前端路由）切换路由也能补参
- 可视化面板：新增 / 删除规则、增删参数、启停开关、一键为当前站点建规则
- 规则导入导出：文本框粘贴、下载 JSON、上传 JSON 文件

## 安装

1. 浏览器安装 [Tampermonkey](https://www.tampermonkey.net/) 或 Violentmonkey
2. 打开本仓库 `Url-Params-Injector.user.js`，点「原始内容」→ 安装
3. 或从 Greasy Fork 安装（发布后把链接补在这里）

## 快速上手：让 Steam 显示简体中文

1. 打开任意 Steam 页面，点油猴图标 → **⚙️ 配置 URL 参数规则**
2. 预设区第一个下拉选「Steam 全站 · 界面语言（商店 + 社区）」，第二个选「Steam 全站 · 简体中文」
3. 点「添加该预设」→ **保存并立即应用**
4. 之后商店和社区都会自动带上 `?l=schinese`

想看美区价格就选「Steam · 美区 USD」预设（注意 `cc` 需未登录）。

> **Steam 有两组独立域名**，别搞混：
> - `*.steampowered.com` — 商店、客服、结算（store. / help. / checkout. 等子域）
> - `steamcommunity.com` — 社区、市场、创意工坊、讨论区、个人主页
>
> `*.steampowered.com` 这个通配**匹配不到** steamcommunity.com。想要两边都生效，用「Steam 全站」分组，或手动填 `*.steampowered.com, steamcommunity.com`。

## 使用

1. 点击油猴图标 → **⚙️ 配置 URL 参数规则**
2. 点「为当前站点新增」，或从预设库一键添加
3. 点「保存并立即应用」，刷新或等待路由变化即可看到地址栏变化

### 三种注入模式

| 模式 | 行为 | 适用场景 |
| --- | --- | --- |
| `soft` 仅改地址栏 | `history.replaceState`，不刷新、不留历史记录 | 埋点、分享链接美化 |
| `reload` 刷新页面 | `location.replace` 重新请求一次 | 参数需要被服务端读取 |
| `early` 抢在渲染前跳转 | 先 `window.stop()` 中止原请求再跳，避免白等一整页 | **Steam 语言/地区等必须由服务端渲染的参数** |

> 关键点：Steam 的 `l=` / `cc=` 是服务端渲染参数，用 `soft` 模式改地址栏是**看不到效果**的，必须选 `early` 或 `reload`。

### 规则字段说明

| 字段 | 说明 |
| --- | --- |
| 域名 | `example.com` 精确匹配；`*.example.com` 匹配自身及所有子域；`*` 匹配全部；多个域名用逗号分隔 |
| 路径 | 留空匹配全部路径；填 `/app/` 则只对该前缀生效；支持 `*` 模糊匹配 |
| 启用 | 关闭后该规则不生效 |
| 模式 | 见上表三种注入模式 |
| 覆盖同名参数 | 勾选则强制改写，不勾选则只在参数缺失时补上 |
| 要添加的参数 | 键值对，值支持动态变量 |
| 要删除的参数 | 逗号分隔的参数名，如 `utm_source,utm_medium` |

### 内置预设一览

| 分组 | 域名范围 | 预设 |
| --- | --- | --- |
| Steam 全站 · 界面语言 | `*.steampowered.com` + `steamcommunity.com` | 简中 `schinese`、繁中 `tchinese`、英文 `english`、日文 `japanese`、韩文 `koreana`、俄文 `russian`、德文、法文 |
| Steam 商店 · 界面语言 | 仅 `*.steampowered.com` | 同上 6 种语言 |
| Steam 社区 · 界面语言 | 仅 `steamcommunity.com` | 同上 6 种语言 |
| Steam · 商店区域 | `*.steampowered.com` + `steamcommunity.com` | 国区 `cn`、美区 `us`、港区 `hk`、日区 `jp`、俄区 `ru`、英区 `uk`、土区 `tr`、阿区 `ar` |
| Steam · 语言+区域组合 | 全站 | 简中+国区、简中+美区、简中+港区 |
| 其他常用 | — | SteamDB 显示所有价格、去 utm 追踪、去 Steam `snr` 追踪 |

### 动态变量

| 变量 | 含义 |
| --- | --- |
| `{ts}` | 毫秒时间戳 |
| `{ts_sec}` | 秒级时间戳 |
| `{date}` | 当天日期 `YYYY-MM-DD` |
| `{random}` | 8 位随机字符串 |

### 示例配置

### Steam 商店 + 社区强制简体中文（推荐）

```json
[
  {
    "id": "steam-zh",
    "host": "*.steampowered.com, steamcommunity.com",
    "path": "",
    "enabled": true,
    "overwrite": true,
    "mode": "early",
    "remove": [],
    "params": [
      { "key": "l", "value": "schinese" }
    ]
  }
]
```

### 只改商店（不碰社区）

```json
[
  {
    "id": "steam-store-zh",
    "host": "*.steampowered.com",
    "path": "",
    "enabled": true,
    "overwrite": true,
    "mode": "early",
    "remove": [],
    "params": [
      { "key": "l", "value": "schinese" }
    ]
  }
]
```

### 通用示例

```json
[
  {
    "id": "demo",
    "host": "*.example.com",
    "path": "",
    "enabled": true,
    "overwrite": false,
    "mode": "soft",
    "remove": ["utm_source", "utm_medium"],
    "params": [
      { "key": "from", "value": "greasyfork" },
      { "key": "lang", "value": "zh-CN" },
      { "key": "t", "value": "{ts}" }
    ]
  }
]
```

> 老版本配置里的 `"reload": true` 仍能正常读取，会自动转换为 `mode: "reload"`。

## 发布到 Greasy Fork 并关联 GitHub

1. 脚本头部已填好作者信息，如需 fork 可自行替换
2. 在脚本头部补上（用于自动更新）：

```
// @updateURL    https://raw.githubusercontent.com/saiyajiang/Url-Params-Injector/main/Url-Params-Injector.user.js
// @downloadURL  https://raw.githubusercontent.com/saiyajiang/Url-Params-Injector/main/Url-Params-Injector.user.js
```

3. 登录 [Greasy Fork](https://greasyfork.org) → 提交新脚本 → 粘贴脚本内容
4. 后续更新：**必须提升 `@version`**，否则 Greasy Fork 不会拉取新版本

## 推送到 GitHub

```bash
git init
git add .
git commit -m "feat: URL 参数注入器（可视化配置版）"
git branch -M main
git remote add origin git@github.com:saiyajiang/Url-Params-Injector.git
git push -u origin main
```

## 注意

- 脚本 `@match *://*/*`，在所有站点运行；只有命中规则的域名才会改 URL
- **Steam 的 `cc=` 区域参数仅在未登录状态下生效**，登录后商店会按账户所在国家/地区显示价格，这是 Steam 官方规则，脚本无法绕过
- Steam 的 `l=` 语言参数会同时写入 cookie，通常在访问一次后即生效
- 社区市场的价格同样受账户钱包币种约束，`cc=` 只在登出时有效
- `steamcommunity.com` 是独立域名，不在 `*.steampowered.com` 通配范围内，需要显式写出来
- `reload` / `early` 模式在某些站点（如银行、OA）可能触发风控或造成重复请求，按需开启
- 配置存放在油猴的 `GM_setValue` 存储里，不同浏览器不互通，可用导出 JSON 迁移

## License

MIT
