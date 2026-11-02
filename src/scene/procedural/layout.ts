import type { Archetype, ArchetypeGeometry, PowertrainId, Vec3, VehicleDimensions } from '@/domain/types';
import { BODY_STYLES, buildBodyShape, type BodyShape } from './bodyProfile';
import { bodyProfile, type BodyParams } from './bodySurface';

export interface Layout {
  archetype: Archetype;
  g: ArchetypeGeometry;
  powertrain: PowertrainId;
  hasEngine: boolean;
  isElectrified: boolean;

  zNose: number;
  zTail: number;
  zAxleF: number;
  zAxleR: number;
  zFirewall: number;
  zCabinEnd: number;

  halfTrack: number;
  halfWidth: number;

  floorY: number;
  roofY: number;
  beltlineY: number;
  hubY: number;

  engineBay: Vec3;
  rearAxle: Vec3;

  body: BodyShape;
  shell: BodyParams;

  measured: boolean;
}

const ELECTRIFIED: PowertrainId[] = ['hev_series_parallel', 'phev_dmi', 'erev', 'bev'];
const ENGINED: PowertrainId[] = ['na_petrol', 'turbo_petrol', 'turbo_diesel', 'hev_series_parallel', 'phev_dmi', 'erev'];

export function applyDimensions(base: ArchetypeGeometry, dimensions?: VehicleDimensions): ArchetypeGeometry {
  if (!dimensions) return base;

  const length = dimensions.lengthMm / 1000;
  const width = dimensions.widthMm / 1000;
  const height = dimensions.heightMm / 1000;
  const wheelbase = dimensions.wheelbaseMm / 1000;
  const groundClearance = dimensions.groundClearanceMm ? dimensions.groundClearanceMm / 1000 : base.groundClearance;

  const overhang = Math.max(0.2, length - wheelbase);
  const baseOverhang = Math.max(0.2, base.length - base.wheelbase);
  const frontShare = Math.min(0.75, Math.max(0.25, base.frontOverhang / baseOverhang));

  const wheelRadius = dimensions.wheelDiameterMm
    ? dimensions.wheelDiameterMm / 2000
    : base.wheelRadius * (height / base.height) ** 0.5;

  return {
    ...base,
    length,
    width,
    height,
    wheelbase,
    groundClearance,
    wheelRadius,
    track: width * (base.track / base.width),
    frontOverhang: overhang * frontShare,
  };
}

export function makeLayout(archetype: Archetype, powertrain: PowertrainId, dimensions?: VehicleDimensions): Layout {
  const g = applyDimensions(archetype.geometry, dimensions);

  const zNose = -g.length / 2;
  const zTail = g.length / 2;
  const zAxleF = zNose + g.frontOverhang;
  const zAxleR = zAxleF + g.wheelbase;

  const style = BODY_STYLES[archetype.id];
  const body = buildBodyShape({ length: g.length, height: g.height, zNose, style });

  const zFirewall = body.landmarks.zBonnetEnd;
  const zCabinEnd = g.hasBed ? body.landmarks.zRoofEnd + 0.1 : body.landmarks.zDeckStart;

  const shell: BodyParams = {
    ...body.landmarks,
    halfWidth: g.width / 2,
    zAxleF,
    zAxleR,
    hubY: g.wheelRadius,
    archRadius: g.wheelRadius * style.archScale,
    tumblehome: style.tumblehome,
    planRound: style.planRound,
    bed: style.bed,
    zBPillar: (zFirewall + zCabinEnd) / 2,
  };

  const floorY = g.groundClearance + 0.06;
  const beltlineY = body.landmarks.deckY;

  const engineBayZ =
    g.engineLayout === 'longitudinal'
      ? zAxleF + 0.35
      : Math.max(zNose + 0.42, Math.min(zAxleF - 0.05, zFirewall - 0.45));

  const ENGINE_HALF_HEIGHT = 0.4;
  const ENGINE_REACH = 0.3;
  const outline = bodyProfile(shell);
  const bonnetAtBay = Math.min(
    ...[-ENGINE_REACH, 0, ENGINE_REACH].map((dz) => outline(Math.max(zNose, engineBayZ + dz)).top - 0.03),
  );
  const engineBayY =
    g.engineLayout === 'none'
      ? floorY + 0.18
      : Math.min(
          Math.max(bonnetAtBay - ENGINE_HALF_HEIGHT, g.groundClearance + 0.24),
          floorY + 0.4,
        );

  return {
    archetype,
    g,
    powertrain,
    hasEngine: ENGINED.includes(powertrain) && g.engineLayout !== 'none',
    isElectrified: ELECTRIFIED.includes(powertrain),
    zNose,
    zTail,
    zAxleF,
    zAxleR,
    zFirewall,
    zCabinEnd,
    halfTrack: g.track / 2,
    halfWidth: g.width / 2,
    floorY,
    roofY: g.height,
    beltlineY,
    hubY: g.wheelRadius,
    engineBay: [0, engineBayY, engineBayZ],
    rearAxle: [0, g.wheelRadius, zAxleR],
    body,
    shell,
    measured: Boolean(dimensions),
  };
}

export interface Corner {
  variant: 'fl' | 'fr' | 'rl' | 'rr';
  labelKey: 'corner.fl' | 'corner.fr' | 'corner.rl' | 'corner.rr';
  x: number;
  z: number;
  front: boolean;
  left: boolean;
}

export function corners(l: Layout): Corner[] {
  return [
    { variant: 'fl', labelKey: 'corner.fl', x: -l.halfTrack, z: l.zAxleF, front: true, left: true },
    { variant: 'fr', labelKey: 'corner.fr', x: l.halfTrack, z: l.zAxleF, front: true, left: false },
    { variant: 'rl', labelKey: 'corner.rl', x: -l.halfTrack, z: l.zAxleR, front: false, left: true },
    { variant: 'rr', labelKey: 'corner.rr', x: l.halfTrack, z: l.zAxleR, front: false, left: false },
  ];
}

export const HALF_PI = Math.PI / 2;

export const ALONG_X: Vec3 = [0, 0, HALF_PI];

export const ALONG_Z: Vec3 = [HALF_PI, 0, 0];

// Lays a Y-axis shaft along Z while keeping its local X pointing up, so
// crank throws and cam lobes share one angular reference with transverse engines.
export const SHAFT_ALONG_Z: Vec3 = [HALF_PI, HALF_PI, 0];
