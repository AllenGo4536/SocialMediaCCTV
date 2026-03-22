# OpenClaw Bot 接入深化方案

## 1. 目标

让 OpenClaw 作为聊天机器人入口，接收用户发来的 URL，并把请求路由到项目内已有的抓取链路。

本期只覆盖这 3 类输入：

- `X 博主主页` -> 加入 X 监控列表并触发作者抓取
- `X 帖子链接` -> 走资讯单链接入库
- `Instagram / TikTok / YouTube 博主主页` -> 走现有 profile 建档与 Apify 抓取

本期不让 OpenClaw 直接写 Supabase，也不让 OpenClaw 持有项目数据库权限。

## 2. 核心结论

推荐采用 `OpenClaw -> Project API` 的模式，不采用：

- OpenClaw 直连 Supabase
- OpenClaw 分别调用多个现有前端 API
- OpenClaw 在机器人侧复制业务判断和入库逻辑

最合适的边界：

```text
用户 -> OpenClaw Bot
     -> URL 粗分类
     -> POST /api/bot/intake
     -> Project service 二次分类 + 分发
     -> 现有业务链路执行
     -> 返回结果给 OpenClaw
     -> OpenClaw 回复用户
```

## 3. Why

这样做的原因很直接：

- 项目已经有入库链路，尤其是新闻入库和 profile 抓取都已存在
- 现有 API 是面向前端设计的，不完全适合 bot 直接调用
- 机器人只能做“辅助判断”，最终路由必须由服务端做权威判断
- 这样改动最小，后续内部重构不会影响 OpenClaw 机器人

## 4. What Already Exists

现有代码已经解决了这些子问题：

- X 资讯单链接入库：
  - `POST /api/ingest`
  - `src/lib/ingest/service.ts`
- X 博主监控列表与作者抓取：
  - `POST /api/tracked-sources`
- IG / TikTok / YouTube profile 建档与首轮抓取：
  - `POST /api/profiles`
- URL 平台识别：
  - `src/lib/ingest/resolver.ts`
  - `src/lib/profile-input.ts`
- Apify 结果回流：
  - `POST /api/webhooks/apify`

这意味着本期不需要重做抓取系统，只需要增加一个 bot 专用接入层。

## 5. 最小改动方案

### 5.1 新增单入口 API

新增：

```text
POST /api/bot/intake
```

职责：

- 校验机器人身份
- 接收 URL 与最小上下文
- 服务端再次判断 URL 类型
- 分发到现有 service
- 返回统一结构给 OpenClaw

### 5.2 不建议让 OpenClaw 直接调现有 3 个 API

原因：

- `POST /api/profiles` 依赖前端登录态和标签字段，不适合 bot 直接接
- `POST /api/tracked-sources`、`POST /api/ingest` 的返回结构不同
- 机器人如果直接绑定多个业务 API，会和内部实现强耦合

## 6. 路由规则

建议在项目内新增一个权威分类器，例如：

```ts
type BotRoute =
  | 'x_author_page'
  | 'x_post_page'
  | 'creator_profile'
  | 'unsupported';
```

### 6.1 分类规则

#### A. `x_author_page`

命中示例：

- `https://x.com/username`
- `https://twitter.com/username`

不命中：

- `/status/123`
- `/article/123`
- `search?q=...`

动作：

- 调用 X 作者监控 service
- 加入 `tracked_sources`
- 触发 `author_tracking`

#### B. `x_post_page`

命中示例：

- `https://x.com/username/status/123`
- `https://twitter.com/username/status/123`
- `https://x.com/i/status/123`
- `https://x.com/username/article/123`

动作：

- 调用新闻 ingest service
- 写入 `ingest_jobs`
- 写入 `source_records`
- upsert `news_items`

#### C. `creator_profile`

命中示例：

- `https://instagram.com/xxx`
- `https://www.tiktok.com/@xxx`
- `https://www.youtube.com/@xxx`
- `https://www.youtube.com/channel/xxx`

动作：

- 调用 profile intake service
- 写入 `profiles`
- 写入 tags
- 触发对应 Apify 抓取

#### D. `unsupported`

动作：

- 返回明确错误
- 提示当前仅支持 X / Instagram / TikTok / YouTube 对应路由

## 7. API 设计

### 7.1 Request

```json
{
  "url": "https://x.com/abc/status/123",
  "requestedBy": "openclaw:user_42",
  "context": {
    "channel": "feishu",
    "conversationId": "conv_123",
    "messageId": "msg_456"
  },
  "profileTags": {
    "benchmarkType": "ip_benchmark",
    "cultureTags": ["culture_west"],
    "contentTags": ["daily_life"]
  }
}
```

说明：

- `url` 必填
- `requestedBy` 必填，建议用 `openclaw:{user-or-room-id}`
- `context` 可选，仅用于审计和日志
- `profileTags` 仅在 `creator_profile` 场景使用

### 7.2 Response

统一返回，不暴露内部 API 细节：

```json
{
  "route": "x_post_page",
  "status": "completed",
  "message": "X 内容已入库，等待人工筛选。",
  "data": {
    "jobId": "uuid",
    "newsItemId": "uuid"
  }
}
```

或：

```json
{
  "route": "creator_profile",
  "status": "accepted",
  "message": "博主已建档，已触发初始抓取。",
  "data": {
    "profileId": "uuid",
    "platform": "youtube"
  }
}
```

### 7.3 Auth

推荐：

```text
Authorization: Bearer <OPENCLAW_BOT_SECRET>
```

项目新增环境变量：

```text
OPENCLAW_BOT_SECRET=...
```

不建议复用：

- `SUPABASE_SERVICE_ROLE_KEY`
- 用户侧 Supabase access token
- `VIRAX_SECRET_KEY`

`VIRAX_SECRET_KEY` 目前更像人工内部触发密钥，不适合作为机器人系统间调用密钥。

## 8. 服务端实现建议

## 8.1 新增的最小模块

```text
src/lib/bot/
  classify-url.ts
  intake-service.ts
  types.ts

src/app/api/bot/intake/route.ts
```

### 8.2 复用方式

不要 API-to-API 调用，建议把已有逻辑下沉成 service：

```text
bot intake route
  -> bot intake service
     -> ingest service
     -> tracked source service
     -> profile intake service
```

具体建议：

- 保留 `src/lib/ingest/service.ts`
- 新增 `src/lib/tracked-sources/service.ts`
- 新增 `src/lib/profiles/service.ts`
- `api/tracked-sources` 与 `api/profiles` 改为调用 service

这样 bot 和前端页面都复用同一套业务逻辑。

## 9. 特别注意：Profile 标签问题

`Instagram / TikTok / YouTube` 这条链路现在不是纯抓取，它要求：

- `benchmarkType`
- `cultureTags`
- `contentTags`

如果 OpenClaw 要支持这类 URL，首期有两个可选方案：

### 方案 A：机器人追问补齐标签

优点：

- 保持和现有产品语义一致
- 不污染 profile 分类

缺点：

- 机器人交互多一步

### 方案 B：项目给默认标签

优点：

- 机器人一步完成

缺点：

- 容易把 profile 建错类
- 后期清理成本高

推荐：`方案 A`

如果用户只发了 IG / TikTok / YouTube 主页，OpenClaw 先追问一句：

```text
这是要作为哪种博主建档？
1. IP对标
2. 美学对标
如果是 IP对标，我还需要文化标签和内容标签。
```

## 10. OpenClaw 机器人侧怎么配

## 10.1 本期最简配置

如果本期只做这 3 类 URL 路由，OpenClaw 不需要完整联网抓取能力，只需要：

- 能执行 HTTP 请求
- 能根据 URL 规则做简单分类
- 能在部分场景追问用户补齐标签

如果你的 OpenClaw 支持 HTTP 工具或 webhook action，优先用那个。

如果你的 OpenClaw 是本地 agent 形态，并通过命令执行工具，可以用 `curl` 调接口。

### 机器人最小能力清单

- 读取用户消息文本
- 正则提取 URL
- 判断 URL 属于哪类
- 调项目 API
- 把 API 返回结果转成人类可读消息

## 10.2 OpenClaw 工具权限

如果你打算让 OpenClaw 通过命令行执行 `curl`，需要启用可执行命令权限：

```bash
openclaw config set tools.profile "coding"
openclaw gateway restart
```

或者在：

```text
~/.openclaw/openclaw.json
```

中设置：

```json
{
  "tools": {
    "profile": "coding"
  }
}
```

然后重启 Gateway，并开启新会话。

## 10.3 OpenClaw 系统提示词建议

建议给机器人一段固定规则：

```text
当用户发送 URL 时：

1. 提取第一个有效 URL
2. 判断类型：
   - X 博主主页 -> x_author_page
   - X 帖子链接 -> x_post_page
   - Instagram/TikTok/YouTube 博主主页 -> creator_profile
3. 如果是 creator_profile 且缺少标签，不直接提交，先向用户追问 benchmarkType / cultureTags / contentTags
4. 使用 POST {PROJECT_BASE_URL}/api/bot/intake 提交
5. 请求头带 Authorization: Bearer {OPENCLAW_BOT_SECRET}
6. 将返回结果用中文简洁转述给用户
7. 如果 API 返回 unsupported，明确告诉用户当前支持范围
```

## 10.4 OpenClaw 机器人环境变量

建议至少配置：

```text
PROJECT_BASE_URL=https://social-media-cctv.vercel.app
OPENCLAW_BOT_SECRET=xxxxxxxx
```

如果你的 OpenClaw 支持 secret / env 配置，把它们放进去，不要硬编码在 prompt 里。

## 10.5 OpenClaw 调用示例

如果 OpenClaw 通过命令行工具发请求，可用：

```bash
curl -X POST "$PROJECT_BASE_URL/api/bot/intake" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENCLAW_BOT_SECRET" \
  -d '{
    "url": "https://x.com/abc/status/123",
    "requestedBy": "openclaw:user_42"
  }'
```

如果是 creator profile：

```bash
curl -X POST "$PROJECT_BASE_URL/api/bot/intake" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENCLAW_BOT_SECRET" \
  -d '{
    "url": "https://www.youtube.com/@creator",
    "requestedBy": "openclaw:user_42",
    "profileTags": {
      "benchmarkType": "ip_benchmark",
      "cultureTags": ["culture_west"],
      "contentTags": ["daily_life"]
    }
  }'
```

## 11. 建议返回给用户的话术

### X 博主主页

```text
已加入 X 监控列表，并触发最近内容抓取。抓取完成后会进入后台候选池。
```

### X 帖子链接

```text
这条 X 内容已入库，默认状态为待筛选。
```

### IG / TikTok / YouTube 博主主页

```text
博主已建档，并触发首轮抓取。稍后可以在信息流中查看内容。
```

## 12. 测试图

```text
                +----------------------+
                |  用户发送一个 URL     |
                +----------+-----------+
                           |
                           v
                +----------------------+
                | OpenClaw 提取 URL     |
                +----------+-----------+
                           |
                           v
                +----------------------+
                | 项目端再次分类        |
                +---+---------+--------+
                    |         |
        +-----------+         +-------------------------+
        v                                             v
+---------------+                        +--------------------------+
| x_author_page |                        | x_post_page              |
+-------+-------+                        +------------+-------------+
        |                                             |
        v                                             v
 tracked_sources + author_tracking         ingest_jobs + news_items

                    +-----------------------------------------------+
                    |
                    v
           +----------------------------+
           | creator_profile            |
           +-------------+--------------+
                         |
                         v
              profiles + tags + apify trigger
```

## 13. 测试清单

- `x.com/username` 被识别为 `x_author_page`
- `x.com/username/status/123` 被识别为 `x_post_page`
- `instagram.com/username` 被识别为 `creator_profile`
- `youtube.com/@handle` 被识别为 `creator_profile`
- 缺少 `profileTags` 时，`creator_profile` 不会直接建档
- bot secret 错误时返回 401
- 重复提交相同 X 帖子不会重复创建资讯
- 重复提交相同 profile 不会重复建档

## 14. NOT in scope

- 微信公众号接入 OpenClaw 抓取
- 小红书 / 抖音 / 微博 bot 路由
- OpenClaw 异步回调模式
- MQ / 任务队列
- 机器人主动推送抓取完成通知
- OpenClaw 直接执行 Agent Reach 抓取再回传项目

这些都可以放到第二阶段。

## 15. 推荐落地顺序

1. 项目新增 `/api/bot/intake`
2. 抽出 `profile intake service` 与 `tracked source service`
3. 增加 URL classifier 与统一 response contract
4. 本地用 curl 跑通 3 条路径
5. 再把 OpenClaw 机器人 prompt、secret、HTTP action 配进去

## 16. 一句话建议

首期把 OpenClaw 做成一个薄入口，只传 URL 和必要上下文给项目 API；项目内部做最终判断和分发。这是当前最稳、最小、最容易上线的方案。
