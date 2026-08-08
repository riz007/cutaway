import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three-stdlib';
import type { Shape } from './procedural/types';

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
    case 'profile':
      return `pro:${shape.depth},${shape.bevel ?? 0},${shape.points.length},${(shape.holes ?? []).length},${shape.points
        .map((pt) => pt.join('_'))
        .join('|')}:${lod}`;
  }
}

function extrudedProfile(
  points: [number, number][],
  depth: number,
  bevel: number,
  lod: 0 | 1,
  holes: [number, number][][] = [],
): THREE.BufferGeometry {
  const outline = new THREE.Shape();
  const [first, ...rest] = points;
  if (!first) return new THREE.BufferGeometry();
  outline.moveTo(first[0], first[1]);
  for (const [x, y] of rest) outline.lineTo(x, y);
  outline.closePath();

  for (const hole of holes) {
    const [start, ...others] = hole;
    if (!start || others.length < 2) continue;
    const path = new THREE.Path();
    path.moveTo(start[0], start[1]);
    for (const [x, y] of others) path.lineTo(x, y);
    path.closePath();
    outline.holes.push(path);
  }

  const useBevel = bevel > 0 && lod === 0;
  const geometry = new THREE.ExtrudeGeometry(outline, {
    depth,
    bevelEnabled: useBevel,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 12,
  });

  geometry.translate(0, 0, -depth / 2);
  geometry.rotateY(-Math.PI / 2);
  geometry.computeVertexNormals();
  return geometry;
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
    case 'profile':
      return extrudedProfile(shape.points, shape.depth, shape.bevel ?? 0.004, lod, shape.holes ?? []);
  }
}

export function getGeometry(shape: Shape, lod: 0 | 1 = 0): THREE.BufferGeometry {
  const key = keyFor(shape, lod);
  const cached = cache.get(key);
  if (cached) return cached;
  const geometry = create(shape, lod);
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
  for (const g of cache.values()) g.dispose();
  for (const g of edgeCache.values()) g.dispose();
  cache.clear();
  edgeCache.clear();
}
