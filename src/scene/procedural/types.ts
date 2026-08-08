import type { SystemId, Vec3 } from '@/domain/types';

export type Shape =
  | { kind: 'box'; size: Vec3 }

  | { kind: 'cylinder'; radius: number; height: number; radiusTop?: number; segments?: number }
  | { kind: 'sphere'; radius: number }

  | { kind: 'torus'; radius: number; tube: number }
  | { kind: 'capsule'; radius: number; length: number }

  | { kind: 'profile'; points: [number, number][]; depth: number; bevel?: number; holes?: [number, number][][] };

export interface PartInstance {
  nodeId: string;

  baseNodeId: string;
  componentId: string;
  system: SystemId;
  shape: Shape;
  position: Vec3;

  rotation: Vec3;

  explode: Vec3;
  material: MaterialKey;

  instanceLabel?: string;
  lod: 0 | 1;
}

export type MaterialKey =
  | 'cast_iron'
  | 'aluminium'
  | 'steel'
  | 'plastic_black'
  | 'rubber'
  | 'copper'
  | 'glass'
  | 'fluid'
  | 'painted_body'
  | 'chrome'
  | 'hv_orange'
  | 'fabric';

export interface PartDef {
  component: string;
  shape: Shape;
  position: Vec3;
  rotation?: Vec3;
  material: MaterialKey;

  variant?: string;
  instanceLabel?: string;

  explode?: Vec3;
  lod?: 0 | 1;
}

export interface BuiltScene {
  parts: PartInstance[];

  bounds: { min: Vec3; max: Vec3 };
}
