import { Environment, Lightformer, SoftShadows } from '@react-three/drei';
import type { RenderMode } from '@/app/store/appStore';

export type Quality = 'high' | 'medium' | 'low';

// A studio built from area lights rather than a downloaded HDR: it works
// offline and behind a strict CSP, and long strip softboxes are what give
// painted panels the clean, readable highlights of a showroom shot.
function Studio() {
  return (
    <Environment resolution={256} frames={1} background={false}>
      <color attach="background" args={['#05070a']} />
      <Lightformer form="rect" intensity={2.4} position={[0, 7, 0]} rotation-x={Math.PI / 2} scale={[9, 2.4, 1]} />
      {[-3, 0, 3].map((z) => (
        <Lightformer
          key={z}
          form="rect"
          intensity={1.6}
          position={[0, 5.5, z]}
          rotation-x={Math.PI / 2}
          scale={[7, 0.35, 1]}
        />
      ))}
      <Lightformer form="rect" intensity={1.2} position={[-7, 1.8, 0]} rotation-y={Math.PI / 2} scale={[12, 1.4, 1]} />
      <Lightformer form="rect" intensity={1.2} position={[7, 1.8, 0]} rotation-y={-Math.PI / 2} scale={[12, 1.4, 1]} />
      <Lightformer form="ring" color="#9cc4ff" intensity={1.5} position={[0, 2.5, -9]} scale={3} />
      <Lightformer form="circle" intensity={0.6} position={[0, 2, 9]} rotation-y={Math.PI} scale={4} />
    </Environment>
  );
}

export function Lighting({ mode, quality }: { mode: RenderMode; quality: Quality }) {
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
      <Studio />

      <ambientLight intensity={0.12} />
      <directionalLight
        position={[4.5, 7, -5]}
        intensity={1.9}
        color="#fff6e8"
        castShadow={quality !== 'low'}
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
      <directionalLight position={[-6, 3.5, 6]} intensity={0.6} color="#bfd6ff" />
      <directionalLight position={[-2, 1.2, -7]} intensity={0.9} color="#8fb4ff" />
    </>
  );
}
