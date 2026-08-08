import { clamp, clamp01 } from './engine';

export const DEFAULT_PLANETARY_K = 2.6;

export const mg1Speed = (engineRpm: number, mg2Rpm: number, k = DEFAULT_PLANETARY_K): number =>
  ((1 + k) * engineRpm - mg2Rpm) / k;

export const mg2SpeedFromVehicle = (speedKph: number, ratio = 7.7, wheelRadiusM = 0.32): number => {
  const wheelRadPerS = (speedKph / 3.6) / wheelRadiusM;
  return (wheelRadPerS * ratio * 60) / (Math.PI * 2);
};

export type HybridMode = 'ev' | 'engine_assist' | 'charging' | 'regen' | 'engine_only';

export interface HybridState {
  engineRpm: number;
  mg1Rpm: number;
  mg2Rpm: number;
  mode: HybridMode;

  batteryKw: number;
}

export interface HybridInputs {
  throttle: number;
  braking: number;
  speedKph: number;
  soc: number;

  socFloor?: number;
}

export function stepHybrid(inputs: HybridInputs, cfg: { idleRpm: number; maxRpm: number }): HybridState {
  const { throttle, braking, speedKph, soc } = inputs;
  const socFloor = inputs.socFloor ?? 0.25;
  const mg2Rpm = mg2SpeedFromVehicle(speedKph);

  let mode: HybridMode;
  if (braking > 0.02) mode = 'regen';
  else if (soc < socFloor) mode = 'charging';
  else if (throttle < 0.18 && speedKph < 60) mode = 'ev';
  else if (throttle > 0.7) mode = 'engine_assist';
  else mode = 'engine_only';

  const demand = clamp01(throttle * 0.85 + (mode === 'charging' ? 0.3 : 0));
  const engineRpm = mode === 'ev' || mode === 'regen' ? 0 : clamp(1200 + demand * (cfg.maxRpm - 1200) * 0.75, cfg.idleRpm, cfg.maxRpm);

  const mg1Rpm = engineRpm > 0 ? mg1Speed(engineRpm, mg2Rpm) : -mg2Rpm / DEFAULT_PLANETARY_K;

  const batteryKw =
    mode === 'regen'
      ? -clamp(braking * 45 * clamp01(speedKph / 40), 0, 50)
      : mode === 'charging'
        ? -12
        : mode === 'ev'
          ? clamp(throttle * 40, 1, 60)
          : clamp(throttle * 25 - 6, -15, 60);

  return { engineRpm, mg1Rpm, mg2Rpm, mode, batteryKw };
}
