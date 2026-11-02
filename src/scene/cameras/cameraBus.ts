import type { ElementRef } from 'react';
import type { CameraControls } from '@react-three/drei';

export type Controls = ElementRef<typeof CameraControls>;

export const cameraBus: { controls: Controls | null; recenter: (() => void) | null } = {
  controls: null,
  recenter: null,
};

const ORBIT_STEP = Math.PI / 10;

export function orbit(direction: 'left' | 'right' | 'up' | 'down', smooth = true): void {
  const controls = cameraBus.controls;
  if (!controls) return;
  const azimuth = direction === 'left' ? ORBIT_STEP : direction === 'right' ? -ORBIT_STEP : 0;
  const polar = direction === 'up' ? -ORBIT_STEP / 2 : direction === 'down' ? ORBIT_STEP / 2 : 0;
  void controls.rotate(azimuth, polar, smooth);
}

export function zoom(direction: 'in' | 'out', smooth = true): void {
  const controls = cameraBus.controls;
  if (!controls) return;
  void controls.dolly(controls.distance * (direction === 'in' ? 0.22 : -0.28), smooth);
}

export function recenter(): void {
  cameraBus.recenter?.();
}
