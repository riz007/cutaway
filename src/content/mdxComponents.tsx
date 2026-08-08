import type { ReactNode } from 'react';
import { COMPONENTS_BY_ID } from '@/domain/registry';
import { useAppStore } from '@/app/store/appStore';

function Part({ id, children }: { id: string; children?: ReactNode }) {
  const select = useAppStore((s) => s.select);
  const hover = useAppStore((s) => s.hover);
  const component = COMPONENTS_BY_ID.get(id);

  if (!component) {
    return <span className="text-danger">{children ?? id}</span>;
  }

  return (
    <button
      type="button"
      onClick={() => select(component.id)}
      onMouseEnter={() => hover(component.id)}
      onMouseLeave={() => hover(null)}
      className="text-primary underline decoration-dotted underline-offset-2"
    >
      {children ?? component.label}
    </button>
  );
}

function Note({ children }: { children?: ReactNode }) {
  return (
    <aside className="rounded-[var(--radius-control)] border-l-2 border-primary bg-surface-2 px-3 py-2 text-[0.9375rem] leading-relaxed text-muted">
      {children}
    </aside>
  );
}

function Warning({ children }: { children?: ReactNode }) {
  return (
    <aside
      role="note"
      className="rounded-[var(--radius-control)] border border-danger/60 bg-danger-soft px-3 py-2 text-[0.9375rem] leading-relaxed text-fg"
    >
      <strong className="mr-1">⚠</strong>
      {children}
    </aside>
  );
}

function Market({ region = 'Thailand', children }: { region?: string; children?: ReactNode }) {
  return (
    <aside className="rounded-[var(--radius-control)] border border-primary/30 bg-primary/8 px-3 py-2 text-[0.9375rem] leading-relaxed text-muted">
      <span className="mb-1 block text-2xs font-semibold uppercase tracking-[0.06em] text-primary">{region}</span>
      {children}
    </aside>
  );
}

export const mdxComponents = {
  Part,
  Note,
  Warning,
  Market,
};
