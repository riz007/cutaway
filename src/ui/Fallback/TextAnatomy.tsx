import { useMemo } from 'react';
import type { SystemId } from '@/domain/types';
import { SYSTEMS, SYSTEM_IDS, componentsFor, getRelated } from '@/domain/registry';
import { useAppStore, useConfiguration, useVehicleAndTrim } from '@/app/store/appStore';
import { Lesson } from '@/content/Lesson';
import { getBuiltVehicle } from '@/scene/procedural/buildVehicle';
import { useT, type TranslationKey } from '@/i18n';
import { HazardNotice } from '../primitives';

export function TextAnatomy() {
  const t = useT();
  const config = useConfiguration();
  const { vehicle, trim } = useVehicleAndTrim();
  const webglAvailable = useAppStore((s) => s.webglAvailable);
  const setForceFallback = useAppStore((s) => s.setForceFallback);

  const components = useMemo(() => componentsFor(config), [config.archetype, config.powertrain]);
  const instanceCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const part of getBuiltVehicle(config).parts) {
      map.set(part.componentId, (map.get(part.componentId) ?? 0) + 1);
    }
    return map;
  }, [config.vehicleId, config.archetype, config.powertrain]);

  const bySystem = useMemo(() => {
    const map = new Map<SystemId, typeof components>();
    for (const component of components) {
      const list = map.get(component.system);
      if (list) list.push(component);
      else map.set(component.system, [component]);
    }
    return map;
  }, [components]);

  return (
    <div className="scroll-area h-full overflow-y-auto bg-bg">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <header className="mb-8">
          <p className="text-2xs uppercase tracking-[0.14em] text-subtle">{t('fallback.title')}</p>
          <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-fg">
            {vehicle.brand} {vehicle.model} — {trim.name}
          </h1>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">{t('fallback.description')}</p>

          {!webglAvailable && (
            <p className="mt-3 rounded-[var(--radius-control)] border border-warn/40 bg-warn-soft px-3 py-2 text-sm text-fg">
              {t('fallback.noWebgl')}
            </p>
          )}

          <p className="mt-3 rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-2xs leading-relaxed text-subtle">
            {t('app.disclaimer')}
          </p>

          {webglAvailable && (
            <button
              type="button"
              onClick={() => setForceFallback(false)}
              className="mt-5 inline-flex h-9 items-center rounded-[var(--radius-control)] border border-border bg-surface-2 px-3 text-sm text-fg transition-colors hover:border-border-strong"
            >
              {t('fallback.toggleBack')}
            </button>
          )}
        </header>

        <nav aria-label={t('nav.systems')} className="mb-8 rounded-[var(--radius-card)] border border-border bg-surface p-4">
          <h2 className="text-2xs font-semibold uppercase tracking-[0.08em] text-subtle">
            {t('nav.systems')}
          </h2>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {SYSTEM_IDS.filter((id) => bySystem.has(id)).map((id) => (
              <li key={id}>
                <a href={`#system-${id}`} className="text-sm text-primary underline">
                  {t(SYSTEMS[id].labelKey as TranslationKey)}{' '}
                  <span className="text-subtle">({bySystem.get(id)!.length})</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {SYSTEM_IDS.filter((id) => bySystem.has(id)).map((systemId) => (
          <section key={systemId} id={`system-${systemId}`} className="mb-10 scroll-mt-4">
            <h2 className="flex items-center gap-2 border-b border-border pb-2 text-lg font-semibold text-fg">
              <span
                aria-hidden
                className="grid h-5 w-5 place-items-center rounded text-2xs font-bold text-bg"
                style={{ backgroundColor: SYSTEMS[systemId].color }}
              >
                {SYSTEMS[systemId].glyph}
              </span>
              {t(SYSTEMS[systemId].labelKey as TranslationKey)}
            </h2>

            <div className="mt-4 space-y-6">
              {bySystem.get(systemId)!.map((component) => {
                const related = getRelated(component.id);
                const count = instanceCounts.get(component.id) ?? 0;

                return (
                  <article key={component.id} id={`part-${component.id}`} className="scroll-mt-4">
                    <h3 className="text-base font-semibold text-fg">{component.label}</h3>
                    <p className="mt-1 text-[0.9375rem] leading-relaxed text-muted">{component.shortDescription}</p>

                    {count > 1 && (
                      <p className="mt-1 text-2xs text-subtle">{t('tree.instances', { count })}</p>
                    )}

                    {component.hazard && (
                      <div className="mt-2">
                        <HazardNotice hazard={component.hazard} />
                      </div>
                    )}

                    <div className="mt-3">
                      <Lesson slug={component.contentSlug} fallbackText="" compact />
                    </div>

                    {component.failureModes && component.failureModes.length > 0 && (
                      <div className="mt-3">
                        <h4 className="text-2xs font-semibold uppercase tracking-wide text-subtle">
                          {t('inspector.failure')}
                        </h4>
                        <ul className="mt-1 space-y-1">
                          {component.failureModes.map((mode, index) => (
                            <li key={index} className="text-sm text-muted">
                              <strong className="text-fg">{mode.symptom}</strong> — {mode.cause} (
                              {t(`severity.${mode.severity}` as TranslationKey)})
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {related.length > 0 && (
                      <p className="mt-3 text-sm text-subtle">
                        {t('inspector.related')}:{' '}
                        {related.map((other, index) => (
                          <span key={other.id}>
                            {index > 0 && ', '}
                            <a href={`#part-${other.id}`} className="text-primary underline">
                              {other.label}
                            </a>
                          </span>
                        ))}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
