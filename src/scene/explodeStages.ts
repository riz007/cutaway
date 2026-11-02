import type { PartInstance } from './procedural/types';

export type ExplodeStage = 0 | 1 | 2 | 3;

export const EXPLODE_STAGES = [
  { stage: 0, labelKey: 'explode.stage.body', assembleKey: 'intro.stage.body' },
  { stage: 1, labelKey: 'explode.stage.cabin', assembleKey: 'intro.stage.cabin' },
  { stage: 2, labelKey: 'explode.stage.systems', assembleKey: 'intro.stage.systems' },
  { stage: 3, labelKey: 'explode.stage.chassis', assembleKey: 'intro.stage.chassis' },
] as const;

const OUTER_SHELL = new Set([
  'structure.body_panel',
  'structure.glazing',
  'electrical.headlight',
  'electrical.taillight',
  'drivetrain.road_wheel',
]);

export const STAGE_START = [0, 0.2, 0.4, 0.56] as const;
const STAGE_SPAN = 0.34;
const STAGGER = 0.1;

// Outer layers travel further so they clear the layers beneath them.
export const STAGE_REACH = [1.9, 1.4, 1, 0.75] as const;

export function stageOf(part: Pick<PartInstance, 'componentId' | 'system'>): ExplodeStage {
  if (OUTER_SHELL.has(part.componentId)) return 0;
  if (part.system === 'interior' || part.system === 'safety_adas') return 1;
  if (part.system === 'structure' || part.system === 'suspension_steering') return 3;
  return 2;
}

export function staggerOf(nodeId: string): number {
  let hash = 2166136261;
  for (let i = 0; i < nodeId.length; i += 1) {
    hash ^= nodeId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 1000) / 1000;
}

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function partProgress(explode: number, stage: ExplodeStage, stagger: number): number {
  const start = STAGE_START[stage] + stagger * STAGGER;
  const local = Math.min(1, Math.max(0, (explode - start) / STAGE_SPAN));
  return easeInOutCubic(local);
}

export function countSeparated(parts: readonly PartInstance[], explode: number): number {
  let separated = 0;
  for (const part of parts) {
    if (partProgress(explode, stageOf(part), staggerOf(part.nodeId)) > 0.5) separated += 1;
  }
  return separated;
}

// The layer that is most visibly in motion: the one whose typical part is
// closest to halfway through its own journey.
export function activeStage(explode: number): ExplodeStage {
  let best: ExplodeStage = 0;
  let bestDistance = Infinity;
  for (const stage of [0, 1, 2, 3] as const) {
    const distance = Math.abs(partProgress(explode, stage, 0.5) - 0.5);
    if (distance < bestDistance - 1e-9) {
      best = stage;
      bestDistance = distance;
    }
  }
  return best;
}
