"use client";

import { WorkspaceShell } from '@/components/layout/workspace-shell';

interface NewsAdminShellProps {
  sectionTitle: string;
  sectionDescription: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function NewsAdminShell({
  sectionTitle,
  sectionDescription,
  actions,
  children,
}: NewsAdminShellProps) {
  return (
    <WorkspaceShell
      title="录入后台"
      description="拆成两个二级页面：一条线管文章入库，一条线管 X 博主定向监控。"
      actions={actions}
    >
      <section className="mb-6 rounded-[28px] border border-border/70 bg-card/55 px-5 py-5 sm:px-6">
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Admin Section</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{sectionTitle}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{sectionDescription}</p>
      </section>

      {children}
    </WorkspaceShell>
  );
}
