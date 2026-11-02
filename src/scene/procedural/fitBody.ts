import * as THREE from 'three';
import type { PartInstance, Shape } from './types';
import { J_CENTER, bodyProfile, sectionPoint, type BodyParams, type Station } from './bodySurface';

const MARGIN = 0.015;

// Parts that belong on the outside of the car, or that move together as one
// mechanism and must not be nudged apart.
const FIXED_SYSTEMS = new Set(['powertrain', 'drivetrain', 'lubrication']);
const FIXED_COMPONENTS = new Set([
  'structure.body_panel',
  'structure.glazing',
  'structure.unibody_floor',
  'structure.ladder_frame',
  'electrical.headlight',
  'electrical.taillight',
]);

function halfExtents(shape: Shape): THREE.Vector3 | null {
  switch (shape.kind) {
    case 'box':
      return new THREE.Vector3(shape.size[0] / 2, shape.size[1] / 2, shape.size[2] / 2);
    case 'cylinder': {
      const r = Math.max(shape.radius, shape.radiusTop ?? shape.radius);
      return new THREE.Vector3(r, shape.height / 2, r);
    }
    case 'sphere':
      return new THREE.Vector3(shape.radius, shape.radius, shape.radius);
    case 'torus':
      return new THREE.Vector3(shape.radius + shape.tube, shape.radius + shape.tube, shape.tube);
    case 'capsule':
      return new THREE.Vector3(shape.radius, shape.length / 2 + shape.radius, shape.radius);
    default:
      return null;
  }
}

export function partCorners(part: PartInstance): THREE.Vector3[] {
  const half = halfExtents(part.shape);
  if (!half) return [];
  const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(...part.rotation));
  const centre = new THREE.Vector3(...part.position);
  const corners: THREE.Vector3[] = [];
  for (const sx of [-1, 1])
    for (const sy of [-1, 1])
      for (const sz of [-1, 1])
        corners.push(new THREE.Vector3(sx * half.x, sy * half.y, sz * half.z).applyQuaternion(rotation).add(centre));
  return corners;
}

// Inner half-width of the shell at height y, or null below the sill where the
// body is open.
export function allowedHalfWidth(station: Station, y: number): number | null {
  if (y < station.bottom) return null;
  if (y > station.top) return 0;
  let previous = sectionPoint(station, 0);
  for (let j = 1; j <= J_CENTER; j += 1) {
    const point = sectionPoint(station, j);
    if (point[1] >= y) {
      const span = point[1] - previous[1];
      const t = span < 1e-6 ? 1 : (y - previous[1]) / span;
      return previous[0] + (point[0] - previous[0]) * t;
    }
    previous = point;
  }
  return 0;
}

export function isFitted(part: PartInstance): boolean {
  return !FIXED_SYSTEMS.has(part.system) && !FIXED_COMPONENTS.has(part.componentId);
}

export function fitInsideBody(parts: PartInstance[], params: BodyParams): PartInstance[] {
  const at = bodyProfile(params);
  const stationAt = (z: number) => at(Math.min(params.zTail, Math.max(params.zNose, z)));

  return parts.map((part) => {
    if (!isFitted(part) || !halfExtents(part.shape)) return part;
    let fitted = part;

    const drop = Math.max(0, ...partCorners(fitted).map((c) => c.y - (stationAt(c.z).top - MARGIN)));
    if (drop > 0) {
      fitted = { ...fitted, position: [fitted.position[0], fitted.position[1] - drop, fitted.position[2]] };
    }

    const corners = partCorners(fitted);
    const level = Math.abs(fitted.rotation[1]) < 1e-3 && Math.abs(fitted.rotation[2]) < 1e-3;
    const centred = Math.abs(fitted.position[0]) < 0.05;

    if (centred && level && fitted.shape.kind === 'box') {
      let room = Infinity;
      for (const c of corners) {
        const allowed = allowedHalfWidth(stationAt(c.z), c.y);
        if (allowed !== null) room = Math.min(room, allowed - MARGIN - Math.abs(fitted.position[0]));
      }
      const [w, h, d] = fitted.shape.size;
      if (room < w / 2 && room > 0.02) fitted = { ...fitted, shape: { kind: 'box', size: [room * 2, h, d] } };
      return fitted;
    }

    let push = 0;
    for (const c of corners) {
      const allowed = allowedHalfWidth(stationAt(c.z), c.y);
      if (allowed !== null) push = Math.max(push, Math.abs(c.x) - (allowed - MARGIN));
    }
    if (push > 0 && !centred) {
      const sign = Math.sign(fitted.position[0]);
      fitted = { ...fitted, position: [fitted.position[0] - sign * push, fitted.position[1], fitted.position[2]] };
    }
    return fitted;
  });
}
