import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildVehicle } from '@/scene/procedural/buildVehicle';
import { getGeometry } from '@/scene/geometry';
import { J_BELT, J_CENTER, J_EDGE, RING, bodyProfile, ringPoint, sectionPoint } from '@/scene/procedural/bodySurface';
import { ARCHETYPES } from '@/domain/registry';
import { allowedHalfWidth, partCorners } from '@/scene/procedural/fitBody';
import type { ArchetypeId } from '@/domain/types';

const ARCHETYPE_IDS = Object.keys(ARCHETYPES) as ArchetypeId[];

const shellOf = (archetype: ArchetypeId) => {
  const parts = buildVehicle({ archetype, powertrain: archetype === 'bev_skateboard' ? 'bev' : 'na_petrol' }).parts;
  const panel = parts.find((p) => p.shape.kind === 'body')!;
  if (panel.shape.kind !== 'body') throw new Error('body shell expected');
  return { parts, params: panel.shape.params };
};

describe('body shell', () => {
  it.each(ARCHETYPE_IDS)('tucks the greenhouse inside the shoulders on a %s', (archetype) => {
    const { params } = shellOf(archetype);
    const at = bodyProfile(params);
    const mid = at((params.zScreenTop + params.zRoofEnd) / 2);

    expect(mid.top).toBeCloseTo(params.roofY, 1);
    expect(mid.edgeWidth).toBeLessThan(mid.beltWidth * 0.92);
    expect(mid.belt).toBeLessThan(mid.edgeY - 0.2);
  });

  it.each(ARCHETYPE_IDS)('cuts a wheel arch over each axle on a %s', (archetype) => {
    const { params } = shellOf(archetype);
    const at = bodyProfile(params);
    for (const axle of [params.zAxleF, params.zAxleR]) {
      expect(at(axle).bottom).toBeGreaterThan(params.hubY + params.archRadius * 0.85);
      expect(at(axle).bottom).toBeLessThan(at(axle).belt);
    }
  });

  it('rounds the corners in plan', () => {
    const { params } = shellOf('cuv_b');
    const at = bodyProfile(params);
    expect(at(params.zNose).width).toBeLessThan(params.halfWidth * 0.75);
    expect(at((params.zAxleF + params.zAxleR) / 2).width).toBeCloseTo(params.halfWidth, 2);
  });

  it('builds a closed, mirrored section', () => {
    const { params } = shellOf('sedan_c');
    const station = bodyProfile(params)(0);
    expect(ringPoint(station, J_CENTER)[0]).toBe(0);
    for (let k = 0; k < J_CENTER; k += 1) {
      const [x, y] = ringPoint(station, k);
      const [mx, my] = ringPoint(station, RING - 1 - k);
      expect(mx).toBeCloseTo(-x, 10);
      expect(my).toBeCloseTo(y, 10);
    }
    expect(sectionPoint(station, J_BELT)[1]).toBeCloseTo(station.belt, 10);
    expect(sectionPoint(station, J_EDGE)[1]).toBeCloseTo(station.edgeY, 10);
  });

  it('faces every panel outward', () => {
    const { parts, params } = shellOf('sedan_c');
    const at = bodyProfile(params);
    for (const part of parts.filter((p) => p.shape.kind === 'body')) {
      const geometry = getGeometry(part.shape);
      const position = geometry.getAttribute('position');
      const normal = geometry.getAttribute('normal');
      expect(position.count, part.nodeId).toBeGreaterThan(0);

      let outward = 0;
      for (let i = 0; i < position.count; i += 1) {
        const p = new THREE.Vector3().fromBufferAttribute(position, i);
        const n = new THREE.Vector3().fromBufferAttribute(normal, i);
        const station = at(p.z);
        const z = Math.min(params.zTail - 0.3, Math.max(params.zNose + 0.3, p.z));
        const core = new THREE.Vector3(0, (station.bottom + station.top) / 2, z);
        if (n.dot(p.sub(core)) > 0) outward += 1;
      }
      expect(outward / position.count, part.nodeId).toBeGreaterThan(0.9);
    }
  });

  it('leaves the bed open on a pickup and closes the boot on a sedan', () => {
    const variants = (archetype: ArchetypeId) =>
      shellOf(archetype).parts.filter((p) => p.componentId === 'structure.body_panel').map((p) => p.nodeId.split('__')[2]);
    expect(variants('pickup')).not.toContain('deck');
    expect(variants('pickup')).toContain('tailgate');
    expect(variants('sedan_c')).toContain('deck');
  });

  const OUTSIDE = /body_panel|glazing|headlight|taillight|road_wheel|wheel_hub|exhaust_tip|charge_port|filler|ladder_frame|unibody_floor|bed_floor/;

  it.each(ARCHETYPE_IDS)('keeps every internal part under the skin of a %s', (archetype) => {
    const { parts, params } = shellOf(archetype);
    const at = bodyProfile(params);
    const breaches: string[] = [];

    for (const part of parts) {
      if (OUTSIDE.test(part.componentId)) continue;
      for (const c of partCorners(part)) {
        const station = at(Math.min(params.zTail, Math.max(params.zNose, c.z)));
        const allowed = allowedHalfWidth(station, c.y);
        const over = c.y > station.top ? c.y - station.top : allowed === null ? 0 : Math.abs(c.x) - allowed;
        if (over > 0.02) {
          breaches.push(`${part.nodeId} by ${over.toFixed(3)} m`);
          break;
        }
      }
    }
    expect(breaches).toEqual([]);
  });
});

