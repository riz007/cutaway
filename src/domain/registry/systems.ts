import type { SystemId, FlowMedium } from '../types';

export interface SystemMeta {
  id: SystemId;

  labelKey: string;

  color: string;

  glyph: string;

  eager: boolean;
}

export const SYSTEMS: Record<SystemId, SystemMeta> = {
  powertrain: { id: 'powertrain', labelKey: 'system.powertrain', color: '#f97316', glyph: '⚙', eager: false },
  air: { id: 'air', labelKey: 'system.air', color: '#38bdf8', glyph: '≋', eager: false },
  fuel: { id: 'fuel', labelKey: 'system.fuel', color: '#eab308', glyph: '⛽', eager: false },
  lubrication: { id: 'lubrication', labelKey: 'system.lubrication', color: '#a16207', glyph: '◉', eager: false },
  cooling: { id: 'cooling', labelKey: 'system.cooling', color: '#22d3ee', glyph: '❄', eager: false },
  drivetrain: { id: 'drivetrain', labelKey: 'system.drivetrain', color: '#c084fc', glyph: '⛓', eager: false },
  braking: { id: 'braking', labelKey: 'system.braking', color: '#ef4444', glyph: '⬤', eager: false },
  chassis_hydraulics: {
    id: 'chassis_hydraulics',
    labelKey: 'system.chassis_hydraulics',
    color: '#fb7185',
    glyph: '⇅',
    eager: false,
  },
  suspension_steering: {
    id: 'suspension_steering',
    labelKey: 'system.suspension_steering',
    color: '#34d399',
    glyph: '⌇',
    eager: true,
  },
  electrical: { id: 'electrical', labelKey: 'system.electrical', color: '#facc15', glyph: '⚡', eager: false },
  hvac: { id: 'hvac', labelKey: 'system.hvac', color: '#818cf8', glyph: '❅', eager: false },
  structure: { id: 'structure', labelKey: 'system.structure', color: '#94a3b8', glyph: '▤', eager: true },
  safety_adas: { id: 'safety_adas', labelKey: 'system.safety_adas', color: '#f472b6', glyph: '◈', eager: false },
  interior: { id: 'interior', labelKey: 'system.interior', color: '#d6d3d1', glyph: '▭', eager: true },
};

export const SYSTEM_IDS = Object.keys(SYSTEMS) as SystemId[];

export const MEDIUM_COLORS: Record<FlowMedium, string> = {
  coolant: '#22d3ee',
  oil: '#b45309',
  fuel: '#eab308',
  air_intake: '#7dd3fc',
  exhaust: '#78716c',
  brake_fluid: '#ef4444',
  refrigerant: '#818cf8',
  current_12v: '#facc15',
  current_hv: '#f97316',
};

export const MEDIUM_LABEL_KEYS: Record<FlowMedium, string> = {
  coolant: 'medium.coolant',
  oil: 'medium.oil',
  fuel: 'medium.fuel',
  air_intake: 'medium.air_intake',
  exhaust: 'medium.exhaust',
  brake_fluid: 'medium.brake_fluid',
  refrigerant: 'medium.refrigerant',
  current_12v: 'medium.current_12v',
  current_hv: 'medium.current_hv',
};
