# ViraX 资讯采集技术方案

## 1. 文档目标

本文档定义 ViraX 图文资讯采集能力的技术方案。

目标不是集成一个通用 Agent 工具箱，而是在现有仓库中建立一套可控的“渠道适配层 + 标准化入库”架构，用于接收机器人或人工提交的内容链接，调用不同平台的上游抓取方案，完成统一入库，并为前端工作台提供稳定数据源。

本文档覆盖：

- 系统边界与设计原则
- 目标架构与数据流
- 平台适配层设计
- 数据模型与 Supabase 表设计
- API 与任务状态流转
- 渐进式落地计划

本文档不覆盖视觉设计和前端页面交互细节，相关内容见现有 PRD：

- [frontend-news-workbench-prd.md](/Users/allen/Documents/GitHub/SocialMediaCCTV/docs/frontend-news-workbench-prd.md)

## 2. 背景与核心判断

当前仓库已经具备一条可复用的抓取主链路：

- 前端与 API 基于 Next.js App Router
- 数据持久化基于 Supabase
- 视频类渠道已经有“调用上游 -> webhook 回调 -> 标准化入库”的雏形

已有参考代码：

- 上游触发封装：[src/lib/apify.ts](/Users/allen/Documents/GitHub/SocialMediaCCTV/src/lib/apify.ts)
- 上游结果回调与标准化：[src/app/api/webhooks/apify/route.ts](/Users/allen/Documents/GitHub/SocialMediaCCTV/src/app/api/webhooks/apify/route.ts)
- 资讯前端类型定义：[src/types/index.ts](/Users/allen/Documents/GitHub/SocialMediaCCTV/src/types/index.ts)

问题在于：

- 当前系统主要面向 Instagram / TikTok / YouTube 视频内容
- 图文资讯数据还没有独立的数据模型和入库流水线
- 平台抓取能力散落在外部工具中，没有沉淀为项目内明确的适配层
- 机器人入口、手工录入、自动抓取未来会共享同一条管理链路，但当前还没有统一任务模型

因此，本方案的核心判断是：

1. 不把 `Agent-Reach` 作为运行时核心依赖。
2. 只搬运其中“不同平台对应什么上游抓取方案”的经验。
3. 在本仓库内部建立明确的适配器注册表和统一入库 contract。
4. 让机器人只负责提交任务，不负责实际抓取执行。

## 3. 系统目标

### 3.1 本期目标

建立一条稳定的资讯采集链路：

```text
机器人 / 人工录入
  -> 创建采集任务
  -> 识别平台
  -> 选择平台适配器
  -> 调用上游抓取能力
  -> 标准化
  -> 入库
  -> 前端展示 / 人工筛选
```

### 3.2 设计原则

- 平台抓取逻辑必须显式，不依赖 Agent 临场判断
- 每个平台允许使用不同的上游方案，但输出必须统一
- 原始抓取结果和标准化结果必须分层存储
- 所有自动抓取内容默认先进入 `pending`
- 失败可重试，成功可去重，链路可审计
- 最小化改动，复用现有 Next.js + Supabase 结构

## 4. 非目标

以下内容明确不在当前阶段：

- 通用 Agent Skill 系统
- 全网开放式搜索和自动发现
- 多 Agent 编排
- 站内资讯详情页
- 评论抓取、情感分析、自动摘要优化
- 高复杂度调度平台
- 对所有平台一次性全覆盖

## 5. 总体架构

### 5.1 架构图

```text
[Lock Bot / 内部同事]
          |
          v
[Ingest API / Task Creator]
          |
          v
[Platform Resolver]
          |
          v
[Adapter Registry]
   |        |         |         |
   v        v         v         v
[X]    [WeChat]    [XHS]    [Douyin]
   |        |         |         |
   v        v         v         v
[Upstream Provider / API / MCP / Scraper]
          |
          v
[Normalizer]
     |           |
     v           v
[source_records] [news_items]
          |
          v
[Admin Review / News Page]
```

### 5.2 分层说明

#### A. Ingest 层

负责接收任务来源：

- 机器人推送
- 后台手工录入
- 未来定时巡检

职责：

- 接收链接和附加指令
- 创建采集任务
- 识别目标平台
- 进入统一处理流程

#### B. Adapter Registry 层

负责维护平台与抓取实现的映射关系。

这层是本方案核心。系统不应该“猜”用什么抓，而是通过显式注册表决定：

```text
x           -> x adapter
wechat      -> wechat adapter
xiaohongshu -> xiaohongshu adapter
douyin      -> douyin adapter
```

#### C. Fetcher 层

每个适配器都可以有自己的上游依赖：

- 官方 API
- 第三方 API
- MCP 服务
- 自研脚本
- 外部抓取服务

允许平台差异，但不允许输出结构差异泄漏到业务层。

#### D. Normalize 层

把平台结果统一成项目内部标准结构。

#### E. Persist 层

拆成两层表：

- `source_records`：保留原始抓取结果
- `news_items`：提供给前端消费的标准化资讯项

## 6. 建议目录结构

建议新增一套最小目录结构，不重写现有项目组织：

```text
src/
  app/
    api/
      ingest/
        route.ts
      ingest/[id]/
        route.ts
      webhooks/
        apify/route.ts
        upstream/
          x/route.ts
          wechat/route.ts
  lib/
    ingest/
      registry.ts
      resolver.ts
      types.ts
      normalizers/
        news-item.ts
      adapters/
        base.ts
        x.ts
        wechat.ts
        xiaohongshu.ts
        douyin.ts
      providers/
        xreach.ts
        wechat.ts
        xiaohongshu.ts
        douyin.ts
      persistence/
        ingest-jobs.ts
        source-records.ts
        news-items.ts
```

原则：

- `adapters/` 只负责平台能力编排
- `providers/` 只负责调用具体上游
- `normalizers/` 只负责统一输出
- `persistence/` 只负责数据库读写

这样可以避免“平台逻辑 + API 调用 + 入库”混在一个文件里。

## 7. 平台适配层设计

### 7.1 统一接口

建议定义统一适配器接口：

```ts
export type SourcePlatform = "x" | "wechat" | "xiaohongshu" | "douyin";

export interface IngestRequest {
  sourceUrl: string;
  sourcePlatform?: SourcePlatform;
  requestedBy: string;
  ingestMethod: "manual" | "bot" | "scheduled";
  notes?: string;
}

export interface FetchResult {
  canonicalUrl: string;
  externalId?: string;
  authorName?: string;
  title?: string;
  summary?: string;
  contentText?: string;
  coverImageUrl?: string;
  publishedAt?: string;
  media?: string[];
  metrics?: Record<string, number>;
  rawPayload: unknown;
}

export interface SourceAdapter {
  platform: SourcePlatform;
  canHandle(input: IngestRequest): boolean;
  fetch(input: IngestRequest): Promise<FetchResult>;
}
```

### 7.2 Registry 设计

`registry.ts` 中显式注册：

```ts
export const adapters = [
  xAdapter,
  wechatAdapter,
  xiaohongshuAdapter,
  douyinAdapter,
];
```

`resolver.ts` 的职责：

- 优先使用显式传入的 `sourcePlatform`
- 没有时根据 URL 域名解析平台
- 找不到适配器时直接报错，不隐式降级

### 7.3 平台建议映射

#### X

目标：

- 输入单条帖子 URL
- 抓取正文、作者、发布时间、图片、视频、基础互动数据

建议上游：

- 第一优先：你们自有的可控脚本
- 第二优先：`xreach` 一类稳定 CLI / API

不建议：

- 让 Agent 自由决定调用什么搜索工具

#### WeChat

目标：

- 输入公众号文章 URL
- 抓取标题、作者、发布时间、正文纯文本、封面图、原始链接

建议上游：

- 文章解析脚本
- 后续再补搜索型能力

当前阶段建议只做“给定 URL 的精确抓取”，不先做关键词搜索。

#### XiaoHongShu

目标：

- 输入笔记链接
- 抓取标题、正文、作者、发布时间、图片、视频封面

建议上游：

- `xiaohongshu-mcp` 或等价上游服务

注意：

- 小红书运行环境复杂，容易受登录态、环境依赖影响
- 第一阶段建议只支持“单条链接抓取”

#### Douyin

目标：

- 输入单条视频分享链接
- 抓取标题、作者、发布时间、封面、视频链接、互动数

建议上游：

- `douyin-mcp-server` 或等价上游

注意：

- 当前阶段先聚焦视频信息提取与外链展示，不扩展评论和文案识别

## 8. 数据模型设计

### 8.1 核心表

建议新增三张核心表。

#### A. `ingest_jobs`

表示一次采集任务。

建议字段：

```text
id uuid pk
source_url text not null
source_platform text not null
ingest_method text not null          -- manual | bot | scheduled
requested_by text not null
status text not null                 -- queued | running | succeeded | failed
error_message text null
source_record_id uuid null
news_item_id uuid null
created_at timestamptz not null
updated_at timestamptz not null
```

职责：

- 记录是谁发起的
- 记录当前抓取状态
- 支持失败重试
- 连接原始记录和标准化记录

#### B. `source_records`

表示抓取到的原始来源内容。

建议字段：

```text
id uuid pk
platform text not null
external_id text null
canonical_url text not null
author_name text null
title text null
published_at timestamptz null
content_text text null
cover_image_url text null
media jsonb null
metrics jsonb null
raw_payload jsonb not null
fetch_status text not null           -- succeeded | partial | failed
created_at timestamptz not null
updated_at timestamptz not null
```

职责：

- 作为抓取原始事实表
- 保留完整 `raw_payload`
- 支持后续重新标准化

#### C. `news_items`

表示前端真正消费的资讯数据。

建议字段：

```text
id uuid pk
source_record_id uuid not null
title text not null
summary text not null
source_platform text not null
source_url text not null
author_name text not null
published_at timestamptz not null
cover_image_url text null
ingest_method text not null
status text not null                 -- pending | featured | ignored
created_by text not null
updated_by text not null
tags text[] null
is_top_story boolean not null default false
source_metadata jsonb null
created_at timestamptz not null
updated_at timestamptz not null
```

这张表应与当前前端 `NewsItem` 类型对齐：

- [src/types/index.ts](/Users/allen/Documents/GitHub/SocialMediaCCTV/src/types/index.ts)

### 8.2 去重策略

建议优先使用：

- `platform + canonical_url`

如果平台能够稳定返回外部 ID，再加：

- `platform + external_id`

建议：

- `source_records` 做唯一约束
- `news_items` 不直接承担去重责任

### 8.3 状态流转

`ingest_jobs.status`

```text
queued -> running -> succeeded
                  -> failed
```

`news_items.status`

```text
pending -> featured
pending -> ignored
featured -> ignored
ignored -> featured
```

## 9. API 设计

### 9.1 创建任务

`POST /api/ingest`

请求体：

```json
{
  "sourceUrl": "https://...",
  "sourcePlatform": "x",
  "requestedBy": "bot:lock",
  "ingestMethod": "bot",
  "notes": "录入内部监控"
}
```

职责：

- 校验参数
- 识别平台
- 写入 `ingest_jobs`
- 同步触发或异步触发抓取

### 9.2 查询任务

`GET /api/ingest/:id`

返回：

- 任务状态
- 错误信息
- 关联的 `source_record`
- 关联的 `news_item`

### 9.3 后台审核

沿用资讯后台页面，后续增加真实 API：

- `GET /api/news`
- `POST /api/news`
- `PATCH /api/news/:id`
- `DELETE /api/news/:id`

## 10. 处理流程设计

### 10.1 同步直抓版本

适合第一阶段，最少变更。

```text
POST /api/ingest
  -> create ingest_job(queued)
  -> resolve adapter
  -> update ingest_job(running)
  -> adapter.fetch()
  -> persist source_record
  -> normalize news_item
  -> persist news_item(status=pending)
  -> update ingest_job(succeeded)
```

优点：

- 最简单
- 易于开发和调试
- 适合初始低并发内部使用

缺点：

- 请求时间较长
- 外部抓取波动会直接影响接口响应

### 10.2 异步任务版本

第二阶段再做。

```text
POST /api/ingest
  -> create ingest_job(queued)
  -> background worker consumes job
  -> fetch / normalize / persist
  -> update status
```

建议第一阶段不要先上复杂 worker，避免过早抽象。

## 11. 规范化规则

### 11.1 标题

- 优先取平台原始标题
- 没有标题时使用正文前若干字符生成
- 不在 adapter 内做复杂摘要生成

### 11.2 摘要

- 第一阶段采用显式截断或简单规则生成
- 第二阶段再引入摘要增强

### 11.3 作者

- 保留平台原始作者名
- 允许为空，但 `news_items` 入库前尽量补齐为非空字符串

### 11.4 发布时间

- 优先存原始精确时间
- 缺失时允许回退到抓取时间，但需在 `source_metadata` 标注来源

## 12. 安全与稳定性

### 12.1 凭证管理

- 所有上游凭证只存环境变量或受控配置
- 不写死到仓库
- 按 provider 维度隔离配置

### 12.2 错误记录

每次抓取失败必须记录：

- 失败阶段
- 平台
- 上游 provider
- 错误摘要
- 原始错误文本

### 12.3 可观测性

第一阶段至少做到：

- `ingest_jobs` 可查看状态
- API 返回明确错误
- 服务端日志打印任务 ID 和平台

## 13. 与现有代码的衔接

### 13.1 可直接复用

- Supabase 管理客户端
- Next.js API 路由结构
- 现有前端 `NewsItem` 类型
- 现有工作台页面布局
- 当前 Apify webhook 标准化模式

### 13.2 需要新增

- 资讯数据真实表
- 采集任务表
- 平台适配器注册表
- `POST /api/ingest`
- 资讯入库持久化层

### 13.3 建议后续清理

本仓库中临时加入的 `agent-reach` 相关脚本不应成为主系统核心路径。后续应把真正需要的 provider 能力沉淀到 `src/lib/ingest/providers/`，避免仓库长期依赖外部 agent 安装器。

## 14. 分阶段落地计划

### Phase 1

目标：打通最小资讯链路

- 新增 `ingest_jobs`
- 新增 `source_records`
- 新增 `news_items`
- 实现 `POST /api/ingest`
- 实现 `x adapter`
- 实现 `wechat adapter`
- 将结果入库并在后台页中读取真实数据

验收标准：

- 给一条 X 链接，可生成 `pending` 资讯
- 给一条公众号链接，可生成 `pending` 资讯
- 后台可以修改状态到 `featured`

### Phase 2

目标：补平台扩展与稳定性

- 实现 `xiaohongshu adapter`
- 实现 `douyin adapter`
- 增加失败重试
- 增加去重策略
- 增加任务详情查询

### Phase 3

目标：机器人接入和自动化

- 机器人直接调用 `/api/ingest`
- 支持来源标签和附加指令
- 按作者/来源做定时巡检

## 15. 测试方案

### 15.1 单元测试

覆盖：

- URL 平台识别
- adapter 选择逻辑
- normalize 规则
- 去重逻辑

### 15.2 集成测试

覆盖：

- `POST /api/ingest`
- provider mock 返回
- `source_records` 与 `news_items` 正确写入

### 15.3 UI 验证

覆盖：

- 后台查看 `pending` 数据
- 手动切换 `featured` / `ignored`
- 首页只展示 `featured`

## 16. 当前推荐的第一步实施范围

为了控制复杂度，建议第一轮只做以下内容：

1. 数据库新增三张表
2. 建立 `src/lib/ingest/` 骨架
3. 实现 `x` 和 `wechat` 两个适配器
4. 打通 `/api/ingest`
5. 让资讯后台读取真实 Supabase 数据

不建议第一轮就做：

- 小红书与抖音完整接入
- 后台任务调度系统
- 搜索能力
- 自动摘要增强

## 17. Open Questions

以下问题需要在正式开发前确认：

1. 机器人传入的最小参数集是什么，是否只保证 URL？
2. `requested_by` 是否要映射到真实用户体系，还是先存字符串？
3. `news_items.summary` 第一阶段是否允许纯规则生成？
4. 微信和 X 是否都先只支持“单条 URL 抓取”？
5. 小红书和抖音是否允许作为 Phase 2，而不是首批上线阻塞项？

## 18. 结论

本项目后续应从“集成通用 Agent 抓取工具”转向“构建可控的资讯采集适配层”。

最小可行路径是：

```text
先建任务模型
 -> 再建适配器注册表
 -> 再实现 X / WeChat
 -> 再补入库和审核
 -> 最后扩展 XHS / Douyin
```

这条路线与当前仓库结构最兼容，也最符合“机器人做入口、脚本做执行、数据库做中台、前端做展示”的真实业务目标。
