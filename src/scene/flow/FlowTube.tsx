import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { FlowPath } from '@/domain/types';
import { useSimStore } from '@/sim/simStore';
import { createFlowMaterial, rampMix } from './flowMaterial';

interface FlowTubeProps {
  flow: FlowPath;
  visible: boolean;

  dimmed: boolean;
}

export function FlowTube({ flow, visible, dimmed }: FlowTubeProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const points = flow.points.map((p) => new THREE.Vector3(...p));

    const first = points[0]!;
    const last = points[points.length - 1]!;
    const closed = points.length > 2 && first.distanceTo(last) < 0.02;
    const curve = new THREE.CatmullRomCurve3(closed ? points.slice(0, -1) : points, closed, 'centripetal', 0.4);
    const segments = Math.max(24, Math.round(curve.getLength() * 14));
    return new THREE.TubeGeometry(curve, segments, flow.radius ?? 0.016, 8, closed);
  }, [flow]);

  const material = useMemo(() => createFlowMaterial(flow.medium, Boolean(flow.temperatureRamp)), [flow]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame((_, delta) => {
    const mat = materialRef.current;
    if (!mat || !visible) return;

    const sim = useSimStore.getState();
    const rate = sim.flowRates[flow.medium] ?? 0;

    mat.uniforms.uTime!.value += delta;
    mat.uniforms.uSpeed!.value = rate;
    mat.uniforms.uOpacity!.value = dimmed ? 0.18 : 0.9;
    mat.uniforms.uDirection!.value = flow.direction === 'reverse' ? -1 : 1;

    if (flow.temperatureRamp) {
      const temp =
        flow.medium === 'coolant'
          ? sim.coolantTempC
          : flow.medium === 'exhaust'
            ? 180 + sim.load * 520
            : flow.medium === 'refrigerant'
              ? (sim.acOn ? 6 : 32)
              : sim.rotorTempC;
      mat.uniforms.uRamp!.value = rampMix(temp, flow.temperatureRamp);
    }
  });

  return (
    <mesh geometry={geometry} visible={visible} frustumCulled={false} renderOrder={2}>
      <primitive ref={materialRef} object={material} attach="material" />
    </mesh>
  );
}
