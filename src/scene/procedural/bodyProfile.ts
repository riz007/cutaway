import type { ArchetypeId } from '@/domain/types';

export interface BodyStyle {
  bonnet: number;
  windscreen: number;
  roof: number;
  backlight: number;
  deck: number;

  noseY: number;
  bonnetY: number;
  deckY: number;
  tailY: number;
  sillY: number;

  bed: boolean;
  archScale: number;
}

export const BODY_STYLES: Record<ArchetypeId, BodyStyle> = {
  hatch_b: {
    bonnet: 0.2,
    windscreen: 0.17,
    roof: 0.33,
    backlight: 0.2,
    deck: 0.1,
    noseY: 0.46,
    bonnetY: 0.62,
    deckY: 0.66,
    tailY: 0.58,
    sillY: 0.2,
    bed: false,
    archScale: 1.16,
  },

  sedan_c: {
    bonnet: 0.23,
    windscreen: 0.16,
    roof: 0.28,
    backlight: 0.16,
    deck: 0.17,
    noseY: 0.42,
    bonnetY: 0.6,
    deckY: 0.72,
    tailY: 0.62,
    sillY: 0.19,
    bed: false,
    archScale: 1.14,
  },

  cuv_b: {
    bonnet: 0.21,
    windscreen: 0.15,
    roof: 0.36,
    backlight: 0.17,
    deck: 0.11,
    noseY: 0.46,
    bonnetY: 0.66,
    deckY: 0.66,
    tailY: 0.54,
    sillY: 0.22,
    bed: false,
    archScale: 1.18,
  },
  suv_c: {
    bonnet: 0.22,
    windscreen: 0.14,
    roof: 0.4,
    backlight: 0.14,
    deck: 0.1,
    noseY: 0.46,
    bonnetY: 0.62,
    deckY: 0.68,
    tailY: 0.58,
    sillY: 0.23,
    bed: false,
    archScale: 1.2,
  },

  pickup: {
    bonnet: 0.26,
    windscreen: 0.11,
    roof: 0.26,
    backlight: 0.05,
    deck: 0.32,
    noseY: 0.48,
    bonnetY: 0.64,
    deckY: 0.63,
    tailY: 0.63,
    sillY: 0.24,
    bed: true,
    archScale: 1.22,
  },

  ppv: {
    bonnet: 0.24,
    windscreen: 0.12,
    roof: 0.44,
    backlight: 0.1,
    deck: 0.1,
    noseY: 0.48,
    bonnetY: 0.64,
    deckY: 0.7,
    tailY: 0.64,
    sillY: 0.24,
    bed: false,
    archScale: 1.2,
  },

  mpv_van: {
    bonnet: 0.13,
    windscreen: 0.2,
    roof: 0.43,
    backlight: 0.14,
    deck: 0.1,
    noseY: 0.4,
    bonnetY: 0.56,
    deckY: 0.7,
    tailY: 0.62,
    sillY: 0.2,
    bed: false,
    archScale: 1.16,
  },

  bev_skateboard: {
    bonnet: 0.16,
    windscreen: 0.19,
    roof: 0.36,
    backlight: 0.21,
    deck: 0.08,
    noseY: 0.36,
    bonnetY: 0.5,
    deckY: 0.62,
    tailY: 0.54,
    sillY: 0.17,
    bed: false,
    archScale: 1.12,
  },
};

export interface BodyLandmarks {
  zNose: number;
  zBonnetEnd: number;
  zScreenTop: number;
  zRoofEnd: number;
  zDeckStart: number;
  zTail: number;
  noseY: number;
  bonnetY: number;
  roofY: number;
  deckY: number;
  tailY: number;
  sillY: number;
}

export interface BodyShape {
  landmarks: BodyLandmarks;
  points: [number, number][];

  holes: [number, number][][];
}

interface ProfileInput {
  length: number;
  height: number;
  zNose: number;
  zAxleF: number;
  zAxleR: number;
  groundClearance: number;
  wheelRadius: number;
  style: BodyStyle;
}

function archPoints(
  zAxle: number,
  hubY: number,
  radius: number,
  sillY: number,
  segments = 14,
): [number, number][] {
  const drop = sillY - hubY;
  const safeRadius = Math.max(radius, Math.abs(drop) + 0.03);
  const start = Math.asin(Math.max(-1, Math.min(1, drop / safeRadius)));
  const end = Math.PI - start;

  const points: [number, number][] = [];
  for (let i = 0; i <= segments; i += 1) {
    const angle = start + ((end - start) * i) / segments;
    points.push([zAxle + safeRadius * Math.cos(angle), hubY + safeRadius * Math.sin(angle)]);
  }
  return points;
}

export function buildBodyShape(input: ProfileInput): BodyShape {
  const { length, height, zNose, zAxleF, zAxleR, wheelRadius, style } = input;

  const spans = style.bonnet + style.windscreen + style.roof + style.backlight + style.deck;
  const run = (fraction: number) => (fraction / spans) * length;

  const zBonnetEnd = zNose + run(style.bonnet);
  const zScreenTop = zBonnetEnd + run(style.windscreen);
  const zRoofEnd = zScreenTop + run(style.roof);
  const zDeckStart = zRoofEnd + run(style.backlight);
  const zTail = zNose + length;

  const landmarks: BodyLandmarks = {
    zNose,
    zBonnetEnd,
    zScreenTop,
    zRoofEnd,
    zDeckStart,
    zTail,
    noseY: height * style.noseY,
    bonnetY: height * style.bonnetY,
    roofY: height,
    deckY: height * style.deckY,
    tailY: height * style.tailY,
    sillY: height * style.sillY,
  };

  const hubY = wheelRadius;
  const archRadius = wheelRadius * style.archScale;

  const upper: [number, number][] = [
    [landmarks.zNose, landmarks.sillY],
    [landmarks.zNose, landmarks.noseY],
    [zBonnetEnd, landmarks.bonnetY],
    [zScreenTop, landmarks.roofY],
    [zRoofEnd, landmarks.roofY],
  ];

  if (style.bed) {
    upper.push([zDeckStart, landmarks.deckY], [zTail, landmarks.tailY]);
  } else {
    upper.push([zDeckStart, landmarks.deckY], [zTail, landmarks.tailY]);
  }

  const lower: [number, number][] = [
    [zTail, landmarks.sillY],
    ...archPoints(zAxleR, hubY, archRadius, landmarks.sillY),
    ...archPoints(zAxleF, hubY, archRadius, landmarks.sillY),
  ];

  const holes: [number, number][][] = [];
  const winBottom = landmarks.deckY + 0.05;
  const winTop = landmarks.roofY - 0.09;
  const pillarZ = (y: number) =>
    zBonnetEnd + ((y - landmarks.bonnetY) / Math.max(0.05, landmarks.roofY - landmarks.bonnetY)) * (zScreenTop - zBonnetEnd);

  const winFrontBottom = pillarZ(winBottom) + 0.1;
  const winFrontTop = pillarZ(winTop) + 0.07;
  const winRearTop = zRoofEnd - 0.08;
  const winRearBottom = zRoofEnd - 0.02;

  if (winTop - winBottom > 0.14 && winRearTop - winFrontTop > 0.25) {
    holes.push([
      [winFrontBottom, winBottom],
      [winFrontTop, winTop],
      [winRearTop, winTop],
      [winRearBottom, winBottom],
    ]);
  }

  return { landmarks, points: [...upper, ...lower], holes };
}
