import { useEffect, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { useAppStore } from './store/appStore';
import { SceneCanvas, detectWebgl2 } from '@/scene/SceneCanvas';
import { SystemRail } from '@/ui/SystemRail/SystemRail';
import { PartTree } from '@/ui/PartTree/PartTree';
import { Inspector } from '@/ui/Inspector/Inspector';
import { ViewControls } from '@/ui/Controls/ViewControls';
import { SimulationPanel } from '@/ui/Controls/SimulationPanel';
import { TransportBar } from '@/ui/Controls/TransportBar';
import { ExplodeBar } from '@/ui/Controls/ExplodeBar';
import { CanvasToolbar } from '@/ui/Controls/CanvasToolbar';
import { IntroOverlay } from '@/ui/Controls/IntroOverlay';
import { LessonPlayer } from '@/ui/Lessons/LessonPlayer';
import { VehiclePicker } from '@/ui/VehiclePicker/VehiclePicker';
import { TextAnatomy } from '@/ui/Fallback/TextAnatomy';
import { LOCALES, useT } from '@/i18n';
import { Button, cx } from '@/ui/primitives';

const PANEL_TABS = [
  ['inspector', 'nav.tab.part'],
  ['view', 'nav.tab.view'],
  ['sim', 'nav.tab.sim'],
  ['lessons', 'nav.tab.lessons'],
] as const;

export function AppShell() {
  const t = useT();
  const forceFallback = useAppStore((s) => s.forceFallback);
  const webglAvailable = useAppStore((s) => s.webglAvailable);
  const setWebglAvailable = useAppStore((s) => s.setWebglAvailable);
  const setForceFallback = useAppStore((s) => s.setForceFallback);
  const setReducedMotion = useAppStore((s) => s.setReducedMotion);
  const locale = useAppStore((s) => s.locale);
  const setLocale = useAppStore((s) => s.setLocale);
  const focusedComponentId = useAppStore((s) => s.focusedComponentId);
  const focus = useAppStore((s) => s.focus);

  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    setWebglAvailable(detectWebgl2());
  }, [setWebglAvailable]);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReducedMotion(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [setReducedMotion]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (!focusedComponentId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') focus(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focusedComponentId, focus]);

  const showFallback = forceFallback || !webglAvailable;

  return (
    <div className="flex h-full flex-col bg-bg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-[var(--radius-control)] focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-fg"
      >
        {t('a11y.skipToContent')}
      </a>

      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-3">
        {!showFallback && (
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-expanded={sidebarOpen}
            aria-controls="sidebar"
            aria-label={sidebarOpen ? t('controls.collapse') : t('controls.expand')}
          >
            <span aria-hidden>☰</span>
          </Button>
        )}

        <div className="flex min-w-0 items-baseline gap-2.5">
          <span className="text-base font-semibold tracking-tight text-fg">{t('app.title')}</span>
          <span className="hidden truncate text-2xs text-subtle md:inline">{t('app.tagline')}</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <VehiclePicker />

          <Button
            variant="outline"
            size="md"
            onClick={() => setForceFallback(!forceFallback)}
            disabled={!webglAvailable}
            className="hidden sm:inline-flex"
          >
            {showFallback ? t('fallback.toggleBack') : t('fallback.toggle')}
          </Button>

          <label className="sr-only" htmlFor="locale">
            {t('nav.language')}
          </label>
          <select
            id="locale"
            value={locale}
            onChange={(event) => setLocale(event.target.value as 'en' | 'th')}
            className="h-9 rounded-[var(--radius-control)] border border-border bg-surface-2 px-2 text-2xs text-muted"
          >
            {LOCALES.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      <main id="main" className="min-h-0 flex-1">
        {!showFallback && (
          <h1 className="sr-only">
            {t('app.title')} — {t('app.tagline')}
          </h1>
        )}
        {showFallback ? (
          <TextAnatomy />
        ) : (
          <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[16rem_minmax(0,1fr)_22rem]">
            <aside
              id="sidebar"
              aria-label={t('a11y.sidebar')}
              className={cx(
                'min-h-0 grid-rows-[minmax(0,18rem)_minmax(0,1fr)] overflow-hidden border-r border-border bg-surface',
                sidebarOpen ? 'grid' : 'hidden',
                'lg:grid',
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <SystemRail />
              </div>
              <div className="min-h-0 overflow-hidden border-t border-border">
                <PartTree />
              </div>
            </aside>

            <div className="relative min-h-0 overflow-hidden">
              <SceneCanvas />
              <CanvasToolbar />
              <IntroOverlay />

              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col gap-1.5 p-3">
                <ExplodeBar />
                <TransportBar />
                <p className="px-1 text-center text-2xs leading-relaxed text-subtle">
                  {t('app.disclaimer.short')}
                </p>
              </div>
            </div>

            <aside aria-label={t('a11y.detailPanel')} className="min-h-0 border-l border-border bg-surface">
              <Tabs.Root defaultValue="inspector" className="flex h-full min-h-0 flex-col">
                <Tabs.List
                  className="flex shrink-0 gap-1 border-b border-border px-2 pt-2"
                  aria-label={t('a11y.detailPanel')}
                >
                  {PANEL_TABS.map(([value, key]) => (
                    <Tabs.Trigger
                      key={value}
                      value={value}
                      className="-mb-px flex-1 whitespace-nowrap border-b-2 border-transparent px-1 pb-2 pt-1 text-sm font-medium text-subtle transition-colors hover:text-muted data-[state=active]:border-primary data-[state=active]:text-fg"
                    >
                      {t(key)}
                    </Tabs.Trigger>
                  ))}
                </Tabs.List>

                <Tabs.Content value="inspector" className="min-h-0 flex-1 overflow-hidden focus-visible:outline-none">
                  <Inspector />
                </Tabs.Content>
                <Tabs.Content
                  value="view"
                  className="scroll-area min-h-0 flex-1 overflow-y-auto p-3 focus-visible:outline-none"
                >
                  <ViewControls />
                </Tabs.Content>
                <Tabs.Content
                  value="sim"
                  className="scroll-area min-h-0 flex-1 overflow-y-auto p-3 focus-visible:outline-none"
                >
                  <SimulationPanel />
                </Tabs.Content>
                <Tabs.Content
                  value="lessons"
                  className="scroll-area min-h-0 flex-1 overflow-y-auto p-3 focus-visible:outline-none"
                >
                  <LessonPlayer />
                </Tabs.Content>
              </Tabs.Root>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
