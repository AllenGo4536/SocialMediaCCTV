import { Film, TrendingUp, UserPlus } from 'lucide-react';

export const feedSections = [
  {
    href: '/feed',
    label: '内容池',
    shortLabel: '内容池',
    description: '视频素材浏览与筛选',
    icon: Film,
  },
  {
    href: '/feed/creators',
    label: '达人录入',
    shortLabel: '达人录入',
    description: '主页链接录入与已关注达人',
    icon: UserPlus,
  },
  {
    href: '/feed/growth',
    label: '涨粉雷达',
    shortLabel: '涨粉雷达',
    description: '基于主页快照的涨粉速度榜单',
    icon: TrendingUp,
  },
] as const;
