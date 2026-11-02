import type { SystemId, Vec3 } from '@/domain/types';
import type { BodyParams, BodyRegion } from './bodySurface';

export type Shape =
  | { kind: 'box'; size: Vec3 }

  | { kind: 'cylinder'; radius: number; height: number; radiusTop?: number; segments?: number }
  | { kind: 'sphere'; radius: number }

  | { kind: 'torus'; radius: number; tube: number }
  | { kind: 'capsule'; radius: number; length: number }

  | { kind: 'body'; params: BodyParams; region: BodyRegion }
  | { kind: 'tyre'; radius: number; width: number; rimRadius: number }
  | { kind: 'rim'; radius: number; width: number; spokes: number; face: 1 | -1 }
  | {
      kind: 'crankshaft';
      throws: { station: number; angle: number }[];
      throw: number;
      journalRadius: number;
      pinRadius: number;
      span: number;
    }
  | {
      kind: 'camshaft';
      lobes: { station: number; angle: number }[];
      radius: number;
      lift: number;
      span: number;
    };

export interface Kinematic {
  pivot: Vec3;
  bank: 'x' | 'z';
  rise?: number;
}

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
  kinematic?: Kinematic;
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
  | 'lamp'
  | 'lamp_red'
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
  kinematic?: Kinematic;
}

export interface BuiltScene {
  parts: PartInstance[];

  bounds: { min: Vec3; max: Vec3 };
}
