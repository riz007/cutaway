import type { FlowPath, Vec3 } from '@/domain/types';
import { FLOW_SPECS, appliesTo } from '@/domain/registry';
import type { PartInstance } from './types';
import type { BuildConfig } from './buildVehicle';

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

function anchorPosition(parts: PartInstance[], componentId: string): Vec3 | null {
  let n = 0;
  const sum: Vec3 = [0, 0, 0];
  for (const p of parts) {
    if (p.componentId !== componentId) continue;
    sum[0] += p.position[0];
    sum[1] += p.position[1];
    sum[2] += p.position[2];
    n += 1;
  }
  if (n === 0) return null;
  return [sum[0] / n, sum[1] / n, sum[2] / n];
}

function dedupe(points: Vec3[]): Vec3[] {
  const out: Vec3[] = [];
  for (const p of points) {
    const prev = out[out.length - 1];
    if (prev && Math.hypot(p[0] - prev[0], p[1] - prev[1], p[2] - prev[2]) < 1e-3) continue;
    out.push(p);
  }
  return out;
}

export function buildFlows(parts: PartInstance[], config: BuildConfig): FlowPath[] {
  const flows: FlowPath[] = [];

  for (const spec of FLOW_SPECS) {
    if (!appliesTo(spec.appliesTo, config)) continue;

    const points: Vec3[] = [];
    let complete = true;
    for (const anchor of spec.anchors) {
      const base = anchorPosition(parts, anchor.at);
      if (!base) {
        complete = false;
        break;
      }
      points.push(anchor.offset ? add(base, anchor.offset) : base);
    }
    if (!complete) continue;

    const cleaned = dedupe(points);
    if (cleaned.length < 2) continue;

    flows.push({
      id: spec.id,
      system: spec.system,
      points: cleaned,
      medium: spec.medium,
      direction: spec.direction,
      ...(spec.temperatureRamp ? { temperatureRamp: spec.temperatureRamp } : {}),
      ...(spec.radius ? { radius: spec.radius } : {}),
    });
  }

  return flows;
}
