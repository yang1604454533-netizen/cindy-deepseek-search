# Cindy DeepSeek Search

给 Cindy（Pi 内核）用的联网搜索扩展。装上之后模型多出两个工具：

- **`web_search`** — 搜网页，返回标题、链接、站点、发布时间、权威度、相关性分数和长摘要
- **`web_fetch`** — 抓单个网页，返回 Markdown 正文

后端是 DeepSeek 官方 [Search / Fetch API](https://api-docs.deepseek.com/zh-cn/guides/search)，用你自己的 DeepSeek API Key。

## 为什么需要

Cindy 的内置工具只有 `read` / `write` / `edit` / `grep` / `find` / `ls` / `bash`，没有联网工具。模型即使本身是 DeepSeek，也不会「自动」调到 DeepSeek 的搜索接口——除非客户端把搜索工具声明给模型。这个包就是补这一块：装好后模型能自己决定去搜，不用你每次提醒。

## 安装

### 1. 装包

**Cindy（推荐）**：在 Cindy 的包 / 扩展安装入口填 git 源：

```
git:github.com/yang1604454533-netizen/cindy-deepseek-search
```

**手动方式**：把仓库放到任意目录，然后在下面的文件里把该目录的绝对路径加进 `packages` 数组，重启 Cindy：

```
C:\Users\<你的用户名>\AppData\Roaming\Cindy\pi-package-home\settings.json
```

```json
{
  "packages": [
    "C:/path/to/cindy-deepseek-search"
  ]
}
```

**纯 Pi**：

```bash
pi install git:github.com/yang1604454533-netizen/cindy-deepseek-search
```

### 2. 配 Key

任选一种，优先级从高到低：

1. 环境变量 `DEEPSEEK_API_KEY`
2. 环境变量 `DEEPSEEK_SEARCH_KEY_FILE` 指向一个存放 key 的文件
3. 把 `key.example.txt` 复制成 `key.txt`，内容换成你的 key，放在 `package.json` 同一目录

```powershell
Copy-Item key.example.txt key.txt
# 编辑 key.txt，写入 sk-xxxx
```

`key.txt` 已在 `.gitignore` 里，不会被提交。**不要把 key 写进代码或提交到仓库。**

### 3. 重启 Cindy

新开一个对话，说「搜一下 XXX」，模型会自己调 `web_search`。

## 工具参数

### `web_search`

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `query` | string | 必填 | 搜索词，1–128 字符，支持下面的搜索语法 |
| `count` | number | 10 | 返回条数，1–50 |
| `include_content` | boolean | false | true 时返回网页正文而不是长摘要（更慢、占更多上下文） |

`query` 支持的搜索语法，可组合：

| 操作符 | 示例 | 作用 |
|---|---|---|
| `site:` | `DeepSeek site:github.com` | 限定站点，多个用空格分隔 |
| `-site:` | `DeepSeek -site:example.com` | 排除站点 |
| `-` | `DeepSeek -广告` | 排除含该词的结果 |
| `"..."` | `DeepSeek "精确短语"` | 精确匹配短语 |
| `-"..."` | `DeepSeek -"release notes"` | 排除短语 |
| `lang:` | `DeepSeek lang:zh,en` | 限定语言 |
| `after:` / `before:` | `DeepSeek after:2025-01-01` | 限定发布时间 |

### `web_fetch`

| 参数 | 类型 | 说明 |
|---|---|---|
| `url` | string | 含 host 的 HTTP/HTTPS 地址，不能带用户名密码 |

## 计费与限速

按 DeepSeek 官方定价：**5 元 / 1000 次成功请求**，Search 和 Fetch 分别计费。

- 只有 HTTP 200 且真正返回内容才计费，失败、空结果、超时不计费
- `count` 只影响返回条数，不影响单价
- 每个账号 Search、Fetch 各 5 QPS，超出返回 HTTP 429；Fetch 另有按目标域名的限制

## 常见问题

| 现象 | 原因与处理 |
|---|---|
| 对话里没有 `web_search` 工具 | 包没加载。检查 `pi-package-home\settings.json` 的 `packages` 是否包含本包目录，然后重启 Cindy |
| 报 `Missing DeepSeek API key` | 三种 key 配置都没生效，见上面「配 Key」 |
| `HTTP 401` | key 无效或已删除 |
| `HTTP 402` | 账号余额不足 |
| `HTTP 429` | 超过 5 QPS，等一会儿再试 |
| `HTTP 404`（fetch） | 目标站拦截、返回错误或页面没有可提取正文 |

## 目录结构

```
cindy-deepseek-search/
├─ package.json          # pi 包声明，指向 extensions/search.ts
├─ extensions/
│  └─ search.ts          # 注册 web_search / web_fetch
├─ key.example.txt       # key 模板，复制成 key.txt 使用
├─ .gitignore            # 忽略 key.txt
├─ LICENSE
└─ README.md
```

## 许可

MIT
