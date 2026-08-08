import { useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { VEHICLES } from '@/domain/registry';
import { useAppStore, useVehicleAndTrim } from '@/app/store/appStore';
import { useT, type TranslationKey } from '@/i18n';

export function VehiclePicker() {
  const t = useT();
  const [query, setQuery] = useState('');
  const open = useAppStore((s) => s.pickerOpen);
  const setPickerOpen = useAppStore((s) => s.setPickerOpen);
  const selectVehicle = useAppStore((s) => s.selectVehicle);
  const selectTrim = useAppStore((s) => s.selectTrim);
  const { vehicle, trim } = useVehicleAndTrim();

  const grouped = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const map = new Map<string, typeof VEHICLES>();
    for (const v of VEHICLES) {
      const haystack = `${v.brand} ${v.model} ${(v.brandAliases ?? []).join(' ')} ${v.bodyStyle}`.toLowerCase();
      if (needle && !haystack.includes(needle)) continue;
      const list = map.get(v.brand);
      if (list) list.push(v);
      else map.set(v.brand, [v]);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [query]);

  return (
    <>
      <div className="flex items-center gap-2">
        <Dialog.Root open={open} onOpenChange={setPickerOpen}>
          <Dialog.Trigger asChild>
            <button
              type="button"
              aria-haspopup="dialog"
              className="flex h-9 max-w-[16rem] items-center gap-2 rounded-[var(--radius-control)] border border-border bg-surface-2 px-3 text-left transition-colors hover:border-border-strong"
            >
              <span className="min-w-0 truncate text-sm font-medium text-fg">
                {vehicle.brand} {vehicle.model}
              </span>
              <span aria-hidden className="shrink-0 text-2xs text-subtle">
                ▾
              </span>
            </button>
          </Dialog.Trigger>

          <Dialog.Portal>
            <Dialog.Overlay className="animate-overlay-in fixed inset-0 z-40 bg-bg/80 backdrop-blur-sm" />
            <Dialog.Content className="animate-content-in fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[min(48rem,94vw)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-[calc(var(--radius-card)+2px)] border border-border bg-surface shadow-2xl">
              <div className="border-b border-border px-5 py-4">
                <Dialog.Title className="text-base font-semibold text-fg">{t('picker.title')}</Dialog.Title>
                <Dialog.Description className="mt-1 text-2xs leading-relaxed text-subtle">
                  {t('app.geometryNote')} {t('app.dataNote')}
                </Dialog.Description>
                <input
                  autoFocus
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t('picker.search')}
                  aria-label={t('picker.search')}
                  className="mt-3 w-full rounded-[var(--radius-control)] border border-border bg-surface-2 px-3 py-2 text-sm text-fg placeholder:text-subtle"
                />
              </div>

              <div className="scroll-area min-h-0 flex-1 overflow-y-auto px-5 py-4">
                {grouped.length === 0 && <p className="text-sm text-subtle">{t('picker.noResults')}</p>}
                {grouped.map(([brand, models]) => (
                  <section key={brand} className="mb-5 last:mb-0">
                    <h3 className="mb-2 text-2xs font-semibold uppercase tracking-[0.08em] text-subtle">
                      {brand}
                    </h3>
                    <ul className="grid gap-1.5 sm:grid-cols-2">
                      {models.map((v) => (
                        <li key={v.id}>
          <button
                            type="button"
                            onClick={() => selectVehicle(v.id)}
                            className={`w-full rounded-[var(--radius-control)] border px-3 py-2 text-left transition-colors ${
                              v.id === vehicle.id
                                ? 'border-primary bg-primary/10'
                                : 'border-border bg-surface-2 hover:border-border-strong'
                            }`}
                          >
                            <span className="block text-sm text-fg">{v.model}</span>
                            <span className="block text-2xs text-subtle">
                              {v.bodyStyle}
                              {v.brandAliases && ` · ${t('picker.alias')} ${v.brandAliases.join(', ')}`}
                            </span>
                            {v.verificationNote && (
                              <span className="mt-1 block text-2xs text-warn">{t('picker.verify')}</span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>

              <div className="border-t border-border px-5 py-3 text-right">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="rounded-[var(--radius-control)] border border-border px-3 py-1.5 text-sm text-muted hover:border-border-strong"
                  >
                    {t('inspector.close')}
                  </button>
                </Dialog.Close>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {vehicle.trims.length > 1 ? (
          <div
            role="radiogroup"
            aria-label={t('picker.trim')}
            className="flex gap-1 rounded-[var(--radius-control)] border border-border bg-surface-2 p-1"
          >
            {vehicle.trims.map((option) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={option.id === trim.id}
                onClick={() => selectTrim(option.id)}
                className={`h-7 rounded-[calc(var(--radius-control)-2px)] px-2.5 text-2xs font-medium transition-colors ${
                  option.id === trim.id ? 'bg-primary text-primary-fg' : 'text-muted hover:bg-elevated hover:text-fg'
                }`}
              >
                {t(`powertrain.${option.powertrain}` as TranslationKey)}
              </button>
            ))}
          </div>
        ) : (
          <span className="hidden rounded-[var(--radius-control)] border border-border bg-surface-2 px-2.5 py-1.5 text-2xs text-muted md:inline">
            {t(`powertrain.${trim.powertrain}` as TranslationKey)}
          </span>
        )}
      </div>
    </>
  );
}
