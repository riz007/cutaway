import { create } from 'zustand';
import type { PowertrainId } from '@/domain/types';
import type { IgnitionPosition } from './electrical';
import type { GearSelector, TransferRange } from './drivetrain';
import type { HybridMode } from './hybrid';

export interface SimInputs {
  throttle: number;

  brake: number;
  ignition: IgnitionPosition;
  gearSelector: GearSelector;
  transferRange: TransferRange;

  steeringAngle: number;
  acOn: boolean;
  heaterOn: boolean;
  headlightsOn: boolean;
  blowerOn: boolean;

  playing: boolean;
  speedMultiplier: number;
}

export interface SimOutputs {
  powertrain: PowertrainId;
  timeS: number;

  engineRpm: number;
  crankAngle: number;
  gearIndex: number;
  vehicleSpeedKph: number;
  load: number;

  coolantTempC: number;
  radiatorFraction: number;
  thermostatOpen: boolean;
  fanDuty: number;
  oilPressureBar: number;

  linePressureBar: number;
  caliperTravelMm: number;
  brakeTorqueFrontNm: number;
  rotorTempC: number;
  regenFraction: number;

  soc: number;
  packKw: number;
  packCurrentA: number;
  mg1Rpm: number;
  mg2Rpm: number;
  hybridMode: HybridMode | null;

  systemVoltage: number;
  batteryNetA: number;
  total12vLoadA: number;
  energisedComponents: Set<string>;

  flowPhase: number;

  flowRates: Record<string, number>;
}

export type SimState = SimInputs & SimOutputs;

export const INITIAL_INPUTS: SimInputs = {
  throttle: 0,
  brake: 0,
  ignition: 'off',
  gearSelector: 'P',
  transferRange: 'H2',
  steeringAngle: 0,
  acOn: false,
  heaterOn: false,
  headlightsOn: false,
  blowerOn: false,
  playing: false,
  speedMultiplier: 1,
};

const initialOutputs = (powertrain: PowertrainId): SimOutputs => ({
  powertrain,
  timeS: 0,
  engineRpm: 0,
  crankAngle: 0,
  gearIndex: 0,
  vehicleSpeedKph: 0,
  load: 0,
  coolantTempC: 32,
  radiatorFraction: 0,
  thermostatOpen: false,
  fanDuty: 0,
  oilPressureBar: 0,
  linePressureBar: 0,
  caliperTravelMm: 0,
  brakeTorqueFrontNm: 0,
  rotorTempC: 32,
  regenFraction: 0,
  soc: 0.62,
  packKw: 0,
  packCurrentA: 0,
  mg1Rpm: 0,
  mg2Rpm: 0,
  hybridMode: null,
  systemVoltage: 12.6,
  batteryNetA: 0,
  total12vLoadA: 0,
  energisedComponents: new Set<string>(),
  flowPhase: 0,
  flowRates: {},
});

const state: SimState = { ...INITIAL_INPUTS, ...initialOutputs('na_petrol') };

export const useSimStore = {
  getState: (): SimState => state,
  setInputs(patch: Partial<SimInputs>): void {
    Object.assign(state, patch);
  },

  reset(powertrain: PowertrainId): void {
    Object.assign(state, INITIAL_INPUTS, initialOutputs(powertrain));
  },
};

export interface Readouts {
  engineRpm: number;
  vehicleSpeedKph: number;
  coolantTempC: number;
  oilPressureBar: number;
  linePressureBar: number;
  rotorTempC: number;
  soc: number;
  packKw: number;
  systemVoltage: number;
  batteryNetA: number;
  total12vLoadA: number;
  gearIndex: number;
  thermostatOpen: boolean;
  fanDuty: number;
  regenFraction: number;
  hybridMode: HybridMode | null;
  timeS: number;
}

export const READOUT_HZ = 10;

export const useSimReadouts = create<Readouts>(() => ({
  engineRpm: 0,
  vehicleSpeedKph: 0,
  coolantTempC: 32,
  oilPressureBar: 0,
  linePressureBar: 0,
  rotorTempC: 32,
  soc: 0.62,
  packKw: 0,
  systemVoltage: 12.6,
  batteryNetA: 0,
  total12vLoadA: 0,
  gearIndex: 0,
  thermostatOpen: false,
  fanDuty: 0,
  regenFraction: 0,
  hybridMode: null,
  timeS: 0,
}));

export function publishReadouts(s: SimState): void {
  useSimReadouts.setState({
    engineRpm: s.engineRpm,
    vehicleSpeedKph: s.vehicleSpeedKph,
    coolantTempC: s.coolantTempC,
    oilPressureBar: s.oilPressureBar,
    linePressureBar: s.linePressureBar,
    rotorTempC: s.rotorTempC,
    soc: s.soc,
    packKw: s.packKw,
    systemVoltage: s.systemVoltage,
    batteryNetA: s.batteryNetA,
    total12vLoadA: s.total12vLoadA,
    gearIndex: s.gearIndex,
    thermostatOpen: s.thermostatOpen,
    fanDuty: s.fanDuty,
    regenFraction: s.regenFraction,
    hybridMode: s.hybridMode,
    timeS: s.timeS,
  });
}
