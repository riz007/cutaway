import { clamp } from './engine';

export type IgnitionPosition = 'off' | 'accessory' | 'on' | 'crank';

const POSITION_RANK: Record<IgnitionPosition, number> = { off: 0, accessory: 1, on: 2, crank: 3 };

export interface ElectricalLoad {
  id: string;

  componentId: string;
  labelKey: string;

  from: IgnitionPosition;

  amps: number;

  optional?: 'headlights' | 'ac' | 'blower';
}

export const LOADS: ElectricalLoad[] = [
  { id: 'ecu_body', componentId: 'electrical.ecu_body', labelKey: 'load.ecu_body', from: 'accessory', amps: 1.2 },
  { id: 'infotainment', componentId: 'interior.infotainment', labelKey: 'load.infotainment', from: 'accessory', amps: 4.5 },
  { id: 'cluster', componentId: 'interior.instrument_cluster', labelKey: 'load.cluster', from: 'on', amps: 1.8 },
  { id: 'ecu_engine', componentId: 'electrical.ecu_engine', labelKey: 'load.ecu_engine', from: 'on', amps: 3.5 },
  { id: 'fuel_pump', componentId: 'fuel.in_tank_pump', labelKey: 'load.fuel_pump', from: 'on', amps: 6.5 },
  { id: 'coils', componentId: 'electrical.ignition_coil', labelKey: 'load.coils', from: 'on', amps: 5.0 },
  { id: 'cooling_fan', componentId: 'cooling.cooling_fan', labelKey: 'load.cooling_fan', from: 'on', amps: 18, optional: 'ac' },
  { id: 'blower', componentId: 'hvac.blower', labelKey: 'load.blower', from: 'accessory', amps: 12, optional: 'blower' },
  { id: 'headlights', componentId: 'electrical.headlight', labelKey: 'load.headlights', from: 'accessory', amps: 9, optional: 'headlights' },
  { id: 'starter', componentId: 'electrical.starter_motor', labelKey: 'load.starter', from: 'crank', amps: 180 },
];

export interface ElectricalInputs {
  ignition: IgnitionPosition;
  headlightsOn: boolean;
  acOn: boolean;
  blowerOn: boolean;
  engineRunning: boolean;

  chargeSourceA: number;
}

export interface ElectricalState {
  active: ElectricalLoad[];
  totalLoadA: number;

  batteryNetA: number;
  systemVoltage: number;
  charging: boolean;
}

export function stepElectrical(inputs: ElectricalInputs): ElectricalState {
  const rank = POSITION_RANK[inputs.ignition];

  const active = LOADS.filter((load) => {
    if (POSITION_RANK[load.from] > rank) return false;

    if (load.id === 'starter' && inputs.ignition !== 'crank') return false;
    if (load.optional === 'headlights' && !inputs.headlightsOn) return false;
    if (load.optional === 'ac' && !inputs.acOn) return false;
    if (load.optional === 'blower' && !inputs.blowerOn) return false;

    if ((load.id === 'coils' || load.id === 'fuel_pump') && !inputs.engineRunning && inputs.ignition !== 'crank') {
      return false;
    }
    return true;
  });

  const totalLoadA = active.reduce((sum, l) => sum + l.amps, 0);
  const supplyA = inputs.engineRunning ? inputs.chargeSourceA : 0;
  const batteryNetA = supplyA - totalLoadA;

  const systemVoltage = inputs.engineRunning
    ? clamp(14.4 - Math.max(0, -batteryNetA) * 0.006, 12.6, 14.6)
    : clamp(12.6 - totalLoadA * 0.008, 9.5, 12.7);

  return { active, totalLoadA, batteryNetA, systemVoltage, charging: batteryNetA > 0 };
}

export function isEnergised(state: ElectricalState, componentId: string): boolean {
  return state.active.some((l) => l.componentId === componentId);
}
