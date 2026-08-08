import { clamp } from './engine';

export type GearSelector = 'P' | 'R' | 'N' | 'D' | 'L';
export type TransferRange = 'H2' | 'H4' | 'L4';

export interface DrivetrainConfig {
  gears: number[];
  reverse: number;
  finalDrive: number;

  lowRangeRatio: number;
  wheelRadiusM: number;
}

export const AUTOMATIC_6SPEED: DrivetrainConfig = {
  gears: [3.6, 2.09, 1.49, 1.0, 0.76, 0.63],
  reverse: 3.33,
  finalDrive: 3.58,
  lowRangeRatio: 2.57,
  wheelRadiusM: 0.35,
};

export const EV_SINGLE_SPEED: DrivetrainConfig = {
  gears: [1],
  reverse: 1,
  finalDrive: 9.0,
  lowRangeRatio: 1,
  wheelRadiusM: 0.34,
};

export const CVT_EQUIVALENT: DrivetrainConfig = {
  gears: [2.48, 1.8, 1.3, 0.95, 0.7, 0.5],
  reverse: 2.4,
  finalDrive: 5.7,
  lowRangeRatio: 1,
  wheelRadiusM: 0.33,
};

export function totalRatio(cfg: DrivetrainConfig, gearIndex: number, selector: GearSelector, range: TransferRange): number {
  const base = selector === 'R' ? cfg.reverse : (cfg.gears[clamp(gearIndex, 0, cfg.gears.length - 1)] ?? 1);
  const low = range === 'L4' ? cfg.lowRangeRatio : 1;
  return base * cfg.finalDrive * low;
}

export function vehicleSpeedKph(inputRpm: number, ratio: number, wheelRadiusM: number): number {
  const wheelRpm = inputRpm / Math.max(ratio, 0.001);
  return (wheelRpm / 60) * 2 * Math.PI * wheelRadiusM * 3.6;
}

export function inputRpmForSpeed(speedKph: number, ratio: number, wheelRadiusM: number): number {
  const wheelRpm = ((speedKph / 3.6) / (2 * Math.PI * wheelRadiusM)) * 60;
  return wheelRpm * ratio;
}

export function selectGear(current: number, engineRpm: number, throttle: number, cfg: DrivetrainConfig): number {
  const upshiftRpm = 2200 + throttle * 3600;
  const downshiftRpm = 1200 + throttle * 1400;
  if (engineRpm > upshiftRpm && current < cfg.gears.length - 1) return current + 1;
  if (engineRpm < downshiftRpm && current > 0) return current - 1;
  return current;
}

export function differentialSpeeds(
  axleRpm: number,
  steeringAngleRad: number,
  trackM: number,
  wheelbaseM: number,
): { inner: number; outer: number; radiusM: number } {
  if (Math.abs(steeringAngleRad) < 1e-4) return { inner: axleRpm, outer: axleRpm, radiusM: Infinity };
  const radiusM = wheelbaseM / Math.tan(Math.abs(steeringAngleRad));
  const ratio = (radiusM + trackM / 2) / Math.max(radiusM - trackM / 2, 0.1);
  const inner = (2 * axleRpm) / (1 + ratio);
  return { inner, outer: inner * ratio, radiusM };
}

export function converterSlip(pumpRpm: number, turbineRpm: number): number {
  if (pumpRpm < 1) return 0;
  return clamp(1 - turbineRpm / pumpRpm, 0, 1);
}

export const converterTorqueRatio = (slip: number) => 1 + slip * 1.1;
