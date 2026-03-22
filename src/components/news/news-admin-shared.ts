import type { NewsStatus } from '@/types';

export const REQUESTED_BY = 'team@virax.local';

export const statusLabels: Record<NewsStatus, string> = {
  pending: '待筛选',
  featured: '已入选',
  ignored: '已忽略',
};

export const statusTone: Record<NewsStatus, string> = {
  pending: 'border-transparent bg-amber-500/12 text-amber-200',
  featured: 'border-transparent bg-emerald-500/12 text-emerald-300',
  ignored: 'border-transparent bg-zinc-500/15 text-zinc-300',
};

export function normalizeXHandle(value: string) {
  return value
    .trim()
    .replace(/^@/, '')
    .replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, '')
    .split('/')[0]
    || '';
}

export function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
