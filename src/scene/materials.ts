import * as THREE from 'three';
import type { SystemId } from '@/domain/types';
import { SYSTEMS } from '@/domain/registry';
import type { MaterialKey } from './procedural/types';
import { surfaceMaps } from './textures';

interface MaterialSpec {
  color: string;
  roughness: number;
  metalness: number;
  opacity?: number;
  transparent?: boolean;
  clearcoat?: number;
  clearcoatRoughness?: number;
  sheen?: number;
  sheenColor?: string;
  envMapIntensity?: number;
  iridescence?: number;
  surface?: 'cast' | 'machined' | 'paint' | 'weave' | 'none';
  emissive?: string;
  emissiveIntensity?: number;

  tiling?: number;
  normalScale?: number;
  reflectivity?: number;
  ior?: number;
}

const SPECS: Record<MaterialKey, MaterialSpec> = {
  cast_iron: {
    color: '#55585c',
    roughness: 0.78,
    metalness: 0.62,
    envMapIntensity: 0.9,
    surface: 'cast',
    tiling: 12,
    normalScale: 0.9,
  },
  aluminium: {
    color: '#c2c8cf',
    roughness: 0.34,
    metalness: 0.95,
    envMapIntensity: 1.35,
    surface: 'machined',
    tiling: 7,
    normalScale: 0.22,
  },
  steel: {
    color: '#9aa2ab',
    roughness: 0.36,
    metalness: 0.92,
    envMapIntensity: 1.25,
    surface: 'machined',
    tiling: 10,
    normalScale: 0.25,
  },
  plastic_black: {
    color: '#22252a',
    roughness: 0.58,
    metalness: 0.0,
    envMapIntensity: 0.8,
    clearcoat: 0.25,
    clearcoatRoughness: 0.55,
    surface: 'cast',
    tiling: 30,
    normalScale: 0.5,
  },
  rubber: {
    color: '#141517',
    roughness: 0.94,
    metalness: 0.0,
    envMapIntensity: 0.45,
    surface: 'cast',
    tiling: 14,
    normalScale: 0.9,
  },
  copper: {
    color: '#b2703c',
    roughness: 0.3,
    metalness: 0.98,
    envMapIntensity: 1.4,
    surface: 'machined',
    tiling: 28,
    normalScale: 0.35,
  },
  glass: {
    color: '#20303c',
    roughness: 0.03,
    metalness: 0.0,
    opacity: 0.42,
    transparent: true,
    envMapIntensity: 2.2,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    ior: 1.5,
    reflectivity: 0.6,
    surface: 'none',
  },
  fluid: {
    color: '#3fb6c8',
    roughness: 0.15,
    metalness: 0.0,
    opacity: 0.45,
    transparent: true,
    envMapIntensity: 1.1,
    surface: 'none',
  },
  painted_body: {
    color: '#1f5f9e',
    roughness: 0.32,
    metalness: 0.55,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.5,
    surface: 'paint',
    tiling: 4,
    normalScale: 0.25,
  },
  chrome: {
    color: '#e2e6ea',
    roughness: 0.06,
    metalness: 1.0,
    envMapIntensity: 1.9,
    surface: 'machined',
    tiling: 12,
    normalScale: 0.08,
  },
  hv_orange: {
    color: '#e0621a',
    roughness: 0.48,
    metalness: 0.1,
    clearcoat: 0.4,
    clearcoatRoughness: 0.35,
    envMapIntensity: 0.9,
    surface: 'cast',
    tiling: 22,
    normalScale: 0.55,
  },
  lamp: {
    color: '#e8eef5',
    roughness: 0.08,
    metalness: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    envMapIntensity: 1.6,
    emissive: '#cfe0ff',
    emissiveIntensity: 0.55,
    surface: 'none',
  },
  lamp_red: {
    color: '#5c0a10',
    roughness: 0.12,
    metalness: 0.0,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    envMapIntensity: 1.2,
    emissive: '#ff2433',
    emissiveIntensity: 0.6,
    surface: 'none',
  },
  fabric: {
    color: '#4a4f57',
    roughness: 0.95,
    metalness: 0.0,
    sheen: 0.6,
    sheenColor: '#8b93a1',
    envMapIntensity: 0.5,
    surface: 'weave',
    tiling: 34,
    normalScale: 0.8,
  },
};

const CAP_COLOR = new THREE.Color('#dbe3ec');

function addSectionCap(material: THREE.Material): void {
  material.side = THREE.DoubleSide;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uCapColor = { value: CAP_COLOR };
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', 'uniform vec3 uCapColor;\nvoid main() {')
      .replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
         if (!gl_FrontFacing) {
           gl_FragColor = vec4(uCapColor * 0.8, 1.0);
         }`,
      );
  };
}

function applySurface(material: THREE.MeshPhysicalMaterial, spec: MaterialSpec): void {
  if (!spec.surface || spec.surface === 'none') return;
  const maps = surfaceMaps();
  const repeat = spec.tiling ?? 16;

  const [roughnessMap, normalMap] =
    spec.surface === 'cast'
      ? [maps.castRoughness, maps.castNormal]
      : spec.surface === 'machined'
        ? [maps.machinedRoughness, maps.machinedNormal]
        : spec.surface === 'weave'
          ? [maps.weaveRoughness, maps.weaveNormal]
          : [null, maps.paintNormal];

  if (roughnessMap) {
    const map = roughnessMap.clone();
    map.repeat.set(repeat, repeat);
    map.needsUpdate = true;
    material.roughnessMap = map;
  }

  const normal = normalMap.clone();
  normal.repeat.set(repeat, repeat);
  normal.needsUpdate = true;
  material.normalMap = normal;
  material.normalScale = new THREE.Vector2(spec.normalScale ?? 0.5, spec.normalScale ?? 0.5);
}

const realisticCache = new Map<MaterialKey, THREE.MeshPhysicalMaterial>();

export function realisticMaterial(key: MaterialKey): THREE.MeshPhysicalMaterial {
  const cached = realisticCache.get(key);
  if (cached) return cached;

  const spec = SPECS[key];
  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(spec.color),
    roughness: spec.roughness,
    metalness: spec.metalness,
    transparent: spec.transparent ?? false,
    opacity: spec.opacity ?? 1,
    depthWrite: !spec.transparent,
    clearcoat: spec.clearcoat ?? 0,
    clearcoatRoughness: spec.clearcoatRoughness ?? 0.2,
    sheen: spec.sheen ?? 0,
    sheenColor: new THREE.Color(spec.sheenColor ?? '#ffffff'),
    envMapIntensity: spec.envMapIntensity ?? 1,
    iridescence: spec.iridescence ?? 0,
    reflectivity: spec.reflectivity ?? 0.5,
    ior: spec.ior ?? 1.5,
    emissive: new THREE.Color(spec.emissive ?? '#000000'),
    emissiveIntensity: spec.emissiveIntensity ?? 1,
  });
  material.name = `mat_${key}`;
  applySurface(material, spec);
  addSectionCap(material);
  realisticCache.set(key, material);
  return material;
}

const schematicCache = new Map<SystemId, THREE.MeshStandardMaterial>();

export function schematicMaterial(system: SystemId): THREE.MeshStandardMaterial {
  const cached = schematicCache.get(system);
  if (cached) return cached;

  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(SYSTEMS[system].color),
    roughness: 1,
    metalness: 0,
    envMapIntensity: 0.15,
  });
  material.name = `schematic_${system}`;
  addSectionCap(material);
  schematicCache.set(system, material);
  return material;
}

export function createXrayMaterial(color = '#9fb3c8'): THREE.ShaderMaterial {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    blending: THREE.NormalBlending,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: 0.07 },
      uPower: { value: 2.6 },
    },
    vertexShader: `
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      #include <clipping_planes_pars_vertex>
      void main() {
        #include <beginnormal_vertex>
        #include <defaultnormal_vertex>
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPosition.xyz);
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vec3 vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
        #include <clipping_planes_vertex>
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uPower;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      #include <clipping_planes_pars_fragment>
      void main() {
        #include <clipping_planes_fragment>
        float fresnel = pow(1.0 - abs(dot(normalize(vNormalView), normalize(vViewDir))), uPower);
        float alpha = clamp(uOpacity + fresnel * 0.5, 0.0, 0.8);
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
  });
  material.name = 'mat_xray';
  return material;
}

let xraySingleton: THREE.ShaderMaterial | null = null;

export function xrayMaterial(): THREE.ShaderMaterial {
  xraySingleton ??= createXrayMaterial();
  return xraySingleton;
}

export function disposeMaterials(): void {
  for (const m of realisticCache.values()) m.dispose();
  for (const m of schematicCache.values()) m.dispose();
  xraySingleton?.dispose();
  realisticCache.clear();
  schematicCache.clear();
  xraySingleton = null;
}
