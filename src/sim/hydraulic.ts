import { clamp, clamp01 } from './engine';

export interface BrakeConfig {
  pedalRatio: number;

  maxPedalForceN: number;

  boosterGain: number;

  masterBoreM: number;

  caliperAreaM2: number;

  mu: number;

  effectiveRadiusM: number;

  frontBias: number;
}

export const DEFAULT_BRAKES: BrakeConfig = {
  pedalRatio: 3.8,
  maxPedalForceN: 420,
  boosterGain: 4.2,
  masterBoreM: 0.0222,
  caliperAreaM2: 0.0035,
  mu: 0.38,
  effectiveRadiusM: 0.11,
  frontBias: 0.68,
};

export interface BrakeState {
  pushrodN: number;

  linePressureBar: number;

  clampFrontN: number;
  clampRearN: number;

  torqueFrontNm: number;
  torqueRearNm: number;

  masterTravelMm: number;
}

export function brakeState(pedal: number, cfg: BrakeConfig = DEFAULT_BRAKES, boosterAvailable = true): BrakeState {
  const p = clamp01(pedal);
  const driverN = p * cfg.maxPedalForceN * cfg.pedalRatio;
  const pushrodN = driverN * (boosterAvailable ? cfg.boosterGain : 1);

  const masterArea = Math.PI * (cfg.masterBoreM / 2) ** 2;
  const pressurePa = pushrodN / masterArea;
  const linePressureBar = clamp(pressurePa / 1e5, 0, 180);

  const perCaliperN = linePressureBar * 1e5 * cfg.caliperAreaM2;
  const clampFrontN = perCaliperN * cfg.frontBias * 2;
  const clampRearN = perCaliperN * (1 - cfg.frontBias) * 2;

  const torqueFrontNm = clampFrontN * cfg.mu * 2 * cfg.effectiveRadiusM;
  const torqueRearNm = clampRearN * cfg.mu * 2 * cfg.effectiveRadiusM * 0.85;

  return {
    pushrodN,
    linePressureBar,
    clampFrontN,
    clampRearN,
    torqueFrontNm,
    torqueRearNm,
    masterTravelMm: p * 28,
  };
}

export function regenSplit(
  demand: number,
  speedKph: number,
  soc: number,
  maxRegenKw = 60,
): { regenFraction: number; frictionFraction: number; regenKw: number } {
  const speedFade = clamp01((speedKph - 5) / 15);
  const socHeadroom = clamp01((0.95 - soc) / 0.1);
  const regenFraction = clamp01(demand * 1.6) * speedFade * socHeadroom * 0.75;
  return {
    regenFraction,
    frictionFraction: clamp01(1 - regenFraction),
    regenKw: regenFraction * maxRegenKw * clamp01(demand * 2),
  };
}

export function brakePowerKw(torqueNm: number, speedKph: number, wheelRadiusM = 0.32): number {
  const wheelRadPerS = speedKph / 3.6 / wheelRadiusM;
  return (torqueNm * wheelRadPerS) / 1000;
}

export const caliperTravelMm = (linePressureBar: number) => clamp01(linePressureBar / 90) * 1.2;
