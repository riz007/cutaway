import { Bloom, EffectComposer, N8AO, SMAA, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import type { RenderMode } from '@/app/store/appStore';

export function Effects({ mode, enabled }: { mode: RenderMode; enabled: boolean }) {
  if (!enabled) return null;

  if (mode === 'schematic') {
    return (
      <EffectComposer enableNormalPass={false} multisampling={0}>
        <SMAA />
      </EffectComposer>
    );
  }

  return (
    <EffectComposer enableNormalPass={false} multisampling={0}>
      <N8AO aoRadius={0.5} intensity={3} distanceFalloff={0.7} quality="medium" halfRes />
      <Bloom intensity={0.32} luminanceThreshold={0.85} luminanceSmoothing={0.3} mipmapBlur />
      <SMAA />
      <Vignette offset={0.32} darkness={0.55} blendFunction={BlendFunction.NORMAL} />
    </EffectComposer>
  );
}
