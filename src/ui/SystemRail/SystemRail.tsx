import { useMemo } from 'react';
import { SYSTEMS, SYSTEM_IDS, componentsFor } from '@/domain/registry';
import type { SystemId } from '@/domain/types';
import { useAppStore, useConfiguration } from '@/app/store/appStore';
import { useT, type TranslationKey } from '@/i18n';
import { Button, SystemDot, cx } from '../primitives';

export function SystemRail() {
  const t = useT();
  const config = useConfiguration();
  const activeSystems = useAppStore((s) => s.activeSystems);
  const toggleSystem = useAppStore((s) => s.toggleSystem);
  const soloSystem = useAppStore((s) => s.soloSystem);
  const showAllSystems = useAppStore((s) => s.showAllSystems);

  const counts = useMemo(() => {
    const map = new Map<SystemId, number>();
    for (const component of componentsFor(config)) {
      map.set(component.system, (map.get(component.system) ?? 0) + 1);
    }
    return map;
  }, [config.vehicleId, config.archetype, config.powertrain]);

  const showingAll = activeSystems.size === 0;

  return (
    <nav aria-label={t('nav.systems')} className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
        <h2 className="text-2xs font-semibold uppercase tracking-[0.08em] text-subtle">{t('nav.systems')}</h2>
        <Button variant="ghost" size="sm" onClick={showAllSystems} disabled={showingAll}>
          {t('controls.showAll')}
        </Button>
      </div>

      <div className="relative min-h-0 flex-1">
        <ul className="scroll-area h-full overflow-y-auto p-1.5 pb-4">
        {SYSTEM_IDS.map((id) => {
          const meta = SYSTEMS[id];
          const count = counts.get(id) ?? 0;
          const active = activeSystems.has(id);
          const label = t(meta.labelKey as TranslationKey);
          const absent = count === 0;

          return (
            <li key={id} className="group/row flex items-center gap-1">
              <button
                type="button"
                disabled={absent}
                aria-pressed={active}
                onClick={() => toggleSystem(id)}
                className={cx(
                  'flex min-w-0 flex-1 items-center gap-2.5 rounded-[var(--radius-control)] px-2 py-2 text-left transition-colors',
                  'disabled:cursor-not-allowed disabled:opacity-40',
                  active ? 'bg-primary/12 text-fg' : 'text-muted hover:bg-surface-2 hover:text-fg',
                )}
              >
                <span
                  aria-hidden
                  className={cx('transition-opacity', showingAll || active ? 'opacity-100' : 'opacity-50')}
                >
                  <SystemDot system={id} />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
                <span aria-hidden className="numeric shrink-0 text-2xs text-subtle">
                  {count}
                </span>
                <span className="sr-only">{t('tree.count', { count })}</span>
              </button>

              <button
                type="button"
                disabled={absent}
                onClick={() => soloSystem(id)}
                aria-label={`${t('controls.solo')} — ${label}`}
                title={t('controls.solo')}
                className="h-8 w-8 shrink-0 rounded-[var(--radius-control)] text-2xs text-subtle opacity-0 transition-opacity hover:bg-surface-2 hover:text-fg focus-visible:opacity-100 disabled:invisible group-hover/row:opacity-100"
              >
                <span aria-hidden>◎</span>
              </button>
            </li>
          );
        })}
        </ul>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-surface to-transparent"
        />
      </div>
    </nav>
  );
}
