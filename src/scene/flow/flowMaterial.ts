import * as THREE from 'three';
import type { FlowMedium } from '@/domain/types';
import { MEDIUM_COLORS } from '@/domain/registry';

export interface FlowUniforms {
  uTime: { value: number };
  uSpeed: { value: number };
  uColor: { value: THREE.Color };
  uHotColor: { value: THREE.Color };
  uRamp: { value: number };
  uOpacity: { value: number };
  uDirection: { value: number };
}

const HOT = new THREE.Color('#f97316');

export function createFlowMaterial(medium: FlowMedium, hasRamp: boolean): THREE.ShaderMaterial {
  const base = new THREE.Color(MEDIUM_COLORS[medium]);

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uSpeed: { value: 0 },
      uColor: { value: base },
      uHotColor: { value: hasRamp ? HOT.clone() : base.clone() },
      uRamp: { value: hasRamp ? 1 : 0 },
      uOpacity: { value: 0.9 },
      uDirection: { value: 1 },
    } satisfies FlowUniforms,
    vertexShader:  `
      varying vec2 vUv;
      #include <clipping_planes_pars_vertex>
      void main() {
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <clipping_planes_vertex>
      }
    `,
    fragmentShader:  `
      uniform float uTime;
      uniform float uSpeed;
      uniform vec3 uColor;
      uniform vec3 uHotColor;
      uniform float uRamp;
      uniform float uOpacity;
      uniform float uDirection;
      varying vec2 vUv;
      #include <clipping_planes_pars_fragment>

      void main() {
        #include <clipping_planes_fragment>

        float scroll = vUv.x * 8.0 - uTime * uSpeed * uDirection * 2.0;
        float band = smoothstep(0.35, 0.5, abs(fract(scroll) - 0.5));

        vec3 tint = mix(uColor, mix(uColor, uHotColor, vUv.x), uRamp);
        float pulse = mix(0.35, 1.0, band) * mix(0.45, 1.0, clamp(uSpeed, 0.0, 1.0));
        gl_FragColor = vec4(tint * (0.6 + 0.6 * band), uOpacity * pulse);
      }
    `,
  });
  material.name = `flow_${medium}`;
  return material;
}

export function rampMix(tempC: number, ramp: [number, number]): number {
  const [lo, hi] = ramp;
  if (hi === lo) return 0;
  return Math.min(1, Math.max(0, (tempC - lo) / (hi - lo)));
}
