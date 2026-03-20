# 2026-03-20 前端工作台迭代更新

## 1. 本轮目标

本轮目标是基于前期需求讨论，先完成产品前端结构和界面方向的定义，不接真实后端，使用模拟数据搭建可浏览、可评审、可继续细化的工作台版本。

本轮重点不是功能联调，而是确认以下问题：

- 产品是否应从单页工具升级为多页面工作台
- 图文资讯与视频信息流是否应彻底分离
- 首页是否应默认切换为资讯页
- 录入后台是否能独立承载录入和筛选动作
- 整体 UI 是否足够整洁、适合内部工具使用

## 2. 已确认的产品方向

本轮已经明确以下产品决策：

- 首页默认展示图文资讯，而不是视频 feed
- 产品结构升级为三页面工作台
- 一级页面包括：
  - 资讯页
  - 信息流页
  - 录入后台
- 图文资讯与视频内容不混在同一个 feed 中
- 自动来源内容不能直接进入首页，需人工确认
- 当前阶段所有内部用户默认都可录入，暂不区分权限

## 3. 本轮完成的产品更新

### 3.1 信息架构升级

原产品结构以单页为主，当前已升级为工作台结构：

```text
全局 Header
├─ 左侧页面导航
└─ 主内容区域

页面
├─ /        资讯页
├─ /feed    信息流页
└─ /admin   录入后台
```

### 3.2 首页切换为资讯页

根路由 `/` 已调整为图文资讯首页。

资讯页当前采用：

- 顶部简洁统计条
- 来源与时间筛选
- Top Stories 大卡片区
- 最新资讯列表区

资讯页当前只展示 `featured` 状态的模拟资讯。

### 3.3 信息流页独立

原首页的视频 feed 已迁移到 `/feed`。

当前信息流页保留了原有核心能力：

- 时间筛选
- 平台筛选
- 标签筛选
- 上传人筛选
- 卡片式帖子展示
- 分页

同时页面结构已并入新的工作台框架，不再和首页资讯混在一起。

### 3.4 录入后台独立

`/admin` 当前已切换为图文资讯录入后台的前端原型，包含：

- 资讯统计条
- 新增/编辑资讯表单
- 资讯状态筛选
- 资讯列表管理
- 状态切换
- 编辑和删除入口
- X 定向来源预留区

当前使用模拟数据驱动，可直接用于产品评审。

### 3.5 UI 结构收敛

在这一轮后半段，界面又做了一次收敛，参考了用户提供的工具站截图方向。

已完成的 UI 调整包括：

- 顶部改为统一全局 Header
- 右上角保留用户登录入口
- 左侧保留简洁的页面导航
- 去掉大量解释性文案
- 去掉多余的说明型卡片
- 主内容区尽量只保留标题、筛选、卡片和操作

当前界面目标是：

- 更像内部工作台
- 更少“文档感”
- 更少“讲解型区域”
- 让内容和操作本身成为页面主体

## 4. 本轮新增的前端对象与模拟数据

本轮为了支持图文资讯业务线，新增了前端层面的资讯对象和来源对象。

### 4.1 模拟资讯对象

当前前端已引入新闻资讯类对象，用于驱动资讯页和后台管理页。

已覆盖的字段包括：

- 标题
- 摘要
- 封面图
- 来源平台
- 原文链接
- 作者
- 发布时间
- 录入方式
- 状态
- 标签

### 4.2 模拟来源对象

为第二阶段的 X 自动跟踪能力预留了来源对象，当前用于后台占位展示，包括：

- 来源账号
- 跟踪状态
- 最近检查时间
- 最新动态摘要

## 5. 本轮产出的关键文件

### 5.1 需求文档

- [`docs/frontend-news-workbench-prd.md`](/Users/allen/Documents/GitHub/SocialMediaCCTV/docs/frontend-news-workbench-prd.md)

用于记录本轮前端工作台的需求定义和范围边界。

### 5.2 主要前端实现文件

- [`src/components/layout/workspace-shell.tsx`](/Users/allen/Documents/GitHub/SocialMediaCCTV/src/components/layout/workspace-shell.tsx)
- [`src/components/news/news-page.tsx`](/Users/allen/Documents/GitHub/SocialMediaCCTV/src/components/news/news-page.tsx)
- [`src/components/feed/feed-page-content.tsx`](/Users/allen/Documents/GitHub/SocialMediaCCTV/src/components/feed/feed-page-content.tsx)
- [`src/components/news/news-admin-page.tsx`](/Users/allen/Documents/GitHub/SocialMediaCCTV/src/components/news/news-admin-page.tsx)
- [`src/lib/mock-news-data.ts`](/Users/allen/Documents/GitHub/SocialMediaCCTV/src/lib/mock-news-data.ts)
- [`src/types/index.ts`](/Users/allen/Documents/GitHub/SocialMediaCCTV/src/types/index.ts)

### 5.3 路由层变化

- [`src/app/page.tsx`](/Users/allen/Documents/GitHub/SocialMediaCCTV/src/app/page.tsx)
- [`src/app/feed/page.tsx`](/Users/allen/Documents/GitHub/SocialMediaCCTV/src/app/feed/page.tsx)
- [`src/app/admin/page.tsx`](/Users/allen/Documents/GitHub/SocialMediaCCTV/src/app/admin/page.tsx)

## 6. 当前可用的页面能力

### 6.1 资讯页

当前可用于评审：

- 首页资讯层级是否合理
- Top Stories 和列表是否符合内部使用习惯
- 筛选项是否足够
- 页面是否足够简洁

### 6.2 信息流页

当前可用于评审：

- 信息流是否适合作为独立素材池
- 与资讯页拆分后逻辑是否更清楚
- 筛选区和卡片区是否需要进一步压缩

### 6.3 录入后台

当前可用于评审：

- 录入表单是否够用
- 状态流转是否清晰
- 后台布局是否适合后续扩展
- X 来源区预留位置是否合理

## 7. 本轮未做内容

以下内容本轮明确没有进入实施：

- 真实后端数据接入
- 图文资讯数据库表设计
- X API 联调
- 微信公众号正文抓取
- 小红书接入
- 用户权限系统
- 站内资讯详情页
- AI 摘要或打分

## 8. 技术验证结果

本轮前端修改后已完成基础验证：

- `npm run lint` 通过
- `npm run build` 通过
- 本地页面已人工检查：
  - `/`
  - `/feed`
  - `/admin`

说明当前工作台结构和页面组件可以稳定运行，适合继续进行 UI 精修和后端接入设计。

## 9. 当前阶段结论

本轮已经完成了一个关键转折：

从“视频监控单页工具”正式演进为“资讯页 + 信息流页 + 录入后台”的三页面内部工作台。

这意味着后续讨论后端时，已经不再需要反复争论页面结构和业务边界，后端设计可以直接围绕这套前端结构展开。

## 10. 下一轮建议

建议下一轮继续按以下顺序推进：

1. 继续收紧 UI 细节
2. 统一三页的间距、控件尺寸、卡片密度
3. 确认录入后台最终字段
4. 确认资讯页是否需要更多筛选维度
5. 基于现有前端结构设计真实后端模型和 API

## 11. 一句话总结

本轮完成了产品前端形态的第一次成型：结构已从单页演进为工作台，资讯、信息流、录入后台三条线已经拆开，且界面已从“解释型草稿”进一步收敛为更接近真实内部工具的状态。
