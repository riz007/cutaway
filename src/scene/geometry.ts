import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three-stdlib';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';

export { acceleratedRaycast };
import type { Shape } from './procedural/types';
import {
  RING,
  bodyProfile,
  regionOf,
  ringPoint,
  stationCount,
  stationZ,
  type BodyParams,
  type Station,
} from './procedural/bodySurface';

const cache = new Map<string, THREE.BufferGeometry>();

function segmentsFor(base: number, lod: 0 | 1): number {
  return lod === 0 ? base : Math.max(8, Math.round(base / 2));
}

function keyFor(shape: Shape, lod: 0 | 1): string {
  switch (shape.kind) {
    case 'box':
      return `box:${shape.size.join(',')}:${lod}`;
    case 'cylinder':
      return `cyl:${shape.radius},${shape.height},${shape.radiusTop ?? shape.radius},${shape.segments ?? 0}:${lod}`;
    case 'sphere':
      return `sph:${shape.radius}:${lod}`;
    case 'torus':
      return `tor:${shape.radius},${shape.tube}:${lod}`;
    case 'capsule':
      return `cap:${shape.radius},${shape.length}:${lod}`;
    case 'body':
      return `body:${shape.region}:${JSON.stringify(shape.params)}:${lod}`;
    case 'tyre':
      return `tyre:${shape.radius},${shape.width},${shape.rimRadius}:${lod}`;
    case 'rim':
      return `rim:${shape.radius},${shape.width},${shape.spokes},${shape.face}:${lod}`;
    case 'crankshaft':
      return `crk:${shape.throw},${shape.span},${shape.throws.map((t) => `${t.station}_${t.angle.toFixed(4)}`).join('|')}:${lod}`;
    case 'camshaft':
      return `cam:${shape.radius},${shape.lift},${shape.span},${shape.lobes.map((t) => `${t.station}_${t.angle.toFixed(4)}`).join('|')}:${lod}`;
  }
}

// Shafts are modelled along local Y. A feature at angle `a` sits in the local
// XZ plane at (cos a, -sin a), so spinning the mesh about +Y advances it.
function radial(geometry: THREE.BufferGeometry, outward: number, angle: number, station: number): THREE.BufferGeometry {
  geometry.translate(outward, 0, 0);
  geometry.rotateY(angle);
  geometry.translate(0, station, 0);
  return geometry;
}

function crankshaftGeometry(shape: Extract<Shape, { kind: 'crankshaft' }>, lod: 0 | 1): THREE.BufferGeometry {
  const radialSegments = segmentsFor(24, lod);
  const parts: THREE.BufferGeometry[] = [
    new THREE.CylinderGeometry(shape.journalRadius, shape.journalRadius, shape.span, radialSegments),
  ];

  const webThickness = 0.011;
  const pinLength = 0.03;
  for (const { station, angle } of shape.throws) {
    const pin = new THREE.CylinderGeometry(shape.pinRadius, shape.pinRadius, pinLength, radialSegments);
    parts.push(radial(pin, shape.throw, angle, station));

    for (const side of [-1, 1]) {
      const reach = shape.throw + shape.pinRadius * 1.5;
      const web = new THREE.BoxGeometry(reach, webThickness, shape.pinRadius * 2.6);
      parts.push(radial(web, reach / 2, angle, station + side * (pinLength / 2 + webThickness / 2)));

      const counterweight = new THREE.CylinderGeometry(
        shape.throw * 1.15,
        shape.throw * 1.15,
        webThickness,
        segmentsFor(20, lod),
        1,
        false,
        Math.PI * 0.25,
        Math.PI * 0.5,
      );
      parts.push(radial(counterweight, 0, angle + Math.PI, station + side * (pinLength / 2 + webThickness / 2)));
    }
  }

  const merged = mergeGeometries(parts.map((g) => g.toNonIndexed()), false);
  for (const g of parts) g.dispose();
  merged.computeVertexNormals();
  return merged;
}

function camshaftGeometry(shape: Extract<Shape, { kind: 'camshaft' }>, lod: 0 | 1): THREE.BufferGeometry {
  const radialSegments = segmentsFor(20, lod);
  const parts: THREE.BufferGeometry[] = [
    new THREE.CylinderGeometry(shape.radius, shape.radius, shape.span, radialSegments),
  ];

  const lobeRadius = shape.radius * 1.5;
  for (const { station, angle } of shape.lobes) {
    const base = new THREE.CylinderGeometry(lobeRadius, lobeRadius, 0.016, radialSegments);
    parts.push(radial(base, shape.lift * 0.35, angle, station));
    const nose = new THREE.CylinderGeometry(lobeRadius * 0.55, lobeRadius * 0.55, 0.016, radialSegments);
    parts.push(radial(nose, shape.lift, angle, station));
  }

  const merged = mergeGeometries(parts.map((g) => g.toNonIndexed()), false);
  for (const g of parts) g.dispose();
  return merged;
}

interface BodyGrid {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  stations: number;
  ring: Station[];
}

const gridCache = new Map<string, BodyGrid>();

function bodyGrid(params: BodyParams, lod: 0 | 1): BodyGrid {
  const key = `${JSON.stringify(params)}:${lod}`;
  const cached = gridCache.get(key);
  if (cached) return cached;

  const profile = bodyProfile(params);
  const stations = stationCount(lod);
  const positions = new Float32Array(stations * RING * 3);
  const uvs = new Float32Array(stations * RING * 2);
  const ring: Station[] = [];

  for (let s = 0; s < stations; s += 1) {
    const station = profile(stationZ(params, s, stations));
    ring.push(station);
    let arc = 0;
    let previous: [number, number] | null = null;
    for (let k = 0; k < RING; k += 1) {
      const point = ringPoint(station, k);
      if (previous) arc += Math.hypot(point[0] - previous[0], point[1] - previous[1]);
      previous = point;
      const v = s * RING + k;
      positions.set([point[0], point[1], station.z], v * 3);
      uvs.set([(station.z - params.zNose) * 0.5, arc * 0.5], v * 2);
    }
  }

  const index: number[] = [];
  for (let s = 0; s < stations - 1; s += 1) {
    for (let k = 0; k < RING - 1; k += 1) {
      const a = s * RING + k;
      const b = a + RING;
      index.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }

  const full = new THREE.BufferGeometry();
  full.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  full.setIndex(index);
  full.computeVertexNormals();
  const normals = (full.getAttribute('normal') as THREE.BufferAttribute).array as Float32Array;
  full.dispose();

  const grid = { positions, normals, uvs, stations, ring };
  gridCache.set(key, grid);
  return grid;
}

function bodyGeometry(shape: Extract<Shape, { kind: 'body' }>, lod: 0 | 1): THREE.BufferGeometry {
  const { params, region } = shape;
  const grid = bodyGrid(params, lod);
  const position: number[] = [];
  const normal: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];
  const remap = new Map<number, number>();

  const vertex = (v: number) => {
    const existing = remap.get(v);
    if (existing !== undefined) return existing;
    const next = position.length / 3;
    position.push(grid.positions[v * 3]!, grid.positions[v * 3 + 1]!, grid.positions[v * 3 + 2]!);
    normal.push(grid.normals[v * 3]!, grid.normals[v * 3 + 1]!, grid.normals[v * 3 + 2]!);
    uv.push(grid.uvs[v * 2]!, grid.uvs[v * 2 + 1]!);
    remap.set(v, next);
    return next;
  };

  for (let s = 0; s < grid.stations - 1; s += 1) {
    const zc = (grid.ring[s]!.z + grid.ring[s + 1]!.z) / 2;
    for (let k = 0; k < RING - 1; k += 1) {
      if (regionOf(params, zc, k) !== region) continue;
      const a = s * RING + k;
      const b = a + RING;
      index.push(vertex(a), vertex(a + 1), vertex(b), vertex(b), vertex(a + 1), vertex(b + 1));
    }
  }

  const cap = (s: number, facing: -1 | 1) => {
    const station = grid.ring[s]!;
    const centre = position.length / 3;
    position.push(0, (station.bottom + station.top) / 2, station.z);
    normal.push(0, 0, facing);
    uv.push(0.5, 0.5);
    const first = centre + 1;
    for (let k = 0; k < RING; k += 1) {
      const [x, y] = ringPoint(station, k);
      position.push(x, y, station.z);
      normal.push(0, 0, facing);
      uv.push(x * 0.5 + 0.5, y * 0.5);
    }
    for (let k = 0; k < RING; k += 1) {
      const next = (k + 1) % RING;
      if (facing < 0) index.push(centre, first + next, first + k);
      else index.push(centre, first + k, first + next);
    }
  };
  if (region === 'front') cap(0, -1);
  if (region === 'rear' && !params.bed) cap(grid.stations - 1, 1);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(index);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

// Both lathes run counter-clockwise in (radius, axial) so faces point out.
function tyreGeometry(shape: Extract<Shape, { kind: 'tyre' }>, lod: 0 | 1): THREE.BufferGeometry {
  const { radius: r, width, rimRadius: rim } = shape;
  const h = width / 2;
  const wall = r - rim;
  const groove = 0.006;
  const points = [
    [rim, h],
    [rim + wall * 0.35, h + 0.006],
    [rim + wall * 0.75, h + 0.008],
    [r - 0.022, h - 0.004],
    [r - 0.006, h - 0.022],
    [r, h - 0.045],
    [r, h * 0.42],
    [r - groove, h * 0.38],
    [r - groove, h * 0.3],
    [r, h * 0.26],
    [r, -h * 0.26],
    [r - groove, -h * 0.3],
    [r - groove, -h * 0.38],
    [r, -h * 0.42],
    [r, -h + 0.045],
    [r - 0.006, -h + 0.022],
    [r - 0.022, -h + 0.004],
    [rim + wall * 0.75, -h - 0.008],
    [rim + wall * 0.35, -h - 0.006],
    [rim, -h],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const geometry = new THREE.LatheGeometry(points.reverse(), segmentsFor(64, lod));
  geometry.computeVertexNormals();
  return geometry;
}

function rimGeometry(shape: Extract<Shape, { kind: 'rim' }>, lod: 0 | 1): THREE.BufferGeometry {
  const { radius: r, width, spokes, face } = shape;
  const h = width / 2;
  const segments = segmentsFor(48, lod);
  const barrel = new THREE.LatheGeometry(
    [
      [r - 0.012, -h],
      [r, -h],
      [r, -h + 0.012],
      [r - 0.004, -h + 0.02],
      [r - 0.004, h - 0.02],
      [r, h - 0.012],
      [r + 0.012, h - 0.004],
      [r + 0.012, h],
      [r - 0.012, h],
      [r - 0.012, -h],
    ].map(([x, y]) => new THREE.Vector2(x, y)),
    segments,
  );
  if (face < 0) barrel.rotateX(Math.PI);

  const faceY = face * (h - 0.03);
  const parts: THREE.BufferGeometry[] = [barrel];

  const hub = new THREE.CylinderGeometry(r * 0.24, r * 0.27, 0.05, segments);
  hub.translate(0, faceY, 0);
  parts.push(hub);

  const cap = new THREE.CylinderGeometry(r * 0.11, r * 0.13, 0.064, segmentsFor(24, lod));
  cap.translate(0, faceY, 0);
  parts.push(cap);

  const reach = r - r * 0.22;
  for (let i = 0; i < spokes; i += 1) {
    for (const offset of [-0.09, 0.09]) {
      const spoke = new THREE.BoxGeometry(reach, 0.026, r * 0.11);
      spoke.translate(r * 0.22 + reach / 2, faceY - face * 0.004, 0);
      spoke.rotateY((i / spokes) * Math.PI * 2 + offset);
      parts.push(spoke);
    }
  }

  const merged = mergeGeometries(parts.map((g) => g.toNonIndexed()), false);
  for (const g of parts) g.dispose();
  return merged;
}

function filletRadius(size: [number, number, number]): number {
  const smallest = Math.min(...size);
  return Math.max(0.0015, Math.min(0.012, smallest * 0.24));
}

function roundedBox(size: [number, number, number], lod: 0 | 1): THREE.BufferGeometry {
  const radius = filletRadius(size);
  const segments = lod === 0 ? 3 : 1;
  return new RoundedBoxGeometry(size[0], size[1], size[2], segments, radius) as unknown as THREE.BufferGeometry;
}

function chamferedCylinder(
  radius: number,
  radiusTop: number,
  height: number,
  radialSegments: number,
): THREE.BufferGeometry {
  const chamfer = Math.min(radius * 0.14, height * 0.12, 0.006);
  if (chamfer < 0.0008) {
    return new THREE.CylinderGeometry(radiusTop, radius, height, radialSegments, 1);
  }

  const half = height / 2;
  const points = [
    new THREE.Vector2(0, -half),
    new THREE.Vector2(radius - chamfer, -half),
    new THREE.Vector2(radius, -half + chamfer),
    new THREE.Vector2(radiusTop, half - chamfer),
    new THREE.Vector2(radiusTop - chamfer, half),
    new THREE.Vector2(0, half),
  ];
  const geometry = new THREE.LatheGeometry(points, radialSegments);
  geometry.computeVertexNormals();
  return geometry;
}

function create(shape: Shape, lod: 0 | 1): THREE.BufferGeometry {
  switch (shape.kind) {
    case 'box':
      return roundedBox(shape.size, lod);
    case 'cylinder':
      return chamferedCylinder(
        shape.radius,
        shape.radiusTop ?? shape.radius,
        shape.height,
        segmentsFor(shape.segments ?? 36, lod),
      );
    case 'sphere':
      return new THREE.SphereGeometry(shape.radius, segmentsFor(32, lod), segmentsFor(20, lod));
    case 'torus':
      return new THREE.TorusGeometry(shape.radius, shape.tube, segmentsFor(16, lod), segmentsFor(40, lod));
    case 'capsule':
      return new THREE.CapsuleGeometry(shape.radius, shape.length, segmentsFor(10, lod), segmentsFor(20, lod));
    case 'body':
      return bodyGeometry(shape, lod);
    case 'tyre':
      return tyreGeometry(shape, lod);
    case 'rim':
      return rimGeometry(shape, lod);
    case 'crankshaft':
      return crankshaftGeometry(shape, lod);
    case 'camshaft':
      return camshaftGeometry(shape, lod);
  }
}

export function getGeometry(shape: Shape, lod: 0 | 1 = 0): THREE.BufferGeometry {
  const key = keyFor(shape, lod);
  const cached = cache.get(key);
  if (cached) return cached;
  const geometry = create(shape, lod);
  geometry.boundsTree = new MeshBVH(geometry, { maxLeafTris: 8 });
  cache.set(key, geometry);
  return geometry;
}

const edgeCache = new Map<string, THREE.EdgesGeometry>();

export function getEdges(shape: Shape, lod: 0 | 1 = 0): THREE.EdgesGeometry {
  const key = keyFor(shape, lod);
  const cached = edgeCache.get(key);
  if (cached) return cached;
  const edges = new THREE.EdgesGeometry(getGeometry(shape, lod), 35);
  edgeCache.set(key, edges);
  return edges;
}

export function triangleCount(shape: Shape, lod: 0 | 1 = 0): number {
  const geometry = getGeometry(shape, lod);
  const index = geometry.getIndex();
  if (index) return index.count / 3;
  const position = geometry.getAttribute('position');
  return position ? position.count / 3 : 0;
}

export function disposeGeometry(): void {
  for (const g of cache.values()) {
    g.boundsTree = undefined;
    g.dispose();
  }
  for (const g of edgeCache.values()) g.dispose();
  cache.clear();
  edgeCache.clear();
  gridCache.clear();
}
