import { useMemo, useState } from 'react';
import * as Accordion from '@radix-ui/react-accordion';
import type { Component, SystemId } from '@/domain/types';
import { SYSTEMS, SYSTEM_IDS, componentsFor } from '@/domain/registry';
import { useAppStore, useConfiguration } from '@/app/store/appStore';
import { useT, type TranslationKey } from '@/i18n';
import { SystemDot, cx } from '../primitives';

export function PartTree() {
  const t = useT();
  const config = useConfiguration();
  const [query, setQuery] = useState('');

  const selectedComponentId = useAppStore((s) => s.selectedComponentId);
  const activeSystems = useAppStore((s) => s.activeSystems);
  const select = useAppStore((s) => s.select);
  const hover = useAppStore((s) => s.hover);
  const focus = useAppStore((s) => s.focus);

  const grouped = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const map = new Map<SystemId, Component[]>();
    for (const component of componentsFor(config)) {
      if (needle && !`${component.label} ${component.shortDescription}`.toLowerCase().includes(needle)) continue;
      const list = map.get(component.system);
      if (list) list.push(component);
      else map.set(component.system, [component]);
    }
    for (const list of map.values()) list.sort((a, b) => a.label.localeCompare(b.label));
    return map;
  }, [config.vehicleId, config.archetype, config.powertrain, query]);

  const visibleSystems = SYSTEM_IDS.filter((id) => (grouped.get(id)?.length ?? 0) > 0);
  const total = [...grouped.values()].reduce((sum, list) => sum + list.length, 0);

  const defaultOpen = useMemo(
    () => (query ? visibleSystems : activeSystems.size > 0 ? [...activeSystems] : visibleSystems.slice(0, 1)),
    [activeSystems, query],
  );

  return (
    <section aria-label={t('tree.title')} className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 space-y-2 border-b border-border px-3 py-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-2xs font-semibold uppercase tracking-[0.08em] text-subtle">{t('tree.title')}</h2>
          <span className="numeric shrink-0 text-2xs text-subtle">{t('tree.count', { count: total })}</span>
        </div>
        <div className="relative">
          <span aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle">
            ⌕
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('tree.search')}
            aria-label={t('tree.search')}
            className="h-9 w-full rounded-[var(--radius-control)] border border-border bg-surface-2 pl-7 pr-2.5 text-sm text-fg placeholder:text-subtle focus-visible:border-primary/60"
          />
        </div>
      </div>

      {total === 0 ? (
        <p className="p-4 text-sm text-subtle">{t('tree.empty')}</p>
      ) : (
        <Accordion.Root
          type="multiple"
          defaultValue={defaultOpen}
          key={defaultOpen.join(',')}
          className="scroll-area min-h-0 flex-1 overflow-y-auto pb-2"
        >
          {visibleSystems.map((systemId) => {
            const meta = SYSTEMS[systemId];
            const components = grouped.get(systemId)!;
            return (
              <Accordion.Item key={systemId} value={systemId}>
                <Accordion.Header className="sticky top-0 z-10">
                  <Accordion.Trigger className="group/head flex w-full items-center gap-2.5 border-b border-border bg-surface/95 px-3 py-2 text-left backdrop-blur transition-colors hover:bg-surface-2">
                    <SystemDot system={systemId} />
                    <span className="min-w-0 flex-1 truncate text-sm text-fg">
                      {t(meta.labelKey as TranslationKey)}
                    </span>
                    <span className="numeric shrink-0 text-2xs text-subtle">{components.length}</span>
                    <span
                      aria-hidden
                      className="shrink-0 text-2xs text-subtle transition-transform group-data-[state=open]/head:rotate-90"
                    >
                      ›
                    </span>
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content>
                  <ul className="py-1">
                    {components.map((component) => {
                      const selected = component.id === selectedComponentId;
                      return (
                        <li key={component.id}>
                          <button
                            type="button"
                            aria-current={selected ? 'true' : undefined}
                            onClick={() => select(component.id)}
                            onDoubleClick={() => focus(component.id)}
                            onMouseEnter={() => hover(component.id)}
                            onMouseLeave={() => hover(null)}
                            onFocus={() => hover(component.id)}
                            onBlur={() => hover(null)}
                            className={cx(
                              'flex w-full items-center gap-2 border-l-2 py-2 pl-6 pr-3 text-left text-sm transition-colors',
                              selected
                                ? 'border-primary bg-primary/10 text-fg'
                                : 'border-transparent text-muted hover:border-border-strong hover:bg-surface-2 hover:text-fg',
                            )}
                          >
                            <span className="min-w-0 flex-1 truncate">{component.label}</span>
                            {component.hazard && (
                              <span
                                aria-label={t(`hazard.${component.hazard}` as TranslationKey)}
                                title={t(`hazard.${component.hazard}` as TranslationKey)}
                                className="shrink-0 text-2xs text-warn"
                              >
                                ⚠
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </Accordion.Content>
              </Accordion.Item>
            );
          })}
        </Accordion.Root>
      )}
    </section>
  );
}
