import { Suspense, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { AdaptiveDpr, AdaptiveEvents, ContactShadows, Preload } from '@react-three/drei';
import { ARCHETYPES } from '@/domain/registry';
import { applyDimensions } from './procedural/layout';
import { useAppStore, useConfiguration } from '@/app/store/appStore';
import { startSimLoop } from '@/sim/tick';
import { getBuiltVehicle } from './procedural/buildVehicle';
import { VehicleScene } from './VehicleScene';
import { CameraRig } from './cameras/CameraRig';
import { Lighting } from './lighting/Lighting';
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

export function SceneCanvas() {
  const t = useT();
  const config = useConfiguration();
  const renderMode = useAppStore((s) => s.renderMode);
  const reducedMotion = useAppStore((s) => s.reducedMotion);
  const focusedComponentId = useAppStore((s) => s.focusedComponentId);
  const setWebglAvailable = useAppStore((s) => s.setWebglAvailable);
  const setPlaying = useAppStore((s) => s.setPlaying);

  const geometry = useMemo(
    () => applyDimensions(ARCHETYPES[config.archetype].geometry, config.dimensions),
    [config.archetype, config.dimensions],
  );

  const isMobile = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
    [],
  );

  const focusPoint = useMemo(() => {
    if (!focusedComponentId) return null;
    const part = getBuiltVehicle(config).parts.find((p) => p.componentId === focusedComponentId);
    return part ? new THREE.Vector3(...part.position) : null;
  }, [focusedComponentId, config.vehicleId, config.archetype, config.powertrain]);

  useEffect(() => {
    setWebglAvailable(detectWebgl2());
  }, [setWebglAvailable]);

  useEffect(() => {
    setPlaying(false);
  }, [config.vehicleId, config.powertrain, setPlaying]);

  return (
    <Canvas
      frameloop="demand"
      shadows={renderMode === 'realistic' && !isMobile ? 'soft' : false}
      dpr={isMobile ? [1, 1.5] : [1, 2]}
      gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
      camera={{
        position: [geometry.length * 1.0, geometry.height * 1.3, -geometry.length * 1.1],
        fov: 42,
        near: 0.05,
        far: 60,
      }}
      aria-label={t('a11y.canvas')}
      role="application"
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.15;
        gl.localClippingEnabled = true;
      }}
    >
      <color attach="background" args={[renderMode === 'schematic' ? '#0f141b' : '#0b0f14']} />

      <Suspense fallback={null}>
        <Lighting mode={renderMode} quality={isMobile ? 'low' : 'high'} />
        <VehicleScene />
        {renderMode === 'realistic' && !isMobile && (
          <ContactShadows
            position={[0, 0.001, 0]}
            scale={geometry.length * 1.6}
            blur={2.2}
            opacity={0.72}
            far={2.2}
            resolution={1024}
            frames={reducedMotion ? 1 : Infinity}
          />
        )}
        <Preload all />
      </Suspense>

      <gridHelper args={[geometry.length * 4, 24, '#1e293b', '#141c26']} />

      <CameraRig geometry={geometry} focusPoint={focusPoint} />
      <ClipPlanes />
      <Effects mode={renderMode} enabled={!isMobile} />
      <SimDriver />
      <AdaptiveDpr pixelated />
      <AdaptiveEvents />
    </Canvas>
  );
}
