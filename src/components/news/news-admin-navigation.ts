import { RadioTower, UserPlus } from 'lucide-react';

export const adminSections = [
  {
    href: '/admin/articles',
    label: '链接自动入库',
    shortLabel: '链接入库',
    description: '贴链接，自动识别来源并入库',
    icon: RadioTower,
  },
  {
    href: '/admin/tracked-sources',
    label: 'X博主定向监控',
    shortLabel: '博主监控',
    description: '添加博主、查看已关注列表',
    icon: UserPlus,
  },
] as const;
