import { useMemo } from 'react';
import { ARCHETYPES, MEDIUM_COLORS, MEDIUM_LABEL_KEYS } from '@/domain/registry';
import { applyDimensions } from '@/scene/procedural/layout';
import { useAppStore, useConfiguration, type CameraPreset, type RenderMode } from '@/app/store/appStore';
import { useT, type TranslationKey } from '@/i18n';
import { Button, Card, LabelledSlider, SegmentedControl, Switch, cx } from '../primitives';
import { getBuiltVehicle } from '@/scene/procedural/buildVehicle';
import { buildFlows } from '@/scene/procedural/buildFlows';

const CAMERA_ORDER: CameraPreset[] = [
  'three_quarter',
  'front',
  'side',
  'top',
  'engine_bay',
  'undercarriage',
  'interior',
];

export function ViewControls() {
  const t = useT();
  const config = useConfiguration();

  const renderMode = useAppStore((s) => s.renderMode);
  const setRenderMode = useAppStore((s) => s.setRenderMode);
  const explode = useAppStore((s) => s.explode);
  const setExplode = useAppStore((s) => s.setExplode);
  const sections = useAppStore((s) => s.sections);
  const setSection = useAppStore((s) => s.setSection);
  const cameraPreset = useAppStore((s) => s.cameraPreset);
  const setCameraPreset = useAppStore((s) => s.setCameraPreset);
  const showFlows = useAppStore((s) => s.showFlows);
  const setShowFlows = useAppStore((s) => s.setShowFlows);
  const cutaway = useAppStore((s) => s.cutaway);
  const setCutaway = useAppStore((s) => s.setCutaway);
  const resetView = useAppStore((s) => s.resetView);
  const activeSystems = useAppStore((s) => s.activeSystems);

  const geometry = applyDimensions(ARCHETYPES[config.archetype].geometry, config.dimensions);
  const extents: Record<'x' | 'y' | 'z', number> = {
    x: geometry.width / 2 + 0.2,
    y: geometry.height + 0.2,
    z: geometry.length / 2 + 0.2,
  };

  const flows = useMemo(() => buildFlows(getBuiltVehicle(config).parts, config), [
    config.vehicleId,
    config.archetype,
    config.powertrain,
  ]);

  const visibleFlows = flows.filter((f) => activeSystems.size === 0 || activeSystems.has(f.system));
  const legendMedia = [...new Set(visibleFlows.map((f) => f.medium))];

  return (
    <div className="space-y-3">
      <Card
        title={t('controls.title')}
        action={
          <Button variant="ghost" size="sm" onClick={resetView}>
            {t('controls.reset')}
          </Button>
        }
      >
        <div className="space-y-3.5">
          <SegmentedControl<RenderMode>
            ariaLabel={t('mode.label')}
            value={renderMode}
            onChange={setRenderMode}
            options={[
              { id: 'realistic', label: t('mode.realistic'), hint: t('mode.realistic.hint') },
              { id: 'schematic', label: t('mode.schematic'), hint: t('mode.schematic.hint') },
              { id: 'xray', label: t('mode.xray'), hint: t('mode.xray.hint') },
            ]}
          />

          <Switch
            id="cutaway"
            label={t('controls.cutaway')}
            hint={t('controls.cutaway.hint')}
            checked={cutaway}
            onCheckedChange={setCutaway}
          />

          <LabelledSlider
            id="explode"
            label={t('controls.explode')}
            value={explode}
            onChange={setExplode}
            format={(v) => `${Math.round(v * 100)}%`}
          />

          <Switch id="flows" label={t('controls.flows')} checked={showFlows} onCheckedChange={setShowFlows} />
        </div>
      </Card>

      <Card title={t('camera.title')} description={t('camera.hint')}>
        <div className="grid grid-cols-2 gap-1.5">
          {CAMERA_ORDER.map((preset, index) => (
            <button
              key={preset}
              type="button"
              aria-pressed={cameraPreset === preset}
              onClick={() => setCameraPreset(preset)}
              className={cx(
                'flex h-9 items-center justify-between gap-1 rounded-[var(--radius-control)] border px-2.5 text-2xs transition-colors',
                cameraPreset === preset
                  ? 'border-primary/60 bg-primary/10 text-fg'
                  : 'border-border bg-surface-2 text-muted hover:border-border-strong hover:text-fg',
              )}
            >
              <span className="truncate">{t(`camera.${preset}` as TranslationKey)}</span>
              <kbd className="numeric shrink-0 rounded border border-border bg-elevated px-1 text-2xs text-subtle">
                {index + 1}
              </kbd>
            </button>
          ))}
        </div>
      </Card>

      <Card title={t('controls.section')}>
        <div className="space-y-3">
          {sections.map((section) => {
            const extent = extents[section.id];
            const labelKey = `controls.section.${section.id}` as TranslationKey;
            return (
              <div key={section.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <Switch
                      id={`section-${section.id}-toggle`}
                      label={t(labelKey)}
                      checked={section.enabled}
                      onCheckedChange={(enabled) => setSection(section.id, { enabled })}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSection(section.id, { flipped: !section.flipped })}
                    aria-label={`${t('controls.section.flip')} — ${t(labelKey)}`}
                    title={t('controls.section.flip')}
                  >
                    <span aria-hidden>⇄</span>
                  </Button>
                </div>
                {section.enabled && (
                  <LabelledSlider
                    id={`section-${section.id}`}
                    label={t(labelKey)}
                    value={section.offset}
                    min={section.id === 'y' ? 0 : -extent}
                    max={extent}
                    step={0.01}
                    onChange={(offset) => setSection(section.id, { offset })}
                    format={(v) => `${v.toFixed(2)} m`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {showFlows && legendMedia.length > 0 && (
        <Card title={t('flow.legend')}>
          <ul className="space-y-1.5">
            {legendMedia.map((medium) => (
              <li key={medium} className="flex items-center gap-2.5 text-2xs text-muted">
                <span
                  aria-hidden
                  className="h-1.5 w-7 shrink-0 rounded-full"
                  style={{ backgroundColor: MEDIUM_COLORS[medium] }}
                />
                {t(MEDIUM_LABEL_KEYS[medium] as TranslationKey)}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
