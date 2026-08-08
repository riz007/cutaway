import type { ArchetypeId, PowertrainId, SourceRef, SpecSheet } from '../types';

export const CLASS_TYPICAL: SourceRef = {
  label: 'Class-typical figure — not a manufacturer specification',
  kind: 'class_typical',
};

const BY_POWERTRAIN: Record<PowertrainId, Partial<SpecSheet>> = {
  na_petrol: {
    displacementCc: 1500,
    cylinders: 4,
    powerKw: 78,
    torqueNm: 138,
    transmission: 'CVT',
    engineOilL: 3.7,
    coolantL: 5.5,
  },
  turbo_petrol: {
    displacementCc: 1500,
    cylinders: 4,
    powerKw: 130,
    torqueNm: 240,
    transmission: 'CVT',
    engineOilL: 3.9,
    coolantL: 6.0,
  },
  turbo_diesel: {
    displacementCc: 2400,
    cylinders: 4,
    powerKw: 110,
    torqueNm: 400,
    transmission: '6-speed automatic',
    engineOilL: 7.5,
    coolantL: 9.5,
  },
  hev_series_parallel: {
    displacementCc: 1500,
    cylinders: 3,
    powerKw: 85,
    torqueNm: 185,
    batteryKwh: 0.9,
    transmission: 'e-CVT (power-split)',
    engineOilL: 3.4,
    coolantL: 6.5,
  },
  phev_dmi: {
    displacementCc: 1500,
    cylinders: 4,
    powerKw: 160,
    torqueNm: 300,
    batteryKwh: 18,
    transmission: 'Single-speed with engine clutch',
    engineOilL: 4.0,
    coolantL: 8.0,
  },
  erev: {
    displacementCc: 1500,
    cylinders: 3,
    powerKw: 130,
    torqueNm: 300,
    batteryKwh: 28,
    transmission: 'Single-speed (engine drives generator only)',
    engineOilL: 3.6,
    coolantL: 8.0,
  },
  bev: {
    powerKw: 150,
    torqueNm: 310,
    batteryKwh: 60,
    transmission: 'Single-speed reduction',
    coolantL: 9.0,
  },
};

const BY_ARCHETYPE: Record<ArchetypeId, Partial<SpecSheet>> = {
  hatch_b: {
    fuelTankL: 42,
    brakeFront: 'Ventilated disc, approx. 255 mm',
    brakeRear: 'Drum, approx. 200 mm',
    suspensionFront: 'MacPherson strut',
    suspensionRear: 'Torsion beam',
  },
  sedan_c: {
    fuelTankL: 47,
    brakeFront: 'Ventilated disc, approx. 277 mm',
    brakeRear: 'Solid disc, approx. 259 mm',
    suspensionFront: 'MacPherson strut',
    suspensionRear: 'Torsion beam',
  },
  cuv_b: {
    fuelTankL: 42,
    brakeFront: 'Ventilated disc, approx. 277 mm',
    brakeRear: 'Solid disc, approx. 259 mm',
    suspensionFront: 'MacPherson strut',
    suspensionRear: 'Torsion beam',
  },
  suv_c: {
    fuelTankL: 57,
    brakeFront: 'Ventilated disc, approx. 305 mm',
    brakeRear: 'Solid disc, approx. 300 mm',
    suspensionFront: 'MacPherson strut',
    suspensionRear: 'Multilink',
  },
  pickup: {
    fuelTankL: 80,
    brakeFront: 'Ventilated disc, approx. 320 mm',
    brakeRear: 'Drum, approx. 295 mm',
    suspensionFront: 'Double wishbone',
    suspensionRear: 'Leaf spring, live axle',
  },
  ppv: {
    fuelTankL: 80,
    brakeFront: 'Ventilated disc, approx. 320 mm',
    brakeRear: 'Solid disc, approx. 312 mm',
    suspensionFront: 'Double wishbone',
    suspensionRear: 'Coil spring, live axle',
  },
  mpv_van: {
    fuelTankL: 45,
    brakeFront: 'Ventilated disc, approx. 277 mm',
    brakeRear: 'Drum, approx. 228 mm',
    suspensionFront: 'MacPherson strut',
    suspensionRear: 'Torsion beam',
  },
  bev_skateboard: {
    brakeFront: 'Ventilated disc, approx. 300 mm',
    brakeRear: 'Solid disc, approx. 290 mm',
    suspensionFront: 'MacPherson strut',
    suspensionRear: 'Multilink',
  },
};

export function classTypicalSpecs(
  archetype: ArchetypeId,
  powertrain: PowertrainId,
  overrides: Partial<SpecSheet> = {},
): SpecSheet {
  return {
    ...BY_ARCHETYPE[archetype],
    ...BY_POWERTRAIN[powertrain],
    ...overrides,
    sources: overrides.sources ?? [CLASS_TYPICAL],
  };
}
