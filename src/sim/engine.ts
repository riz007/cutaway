export const TWO_PI = Math.PI * 2;

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const clamp01 = (v: number) => clamp(v, 0, 1);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const pistonY = (theta: number, r: number, l: number): number =>
  r * Math.cos(theta) + Math.sqrt(l * l - (r * Math.sin(theta)) ** 2);

export function firingOffsets(cylinders: number): number[] {
  return Array.from({ length: cylinders }, (_, i) => (i * 2 * TWO_PI) / cylinders);
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
