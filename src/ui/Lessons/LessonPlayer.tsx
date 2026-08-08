import { useEffect, useMemo } from 'react';
import type { SystemId } from '@/domain/types';
import { COMPONENTS_BY_ID } from '@/domain/registry';
import { useAppStore } from '@/app/store/appStore';
import { guidedLessons } from '@/content';
import { useT } from '@/i18n';
import { Button, Card } from '../primitives';

export function LessonPlayer() {
  const t = useT();
  const activeLessonId = useAppStore((s) => s.activeLessonId);
  const lessonStep = useAppStore((s) => s.lessonStep);
  const startLesson = useAppStore((s) => s.startLesson);
  const setLessonStep = useAppStore((s) => s.setLessonStep);
  const endLesson = useAppStore((s) => s.endLesson);
  const soloSystem = useAppStore((s) => s.soloSystem);
  const showAllSystems = useAppStore((s) => s.showAllSystems);
  const select = useAppStore((s) => s.select);

  const lesson = useMemo(() => guidedLessons.find((l) => l.id === activeLessonId) ?? null, [activeLessonId]);
  const steps = lesson?.steps ?? [];
  const step = steps[lessonStep];

  useEffect(() => {
    if (!step) return;
    if (step.system) soloSystem(step.system as SystemId);
    else showAllSystems();
    if (step.focus && COMPONENTS_BY_ID.has(step.focus)) select(step.focus);
  }, [step, soloSystem, showAllSystems, select]);

  if (!lesson) {
    return (
      <Card title={t('lesson.title')}>
        {guidedLessons.length === 0 ? (
          <p className="text-sm text-subtle">{t('lesson.empty')}</p>
        ) : (
          <ul className="space-y-1.5">
            {guidedLessons.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  onClick={() => startLesson(option.id)}
                  className="flex w-full items-center justify-between gap-2 rounded-[var(--radius-control)] border border-border bg-surface-2 px-3 py-2.5 text-left text-sm text-fg transition-colors hover:border-border-strong hover:bg-elevated"
                >
                  <span className="min-w-0 truncate">{option.title}</span>
                  <span className="numeric shrink-0 text-2xs text-subtle">{option.steps?.length ?? 0}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    );
  }

  return (
    <Card
      title={lesson.title}
      action={
        <Button variant="ghost" size="sm" onClick={endLesson}>
          {t('lesson.exit')}
        </Button>
      }
    >
      <div className="space-y-3">
        <p className="text-2xs uppercase tracking-[0.06em] text-subtle">
          {t('lesson.step', { current: lessonStep + 1, total: steps.length })}
        </p>

        {step && (
          <div>
            <h3 className="text-base font-semibold text-fg">{step.title}</h3>
            <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-muted">{step.body}</p>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 justify-center"
            disabled={lessonStep === 0}
            onClick={() => setLessonStep(lessonStep - 1)}
          >
            {t('lesson.previous')}
          </Button>
          <Button
            variant="primary"
            className="flex-1 justify-center"
            disabled={lessonStep >= steps.length - 1}
            onClick={() => setLessonStep(lessonStep + 1)}
          >
            {t('lesson.next')}
          </Button>
        </div>
      </div>
    </Card>
  );
}
