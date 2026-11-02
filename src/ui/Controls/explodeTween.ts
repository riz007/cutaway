import { create } from 'zustand';
import { useAppStore } from '@/app/store/appStore';

export const FULL_SWEEP_MS = 3600;

export const useExplodeTween = create<{ playing: boolean }>(() => ({ playing: false }));

let frame = 0;

export function cancelExplodeTween(): void {
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  useExplodeTween.setState({ playing: false });
}

// Linear in time on purpose: each part already eases and staggers within its
// own stage window, so a linear sweep reads as a choreographed sequence.
export function tweenExplode(to: number, onDone?: () => void): void {
  cancelExplodeTween();
  const { explode: from, reducedMotion, setExplode } = useAppStore.getState();
  const duration = Math.abs(to - from) * FULL_SWEEP_MS;

  if (reducedMotion || duration < 16 || typeof requestAnimationFrame === 'undefined') {
    setExplode(to, { snap: true });
    onDone?.();
    return;
  }

  useExplodeTween.setState({ playing: true });
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    setExplode(from + (to - from) * t);
    if (t < 1) {
      frame = requestAnimationFrame(step);
    } else {
      frame = 0;
      useExplodeTween.setState({ playing: false });
      onDone?.();
    }
  };
  frame = requestAnimationFrame(step);
}
