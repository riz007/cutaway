import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ENGINE,
  pistonTravel,
  pistonY,
  stepCrankAngle,
  stepRpm,
  strokeAt,
  valveState,
  TWO_PI,
} from '@/sim/engine';
import { mg1Speed, stepHybrid } from '@/sim/hybrid';
import { DEFAULT_EV, motorTorqueNm, stepSoc } from '@/sim/ev';
import { fanDuty, radiatorFlowFraction, stepThermal } from '@/sim/thermal';
import { brakeState, regenSplit } from '@/sim/hydraulic';
import { stepElectrical } from '@/sim/electrical';
import { AUTOMATIC_6SPEED, differentialSpeeds, totalRatio, vehicleSpeedKph } from '@/sim/drivetrain';
import { step } from '@/sim/tick';
import { INITIAL_INPUTS, type SimState } from '@/sim/simStore';

describe('slider-crank geometry', () => {
  const { crankThrow: r, rodLength: l } = DEFAULT_ENGINE;

  it('puts the piston at top dead centre at 0 and bottom at pi', () => {
    expect(pistonY(0, r, l)).toBeCloseTo(r + l, 6);
    expect(pistonY(Math.PI, r, l)).toBeCloseTo(l - r, 6);
  });

  it('is past half stroke at 90 degrees — the asymmetry is the lesson', () => {
    const travel = pistonTravel(Math.PI / 2, DEFAULT_ENGINE);
    expect(travel).toBeLessThan(0.5);
    expect(travel).toBeGreaterThan(0.4);
  });

  it('is symmetric about top dead centre', () => {
    expect(pistonY(0.7, r, l)).toBeCloseTo(pistonY(-0.7, r, l), 10);
  });
});

describe('four-stroke phasing', () => {
  it('assigns the four strokes across two revolutions', () => {
    expect(strokeAt(0.1)).toBe('intake');
    expect(strokeAt(Math.PI + 0.1)).toBe('compression');
    expect(strokeAt(2 * Math.PI + 0.1)).toBe('power');
    expect(strokeAt(3 * Math.PI + 0.1)).toBe('exhaust');
  });

  it('opens each valve once per 720 degree cycle', () => {
    const openIntake: number[] = [];
    for (let a = 0; a < 2 * TWO_PI; a += 0.02) {
      if (valveState(a).intake > 0.5) openIntake.push(a);
    }

    const gaps = openIntake.filter((a, i) => i > 0 && a - openIntake[i - 1]! > 0.05);
    expect(gaps).toHaveLength(0);
    expect(openIntake.length).toBeGreaterThan(0);
  });

  it('never has both valves fully open at once', () => {
    for (let a = 0; a < 2 * TWO_PI; a += 0.01) {
      const { intake, exhaust } = valveState(a);
      expect(Math.min(intake, exhaust)).toBeLessThan(0.75);
    }
  });
});

describe('engine speed', () => {
  it('idles with a closed throttle and rises toward the limit when opened', () => {
    let rpm = 0;
    for (let i = 0; i < 600; i += 1) rpm = stepRpm(rpm, 0, 1 / 60, DEFAULT_ENGINE);
    expect(rpm).toBeCloseTo(DEFAULT_ENGINE.idleRpm, 0);

    for (let i = 0; i < 600; i += 1) rpm = stepRpm(rpm, 1, 1 / 60, DEFAULT_ENGINE);
    expect(rpm).toBeCloseTo(DEFAULT_ENGINE.maxRpm, 0);
  });

  it('wraps the crank angle within one cycle', () => {
    let angle = 0;
    for (let i = 0; i < 1000; i += 1) angle = stepCrankAngle(angle, 6000, 1 / 60);
    expect(angle).toBeGreaterThanOrEqual(0);
    expect(angle).toBeLessThan(2 * TWO_PI);
  });
});

describe('power-split hybrid', () => {
  it('satisfies the planetary speed relation', () => {
    const k = 2.6;
    const engine = 2000;
    const mg2 = 3000;
    const mg1 = mg1Speed(engine, mg2, k);

    expect((k * mg1 + mg2) / (1 + k)).toBeCloseTo(engine, 6);
  });

  it('spins MG1 backwards when the engine is stopped and the car is moving', () => {
    expect(mg1Speed(0, 3000)).toBeLessThan(0);
  });

  it('stops the engine under light load and runs it when the pack is low', () => {
    const cfg = { idleRpm: 950, maxRpm: 5200 };
    expect(stepHybrid({ throttle: 0.05, braking: 0, speedKph: 20, soc: 0.7 }, cfg).mode).toBe('ev');
    expect(stepHybrid({ throttle: 0.05, braking: 0, speedKph: 20, soc: 0.1 }, cfg).mode).toBe('charging');
    expect(stepHybrid({ throttle: 0, braking: 0.5, speedKph: 60, soc: 0.7 }, cfg).batteryKw).toBeLessThan(0);
  });
});

describe('electric drive', () => {
  it('holds constant torque to base speed then constant power', () => {
    const low = motorTorqueNm(1000, 1, DEFAULT_EV);
    const atBase = motorTorqueNm(DEFAULT_EV.baseSpeedRpm, 1, DEFAULT_EV);
    const high = motorTorqueNm(DEFAULT_EV.baseSpeedRpm * 2, 1, DEFAULT_EV);
    expect(low).toBeCloseTo(atBase, 3);
    expect(high).toBeCloseTo(atBase / 2, 1);
  });

  it('discharges under load and recharges under regeneration', () => {
    expect(stepSoc(0.5, 60, 60, DEFAULT_EV)).toBeLessThan(0.5);
    expect(stepSoc(0.5, -60, 60, DEFAULT_EV)).toBeGreaterThan(0.5);
  });

  it('clamps state of charge to the physical range', () => {
    expect(stepSoc(0.02, 500, 60, DEFAULT_EV)).toBe(0);
    expect(stepSoc(0.99, -500, 60, DEFAULT_EV)).toBe(1);
  });
});

describe('thermostat and cooling', () => {
  it('is shut when cold and fully open when hot', () => {
    expect(radiatorFlowFraction(60)).toBe(0);
    expect(radiatorFlowFraction(82)).toBe(0);
    expect(radiatorFlowFraction(88)).toBeCloseTo(0.5, 1);
    expect(radiatorFlowFraction(96)).toBe(1);
  });

  it('runs the fan for the air conditioning even when cool', () => {
    expect(fanDuty(70, false)).toBe(0);
    expect(fanDuty(70, true)).toBeGreaterThan(0);
  });

  it('warms up from cold and then stabilises below boiling', () => {
    let temp = 32;
    for (let i = 0; i < 60 * 60 * 15; i += 1) {
      temp = stepThermal(temp, { load: 0.4, speedKph: 60, acOn: false, heaterOn: false, engineRunning: true }, 1 / 60)
        .coolantTempC;
    }
    expect(temp).toBeGreaterThan(85);
    expect(temp).toBeLessThan(115);
  });

  it('does not warm up at all with the engine off', () => {
    const next = stepThermal(32, { load: 0, speedKph: 0, acOn: false, heaterOn: false, engineRunning: false }, 1);
    expect(next.coolantTempC).toBeCloseTo(32, 5);
  });
});

describe('brake hydraulics', () => {
  it('produces no pressure with the pedal released', () => {
    expect(brakeState(0).linePressureBar).toBe(0);
  });

  it('rises monotonically with pedal travel', () => {
    let previous = -1;
    for (let p = 0; p <= 1; p += 0.05) {
      const pressure = brakeState(p).linePressureBar;
      expect(pressure).toBeGreaterThanOrEqual(previous);
      previous = pressure;
    }
  });

  it('needs far more pedal for the same pressure without the booster', () => {
    const boosted = brakeState(0.3, undefined, true).linePressureBar;
    const unboosted = brakeState(0.3, undefined, false).linePressureBar;
    expect(unboosted).toBeLessThan(boosted / 3);
  });

  it('biases braking to the front axle', () => {
    const state = brakeState(0.6);
    expect(state.torqueFrontNm).toBeGreaterThan(state.torqueRearNm);
  });
});

describe('regenerative blending', () => {
  it('falls back to friction at a standstill', () => {
    expect(regenSplit(0.5, 0, 0.5).regenFraction).toBe(0);
    expect(regenSplit(0.5, 0, 0.5).frictionFraction).toBe(1);
  });

  it('falls back to friction with a full pack', () => {
    expect(regenSplit(0.5, 60, 1).regenFraction).toBe(0);
  });

  it('uses the motor at speed with headroom in the pack', () => {
    expect(regenSplit(0.4, 60, 0.5).regenFraction).toBeGreaterThan(0.3);
  });
});

describe('12 V network', () => {
  const base = { headlightsOn: false, acOn: false, blowerOn: false, chargeSourceA: 95 };

  it('draws nothing with the ignition off', () => {
    expect(stepElectrical({ ...base, ignition: 'off', engineRunning: false }).totalLoadA).toBe(0);
  });

  it('energises more circuits at each ignition position', () => {
    const accessory = stepElectrical({ ...base, ignition: 'accessory', engineRunning: false }).totalLoadA;
    const on = stepElectrical({ ...base, ignition: 'on', engineRunning: true }).totalLoadA;
    const crank = stepElectrical({ ...base, ignition: 'crank', engineRunning: false }).totalLoadA;
    expect(on).toBeGreaterThan(accessory);
    expect(crank).toBeGreaterThan(on);
  });

  it('sags the system voltage while cranking and charges once running', () => {
    const cranking = stepElectrical({ ...base, ignition: 'crank', engineRunning: false });
    const running = stepElectrical({ ...base, ignition: 'on', engineRunning: true });
    expect(cranking.systemVoltage).toBeLessThan(11);
    expect(running.charging).toBe(true);
    expect(running.systemVoltage).toBeGreaterThan(13.5);
  });
});

describe('driveline', () => {
  it('gives a lower road speed in a lower gear at the same engine speed', () => {
    const first = vehicleSpeedKph(3000, totalRatio(AUTOMATIC_6SPEED, 0, 'D', 'H2'), 0.35);
    const sixth = vehicleSpeedKph(3000, totalRatio(AUTOMATIC_6SPEED, 5, 'D', 'H2'), 0.35);
    expect(first).toBeLessThan(sixth);
  });

  it('multiplies the ratio in low range', () => {
    expect(totalRatio(AUTOMATIC_6SPEED, 0, 'D', 'L4')).toBeGreaterThan(totalRatio(AUTOMATIC_6SPEED, 0, 'D', 'H4'));
  });

  it('keeps the mean wheel speed fixed while the differential splits it', () => {
    const { inner, outer } = differentialSpeeds(500, 0.3, 1.55, 2.7);
    expect(outer).toBeGreaterThan(inner);
    expect((inner + outer) / 2).toBeCloseTo(500, 6);
  });

  it('turns both wheels equally when travelling straight', () => {
    const { inner, outer } = differentialSpeeds(500, 0, 1.55, 2.7);
    expect(inner).toBe(500);
    expect(outer).toBe(500);
  });
});

describe('fixed-step tick', () => {
  const makeState = (overrides: Partial<SimState> = {}): SimState =>
    ({
      ...INITIAL_INPUTS,
      powertrain: 'na_petrol',
      timeS: 0,
      engineRpm: 0,
      crankAngle: 0,
      gearIndex: 0,
      vehicleSpeedKph: 0,
      load: 0,
      coolantTempC: 32,
      radiatorFraction: 0,
      thermostatOpen: false,
      fanDuty: 0,
      oilPressureBar: 0,
      linePressureBar: 0,
      caliperTravelMm: 0,
      brakeTorqueFrontNm: 0,
      rotorTempC: 32,
      regenFraction: 0,
      soc: 0.62,
      packKw: 0,
      packCurrentA: 0,
      mg1Rpm: 0,
      mg2Rpm: 0,
      hybridMode: null,
      systemVoltage: 12.6,
      batteryNetA: 0,
      total12vLoadA: 0,
      energisedComponents: new Set<string>(),
      flowPhase: 0,
      flowRates: {},
      ...overrides,
    }) as SimState;

  it('is deterministic for the same inputs', () => {
    const a = makeState({ ignition: 'on', throttle: 0.5, gearSelector: 'D', engineRpm: 800 });
    const b = makeState({ ignition: 'on', throttle: 0.5, gearSelector: 'D', engineRpm: 800 });
    for (let i = 0; i < 240; i += 1) {
      step(a, 1 / 60);
      step(b, 1 / 60);
    }
    expect(a.engineRpm).toBe(b.engineRpm);
    expect(a.coolantTempC).toBe(b.coolantTempC);
    expect(a.vehicleSpeedKph).toBe(b.vehicleSpeedKph);
  });

  it('builds oil pressure only once the engine is turning', () => {
    const s = makeState({ ignition: 'on', throttle: 0.4, engineRpm: 800 });
    for (let i = 0; i < 120; i += 1) step(s, 1 / 60);
    expect(s.oilPressureBar).toBeGreaterThan(0.5);

    const off = makeState({ ignition: 'off' });
    for (let i = 0; i < 120; i += 1) step(off, 1 / 60);
    expect(off.oilPressureBar).toBe(0);
  });

  it('gives a battery-electric car no engine speed and a live pack', () => {
    const s = makeState({ powertrain: 'bev', ignition: 'on', throttle: 0.6, gearSelector: 'D' });
    for (let i = 0; i < 120; i += 1) step(s, 1 / 60);
    expect(s.engineRpm).toBe(0);
    expect(s.packKw).toBeGreaterThan(0);
    expect(s.soc).toBeLessThan(0.62);
    expect(s.flowRates.exhaust).toBe(0);
  });

  it('stops the car when the brake is applied', () => {
    const s = makeState({ ignition: 'on', throttle: 0.5, gearSelector: 'D', vehicleSpeedKph: 60 });
    for (let i = 0; i < 60; i += 1) step(s, 1 / 60);
    const rolling = s.vehicleSpeedKph;
    s.throttle = 0;
    s.brake = 1;
    for (let i = 0; i < 300; i += 1) step(s, 1 / 60);
    expect(s.vehicleSpeedKph).toBeLessThan(rolling);
    expect(s.rotorTempC).toBeGreaterThan(32);
  });
});
