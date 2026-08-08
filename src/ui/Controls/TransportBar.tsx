import { useEffect, useState } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { useAppStore, useVehicleAndTrim } from '@/app/store/appStore';
import { useSimReadouts } from '@/sim/simStore';
import type { GearSelector } from '@/sim/drivetrain';
import { useT, type TranslationKey } from '@/i18n';
import { Button, cx } from '../primitives';

const SPEEDS = [0.1, 0.5, 1, 2] as const;
const GEARS: GearSelector[] = ['P', 'R', 'N', 'D'];

function Gauge({
  label,
  value,
  unit,
  emphasis = false,
}: {
  label: string;
  value: string;
  unit?: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex min-w-[5rem] flex-col">
      <dt className="text-2xs uppercase tracking-[0.06em] text-subtle">{label}</dt>
      <dd className={cx('numeric leading-tight', emphasis ? 'text-lg text-fg' : 'text-sm text-muted')}>
        {value}
        {unit && <span className="ml-0.5 text-2xs text-subtle">{unit}</span>}
      </dd>
    </div>
  );
}

function PedalSlider({
  id,
  label,
  value,
  onChange,
  tint,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  tint: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <label htmlFor={id} className="w-[4.5rem] shrink-0 text-2xs uppercase tracking-[0.04em] text-subtle">
        {label}
      </label>
      <Slider.Root
        id={id}
        className="relative flex h-6 flex-1 touch-none select-none items-center"
        value={[value]}
        min={0}
        max={1}
        step={0.01}
        onValueChange={([next]) => onChange(next ?? 0)}
        aria-label={label}
        aria-valuetext={`${Math.round(value * 100)}%`}
      >
        <Slider.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-elevated">
          <Slider.Range className="absolute h-full" style={{ backgroundColor: tint }} />
        </Slider.Track>
        <Slider.Thumb
          className="block h-3.5 w-3.5 rounded-full border-2 bg-bg"
          style={{ borderColor: tint }}
          aria-label={label}
        />
      </Slider.Root>
      <span className="numeric w-9 shrink-0 text-right text-2xs text-muted">{Math.round(value * 100)}%</span>
    </div>
  );
}

export function TransportBar() {
  const t = useT();
  const { trim } = useVehicleAndTrim();

  const playing = useAppStore((s) => s.simPlaying);
  const setPlaying = useAppStore((s) => s.setPlaying);
  const simSpeed = useAppStore((s) => s.simSpeed);
  const setSimSpeed = useAppStore((s) => s.setSimSpeed);
  const controls = useAppStore((s) => s.controls);
  const setControls = useAppStore((s) => s.setControls);
  const resetSimulation = useAppStore((s) => s.resetSimulation);

  const readouts = useSimReadouts();
  const [announcement, setAnnouncement] = useState('');

  const hasEngine = trim.powertrain !== 'bev';
  const hasPack = ['hev_series_parallel', 'phev_dmi', 'erev', 'bev'].includes(trim.powertrain);

  useEffect(() => {
    setAnnouncement(playing ? t('a11y.simRunning') : t('a11y.simPaused'));
  }, [playing, t]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(target.tagName)) return;
      if (target?.isContentEditable) return;
      event.preventDefault();
      setPlaying(!playing);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [playing, setPlaying]);

  return (
    <section
      aria-label={t('transport.title')}
      aria-keyshortcuts="Space"
      className="pointer-events-auto rounded-[var(--radius-card)] border border-border bg-surface/95 shadow-2xl backdrop-blur-md"
    >
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 pt-2.5">
        <div className="flex items-center gap-1.5">
          <Button
            variant={playing ? 'secondary' : 'primary'}
            size="md"
            onClick={() => setPlaying(!playing)}
            aria-pressed={playing}
            className="min-w-[6.5rem] justify-center"
          >
            <span aria-hidden>{playing ? '❚❚' : '▶'}</span>
            {playing ? t('transport.pause') : t('transport.play')}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={resetSimulation}
            aria-label={t('transport.reset')}
            title={t('transport.reset')}
          >
            <span aria-hidden>↺</span>
          </Button>
        </div>

        <div
          role="radiogroup"
          aria-label={t('transport.speed')}
          className="flex items-center gap-0.5 rounded-[var(--radius-control)] border border-border bg-surface-2 p-0.5"
        >
          {SPEEDS.map((speed) => (
            <button
              key={speed}
              type="button"
              role="radio"
              aria-checked={simSpeed === speed}
              onClick={() => setSimSpeed(speed)}
              className={cx(
                'numeric h-6 rounded-[calc(var(--radius-control)-3px)] px-2 text-2xs transition-colors',
                simSpeed === speed ? 'bg-primary text-primary-fg' : 'text-muted hover:bg-elevated hover:text-fg',
              )}
            >
              {speed}×
            </button>
          ))}
        </div>

        {hasEngine && (
          <div
            role="radiogroup"
            aria-label={t('control.ignition')}
            className="flex items-center gap-0.5 rounded-[var(--radius-control)] border border-border bg-surface-2 p-0.5"
          >
            {(['off', 'on'] as const).map((position) => (
              <button
                key={position}
                type="button"
                role="radio"
                aria-checked={controls.ignition === position}
                onClick={() => setControls({ ignition: position })}
                className={cx(
                  'h-6 rounded-[calc(var(--radius-control)-3px)] px-2.5 text-2xs font-medium transition-colors',
                  controls.ignition === position
                    ? 'bg-primary text-primary-fg'
                    : 'text-muted hover:bg-elevated hover:text-fg',
                )}
              >
                {position === 'off' ? t('control.ignition.off') : t('control.ignition.on')}
              </button>
            ))}
          </div>
        )}

        <div
          role="radiogroup"
          aria-label={t('control.gear')}
          className="flex items-center gap-0.5 rounded-[var(--radius-control)] border border-border bg-surface-2 p-0.5"
        >
          {GEARS.map((gear) => (
            <button
              key={gear}
              type="button"
              role="radio"
              aria-checked={controls.gearSelector === gear}
              aria-label={`${t('control.gear')} ${gear}`}
              onClick={() => setControls({ gearSelector: gear })}
              className={cx(
                'numeric h-6 w-7 rounded-[calc(var(--radius-control)-3px)] text-2xs font-semibold transition-colors',
                controls.gearSelector === gear
                  ? 'bg-primary text-primary-fg'
                  : 'text-muted hover:bg-elevated hover:text-fg',
              )}
            >
              {gear}
            </button>
          ))}
        </div>

      </div>

      <div className="grid gap-x-5 gap-y-1 px-3 py-2 sm:grid-cols-2">
        <PedalSlider
          id="transport-throttle"
          label={t('control.throttle')}
          value={controls.throttle}
          onChange={(throttle) => setControls({ throttle })}
          tint="var(--color-success)"
        />
        <PedalSlider
          id="transport-brake"
          label={t('control.brake')}
          value={controls.brake}
          onChange={(brake) => setControls({ brake })}
          tint="var(--color-danger)"
        />
      </div>

      <dl
        aria-live="off"
        aria-label={t('transport.gauges')}
        className="flex flex-wrap items-end gap-x-5 gap-y-2 border-t border-border px-3.5 py-2"
      >
        {hasEngine && (
          <Gauge label={t('readout.rpm')} value={readouts.engineRpm.toFixed(0)} unit={t('units.rpm')} emphasis />
        )}
        <Gauge
          label={t('readout.speed')}
          value={readouts.vehicleSpeedKph.toFixed(0)}
          unit={t('units.kph')}
          emphasis
        />
        {hasEngine && (
          <>
            <Gauge label={t('readout.coolant')} value={readouts.coolantTempC.toFixed(0)} unit={t('units.celsius')} />
            <Gauge label={t('readout.oil')} value={readouts.oilPressureBar.toFixed(1)} unit={t('units.bar')} />
          </>
        )}
        <Gauge
          label={t('readout.line_pressure')}
          value={readouts.linePressureBar.toFixed(0)}
          unit={t('units.bar')}
        />
        <Gauge label={t('readout.rotor')} value={readouts.rotorTempC.toFixed(0)} unit={t('units.celsius')} />
        {hasPack && (
          <>
            <Gauge label={t('readout.soc')} value={(readouts.soc * 100).toFixed(0)} unit={t('units.percent')} />
            <Gauge label={t('readout.pack')} value={readouts.packKw.toFixed(0)} unit={t('units.kw')} />
          </>
        )}
        <Gauge label={t('readout.voltage')} value={readouts.systemVoltage.toFixed(1)} unit={t('units.volt')} />
        {readouts.hybridMode && (
          <Gauge label={t('readout.hybridMode')} value={t(`hybrid.${readouts.hybridMode}` as TranslationKey)} />
        )}
      </dl>
    </section>
  );
}
