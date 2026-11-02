import { useMemo } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { useAppStore, useConfiguration } from '@/app/store/appStore';
import { getBuiltVehicle } from '@/scene/procedural/buildVehicle';
import { EXPLODE_STAGES, STAGE_START, activeStage, countSeparated } from '@/scene/explodeStages';
import { useT, type TranslationKey } from '@/i18n';
import { Button, cx } from '../primitives';
import { cancelExplodeTween, tweenExplode, useExplodeTween } from './explodeTween';

export function ExplodeBar() {
  const t = useT();
  const config = useConfiguration();
  const explode = useAppStore((s) => s.explode);
  const setExplode = useAppStore((s) => s.setExplode);
  const playing = useExplodeTween((s) => s.playing);

  const parts = useMemo(() => getBuiltVehicle(config).parts, [config.vehicleId, config.archetype, config.powertrain]);
  const separated = useMemo(() => countSeparated(parts, explode), [parts, explode]);
  const moving = explode > 0.001 && explode < 0.999 ? activeStage(explode) : null;
  const towardsExplode = explode < 0.5;

  const playLabel = playing ? t('explode.pause') : towardsExplode ? t('explode.play') : t('explode.assemble');
  const counter = t('explode.counter', { count: separated, total: parts.length });

  return (
    <section
      aria-label={t('explode.title')}
      className="pointer-events-auto flex items-center gap-3 rounded-[var(--radius-card)] border border-border bg-surface/95 px-3 py-2 shadow-2xl backdrop-blur-md"
    >
      <Button
        variant={playing ? 'secondary' : 'primary'}
        size="icon"
        aria-label={playLabel}
        title={playLabel}
        onClick={() => (playing ? cancelExplodeTween() : tweenExplode(towardsExplode ? 1 : 0))}
      >
        <span aria-hidden>{playing ? '❚❚' : towardsExplode ? '⇱' : '⇲'}</span>
      </Button>

      <div className="min-w-0 flex-1">
        <Slider.Root
          className="relative flex h-5 w-full touch-none select-none items-center"
          value={[explode]}
          min={0}
          max={1}
          step={0.001}
          onValueChange={([next]) => {
            cancelExplodeTween();
            setExplode(next ?? 0);
          }}
        >
          <Slider.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-elevated">
            <Slider.Range className="absolute h-full bg-gradient-to-r from-primary/70 to-primary" />
          </Slider.Track>
          <Slider.Thumb
            className="block h-4 w-4 rounded-full border-2 border-primary bg-bg shadow transition-transform hover:scale-110"
            aria-label={t('controls.explode')}
            aria-valuetext={counter}
          />
        </Slider.Root>

        <div aria-hidden className="relative mt-1 h-4">
          {EXPLODE_STAGES.map(({ stage, labelKey }) => (
            <span
              key={stage}
              className={cx(
                'absolute top-0 whitespace-nowrap text-2xs transition-colors',
                moving === stage ? 'text-primary' : explode >= STAGE_START[stage] + 0.34 ? 'text-muted' : 'text-subtle',
              )}
              style={{ left: `${STAGE_START[stage] * 100}%` }}
            >
              {t(labelKey as TranslationKey)}
            </span>
          ))}
        </div>
      </div>

      <div className="shrink-0 text-right" aria-hidden>
        <p className="numeric text-base leading-none text-fg">
          {separated}
          <span className="text-2xs text-subtle"> / {parts.length}</span>
        </p>
        <p className="mt-0.5 text-2xs text-subtle">{t('explode.separated')}</p>
      </div>
    </section>
  );
}
