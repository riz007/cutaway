import { z } from 'zod';
import { COMPONENTS } from './registry/components';
import { VEHICLES } from './registry/vehicles';
import { FLOW_SPECS } from './registry/flows';
import { ARCHETYPES } from './registry/archetypes';

export const systemIdSchema = z.enum([
  'powertrain',
  'fuel',
  'lubrication',
  'cooling',
  'air',
  'braking',
  'chassis_hydraulics',
  'electrical',
  'hvac',
  'drivetrain',
  'suspension_steering',
  'structure',
  'safety_adas',
  'interior',
]);

export const archetypeIdSchema = z.enum([
  'hatch_b',
  'sedan_c',
  'cuv_b',
  'suv_c',
  'pickup',
  'ppv',
  'mpv_van',
  'bev_skateboard',
]);

export const powertrainIdSchema = z.enum([
  'na_petrol',
  'turbo_petrol',
  'turbo_diesel',
  'hev_series_parallel',
  'phev_dmi',
  'erev',
  'bev',
]);

const vec3 = z.tuple([z.number(), z.number(), z.number()]);

export const sourceRefSchema = z.object({
  label: z.string().min(1),
  url: z.string().url().optional(),
  retrieved: z.string().optional(),
  kind: z.enum(['manufacturer', 'independent', 'class_typical']),
});

export const specSheetSchema = z.object({
  displacementCc: z.number().positive().optional(),
  cylinders: z.number().int().positive().optional(),
  powerKw: z.number().positive().optional(),
  torqueNm: z.number().positive().optional(),
  batteryKwh: z.number().positive().optional(),
  transmission: z.string().optional(),
  fuelTankL: z.number().positive().optional(),
  coolantL: z.number().positive().optional(),
  engineOilL: z.number().positive().optional(),
  brakeFront: z.string().optional(),
  brakeRear: z.string().optional(),
  suspensionFront: z.string().optional(),
  suspensionRear: z.string().optional(),
  sources: z.array(sourceRefSchema).min(1, 'every spec sheet must cite at least one source'),
});

export const componentSchema = z.object({
  id: z.string().regex(/^[a-z_]+\.[a-z0-9_]+$/, 'component ids are `system.name` in snake_case'),
  nodeId: z.string().regex(/^SYS_[a-z_]+__[a-z0-9_]+$/, 'node ids are `SYS_<system>__<component>`'),
  system: systemIdSchema,
  label: z.string().min(1),
  shortDescription: z.string().min(10).max(200),
  contentSlug: z.string().min(1),
  relatedTo: z.array(z.string()),
  appliesTo: z
    .object({
      archetypes: z.array(archetypeIdSchema).optional(),
      powertrains: z.array(powertrainIdSchema).optional(),
    })
    .optional(),
  failureModes: z
    .array(
      z.object({
        symptom: z.string().min(1),
        cause: z.string().min(1),
        severity: z.enum(['advisory', 'degraded', 'immobilising', 'safety_critical']),
      }),
    )
    .optional(),
  serviceIntervalKm: z.number().positive().optional(),
  hazard: z.enum(['high_voltage', 'hot_surface', 'pressurised', 'pyrotechnic']).optional(),
});

export const trimSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  powertrain: powertrainIdSchema,
  drivetrain: z.enum(['FWD', 'RWD', 'AWD', '4WD_part_time']),
  specs: specSheetSchema,
  overrides: z.array(z.any()),
});

export const vehicleSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  brand: z.string().min(1),
  brandAliases: z.array(z.string()).optional(),
  model: z.string().min(1),
  bodyStyle: z.string().min(1),
  archetype: archetypeIdSchema,
  trims: z.array(trimSchema).min(1),
  disclaimerLevel: z.enum(['representative', 'model_specific']),
  verificationNote: z.string().optional(),
});

export const flowSpecSchema = z.object({
  id: z.string().min(1),
  system: systemIdSchema,
  medium: z.enum([
    'coolant',
    'oil',
    'fuel',
    'air_intake',
    'exhaust',
    'brake_fluid',
    'refrigerant',
    'current_12v',
    'current_hv',
  ]),
  direction: z.enum(['forward', 'reverse', 'bidirectional']),
  anchors: z.array(z.object({ at: z.string(), offset: vec3.optional() })).min(2),
  temperatureRamp: z.tuple([z.number(), z.number()]).optional(),
  radius: z.number().positive().optional(),
  appliesTo: z
    .object({
      archetypes: z.array(archetypeIdSchema).optional(),
      powertrains: z.array(powertrainIdSchema).optional(),
    })
    .optional(),
  labelKey: z.string().min(1),
});

export interface ValidationIssue {
  scope: string;
  message: string;
}

export function validateRegistries(): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const push = (scope: string, message: string) => issues.push({ scope, message });

  for (const comp of COMPONENTS) {
    const parsed = componentSchema.safeParse(comp);
    if (!parsed.success) {
      for (const e of parsed.error.errors) push(`component:${comp.id}`, `${e.path.join('.')}: ${e.message}`);
    }
  }
  for (const v of VEHICLES) {
    const parsed = vehicleSchema.safeParse(v);
    if (!parsed.success) {
      for (const e of parsed.error.errors) push(`vehicle:${v.id}`, `${e.path.join('.')}: ${e.message}`);
    }
  }
  for (const f of FLOW_SPECS) {
    const parsed = flowSpecSchema.safeParse(f);
    if (!parsed.success) {
      for (const e of parsed.error.errors) push(`flow:${f.id}`, `${e.path.join('.')}: ${e.message}`);
    }
  }

  const seenComponentIds = new Set<string>();
  const seenNodeIds = new Set<string>();
  for (const comp of COMPONENTS) {
    if (seenComponentIds.has(comp.id)) push(`component:${comp.id}`, 'duplicate component id');
    if (seenNodeIds.has(comp.nodeId)) push(`component:${comp.id}`, `duplicate node id ${comp.nodeId}`);
    seenComponentIds.add(comp.id);
    seenNodeIds.add(comp.nodeId);
  }

  const seenVehicleIds = new Set<string>();
  for (const v of VEHICLES) {
    if (seenVehicleIds.has(v.id)) push(`vehicle:${v.id}`, 'duplicate vehicle id');
    seenVehicleIds.add(v.id);
    const seenTrims = new Set<string>();
    for (const t of v.trims) {
      if (seenTrims.has(t.id)) push(`vehicle:${v.id}`, `duplicate trim id ${t.id}`);
      seenTrims.add(t.id);
      const allowed = ARCHETYPES[v.archetype].powertrains;
      if (!allowed.includes(t.powertrain)) {
        push(
          `vehicle:${v.id}`,
          `trim '${t.id}' uses powertrain '${t.powertrain}', which archetype '${v.archetype}' does not offer`,
        );
      }
    }
  }

  for (const comp of COMPONENTS) {
    for (const rel of comp.relatedTo) {
      if (!seenComponentIds.has(rel)) push(`component:${comp.id}`, `relatedTo references unknown component '${rel}'`);
      if (rel === comp.id) push(`component:${comp.id}`, 'relatedTo references itself');
    }
  }
  for (const flow of FLOW_SPECS) {
    for (const anchor of flow.anchors) {
      if (!seenComponentIds.has(anchor.at)) push(`flow:${flow.id}`, `anchor references unknown component '${anchor.at}'`);
    }
  }

  return issues;
}
