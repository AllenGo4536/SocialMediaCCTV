export const PLATFORMS = ['instagram', 'tiktok', 'youtube'] as const;

export type Platform = (typeof PLATFORMS)[number];

export const BENCHMARK_TAGS = ['ip_benchmark', 'aesthetic_benchmark'] as const;
export type BenchmarkTag = (typeof BENCHMARK_TAGS)[number];

export const CULTURE_TAGS = ['culture_me', 'culture_west'] as const;
export type CultureTag = (typeof CULTURE_TAGS)[number];

export const CONTENT_TAGS = [
  'style_performance_camera',
  'pov',
  'daily_life',
  'asmr',
  'virtual_idol',
] as const;
export type ContentTag = (typeof CONTENT_TAGS)[number];

export const TAG_GROUPS = ['benchmark_type', 'culture', 'content_type'] as const;
export type TagGroup = (typeof TAG_GROUPS)[number];

export interface TagDefinition {
  id: string;
  label: string;
  group: TagGroup;
}

export const TAG_DEFINITIONS: TagDefinition[] = [
  { id: 'ip_benchmark', label: 'IP对标', group: 'benchmark_type' },
  { id: 'aesthetic_benchmark', label: '美学对标', group: 'benchmark_type' },
  { id: 'culture_me', label: '中东', group: 'culture' },
  { id: 'culture_west', label: '欧美', group: 'culture' },
  { id: 'style_performance_camera', label: '穿搭/唱跳/运镜', group: 'content_type' },
  { id: 'pov', label: 'POV', group: 'content_type' },
  { id: 'daily_life', label: '日常记录', group: 'content_type' },
  { id: 'asmr', label: 'ASMR', group: 'content_type' },
  { id: 'virtual_idol', label: '虚拟偶像', group: 'content_type' },
];

const PLATFORM_SET = new Set<string>(PLATFORMS);
const BENCHMARK_SET = new Set<string>(BENCHMARK_TAGS);
const CULTURE_SET = new Set<string>(CULTURE_TAGS);
const CONTENT_SET = new Set<string>(CONTENT_TAGS);

export function isValidPlatform(value: string): value is Platform {
  return PLATFORM_SET.has(value);
}

export function isValidBenchmarkTag(value: string): value is BenchmarkTag {
  return BENCHMARK_SET.has(value);
}

export function isValidCultureTag(value: string): value is CultureTag {
  return CULTURE_SET.has(value);
}

export function isValidContentTag(value: string): value is ContentTag {
  return CONTENT_SET.has(value);
}

