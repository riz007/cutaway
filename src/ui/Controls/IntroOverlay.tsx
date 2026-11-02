import { useEffect, useMemo } from 'react';
import { useAppStore, useConfiguration, useVehicleAndTrim } from '@/app/store/appStore';
import { getBuiltVehicle } from '@/scene/procedural/buildVehicle';
import { EXPLODE_STAGES, activeStage, countSeparated } from '@/scene/explodeStages';
import { useT, type TranslationKey } from '@/i18n';
import { Button } from '../primitives';
import { cancelExplodeTween, tweenExplode } from './explodeTween';

const HOLD_BEFORE_ASSEMBLY_MS = 350;

// Every vehicle arrives as a kit of parts and assembles itself, structure
// first and glass last — the order a factory would build it in.
export function IntroOverlay() {
  const t = useT();
  const config = useConfiguration();
  const { vehicle } = useVehicleAndTrim();
  const introActive = useAppStore((s) => s.introActive);
  const explode = useAppStore((s) => s.explode);
  const reducedMotion = useAppStore((s) => s.reducedMotion);

  useEffect(() => {
    const { setIntroActive, setExplode } = useAppStore.getState();
    if (reducedMotion) return;

    setIntroActive(true);
    setExplode(1, { snap: true });
    const timer = window.setTimeout(() => tweenExplode(0, () => setIntroActive(false)), HOLD_BEFORE_ASSEMBLY_MS);

    return () => {
      window.clearTimeout(timer);
      cancelExplodeTween();
      setIntroActive(false);
    };
  }, [config.vehicleId, reducedMotion]);

  const parts = useMemo(() => getBuiltVehicle(config).parts, [config.vehicleId, config.archetype, config.powertrain]);

  if (!introActive) return null;

  const placed = parts.length - countSeparated(parts, explode);
  const stage = EXPLODE_STAGES[activeStage(explode)];
  const name = `${vehicle.brand} ${vehicle.model}`;

  const skip = () => {
    cancelExplodeTween();
    useAppStore.getState().setExplode(0, { snap: true });
    useAppStore.getState().setIntroActive(false);
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 top-16 z-20 flex justify-center px-4">
      <div className="pointer-events-auto w-[min(22rem,100%)] rounded-[var(--radius-card)] border border-border bg-surface/90 px-4 py-3 shadow-2xl backdrop-blur-md">
        <p role="status" className="sr-only">
          {t('intro.status', { vehicle: name })}
        </p>
        <div aria-hidden className="flex items-baseline justify-between gap-3">
          <p className="text-2xs font-semibold uppercase tracking-[0.1em] text-primary">{t('intro.label')}</p>
          <p className="numeric text-2xs text-subtle">{t('intro.count', { placed, total: parts.length })}</p>
        </div>
        <p aria-hidden className="mt-1 truncate text-base font-semibold text-fg">
          {name}
        </p>
        <p aria-hidden className="mt-0.5 text-sm text-muted">
          {t(stage.assembleKey as TranslationKey)}
        </p>
        <div aria-hidden className="mt-2.5 h-1 overflow-hidden rounded-full bg-elevated">
          <div className="h-full bg-primary transition-[width] duration-75" style={{ width: `${(1 - explode) * 100}%` }} />
        </div>
        <div className="mt-2.5 flex justify-end">
          <Button variant="ghost" size="sm" onClick={skip}>
            {t('intro.skip')}
          </Button>
        </div>
      </div>
    </div>
  );
}
