export const TWO_PI = Math.PI * 2;

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const clamp01 = (v: number) => clamp(v, 0, 1);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const pistonY = (theta: number, r: number, l: number): number =>
  r * Math.cos(theta) + Math.sqrt(l * l - (r * Math.sin(theta)) ** 2);

const FIRING_ORDER: Record<number, number[]> = {
  3: [0, 1, 2],
  4: [0, 2, 3, 1],
};

export function firingOrder(cylinders: number): number[] {
  return FIRING_ORDER[cylinders] ?? Array.from({ length: cylinders }, (_, i) => i);
}

// How far behind cylinder 1 a cylinder runs through the 720° cycle. For an
// inline four firing 1-3-4-2 this puts crank pins 1 and 4 together, 2 and 3
// together, exactly as on a real flat-plane crank.
export function cylinderPhase(index: number, cylinders: number): number {
  const slot = Math.max(0, firingOrder(cylinders).indexOf(index));
  return -(slot * 2 * TWO_PI) / cylinders;
}

export function firingOffsets(cylinders: number): number[] {
  return Array.from({ length: cylinders }, (_, i) => cylinderPhase(i, cylinders));
}

export function cylinderCycleAngle(crankAngle: number, index: number, cylinders: number): number {
  const cycle = 2 * TWO_PI;
  return (((crankAngle + cylinderPhase(index, cylinders)) % cycle) + cycle) % cycle;
}

export interface CrankKinematics {
  pistonHeight: number;
  pinUp: number;
  pinAcross: number;
  rodAngle: number;
}

// Slider-crank geometry in the plane of one cylinder: heights are measured up
// the bore from the crank axis, `across` is perpendicular to both bore and
// crank, and the rod angle is its lean away from the bore axis.
export function crankKinematics(cycleAngle: number, r: number, l: number): CrankKinematics {
  const sin = Math.sin(cycleAngle);
  const cos = Math.cos(cycleAngle);
  const rise = Math.sqrt(l * l - (r * sin) ** 2);
  return {
    pistonHeight: r * cos + rise,
    pinUp: r * cos,
    pinAcross: -r * sin,
    rodAngle: Math.atan2(r * sin, rise),
  };
}

export type StrokeName = 'intake' | 'compression' | 'power' | 'exhaust';

export function strokeAt(cycleAngle: number): StrokeName {
  const a = ((cycleAngle % (2 * TWO_PI)) + 2 * TWO_PI) % (2 * TWO_PI);
  if (a < Math.PI) return 'intake';
  if (a < TWO_PI) return 'compression';
  if (a < 3 * Math.PI) return 'power';
  return 'exhaust';
}

export function valveLift(cycleAngle: number, centre: number, duration: number): number {
  const cycle = 2 * TWO_PI;
  let delta = ((cycleAngle - centre) % cycle + cycle + cycle / 2) % cycle - cycle / 2;
  delta = Math.abs(delta);
  if (delta > duration / 2) return 0;
  return 0.5 * (1 + Math.cos((delta / (duration / 2)) * Math.PI));
}

export interface EngineConfig {
  idleRpm: number;
  maxRpm: number;
  cylinders: number;

  crankThrow: number;
  rodLength: number;

  responseRpmPerS: number;
}

export const DEFAULT_ENGINE: EngineConfig = {
  idleRpm: 750,
  maxRpm: 6200,
  cylinders: 4,
  crankThrow: 0.043,
  rodLength: 0.14,
  responseRpmPerS: 5200,
};

export function stepRpm(currentRpm: number, throttle: number, dt: number, cfg: EngineConfig, load = 0.35): number {
  const target = lerp(cfg.idleRpm, cfg.maxRpm, clamp01(throttle) ** 0.8);
  const rate = cfg.responseRpmPerS * (target > currentRpm ? 1 - load * 0.5 : 1.4);
  const delta = clamp(target - currentRpm, -rate * dt, rate * dt);
  return clamp(currentRpm + delta, 0, cfg.maxRpm);
}

export function stepCrankAngle(angle: number, rpm: number, dt: number): number {
  const radPerSecond = (rpm / 60) * TWO_PI;
  return (angle + radPerSecond * dt) % (2 * TWO_PI);
}

export function pistonTravel(cycleAngle: number, cfg: EngineConfig): number {
  const y = pistonY(cycleAngle, cfg.crankThrow, cfg.rodLength);
  const yTop = cfg.crankThrow + cfg.rodLength;
  const yBottom = cfg.rodLength - cfg.crankThrow;
  return clamp01((y - yBottom) / (yTop - yBottom));
}

export function valveState(cycleAngle: number): { intake: number; exhaust: number } {
  return {
    intake: valveLift(cycleAngle, Math.PI * 0.5, Math.PI * 1.15),
    exhaust: valveLift(cycleAngle, Math.PI * 3.5, Math.PI * 1.15),
  };
}
