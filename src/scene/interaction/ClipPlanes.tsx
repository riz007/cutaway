import { useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useAppStore } from '@/app/store/appStore';

const AXES: Record<'x' | 'y' | 'z', THREE.Vector3> = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};

export function ClipPlanes() {
  const { gl, invalidate } = useThree();
  const sections = useAppStore((s) => s.sections);

  useEffect(() => {
    const planes = sections
      .filter((s) => s.enabled)
      .map((s) => {
        const normal = AXES[s.id].clone().multiplyScalar(s.flipped ? -1 : 1);
        return new THREE.Plane(normal, s.flipped ? s.offset : -s.offset);
      });

    gl.localClippingEnabled = planes.length > 0;
    gl.clippingPlanes = planes;
    invalidate();

    return () => {
      gl.clippingPlanes = [];
      gl.localClippingEnabled = false;
    };
  }, [gl, sections, invalidate]);

  return null;
}
