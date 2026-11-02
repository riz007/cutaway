import { useMemo } from 'react';
import type { SystemId } from '@/domain/types';
import { ARCHETYPES, SYSTEMS, SYSTEM_IDS, componentsFor } from '@/domain/registry';
import { applyDimensions } from '@/scene/procedural/layout';
import { useAppStore, useConfiguration, useVehicleAndTrim } from '@/app/store/appStore';
import { useT, type TranslationKey } from '@/i18n';
import { Badge, SystemDot } from '../primitives';

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-[var(--radius-control)] border border-border bg-surface-2 px-3 py-2.5">
      <dt className="text-2xs uppercase tracking-[0.05em] text-subtle">{label}</dt>
      <dd className="numeric mt-1 text-lg leading-none text-fg">
        {value}
        {unit && <span className="ml-1 text-2xs text-subtle">{unit}</span>}
      </dd>
    </div>
  );
}

export function VehicleOverview() {
  const t = useT();
  const config = useConfiguration();
  const { vehicle, trim } = useVehicleAndTrim();
  const soloSystem = useAppStore((s) => s.soloSystem);

  const archetype = ARCHETYPES[vehicle.archetype];
  const g = applyDimensions(archetype.geometry, vehicle.dimensions);
  const measured = Boolean(vehicle.dimensions);

  const counts = useMemo(() => {
    const map = new Map<SystemId, number>();
    for (const component of componentsFor(config)) map.set(component.system, (map.get(component.system) ?? 0) + 1);
    return map;
  }, [config.vehicleId, config.archetype, config.powertrain]);
  const total = [...counts.values()].reduce((sum, n) => sum + n, 0);

  const metres = (m: number) => m.toFixed(2);

  return (
    <div className="scroll-area h-full overflow-y-auto px-4 py-4">
      <p className="text-2xs font-semibold uppercase tracking-[0.1em] text-subtle">{t('overview.title')}</p>
      <h2 className="mt-1 text-xl font-semibold leading-tight tracking-tight text-fg">
        {vehicle.brand} {vehicle.model}
      </h2>
      <p className="mt-1 text-sm text-muted">
        {vehicle.bodyStyle} · {t(`powertrain.${trim.powertrain}` as TranslationKey)} · {t(`drive.${trim.drivetrain}` as TranslationKey)}
      </p>

      <section aria-labelledby="overview-dimensions" className="mt-5">
        <div className="flex items-center justify-between gap-2">
          <h3 id="overview-dimensions" className="text-2xs font-semibold uppercase tracking-[0.08em] text-subtle">
            {t('overview.dimensions')}
          </h3>
          {measured ? (
            vehicle.dimensions?.source.url ? (
              <a href={vehicle.dimensions.source.url} target="_blank" rel="noreferrer" className="rounded-full">
                <Badge tone="primary">{t('overview.measured')}</Badge>
              </a>
            ) : (
              <Badge tone="primary">{t('overview.measured')}</Badge>
            )
          ) : (
            <Badge tone="warn">{t('overview.classTypical')}</Badge>
          )}
        </div>
        <dl className="mt-2 grid grid-cols-2 gap-1.5">
          <Stat label={t('overview.length')} value={metres(g.length)} unit={t('units.m')} />
          <Stat label={t('overview.width')} value={metres(g.width)} unit={t('units.m')} />
          <Stat label={t('overview.height')} value={metres(g.height)} unit={t('units.m')} />
          <Stat label={t('overview.wheelbase')} value={metres(g.wheelbase)} unit={t('units.m')} />
        </dl>
      </section>

      <section aria-labelledby="overview-platform" className="mt-5">
        <h3 id="overview-platform" className="text-2xs font-semibold uppercase tracking-[0.08em] text-subtle">
          {t('overview.platform')}
        </h3>
        <p className="mt-1.5 text-sm font-medium text-fg">{archetype.label}</p>
        <p className="mt-1 text-[0.9375rem] leading-relaxed text-muted">{archetype.description}</p>
      </section>

      <section aria-labelledby="overview-systems" className="mt-5">
        <h3 id="overview-systems" className="text-2xs font-semibold uppercase tracking-[0.08em] text-subtle">
          {t('overview.parts', { count: total, systems: counts.size })}
        </h3>
        <ul className="mt-2 grid grid-cols-2 gap-1">
          {SYSTEM_IDS.filter((id) => counts.has(id)).map((id) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => soloSystem(id)}
                className="flex w-full items-center gap-2 rounded-[var(--radius-control)] px-2 py-1.5 text-left text-2xs text-muted transition-colors hover:bg-surface-2 hover:text-fg"
              >
                <SystemDot system={id} />
                <span className="min-w-0 flex-1 truncate">{t(SYSTEMS[id].labelKey as TranslationKey)}</span>
                <span className="numeric text-subtle">{counts.get(id)}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-5 rounded-[var(--radius-control)] border border-border bg-surface-2 px-3 py-2.5 text-[0.9375rem] leading-relaxed text-muted">
        {t('overview.hint')}
      </p>
    </div>
  );
}
