import { Environment, SoftShadows } from '@react-three/drei';
import type { RenderMode } from '@/app/store/appStore';

export function Lighting({ mode, quality }: { mode: RenderMode; quality: 'high' | 'low' }) {
  if (mode === 'schematic') {
    return (
      <>
        <ambientLight intensity={1.05} />
        <directionalLight position={[3, 6, -4]} intensity={0.5} />
        <directionalLight position={[-4, 3, 5]} intensity={0.32} />
      </>
    );
  }

  return (
    <>
      {quality === 'high' && <SoftShadows size={22} samples={12} focus={0.6} />}
      <Environment preset="warehouse" background={false} environmentIntensity={0.9} />

      <ambientLight intensity={0.18} />

      <directionalLight
        position={[4.5, 7, -5]}
        intensity={2.4}
        color="#fff6e8"
        castShadow={quality === 'high'}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-near={0.5}
        shadow-camera-far={24}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
      />

      <directionalLight position={[-6, 3.5, 6]} intensity={0.85} color="#bfd6ff" />

      <directionalLight position={[-2, 1.2, -7]} intensity={1.1} color="#8fb4ff" />

      <hemisphereLight args={['#cfe4ff', '#20262e', 0.35]} />
    </>
  );
}
