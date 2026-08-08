export type SystemId =
  | 'powertrain'
  | 'fuel'
  | 'lubrication'
  | 'cooling'
  | 'air'
  | 'braking'
  | 'chassis_hydraulics'
  | 'electrical'
  | 'hvac'
  | 'drivetrain'
  | 'suspension_steering'
  | 'structure'
  | 'safety_adas'
  | 'interior';

export type ArchetypeId =
  | 'hatch_b'
  | 'sedan_c'
  | 'cuv_b'
  | 'suv_c'
  | 'pickup'
  | 'ppv'
  | 'mpv_van'
  | 'bev_skateboard';

export type PowertrainId =
  | 'na_petrol'
  | 'turbo_petrol'
  | 'turbo_diesel'
  | 'hev_series_parallel'
  | 'phev_dmi'
  | 'erev'
  | 'bev';

export type Drivetrain = 'FWD' | 'RWD' | 'AWD' | '4WD_part_time';

export type Vec3 = [number, number, number];

export interface SourceRef {
  label: string;
  url?: string;

  retrieved?: string;

  kind: 'manufacturer' | 'independent' | 'class_typical';
}

export interface SpecSheet {
  displacementCc?: number;
  cylinders?: number;
  powerKw?: number;
  torqueNm?: number;
  batteryKwh?: number;
  transmission?: string;
  fuelTankL?: number;
  coolantL?: number;
  engineOilL?: number;

  brakeFront?: string;
  brakeRear?: string;
  suspensionFront?: string;
  suspensionRear?: string;
  sources: SourceRef[];
}

export type SceneOverride =
  | { kind: 'hide'; nodeId: string }
  | { kind: 'show'; nodeId: string }
  | { kind: 'swapVariant'; slot: string; variantId: string }
  | { kind: 'scale'; nodeId: string; factor: Vec3 }
  | { kind: 'relabel'; componentId: string; label: string };

export interface Trim {
  id: string;
  name: string;
  powertrain: PowertrainId;
  drivetrain: Drivetrain;
  specs: SpecSheet;

  overrides: SceneOverride[];
}

export interface VehicleDimensions {
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  wheelbaseMm: number;
  groundClearanceMm?: number;

  wheelDiameterMm?: number;
  source: SourceRef;
}

export interface Vehicle {
  id: string;
  brand: string;

  brandAliases?: string[];
  model: string;
  bodyStyle: string;
  archetype: ArchetypeId;
  trims: Trim[];

  disclaimerLevel: 'representative' | 'model_specific';

  verificationNote?: string;

  dimensions?: VehicleDimensions;
}

export type Hazard = 'high_voltage' | 'hot_surface' | 'pressurised' | 'pyrotechnic';

export interface FailureMode {
  symptom: string;
  cause: string;
  severity: 'advisory' | 'degraded' | 'immobilising' | 'safety_critical';
}

export interface Component {
  id: string;

  nodeId: string;
  system: SystemId;
  label: string;

  shortDescription: string;

  contentSlug: string;

  relatedTo: string[];

  appliesTo?: {
    archetypes?: readonly ArchetypeId[];
    powertrains?: readonly PowertrainId[];
  };
  failureModes?: FailureMode[];
  serviceIntervalKm?: number;
  hazard?: Hazard;
}

export type FlowMedium =
  | 'coolant'
  | 'oil'
  | 'fuel'
  | 'air_intake'
  | 'exhaust'
  | 'brake_fluid'
  | 'refrigerant'
  | 'current_12v'
  | 'current_hv';

export interface FlowPath {
  id: string;
  system: SystemId;

  points: Vec3[];
  medium: FlowMedium;
  direction: 'forward' | 'reverse' | 'bidirectional';

  temperatureRamp?: [number, number];

  appliesTo?: {
    archetypes?: readonly ArchetypeId[];
    powertrains?: readonly PowertrainId[];
  };
  radius?: number;
}

export interface Archetype {
  id: ArchetypeId;
  label: string;
  description: string;

  powertrains: PowertrainId[];
  geometry: ArchetypeGeometry;
}

export interface ArchetypeGeometry {
  length: number;
  width: number;
  height: number;
  wheelbase: number;
  track: number;
  groundClearance: number;
  wheelRadius: number;
  wheelWidth: number;

  frontOverhang: number;
  bodyOnFrame: boolean;
  engineLayout: 'transverse' | 'longitudinal' | 'none';
  frontSuspension: 'macpherson' | 'double_wishbone';
  rearSuspension: 'torsion_beam' | 'multilink' | 'leaf' | 'coil_live_axle';
  cabinRows: 2 | 3;

  hasBed: boolean;
}
