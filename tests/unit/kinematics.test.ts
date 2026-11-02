import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildVehicle } from '@/scene/procedural/buildVehicle';
import { applyMotion, planFor, type FrameContext } from '@/scene/animation';
import type { PartInstance } from '@/scene/procedural/types';
import { INITIAL_INPUTS, type SimState } from '@/sim/simStore';
import {
  DEFAULT_ENGINE,
  TWO_PI,
  crankKinematics,
  cylinderCycleAngle,
  firingOrder,
  strokeAt,
  valveState,
} from '@/sim/engine';
import { activeStage, countSeparated, partProgress, stageOf, staggerOf } from '@/scene/explodeStages';

const sim = { ...INITIAL_INPUTS, crankAngle: 0, caliperTravelMm: 0, fanDuty: 0 } as unknown as SimState;
const ctx = (crankAngle: number, cylinders: number, explode = 0): FrameContext => ({
  sim: { ...sim, crankAngle },
  explode,
  time: 0,
  cylinders,
  wheelAngle: 0,
});

function posed(part: PartInstance, frame: FrameContext): THREE.Object3D {
  const object = new THREE.Object3D();
  applyMotion(object, planFor(part), frame);
  object.updateMatrixWorld(true);
  return object;
}

function variantOf(part: PartInstance): number {
  return Number(/__c(\d+)__/.exec(part.nodeId)?.[1] ?? 0) - 1;
}

const ENGINES = [
  { name: 'transverse four', config: { archetype: 'sedan_c', powertrain: 'na_petrol' } as const, cylinders: 4 },
  { name: 'transverse three', config: { archetype: 'cuv_b', powertrain: 'hev_series_parallel' } as const, cylinders: 3 },
  { name: 'longitudinal four', config: { archetype: 'pickup', powertrain: 'turbo_diesel' } as const, cylinders: 4 },
];

describe('engine mechanism', () => {
  it.each(ENGINES)('connects every rod to its crank pin and piston on a $name', ({ config, cylinders }) => {
    const parts = buildVehicle(config).parts;
    const crank = parts.find((p) => p.componentId === 'powertrain.crankshaft')!;
    if (crank.shape.kind !== 'crankshaft') throw new Error('crankshaft shape expected');
    const throws = crank.shape.throws;

    const rods = parts.filter((p) => p.componentId === 'powertrain.connecting_rod');
    const pistons = parts.filter((p) => p.componentId === 'powertrain.piston');
    expect(rods).toHaveLength(cylinders);

    const half = DEFAULT_ENGINE.rodLength / 2;
    const up = new THREE.Vector3();

    for (let angle = 0; angle < 2 * TWO_PI; angle += 0.37) {
      const frame = ctx(angle, cylinders);
      const crankObject = posed(crank, frame);

      for (const rod of rods) {
        const i = variantOf(rod);
        const throwDef = throws[i]!;
        const pin = new THREE.Vector3(
          DEFAULT_ENGINE.crankThrow * Math.cos(throwDef.angle),
          throwDef.station,
          -DEFAULT_ENGINE.crankThrow * Math.sin(throwDef.angle),
        ).applyMatrix4(crankObject.matrixWorld);

        const rodObject = posed(rod, frame);
        up.set(0, 1, 0).applyQuaternion(rodObject.quaternion);
        const bottom = rodObject.position.clone().addScaledVector(up, -half);
        const top = rodObject.position.clone().addScaledVector(up, half);

        const piston = posed(pistons.find((p) => variantOf(p) === i)!, frame);
        const pistonPin = piston.position.clone().setY(piston.position.y - 0.012);

        expect(bottom.distanceTo(pin), `rod ${i + 1} at ${angle.toFixed(2)} rad`).toBeLessThan(1e-6);
        expect(top.distanceTo(pistonPin), `rod ${i + 1} at ${angle.toFixed(2)} rad`).toBeLessThan(1e-6);
      }
    }
  });

  it('fires an inline four 1-3-4-2 with pins 1 and 4 paired', () => {
    expect(firingOrder(4)).toEqual([0, 2, 3, 1]);

    const pinUp = (i: number, crank: number) =>
      crankKinematics(cylinderCycleAngle(crank, i, 4), DEFAULT_ENGINE.crankThrow, DEFAULT_ENGINE.rodLength).pinUp;
    for (let crank = 0; crank < TWO_PI; crank += 0.5) {
      expect(pinUp(0, crank)).toBeCloseTo(pinUp(3, crank), 10);
      expect(pinUp(1, crank)).toBeCloseTo(pinUp(2, crank), 10);
    }

    const powerStarts = [0, 1, 2, 3].map((i) => {
      for (let crank = 0; crank < 2 * TWO_PI; crank += 0.01) {
        if (strokeAt(cylinderCycleAngle(crank, i, 4)) === 'power') return crank;
      }
      return Infinity;
    });
    const sequence = [0, 1, 2, 3].sort((a, b) => powerStarts[a]! - powerStarts[b]!).map((i) => i + 1);
    const fromFirst = [...sequence.slice(sequence.indexOf(1)), ...sequence.slice(0, sequence.indexOf(1))];
    expect(fromFirst).toEqual([1, 3, 4, 2]);
  });

  it('spaces a three-cylinder crank at 120 degrees', () => {
    const angles = [0, 1, 2].map((i) => cylinderCycleAngle(0, i, 3) % TWO_PI).sort((a, b) => a - b);
    expect(angles[1]! - angles[0]!).toBeCloseTo(TWO_PI / 3, 10);
    expect(angles[2]! - angles[1]!).toBeCloseTo(TWO_PI / 3, 10);
  });

  it('points each intake lobe straight at its valve at peak lift', () => {
    const parts = buildVehicle({ archetype: 'sedan_c', powertrain: 'na_petrol' }).parts;
    const cam = parts.find((p) => p.componentId === 'powertrain.camshaft_intake')!;
    if (cam.shape.kind !== 'camshaft') throw new Error('camshaft shape expected');

    for (let i = 0; i < 4; i += 1) {
      let peakCrank = 0;
      let best = -1;
      for (let crank = 0; crank < 2 * TWO_PI; crank += 0.002) {
        const lift = valveState(cylinderCycleAngle(crank, i, 4)).intake;
        if (lift > best) {
          best = lift;
          peakCrank = crank;
        }
      }

      const camObject = posed(cam, ctx(peakCrank, 4));
      const lobe = cam.shape.lobes[i]!;
      const direction = new THREE.Vector3(Math.cos(lobe.angle), 0, -Math.sin(lobe.angle))
        .applyQuaternion(camObject.quaternion)
        .normalize();
      expect(direction.y, `cylinder ${i + 1}`).toBeLessThan(-0.99);
    }
  });
});

describe('staged explode', () => {
  const parts = buildVehicle({ archetype: 'cuv_b', powertrain: 'na_petrol' }).parts;

  it('assigns the outer shell first and the structure last', () => {
    const stage = (id: string) => stageOf(parts.find((p) => p.componentId === id)!);
    expect(stage('structure.body_panel')).toBe(0);
    expect(stage('interior.seat_front')).toBe(1);
    expect(stage('powertrain.engine_block')).toBe(2);
    expect(stage('structure.unibody_floor')).toBe(3);
  });

  it('is fully assembled at zero and fully separated at one', () => {
    for (const part of parts) {
      expect(partProgress(0, stageOf(part), staggerOf(part.nodeId))).toBe(0);
      expect(partProgress(1, stageOf(part), staggerOf(part.nodeId))).toBe(1);
    }
    expect(countSeparated(parts, 0)).toBe(0);
    expect(countSeparated(parts, 1)).toBe(parts.length);
  });

  it('separates monotonically, outer layers first', () => {
    let previous = 0;
    for (let e = 0; e <= 1.0001; e += 0.02) {
      const count = countSeparated(parts, e);
      expect(count).toBeGreaterThanOrEqual(previous);
      previous = count;
    }

    const body = parts.find((p) => p.componentId === 'structure.body_panel')!;
    const floor = parts.find((p) => p.componentId === 'structure.unibody_floor')!;
    expect(partProgress(0.3, stageOf(body), staggerOf(body.nodeId))).toBeGreaterThan(
      partProgress(0.3, stageOf(floor), staggerOf(floor.nodeId)),
    );
  });

  it('reports the layer that is visibly in motion', () => {
    expect(activeStage(0.1)).toBe(0);
    expect(activeStage(0.35)).toBe(1);
    expect(activeStage(0.6)).toBe(2);
    expect(activeStage(0.85)).toBe(3);
  });

  it('carries outer panels further than the structure', () => {
    const flank = parts.find((p) => p.nodeId.includes('flank_r'))!;
    const object = posed(flank, ctx(0, 4, 1));
    const travelled = object.position.distanceTo(new THREE.Vector3(...flank.position));
    expect(travelled).toBeGreaterThan(Math.hypot(...flank.explode) * 1.5);
  });
});
