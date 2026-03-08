# SocialMediaCCTV (ViraX)

内部社媒监控系统，用于维护博主池、抓取多平台内容，并按互动指标进行内容浏览与筛选。

## 功能概览

- 博主管理：新增/删除 Instagram、TikTok、YouTube 账号
- 内容抓取：对接 Apify Actor，抓取并通过 Webhook 回流入库
- 内容展示：按点赞排序，支持时间范围与标签筛选
- 管理能力：管理员页面检索与删除博主
- 认证机制：Supabase Auth（注册需邀请码）

## 技术栈

- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS 4 + Radix UI
- Supabase (Auth + Postgres)
- Apify (采集任务触发与回调)

## 目录结构

```text
src/
  app/
    api/                  # API 路由（profiles/feed/webhook/proxy 等）
    admin/                # 管理页
    page.tsx              # 主页 feed
  components/
    auth/                 # 登录注册与用户状态
    feed/                 # 帖子卡片
    profile/              # 新增博主表单
    ui/                   # shadcn/radix 组件
  lib/                    # Supabase/Apify/标签分类/工具函数
  types/                  # 共享类型定义
```

## 本地开发

1. 安装依赖：

```bash
npm install
```

2. 配置环境变量：

```bash
cp env.example .env.local
```

3. 启动开发环境：

```bash
npm run dev
```

默认访问地址：`http://localhost:3000`

## 环境变量

关键变量见 `env.example`：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APIFY_API_TOKEN`
- `NEXT_PUBLIC_BASE_URL`
- `VIRAX_SECRET_KEY`
- `CRON_SECRET`

## 常用命令

```bash
npm run dev      # 本地开发
npm run lint     # 代码检查
npm run build    # 生产构建验证
npm run start    # 启动生产服务
```

## 数据流说明

1. 在前端添加博主，写入 `profiles` 与标签表
2. 服务端触发 Apify Actor 抓取
3. Apify Webhook 回调 `/api/webhooks/apify`
4. 服务端清洗后 upsert 到 `posts`
5. 前端通过 `/api/feed` 展示并筛选
