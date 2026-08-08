import type { ArchetypeId, Component, PowertrainId, SystemId } from '../types';
import { COMPONENTS, COMPONENTS_BY_ID } from './components';

export * from './archetypes';
export * from './components';
export * from './flows';
export * from './specDefaults';
export * from './systems';
export * from './vehicles';

export interface Configuration {
  archetype: ArchetypeId;
  powertrain: PowertrainId;
}

export function appliesTo(
  clause: { archetypes?: readonly ArchetypeId[]; powertrains?: readonly PowertrainId[] } | undefined,
  config: Configuration,
): boolean {
  if (!clause) return true;
  if (clause.archetypes && !clause.archetypes.includes(config.archetype)) return false;
  if (clause.powertrains && !clause.powertrains.includes(config.powertrain)) return false;
  return true;
}

export function componentsFor(config: Configuration): Component[] {
  return COMPONENTS.filter((c) => appliesTo(c.appliesTo, config));
}

export function componentsBySystem(config: Configuration, system: SystemId): Component[] {
  return componentsFor(config).filter((c) => c.system === system);
}

const REVERSE_RELATED: ReadonlyMap<string, string[]> = (() => {
  const map = new Map<string, string[]>();
  for (const comp of COMPONENTS) {
    for (const rel of comp.relatedTo) {
      const list = map.get(rel);
      if (list) list.push(comp.id);
      else map.set(rel, [comp.id]);
    }
  }
  return map;
})();

export function getRelated(componentId: string): Component[] {
  const self = COMPONENTS_BY_ID.get(componentId);
  if (!self) return [];
  const ids = new Set<string>([...self.relatedTo, ...(REVERSE_RELATED.get(componentId) ?? [])]);
  ids.delete(componentId);
  return [...ids].map((id) => COMPONENTS_BY_ID.get(id)).filter((c): c is Component => Boolean(c));
}

export function systemsPresent(config: Configuration): Set<SystemId> {
  return new Set(componentsFor(config).map((c) => c.system));
}
