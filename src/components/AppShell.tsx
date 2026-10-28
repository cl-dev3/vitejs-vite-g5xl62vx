import type { ReactNode } from 'react';

interface Props {
  title: string;
  headerAction?: ReactNode;
  preview: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}

export default function AppShell({
  title,
  headerAction,
  preview,
  footer,
  children,
}: Props) {
  return (
    <div
      className="flex flex-col bg-slate-50 text-slate-800"
      style={{
        height: '100dvh',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <header className="flex h-10 shrink-0 items-center justify-between border-b border-slate-200 px-3">
        <span className="text-sm font-semibold">{title}</span>
        {headerAction}
      </header>

      <section
        className="shrink-0 border-b border-slate-200 bg-white"
        style={{ height: '45dvh', touchAction: 'none' }}
      >
        {preview}
      </section>

      <main className="flex-1 overflow-y-auto p-3">{children}</main>

      {footer}
    </div>
  );
}
