import type { PartDef } from '../types';
import { ALONG_X, ALONG_Z, type Layout } from '../layout';

export function buildCooling(l: Layout): PartDef[] {
  const [ex, ey, ez] = l.engineBay;
  const coolingPackZ = l.zNose + 0.4;
  const packWidth = l.g.width * 0.62;

  return [
    {
      component: 'cooling.radiator',
      shape: { kind: 'box', size: [packWidth, 0.44, 0.045] },
      position: [0, l.floorY + 0.32, coolingPackZ],
      material: 'aluminium',
      explode: [0, 0.25, -0.85],
    },
    {
      component: 'cooling.cooling_fan',
      shape: { kind: 'cylinder', radius: 0.17, height: 0.05 },
      position: [0, l.floorY + 0.32, coolingPackZ + 0.09],
      rotation: ALONG_Z,
      material: 'plastic_black',
      explode: [0, 0.2, 0.6],
    },
    {
      component: 'cooling.water_pump',
      shape: { kind: 'cylinder', radius: 0.05, height: 0.07 },
      position: [ex - 0.28, ey + 0.04, ez - 0.02],
      rotation: ALONG_X,
      material: 'aluminium',
    },
    {
      component: 'cooling.thermostat',
      shape: { kind: 'cylinder', radius: 0.035, height: 0.06 },
      position: [ex - 0.2, ey + 0.16, ez - 0.1],
      rotation: ALONG_Z,
      material: 'aluminium',
      explode: [-0.3, 0.5, -0.4],
    },
    {
      component: 'cooling.upper_hose',
      shape: { kind: 'cylinder', radius: 0.024, height: Math.abs(ez - 0.1 - coolingPackZ) },
      position: [-0.16, l.floorY + 0.46, (ez - 0.1 + coolingPackZ) / 2],
      rotation: ALONG_Z,
      material: 'rubber',
    },
    {
      component: 'cooling.lower_hose',
      shape: { kind: 'cylinder', radius: 0.026, height: Math.abs(ez - coolingPackZ) },
      position: [0.16, l.floorY + 0.16, (ez + coolingPackZ) / 2],
      rotation: ALONG_Z,
      material: 'rubber',
    },
    {
      component: 'cooling.bypass_hose',
      shape: { kind: 'cylinder', radius: 0.016, height: 0.22 },
      position: [ex - 0.26, ey + 0.1, ez - 0.06],
      rotation: [0.6, 0, 0],
      material: 'rubber',
    },
    {
      component: 'cooling.expansion_tank',
      shape: { kind: 'box', size: [0.16, 0.18, 0.14] },
      position: [-0.42, l.beltlineY - 0.14, l.zNose + 0.66],
      material: 'plastic_black',
      explode: [-0.55, 0.7, 0],
    },
    {
      component: 'cooling.water_jacket',
      shape: { kind: 'box', size: l.g.engineLayout === 'longitudinal' ? [0.3, 0.24, 0.44] : [0.44, 0.24, 0.3] },
      position: [ex, ey + 0.04, ez],
      material: 'fluid',
      explode: [0, 0.4, 0],
    },
    {
      component: 'cooling.heater_core',
      shape: { kind: 'box', size: [0.22, 0.18, 0.05] },
      position: [0.14, l.beltlineY - 0.14, l.zFirewall + 0.16],
      material: 'aluminium',
      explode: [0.5, 0.3, 0.4],
    },
    {
      component: 'cooling.egr_cooler',
      shape: { kind: 'box', size: [0.16, 0.07, 0.07] },
      position: [ex + 0.24, ey + 0.2, ez + 0.16],
      material: 'steel',
    },
    {
      component: 'cooling.battery_chiller',
      shape: { kind: 'box', size: [0.16, 0.08, 0.16] },
      position: [-0.3, l.floorY + 0.24, l.zNose + 0.75],
      material: 'aluminium',
    },
  ];
}

export function buildHvac(l: Layout): PartDef[] {
  const [ex, ey, ez] = l.engineBay;
  const dashY = l.beltlineY - 0.08;
  const caseZ = l.zFirewall + 0.28;

  return [
    {
      component: 'hvac.compressor',
      shape: { kind: 'cylinder', radius: 0.06, height: 0.14 },
      position: [ex - 0.3, ey - 0.16, ez - 0.06],
      rotation: ALONG_X,
      material: 'aluminium',
      explode: [-0.6, -0.4, 0],
    },
    {
      component: 'hvac.condenser',
      shape: { kind: 'box', size: [l.g.width * 0.58, 0.36, 0.03] },
      position: [0, l.floorY + 0.3, l.zNose + 0.32],
      material: 'aluminium',
      explode: [0, 0.2, -1.0],
    },
    {
      component: 'hvac.receiver_drier',
      shape: { kind: 'cylinder', radius: 0.035, height: 0.2 },
      position: [l.g.width * 0.3, l.floorY + 0.3, l.zNose + 0.34],
      material: 'aluminium',
    },
    {
      component: 'hvac.expansion_valve',
      shape: { kind: 'box', size: [0.05, 0.05, 0.05] },
      position: [0.06, dashY - 0.04, l.zFirewall + 0.06],
      material: 'aluminium',
    },
    {
      component: 'hvac.evaporator',
      shape: { kind: 'box', size: [0.24, 0.2, 0.05] },
      position: [-0.02, dashY - 0.06, caseZ - 0.04],
      material: 'aluminium',
      explode: [-0.4, 0.35, 0.5],
    },
    {
      component: 'hvac.blower',
      shape: { kind: 'cylinder', radius: 0.075, height: 0.09 },
      position: [-0.3, dashY - 0.08, caseZ],
      material: 'plastic_black',
      explode: [-0.7, 0.2, 0.4],
    },
    {
      component: 'hvac.cabin_filter',
      shape: { kind: 'box', size: [0.2, 0.04, 0.12] },
      position: [-0.3, dashY + 0.04, caseZ - 0.1],
      material: 'fabric',
      explode: [-0.6, 0.75, 0.2],
    },
    {
      component: 'hvac.heat_pump',
      shape: { kind: 'box', size: [0.2, 0.14, 0.16] },
      position: [0.28, l.floorY + 0.26, l.zNose + 0.72],
      material: 'aluminium',
    },
  ];
}
