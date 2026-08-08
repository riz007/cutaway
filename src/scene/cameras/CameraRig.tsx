import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { ArchetypeGeometry } from '@/domain/types';
import { useAppStore, type CameraPreset } from '@/app/store/appStore';

export interface PresetView {
  position: [number, number, number];
  target: [number, number, number];
  fov?: number;
}

export function presetViews(g: ArchetypeGeometry): Record<CameraPreset, PresetView> {
  const L = g.length;
  const H = g.height;
  return {
    three_quarter: { position: [L * 1.0, H * 1.3, -L * 1.1], target: [0, H * 0.45, 0] },
    front: { position: [0, H * 0.8, -L * 1.6], target: [0, H * 0.45, 0] },
    side: { position: [L * 1.65, H * 0.62, 0], target: [0, H * 0.45, 0] },
    top: { position: [0.001, L * 1.4, 0], target: [0, 0, 0] },
    engine_bay: { position: [L * 0.35, H * 1.15, -L * 0.72], target: [0, H * 0.45, -L * 0.3] },
    undercarriage: { position: [L * 0.5, -H * 0.55, -L * 0.55], target: [0, g.groundClearance, 0] },
    interior: { position: [-g.width * 0.24, H * 0.72, L * 0.02], target: [0, H * 0.62, -L * 0.5] },
  };
}

interface CameraRigProps {
  geometry: ArchetypeGeometry;

  focusPoint: THREE.Vector3 | null;
}

export function CameraRig({ geometry, focusPoint }: CameraRigProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera, invalidate } = useThree();

  const preset = useAppStore((s) => s.cameraPreset);
  const setCameraPreset = useAppStore((s) => s.setCameraPreset);
  const reducedMotion = useAppStore((s) => s.reducedMotion);

  const desiredPosition = useRef(new THREE.Vector3());
  const desiredTarget = useRef(new THREE.Vector3());
  const settled = useRef(true);

  useEffect(() => {
    const order: CameraPreset[] = [
      'three_quarter',
      'front',
      'side',
      'top',
      'engine_bay',
      'undercarriage',
      'interior',
    ];
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      const index = Number(event.key) - 1;
      if (Number.isInteger(index) && index >= 0 && index < order.length) {
        setCameraPreset(order[index]!);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setCameraPreset]);

  useEffect(() => {
    const view = presetViews(geometry)[preset];
    desiredPosition.current.set(...view.position);
    desiredTarget.current.set(...view.target);
    settled.current = false;
    invalidate();
  }, [preset, geometry, invalidate]);

  useEffect(() => {
    if (!focusPoint) return;
    const standoff = Math.max(0.55, geometry.length * 0.18);
    desiredTarget.current.copy(focusPoint);
    desiredPosition.current.copy(focusPoint).add(new THREE.Vector3(standoff, standoff * 0.7, -standoff));
    settled.current = false;
    invalidate();
  }, [focusPoint, geometry.length, invalidate]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls || settled.current) return;

    const ease = reducedMotion ? 1 : Math.min(1, delta * 4.5);
    camera.position.lerp(desiredPosition.current, ease);
    controls.target.lerp(desiredTarget.current, ease);
    controls.update();

    if (camera.position.distanceTo(desiredPosition.current) < 0.01) {
      camera.position.copy(desiredPosition.current);
      controls.target.copy(desiredTarget.current);
      controls.update();
      settled.current = true;
    } else {
      invalidate();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping={!reducedMotion}
      dampingFactor={0.08}

      maxPolarAngle={Math.PI * 0.52}
      minDistance={geometry.length * 0.18}
      maxDistance={geometry.length * 3.2}
      onChange={() => {
        settled.current = true;
      }}
    />
  );
}
