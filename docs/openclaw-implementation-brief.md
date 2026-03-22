# OpenClaw Implementation Brief

## Mission

You are integrating OpenClaw as the bot entrypoint for this repository.

Your job is to make OpenClaw accept a user-submitted URL, classify it, and hand it to the correct existing project flow through a single project API.

Do not build a parallel backend.
Do not write directly to Supabase from OpenClaw.
Do not let OpenClaw call multiple frontend-oriented APIs directly.

Build one bot-facing intake API inside this project, and let OpenClaw call that API.

---

## Product Behavior

When a user sends a URL to OpenClaw:

1. If it is an `X author page`, add it to tracked sources and trigger author tracking.
2. If it is an `X post URL`, ingest it as a news candidate.
3. If it is an `Instagram / TikTok / YouTube creator profile`, create a profile using the existing profile flow and trigger the existing scrape.

Supported classes:

- `x_author_page`
- `x_post_page`
- `creator_profile`
- `unsupported`

---

## Existing Project Flows To Reuse

Reuse these. Do not reimplement them from scratch.

### X post ingest

- API: `/api/ingest`
- Main service: `src/lib/ingest/service.ts`
- Persistence: `src/lib/ingest/persistence.ts`

### X tracked author flow

- API: `/api/tracked-sources`
- Existing logic uses `ingestSource({ mode: 'author_tracking', ... })`

### Instagram / TikTok / YouTube profile flow

- API: `/api/profiles`
- Input parsing: `src/lib/profile-input.ts`
- Existing scrape trigger: `src/lib/apify.ts`
- Existing webhook sink: `src/app/api/webhooks/apify/route.ts`

### Existing constraints

- `POST /api/profiles` currently expects auth + tag fields.
- `POST /api/ingest` and `POST /api/tracked-sources` are not shape-compatible for direct bot use.
- Therefore the bot must call a new unified project API.

---

## Required Architecture

Implement this shape:

```text
User
  -> OpenClaw Bot
  -> POST /api/bot/intake
  -> Project-side URL classifier
  -> Project-side dispatch to existing services
  -> Return unified result
  -> OpenClaw replies to user
```

Do not do:

- OpenClaw -> Supabase directly
- OpenClaw -> `/api/ingest` or `/api/tracked-sources` or `/api/profiles` directly
- Duplicate routing logic in multiple places

---

## Required Code Changes

### 1. Add a bot intake route

Create:

```text
src/app/api/bot/intake/route.ts
```

This route must:

- accept a bot request
- verify shared-secret auth
- validate input
- classify the URL server-side
- dispatch to the correct existing flow
- return a unified response contract

### 2. Add bot-side domain logic

Create:

```text
src/lib/bot/types.ts
src/lib/bot/classify-url.ts
src/lib/bot/intake-service.ts
```

### 3. Extract reusable services from API handlers

Do not use API-to-API calls inside the app.

Extract reusable service functions so the new bot intake route and the existing UI routes can share business logic.

Recommended additions:

```text
src/lib/profiles/service.ts
src/lib/tracked-sources/service.ts
```

Then refactor:

- `src/app/api/profiles/route.ts`
- `src/app/api/tracked-sources/route.ts`

so they call those services instead of owning all the logic inline.

Keep the existing ingest service in place and reuse it.

---

## URL Classification Rules

Server-side classification is authoritative.
OpenClaw may do a rough pre-check, but the project decides.

### `x_author_page`

Examples:

- `https://x.com/username`
- `https://twitter.com/username`

Must not match:

- `/status/...`
- `/article/...`
- `/search?...`
- non-root user subpaths that are not author home

Expected action:

- create or update tracked source
- trigger `author_tracking`

### `x_post_page`

Examples:

- `https://x.com/username/status/123`
- `https://twitter.com/username/status/123`
- `https://x.com/i/status/123`
- `https://x.com/username/article/123`

Expected action:

- call existing news ingest flow
- create `ingest_jobs`
- upsert `source_records`
- upsert `news_items`

### `creator_profile`

Examples:

- `https://instagram.com/name`
- `https://www.instagram.com/name/`
- `https://www.tiktok.com/@name`
- `https://www.youtube.com/@name`
- `https://www.youtube.com/channel/xyz`
- `https://www.youtube.com/user/xyz`
- `https://www.youtube.com/c/xyz`

Expected action:

- create a profile
- attach valid tags
- trigger the existing scrape

### `unsupported`

Everything else.

Return a clear error message explaining current support scope.

---

## Request Contract

Implement this request shape:

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

Rules:

- `url` is required
- `requestedBy` is required
- `context` is optional and for auditing only
- `profileTags` is only required for `creator_profile`

---

## Response Contract

All bot flows must return one stable response shape.

### Example: X post

```json
{
  "route": "x_post_page",
  "status": "completed",
  "message": "X content ingested and pending review.",
  "data": {
    "jobId": "uuid",
    "newsItemId": "uuid"
  }
}
```

### Example: X author

```json
{
  "route": "x_author_page",
  "status": "accepted",
  "message": "Tracked source added and author fetch triggered.",
  "data": {
    "trackedSourceId": "uuid",
    "totalPersisted": 8
  }
}
```

### Example: creator profile

```json
{
  "route": "creator_profile",
  "status": "accepted",
  "message": "Profile created and initial scrape triggered.",
  "data": {
    "profileId": "uuid",
    "platform": "youtube"
  }
}
```

### Example: unsupported

```json
{
  "route": "unsupported",
  "status": "rejected",
  "message": "Only X author pages, X post URLs, and Instagram/TikTok/YouTube creator profiles are supported."
}
```

---

## Auth Requirements

The bot-facing route must use a dedicated shared secret.

Add this environment variable:

```text
OPENCLAW_BOT_SECRET=...
```

Require:

```text
Authorization: Bearer <OPENCLAW_BOT_SECRET>
```

Do not reuse:

- `SUPABASE_SERVICE_ROLE_KEY`
- Supabase user access tokens
- `VIRAX_SECRET_KEY`

If auth fails, return `401`.

---

## Important Business Constraint

`creator_profile` is not a scrape-only flow.
It is a profile creation flow and currently needs taxonomy tags.

These values already exist in the app:

- benchmark type
- culture tags
- content tags

Read these files and stay compatible:

- `src/lib/taxonomy.ts`
- `src/app/api/profiles/route.ts`

### Required behavior

If the bot submits a creator profile without valid `profileTags`, do not silently create a profile with guessed tags.

Instead:

- reject with `400`, or
- return a structured response indicating missing tag fields

The bot should then ask the user for the missing tags before retrying.

Do not default tags unless you also update product rules explicitly.

---

## OpenClaw Bot-Side Setup

Configure OpenClaw to behave as a thin router and API caller.

### 1. Enable command execution if needed

If OpenClaw will use shell commands such as `curl`, make sure tool execution is enabled:

```bash
openclaw config set tools.profile "coding"
openclaw gateway restart
```

Or set:

```json
{
  "tools": {
    "profile": "coding"
  }
}
```

in:

```text
~/.openclaw/openclaw.json
```

### 2. Configure bot environment variables

OpenClaw should have access to:

```text
PROJECT_BASE_URL=https://social-media-cctv.vercel.app
OPENCLAW_BOT_SECRET=<secret>
```

Do not hardcode secrets in prompt text.

### 3. Give OpenClaw these operating instructions

Use this behavior:

```text
When a user sends a URL:

1. Extract the first valid URL.
2. Roughly classify it:
   - X author page
   - X post page
   - Instagram/TikTok/YouTube creator profile
3. For creator profiles, if benchmarkType / cultureTags / contentTags are missing, ask the user for them before calling the API.
4. Call POST {PROJECT_BASE_URL}/api/bot/intake
5. Include Authorization: Bearer {OPENCLAW_BOT_SECRET}
6. Convert the JSON response into a short Chinese user-facing confirmation.
7. If the API says unsupported, explain current support scope.
```

### 4. Example bot-side call

#### X post

```bash
curl -X POST "$PROJECT_BASE_URL/api/bot/intake" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENCLAW_BOT_SECRET" \
  -d '{
    "url": "https://x.com/abc/status/123",
    "requestedBy": "openclaw:user_42"
  }'
```

#### Creator profile

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

---

## User-Facing Reply Expectations

Keep replies short and explicit.

### For X author pages

Chinese reply:

```text
已加入 X 监控列表，并触发最近内容抓取。
```

### For X post URLs

Chinese reply:

```text
这条 X 内容已入库，当前状态为待筛选。
```

### For creator profiles

Chinese reply:

```text
博主已建档，并触发首轮抓取。
```

### For missing profile tags

Chinese reply:

```text
这是博主主页链接。我还需要你补充建档标签：对标类型、文化标签、内容标签。
```

---

## Suggested Implementation Order

1. Add the bot types and URL classifier.
2. Add the bot intake service.
3. Add `/api/bot/intake`.
4. Extract reusable services from `profiles` and `tracked-sources` routes.
5. Wire the intake route into those services.
6. Add auth and request validation.
7. Add tests.
8. Then configure OpenClaw to call the new route.

---

## Required Tests

At minimum, add coverage for:

- classify `x.com/username` as `x_author_page`
- classify `x.com/username/status/123` as `x_post_page`
- classify Instagram/TikTok/YouTube creator URLs as `creator_profile`
- reject unsupported URLs
- reject missing or invalid bot secret
- reject creator profile requests with missing required tag fields
- preserve dedupe behavior for repeated X post ingest
- preserve duplicate protection for repeated profile creation

If this repo has no existing app test harness, add the smallest reasonable test setup for these pure functions and service boundaries.

---

## Definition of Done

The work is complete when all of the following are true:

1. OpenClaw can send one URL to one project API.
2. The project classifies the URL server-side.
3. X author URLs land in tracked sources and trigger author ingest.
4. X post URLs land in the news ingest pipeline.
5. Instagram/TikTok/YouTube creator URLs create profiles and trigger existing scrape logic.
6. Bot auth uses a dedicated secret.
7. OpenClaw never writes directly to Supabase.
8. The bot receives a stable unified JSON response for all supported cases.

---

## Non-Goals For This Iteration

Do not include these in this pass:

- WeChat bot ingest
- XiaoHongShu / Douyin / Weibo bot routing
- async callback-based bot scraping
- queue systems
- direct OpenClaw-to-Supabase integration
- replacing existing Apify flows

Keep the diff focused.
