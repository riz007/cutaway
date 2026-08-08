import { Suspense, lazy, useMemo, type ComponentType } from 'react';
import { useT } from '@/i18n';
import { loadComponentLesson } from './index';

const cache = new Map<string, ComponentType<{ compact?: boolean }>>();

function ReviewBadge({ review, compact }: { review: string | undefined; compact: boolean }) {
  const t = useT();
  if (review === 'reviewed') return null;

  if (compact) {
    return <p className="mb-2 text-xs font-semibold text-warn">{t('inspector.reviewPending')}</p>;
  }
  return (
    <div className="mb-3 rounded-[var(--radius-control)] border border-warn/40 bg-warn-soft px-3 py-2">
      <p className="text-sm font-semibold text-warn">{t('inspector.reviewPending')}</p>
      <p className="mt-1 text-[0.9375rem] leading-relaxed text-muted">{t('inspector.reviewPending.detail')}</p>
    </div>
  );
}

function lessonComponent(slug: string): ComponentType<{ compact?: boolean }> | null {
  const cached = cache.get(slug);
  if (cached) return cached;

  const loader = loadComponentLesson(slug);
  if (!loader) return null;

  const Lazy = lazy(async () => {
    const mod = await loader();
    const Body = mod.default;
    const review = mod.meta?.review;
    return {
      default: ({ compact = false }: { compact?: boolean }) => (
        <>
          <ReviewBadge review={review} compact={compact} />
          <div className="prose-lesson">
            <Body />
          </div>
        </>
      ),
    };
  });

  cache.set(slug, Lazy);
  return Lazy;
}

export function Lesson({
  slug,
  fallbackText,
  compact = false,
  emptyNotice,
}: {
  slug: string;

  fallbackText: string;
  compact?: boolean;
  emptyNotice?: string;
}) {
  const Body = useMemo(() => lessonComponent(slug), [slug]);

  if (!Body) {
    return (
      <div className="space-y-3">
        <p className="prose-lesson">{fallbackText}</p>
        {emptyNotice && (
          <p className="rounded-[var(--radius-control)] border border-shell-600 bg-surface-2 px-3 py-2 text-sm text-ink-300">
            {emptyNotice}
          </p>
        )}
      </div>
    );
  }

  return (
    <Suspense fallback={<p className="prose-lesson">{fallbackText}</p>}>
      <Body compact={compact} />
    </Suspense>
  );
}

export const hasLesson = (slug: string): boolean => loadComponentLesson(slug) !== null;
