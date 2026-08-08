import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import * as Slider from '@radix-ui/react-slider';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import * as Tooltip from '@radix-ui/react-tooltip';
import type { Hazard, SystemId } from '@/domain/types';
import { SYSTEMS } from '@/domain/registry';
import { useT, type TranslationKey } from '@/i18n';

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-fg hover:bg-primary-hover font-semibold',
  secondary: 'bg-elevated text-fg hover:bg-border border border-border',
  ghost: 'text-muted hover:bg-surface-2 hover:text-fg',
  outline: 'border border-border text-fg hover:bg-surface-2 hover:border-border-strong',
  danger: 'bg-danger-soft text-danger border border-danger/40 hover:border-danger',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-2.5 text-2xs gap-1.5',
  md: 'h-9 px-3 text-sm gap-2',
  lg: 'h-11 px-4 text-[0.9375rem] gap-2',
  icon: 'h-9 w-9 justify-center',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        'inline-flex select-none items-center rounded-[var(--radius-control)] transition-colors',
        'disabled:pointer-events-none disabled:opacity-45',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
});

export function Card({
  title,
  description,
  action,
  children,
  className,
  as: Tag = 'section',
  labelledBy,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div';
  labelledBy?: string;
}) {
  const headingId = title ? `card-${title.replace(/\W+/g, '-').toLowerCase()}` : undefined;

  return (
    <Tag
      className={cx('rounded-[var(--radius-card)] border border-border bg-surface', className)}
      {...(Tag === 'section' ? { 'aria-labelledby': labelledBy ?? headingId } : {})}
    >
      {(title || action) && (
        <header className="flex items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
          <div className="min-w-0">
            {title && (
              <h2 id={headingId} className="truncate text-2xs font-semibold uppercase tracking-[0.08em] text-subtle">
                {title}
              </h2>
            )}
            {description && <p className="mt-0.5 text-2xs text-subtle">{description}</p>}
          </div>
          {action}
        </header>
      )}
      <div className="p-3.5">{children}</div>
    </Tag>
  );
}

export function Field({
  label,
  hint,
  htmlFor,
  value,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  value?: string;
  children: ReactNode;
}) {
  const hintId = hint && htmlFor ? `${htmlFor}-hint` : undefined;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-2xs font-medium text-muted">
          {label}
        </label>
        {value && <span className="numeric text-2xs text-fg">{value}</span>}
      </div>
      {children}
      {hint && (
        <p id={hintId} className="text-2xs leading-snug text-subtle">
          {hint}
        </p>
      )}
    </div>
  );
}

export function LabelledSlider({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  format,
  id,
  hint,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  format?: (value: number) => string;
  id: string;
  hint?: string;
}) {
  const display = format ? format(value) : value.toFixed(2);
  return (
    <Field label={label} htmlFor={id} value={display} hint={hint}>
      <Slider.Root
        id={id}
        className="relative flex h-6 w-full touch-none select-none items-center"
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([next]) => onChange(next ?? min)}
        aria-label={label}
        aria-valuetext={display}
      >
        <Slider.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-elevated">
          <Slider.Range className="absolute h-full bg-primary" />
        </Slider.Track>
        <Slider.Thumb
          className="block h-4 w-4 rounded-full border-2 border-primary bg-bg shadow-sm transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          aria-label={label}
        />
      </Slider.Root>
    </Field>
  );
}

export function Switch({
  label,
  checked,
  onCheckedChange,
  hint,
  id,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  hint?: string;
  id: string;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] border border-border bg-surface-2 px-3 py-2">
      <span className="min-w-0">
        <label htmlFor={id} className="block cursor-pointer truncate text-sm text-fg">
          {label}
        </label>
        {hint && (
          <span id={hintId} className="block text-2xs text-subtle">
            {hint}
          </span>
        )}
      </span>
      <SwitchPrimitive.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-describedby={hintId}
        className={cx(
          'relative h-5 w-9 shrink-0 rounded-full border transition-colors',
          checked ? 'border-primary bg-primary' : 'border-border-strong bg-elevated',
        )}
      >
        <SwitchPrimitive.Thumb
          className={cx(
            'block h-3.5 w-3.5 rounded-full bg-fg transition-transform',
            checked ? 'translate-x-[1.15rem] bg-primary-fg' : 'translate-x-[0.15rem]',
          )}
        />
      </SwitchPrimitive.Root>
    </div>
  );
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  size = 'md',
  columns,
}: {
  value: T;
  options: { id: T; label: string; hint?: string; disabled?: boolean }[];
  onChange: (value: T) => void;
  ariaLabel: string;
  size?: 'sm' | 'md';
  columns?: number;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cx(
        'gap-1 rounded-[var(--radius-control)] border border-border bg-surface-2 p-1',
        columns ? 'grid' : 'flex',
      )}
      style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
    >
      {options.map((option) => {
        const active = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={option.disabled}
            title={option.hint}
            onClick={() => onChange(option.id)}
            className={cx(
              'min-w-0 truncate rounded-[calc(var(--radius-control)-2px)] px-2 font-medium transition-colors',
              size === 'sm' ? 'h-6 text-2xs' : 'h-7 text-sm',
              columns ? '' : 'flex-1',
              active ? 'bg-primary text-primary-fg' : 'text-muted hover:bg-elevated hover:text-fg',
              option.disabled && 'opacity-40',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'warn' | 'danger' | 'primary';
}) {
  const tones = {
    neutral: 'border-border bg-surface-2 text-muted',
    warn: 'border-warn/40 bg-warn-soft text-warn',
    danger: 'border-danger/40 bg-danger-soft text-danger',
    primary: 'border-primary/40 bg-primary/10 text-primary',
  };
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-2xs font-medium',
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function SystemDot({ system }: { system: SystemId }) {
  const meta = SYSTEMS[system];
  return (
    <span
      aria-hidden
      className="grid h-5 w-5 shrink-0 place-items-center rounded-[0.3rem] text-2xs font-bold text-bg"
      style={{ backgroundColor: meta.color }}
    >
      {meta.glyph}
    </span>
  );
}

export function SystemBadge({ system, showLabel = true }: { system: SystemId; showLabel?: boolean }) {
  const t = useT();
  return (
    <span className="inline-flex items-center gap-1.5 text-2xs text-muted">
      <SystemDot system={system} />
      {showLabel && <span>{t(SYSTEMS[system].labelKey as TranslationKey)}</span>}
    </span>
  );
}

const HAZARD_KEYS: Record<Hazard, { label: TranslationKey; warning: TranslationKey }> = {
  high_voltage: { label: 'hazard.high_voltage', warning: 'hazard.high_voltage.warning' },
  hot_surface: { label: 'hazard.hot_surface', warning: 'hazard.hot_surface.warning' },
  pressurised: { label: 'hazard.pressurised', warning: 'hazard.pressurised.warning' },
  pyrotechnic: { label: 'hazard.pyrotechnic', warning: 'hazard.pyrotechnic.warning' },
};

export function HazardNotice({ hazard }: { hazard: Hazard }) {
  const t = useT();
  const keys = HAZARD_KEYS[hazard];
  const severe = hazard === 'high_voltage' || hazard === 'pyrotechnic';

  return (
    <div
      role="note"
      aria-label={t(keys.label)}
      className={cx(
        'rounded-[var(--radius-control)] border px-3.5 py-3',
        severe ? 'border-danger/50 bg-danger-soft' : 'border-warn/40 bg-warn-soft',
      )}
    >
      <p className={cx('flex items-center gap-2 text-sm font-semibold', severe ? 'text-danger' : 'text-warn')}>
        <span aria-hidden>{severe ? '⚠' : '△'}</span>
        {t(keys.label)}
      </p>
      <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-fg">{t(keys.warning)}</p>
    </div>
  );
}

export function InfoTip({ children, label }: { children: ReactNode; label: string }) {
  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            aria-label={label}
            className="grid h-4 w-4 place-items-center rounded-full border border-border-strong text-2xs text-muted"
          >
            i
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            sideOffset={6}
            className="z-50 max-w-xs rounded-[var(--radius-control)] border border-border bg-elevated px-3 py-2 text-2xs leading-relaxed text-muted shadow-xl"
          >
            {children}
            <Tooltip.Arrow className="fill-elevated" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

export function Readout({
  label,
  value,
  unit,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: 'neutral' | 'warn' | 'danger';
}) {
  const toneClass = tone === 'danger' ? 'text-danger' : tone === 'warn' ? 'text-warn' : 'text-fg';
  return (
    <div className="rounded-[var(--radius-control)] border border-border bg-surface-2 px-3 py-2">
      <dt className="truncate text-2xs uppercase tracking-[0.04em] text-subtle">{label}</dt>
      <dd className={cx('numeric mt-0.5 text-base leading-none', toneClass)}>
        {value}
        {unit && <span className="ml-1 text-2xs text-subtle">{unit}</span>}
      </dd>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center p-8 text-center">
      <p className="max-w-[28ch] text-sm leading-relaxed text-subtle">{children}</p>
    </div>
  );
}
