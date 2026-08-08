import { clamp, clamp01 } from './engine';

export const radiatorFlowFraction = (tempC: number): number => clamp01((tempC - 82) / 12);

export const fanDuty = (tempC: number, acOn: boolean): number =>
  Math.max(acOn ? 0.5 : 0, clamp01((tempC - 100) / 8));

export interface ThermalConfig {
  ambientC: number;

  massKjPerK: number;

  maxHeatKw: number;

  radiatorKwPerK: number;

  ambientKwPerK: number;
}

export const DEFAULT_THERMAL: ThermalConfig = {
  ambientC: 32,
  massKjPerK: 95,
  maxHeatKw: 55,
  radiatorKwPerK: 0.55,
  ambientKwPerK: 0.035,
};

export interface ThermalInputs {
  load: number;

  speedKph: number;
  acOn: boolean;

  heaterOn: boolean;
  engineRunning: boolean;
}

export interface ThermalState {
  coolantTempC: number;
  radiatorFraction: number;
  fan: number;
  thermostatOpen: boolean;
}

export function stepThermal(
  tempC: number,
  inputs: ThermalInputs,
  dt: number,
  cfg: ThermalConfig = DEFAULT_THERMAL,
): ThermalState {
  const fraction = radiatorFlowFraction(tempC);
  const fan = fanDuty(tempC, inputs.acOn);
  const deltaT = Math.max(0, tempC - cfg.ambientC);

  const heatInKw = inputs.engineRunning ? cfg.maxHeatKw * (0.12 + 0.88 * clamp01(inputs.load)) : 0;

  const airflow = clamp01(inputs.speedKph / 80) * 0.75 + fan * 0.6;
  const radiatorKw = cfg.radiatorKwPerK * deltaT * fraction * clamp(airflow, 0.08, 1.4);
  const ambientKw = cfg.ambientKwPerK * deltaT;
  const heaterKw = inputs.heaterOn ? clamp(deltaT * 0.06, 0, 4.5) : 0;

  const netKw = heatInKw - radiatorKw - ambientKw - heaterKw;
  const next = tempC + (netKw * dt) / cfg.massKjPerK;

  return {
    coolantTempC: clamp(next, cfg.ambientC, 135),
    radiatorFraction: fraction,
    fan,
    thermostatOpen: fraction > 0.01,
  };
}

export function refrigerantTempC(phase: number, compressorOn: boolean, ambientC = 32): number {
  if (!compressorOn) return ambientC;

  const hot = ambientC + 45;
  const cold = 3;
  return phase < 0.5 ? hot - (hot - ambientC - 8) * (phase / 0.5) : ambientC - (ambientC - cold) * ((phase - 0.5) / 0.5);
}

export function stepRotorTempC(tempC: number, brakePowerKw: number, speedKph: number, dt: number, ambientC = 32): number {
  const heat = brakePowerKw * 0.9;
  const cooling = (0.02 + 0.0016 * speedKph) * (tempC - ambientC);
  return clamp(tempC + (heat - cooling) * dt, ambientC, 700);
}
