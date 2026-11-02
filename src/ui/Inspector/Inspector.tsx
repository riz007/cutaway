import {
  useAppStore,
  useConfiguration,
  useVehicleAndTrim,
} from "@/app/store/appStore";
import { Lesson } from "@/content/Lesson";
import { COMPONENTS_BY_ID, getRelated } from "@/domain/registry";
import type { Component, SpecSheet } from "@/domain/types";
import { useT, type TranslationKey } from "@/i18n";
import { getBuiltVehicle } from "@/scene/procedural/buildVehicle";
import * as Tabs from "@radix-ui/react-tabs";
import { Badge, Button, HazardNotice, SystemBadge } from "../primitives";
import { VehicleOverview } from "./VehicleOverview";

const SPEC_FIELDS: {
  key: keyof SpecSheet;
  labelKey: TranslationKey;
  unit?: TranslationKey;
}[] = [
  { key: "displacementCc", labelKey: "spec.displacementCc", unit: "units.cc" },
  { key: "cylinders", labelKey: "spec.cylinders" },
  { key: "powerKw", labelKey: "spec.powerKw", unit: "units.kw" },
  { key: "torqueNm", labelKey: "spec.torqueNm", unit: "units.nm" },
  { key: "batteryKwh", labelKey: "spec.batteryKwh", unit: "units.kwh" },
  { key: "transmission", labelKey: "spec.transmission" },
  { key: "fuelTankL", labelKey: "spec.fuelTankL", unit: "units.litre" },
  { key: "coolantL", labelKey: "spec.coolantL", unit: "units.litre" },
  { key: "engineOilL", labelKey: "spec.engineOilL", unit: "units.litre" },
  { key: "brakeFront", labelKey: "spec.brakeFront" },
  { key: "brakeRear", labelKey: "spec.brakeRear" },
  { key: "suspensionFront", labelKey: "spec.suspensionFront" },
  { key: "suspensionRear", labelKey: "spec.suspensionRear" },
];

function LessonBody({ component }: { component: Component }) {
  const t = useT();
  return (
    <Lesson
      slug={component.contentSlug}
      fallbackText={component.shortDescription}
      emptyNotice={t("inspector.noLesson")}
    />
  );
}

function Specs() {
  const t = useT();
  const { vehicle, trim } = useVehicleAndTrim();

  const rows = SPEC_FIELDS.map((field) => ({
    field,
    value: trim.specs[field.key],
  })).filter((row) => row.value !== undefined && row.value !== null);

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
        <div className="col-span-full flex items-baseline justify-between gap-3 border-b border-border pb-2">
          <dt className="text-2xs text-subtle">{t("spec.powertrain")}</dt>
          <dd className="text-sm text-fg">
            {t(`powertrain.${trim.powertrain}` as TranslationKey)}
          </dd>
        </div>
        <div className="col-span-full flex items-baseline justify-between gap-3 border-b border-border pb-2">
          <dt className="text-2xs text-subtle">{t("spec.drivetrain")}</dt>
          <dd className="text-sm text-fg">
            {t(`drive.${trim.drivetrain}` as TranslationKey)}
          </dd>
        </div>
        {rows.map(({ field, value }) => (
          <div
            key={String(field.key)}
            className="flex items-baseline justify-between gap-3"
          >
            <dt className="text-2xs text-subtle">{t(field.labelKey)}</dt>
            <dd className="font-mono text-sm tabular-nums text-fg">
              {String(value)}
              {field.unit && (
                <span className="ml-1 text-2xs text-subtle">
                  {t(field.unit)}
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>

      <div>
        <h3 className="text-2xs font-semibold uppercase tracking-[0.08em] text-subtle">
          {t("inspector.sources")}
        </h3>
        <ul className="mt-2 space-y-1.5">
          {trim.specs.sources.map((source, index) => (
            <li key={index} className="text-2xs leading-relaxed text-muted">
              {source.kind === "class_typical" ? (
                <Badge tone="warn">{t("inspector.classTypical")}</Badge>
              ) : source.url ? (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline"
                >
                  {source.label}
                </a>
              ) : (
                source.label
              )}
              {source.retrieved && (
                <span className="text-subtle"> · {source.retrieved}</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {vehicle.verificationNote && (
        <p className="rounded-[var(--radius-control)] border border-warn/40 bg-warn-soft px-3 py-2 text-2xs leading-relaxed text-muted">
          {vehicle.verificationNote}
        </p>
      )}
    </div>
  );
}

function Related({ component }: { component: Component }) {
  const select = useAppStore((s) => s.select);
  const hover = useAppStore((s) => s.hover);
  const related = getRelated(component.id);

  if (related.length === 0) {
    return <p className="text-sm text-subtle">—</p>;
  }

  return (
    <ul className="space-y-1.5">
      {related.map((other) => (
        <li key={other.id}>
          <button
            type="button"
            onClick={() => select(other.id)}
            onMouseEnter={() => hover(other.id)}
            onMouseLeave={() => hover(null)}
            className="flex w-full items-start gap-2 rounded-[var(--radius-control)] border border-border bg-surface-2 px-2.5 py-2 text-left hover:border-border-strong"
          >
            <SystemBadge system={other.system} showLabel={false} />
            <span className="min-w-0">
              <span className="block text-sm text-fg">{other.label}</span>
              <span className="block text-2xs leading-snug text-subtle">
                {other.shortDescription}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Instances({ component }: { component: Component }) {
  const t = useT();
  const config = useConfiguration();
  const select = useAppStore((s) => s.select);
  const selectedNodeId = useAppStore((s) => s.selectedNodeId);

  const instances = getBuiltVehicle(config).parts.filter(
    (p) => p.componentId === component.id,
  );
  if (instances.length < 2) return null;

  return (
    <div>
      <h3 className="text-2xs font-semibold uppercase tracking-[0.08em] text-subtle">
        {t("inspector.instancesOnVehicle")}
      </h3>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {instances.map((instance) => (
          <button
            key={instance.nodeId}
            type="button"
            onClick={() => select(component.id, instance.nodeId)}
            className={`rounded border px-2 py-1 text-2xs ${
              selectedNodeId === instance.nodeId
                ? "border-primary bg-primary/12 text-fg"
                : "border-border bg-surface-2 text-muted hover:border-border-strong"
            }`}
          >
            {instance.instanceLabel ?? instance.nodeId.split("__")[2]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Inspector() {
  const t = useT();
  const selectedComponentId = useAppStore((s) => s.selectedComponentId);
  const select = useAppStore((s) => s.select);
  const component = selectedComponentId
    ? COMPONENTS_BY_ID.get(selectedComponentId)
    : undefined;

  if (!component) {
    return <VehicleOverview />;
  }

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <SystemBadge system={component.system} />
            <h2 className="mt-1.5 text-xl font-semibold leading-tight tracking-tight text-fg">
              {component.label}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => select(null)}
            aria-label={t("inspector.close")}
          >
            <span aria-hidden>✕</span>
          </Button>
        </div>
      </header>

      <Tabs.Root
        defaultValue="overview"
        className="flex min-h-0 flex-1 flex-col"
      >
        <Tabs.List
          className="flex gap-1 border-b border-border px-3 pt-2"
          aria-label={t("nav.inspector")}
        >
          {(
            [
              ["overview", "inspector.overview"],
              ["specs", "inspector.specs"],
              ["related", "inspector.related"],
            ] as const
          ).map(([value, key]) => (
            <Tabs.Trigger
              key={value}
              value={value}
              className="-mb-px border-b-2 border-transparent px-3 pb-2 pt-1 text-sm font-medium text-subtle transition-colors hover:text-muted data-[state=active]:border-primary data-[state=active]:text-fg"
            >
              {t(key)}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <div className="scroll-area min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <Tabs.Content value="overview" className="space-y-4">
            {component.hazard && <HazardNotice hazard={component.hazard} />}
            <LessonBody component={component} />
            <Instances component={component} />

            {component.serviceIntervalKm && (
              <p className="text-sm text-muted">
                <span className="text-subtle">{t("inspector.service")}: </span>
                {t("inspector.serviceValue", {
                  km: component.serviceIntervalKm.toLocaleString(),
                })}
              </p>
            )}

            {component.failureModes && component.failureModes.length > 0 && (
              <div>
                <h3 className="text-2xs font-semibold uppercase tracking-[0.08em] text-subtle">
                  {t("inspector.failure")}
                </h3>
                <ul className="mt-2 space-y-2">
                  {component.failureModes.map((mode, index) => (
                    <li
                      key={index}
                      className="rounded-[var(--radius-control)] border border-border bg-surface-2 px-3 py-2"
                    >
                      <p className="text-sm text-fg">{mode.symptom}</p>
                      <p className="mt-0.5 text-2xs text-muted">{mode.cause}</p>
                      <p className="mt-1 text-2xs uppercase tracking-wide text-warn">
                        {t(`severity.${mode.severity}` as TranslationKey)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Tabs.Content>

          <Tabs.Content value="specs">
            <Specs />
          </Tabs.Content>

          <Tabs.Content value="related">
            <Related component={component} />
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  );
}
