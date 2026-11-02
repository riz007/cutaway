import type { Vec3 } from '@/domain/types';
import { DEFAULT_ENGINE, TWO_PI, cylinderPhase } from '@/sim/engine';
import type { Kinematic, PartDef } from '../types';
import { ALONG_X, ALONG_Z, SHAFT_ALONG_Z, type Layout } from '../layout';

const CYLINDERS = (l: Layout) => (l.powertrain === 'hev_series_parallel' || l.powertrain === 'erev' ? 3 : 4);
const PITCH = 0.095;
const CRANK_DROP = 0.12;
const INTAKE_PEAK = Math.PI * 0.5;
const EXHAUST_PEAK = Math.PI * 3.5;

const wrap = (a: number) => ((a % TWO_PI) + TWO_PI) % TWO_PI;

function bankOffset(i: number, count: number): number {
  return (i - (count - 1) / 2) * PITCH;
}

function cylinderPos(l: Layout, i: number, count: number, y: number): Vec3 {
  const [ex, , ez] = l.engineBay;
  const offset = bankOffset(i, count);
  return l.g.engineLayout === 'longitudinal' ? [ex, y, ez + offset] : [ex + offset, y, ez];
}

// The shaft mesh runs along its local Y. Transverse engines map that to world
// -X and longitudinal ones to world +Z, so a cylinder's station flips sign.
function shaftStation(l: Layout, i: number, count: number): number {
  const offset = bankOffset(i, count);
  return l.g.engineLayout === 'longitudinal' ? offset : -offset;
}

function lobeAngle(peak: number, phase: number): number {
  return wrap(Math.PI - (peak - phase) / 2);
}

const bankAxis = (l: Layout): Vec3 => (l.g.engineLayout === 'longitudinal' ? ALONG_Z : ALONG_X);
const bankLength = (count: number) => count * 0.095 + 0.09;

export function buildPowertrain(l: Layout): PartDef[] {
  const parts: PartDef[] = [];
  const [ex, ey, ez] = l.engineBay;
  const count = CYLINDERS(l);
  const blockLen = bankLength(count);
  const axis = bankAxis(l);
  const longitudinal = l.g.engineLayout === 'longitudinal';
  const sizeAlongBank = (along: number, across: number, height: number): Vec3 =>
    longitudinal ? [across, height, along] : [along, height, across];

  parts.push({
    component: 'powertrain.engine_block',
    shape: { kind: 'box', size: sizeAlongBank(blockLen, 0.32, 0.28) },
    position: [ex, ey, ez],
    material: 'cast_iron',
    explode: [0, -0.35, 0],
  });
  parts.push({
    component: 'powertrain.head_gasket',
    shape: { kind: 'box', size: sizeAlongBank(blockLen, 0.34, 0.012) },
    position: [ex, ey + 0.145, ez],
    material: 'steel',
    explode: [0, 0.5, 0],
  });
  parts.push({
    component: 'powertrain.cylinder_head',
    shape: { kind: 'box', size: sizeAlongBank(blockLen, 0.3, 0.14) },
    position: [ex, ey + 0.22, ez],
    material: 'aluminium',
    explode: [0, 0.75, 0],
  });
  const shaftRotation = longitudinal ? SHAFT_ALONG_Z : ALONG_X;
  const crankY = ey - CRANK_DROP;
  const bank: Kinematic['bank'] = longitudinal ? 'z' : 'x';

  parts.push({
    component: 'powertrain.crankshaft',
    shape: {
      kind: 'crankshaft',
      throw: DEFAULT_ENGINE.crankThrow,
      journalRadius: 0.024,
      pinRadius: 0.019,
      span: blockLen + 0.06,
      throws: Array.from({ length: count }, (_, i) => ({
        station: shaftStation(l, i, count),
        angle: wrap(cylinderPhase(i, count)),
      })),
    },
    position: [ex, crankY, ez],
    rotation: shaftRotation,
    material: 'steel',
    explode: [0, -0.75, 0],
  });
  parts.push({
    component: 'powertrain.flywheel',
    shape: { kind: 'cylinder', radius: 0.13, height: 0.035 },
    position: longitudinal ? [ex, ey - 0.12, ez + blockLen / 2 + 0.04] : [ex + blockLen / 2 + 0.04, ey - 0.12, ez],
    rotation: axis,
    material: 'steel',
    explode: longitudinal ? [0, 0, 0.8] : [0.8, 0, 0],
  });

  for (let i = 0; i < count; i += 1) {
    const label = `Cylinder ${i + 1}`;
    const pivot = cylinderPos(l, i, count, crankY);
    const restHeight = DEFAULT_ENGINE.rodLength;
    parts.push({
      component: 'powertrain.piston',
      variant: `c${i + 1}`,
      instanceLabel: label,
      shape: { kind: 'cylinder', radius: 0.038, height: 0.06 },
      position: cylinderPos(l, i, count, crankY + restHeight + 0.012),
      material: 'aluminium',
      explode: [0, 1.1, 0],
      kinematic: { pivot, bank, rise: 0.012 },
    });
    parts.push({
      component: 'powertrain.piston_rings',
      variant: `c${i + 1}`,
      instanceLabel: label,
      shape: { kind: 'torus', radius: 0.038, tube: 0.004 },
      position: cylinderPos(l, i, count, crankY + restHeight + 0.032),
      rotation: [Math.PI / 2, 0, 0],
      material: 'steel',
      explode: [0, 1.25, 0],
      kinematic: { pivot, bank, rise: 0.032 },
    });
    parts.push({
      component: 'powertrain.connecting_rod',
      variant: `c${i + 1}`,
      instanceLabel: label,
      shape: { kind: 'box', size: [0.022, DEFAULT_ENGINE.rodLength, 0.03] },
      position: cylinderPos(l, i, count, crankY + restHeight / 2),
      material: 'steel',
      explode: [0, 0.9, 0],
      kinematic: { pivot, bank },
    });
    parts.push({
      component: 'powertrain.spark_plug',
      variant: `c${i + 1}`,
      instanceLabel: label,
      shape: { kind: 'cylinder', radius: 0.011, height: 0.075 },
      position: cylinderPos(l, i, count, ey + 0.29),
      material: 'chrome',
      explode: [0, 1.0, 0],
    });
    parts.push({
      component: 'powertrain.glow_plug',
      variant: `c${i + 1}`,
      instanceLabel: label,
      shape: { kind: 'cylinder', radius: 0.009, height: 0.07 },
      position: cylinderPos(l, i, count, ey + 0.29),
      material: 'chrome',
      explode: [0, 1.0, 0],
    });

    for (const [valve, comp, across] of [
      ['in', 'powertrain.valve_intake', -0.06],
      ['ex', 'powertrain.valve_exhaust', 0.06],
    ] as const) {
      const base = cylinderPos(l, i, count, ey + 0.22);
      const pos: Vec3 = longitudinal ? [base[0] + across, base[1], base[2]] : [base[0], base[1], base[2] + across];
      parts.push({
        component: comp,
        variant: `c${i + 1}_${valve}`,
        instanceLabel: label,
        shape: { kind: 'cylinder', radius: 0.014, height: 0.1 },
        position: pos,
        material: 'steel',
        explode: [0, 0.95, 0],
      });
    }
  }

  for (const [comp, across, variant, peak] of [
    ['powertrain.camshaft_intake', -0.06, 'in', INTAKE_PEAK],
    ['powertrain.camshaft_exhaust', 0.06, 'ex', EXHAUST_PEAK],
  ] as const) {
    const pos: Vec3 = longitudinal ? [ex + across, ey + 0.27, ez] : [ex, ey + 0.27, ez + across];
    parts.push({
      component: comp,
      variant,
      shape: {
        kind: 'camshaft',
        radius: 0.014,
        lift: 0.012,
        span: blockLen,
        lobes: Array.from({ length: count }, (_, i) => ({
          station: shaftStation(l, i, count),
          angle: lobeAngle(peak, cylinderPhase(i, count)),
        })),
      },
      position: pos,
      rotation: shaftRotation,
      material: 'steel',
      explode: [0, 0.85, 0],
    });
  }

  parts.push({
    component: 'powertrain.timing_chain',
    shape: { kind: 'box', size: sizeAlongBank(0.02, 0.16, 0.52) },
    position: longitudinal ? [ex, ey + 0.1, ez - blockLen / 2 - 0.02] : [ex - blockLen / 2 - 0.02, ey + 0.1, ez],
    material: 'steel',
    explode: longitudinal ? [0, 0.2, -0.8] : [-0.8, 0.2, 0],
  });
  parts.push({
    component: 'powertrain.vvt_actuator',
    shape: { kind: 'cylinder', radius: 0.055, height: 0.03 },
    position: longitudinal ? [ex - 0.06, ey + 0.27, ez - blockLen / 2 - 0.03] : [ex - blockLen / 2 - 0.03, ey + 0.27, ez - 0.06],
    rotation: axis,
    material: 'aluminium',
  });
  parts.push({
    component: 'powertrain.turbocharger',
    shape: { kind: 'sphere', radius: 0.085 },
    position: longitudinal ? [ex + 0.2, ey + 0.06, ez - 0.16] : [ex - 0.16, ey + 0.06, ez + 0.24],
    material: 'cast_iron',
  });

  for (const [variant, x] of [
    ['l', -0.42],
    ['r', 0.42],
  ] as const) {
    parts.push({
      component: 'powertrain.engine_mount',
      variant,
      instanceLabel: variant === 'l' ? 'Left' : 'Right',
      shape: { kind: 'box', size: [0.1, 0.09, 0.1] },
      position: [x, ey - 0.02, ez],
      material: 'rubber',
    });
  }

  parts.push({
    component: 'powertrain.mg1',
    shape: { kind: 'cylinder', radius: 0.085, height: 0.16 },
    position: [ex + 0.34, ey - 0.02, ez + 0.06],
    rotation: ALONG_X,
    material: 'copper',
    explode: [0.85, 0.15, 0],
  });
  parts.push({
    component: 'powertrain.planetary_gearset',
    shape: { kind: 'cylinder', radius: 0.1, height: 0.08 },
    position: [ex + 0.34, ey - 0.02, ez - 0.1],
    rotation: ALONG_X,
    material: 'steel',
    explode: [0.85, 0.35, 0],
  });

  const rearMotor = l.g.engineLayout === 'none';
  const mg2Pos: Vec3 = rearMotor ? [0, l.hubY + 0.02, l.zAxleR - 0.12] : [ex + 0.36, ey - 0.12, ez - 0.2];
  parts.push({
    component: 'powertrain.mg2',
    shape: { kind: 'cylinder', radius: 0.1, height: 0.2 },
    position: mg2Pos,
    rotation: ALONG_X,
    material: 'copper',
  });
  parts.push({
    component: 'powertrain.traction_motor',
    shape: { kind: 'cylinder', radius: 0.11, height: 0.24 },
    position: rearMotor ? [0, l.hubY + 0.02, l.zAxleR - 0.14] : [ex, ey, ez],
    rotation: ALONG_X,
    material: 'copper',
  });

  const skateboard = l.g.engineLayout === 'none';
  parts.push({
    component: 'powertrain.hv_battery',
    shape: skateboard
      ? { kind: 'box', size: [l.g.width * 0.82, 0.13, l.g.wheelbase * 0.86] }
      : { kind: 'box', size: [l.g.width * 0.5, 0.16, 0.4] },
    position: skateboard ? [0, l.g.groundClearance + 0.07, (l.zAxleF + l.zAxleR) / 2] : [0, l.floorY + 0.14, l.zAxleR - 0.5],
    material: 'hv_orange',
    explode: [0, -0.9, 0],
  });

  return parts;
}

export function buildLubrication(l: Layout): PartDef[] {
  const [ex, ey, ez] = l.engineBay;
  const count = CYLINDERS(l);
  const blockLen = bankLength(count);
  const longitudinal = l.g.engineLayout === 'longitudinal';
  const sizeAlongBank = (along: number, across: number, height: number): Vec3 =>
    longitudinal ? [across, height, along] : [along, height, across];

  return [
    {
      component: 'lubrication.sump',
      shape: { kind: 'box', size: sizeAlongBank(blockLen * 0.9, 0.3, 0.11) },
      position: [ex, ey - 0.22, ez],
      material: 'aluminium',
      explode: [0, -1.0, 0],
    },
    {
      component: 'lubrication.pickup',
      shape: { kind: 'cylinder', radius: 0.014, height: 0.12 },
      position: [ex, ey - 0.19, ez + 0.04],
      material: 'steel',
      explode: [0, -0.8, 0],
    },
    {
      component: 'lubrication.oil_pump',
      shape: { kind: 'cylinder', radius: 0.045, height: 0.05 },
      position: longitudinal ? [ex, ey - 0.12, ez - blockLen / 2 + 0.02] : [ex - blockLen / 2 + 0.02, ey - 0.12, ez],
      rotation: bankAxis(l),
      material: 'aluminium',
    },
    {
      component: 'lubrication.oil_filter',
      shape: { kind: 'cylinder', radius: 0.04, height: 0.12 },
      position: [ex + 0.16, ey - 0.16, ez + 0.16],
      material: 'steel',
      explode: [0.4, -0.5, 0.4],
    },
    {
      component: 'lubrication.oil_gallery',
      shape: { kind: 'cylinder', radius: 0.009, height: blockLen },
      position: [ex, ey + 0.02, ez + (longitudinal ? 0 : 0.11)],
      rotation: bankAxis(l),
      material: 'fluid',
    },
    ...Array.from({ length: count + 1 }, (_, i): PartDef => {
      const pitch = 0.095;
      const offset = (i - count / 2) * pitch;
      return {
        component: 'lubrication.main_bearing',
        variant: `m${i + 1}`,
        instanceLabel: `Main ${i + 1}`,
        shape: { kind: 'cylinder', radius: 0.032, height: 0.022 },
        position: longitudinal ? [ex, ey - 0.12, ez + offset] : [ex + offset, ey - 0.12, ez],
        rotation: bankAxis(l),
        material: 'copper',
        explode: [0, -0.6, 0],
      };
    }),
    {
      component: 'lubrication.pressure_sensor',
      shape: { kind: 'cylinder', radius: 0.014, height: 0.05 },
      position: [ex + 0.1, ey - 0.1, ez + 0.17],
      material: 'plastic_black',
    },
    {
      component: 'lubrication.oil_cooler',
      shape: { kind: 'box', size: [0.11, 0.09, 0.05] },
      position: [ex + 0.13, ey - 0.14, ez + 0.1],
      material: 'aluminium',
    },
  ];
}

export function buildAir(l: Layout): PartDef[] {
  const [ex, ey, ez] = l.engineBay;
  const longitudinal = l.g.engineLayout === 'longitudinal';
  const intakeSide = longitudinal ? 0.22 : 0;
  const manifoldZ = longitudinal ? ez : ez - 0.24;
  const exhaustZ = longitudinal ? ez : ez + 0.24;
  const underfloorY = l.g.groundClearance - 0.02;

  return [
    {
      component: 'air.airbox',
      shape: { kind: 'box', size: [0.26, 0.16, 0.22] },
      position: [ex - 0.42, ey + 0.27, ez - 0.32],
      material: 'plastic_black',
      explode: [-0.5, 0.6, -0.2],
    },
    {
      component: 'air.air_filter',
      shape: { kind: 'box', size: [0.22, 0.04, 0.18] },
      position: [ex - 0.42, ey + 0.27, ez - 0.32],
      material: 'fabric',
      explode: [-0.5, 0.9, -0.2],
    },
    {
      component: 'air.maf_sensor',
      shape: { kind: 'cylinder', radius: 0.018, height: 0.05 },
      position: [ex - 0.28, ey + 0.27, ez - 0.3],
      material: 'plastic_black',
    },
    {
      component: 'air.throttle_body',
      shape: { kind: 'cylinder', radius: 0.04, height: 0.07 },
      position: [ex - 0.12, ey + 0.29, manifoldZ - 0.05],
      rotation: ALONG_Z,
      material: 'aluminium',
    },
    {
      component: 'air.intake_manifold',
      shape: { kind: 'box', size: [0.34, 0.12, 0.16] },
      position: [ex + intakeSide, ey + 0.28, manifoldZ - 0.02],
      material: 'plastic_black',
      explode: [0, 0.55, -0.6],
    },
    {
      component: 'air.intercooler',
      shape: { kind: 'box', size: [l.g.width * 0.5, 0.16, 0.05] },
      position: [0, l.floorY + 0.2, l.zNose + 0.24],
      material: 'aluminium',
      explode: [0, 0.1, -0.9],
    },
    {
      component: 'air.exhaust_manifold',
      shape: { kind: 'box', size: [0.32, 0.1, 0.1] },
      position: [ex, ey + 0.16, exhaustZ],
      material: 'cast_iron',
      explode: [0, 0.3, 0.7],
    },
    {
      component: 'air.o2_sensor',
      shape: { kind: 'cylinder', radius: 0.013, height: 0.06 },
      position: [ex + 0.05, ey + 0.06, exhaustZ + 0.06],
      material: 'chrome',
    },
    {
      component: 'air.catalytic_converter',
      shape: { kind: 'cylinder', radius: 0.055, height: 0.28 },
      position: [0.1, underfloorY, l.zFirewall + 0.25],
      rotation: ALONG_Z,
      material: 'chrome',
    },
    {
      component: 'air.egr_valve',
      shape: { kind: 'cylinder', radius: 0.03, height: 0.06 },
      position: [ex + 0.16, ey + 0.2, exhaustZ - 0.06],
      material: 'cast_iron',
    },
    {
      component: 'air.resonator',
      shape: { kind: 'cylinder', radius: 0.06, height: 0.24 },
      position: [0.1, underfloorY, (l.zFirewall + l.zAxleR) / 2 + 0.2],
      rotation: ALONG_Z,
      material: 'steel',
    },
    {
      component: 'air.muffler',
      shape: { kind: 'cylinder', radius: 0.09, height: 0.42 },
      position: [0.16, underfloorY, l.zTail - 0.42],
      rotation: ALONG_Z,
      material: 'steel',
      explode: [0.3, -0.4, 0.6],
    },
    {
      component: 'air.pcv_valve',
      shape: { kind: 'cylinder', radius: 0.014, height: 0.05 },
      position: [ex - 0.05, ey + 0.31, ez + 0.05],
      material: 'plastic_black',
    },
  ];
}

export function buildFuel(l: Layout): PartDef[] {
  const [ex, ey, ez] = l.engineBay;
  const count = CYLINDERS(l);
  const longitudinal = l.g.engineLayout === 'longitudinal';
  const railZ = longitudinal ? ez : ez - 0.14;
  const tankZ = l.zAxleR - 0.55;
  const underfloorY = l.g.groundClearance + 0.04;

  const injectors = Array.from({ length: count }, (_, i): PartDef => {
    const base = cylinderPos(l, i, count, ey + 0.27);
    const pos: Vec3 = longitudinal ? [base[0] - 0.07, base[1], base[2]] : [base[0], base[1], base[2] - 0.09];
    return {
      component: 'fuel.injector',
      variant: `c${i + 1}`,
      instanceLabel: `Cylinder ${i + 1}`,
      shape: { kind: 'cylinder', radius: 0.011, height: 0.08 },
      position: pos,
      material: 'plastic_black',
      explode: [0, 0.9, -0.3],
    };
  });

  return [
    {
      component: 'fuel.tank',
      shape: { kind: 'box', size: [l.g.width * 0.6, 0.22, 0.7] },
      position: [0, underfloorY + 0.11, tankZ],
      material: 'plastic_black',
      explode: [0, -0.9, 0],
    },
    {
      component: 'fuel.in_tank_pump',
      shape: { kind: 'cylinder', radius: 0.045, height: 0.16 },
      position: [0.1, underfloorY + 0.12, tankZ],
      material: 'plastic_black',
      explode: [0, 0.9, 0],
    },
    {
      component: 'fuel.fuel_filter',
      shape: { kind: 'cylinder', radius: 0.03, height: 0.1 },
      position: [0.22, underfloorY + 0.1, tankZ + 0.3],
      material: 'plastic_black',
    },
    {
      component: 'fuel.fuel_line',
      shape: { kind: 'cylinder', radius: 0.008, height: Math.abs(tankZ - l.zFirewall) + 0.4 },
      position: [0.3, underfloorY, (tankZ + l.zFirewall) / 2 - 0.2],
      rotation: ALONG_Z,
      material: 'steel',
    },
    {
      component: 'fuel.filler_neck',
      shape: { kind: 'cylinder', radius: 0.024, height: 0.34 },
      position: [l.halfWidth - 0.1, underfloorY + 0.3, tankZ + 0.15],
      rotation: [0, 0, -0.45],
      material: 'rubber',
    },
    {
      component: 'fuel.fuel_rail',
      shape: { kind: 'cylinder', radius: 0.014, height: bankLength(count) },
      position: [ex, ey + 0.27, railZ],
      rotation: bankAxis(l),
      material: 'steel',
      explode: [0, 1.0, -0.3],
    },
    ...injectors,
    {
      component: 'fuel.hp_pump',
      shape: { kind: 'cylinder', radius: 0.045, height: 0.1 },
      position: [ex - 0.2, ey + 0.24, ez + 0.02],
      rotation: bankAxis(l),
      material: 'aluminium',
    },
    {
      component: 'fuel.evap_canister',
      shape: { kind: 'box', size: [0.16, 0.12, 0.14] },
      position: [-0.3, underfloorY + 0.06, tankZ + 0.42],
      material: 'plastic_black',
    },
    {
      component: 'fuel.dpf',
      shape: { kind: 'cylinder', radius: 0.07, height: 0.3 },
      position: [0.1, l.g.groundClearance - 0.02, l.zFirewall + 0.6],
      rotation: ALONG_Z,
      material: 'chrome',
    },
    {
      component: 'fuel.scr_tank',
      shape: { kind: 'box', size: [0.24, 0.16, 0.24] },
      position: [-0.3, underfloorY + 0.08, l.zAxleR - 1.1],
      material: 'plastic_black',
    },
  ];
}
