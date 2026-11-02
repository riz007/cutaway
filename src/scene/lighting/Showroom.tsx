import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { MeshReflectorMaterial } from '@react-three/drei';
import type { RenderMode } from '@/app/store/appStore';
import type { Quality } from './Lighting';

const NO_RAYCAST = () => undefined;

// Every surface faces up and is single-sided, so the undercarriage camera
// looks straight through the stage instead of at the underside of a disc.
export function Showroom({ radius, mode, quality }: { radius: number; mode: RenderMode; quality: Quality }) {
  const plinth = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#161b22', roughness: 0.38, metalness: 0.4 }),
    [],
  );
  const rim = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#0b0e12',
        emissive: new THREE.Color('#60a5fa'),
        emissiveIntensity: mode === 'schematic' ? 0.35 : 0.9,
        roughness: 0.3,
      }),
    [mode],
  );

  useEffect(() => () => plinth.dispose(), [plinth]);
  useEffect(() => () => rim.dispose(), [rim]);

  const plinthHeight = 0.045;

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position-y={0} receiveShadow raycast={NO_RAYCAST}>
        <circleGeometry args={[radius, 96]} />
        {mode === 'realistic' && quality === 'high' ? (
          <MeshReflectorMaterial
            blur={[320, 90]}
            resolution={1024}
            mixBlur={1}
            mixStrength={9}
            mixContrast={1.1}
            roughness={0.55}
            depthScale={0.9}
            minDepthThreshold={0.35}
            maxDepthThreshold={1.25}
            color="#14181e"
            metalness={0.45}
            mirror={0.55}
          />
        ) : (
          <primitive object={plinth} attach="material" />
        )}
      </mesh>
      <mesh position-y={-plinthHeight / 2} material={plinth} raycast={NO_RAYCAST}>
        <cylinderGeometry args={[radius, radius * 1.01, plinthHeight, 96, 1, true]} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.0015} material={rim} raycast={NO_RAYCAST}>
        <ringGeometry args={[radius - 0.012, radius, 128]} />
      </mesh>

      <mesh rotation-x={-Math.PI / 2} position-y={-plinthHeight} raycast={NO_RAYCAST}>
        <circleGeometry args={[radius * 6, 64]} />
        <meshStandardMaterial color={mode === 'schematic' ? '#0c1117' : '#07090c'} roughness={0.95} />
      </mesh>

      {mode === 'schematic' && (
        <gridHelper args={[radius * 4, 28, '#1e293b', '#121a24']} position-y={0.002} raycast={NO_RAYCAST} />
      )}
    </group>
  );
}
