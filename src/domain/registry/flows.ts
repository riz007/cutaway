import type { FlowMedium, SystemId, Vec3, ArchetypeId, PowertrainId } from '../types';

export interface FlowAnchor {
  at: string;

  offset?: Vec3;
}

export interface FlowSpec {
  id: string;
  system: SystemId;
  medium: FlowMedium;
  direction: 'forward' | 'reverse' | 'bidirectional';
  anchors: FlowAnchor[];
  temperatureRamp?: [number, number];
  radius?: number;
  appliesTo?: { archetypes?: ArchetypeId[]; powertrains?: PowertrainId[] };

  labelKey: string;
}

const HAS_ENGINE: PowertrainId[] = [
  'na_petrol',
  'turbo_petrol',
  'turbo_diesel',
  'hev_series_parallel',
  'phev_dmi',
  'erev',
];
const ELECTRIFIED: PowertrainId[] = ['hev_series_parallel', 'phev_dmi', 'erev', 'bev'];

export const FLOW_SPECS: FlowSpec[] = [

  {
    id: 'cooling.radiator_loop',
    system: 'cooling',
    medium: 'coolant',
    direction: 'forward',
    labelKey: 'flow.cooling.radiator_loop',
    temperatureRamp: [80, 98],
    radius: 0.022,
    appliesTo: { powertrains: HAS_ENGINE },
    anchors: [
      { at: 'cooling.water_pump' },
      { at: 'cooling.water_jacket' },
      { at: 'cooling.thermostat' },
      { at: 'cooling.upper_hose' },
      { at: 'cooling.radiator', offset: [0, 0.12, 0] },
      { at: 'cooling.lower_hose' },
      { at: 'cooling.water_pump' },
    ],
  },
  {
    id: 'cooling.bypass_loop',
    system: 'cooling',
    medium: 'coolant',
    direction: 'forward',
    labelKey: 'flow.cooling.bypass_loop',
    temperatureRamp: [20, 88],
    radius: 0.018,
    appliesTo: { powertrains: HAS_ENGINE },
    anchors: [
      { at: 'cooling.water_pump' },
      { at: 'cooling.water_jacket' },
      { at: 'cooling.bypass_hose' },
      { at: 'cooling.water_pump' },
    ],
  },
  {
    id: 'cooling.heater_loop',
    system: 'cooling',
    medium: 'coolant',
    direction: 'forward',
    labelKey: 'flow.cooling.heater_loop',
    temperatureRamp: [40, 92],
    radius: 0.014,
    appliesTo: { powertrains: HAS_ENGINE },
    anchors: [
      { at: 'cooling.water_jacket' },
      { at: 'cooling.heater_core' },
      { at: 'cooling.water_pump' },
    ],
  },
  {
    id: 'cooling.pack_loop',
    system: 'cooling',
    medium: 'coolant',
    direction: 'forward',
    labelKey: 'flow.cooling.pack_loop',
    temperatureRamp: [18, 42],
    radius: 0.018,
    appliesTo: { powertrains: ELECTRIFIED },
    anchors: [
      { at: 'cooling.battery_chiller' },
      { at: 'powertrain.hv_battery', offset: [0.35, 0.04, 0] },
      { at: 'powertrain.hv_battery', offset: [-0.35, 0.04, 0] },
      { at: 'cooling.battery_chiller' },
    ],
  },

  {
    id: 'lubrication.main_circuit',
    system: 'lubrication',
    medium: 'oil',
    direction: 'forward',
    labelKey: 'flow.lubrication.main_circuit',
    radius: 0.014,
    appliesTo: { powertrains: HAS_ENGINE },
    anchors: [
      { at: 'lubrication.sump' },
      { at: 'lubrication.pickup' },
      { at: 'lubrication.oil_pump' },
      { at: 'lubrication.oil_filter' },
      { at: 'lubrication.oil_gallery' },
      { at: 'lubrication.main_bearing' },
      { at: 'lubrication.sump' },
    ],
  },

  {
    id: 'fuel.supply',
    system: 'fuel',
    medium: 'fuel',
    direction: 'forward',
    labelKey: 'flow.fuel.supply',
    radius: 0.012,
    appliesTo: { powertrains: HAS_ENGINE },
    anchors: [
      { at: 'fuel.in_tank_pump' },
      { at: 'fuel.fuel_filter' },
      { at: 'fuel.fuel_line' },
      { at: 'fuel.fuel_rail' },
      { at: 'fuel.injector' },
    ],
  },

  {
    id: 'air.intake',
    system: 'air',
    medium: 'air_intake',
    direction: 'forward',
    labelKey: 'flow.air.intake',
    radius: 0.03,
    appliesTo: { powertrains: HAS_ENGINE },
    anchors: [
      { at: 'air.airbox' },
      { at: 'air.air_filter' },
      { at: 'air.maf_sensor' },
      { at: 'air.throttle_body' },
      { at: 'air.intake_manifold' },
      { at: 'powertrain.valve_intake' },
    ],
  },
  {
    id: 'air.exhaust',
    system: 'air',
    medium: 'exhaust',
    direction: 'forward',
    labelKey: 'flow.air.exhaust',
    radius: 0.03,
    temperatureRamp: [700, 180],
    appliesTo: { powertrains: HAS_ENGINE },
    anchors: [
      { at: 'powertrain.valve_exhaust' },
      { at: 'air.exhaust_manifold' },
      { at: 'air.o2_sensor' },
      { at: 'air.catalytic_converter' },
      { at: 'air.resonator' },
      { at: 'air.muffler' },
    ],
  },

  {
    id: 'braking.front_circuit',
    system: 'braking',
    medium: 'brake_fluid',
    direction: 'forward',
    labelKey: 'flow.braking.front_circuit',
    radius: 0.01,
    anchors: [
      { at: 'braking.reservoir' },
      { at: 'braking.master_cylinder' },
      { at: 'braking.abs_modulator' },
      { at: 'braking.hard_line' },
      { at: 'braking.flex_hose' },
      { at: 'braking.caliper_front' },
    ],
  },
  {
    id: 'braking.rear_circuit',
    system: 'braking',
    medium: 'brake_fluid',
    direction: 'forward',
    labelKey: 'flow.braking.rear_circuit',
    radius: 0.01,
    anchors: [
      { at: 'braking.master_cylinder' },
      { at: 'braking.abs_modulator' },
      { at: 'braking.hard_line', offset: [0, 0, 0.4] },
      { at: 'braking.caliper_rear' },
    ],
  },

  {
    id: 'hvac.refrigerant_loop',
    system: 'hvac',
    medium: 'refrigerant',
    direction: 'forward',
    labelKey: 'flow.hvac.refrigerant_loop',
    radius: 0.014,
    temperatureRamp: [2, 75],
    anchors: [
      { at: 'hvac.compressor' },
      { at: 'hvac.condenser' },
      { at: 'hvac.receiver_drier' },
      { at: 'hvac.expansion_valve' },
      { at: 'hvac.evaporator' },
      { at: 'hvac.compressor' },
    ],
  },

  {
    id: 'electrical.charging_12v',
    system: 'electrical',
    medium: 'current_12v',
    direction: 'forward',
    labelKey: 'flow.electrical.charging_12v',
    radius: 0.01,
    appliesTo: { powertrains: ['na_petrol', 'turbo_petrol', 'turbo_diesel'] },
    anchors: [
      { at: 'electrical.alternator' },
      { at: 'electrical.fuse_box_engine' },
      { at: 'electrical.battery_12v' },
    ],
  },
  {
    id: 'electrical.starting',
    system: 'electrical',
    medium: 'current_12v',
    direction: 'forward',
    labelKey: 'flow.electrical.starting',
    radius: 0.012,
    appliesTo: { powertrains: ['na_petrol', 'turbo_petrol', 'turbo_diesel'] },
    anchors: [{ at: 'electrical.battery_12v' }, { at: 'electrical.starter_motor' }],
  },
  {
    id: 'electrical.hv_traction',
    system: 'electrical',
    medium: 'current_hv',
    direction: 'bidirectional',
    labelKey: 'flow.electrical.hv_traction',
    radius: 0.016,
    appliesTo: { powertrains: ELECTRIFIED },
    anchors: [
      { at: 'powertrain.hv_battery' },
      { at: 'electrical.contactor' },
      { at: 'electrical.hv_cable' },
      { at: 'electrical.inverter' },
    ],
  },
  {
    id: 'electrical.hv_to_12v',
    system: 'electrical',
    medium: 'current_hv',
    direction: 'forward',
    labelKey: 'flow.electrical.hv_to_12v',
    radius: 0.012,
    appliesTo: { powertrains: ELECTRIFIED },
    anchors: [
      { at: 'powertrain.hv_battery' },
      { at: 'electrical.dcdc_converter' },
      { at: 'electrical.battery_12v' },
    ],
  },
];

export const FLOW_SPECS_BY_ID: ReadonlyMap<string, FlowSpec> = new Map(FLOW_SPECS.map((f) => [f.id, f]));
