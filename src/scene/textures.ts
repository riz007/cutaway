import * as THREE from 'three';

const SIZE = 256;

function hash(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

function valueNoise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = smooth(x - xi);
  const yf = smooth(y - yi);
  const a = hash(xi, yi, seed);
  const b = hash(xi + 1, yi, seed);
  const c = hash(xi, yi + 1, seed);
  const d = hash(xi + 1, yi + 1, seed);
  return a * (1 - xf) * (1 - yf) + b * xf * (1 - yf) + c * (1 - xf) * yf + d * xf * yf;
}

function fbm(x: number, y: number, seed: number, octaves: number): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  for (let i = 0; i < octaves; i += 1) {
    value += amplitude * valueNoise(x * frequency, y * frequency, seed + i * 13);
    frequency *= 2;
    amplitude *= 0.5;
  }
  return value;
}

function heightField(scale: number, octaves: number, seed: number): Float32Array {
  const data = new Float32Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      data[y * SIZE + x] = fbm((x / SIZE) * scale, (y / SIZE) * scale, seed, octaves);
    }
  }
  return data;
}

function toTexture(pixels: Uint8ClampedArray<ArrayBuffer>, srgb: boolean): THREE.DataTexture {
  const texture = new THREE.DataTexture(pixels, SIZE, SIZE, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function roughnessTexture(scale: number, contrast: number, seed: number): THREE.DataTexture {
  const height = heightField(scale, 4, seed);
  const pixels = new Uint8ClampedArray(new ArrayBuffer(SIZE * SIZE * 4));
  for (let i = 0; i < SIZE * SIZE; i += 1) {
    const v = 0.5 + (height[i]! - 0.5) * contrast;
    const byte = Math.max(0, Math.min(255, Math.round(v * 255)));
    pixels[i * 4] = byte;
    pixels[i * 4 + 1] = byte;
    pixels[i * 4 + 2] = byte;
    pixels[i * 4 + 3] = 255;
  }
  return toTexture(pixels, false);
}

function normalTexture(scale: number, strength: number, seed: number): THREE.DataTexture {
  const height = heightField(scale, 4, seed);
  const pixels = new Uint8ClampedArray(new ArrayBuffer(SIZE * SIZE * 4));
  const at = (x: number, y: number) => height[((y + SIZE) % SIZE) * SIZE + ((x + SIZE) % SIZE)]!;

  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const length = Math.hypot(dx, dy, 1);
      const i = (y * SIZE + x) * 4;
      pixels[i] = Math.round(((-dx / length) * 0.5 + 0.5) * 255);
      pixels[i + 1] = Math.round(((-dy / length) * 0.5 + 0.5) * 255);
      pixels[i + 2] = Math.round((1 / length) * 0.5 * 255 + 127);
      pixels[i + 3] = 255;
    }
  }
  return toTexture(pixels, false);
}

let cache: {
  castRoughness: THREE.DataTexture;
  castNormal: THREE.DataTexture;
  machinedRoughness: THREE.DataTexture;
  machinedNormal: THREE.DataTexture;
  paintNormal: THREE.DataTexture;
  weaveNormal: THREE.DataTexture;
  weaveRoughness: THREE.DataTexture;
} | null = null;

export function surfaceMaps() {
  cache ??= {
    castRoughness: roughnessTexture(26, 0.85, 3),
    castNormal: normalTexture(26, 26, 3),
    machinedRoughness: roughnessTexture(90, 0.45, 11),
    machinedNormal: normalTexture(90, 7, 11),
    paintNormal: normalTexture(140, 2.2, 21),
    weaveNormal: normalTexture(160, 16, 31),
    weaveRoughness: roughnessTexture(160, 0.5, 31),
  };
  return cache;
}

export function disposeTextures(): void {
  if (!cache) return;
  for (const texture of Object.values(cache)) texture.dispose();
  cache = null;
}
