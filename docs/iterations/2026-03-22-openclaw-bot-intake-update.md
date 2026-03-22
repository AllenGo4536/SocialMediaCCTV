# 2026-03-22 OpenClaw Bot Intake 迭代更新

## 1. 本轮目标

本轮目标是把 OpenClaw 作为外部机器人入口接入项目，让用户在聊天里提交 URL 后，能够进入项目内已有的数据处理链路，而不是让机器人直接写数据库。

本轮重点解决的是：

- 为 OpenClaw 提供统一的 bot 入口 API
- 在服务端对 URL 做权威分类
- 把不同 URL 分发到现有业务链路
- 补齐最基本的鉴权与输入校验
- 完成一次真实联调验证

## 2. 本轮确认的架构边界

本轮已经明确以下边界：

- OpenClaw 只作为外部调用方
- OpenClaw 只调用项目 API，不直接连 Supabase
- 项目本身继续作为 system of record
- URL 分类必须在服务端做最终判断
- 项目环境保留 Supabase / Apify 等内部密钥
- OpenClaw 只持有 `PROJECT_BASE_URL` 与 `OPENCLAW_BOT_SECRET`

最终接入模式：

```text
用户 -> OpenClaw
     -> POST /api/bot/intake
     -> 服务端分类
     -> 分发到现有链路
     -> 返回统一结果
     -> OpenClaw 回复用户
```

## 3. 本轮完成的技术更新

### 3.1 新增 Bot Intake API

新增统一入口：

- [`src/app/api/bot/intake/route.ts`](/Users/allen/Documents/GitHub/SocialMediaCCTV/src/app/api/bot/intake/route.ts)

当前能力包括：

- Bearer token 鉴权
- 请求体基础校验
- 空白字符串拦截
- 调用 bot intake service
- 返回统一 JSON response contract

### 3.2 新增 Bot 分类与处理层

新增文件：

- [`src/lib/bot/types.ts`](/Users/allen/Documents/GitHub/SocialMediaCCTV/src/lib/bot/types.ts)
- [`src/lib/bot/classify-url.ts`](/Users/allen/Documents/GitHub/SocialMediaCCTV/src/lib/bot/classify-url.ts)
- [`src/lib/bot/intake-service.ts`](/Users/allen/Documents/GitHub/SocialMediaCCTV/src/lib/bot/intake-service.ts)

这一层负责：

- URL 分类
- 平台主页 / 内容页判定
- 对现有 ingest / tracked source / profile 流程做分发

### 3.3 支持的 URL 路由

当前支持以下 4 类结果：

- `x_author_page`
- `x_post_page`
- `creator_profile`
- `unsupported`

其中：

- `x_author_page`：进入 X 监控来源链路
- `x_post_page`：进入新闻 ingest 链路
- `creator_profile`：进入 Instagram / TikTok / YouTube 的 profile 建档与抓取链路
- `unsupported`：明确拒绝

### 3.4 分类规则收紧

本轮对分类器做了几轮收敛，最终确认：

- X 仅支持真正的作者主页和帖子页
- Instagram 仅支持根 profile URL，不接受 `reel` / `p` / `stories`
- TikTok 仅支持 `/@username`
- YouTube 仅支持根频道主页：
  - `@handle`
  - `/channel/...`
  - `/user/...`
  - `/c/...`
- 使用精确 hostname allowlist，避免伪造域名误判

### 3.5 Bot 鉴权方式

本轮新增环境变量：

```text
OPENCLAW_BOT_SECRET
```

用于：

- OpenClaw 调用 `/api/bot/intake`
- 项目服务端校验 bot 身份

该 secret 仅供 bot API 调用使用，不与其他内部密钥复用。

## 4. 已复用的现有业务链路

本轮没有重建抓取系统，而是复用了现有逻辑：

### 4.1 X 作者监控

复用：

- [`src/lib/ingest/service.ts`](/Users/allen/Documents/GitHub/SocialMediaCCTV/src/lib/ingest/service.ts)
- [`src/lib/ingest/persistence.ts`](/Users/allen/Documents/GitHub/SocialMediaCCTV/src/lib/ingest/persistence.ts)

### 4.2 X 帖子入库

复用：

- [`src/app/api/ingest/route.ts`](/Users/allen/Documents/GitHub/SocialMediaCCTV/src/app/api/ingest/route.ts)
- [`src/lib/ingest/service.ts`](/Users/allen/Documents/GitHub/SocialMediaCCTV/src/lib/ingest/service.ts)

### 4.3 IG / TikTok / YouTube Profile 建档与抓取

复用：

- [`src/app/api/profiles/route.ts`](/Users/allen/Documents/GitHub/SocialMediaCCTV/src/app/api/profiles/route.ts)
- [`src/lib/profile-input.ts`](/Users/allen/Documents/GitHub/SocialMediaCCTV/src/lib/profile-input.ts)
- [`src/lib/apify.ts`](/Users/allen/Documents/GitHub/SocialMediaCCTV/src/lib/apify.ts)

说明：

当前 bot intake 在 `creator_profile` 场景仍然是复制现有 route 中的部分建档逻辑，没有完成真正的共享 service 抽离。这是后续优化项，不阻塞当前联调。

## 5. 联调与验证结果

本轮已完成一轮真实联调。

### 5.1 API / 构建验证

本地已验证：

- `npx tsc --noEmit` 通过
- `npm run build` 通过

构建结果已包含：

- `ƒ /api/bot/intake`

### 5.2 OpenClaw 联调结果

本轮已完成 6 个核心场景联调，结果全部通过：

1. X author page
2. X post page
3. YouTube creator profile
4. Unsupported URL
5. Missing profileTags
6. Blank string

### 5.3 联调结果摘要

已确认：

- URL 分类正确
- 鉴权正常
- 现有业务链路接入成功
- 输入校验生效
- `trackedSourceId` / `jobId` / `newsItemId` / `profileId` 都能返回

## 6. 本轮新增或变更的环境变量

项目环境新增：

```text
OPENCLAW_BOT_SECRET=your-openclaw-bot-secret
```

OpenClaw 侧实际只需要：

- `PROJECT_BASE_URL`
- `OPENCLAW_BOT_SECRET`

明确不需要提供给 OpenClaw：

- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `APIFY_API_TOKEN`
- `VIRAX_SECRET_KEY`

## 7. 当前已知的可接受 tradeoff

以下问题当前是有意识接受的，不阻塞本轮：

### 7.1 creator_profile 的 `created_by`

Bot 创建 profile 时，当前写 `created_by = null`。

原因：

- OpenClaw 传入的 `requestedBy` 不是 auth.users 的 uuid
- 当前没有专门的 bot system user

### 7.2 profile_tags 插入失败不回滚 profile

当前策略：

- profile 先创建
- tags 插入失败时只记录日志
- 不回滚 profile

这是为了避免 bot 流程因局部失败整体中断，但它和现有 `/api/profiles` 的行为还不完全一致。

## 8. 本轮未完成内容

以下内容本轮没有进入实施，后续可继续推进：

- 抽出 `profiles` 的共享 service
- 抽出 `tracked-sources` 的共享 service
- 统一 bot intake 与现有 route 的 profile 创建逻辑
- 给 `/api/bot/intake` 增加结构化日志和 `request_id`
- 为 bot intake 增加正式测试框架
- 增加更多真人对话流联调 case

## 9. 当前阶段结论

本轮已经完成了一个重要的系统边界收口：

OpenClaw 不再需要直接接触项目内部数据库或抓取密钥，而是通过统一 API 接入项目现有链路。

这意味着：

- bot 和项目职责边界已经建立
- OpenClaw 可以开始进入真实对话流使用
- 后续优化重点从“能不能接通”转向“日志、复用、可维护性”
