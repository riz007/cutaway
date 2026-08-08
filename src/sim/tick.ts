import type { PowertrainId } from '@/domain/types';
import { DEFAULT_ENGINE, clamp, clamp01, stepCrankAngle, stepRpm, type EngineConfig } from './engine';
import { DEFAULT_THERMAL, stepRotorTempC, stepThermal } from './thermal';
import { DEFAULT_BRAKES, brakePowerKw, brakeState, caliperTravelMm, regenSplit } from './hydraulic';
import { stepElectrical } from './electrical';
import { stepHybrid } from './hybrid';
import { DEFAULT_EV, packCurrentA, stepSoc } from './ev';
import {
  AUTOMATIC_6SPEED,
  CVT_EQUIVALENT,
  EV_SINGLE_SPEED,
  selectGear,
  totalRatio,
  vehicleSpeedKph,
  type DrivetrainConfig,
} from './drivetrain';
import { READOUT_HZ, publishReadouts, useSimStore, type SimState } from './simStore';

export const FIXED_STEP = 1 / 60;
const MAX_STEPS_PER_FRAME = 5;

const ENGINED: PowertrainId[] = ['na_petrol', 'turbo_petrol', 'turbo_diesel', 'hev_series_parallel', 'phev_dmi', 'erev'];
const HYBRID: PowertrainId[] = ['hev_series_parallel', 'phev_dmi', 'erev'];
const HAS_PACK: PowertrainId[] = ['hev_series_parallel', 'phev_dmi', 'erev', 'bev'];

function engineConfigFor(powertrain: PowertrainId): EngineConfig {
  switch (powertrain) {
    case 'turbo_diesel':
      return { ...DEFAULT_ENGINE, idleRpm: 720, maxRpm: 4200, crankThrow: 0.052, rodLength: 0.16 };
    case 'hev_series_parallel':
    case 'erev':
      return { ...DEFAULT_ENGINE, cylinders: 3, idleRpm: 950, maxRpm: 5200 };
    case 'turbo_petrol':
      return { ...DEFAULT_ENGINE, maxRpm: 6000 };
    default:
      return DEFAULT_ENGINE;
  }
}

function drivetrainConfigFor(powertrain: PowertrainId): DrivetrainConfig {
  if (powertrain === 'bev') return EV_SINGLE_SPEED;
  if (powertrain === 'turbo_diesel') return AUTOMATIC_6SPEED;
  return CVT_EQUIVALENT;
}

export function step(s: SimState, dt: number): void {
  const hasEngine = ENGINED.includes(s.powertrain);
  const isHybrid = HYBRID.includes(s.powertrain);
  const hasPack = HAS_PACK.includes(s.powertrain);
  const engineCfg = engineConfigFor(s.powertrain);
  const driveCfg = drivetrainConfigFor(s.powertrain);

  s.timeS += dt;

  const driving = s.gearSelector === 'D' || s.gearSelector === 'L' || s.gearSelector === 'R';
  const ignitionOn = s.ignition === 'on' || s.ignition === 'crank';

  if (isHybrid) {
    const hybrid = stepHybrid(
      { throttle: s.throttle, braking: s.brake, speedKph: s.vehicleSpeedKph, soc: s.soc },
      { idleRpm: engineCfg.idleRpm, maxRpm: engineCfg.maxRpm },
    );
    s.engineRpm = ignitionOn ? hybrid.engineRpm : 0;
    s.mg1Rpm = hybrid.mg1Rpm;
    s.mg2Rpm = hybrid.mg2Rpm;
    s.hybridMode = hybrid.mode;
    s.packKw = hybrid.batteryKw;
  } else if (s.powertrain === 'bev') {
    s.engineRpm = 0;
    s.hybridMode = null;
    s.mg2Rpm = (s.vehicleSpeedKph / 3.6 / driveCfg.wheelRadiusM) * driveCfg.finalDrive * (60 / (2 * Math.PI));
    s.mg1Rpm = 0;
    s.packKw = clamp(s.throttle * DEFAULT_EV.peakKw - s.brake * DEFAULT_EV.regenKw, -DEFAULT_EV.regenKw, DEFAULT_EV.peakKw);
  } else if (s.ignition === 'crank') {
    s.engineRpm = Math.min(s.engineRpm + 900 * dt, 320);
    s.hybridMode = null;
  } else if (ignitionOn) {
    s.engineRpm =
      s.engineRpm < engineCfg.idleRpm * 0.6
        ? Math.min(s.engineRpm + 2600 * dt, engineCfg.idleRpm)
        : stepRpm(s.engineRpm, s.throttle, dt, engineCfg, s.load);
    s.hybridMode = null;
  } else {
    s.engineRpm = Math.max(0, s.engineRpm - 2400 * dt);
    s.hybridMode = null;
  }

  if (hasEngine && s.engineRpm > 0) {
    s.crankAngle = stepCrankAngle(s.crankAngle, s.engineRpm, dt);
  }

  const engineRunning = s.engineRpm > 400;
  s.load = clamp01(s.throttle * 0.8 + (s.vehicleSpeedKph > 0 ? 0.15 : 0));

  if (driving) {
    if (hasEngine && !isHybrid) {
      s.gearIndex = selectGear(s.gearIndex, s.engineRpm, s.throttle, driveCfg);
      const ratio = totalRatio(driveCfg, s.gearIndex, s.gearSelector, s.transferRange);
      const target = vehicleSpeedKph(s.engineRpm, ratio, driveCfg.wheelRadiusM);
      s.vehicleSpeedKph += clamp(target - s.vehicleSpeedKph, -60 * dt, 22 * dt);
    } else {
      const target = clamp01(s.throttle) * (s.powertrain === 'bev' ? 160 : 130);
      s.vehicleSpeedKph += clamp(target - s.vehicleSpeedKph, -50 * dt, 26 * dt);
    }
  } else {
    s.vehicleSpeedKph = Math.max(0, s.vehicleSpeedKph - 14 * dt);
  }

  const boosterAvailable = engineRunning || hasPack || s.vehicleSpeedKph > 1;
  const brakes = brakeState(s.brake, DEFAULT_BRAKES, boosterAvailable);
  const split = hasPack
    ? regenSplit(s.brake, s.vehicleSpeedKph, s.soc, DEFAULT_EV.regenKw)
    : { regenFraction: 0, frictionFraction: 1, regenKw: 0 };

  s.regenFraction = split.regenFraction;
  s.linePressureBar = brakes.linePressureBar * split.frictionFraction;
  s.caliperTravelMm = caliperTravelMm(s.linePressureBar);
  s.brakeTorqueFrontNm = brakes.torqueFrontNm * split.frictionFraction;
  s.rotorTempC = stepRotorTempC(
    s.rotorTempC,
    brakePowerKw(s.brakeTorqueFrontNm, s.vehicleSpeedKph, driveCfg.wheelRadiusM),
    s.vehicleSpeedKph,
    dt,
    DEFAULT_THERMAL.ambientC,
  );
  if (s.brake > 0.02) s.vehicleSpeedKph = Math.max(0, s.vehicleSpeedKph - s.brake * 40 * dt);

  const thermal = stepThermal(
    s.coolantTempC,
    {
      load: s.load,
      speedKph: s.vehicleSpeedKph,
      acOn: s.acOn,
      heaterOn: s.heaterOn,
      engineRunning: hasEngine ? engineRunning : false,
    },
    dt,
  );
  s.coolantTempC = thermal.coolantTempC;
  s.radiatorFraction = thermal.radiatorFraction;
  s.thermostatOpen = thermal.thermostatOpen;
  s.fanDuty = thermal.fan;

  s.oilPressureBar = hasEngine
    ? clamp((s.engineRpm / 1000) * 1.15 * (1 - clamp01((s.coolantTempC - 90) / 120)), 0, 6.2)
    : 0;

  if (hasPack) {
    if (split.regenKw > 0) s.packKw = -split.regenKw;
    s.soc = stepSoc(s.soc, s.packKw, dt, DEFAULT_EV);
    s.packCurrentA = packCurrentA(s.packKw);
  } else {
    s.packKw = 0;
    s.packCurrentA = 0;
  }

  const electrical = stepElectrical({
    ignition: s.ignition,
    headlightsOn: s.headlightsOn,
    acOn: s.acOn,
    blowerOn: s.blowerOn,
    engineRunning: hasPack ? s.ignition !== 'off' : engineRunning,
    chargeSourceA: hasPack ? 120 : 95,
  });
  s.systemVoltage = electrical.systemVoltage;
  s.batteryNetA = electrical.batteryNetA;
  s.total12vLoadA = electrical.totalLoadA;
  s.energisedComponents.clear();
  for (const load of electrical.active) s.energisedComponents.add(load.componentId);

  const coolantRate = engineRunning || hasPack ? clamp01(0.25 + s.engineRpm / 4000 + (hasPack ? 0.4 : 0)) : 0;
  s.flowRates = {
    coolant: coolantRate,
    oil: hasEngine ? clamp01(s.oilPressureBar / 5) : 0,
    fuel: hasEngine && ignitionOn ? clamp01(0.3 + s.load * 0.7) : 0,
    air_intake: hasEngine ? clamp01(s.throttle * 0.8 + (engineRunning ? 0.15 : 0)) : 0,
    exhaust: hasEngine ? clamp01(s.throttle * 0.85 + (engineRunning ? 0.12 : 0)) : 0,
    brake_fluid: clamp01(s.linePressureBar / 90),
    refrigerant: s.acOn ? 0.85 : 0,
    current_12v: clamp01(s.total12vLoadA / 60),
    current_hv: hasPack ? clamp01(Math.abs(s.packKw) / 90) : 0,
  };
  s.flowPhase = (s.flowPhase + dt * 0.6) % 1;
}

export interface SimLoopHandle {
  stop: () => void;
}

export function startSimLoop(onFrameNeeded: () => void): SimLoopHandle {
  if (typeof requestAnimationFrame === 'undefined') return { stop: () => {} };

  let raf = 0;
  let last = performance.now();
  let accumulator = 0;
  let sinceReadout = 0;
  let stopped = false;

  const frame = (now: number) => {
    if (stopped) return;
    raf = requestAnimationFrame(frame);

    const s = useSimStore.getState();
    const realDt = Math.min((now - last) / 1000, 0.25);
    last = now;
    if (!s.playing) return;

    accumulator += realDt * s.speedMultiplier;
    let steps = 0;
    while (accumulator >= FIXED_STEP && steps < MAX_STEPS_PER_FRAME) {
      step(s, FIXED_STEP);
      accumulator -= FIXED_STEP;
      steps += 1;
    }
    if (steps === MAX_STEPS_PER_FRAME) accumulator = 0;

    if (steps > 0) {
      onFrameNeeded();
      sinceReadout += realDt;
      if (sinceReadout >= 1 / READOUT_HZ) {
        sinceReadout = 0;
        publishReadouts(s);
      }
    }
  };

  raf = requestAnimationFrame(frame);
  return {
    stop: () => {
      stopped = true;
      cancelAnimationFrame(raf);
    },
  };
}
