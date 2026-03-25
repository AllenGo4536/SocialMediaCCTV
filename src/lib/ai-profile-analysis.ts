export const AI_PROFILE_SOURCE_VERSION = 'heuristic_v1';
export const AI_PROFILE_ANALYSIS_POST_LIMIT = 20;

export const AI_TAG_GROUPS = [
  'content_theme',
  'content_format',
  'tool_signal',
  'commercial_signal',
] as const;

export type AiTagGroup = (typeof AI_TAG_GROUPS)[number];

export interface AiTagDefinition {
  id: string;
  label: string;
  group: AiTagGroup;
  description: string;
}

interface RuleDefinition extends AiTagDefinition {
  keywords: string[];
  minPosts?: number;
  minKeywordHits?: number;
}

export interface ProfileAnalysisInput {
  id: string;
  platform: 'instagram' | 'tiktok' | 'youtube';
  username: string;
  full_name?: string | null;
}

export interface ProfileAnalysisPost {
  id: string;
  caption?: string | null;
  hashtags?: string[] | null;
  like_count?: number | null;
  comment_count?: number | null;
  video_view_count?: number | null;
  video_play_count?: number | null;
  posted_at?: string | null;
}

interface EvidenceItem {
  postId: string;
  postedAt: string | null;
  score: number;
  matchedKeywords: string[];
  excerpt: string;
}

export interface GeneratedAiTag {
  id: string;
  label: string;
  group: AiTagGroup;
  confidence: number;
  evidence: EvidenceItem[];
}

export interface GeneratedAiSummary {
  summary: string;
  analyzedPostCount: number;
  generatedAt: string;
  sourceVersion: string;
  topKeywords: string[];
  metadata: Record<string, unknown>;
}

export interface ProfileAiAnalysisResult {
  tags: GeneratedAiTag[];
  summary: GeneratedAiSummary;
}

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'you', 'your', 'are', 'was', 'were', 'from', 'into',
  'have', 'has', 'had', 'just', 'then', 'than', 'they', 'their', 'them', 'will', 'would', 'here',
  'there', 'about', 'after', 'before', 'over', 'under', 'again', 'only', 'some', 'such', 'through',
  'been', 'being', 'because', 'while', 'what', 'when', 'where', 'which', 'who', 'why', 'how',
  'today', 'video', 'videos', 'reels', 'post', 'posts', 'content', 'creator', 'creators', 'create',
  'comment', 'comments', 'send', 'guide', 'link', 'full', 'version', 'easy', 'interesting', 'look',
  'looks', 'made', 'make', 'using', 'used', 'result', 'results', 'work', 'works', 'real', 'new',
  'show', 'shows', 'straight', 'please', 'official', 'original', 'originals', 'story', 'stories',
  'music', 'song', 'songs', 'happy', 'love', 'cute', 'funny', 'viral', 'instagram', 'tiktok', 'youtube',
  'exact', 'exactly', 'one', 'want', 'here', 'thisis', 'just', 'right', 'way', 'smooth',
  'every', 'inside', 'like', 'live', 'any', 'pc', 'https', 'http', 'bit', 'image', 'built',
]);

const RULES: RuleDefinition[] = [
  {
    id: 'pet_cctv',
    label: '宠物监控叙事',
    group: 'content_theme',
    description: '以猫狗或宠物为主角，带有监控视角、夜视或反应流叙事的内容',
    keywords: ['cat', 'cats', 'dog', 'dogs', 'pet', 'pets', 'samoyed', 'nightvision', 'cctv', 'funnycats', 'funnydogs', 'weirdcat', 'crazycat'],
    minPosts: 1,
  },
  {
    id: 'pet_anthropomorphic',
    label: '宠物拟人化剧情',
    group: 'content_theme',
    description: '把宠物放入约会、面试、上班、做饭等拟人化场景',
    keywords: ['cat', 'dog', 'samoyed', 'interview', 'date', 'chef', 'office', 'vlog', 'birthday', 'luck', 'specialist'],
    minPosts: 1,
  },
  {
    id: 'fandom_character_remix',
    label: '影视角色混剪重制',
    group: 'content_theme',
    description: '围绕影视、漫画、游戏角色进行 AI 改编或再演绎',
    keywords: ['batman', 'joker', 'harleyquinn', 'catwoman', 'bane', 'wonderwoman', 'superman', 'dc', 'dccomics', 'dcuniverse', 'gotham', 'marvel', 'hero'],
    minPosts: 1,
  },
  {
    id: 'fashion_concept_remix',
    label: '时尚概念视觉',
    group: 'content_theme',
    description: '围绕穿搭、时尚品牌、名人概念图或产品视觉展开',
    keywords: ['fashion', 'outfit', 'luxury', 'style', 'puma', 'rose', 'rosé', 'blackpink', 'ballet', 'mermaid'],
    minPosts: 2,
  },
  {
    id: 'surreal_ai_music_video',
    label: '超现实音乐视频',
    group: 'content_theme',
    description: '结合超现实视觉、音乐、歌词或 MV 式表达的 AI 内容',
    keywords: ['surreal', 'suno', 'sunomusic', 'veo', 'veo3', 'gemini', 'music', 'song', 'audio', 'visual', 'dream'],
    minPosts: 2,
  },
  {
    id: 'nostalgia_pov',
    label: '怀旧 POV / 年代叙事',
    group: 'content_theme',
    description: '围绕年代感、复古、历史穿越、POV 叙事的内容',
    keywords: ['pov', 'vintage', 'history', 'historytok', 'retro', '1960s', '80s', '1980s', 'teenager', 'america'],
    minPosts: 2,
  },
  {
    id: 'transition_tutorial',
    label: '转场教程',
    group: 'content_format',
    description: '以 transition、flashback、before/after 等技巧作为主内容',
    keywords: ['transition', 'flashback', 'tutorial', 'recreate', 'edit', 'smooth', 'beforeafter'],
    minPosts: 1,
  },
  {
    id: 'prompt_unlock_funnel',
    label: 'Prompt 领取漏斗',
    group: 'content_format',
    description: '通过评论关键词、私信、guide link 等方式承接转化',
    keywords: ['prompt', 'prompts', 'dm', 'dms', 'comment', 'guide', 'link', 'send', 'cinema', 'child', 'outfit', 'zoolander'],
    minPosts: 1,
  },
  {
    id: 'cinematic_edit',
    label: '电影感剪辑',
    group: 'content_format',
    description: '强调 cinematic、lighting、realistic 等电影化视觉表达',
    keywords: ['cinematic', 'lighting', 'realistic', 'film', 'scene', 'studio', 'camera', 'visual', 'movie'],
    minPosts: 1,
  },
  {
    id: 'short_reaction_loop',
    label: '短反应循环',
    group: 'content_format',
    description: '短小、反应型、循环型内容，常见于宠物和趣味账号',
    keywords: ['3am', 'reaction', 'funnyviral', 'crazycat', 'weirdcat', 'loop', 'funnyvideos'],
    minPosts: 1,
  },
  {
    id: 'uses_higgsfield',
    label: '高频提及 Higgsfield',
    group: 'tool_signal',
    description: '文案或标签中频繁出现 Higgsfield',
    keywords: ['higgsfield', 'higgsfieldai'],
    minPosts: 1,
    minKeywordHits: 1,
  },
  {
    id: 'uses_kling',
    label: '高频提及 Kling',
    group: 'tool_signal',
    description: '文案或标签中频繁出现 Kling / KlingAI',
    keywords: ['kling', 'klingai', 'kling3'],
    minPosts: 1,
    minKeywordHits: 1,
  },
  {
    id: 'uses_veo',
    label: '高频提及 VEO',
    group: 'tool_signal',
    description: '文案或标签中频繁出现 VEO',
    keywords: ['veo', 'veo2', 'veo3'],
    minPosts: 1,
    minKeywordHits: 1,
  },
  {
    id: 'uses_suno',
    label: '高频提及 Suno',
    group: 'tool_signal',
    description: '文案或标签中频繁出现 Suno',
    keywords: ['suno', 'sunomusic'],
    minPosts: 1,
    minKeywordHits: 1,
  },
  {
    id: 'uses_seedance',
    label: '高频提及 Seedance',
    group: 'tool_signal',
    description: '文案或标签中频繁出现 Seedance',
    keywords: ['seedance'],
    minPosts: 1,
    minKeywordHits: 1,
  },
  {
    id: 'uses_hitpaw',
    label: '高频提及 HitPaw',
    group: 'tool_signal',
    description: '文案或标签中频繁出现 HitPaw',
    keywords: ['hitpaw', 'vikpea'],
    minPosts: 1,
    minKeywordHits: 1,
  },
];

export const AI_TAG_DEFINITIONS: AiTagDefinition[] = RULES.map(({ id, label, group, description }) => ({
  id,
  label,
  group,
  description,
}));

function normalizeToken(token: string) {
  return token
    .toLowerCase()
    .replace(/^#+/, '')
    .replace(/[\u2019']/g, '')
    .replace(/[^a-z0-9._+-]/g, '');
}

function tokenizeText(text: string | null | undefined) {
  if (!text) return [];
  const matches = text.match(/#[\p{L}\p{N}_]+|[\p{L}\p{N}_+-]{3,}/gu) || [];
  return matches
    .map(normalizeToken)
    .filter((token) => token.length >= 2 && !STOPWORDS.has(token));
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function excerpt(text: string | null | undefined, maxLength = 140) {
  if (!text) return '';
  const compact = text.replace(/\s+/g, ' ').trim();
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, maxLength - 1)}…`;
}

function scorePost(post: ProfileAnalysisPost) {
  const likes = post.like_count || 0;
  const comments = post.comment_count || 0;
  const plays = post.video_play_count || post.video_view_count || 0;
  return likes + comments * 12 + plays * 0.02;
}

function confidenceForMatch(
  matchedPosts: number,
  keywordHits: number,
  engagementShare: number,
  postCoverage: number,
) {
  const base = 0.38;
  const postContribution = Math.min(0.25, matchedPosts * 0.08);
  const keywordContribution = Math.min(0.18, keywordHits * 0.03);
  const shareContribution = Math.min(0.17, engagementShare * 0.17);
  const coverageContribution = Math.min(0.17, postCoverage * 0.25);
  return Math.min(0.95, Number((base + postContribution + keywordContribution + shareContribution + coverageContribution).toFixed(2)));
}

function matchesRule(rule: RuleDefinition, tokens: Set<string>) {
  if (rule.id === 'pet_anthropomorphic') {
    const petTokens = ['cat', 'dog', 'samoyed', 'pet', 'patican', 'noodles'];
    const scenarioTokens = ['interview', 'date', 'chef', 'office', 'vlog', 'birthday', 'luck', 'specialist'];
    const matchedPetTokens = petTokens.filter((keyword) => tokens.has(normalizeToken(keyword)));
    const matchedScenarioTokens = scenarioTokens.filter((keyword) => tokens.has(normalizeToken(keyword)));
    return matchedPetTokens.length > 0 && matchedScenarioTokens.length > 0
      ? [...matchedPetTokens, ...matchedScenarioTokens]
      : [];
  }

  return rule.keywords.filter((keyword) => tokens.has(normalizeToken(keyword)));
}

function groupLabels(tags: GeneratedAiTag[], group: AiTagGroup) {
  return tags.filter((tag) => tag.group === group).map((tag) => tag.label);
}

function groupToolNames(tags: GeneratedAiTag[]) {
  return tags
    .filter((tag) => tag.group === 'tool_signal')
    .map((tag) => tag.label.replace(/^高频提及\s*/, ''));
}

function computeTopKeywords(posts: ProfileAnalysisPost[]) {
  const stats = new Map<string, { count: number; score: number }>();

  for (const post of posts) {
    const score = scorePost(post);
    const tokens = unique([
      ...tokenizeText(post.caption),
      ...((post.hashtags || []).map((tag) => normalizeToken(tag))),
    ]);

    for (const token of tokens) {
      if (!token || STOPWORDS.has(token)) continue;
      const current = stats.get(token) || { count: 0, score: 0 };
      if (/^\d+$/.test(token)) continue;
      current.count += 1;
      current.score += score;
      stats.set(token, current);
    }
  }

  return [...stats.entries()]
    .sort((a, b) => {
      if (b[1].count !== a[1].count) return b[1].count - a[1].count;
      return b[1].score - a[1].score;
    })
    .slice(0, 8)
    .map(([token]) => token);
}

function buildSummary(profile: ProfileAnalysisInput, tags: GeneratedAiTag[], posts: ProfileAnalysisPost[], topKeywords: string[]): string {
  if (posts.length === 0) {
    return '该账号目前入库帖子不足，暂时无法生成 AI 内容标签。';
  }

  const themes = groupLabels(tags, 'content_theme');
  const formats = groupLabels(tags, 'content_format');
  const tools = groupToolNames(tags);
  const commercial = groupLabels(tags, 'commercial_signal');

  const segments: string[] = [];

  if (themes.length > 0) {
    segments.push(`这个账号最近主要在做${themes.slice(0, 2).join('、')}`);
  } else {
    segments.push('这个账号最近的内容主题还不够稳定');
  }

  if (formats.length > 0) {
    segments.push(`常见内容形式是${formats.slice(0, 2).join('、')}`);
  }

  if (tools.length > 0) {
    segments.push(`文案里高频提到 ${tools.slice(0, 2).join('、')}`);
  }

  if (commercial.length > 0) {
    segments.push(`从业务角度看更接近${commercial.slice(0, 2).join('、')}`);
  }

  if (topKeywords.length > 0) {
    segments.push(`最近高频词包括 ${topKeywords.slice(0, 5).join('、')}`);
  }

  return `${profile.username}：${segments.join('，')}。`;
}

export function analyzeProfileAi(
  profile: ProfileAnalysisInput,
  posts: ProfileAnalysisPost[],
): ProfileAiAnalysisResult {
  const sortedPosts = [...posts].sort((a, b) => {
    const aTime = a.posted_at ? new Date(a.posted_at).getTime() : 0;
    const bTime = b.posted_at ? new Date(b.posted_at).getTime() : 0;
    return bTime - aTime;
  }).slice(0, AI_PROFILE_ANALYSIS_POST_LIMIT);

  const generatedAt = new Date().toISOString();
  if (sortedPosts.length === 0) {
    return {
      tags: [],
      summary: {
        summary: '该账号目前入库帖子不足，暂时无法生成 AI 内容标签。',
        analyzedPostCount: 0,
        generatedAt,
        sourceVersion: AI_PROFILE_SOURCE_VERSION,
        topKeywords: [],
        metadata: {},
      },
    };
  }

  const totalScore = sortedPosts.reduce((sum, post) => sum + scorePost(post), 0) || 1;
  const tagResults: GeneratedAiTag[] = [];

  for (const rule of RULES) {
    const evidence: EvidenceItem[] = [];
    let matchedPosts = 0;
    let keywordHits = 0;
    let matchedScore = 0;

    for (const post of sortedPosts) {
      const tokens = new Set([
        ...tokenizeText(post.caption),
        ...((post.hashtags || []).map((tag) => normalizeToken(tag))),
      ]);
      const matchedKeywords = matchesRule(rule, tokens);
      if (matchedKeywords.length === 0) continue;

      matchedPosts += 1;
      keywordHits += matchedKeywords.length;
      const postScore = scorePost(post);
      matchedScore += postScore;
      evidence.push({
        postId: post.id,
        postedAt: post.posted_at || null,
        score: Number(postScore.toFixed(2)),
        matchedKeywords,
        excerpt: excerpt(post.caption),
      });
    }

    if (matchedPosts < (rule.minPosts || 1)) continue;
    if (keywordHits < (rule.minKeywordHits || 1)) continue;

    const confidence = confidenceForMatch(
      matchedPosts,
      keywordHits,
      matchedScore / totalScore,
      matchedPosts / sortedPosts.length,
    );

    tagResults.push({
      id: rule.id,
      label: rule.label,
      group: rule.group,
      confidence,
      evidence: evidence
        .sort((a, b) => b.score - a.score)
        .slice(0, 3),
    });
  }

  const recurringPosts = sortedPosts.filter((post) => {
    const tokens = new Set([
      ...tokenizeText(post.caption),
      ...((post.hashtags || []).map((tag) => normalizeToken(tag))),
    ]);
    return RULES.some((rule) => rule.group === 'content_format' && rule.keywords.some((keyword) => tokens.has(normalizeToken(keyword))));
  });

  if (recurringPosts.length >= 3 || recurringPosts.length / sortedPosts.length >= 0.45) {
    tagResults.push({
      id: 'serializable_format',
      label: '适合系列化生产',
      group: 'commercial_signal',
      confidence: confidenceForMatch(recurringPosts.length, recurringPosts.length, recurringPosts.length / sortedPosts.length, recurringPosts.length / sortedPosts.length),
      evidence: recurringPosts
        .map((post) => ({
          postId: post.id,
          postedAt: post.posted_at || null,
          score: Number(scorePost(post).toFixed(2)),
          matchedKeywords: unique([
            ...tokenizeText(post.caption),
            ...((post.hashtags || []).map((tag) => normalizeToken(tag))),
          ]).slice(0, 5),
          excerpt: excerpt(post.caption),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3),
    });
  }

  const leadGenPosts = tagResults.find((tag) => tag.id === 'prompt_unlock_funnel');
  if (leadGenPosts) {
    tagResults.push({
      id: 'lead_gen_content',
      label: '内容承接获客',
      group: 'commercial_signal',
      confidence: Math.min(0.95, Number((leadGenPosts.confidence + 0.06).toFixed(2))),
      evidence: leadGenPosts.evidence,
    });
  }

  const brandIntegrationEvidence = sortedPosts
    .map((post) => {
      const tokens = new Set([
        ...tokenizeText(post.caption),
        ...((post.hashtags || []).map((tag) => normalizeToken(tag))),
      ]);
      const matchedKeywords = ['ad', 'sponsored', 'sponsor', 'partnership', 'product', 'review', '광고']
        .filter((keyword) => tokens.has(normalizeToken(keyword)));

      return {
        post,
        matchedKeywords,
      };
    })
    .filter((item) => item.matchedKeywords.length > 0);

  if (brandIntegrationEvidence.length > 0) {
    tagResults.push({
      id: 'brand_integration_ready',
      label: '适合品牌植入',
      group: 'commercial_signal',
      confidence: confidenceForMatch(
        brandIntegrationEvidence.length,
        brandIntegrationEvidence.reduce((sum, item) => sum + item.matchedKeywords.length, 0),
        brandIntegrationEvidence.reduce((sum, item) => sum + scorePost(item.post), 0) / totalScore,
        brandIntegrationEvidence.length / sortedPosts.length,
      ),
      evidence: brandIntegrationEvidence
        .map((item) => ({
          postId: item.post.id,
          postedAt: item.post.posted_at || null,
          score: Number(scorePost(item.post).toFixed(2)),
          matchedKeywords: item.matchedKeywords,
          excerpt: excerpt(item.post.caption),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3),
    });
  }

  const dedupedTags = unique(tagResults.map((tag) => tag.id))
    .map((tagId) => tagResults
      .filter((tag) => tag.id === tagId)
      .sort((a, b) => b.confidence - a.confidence)[0])
    .sort((a, b) => b.confidence - a.confidence);

  const topKeywords = computeTopKeywords(sortedPosts);

  return {
    tags: dedupedTags,
    summary: {
      summary: buildSummary(profile, dedupedTags, sortedPosts, topKeywords),
      analyzedPostCount: sortedPosts.length,
      generatedAt,
      sourceVersion: AI_PROFILE_SOURCE_VERSION,
      topKeywords,
      metadata: {
        topThemeIds: dedupedTags.filter((tag) => tag.group === 'content_theme').map((tag) => tag.id),
        topFormatIds: dedupedTags.filter((tag) => tag.group === 'content_format').map((tag) => tag.id),
        toolIds: dedupedTags.filter((tag) => tag.group === 'tool_signal').map((tag) => tag.id),
      },
    },
  };
}
