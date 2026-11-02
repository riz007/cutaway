import { useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import type { ArchetypeGeometry } from '@/domain/types';
import { useAppStore, type CameraPreset } from '@/app/store/appStore';
import { cameraBus, orbit, zoom, type Controls } from './cameraBus';

export interface PresetView {
  position: [number, number, number];
  target: [number, number, number];
}

export const PRESET_ORDER: CameraPreset[] = [
  'three_quarter',
  'front',
  'side',
  'top',
  'engine_bay',
  'undercarriage',
  'interior',
];

export function presetViews(g: ArchetypeGeometry): Record<CameraPreset, PresetView> {
  const L = g.length;
  const H = g.height;
  return {
    three_quarter: { position: [L * 1.36, H * 1.8, -L * 1.48], target: [0, H * 0.22, 0] },
    front: { position: [0, H * 0.9, -L * 1.7], target: [0, H * 0.25, 0] },
    side: { position: [L * 1.75, H * 0.7, 0], target: [0, H * 0.25, 0] },
    top: { position: [0.001, L * 1.4, 0.001], target: [0, 0, 0] },
    engine_bay: { position: [L * 0.35, H * 1.15, -L * 0.72], target: [0, H * 0.45, -L * 0.3] },
    undercarriage: { position: [L * 0.5, -H * 0.55, -L * 0.55], target: [0, g.groundClearance, 0] },
    interior: { position: [-g.width * 0.24, H * 0.72, L * 0.02], target: [0, H * 0.62, -L * 0.5] },
  };
}

const TURNTABLE_SPEED = 0.32;
const ORBIT_KEYS: Record<string, 'left' | 'right' | 'up' | 'down'> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  a: 'left',
  d: 'right',
  w: 'up',
  s: 'down',
};

function ownsKeyboard(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return true;
  if (target === document.body || target.closest('[data-orbit-keys]')) return true;
  return !target.closest('input, textarea, select, button, a, [role], [contenteditable]');
}

export function CameraRig({ geometry }: { geometry: ArchetypeGeometry }) {
  const ref = useRef<Controls>(null);
  const scene = useThree((s) => s.scene);
  const invalidate = useThree((s) => s.invalidate);

  const preset = useAppStore((s) => s.cameraPreset);
  const setCameraPreset = useAppStore((s) => s.setCameraPreset);
  const focusedComponentId = useAppStore((s) => s.focusedComponentId);
  const reducedMotion = useAppStore((s) => s.reducedMotion);
  const turntable = useAppStore((s) => s.turntable);
  const setTurntable = useAppStore((s) => s.setTurntable);
  const introActive = useAppStore((s) => s.introActive);

  const smooth = !reducedMotion;

  const goTo = useCallback(
    (target: CameraPreset, transition = smooth) => {
      const controls = ref.current;
      if (!controls) return;
      controls.maxPolarAngle = target === 'undercarriage' ? Math.PI * 0.97 : Math.PI * 0.49;
      const view = presetViews(geometry)[target];
      void controls.setLookAt(...view.position, ...view.target, transition);
    },
    [geometry, smooth],
  );

  useEffect(() => {
    cameraBus.controls = ref.current;
    cameraBus.recenter = () => goTo(useAppStore.getState().cameraPreset);
    return () => {
      cameraBus.controls = null;
      cameraBus.recenter = null;
    };
  }, [goTo]);

  useEffect(() => {
    goTo(preset);
  }, [preset, goTo]);

  const hadFocus = useRef(false);
  useEffect(() => {
    const controls = ref.current;
    if (!controls) return;

    if (!focusedComponentId) {
      if (hadFocus.current) goTo(useAppStore.getState().cameraPreset);
      hadFocus.current = false;
      return;
    }

    hadFocus.current = true;
    const box = new THREE.Box3();
    scene.traverse((object) => {
      if ((object.userData as { componentId?: string }).componentId === focusedComponentId) {
        box.expandByObject(object);
      }
    });
    if (box.isEmpty()) return;

    const pad = Math.max(0.35, box.getSize(new THREE.Vector3()).length() * 0.9);
    void controls.fitToBox(box, smooth, { paddingTop: pad, paddingBottom: pad, paddingLeft: pad, paddingRight: pad });
  }, [focusedComponentId, scene, smooth, goTo]);

  useEffect(() => {
    const controls = ref.current;
    if (!controls || !introActive || reducedMotion) return;
    const view = presetViews(geometry).three_quarter;
    const L = geometry.length;
    void controls.setLookAt(L * 2.4, geometry.height * 3.4, -L * 0.4, ...view.target, false);
    controls.smoothTime = 1.1;
    void controls.setLookAt(...view.position, ...view.target, true);
    return () => {
      controls.smoothTime = 0.3;
    };
  }, [introActive, geometry, reducedMotion]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || !ownsKeyboard(event.target)) return;

      const index = Number(event.key) - 1;
      if (Number.isInteger(index) && index >= 0 && index < PRESET_ORDER.length) {
        setCameraPreset(PRESET_ORDER[index]!);
        return;
      }

      const direction = ORBIT_KEYS[event.key.length === 1 ? event.key.toLowerCase() : event.key];
      if (direction) {
        event.preventDefault();
        orbit(direction, smooth);
      } else if (event.key === '+' || event.key === '=') {
        zoom('in', smooth);
      } else if (event.key === '-' || event.key === '_') {
        zoom('out', smooth);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setCameraPreset, smooth]);

  useFrame((_, delta) => {
    const controls = ref.current;
    if (!controls || !turntable || reducedMotion) return;
    controls.azimuthAngle += TURNTABLE_SPEED * delta;
    invalidate();
  });

  return (
    <CameraControls
      ref={ref}
      makeDefault
      smoothTime={reducedMotion ? 0 : 0.3}
      draggingSmoothTime={reducedMotion ? 0 : 0.12}
      minDistance={geometry.length * 0.12}
      maxDistance={geometry.length * 3.4}
      maxPolarAngle={Math.PI * 0.49}
      dollyToCursor
      onStart={() => {
        if (useAppStore.getState().turntable) setTurntable(false);
      }}
    />
  );
}
