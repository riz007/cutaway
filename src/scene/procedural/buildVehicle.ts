import type { ArchetypeId, PowertrainId, SystemId, Vec3, VehicleDimensions } from '@/domain/types';
import { ARCHETYPES, COMPONENTS_BY_ID, appliesTo } from '@/domain/registry';
import type { BuiltScene, PartDef, PartInstance } from './types';
import { makeLayout, type Layout } from './layout';
import { buildStructure, buildSuspension, buildChassisHydraulics } from './builders/structureSuspension';
import { buildPowertrain, buildLubrication, buildAir, buildFuel } from './builders/powertrainGroup';
import { buildCooling, buildHvac } from './builders/thermal';
import { buildBraking, buildDrivetrain } from './builders/chassisSystems';
import { buildElectrical, buildSafetyAdas, buildInterior } from './builders/cabinElectrical';

export type SystemBuilder = (l: Layout) => PartDef[];

const BUILDERS: Record<SystemId, SystemBuilder> = {
  structure: buildStructure,
  suspension_steering: buildSuspension,
  chassis_hydraulics: buildChassisHydraulics,
  powertrain: buildPowertrain,
  lubrication: buildLubrication,
  air: buildAir,
  fuel: buildFuel,
  cooling: buildCooling,
  hvac: buildHvac,
  braking: buildBraking,
  drivetrain: buildDrivetrain,
  electrical: buildElectrical,
  safety_adas: buildSafetyAdas,
  interior: buildInterior,
};

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];

function normalize(v: Vec3): Vec3 {
  const len = Math.hypot(v[0], v[1], v[2]);
  return len < 1e-6 ? [0, 1, 0] : [v[0] / len, v[1] / len, v[2] / len];
}

const EXPLODE_DISTANCE = 0.55;

function deriveExplode(position: Vec3, centroid: Vec3): Vec3 {
  const radial = normalize(sub(position, centroid));
  const biased: Vec3 = [radial[0], radial[1] * 0.6 + 0.55, radial[2]];
  return scale(normalize(biased), EXPLODE_DISTANCE);
}

function centroidOf(defs: PartDef[]): Vec3 {
  if (defs.length === 0) return [0, 0, 0];
  const sum = defs.reduce<Vec3>((acc, d) => add(acc, d.position), [0, 0, 0]);
  return scale(sum, 1 / defs.length);
}

export interface BuildConfig {
  archetype: ArchetypeId;
  powertrain: PowertrainId;

  vehicleId?: string;
  dimensions?: VehicleDimensions;
}

export function buildSystem(system: SystemId, l: Layout, config: BuildConfig): PartInstance[] {
  const defs = BUILDERS[system](l).filter((def) => {
    const comp = COMPONENTS_BY_ID.get(def.component);
    if (!comp) {
      throw new Error(
        `Procedural builder for '${system}' emitted unknown component '${def.component}'. ` +
          `Add it to the component registry or fix the builder.`,
      );
    }
    return appliesTo(comp.appliesTo, config);
  });

  const centroid = centroidOf(defs);

  return defs.map((def) => {
    const comp = COMPONENTS_BY_ID.get(def.component)!;
    const variant = def.variant ?? 'a';
    const lod = def.lod ?? 0;
    return {
      nodeId: `${comp.nodeId}__${variant}__LOD${lod}`,
      baseNodeId: comp.nodeId,
      componentId: comp.id,
      system: comp.system,
      shape: def.shape,
      position: def.position,
      rotation: def.rotation ?? [0, 0, 0],
      explode: def.explode ?? deriveExplode(def.position, centroid),
      material: def.material,
      ...(def.instanceLabel ? { instanceLabel: def.instanceLabel } : {}),
      lod,
    } satisfies PartInstance;
  });
}

export function buildVehicle(config: BuildConfig): BuiltScene {
  const layout = makeLayout(ARCHETYPES[config.archetype], config.powertrain, config.dimensions);
  const parts = (Object.keys(BUILDERS) as SystemId[]).flatMap((s) => buildSystem(s, layout, config));

  const g = layout.g;
  return {
    parts,
    bounds: {
      min: [-g.width / 2, 0, layout.zNose],
      max: [g.width / 2, g.height, layout.zTail],
    },
  };
}

const buildCache = new Map<string, BuiltScene>();

export function getBuiltVehicle(config: BuildConfig): BuiltScene {
  const key = `${config.vehicleId ?? config.archetype}:${config.powertrain}`;
  const cached = buildCache.get(key);
  if (cached) return cached;
  const built = buildVehicle(config);
  buildCache.set(key, built);
  return built;
}

export function clearBuildCache(): void {
  buildCache.clear();
}

export { makeLayout };
export type { Layout };
