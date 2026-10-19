# URL 参数注入器（可视化配置版）

> 说明：本项目由 AI 辅助编写，代码未经大规模生产环境验证，使用前请自行审阅与测试。

Tampermonkey / Violentmonkey 脚本：给指定域名自动追加、覆盖或删除 URL 查询参数。
带**可视化配置面板**，不用改代码即可管理规则，支持通配域名、动态变量、规则导入导出。

## 功能

- 按域名（hostname）匹配，支持 `*.example.com` 通配
- 追加参数，可选「覆盖已有同名参数」或「已存在则跳过」
- 支持删除指定参数（如批量去掉 `utm_*` 追踪参数）
- 默认只改地址栏（`history.replaceState`，不刷新、不留历史记录）
- 可选「写入后强制刷新」，用于参数需要被服务端读取的场景
- 动态变量：`{ts}` `{ts_sec}` `{date}` `{random}`，同一页面访问内固定，不会反复跳转
- 劫持 `pushState` / `replaceState`，SPA（Vue / React 前端路由）切换路由也能补参
- 可视化面板：新增 / 删除规则、增删参数、启停开关、一键为当前站点建规则
- 规则导入导出：文本框粘贴、下载 JSON、上传 JSON 文件

## 安装

1. 浏览器安装 [Tampermonkey](https://www.tampermonkey.net/) 或 Violentmonkey
2. 打开本仓库 `Url-Params-Injector.user.js`，点「原始内容」→ 安装
3. 或从 Greasy Fork 安装（发布后把链接补在这里）

## 使用

1. 点击油猴图标 → **⚙️ 配置 URL 参数规则**
2. 点「为当前站点新增」，填域名和参数
3. 点「保存并立即应用」，刷新或等待路由变化即可看到地址栏变化

### 规则字段说明

| 字段 | 说明 |
| --- | --- |
| 域名 | `example.com` 精确匹配；`*.example.com` 匹配自身及所有子域；`*` 匹配全部 |
| 启用 | 关闭后该规则不生效 |
| 覆盖已有同名参数 | 勾选则强制改写，不勾选则只在参数缺失时补上 |
| 写入后强制刷新 | 勾选则用 `location.replace` 重新请求页面，参数可被后端读到 |
| 要添加的参数 | 键值对，值支持动态变量 |
| 要删除的参数 | 逗号分隔的参数名，如 `utm_source,utm_medium` |

### 动态变量

| 变量 | 含义 |
| --- | --- |
| `{ts}` | 毫秒时间戳 |
| `{ts_sec}` | 秒级时间戳 |
| `{date}` | 当天日期 `YYYY-MM-DD` |
| `{random}` | 8 位随机字符串 |

### 示例配置

```json
[
  {
    "id": "demo",
    "host": "*.example.com",
    "enabled": true,
    "overwrite": false,
    "reload": false,
    "remove": ["utm_source", "utm_medium"],
    "params": [
      { "key": "from", "value": "greasyfork" },
      { "key": "lang", "value": "zh-CN" },
      { "key": "t", "value": "{ts}" }
    ]
  }
]
```

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
- 「写入后强制刷新」在某些站点（如银行、OA）可能触发风控，按需开启
- 配置存放在油猴的 `GM_setValue` 存储里，不同浏览器不互通，可用导出 JSON 迁移

## License

MIT
