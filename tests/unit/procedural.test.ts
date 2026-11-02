import { describe, expect, it } from 'vitest';
import { ARCHETYPES, ARCHETYPE_IDS, COMPONENTS_BY_NODE, VEHICLES_BY_ID } from '@/domain/registry';
import { buildVehicle } from '@/scene/procedural/buildVehicle';
import { buildFlows } from '@/scene/procedural/buildFlows';
import { advanceWheelAngle, applyMotion, planFor } from '@/scene/animation';
import { INITIAL_INPUTS, type SimState } from '@/sim/simStore';
import * as THREE from 'three';

const CONFIGS = ARCHETYPE_IDS.flatMap((archetype) =>
  ARCHETYPES[archetype].powertrains.map((powertrain) => ({ archetype, powertrain })),
);

describe('procedural archetypes', () => {
  it.each(CONFIGS)('builds $archetype / $powertrain with unique, resolvable nodes', (config) => {
    const built = buildVehicle(config);
    expect(built.parts.length).toBeGreaterThan(100);

    const seen = new Set<string>();
    for (const part of built.parts) {
      expect(seen.has(part.nodeId), part.nodeId).toBe(false);
      seen.add(part.nodeId);
      expect(part.nodeId).toMatch(/^SYS_[a-z_]+__[a-z0-9_]+__[a-z0-9_]+__LOD\d$/);
      expect(COMPONENTS_BY_NODE.get(part.baseNodeId)?.id).toBe(part.componentId);
    }
  });

  it.each(CONFIGS)('keeps $archetype / $powertrain inside its own bounding box', (config) => {
    const built = buildVehicle(config);
    const g = ARCHETYPES[config.archetype].geometry;
    for (const part of built.parts) {
      expect(Math.abs(part.position[0])).toBeLessThanOrEqual(g.width / 2 + 0.35);
      expect(part.position[1]).toBeGreaterThan(-0.1);
      expect(part.position[1]).toBeLessThanOrEqual(g.height + 0.2);
      expect(Math.abs(part.position[2])).toBeLessThanOrEqual(g.length / 2 + 0.2);
    }
  });

  it('omits engine internals from a battery-electric build and includes the pack', () => {
    const bev = buildVehicle({ archetype: 'bev_skateboard', powertrain: 'bev' });
    const ids = new Set(bev.parts.map((p) => p.componentId));
    expect(ids.has('powertrain.piston')).toBe(false);
    expect(ids.has('fuel.tank')).toBe(false);
    expect(ids.has('air.catalytic_converter')).toBe(false);
    expect(ids.has('powertrain.hv_battery')).toBe(true);
    expect(ids.has('electrical.inverter')).toBe(true);
  });

  it('gives a pickup leaf springs and a ladder frame, and a hatchback neither', () => {
    const pickup = new Set(buildVehicle({ archetype: 'pickup', powertrain: 'turbo_diesel' }).parts.map((p) => p.componentId));
    const hatch = new Set(buildVehicle({ archetype: 'hatch_b', powertrain: 'na_petrol' }).parts.map((p) => p.componentId));

    expect(pickup.has('suspension.leaf_spring')).toBe(true);
    expect(pickup.has('structure.ladder_frame')).toBe(true);
    expect(hatch.has('suspension.leaf_spring')).toBe(false);
    expect(hatch.has('structure.unibody_floor')).toBe(true);
  });

  it('emits one instance per cylinder', () => {
    const four = buildVehicle({ archetype: 'sedan_c', powertrain: 'na_petrol' });
    const three = buildVehicle({ archetype: 'cuv_b', powertrain: 'hev_series_parallel' });
    expect(four.parts.filter((p) => p.componentId === 'powertrain.piston')).toHaveLength(4);
    expect(three.parts.filter((p) => p.componentId === 'powertrain.piston')).toHaveLength(3);
  });

  it('emits four of each corner part', () => {
    const built = buildVehicle({ archetype: 'cuv_b', powertrain: 'na_petrol' });
    for (const id of ['drivetrain.wheel_hub', 'braking.wheel_speed_sensor']) {
      expect(built.parts.filter((p) => p.componentId === id), id).toHaveLength(4);
    }

    expect(built.parts.filter((p) => p.componentId === 'drivetrain.road_wheel')).toHaveLength(8);
  });

  it('sizes the body from the model\'s published dimensions when it has them', () => {
    const yarisCross = VEHICLES_BY_ID.get('toyota-yaris-cross')!;
    const corollaCross = VEHICLES_BY_ID.get('toyota-corolla-cross')!;
    expect(yarisCross.archetype).toBe(corollaCross.archetype);

    const small = buildVehicle({
      archetype: yarisCross.archetype,
      powertrain: 'na_petrol',
      vehicleId: yarisCross.id,
      dimensions: yarisCross.dimensions,
    });
    const large = buildVehicle({
      archetype: corollaCross.archetype,
      powertrain: 'na_petrol',
      vehicleId: corollaCross.id,
      dimensions: corollaCross.dimensions,
    });

    expect(large.bounds.max[2] - large.bounds.min[2]).toBeGreaterThan(
      small.bounds.max[2] - small.bounds.min[2] + 0.2,
    );
    expect(large.bounds.max[1]).toBeGreaterThan(small.bounds.max[1]);
  });

  it('gives each platform a distinct silhouette', () => {
    const shellOf = (archetype: Parameters<typeof buildVehicle>[0]['archetype'], powertrain: never | string) => {
      const built = buildVehicle({ archetype, powertrain: powertrain as never });
      const flank = built.parts.find((p) => p.shape.kind === 'body');
      expect(flank, archetype).toBeDefined();
      if (flank!.shape.kind !== 'body') throw new Error('body shell expected');
      return flank!.shape.params;
    };

    const pickup = shellOf('pickup', 'turbo_diesel');
    const van = shellOf('mpv_van', 'na_petrol');
    const sedan = shellOf('sedan_c', 'na_petrol');

    const bonnet = (p: typeof van) => p.zBonnetEnd - p.zNose;
    expect(bonnet(pickup)).toBeGreaterThan(bonnet(van) * 1.8);
    expect(bonnet(sedan)).toBeGreaterThan(bonnet(van));
  });

  it('gives every part a non-zero explode vector', () => {
    for (const part of buildVehicle({ archetype: 'cuv_b', powertrain: 'na_petrol' }).parts) {
      const magnitude = Math.hypot(...part.explode);
      expect(magnitude, part.nodeId).toBeGreaterThan(0);
    }
  });
});

describe('flow paths', () => {
  it.each(CONFIGS)('resolves every anchor for $archetype / $powertrain', (config) => {
    const built = buildVehicle(config);
    const flows = buildFlows(built.parts, config);
    expect(flows.length).toBeGreaterThan(0);
    for (const flow of flows) {
      expect(flow.points.length).toBeGreaterThanOrEqual(2);
      for (const point of flow.points) {
        expect(point.every((n) => Number.isFinite(n))).toBe(true);
      }
    }
  });

  it('drops combustion loops on a battery-electric car and keeps the pack loop', () => {
    const config = { archetype: 'bev_skateboard', powertrain: 'bev' } as const;
    const ids = buildFlows(buildVehicle(config).parts, config).map((f) => f.id);
    expect(ids).not.toContain('air.exhaust');
    expect(ids).not.toContain('fuel.supply');
    expect(ids).toContain('cooling.pack_loop');
    expect(ids).toContain('electrical.hv_traction');
  });

  it('gives a combustion car its radiator, oil, fuel and exhaust loops', () => {
    const config = { archetype: 'sedan_c', powertrain: 'na_petrol' } as const;
    const ids = buildFlows(buildVehicle(config).parts, config).map((f) => f.id);
    for (const expected of ['cooling.radiator_loop', 'lubrication.main_circuit', 'fuel.supply', 'air.exhaust']) {
      expect(ids).toContain(expected);
    }
  });
});

describe('animation', () => {
  const sim = { ...INITIAL_INPUTS, crankAngle: 0, caliperTravelMm: 0, fanDuty: 0 } as unknown as SimState;

  it('moves a piston through a full stroke over one cycle', () => {
    const built = buildVehicle({ archetype: 'sedan_c', powertrain: 'na_petrol' });
    const piston = built.parts.find((p) => p.componentId === 'powertrain.piston')!;
    const plan = planFor(piston);
    const object = new THREE.Object3D();

    const heights: number[] = [];
    for (let angle = 0; angle < Math.PI * 4; angle += 0.05) {
      applyMotion(object, plan, { sim: { ...sim, crankAngle: angle }, explode: 0, time: 0, cylinders: 4, wheelAngle: 0 });
      heights.push(object.position.y);
    }
    const travel = Math.max(...heights) - Math.min(...heights);
    expect(travel).toBeCloseTo(0.086, 2);
  });

  it('displaces a part by its explode vector at full explode', () => {
    const built = buildVehicle({ archetype: 'cuv_b', powertrain: 'na_petrol' });
    const part = built.parts.find((p) => p.componentId === 'cooling.radiator')!;
    const plan = planFor(part);
    const object = new THREE.Object3D();

    applyMotion(object, plan, { sim, explode: 0, time: 0, cylinders: 4, wheelAngle: 0 });
    const rest = object.position.clone();
    applyMotion(object, plan, { sim, explode: 1, time: 0, cylinders: 4, wheelAngle: 0 });
    expect(object.position.distanceTo(rest)).toBeCloseTo(Math.hypot(...part.explode), 5);
  });

  it('advances the wheel angle in proportion to road speed', () => {
    const still = advanceWheelAngle(0, 0, 0.33, 1);
    const moving = advanceWheelAngle(0, 50, 0.33, 0.01);
    expect(still).toBe(0);
    expect(moving).toBeGreaterThan(0);
  });
});
