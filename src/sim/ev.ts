import { clamp, clamp01 } from './engine';

export interface EvConfig {
  packKwh: number;

  peakKw: number;

  regenKw: number;

  baseSpeedRpm: number;
  maxRpm: number;
}

export const DEFAULT_EV: EvConfig = {
  packKwh: 60,
  peakKw: 150,
  regenKw: 70,
  baseSpeedRpm: 4500,
  maxRpm: 16000,
};

export function motorTorqueNm(rpm: number, demand: number, cfg: EvConfig): number {
  const peakTorque = (cfg.peakKw * 1000 * 60) / (2 * Math.PI * cfg.baseSpeedRpm);
  if (rpm <= cfg.baseSpeedRpm) return peakTorque * clamp(demand, -1, 1);
  const constantPowerTorque = (cfg.peakKw * 1000 * 60) / (2 * Math.PI * Math.max(rpm, 1));
  return constantPowerTorque * clamp(demand, -1, 1);
}

export const shaftKw = (torqueNm: number, rpm: number) => (torqueNm * rpm * 2 * Math.PI) / 60 / 1000;

export function stepSoc(soc: number, netKw: number, dt: number, cfg: EvConfig, efficiency = 0.92): number {
  const drawKw = netKw >= 0 ? netKw / efficiency : netKw * efficiency;
  const deltaKwh = (drawKw * dt) / 3600;
  return clamp01(soc - deltaKwh / cfg.packKwh);
}

export const rangeKm = (soc: number, cfg: EvConfig, kwhPer100km = 16) => (soc * cfg.packKwh * 100) / kwhPer100km;

export const packCurrentA = (kw: number, packVoltage = 400) => (kw * 1000) / packVoltage;
