import { Suspense, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { ContactShadows, PerformanceMonitor, Preload } from '@react-three/drei';
import { ARCHETYPES } from '@/domain/registry';
import { applyDimensions } from './procedural/layout';
import { useAppStore, useConfiguration } from '@/app/store/appStore';
import { startSimLoop } from '@/sim/tick';
import { VehicleScene } from './VehicleScene';
import { CameraRig } from './cameras/CameraRig';
import { Lighting, type Quality } from './lighting/Lighting';
import { Showroom } from './lighting/Showroom';
import { ClipPlanes } from './interaction/ClipPlanes';
import { Effects } from './effects/Effects';
import { useT } from '@/i18n';

export function detectWebgl2(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2'));
  } catch {
    return false;
  }
}

function SimDriver() {
  const { invalidate, setFrameloop } = useThree();
  const playing = useAppStore((s) => s.simPlaying);

  useEffect(() => {
    const loop = startSimLoop(invalidate);
    return () => loop.stop();
  }, [invalidate]);

  useEffect(() => {
    setFrameloop(playing ? 'always' : 'demand');
    invalidate();
  }, [playing, setFrameloop, invalidate]);

  return null;
}

const DPR: Record<Quality, [number, number]> = { high: [1, 2], medium: [1, 1.5], low: [1, 1] };
const STEP_DOWN: Record<Quality, Quality> = { high: 'medium', medium: 'low', low: 'low' };
const STEP_UP: Record<Quality, Quality> = { high: 'high', medium: 'high', low: 'medium' };

export function SceneCanvas() {
  const t = useT();
  const config = useConfiguration();
  const renderMode = useAppStore((s) => s.renderMode);
  const reducedMotion = useAppStore((s) => s.reducedMotion);
  const setWebglAvailable = useAppStore((s) => s.setWebglAvailable);
  const setPlaying = useAppStore((s) => s.setPlaying);

  const geometry = useMemo(
    () => applyDimensions(ARCHETYPES[config.archetype].geometry, config.dimensions),
    [config.archetype, config.dimensions],
  );

  const coarsePointer = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
    [],
  );
  const [quality, setQuality] = useState<Quality>(coarsePointer ? 'low' : 'high');

  useEffect(() => {
    setWebglAvailable(detectWebgl2());
  }, [setWebglAvailable]);

  useEffect(() => {
    setPlaying(false);
  }, [config.vehicleId, config.powertrain, setPlaying]);

  const realistic = renderMode === 'realistic';
  const plinthRadius = Math.hypot(geometry.length, geometry.width) * 0.58;

  return (
    <Canvas
      frameloop="demand"
      shadows={realistic && quality !== 'low' ? 'soft' : false}
      dpr={DPR[quality]}
      gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
      camera={{
        position: [geometry.length * 1.0, geometry.height * 1.3, -geometry.length * 1.1],
        fov: 40,
        near: 0.05,
        far: 80,
      }}
      aria-label={t('a11y.canvas')}
      role="application"
      tabIndex={0}
      data-orbit-keys=""
      onCreated={({ gl, raycaster }) => {
        gl.toneMapping = THREE.AgXToneMapping;
        gl.toneMappingExposure = 1.25;
        gl.localClippingEnabled = true;
        raycaster.firstHitOnly = true;
      }}
    >
      <PerformanceMonitor
        flipflops={3}
        onDecline={() => setQuality((q) => STEP_DOWN[q])}
        onIncline={() => setQuality((q) => (coarsePointer ? q : STEP_UP[q]))}
        onFallback={() => setQuality('low')}
      />

      <color attach="background" args={[renderMode === 'schematic' ? '#0b1016' : '#06080b']} />
      <fog attach="fog" args={[renderMode === 'schematic' ? '#0b1016' : '#06080b', geometry.length * 3, geometry.length * 9]} />

      <Suspense fallback={null}>
        <Lighting mode={renderMode} quality={quality} />
        <VehicleScene />
        <Showroom radius={plinthRadius} mode={renderMode} quality={quality} />
        {realistic && quality !== 'low' && (
          <ContactShadows
            position={[0, 0.002, 0]}
            scale={plinthRadius * 2}
            blur={2.4}
            opacity={0.8}
            far={2.2}
            resolution={1024}
            frames={reducedMotion ? 1 : Infinity}
          />
        )}
        <Preload all />
      </Suspense>

      <CameraRig geometry={geometry} />
      <ClipPlanes />
      <Effects mode={renderMode} enabled={quality !== 'low'} />
      <SimDriver />
    </Canvas>
  );
}
