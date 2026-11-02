import type { ReactNode } from 'react';
import { useAppStore, type RenderMode } from '@/app/store/appStore';
import { orbit, recenter, zoom } from '@/scene/cameras/cameraBus';
import { useT } from '@/i18n';
import { cx } from '../primitives';

function ToolButton({
  label,
  pressed,
  onClick,
  children,
  className,
}: {
  label: string;
  pressed?: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={cx(
        'inline-flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-[calc(var(--radius-control)-2px)] px-2 text-2xs font-medium transition-colors',
        pressed ? 'bg-primary text-primary-fg' : 'text-muted hover:bg-elevated hover:text-fg',
        className,
      )}
    >
      {children}
    </button>
  );
}

const MODES: { id: RenderMode; key: 'mode.realistic' | 'mode.schematic' | 'mode.xray' }[] = [
  { id: 'realistic', key: 'mode.realistic' },
  { id: 'schematic', key: 'mode.schematic' },
  { id: 'xray', key: 'mode.xray' },
];

export function CanvasToolbar() {
  const t = useT();
  const renderMode = useAppStore((s) => s.renderMode);
  const setRenderMode = useAppStore((s) => s.setRenderMode);
  const cutaway = useAppStore((s) => s.cutaway);
  const setCutaway = useAppStore((s) => s.setCutaway);
  const turntable = useAppStore((s) => s.turntable);
  const setTurntable = useAppStore((s) => s.setTurntable);
  const reducedMotion = useAppStore((s) => s.reducedMotion);

  const shell = 'pointer-events-auto flex items-center gap-0.5 rounded-[var(--radius-card)] border border-border bg-surface/90 p-1 shadow-xl backdrop-blur-md';

  return (
    <>
      <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex flex-wrap items-start justify-between gap-2">
        <div role="toolbar" aria-label={t('camera.toolbar')} className={shell}>
          <div role="radiogroup" aria-label={t('mode.label')} className="flex items-center gap-0.5">
            {MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                role="radio"
                aria-checked={renderMode === mode.id}
                onClick={() => setRenderMode(mode.id)}
                className={cx(
                  'h-8 rounded-[calc(var(--radius-control)-2px)] px-2.5 text-2xs font-medium transition-colors',
                  renderMode === mode.id ? 'bg-elevated text-fg' : 'text-muted hover:bg-elevated hover:text-fg',
                )}
              >
                {t(mode.key)}
              </button>
            ))}
          </div>
          <span aria-hidden className="mx-1 h-5 w-px bg-border" />
          <ToolButton label={t('controls.cutaway')} pressed={cutaway} onClick={() => setCutaway(!cutaway)}>
            <span aria-hidden>◐</span>
            <span className="hidden sm:inline">{t('controls.cutaway')}</span>
          </ToolButton>
          {!reducedMotion && (
            <ToolButton label={t('camera.turntable')} pressed={turntable} onClick={() => setTurntable(!turntable)}>
              <span aria-hidden>⟳</span>
              <span className="hidden sm:inline">{t('camera.turntable')}</span>
            </ToolButton>
          )}
          <ToolButton label={t('camera.reset')} onClick={recenter}>
            <span aria-hidden>⌖</span>
          </ToolButton>
        </div>

        <div
          role="toolbar"
          aria-label={t('camera.pad')}
          className={cx(shell, 'hidden flex-col gap-0.5 md:flex')}
        >
          <div className="grid grid-cols-3 gap-0.5">
            <span />
            <ToolButton label={t('camera.orbitUp')} onClick={() => orbit('up', !reducedMotion)}>
              <span aria-hidden>▲</span>
            </ToolButton>
            <span />
            <ToolButton label={t('camera.orbitLeft')} onClick={() => orbit('left', !reducedMotion)}>
              <span aria-hidden>◀</span>
            </ToolButton>
            <ToolButton label={t('camera.reset')} onClick={recenter}>
              <span aria-hidden>●</span>
            </ToolButton>
            <ToolButton label={t('camera.orbitRight')} onClick={() => orbit('right', !reducedMotion)}>
              <span aria-hidden>▶</span>
            </ToolButton>
            <span />
            <ToolButton label={t('camera.orbitDown')} onClick={() => orbit('down', !reducedMotion)}>
              <span aria-hidden>▼</span>
            </ToolButton>
            <span />
          </div>
          <div className="grid grid-cols-2 gap-0.5 border-t border-border pt-0.5">
            <ToolButton label={t('camera.zoomIn')} onClick={() => zoom('in', !reducedMotion)}>
              <span aria-hidden>＋</span>
            </ToolButton>
            <ToolButton label={t('camera.zoomOut')} onClick={() => zoom('out', !reducedMotion)}>
              <span aria-hidden>－</span>
            </ToolButton>
          </div>
        </div>
      </div>

      <p className="pointer-events-none absolute right-3 top-[11.5rem] z-10 hidden max-w-[11rem] text-right text-2xs leading-snug text-subtle md:block">
        {t('camera.keys')}
      </p>
    </>
  );
}
