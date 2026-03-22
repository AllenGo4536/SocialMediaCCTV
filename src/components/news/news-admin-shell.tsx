"use client";

import { WorkspaceShell } from '@/components/layout/workspace-shell';

interface NewsAdminShellProps {
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function NewsAdminShell({
  actions,
  children,
}: NewsAdminShellProps) {
  return (
    <WorkspaceShell
      title="录入后台"
      actions={actions}
    >
      {children}
    </WorkspaceShell>
  );
}
