import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TODAY = new Date();
const RECENT_WINDOW_DAYS = 14;
const BASELINE_WINDOW_DAYS = 45;
const TECH_KEYWORDS = [
  'kling',
  'klingai',
  'seedance',
  'sora',
  'veo',
  'veo2',
  'veo3',
  'higgsfield',
  'invideo',
  'hitpaw',
  'glam',
  'imagineart',
  'wan',
  'wanx',
  'gemini',
  'suno',
  'midjourney',
  'runway',
  'pika',
  'luma',
  'haiper',
  'hedra',
];
const TECH_CHANGE_WORDS = [
  'new',
  'launch',
  'dropped',
  'release',
  'update',
  'beta',
  'guide',
  'chat',
  'social',
  'community',
  'live',
  'team',
  'workflow',
  'generator',
  'edit',
  'enhance',
];
const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'you', 'your', 'are', 'was', 'but', 'not', 'all',
  'our', 'out', 'has', 'have', 'had', 'from', 'into', 'just', 'its', 'they', 'their', 'his', 'her',
  'she', 'him', 'who', 'what', 'when', 'where', 'why', 'how', 'today', 'video', 'videos', 'post',
  'reels', 'instagram', 'tiktok', 'youtube', 'will', 'can', 'did', 'too', 'very', 'more', 'than',
  'then', 'them', 'there', 'here', 'about', 'after', 'before', 'over', 'under', 'again', 'only',
  'some', 'such', 'through', 'been', 'being', 'because', 'while', 'within', 'right', 'straight',
  'complete', 'public', 'private', 'worldwide', 'community', 'guide', 'link', 'comment', 'send',
  'dm', 'dms', 'please', 'official', 'concept', 'design', 'looks', 'look', 'made', 'make', 'using',
  'used', 'result', 'generated', 'generator', 'generated', 'audio', 'visual', 'processed', 'story',
  'music', 'song', 'part', 'newyear', 'happy', 'love', 'cute', 'funny', 'viral', 'repost', 'credit',
  'caption', 'chat', 'real', 'meet', 'dropped', 'jump', 'watch', 'create', 'creator', 'creators',
  'content', 'project', 'projects', 'share', 'work', 'works', 'team', 'teams', 'built', 'within',
  'together', 'live', 'easily', 'improve', 'perfectly', 'restore', 'quality',
  'one', 'want', 'exact', 'child', 'adult', 'same', 'keep', 'keeping', 'every', 'full', 'version',
  'tutorial', 'prompts', 'prompts', 'prompt', 'image', 'images', 'videoedit', 'videoshow', 'here',
  'original', 'originals', 'interesting', 'insanely', 'easy', 'easier', 'used', 'call', 'received',
  'requests', 'request', 'send', 'straight', 'recreate', 'replace', 'shows', 'show', 'care',
  'person', 'sitting', 'near', 'cake', 'scene', 'exactly', 'studio', 'cinema', 'creative', 'creativity',
  'level', 'fullguide', 'world', 'first', 'next', 'generation', 'platform', 'streaming',
]);

const TREND_PATTERNS = [
  {
    id: 'pet-cctv',
    label: 'Pet CCTV / animal reaction loops',
    keywords: ['cat', 'dog', 'funnycats', 'funnydogs', 'nightvision', 'cctv', 'samoyed', 'weirdcat', 'crazycat'],
  },
  {
    id: 'transition-tutorial',
    label: 'Transition tutorial + prompt unlock',
    keywords: ['transition', 'tutorial', 'higgsfield', 'flashback', 'outfit', 'zoolander', 'birthday'],
  },
  {
    id: 'fandom-edits',
    label: 'Fandom / character remix edits',
    keywords: ['batman', 'joker', 'harleyquinn', 'wonderwoman', 'superman', 'dc', 'dccomics', 'dcuniverse'],
  },
  {
    id: 'surreal-music',
    label: 'Surreal AI music video',
    keywords: ['surreal', 'suno', 'veo', 'veo3', 'gemini', '2026'],
  },
  {
    id: 'fashion-concept',
    label: 'Fashion / celeb concept remake',
    keywords: ['fashion', 'puma', 'rose', 'rosé', 'mermaid', 'kling3'],
  },
];

function daysAgo(days) {
  return new Date(TODAY.getTime() - days * 24 * 60 * 60 * 1000);
}

function safeNumber(value) {
  return Number.isFinite(value) ? value : 0;
}

function engagementScore(post) {
  const likes = safeNumber(post.like_count);
  const comments = safeNumber(post.comment_count);
  const plays = safeNumber(post.video_play_count || post.video_view_count);
  return likes + comments * 12 + plays * 0.02;
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return '0';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${Math.round(value)}`;
}

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function normalizeToken(token) {
  return token
    .toLowerCase()
    .replace(/^#+/, '')
    .replace(/[\u2019']/g, '')
    .replace(/[^a-z0-9._+-]/g, '');
}

function tokenizeText(text, options = {}) {
  const { includeStopwords = false } = options;
  if (!text) return [];
  const matches = text.match(/#[\p{L}\p{N}_]+|[\p{L}\p{N}_-]{3,}/gu) || [];
  const tokens = [];
  for (const rawToken of matches) {
    const token = normalizeToken(rawToken);
    if (!token) continue;
    if (token.length < 3 && !token.startsWith('#')) continue;
    if (!includeStopwords && STOPWORDS.has(token)) continue;
    tokens.push(token);
  }
  return tokens;
}

function tokenizeHandle(text) {
  if (!text) return [];
  return (text.toLowerCase().match(/[a-z0-9]+/g) || []).filter(Boolean);
}

function uniq(array) {
  return [...new Set(array)];
}

function getProfileType(profile) {
  const tagIds = profile.tags.map((tag) => tag.id);
  if (tagIds.includes('brand_official_account')) return 'brand_official_account';
  if (tagIds.includes('pet_track')) return 'pet_track';
  if (tagIds.includes('aesthetic_benchmark')) return 'aesthetic_benchmark';
  if (tagIds.includes('ip_benchmark')) return 'ip_benchmark';
  return 'uncategorized';
}

function getKeywordStat(map, token) {
  if (!map.has(token)) {
    map.set(token, {
      token,
      postCount: 0,
      profileIds: new Set(),
      scoreSum: 0,
    });
  }
  return map.get(token);
}

function collectPostTokens(post, profile, options = {}) {
  return new Set(
    uniq([
      ...(post.hashtags || []).map(normalizeToken),
      ...tokenizeText(post.caption || '', options),
      ...tokenizeHandle(profile?.username || ''),
      ...tokenizeHandle(profile?.full_name || ''),
    ]).filter(Boolean),
  );
}

function rankKeywordStats(map, minProfiles = 1) {
  return [...map.values()]
    .map((stat) => ({
      ...stat,
      profileCount: stat.profileIds.size,
      distinctProfiles: undefined,
    }))
    .filter((stat) => stat.profileCount >= minProfiles)
    .sort((a, b) => {
      if (b.profileCount !== a.profileCount) return b.profileCount - a.profileCount;
      if (b.scoreSum !== a.scoreSum) return b.scoreSum - a.scoreSum;
      return b.postCount - a.postCount;
    });
}

async function fetchAllProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, platform, username, full_name, created_at');

  if (error) throw new Error(`profiles query failed: ${error.message}`);

  const profileIds = data.map((profile) => profile.id);
  const tagsByProfile = new Map();

  if (profileIds.length > 0) {
    const { data: tagRows, error: tagError } = await supabase
      .from('profile_tags')
      .select('profile_id, tag_id, tag_definitions!inner(id, name, group_key)')
      .in('profile_id', profileIds);

    if (tagError) throw new Error(`profile_tags query failed: ${tagError.message}`);

    for (const row of tagRows || []) {
      const tag = Array.isArray(row.tag_definitions) ? row.tag_definitions[0] : row.tag_definitions;
      if (!tagsByProfile.has(row.profile_id)) tagsByProfile.set(row.profile_id, []);
      tagsByProfile.get(row.profile_id).push({
        id: tag.id,
        name: tag.name,
        group: tag.group_key,
      });
    }
  }

  return data.map((profile) => ({
    ...profile,
    tags: tagsByProfile.get(profile.id) || [],
  }));
}

async function fetchAllPosts() {
  const pageSize = 1000;
  let from = 0;
  const rows = [];

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from('posts')
      .select('id, platform, profile_id, caption, hashtags, like_count, comment_count, video_view_count, video_play_count, posted_at, permalink')
      .order('posted_at', { ascending: false })
      .range(from, to);

    if (error) throw new Error(`posts query failed: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }

  return rows.map((post) => ({
    ...post,
    postedAtDate: post.posted_at ? new Date(post.posted_at) : null,
    score: engagementScore(post),
  }));
}

function computeSummary(posts, profiles) {
  const withCaption = posts.filter((post) => (post.caption || '').trim().length > 0).length;
  const withHashtags = posts.filter((post) => Array.isArray(post.hashtags) && post.hashtags.length > 0).length;
  const byPlatform = posts.reduce((acc, post) => {
    acc[post.platform] = (acc[post.platform] || 0) + 1;
    return acc;
  }, {});
  const byProfileType = profiles.reduce((acc, profile) => {
    const type = getProfileType(profile);
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  return {
    profileCount: profiles.length,
    postCount: posts.length,
    withCaption,
    withHashtags,
    byPlatform,
    byProfileType,
  };
}

function computeTechSignals(posts, profilesById) {
  const techPosts = posts
    .map((post) => {
      const profile = profilesById.get(post.profile_id);
      const tokens = collectPostTokens(post, profile);
      const matchedTech = TECH_KEYWORDS.filter((keyword) => tokens.has(normalizeToken(keyword)));
      const matchedChange = TECH_CHANGE_WORDS.filter((keyword) => tokens.has(normalizeToken(keyword)));
      const isOfficial = profile && getProfileType(profile) === 'brand_official_account';
      return {
        ...post,
        profile,
        tokens,
        matchedTech,
        matchedChange,
        isOfficial,
      };
    })
    .filter((post) => post.isOfficial || post.matchedTech.length > 0);

  const recentCutoff = daysAgo(RECENT_WINDOW_DAYS);
  const recentTechPosts = techPosts.filter((post) => post.postedAtDate && post.postedAtDate >= recentCutoff);

  const keywordCounts = new Map();
  for (const post of recentTechPosts) {
    for (const token of uniq(post.matchedTech)) {
      const stat = getKeywordStat(keywordCounts, token);
      stat.postCount += 1;
      stat.profileIds.add(post.profile_id);
      stat.scoreSum += post.score;
    }
  }

  const rankedKeywords = rankKeywordStats(keywordCounts).slice(0, 8);
  const rankedPosts = recentTechPosts
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((post) => ({
      postId: post.id,
      username: post.profile?.username || 'unknown',
      platform: post.platform,
      postedAt: post.posted_at,
      score: post.score,
      likes: post.like_count || 0,
      comments: post.comment_count || 0,
      plays: post.video_play_count || post.video_view_count || 0,
      matchedTech: post.matchedTech,
      matchedChange: post.matchedChange,
      caption: (post.caption || '').replace(/\s+/g, ' ').trim(),
    }));

  return {
    recentCount: recentTechPosts.length,
    topKeywords: rankedKeywords,
    topPosts: rankedPosts,
  };
}

function computeTrendSignals(posts, profilesById) {
  const recentCutoff = daysAgo(RECENT_WINDOW_DAYS);
  const baselineCutoff = daysAgo(BASELINE_WINDOW_DAYS);

  const recentPosts = posts.filter((post) => post.postedAtDate && post.postedAtDate >= recentCutoff);
  const baselinePosts = posts.filter(
    (post) => post.postedAtDate && post.postedAtDate >= baselineCutoff && post.postedAtDate < recentCutoff,
  );

  const recentMap = new Map();
  const baselineMap = new Map();

  for (const post of recentPosts) {
    const tokens = uniq([...(post.hashtags || []).map(normalizeToken), ...tokenizeText(post.caption || '')]);
    for (const token of tokens) {
      if (!token) continue;
      const stat = getKeywordStat(recentMap, token);
      stat.postCount += 1;
      stat.profileIds.add(post.profile_id);
      stat.scoreSum += post.score;
    }
  }

  for (const post of baselinePosts) {
    const tokens = uniq([...(post.hashtags || []).map(normalizeToken), ...tokenizeText(post.caption || '')]);
    for (const token of tokens) {
      if (!token) continue;
      const stat = getKeywordStat(baselineMap, token);
      stat.postCount += 1;
      stat.profileIds.add(post.profile_id);
      stat.scoreSum += post.score;
    }
  }

  const emerging = [];
  for (const stat of recentMap.values()) {
    const baseline = baselineMap.get(stat.token);
    const growth = baseline ? stat.postCount / Math.max(baseline.postCount, 1) : stat.postCount + 1;
    const isNew = !baseline;
    if (stat.profileIds.size < 2) continue;
    emerging.push({
      token: stat.token,
      recentPostCount: stat.postCount,
      recentProfileCount: stat.profileIds.size,
      recentScoreSum: stat.scoreSum,
      baselinePostCount: baseline?.postCount || 0,
      growth,
      isNew,
    });
  }

  emerging.sort((a, b) => {
    if (b.growth !== a.growth) return b.growth - a.growth;
    if (b.recentProfileCount !== a.recentProfileCount) return b.recentProfileCount - a.recentProfileCount;
    return b.recentScoreSum - a.recentScoreSum;
  });

  const recentThemes = new Map();
  const baselineThemes = new Map();

  for (const pattern of TREND_PATTERNS) {
    recentThemes.set(pattern.id, { ...pattern, postCount: 0, profileIds: new Set(), scoreSum: 0 });
    baselineThemes.set(pattern.id, { ...pattern, postCount: 0, profileIds: new Set(), scoreSum: 0 });
  }

  for (const post of recentPosts) {
      const tokens = collectPostTokens(post, profilesById.get(post.profile_id), { includeStopwords: true });
    for (const pattern of TREND_PATTERNS) {
      if (!pattern.keywords.some((keyword) => tokens.has(normalizeToken(keyword)))) continue;
      const stat = recentThemes.get(pattern.id);
      stat.postCount += 1;
      stat.profileIds.add(post.profile_id);
      stat.scoreSum += post.score;
    }
  }

  for (const post of baselinePosts) {
      const tokens = collectPostTokens(post, profilesById.get(post.profile_id), { includeStopwords: true });
    for (const pattern of TREND_PATTERNS) {
      if (!pattern.keywords.some((keyword) => tokens.has(normalizeToken(keyword)))) continue;
      const stat = baselineThemes.get(pattern.id);
      stat.postCount += 1;
      stat.profileIds.add(post.profile_id);
      stat.scoreSum += post.score;
    }
  }

  const themeSignals = TREND_PATTERNS.map((pattern) => {
    const recent = recentThemes.get(pattern.id);
    const baseline = baselineThemes.get(pattern.id);
    return {
      id: pattern.id,
      label: pattern.label,
      recentPostCount: recent.postCount,
      recentProfileCount: recent.profileIds.size,
      recentScoreSum: recent.scoreSum,
      baselinePostCount: baseline.postCount,
      growth: recent.postCount / Math.max(baseline.postCount, 1),
    };
  })
    .filter((item) => item.recentPostCount > 0)
    .sort((a, b) => {
      if (b.recentProfileCount !== a.recentProfileCount) return b.recentProfileCount - a.recentProfileCount;
      if (b.recentScoreSum !== a.recentScoreSum) return b.recentScoreSum - a.recentScoreSum;
      return b.recentPostCount - a.recentPostCount;
    });

  const topCreators = [...recentPosts]
    .map((post) => ({
      post,
      profile: profilesById.get(post.profile_id),
    }))
    .filter((entry) => entry.profile && getProfileType(entry.profile) !== 'brand_official_account')
    .sort((a, b) => b.post.score - a.post.score)
    .slice(0, 10)
    .map(({ post, profile }) => ({
      username: profile.username,
      platform: post.platform,
      profileType: getProfileType(profile),
      postedAt: post.posted_at,
      score: post.score,
      likes: post.like_count || 0,
      comments: post.comment_count || 0,
      plays: post.video_play_count || post.video_view_count || 0,
      caption: (post.caption || '').replace(/\s+/g, ' ').trim(),
      hashtags: post.hashtags || [],
    }));

  return {
    recentPostCount: recentPosts.length,
    baselinePostCount: baselinePosts.length,
    emergingKeywords: emerging.slice(0, 12),
    themeSignals,
    creatorLeaders: topCreators,
  };
}

function computeBreakoutSignals(posts, profilesById) {
  const scoresByProfile = new Map();
  for (const post of posts) {
    if (!scoresByProfile.has(post.profile_id)) scoresByProfile.set(post.profile_id, []);
    scoresByProfile.get(post.profile_id).push(post.score);
  }

  const baselineByProfile = new Map();
  for (const [profileId, scores] of scoresByProfile.entries()) {
    baselineByProfile.set(profileId, median(scores));
  }

  const recentCutoff = daysAgo(RECENT_WINDOW_DAYS);
  const ranked = posts
    .filter((post) => post.postedAtDate && post.postedAtDate >= recentCutoff)
    .map((post) => {
      const profile = profilesById.get(post.profile_id);
      const baseline = baselineByProfile.get(post.profile_id) || 1;
      const breakoutRatio = post.score / Math.max(baseline, 1);
      const ageDays = profile?.created_at
        ? Math.max(0, Math.round((TODAY.getTime() - new Date(profile.created_at).getTime()) / (24 * 60 * 60 * 1000)))
        : null;
      const tokens = uniq([...(post.hashtags || []).map(normalizeToken), ...tokenizeText(post.caption || '')]);
      return {
        postId: post.id,
        username: profile?.username || 'unknown',
        platform: post.platform,
        profileType: profile ? getProfileType(profile) : 'unknown',
        profileAgeDays: ageDays,
        postedAt: post.posted_at,
        score: post.score,
        breakoutRatio,
        likes: post.like_count || 0,
        comments: post.comment_count || 0,
        plays: post.video_play_count || post.video_view_count || 0,
        tokens,
        caption: (post.caption || '').replace(/\s+/g, ' ').trim(),
      };
    })
    .filter((item) => item.breakoutRatio >= 1.25)
    .sort((a, b) => {
      if (b.breakoutRatio !== a.breakoutRatio) return b.breakoutRatio - a.breakoutRatio;
      return b.score - a.score;
    });

  return ranked.slice(0, 12);
}

function buildReport({ summary, techSignals, trendSignals, breakoutSignals, generatedAt }) {
  const lines = [];

  lines.push('# SocialMediaCCTV signal demo');
  lines.push('');
  lines.push(`Generated at: ${generatedAt}`);
  lines.push('');
  lines.push('## 1. Snapshot');
  lines.push('');
  lines.push(`- Profiles tracked: ${summary.profileCount}`);
  lines.push(`- Posts analyzed: ${summary.postCount}`);
  lines.push(`- Posts with caption text: ${summary.withCaption} / ${summary.postCount}`);
  lines.push(`- Posts with hashtags: ${summary.withHashtags} / ${summary.postCount}`);
  lines.push(`- Platform mix: ${Object.entries(summary.byPlatform).map(([key, value]) => `${key}=${value}`).join(', ')}`);
  lines.push(`- Profile mix: ${Object.entries(summary.byProfileType).map(([key, value]) => `${key}=${value}`).join(', ')}`);
  lines.push('');
  lines.push('## 2. Upstream tech signals');
  lines.push('');
  lines.push(`- Recent tech-related posts in last ${RECENT_WINDOW_DAYS} days: ${techSignals.recentCount}`);
  lines.push(`- Most repeated tool/model keywords: ${techSignals.topKeywords.map((item) => `${item.token} (${item.postCount} posts / ${item.profileCount} profiles)`).join(', ') || 'none'}`);
  lines.push('');
  lines.push('### Notable tech posts');
  lines.push('');
  for (const item of techSignals.topPosts.slice(0, 5)) {
    lines.push(`- @${item.username} on ${item.platform}: score ${formatNumber(item.score)}, likes ${formatNumber(item.likes)}, comments ${formatNumber(item.comments)}, plays ${formatNumber(item.plays)}. Matched: ${item.matchedTech.join(', ') || 'none'}${item.matchedChange.length > 0 ? ` | change words: ${item.matchedChange.join(', ')}` : ''}`);
    lines.push(`  Caption: ${item.caption.slice(0, 220) || '(empty caption)'}`);
  }
  lines.push('');
  lines.push('## 3. Creator trend signals');
  lines.push('');
  lines.push(`- Recent window: last ${RECENT_WINDOW_DAYS} days`);
  lines.push(`- Baseline window: days ${RECENT_WINDOW_DAYS + 1}-${BASELINE_WINDOW_DAYS}`);
  lines.push(`- Emerging repeated keywords: ${trendSignals.emergingKeywords.map((item) => `${item.token} (${item.recentPostCount}/${item.recentProfileCount}${item.isNew ? ', new' : `, baseline ${item.baselinePostCount}`})`).join(', ') || 'none'}`);
  lines.push('');
  lines.push('### Theme reads');
  lines.push('');
  for (const item of trendSignals.themeSignals.slice(0, 5)) {
    lines.push(`- ${item.label}: ${item.recentPostCount} recent posts / ${item.recentProfileCount} profiles / score ${formatNumber(item.recentScoreSum)} / baseline ${item.baselinePostCount}`);
  }
  lines.push('');
  lines.push('### Recent creator leaders');
  lines.push('');
  for (const item of trendSignals.creatorLeaders.slice(0, 6)) {
    lines.push(`- @${item.username} on ${item.platform} [${item.profileType}]: score ${formatNumber(item.score)}, likes ${formatNumber(item.likes)}, comments ${formatNumber(item.comments)}, plays ${formatNumber(item.plays)}`);
    if (item.hashtags.length > 0) {
      lines.push(`  Hashtags: ${item.hashtags.slice(0, 8).join(', ')}`);
    }
    lines.push(`  Caption: ${item.caption.slice(0, 220) || '(empty caption)'}`);
  }
  lines.push('');
  lines.push('## 4. Breakout / anomaly signals');
  lines.push('');
  for (const item of breakoutSignals.slice(0, 8)) {
    lines.push(`- @${item.username} on ${item.platform}: breakout ${item.breakoutRatio.toFixed(1)}x vs profile median, score ${formatNumber(item.score)}, age ${item.profileAgeDays ?? 'unknown'}d`);
    lines.push(`  Tokens: ${item.tokens.slice(0, 8).join(', ') || 'none'}`);
    lines.push(`  Caption: ${item.caption.slice(0, 220) || '(empty caption)'}`);
  }
  lines.push('');
  lines.push('## 5. Analyst notes');
  lines.push('');
  lines.push('- This is text-only. It catches captions, hashtags, profile tags, and engagement. It does not understand visual style, shot grammar, or audio patterns yet.');
  lines.push('- Instagram text coverage is decent, but some high-performing TikTok posts have empty captions. That means breakout detection is stronger than topic labeling for those posts.');
  lines.push('- With the current dataset size, this report is best used for directional sensing, not hard forecasting.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function buildInsights(summary, techSignals, trendSignals, breakoutSignals) {
  const insights = [];

  const hasTechSocial = techSignals.topPosts.find((post) =>
    post.matchedTech.includes('higgsfield') && post.matchedChange.includes('social'),
  );
  if (hasTechSocial) {
    insights.push(
      'Upstream tools are not only shipping generation quality. They are also expanding into collaboration and native creator-network surfaces. Higgsfield content explicitly pushes social + team + live workflows, which can change distribution and creator retention economics.',
    );
  }

  const recurringPet = trendSignals.themeSignals.find((item) => item.id === 'pet-cctv');
  if (recurringPet) {
    insights.push(
      'The strongest repeatable creator pattern in the current pool is still animal-driven CCTV / pet micro-narrative content. It is low-dialogue, globally legible, and likely a good fit for AI MCN templating because text dependence is weak.',
    );
  }

  const recurringTransition = trendSignals.themeSignals.find((item) => item.id === 'transition-tutorial');
  if (recurringTransition) {
    insights.push(
      'A second clear pattern is transition-tutorial content tied to prompt unlocks and DM funnels. That is not just entertainment; it is a conversion mechanic. The content itself is acting like an acquisition surface for prompt packs or tool usage.',
    );
  }

  const recurringPov = trendSignals.emergingKeywords.find((item) => ['pov', 'vintage', 'history', 'historytok'].includes(item.token));
  if (recurringPov) {
    insights.push(
      'A second repeatable pattern is POV historical nostalgia. This matters because it suggests audiences respond to structured narrative prompts, not only cute-character loops. That opens a different supply lane: time-travel / alternate-era serialized shorts.',
    );
  }

  const surreal = trendSignals.themeSignals.find((item) => item.id === 'surreal-music')
    || trendSignals.emergingKeywords.find((item) => ['veo', 'suno', '2026', 'surreal'].includes(item.token));
  if (surreal) {
    insights.push(
      'Tool mentions such as veo, suno, gemini, and kling already appear inside creator captions of high-performing edits. That is a useful meta-signal: creators are increasingly willing to expose toolchains publicly, which means workflow imitation cycles can accelerate.',
    );
  }

  const newProfiles = breakoutSignals.filter((item) => item.profileAgeDays !== null && item.profileAgeDays <= 7);
  if (newProfiles.length > 0) {
    insights.push(
      `Several breakouts came from newly added profiles (${newProfiles.length} signals inside a 7-day profile age window). That supports using the platform as an early-reading bench: new accounts can surface monetizable formats before they are fully saturated.`,
    );
  }

  insights.push(
    `Current data mix is ${summary.byPlatform.instagram || 0} Instagram / ${summary.byPlatform.tiktok || 0} TikTok / ${summary.byPlatform.youtube || 0} YouTube posts, so the demo is strongest for IG caption patterns and weaker for video-first TikTok formats with sparse text.`,
  );

  return insights;
}

async function main() {
  const profiles = await fetchAllProfiles();
  const posts = await fetchAllPosts();
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));

  const summary = computeSummary(posts, profiles);
  const techSignals = computeTechSignals(posts, profilesById);
  const trendSignals = computeTrendSignals(posts, profilesById);
  const breakoutSignals = computeBreakoutSignals(posts, profilesById);
  const insights = buildInsights(summary, techSignals, trendSignals, breakoutSignals);
  const generatedAt = TODAY.toISOString();
  const report = buildReport({
    summary,
    techSignals,
    trendSignals,
    breakoutSignals,
    generatedAt,
  });

  const outputPath = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.join(ROOT_DIR, 'docs', 'signal-demo-latest.md');

  await fs.writeFile(outputPath, report, 'utf8');

  console.log(JSON.stringify({
    outputPath,
    summary,
    insights,
    techSignals: {
      recentCount: techSignals.recentCount,
      topKeywords: techSignals.topKeywords.slice(0, 5),
      topPosts: techSignals.topPosts.slice(0, 3).map((post) => ({
        username: post.username,
        matchedTech: post.matchedTech,
        score: post.score,
      })),
    },
    trendSignals: {
      emergingKeywords: trendSignals.emergingKeywords.slice(0, 8),
      themeSignals: trendSignals.themeSignals.slice(0, 5),
      creatorLeaders: trendSignals.creatorLeaders.slice(0, 3).map((item) => ({
        username: item.username,
        profileType: item.profileType,
        score: item.score,
      })),
    },
    breakoutSignals: breakoutSignals.slice(0, 5).map((item) => ({
      username: item.username,
      breakoutRatio: item.breakoutRatio,
      score: item.score,
      profileAgeDays: item.profileAgeDays,
    })),
  }, null, 2));

  console.log('\nINSIGHTS');
  for (const insight of insights) {
    console.log(`- ${insight}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
