import { create } from 'zustand';
import type { ArchetypeId, PowertrainId, SystemId, VehicleDimensions } from '@/domain/types';
import { DEFAULT_TRIM_ID, DEFAULT_VEHICLE_ID, VEHICLES_BY_ID } from '@/domain/registry';
import { publishReadouts, useSimStore, type SimInputs } from '@/sim/simStore';

export type RenderMode = 'realistic' | 'schematic' | 'xray';
export type CameraPreset = 'three_quarter' | 'front' | 'side' | 'top' | 'engine_bay' | 'undercarriage' | 'interior';

export interface SectionPlane {
  id: 'x' | 'y' | 'z';
  enabled: boolean;

  offset: number;

  flipped: boolean;
}

export interface AppState {
  vehicleId: string;
  trimId: string;

  activeSystems: Set<SystemId>;
  selectedComponentId: string | null;

  selectedNodeId: string | null;
  hoveredComponentId: string | null;

  renderMode: RenderMode;

  explode: number;
  sections: SectionPlane[];
  cameraPreset: CameraPreset;

  focusedComponentId: string | null;

  simPlaying: boolean;
  simSpeed: number;
  controls: SimControls;
  cutaway: boolean;

  showFlows: boolean;
  showLabels: boolean;
  inspectorOpen: boolean;
  pickerOpen: boolean;
  activeLessonId: string | null;
  lessonStep: number;

  locale: 'en' | 'th';
  reducedMotion: boolean;

  forceFallback: boolean;
  webglAvailable: boolean;
}

export type SimControls = Pick<
  SimInputs,
  | 'throttle'
  | 'brake'
  | 'ignition'
  | 'gearSelector'
  | 'transferRange'
  | 'steeringAngle'
  | 'acOn'
  | 'heaterOn'
  | 'headlightsOn'
  | 'blowerOn'
>;

const DEFAULT_CONTROLS: SimControls = {
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
};

export interface AppActions {
  selectVehicle: (vehicleId: string, trimId?: string) => void;
  selectTrim: (trimId: string) => void;
  toggleSystem: (system: SystemId) => void;
  soloSystem: (system: SystemId) => void;
  showAllSystems: () => void;
  select: (componentId: string | null, nodeId?: string | null) => void;
  hover: (componentId: string | null) => void;
  focus: (componentId: string | null) => void;
  setRenderMode: (mode: RenderMode) => void;
  setExplode: (value: number) => void;
  setSection: (id: SectionPlane['id'], patch: Partial<SectionPlane>) => void;
  resetView: () => void;
  setCameraPreset: (preset: CameraPreset) => void;
  setPlaying: (value: boolean) => void;
  setSimSpeed: (value: number) => void;
  setControls: (patch: Partial<SimControls>) => void;
  resetSimulation: () => void;
  setCutaway: (value: boolean) => void;
  setShowFlows: (value: boolean) => void;
  setShowLabels: (value: boolean) => void;
  setInspectorOpen: (value: boolean) => void;
  setPickerOpen: (value: boolean) => void;
  startLesson: (lessonId: string) => void;
  setLessonStep: (step: number) => void;
  endLesson: () => void;
  setLocale: (locale: 'en' | 'th') => void;
  setReducedMotion: (value: boolean) => void;
  setForceFallback: (value: boolean) => void;
  setWebglAvailable: (value: boolean) => void;
}

const DEFAULT_SECTIONS: SectionPlane[] = [
  { id: 'x', enabled: false, offset: 0, flipped: false },
  { id: 'y', enabled: false, offset: 0.8, flipped: false },
  { id: 'z', enabled: false, offset: 0, flipped: false },
];

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

export const useAppStore = create<AppState & AppActions>((set, get) => ({
  vehicleId: DEFAULT_VEHICLE_ID,
  trimId: DEFAULT_TRIM_ID,
  activeSystems: new Set<SystemId>(),
  selectedComponentId: null,
  selectedNodeId: null,
  hoveredComponentId: null,
  renderMode: 'realistic',
  explode: 0,
  sections: DEFAULT_SECTIONS.map((s) => ({ ...s })),
  cameraPreset: 'three_quarter',
  focusedComponentId: null,
  simPlaying: false,
  simSpeed: 1,
  controls: { ...DEFAULT_CONTROLS },
  cutaway: false,
  showFlows: true,
  showLabels: true,
  inspectorOpen: false,
  pickerOpen: false,
  activeLessonId: null,
  lessonStep: 0,
  locale: 'en',
  reducedMotion: prefersReducedMotion(),
  forceFallback: false,
  webglAvailable: true,

  selectVehicle: (vehicleId, trimId) => {
    const vehicle = VEHICLES_BY_ID.get(vehicleId);
    if (!vehicle) return;
    const trim = vehicle.trims.find((t) => t.id === trimId) ?? vehicle.trims[0]!;
    useSimStore.reset(trim.powertrain);
    publishReadouts(useSimStore.getState());
    set({
      controls: { ...DEFAULT_CONTROLS },
      vehicleId,
      trimId: trim.id,
      selectedComponentId: null,
      selectedNodeId: null,
      focusedComponentId: null,
      inspectorOpen: false,
      pickerOpen: false,
      explode: 0,
      simPlaying: false,
    });
  },

  selectTrim: (trimId) => {
    const vehicle = VEHICLES_BY_ID.get(get().vehicleId);
    const trim = vehicle?.trims.find((t) => t.id === trimId);
    if (!trim) return;
    useSimStore.reset(trim.powertrain);
    publishReadouts(useSimStore.getState());
    set({
      trimId,
      selectedComponentId: null,
      selectedNodeId: null,
      focusedComponentId: null,
      simPlaying: false,
      controls: { ...DEFAULT_CONTROLS },
    });
  },

  toggleSystem: (system) => {
    const next = new Set(get().activeSystems);
    if (next.has(system)) next.delete(system);
    else next.add(system);
    set({ activeSystems: next });
  },

  soloSystem: (system) => set({ activeSystems: new Set([system]) }),
  showAllSystems: () => set({ activeSystems: new Set<SystemId>() }),

  select: (componentId, nodeId = null) =>
    set({ selectedComponentId: componentId, selectedNodeId: nodeId, inspectorOpen: componentId !== null }),

  hover: (componentId) => set({ hoveredComponentId: componentId }),

  focus: (componentId) =>
    set({
      focusedComponentId: componentId,
      ...(componentId ? { selectedComponentId: componentId, inspectorOpen: true } : {}),
    }),

  setRenderMode: (renderMode) => set({ renderMode }),
  setExplode: (explode) => set({ explode: Math.min(1, Math.max(0, explode)) }),

  setSection: (id, patch) =>
    set({ sections: get().sections.map((s) => (s.id === id ? { ...s, ...patch } : s)) }),

  resetView: () =>
    set({
      explode: 0,
      renderMode: 'realistic',
      sections: DEFAULT_SECTIONS.map((s) => ({ ...s })),
      cameraPreset: 'three_quarter',
      focusedComponentId: null,
      activeSystems: new Set<SystemId>(),
      cutaway: false,
    }),

  setCameraPreset: (cameraPreset) => set({ cameraPreset }),

  setPlaying: (simPlaying) => {
    const patch: Partial<SimControls> = {};

    if (simPlaying && get().controls.ignition === 'off') {
      patch.ignition = 'on';
    }

    const controls = { ...get().controls, ...patch };
    useSimStore.setInputs({ ...controls, playing: simPlaying });
    set({ simPlaying, controls, cutaway: simPlaying ? true : get().cutaway });
  },

  setControls: (patch) => {
    const controls = { ...get().controls, ...patch };
    useSimStore.setInputs(controls);
    set({ controls });
  },

  resetSimulation: () => {
    const { powertrain } = currentConfiguration(get().vehicleId, get().trimId);
    useSimStore.reset(powertrain);
    publishReadouts(useSimStore.getState());
    set({ simPlaying: false, simSpeed: 1, controls: { ...DEFAULT_CONTROLS } });
  },

  setCutaway: (cutaway) => set({ cutaway }),

  setSimSpeed: (simSpeed) => {
    useSimStore.setInputs({ speedMultiplier: simSpeed });
    set({ simSpeed });
  },

  setShowFlows: (showFlows) => set({ showFlows }),
  setShowLabels: (showLabels) => set({ showLabels }),
  setInspectorOpen: (inspectorOpen) => set({ inspectorOpen }),
  setPickerOpen: (pickerOpen) => set({ pickerOpen }),
  startLesson: (activeLessonId) => set({ activeLessonId, lessonStep: 0 }),
  setLessonStep: (lessonStep) => set({ lessonStep }),
  endLesson: () => set({ activeLessonId: null, lessonStep: 0 }),
  setLocale: (locale) => set({ locale }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setForceFallback: (forceFallback) => set({ forceFallback }),
  setWebglAvailable: (webglAvailable) => set({ webglAvailable }),
}));

function currentConfiguration(vehicleId: string, trimId: string) {
  const vehicle = VEHICLES_BY_ID.get(vehicleId) ?? VEHICLES_BY_ID.get(DEFAULT_VEHICLE_ID)!;
  const trim = vehicle.trims.find((t) => t.id === trimId) ?? vehicle.trims[0]!;
  return { vehicle, trim, powertrain: trim.powertrain };
}

export interface Configuration {
  archetype: ArchetypeId;
  powertrain: PowertrainId;
  vehicleId: string;
  dimensions?: VehicleDimensions;
}

export function useConfiguration(): Configuration {
  const vehicleId = useAppStore((s) => s.vehicleId);
  const trimId = useAppStore((s) => s.trimId);
  const vehicle = VEHICLES_BY_ID.get(vehicleId) ?? VEHICLES_BY_ID.get(DEFAULT_VEHICLE_ID)!;
  const trim = vehicle.trims.find((t) => t.id === trimId) ?? vehicle.trims[0]!;
  return {
    archetype: vehicle.archetype,
    powertrain: trim.powertrain,
    vehicleId: vehicle.id,
    ...(vehicle.dimensions ? { dimensions: vehicle.dimensions } : {}),
  };
}

export function useVehicleAndTrim() {
  const vehicleId = useAppStore((s) => s.vehicleId);
  const trimId = useAppStore((s) => s.trimId);
  const vehicle = VEHICLES_BY_ID.get(vehicleId) ?? VEHICLES_BY_ID.get(DEFAULT_VEHICLE_ID)!;
  const trim = vehicle.trims.find((t) => t.id === trimId) ?? vehicle.trims[0]!;
  return { vehicle, trim };
}
