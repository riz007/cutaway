export interface BodyParams {
  zNose: number;
  zTail: number;
  zBonnetEnd: number;
  zScreenTop: number;
  zRoofEnd: number;
  zDeckStart: number;
  noseY: number;
  bonnetY: number;
  roofY: number;
  deckY: number;
  tailY: number;
  sillY: number;
  halfWidth: number;
  zAxleF: number;
  zAxleR: number;
  hubY: number;
  archRadius: number;
  tumblehome: number;
  planRound: number;
  bed: boolean;
  zBPillar: number;
}

export type BodyRegion =
  | 'front'
  | 'rear'
  | 'hood'
  | 'roof'
  | 'deck'
  | 'flank_l'
  | 'flank_r'
  | 'windscreen'
  | 'backlight'
  | 'side_l'
  | 'side_r';

export interface Station {
  z: number;
  bottom: number;
  belt: number;
  edgeY: number;
  top: number;
  width: number;
  beltWidth: number;
  edgeWidth: number;
}

// Each half cross-section runs from the sill, up the door skin to the
// beltline, up the side glass to the roof edge, then across the crown.
const SIDE = 10;
const GREENHOUSE = 7;
const CROWN = 10;
export const J_BELT = SIDE - 1;
export const J_EDGE = J_BELT + GREENHOUSE - 1;
export const J_CENTER = J_EDGE + CROWN - 1;
export const RING = 2 * J_CENTER + 1;

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function polyline(points: [number, number][], z: number): number {
  if (z <= points[0]![0]) return points[0]![1];
  for (let i = 1; i < points.length; i += 1) {
    const [z1, y1] = points[i]!;
    const [z0, y0] = points[i - 1]!;
    if (z <= z1) return z1 - z0 < 1e-6 ? y1 : lerp(y0, y1, (z - z0) / (z1 - z0));
  }
  return points[points.length - 1]![1];
}

function smoothed(sample: (z: number) => number, from: number, to: number, sigma: number): (z: number) => number {
  const count = 480;
  const step = (to - from) / (count - 1);
  const raw = Array.from({ length: count }, (_, i) => sample(from + i * step));
  const reach = Math.ceil((2.5 * sigma) / step);
  const out = raw.map((_, i) => {
    let sum = 0;
    let weight = 0;
    for (let k = -reach; k <= reach; k += 1) {
      const value = raw[Math.min(count - 1, Math.max(0, i + k))]!;
      const w = Math.exp(-0.5 * ((k * step) / sigma) ** 2);
      sum += value * w;
      weight += w;
    }
    return sum / weight;
  });
  return (z: number) => {
    const t = Math.min(count - 1, Math.max(0, (z - from) / step));
    const i = Math.min(count - 2, Math.floor(t));
    return lerp(out[i]!, out[i + 1]!, t - i);
  };
}

export function bodyProfile(p: BodyParams): (z: number) => Station {
  const topLine = smoothed(
    (z) =>
      polyline(
        [
          [p.zNose, p.noseY],
          [p.zBonnetEnd, p.bonnetY],
          [p.zScreenTop, p.roofY],
          [p.zRoofEnd, p.roofY],
          [p.zDeckStart, p.deckY],
          [p.zTail, p.tailY],
        ],
        z,
      ),
    p.zNose,
    p.zTail,
    0.07,
  );

  const beltLine = (z: number) =>
    polyline(
      [
        [p.zNose, p.noseY],
        [p.zBonnetEnd, p.bonnetY],
        [p.zDeckStart, Math.max(p.deckY, p.bonnetY + 0.04)],
        [p.zTail, p.tailY],
      ],
      z,
    ) - 0.035;

  const roofSpan = Math.max(0.1, p.zRoofEnd - p.zScreenTop);
  const rcFront = p.halfWidth * 0.4 * p.planRound;
  const rcRear = p.halfWidth * 0.3 * p.planRound;

  const corner = (d: number, rc: number) => (d >= rc ? 0 : rc - Math.sqrt(Math.max(0, rc * rc - (rc - d) ** 2)));

  return (z: number): Station => {
    const fromNose = z - p.zNose;
    const fromTail = p.zTail - z;

    const bow = 0.022 * Math.sin(Math.PI * clamp01((z - p.zScreenTop) / roofSpan));
    const roundover = 0.06 * (1 - smoothstep(0, 0.22, fromNose)) + 0.05 * (1 - smoothstep(0, 0.18, fromTail));
    const top = topLine(z) + bow - roundover;

    const crownGuess = top - 0.045 - beltLine(z);
    const greenhouse = smoothstep(0.02, 0.16, crownGuess);
    const crown = lerp(0.035, 0.06, greenhouse);
    const edgeY = top - crown;
    const belt = Math.min(beltLine(z), edgeY);

    let width = p.halfWidth - corner(fromNose, rcFront) - corner(fromTail, rcRear);
    for (const axle of [p.zAxleF, p.zAxleR]) width *= 1 + 0.014 * Math.exp(-(((z - axle) / 0.32) ** 2));

    const chin = 0.07 * (1 - smoothstep(0, 0.4, fromNose)) + 0.06 * (1 - smoothstep(0, 0.35, fromTail));
    let bottom = p.sillY + chin;
    for (const axle of [p.zAxleF, p.zAxleR]) {
      const dz = Math.abs(z - axle);
      if (dz < p.archRadius) bottom = Math.max(bottom, p.hubY + Math.sqrt(p.archRadius ** 2 - dz * dz));
    }
    bottom = Math.min(bottom, belt - 0.06);

    return {
      z,
      bottom,
      belt,
      edgeY,
      top,
      width,
      beltWidth: width * 0.975,
      edgeWidth: width * lerp(0.94, p.tumblehome, greenhouse),
    };
  };
}

// Half-section point j (0 at the sill, J_CENTER on the centreline) as [x, y].
export function sectionPoint(s: Station, j: number): [number, number] {
  if (j <= J_BELT) {
    const u = j / J_BELT;
    const bulge = u < 0.35 ? 1 - 0.055 * (1 - u / 0.35) ** 2 : 1 - 0.025 * ((u - 0.35) / 0.65) ** 2;
    return [s.width * bulge, lerp(s.bottom, s.belt, u)];
  }
  if (j <= J_EDGE) {
    const v = (j - J_BELT) / (J_EDGE - J_BELT);
    const x = lerp(s.beltWidth, s.edgeWidth, v) + (s.beltWidth - s.edgeWidth) * 0.12 * Math.sin(Math.PI * v);
    return [x, lerp(s.belt, s.edgeY, v)];
  }
  const theta = ((j - J_EDGE) / (J_CENTER - J_EDGE)) * (Math.PI / 2);
  const exponent = 2 / 3;
  const x = j === J_CENTER ? 0 : s.edgeWidth * Math.cos(theta) ** exponent;
  return [x, s.edgeY + (s.top - s.edgeY) * Math.sin(theta) ** exponent];
}

// Ring index k runs over the right half (x > 0) from the sill to the
// centreline, then down the left half.
export function ringPoint(s: Station, k: number): [number, number] {
  if (k <= J_CENTER) return sectionPoint(s, k);
  const [x, y] = sectionPoint(s, RING - 1 - k);
  return [-x, y];
}

export function stationCount(lod: 0 | 1): number {
  return lod === 0 ? 150 : 76;
}

export function stationZ(p: BodyParams, index: number, count: number): number {
  return lerp(p.zNose, p.zTail, index / (count - 1));
}

// Which panel owns the quad between ring points k and k + 1 at the given z.
export function regionOf(p: BodyParams, zc: number, k: number): BodyRegion | null {
  const right = k < J_CENTER;
  const j = right ? k : RING - 2 - k;
  const side = right ? 'r' : 'l';

  if (j < J_BELT) {
    if (zc < p.zAxleF - p.archRadius) return 'front';
    if (zc > p.zAxleR + p.archRadius) return 'rear';
    return `flank_${side}`;
  }

  if (zc <= p.zBonnetEnd) return 'hood';
  if (zc >= p.zDeckStart) return p.bed ? null : 'deck';

  const inScreen = zc < p.zScreenTop - 0.03;
  const inBack = zc > p.zRoofEnd + 0.02;

  if (j < J_EDGE) {
    if (zc < p.zScreenTop + 0.03 || zc > p.zRoofEnd - 0.05) return 'roof';
    if (Math.abs(zc - p.zBPillar) < 0.05) return 'roof';
    return `side_${side}`;
  }
  if (j < J_EDGE + 2) return 'roof';
  if (inScreen) return 'windscreen';
  if (inBack) return 'backlight';
  return 'roof';
}

export const GLASS_REGIONS: ReadonlySet<BodyRegion> = new Set(['windscreen', 'backlight', 'side_l', 'side_r']);
