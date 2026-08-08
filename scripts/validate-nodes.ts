import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { validateRegistries } from '../src/domain/validate';
import { ARCHETYPE_IDS, ARCHETYPES, COMPONENTS, COMPONENTS_BY_NODE } from '../src/domain/registry';
import { buildVehicle } from '../src/scene/procedural/buildVehicle';
import { buildFlows } from '../src/scene/procedural/buildFlows';

const errors: string[] = [];
const warnings: string[] = [];

for (const issue of validateRegistries()) {
  errors.push(`[${issue.scope}] ${issue.message}`);
}

const NODE_PATTERN = /^SYS_([a-z_]+)__([a-z0-9_]+)__([a-z0-9_]+)__LOD(\d)$/;

const reachable = new Set<string>();
let totalNodes = 0;
let totalFlows = 0;

for (const archetypeId of ARCHETYPE_IDS) {
  for (const powertrain of ARCHETYPES[archetypeId].powertrains) {
    const config = { archetype: archetypeId, powertrain };
    let built;
    try {
      built = buildVehicle(config);
    } catch (error) {
      errors.push(`[build:${archetypeId}/${powertrain}] ${(error as Error).message}`);
      continue;
    }

    const seenNodes = new Set<string>();
    for (const part of built.parts) {
      totalNodes += 1;

      const match = NODE_PATTERN.exec(part.nodeId);
      if (!match) {
        errors.push(
          `[node:${archetypeId}/${powertrain}] '${part.nodeId}' does not match ` +
            `SYS_<system>__<component>__<variant>__LOD<n>`,
        );
        continue;
      }

      if (seenNodes.has(part.nodeId)) {
        errors.push(`[node:${archetypeId}/${powertrain}] duplicate node name '${part.nodeId}'`);
      }
      seenNodes.add(part.nodeId);

      const base = `SYS_${match[1]}__${match[2]}`;
      const component = COMPONENTS_BY_NODE.get(base);
      if (!component) {
        errors.push(`[node:${archetypeId}/${powertrain}] '${part.nodeId}' has no component registered for '${base}'`);
        continue;
      }
      if (component.id !== part.componentId) {
        errors.push(
          `[node:${archetypeId}/${powertrain}] '${part.nodeId}' resolves to '${component.id}' ` +
            `but the part claims '${part.componentId}'`,
        );
      }
      reachable.add(component.id);
    }

    const flows = buildFlows(built.parts, config);
    totalFlows += flows.length;
    for (const flow of flows) {
      if (flow.points.length < 2) {
        errors.push(`[flow:${archetypeId}/${powertrain}] '${flow.id}' resolved to fewer than two points`);
      }
    }
  }
}

for (const component of COMPONENTS) {
  if (!reachable.has(component.id)) {
    errors.push(
      `[component:${component.id}] registered but no archetype emits a node for it. ` +
        `Either add it to a builder or remove it from the registry.`,
    );
  }
}

const contentDir = join(process.cwd(), 'src/content/components');
const lessonDir = join(process.cwd(), 'src/content/lessons');
const componentIds = new Set(COMPONENTS.map((c) => c.id));
const slugToComponent = new Map(COMPONENTS.map((c) => [c.contentSlug, c.id]));

let reviewed = 0;
let draft = 0;

function frontmatter(path: string): Record<string, string> {
  const text = readFileSync(path, 'utf8');
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!match) return {};
  const fields: Record<string, string> = {};
  for (const line of match[1]!.split(/\r?\n/)) {
    const kv = /^([a-zA-Z_]+):\s*(.*)$/.exec(line);
    if (kv) fields[kv[1]!] = kv[2]!.trim();
  }
  return fields;
}

if (existsSync(contentDir)) {
  for (const file of readdirSync(contentDir).filter((f) => f.endsWith('.mdx'))) {
    const slug = file.replace(/\.mdx$/, '');
    const meta = frontmatter(join(contentDir, file));

    if (!slugToComponent.has(slug)) {
      errors.push(`[content:${file}] filename does not match any component contentSlug`);
    }
    if (meta.component && !componentIds.has(meta.component)) {
      errors.push(`[content:${file}] frontmatter component '${meta.component}' is not in the registry`);
    }
    if (meta.review !== 'draft' && meta.review !== 'reviewed') {
      errors.push(`[content:${file}] frontmatter must declare review: draft | reviewed`);
    }
    if (meta.review === 'reviewed') {
      reviewed += 1;
      if (!meta.reviewer) {
        errors.push(`[content:${file}] a reviewed lesson must name its reviewer`);
      }
    } else {
      draft += 1;
    }
  }
}

if (existsSync(lessonDir)) {
  for (const file of readdirSync(lessonDir).filter((f) => f.endsWith('.mdx'))) {
    const text = readFileSync(join(lessonDir, file), 'utf8');
    for (const [, focus] of text.matchAll(/focus:\s*([a-z_]+\.[a-z0-9_]+)/g)) {
      if (!componentIds.has(focus!)) {
        errors.push(`[lesson:${file}] step focuses on unknown component '${focus}'`);
      }
    }
  }
}

const coverage = ((reviewed + draft) / COMPONENTS.length) * 100;

console.log(`components registered : ${COMPONENTS.length}`);
console.log(`nodes generated       : ${totalNodes} across all archetype/powertrain combinations`);
console.log(`flow paths resolved   : ${totalFlows}`);
console.log(`lessons written       : ${reviewed + draft} (${coverage.toFixed(0)}% of components)`);
console.log(`  technically reviewed: ${reviewed}`);
console.log(`  draft               : ${draft}`);

if (draft > 0) {
  warnings.push(
    `${draft} lesson(s) have not passed technical review. They render behind a visible draft badge; ` +
      `they must be signed off by a qualified reviewer before public launch.`,
  );
}

for (const warning of warnings) console.warn(`\nwarning: ${warning}`);

if (errors.length > 0) {
  console.error(`\n${errors.length} validation error(s):`);
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}

console.log('\nvalidation passed');
