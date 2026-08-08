import type { ArchetypeId, Drivetrain, PowertrainId, SourceRef, Trim, Vehicle, VehicleDimensions } from '../types';
import { classTypicalSpecs } from './specDefaults';

const POWERTRAIN_TRIM_NAME: Record<PowertrainId, string> = {
  na_petrol: 'Petrol',
  turbo_petrol: 'Turbo petrol',
  turbo_diesel: 'Turbo diesel',
  hev_series_parallel: 'Hybrid',
  phev_dmi: 'Plug-in hybrid',
  erev: 'Range-extender EV',
  bev: 'Electric',
};

const DEFAULT_DRIVETRAIN: Record<ArchetypeId, Drivetrain> = {
  hatch_b: 'FWD',
  sedan_c: 'FWD',
  cuv_b: 'FWD',
  suv_c: 'FWD',
  pickup: '4WD_part_time',
  ppv: '4WD_part_time',
  mpv_van: 'FWD',
  bev_skateboard: 'RWD',
};

function trim(archetype: ArchetypeId, powertrain: PowertrainId, drivetrain?: Drivetrain): Trim {
  return {
    id: powertrain.replace(/_/g, '-'),
    name: POWERTRAIN_TRIM_NAME[powertrain],
    powertrain,
    drivetrain: drivetrain ?? DEFAULT_DRIVETRAIN[archetype],
    specs: classTypicalSpecs(archetype, powertrain),
    overrides: [],
  };
}

function dims(
  lengthMm: number,
  widthMm: number,
  heightMm: number,
  wheelbaseMm: number,
  source: SourceRef,
  extra: { groundClearanceMm?: number; wheelDiameterMm?: number } = {},
): VehicleDimensions {
  return { lengthMm, widthMm, heightMm, wheelbaseMm, ...extra, source };
}

const RETRIEVED = '2026-08-08';

const src = (label: string, url: string): SourceRef => ({
  label,
  url,
  retrieved: RETRIEVED,
  kind: 'independent',
});

interface VehicleSeed {
  brand: string;
  brandAliases?: string[];
  model: string;
  bodyStyle: string;
  archetype: ArchetypeId;
  powertrains: PowertrainId[];
  drivetrain?: Drivetrain;
  verificationNote?: string;
  dimensions?: VehicleDimensions;
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const SEEDS: VehicleSeed[] = [

  {
    brand: 'Toyota',
    model: 'Hilux',
    bodyStyle: 'Pickup',
    archetype: 'pickup',
    powertrains: ['turbo_diesel'],
    dimensions: dims(5325, 1855, 1815, 3085, src('Toyota Hilux Revo published specification', 'https://toyota-frontier.com/revo-specification/'), {
      groundClearanceMm: 310,
    }),
  },
  { brand: 'Toyota', model: 'Yaris', bodyStyle: 'Hatchback', archetype: 'hatch_b', powertrains: ['na_petrol'] },
  { brand: 'Toyota', model: 'Yaris Ativ', bodyStyle: 'Sedan', archetype: 'sedan_c', powertrains: ['na_petrol'] },
  {
    brand: 'Toyota',
    model: 'Yaris Cross',
    bodyStyle: 'Crossover',
    archetype: 'cuv_b',
    powertrains: ['na_petrol', 'hev_series_parallel'],
    dimensions: dims(4180, 1765, 1595, 2560, src('Toyota Yaris Cross dimensions', 'https://www.automobiledimension.com/model/toyota/yaris-cross'), {
      groundClearanceMm: 170,
    }),
  },
  {
    brand: 'Toyota',
    model: 'Corolla Cross',
    bodyStyle: 'Crossover',
    archetype: 'cuv_b',
    powertrains: ['na_petrol', 'hev_series_parallel'],
    dimensions: dims(4460, 1825, 1620, 2640, src('Toyota Corolla Cross dimensions', 'https://www.automobiledimension.com/model/toyota/corolla-cross')),
  },
  {
    brand: 'Toyota',
    model: 'Corolla Altis',
    bodyStyle: 'Sedan',
    archetype: 'sedan_c',
    powertrains: ['na_petrol', 'hev_series_parallel'],
  },
  {
    brand: 'Toyota',
    model: 'Fortuner',
    bodyStyle: 'SUV',
    archetype: 'ppv',
    powertrains: ['turbo_diesel'],
    dimensions: dims(4795, 1855, 1835, 2745, src('Toyota Fortuner dimensions', 'https://www.carsguide.com.au/toyota/fortuner/car-dimensions/2026'), {
      groundClearanceMm: 225,
    }),
  },
  { brand: 'Toyota', model: 'Veloz', bodyStyle: 'MPV', archetype: 'mpv_van', powertrains: ['na_petrol'] },
  {
    brand: 'Toyota',
    model: 'Commuter',
    bodyStyle: 'Van',
    archetype: 'mpv_van',
    powertrains: ['turbo_diesel'],
    drivetrain: 'RWD',
  },

  {
    brand: 'Isuzu',
    model: 'D-Max',
    bodyStyle: 'Pickup',
    archetype: 'pickup',
    powertrains: ['turbo_diesel'],
    dimensions: dims(5265, 1870, 1790, 3125, src('Isuzu D-Max dimensions', 'https://www.carsguide.com.au/isuzu/d-max/car-dimensions/2025'), {
      groundClearanceMm: 235,
    }),
  },
  { brand: 'Isuzu', model: 'MU-X', bodyStyle: 'SUV', archetype: 'ppv', powertrains: ['turbo_diesel'] },

  {
    brand: 'Honda',
    model: 'City',
    bodyStyle: 'Sedan',
    archetype: 'sedan_c',
    powertrains: ['turbo_petrol', 'hev_series_parallel'],
  },
  {
    brand: 'Honda',
    model: 'City Hatchback',
    bodyStyle: 'Hatchback',
    archetype: 'hatch_b',
    powertrains: ['turbo_petrol', 'hev_series_parallel'],
  },
  {
    brand: 'Honda',
    model: 'Civic',
    bodyStyle: 'Sedan',
    archetype: 'sedan_c',
    powertrains: ['turbo_petrol', 'hev_series_parallel'],
    dimensions: dims(4606, 1802, 1415, 2735, src('Honda Civic sedan dimensions', 'https://www.carsguide.com.au/honda/civic/car-dimensions/2025')),
  },
  {
    brand: 'Honda',
    model: 'HR-V',
    bodyStyle: 'Crossover',
    archetype: 'cuv_b',
    powertrains: ['turbo_petrol', 'hev_series_parallel'],
  },
  {
    brand: 'Honda',
    model: 'CR-V',
    bodyStyle: 'SUV',
    archetype: 'suv_c',
    powertrains: ['turbo_petrol', 'hev_series_parallel'],
  },
  { brand: 'Honda', model: 'BR-V', bodyStyle: 'MPV', archetype: 'mpv_van', powertrains: ['na_petrol'] },

  { brand: 'Mitsubishi', model: 'Triton', bodyStyle: 'Pickup', archetype: 'pickup', powertrains: ['turbo_diesel'] },
  { brand: 'Mitsubishi', model: 'Pajero Sport', bodyStyle: 'SUV', archetype: 'ppv', powertrains: ['turbo_diesel'] },
  { brand: 'Mitsubishi', model: 'XFORCE', bodyStyle: 'Crossover', archetype: 'cuv_b', powertrains: ['na_petrol'] },
  {
    brand: 'Mitsubishi',
    model: 'Xpander',
    bodyStyle: 'MPV',
    archetype: 'mpv_van',
    powertrains: ['na_petrol'],
    dimensions: dims(4595, 1750, 1700, 2775, src('Mitsubishi Xpander dimensions', 'https://en.wikipedia.org/wiki/Mitsubishi_Xpander'), {
      groundClearanceMm: 205,
    }),
  },

  {
    brand: 'Ford',
    model: 'Ranger',
    bodyStyle: 'Pickup',
    archetype: 'pickup',
    powertrains: ['turbo_diesel'],
    dimensions: dims(5349, 1918, 1877, 3269, src('Ford Ranger SuperCrew dimensions', 'https://www.carsguide.com.au/ford/ranger/car-dimensions/2025')),
  },
  { brand: 'Ford', model: 'Everest', bodyStyle: 'SUV', archetype: 'ppv', powertrains: ['turbo_diesel'] },

  { brand: 'Nissan', model: 'Almera', bodyStyle: 'Sedan', archetype: 'sedan_c', powertrains: ['turbo_petrol'] },
  { brand: 'Nissan', model: 'Kicks', bodyStyle: 'Crossover', archetype: 'cuv_b', powertrains: ['erev'] },
  { brand: 'Nissan', model: 'Navara', bodyStyle: 'Pickup', archetype: 'pickup', powertrains: ['turbo_diesel'] },
  { brand: 'Nissan', model: 'Terra', bodyStyle: 'SUV', archetype: 'ppv', powertrains: ['turbo_diesel'] },

  { brand: 'Mazda', model: 'Mazda 2', bodyStyle: 'Hatchback', archetype: 'hatch_b', powertrains: ['na_petrol'] },
  { brand: 'Mazda', model: 'Mazda 3', bodyStyle: 'Sedan', archetype: 'sedan_c', powertrains: ['na_petrol'] },
  { brand: 'Mazda', model: 'CX-3', bodyStyle: 'Crossover', archetype: 'cuv_b', powertrains: ['na_petrol'] },
  { brand: 'Mazda', model: 'CX-30', bodyStyle: 'Crossover', archetype: 'cuv_b', powertrains: ['na_petrol'] },
  { brand: 'Mazda', model: 'CX-5', bodyStyle: 'SUV', archetype: 'suv_c', powertrains: ['na_petrol'] },

  { brand: 'BYD', model: 'Dolphin', bodyStyle: 'Hatchback', archetype: 'bev_skateboard', powertrains: ['bev'], drivetrain: 'FWD' },
  {
    brand: 'BYD',
    model: 'Atto 3',
    bodyStyle: 'Crossover',
    archetype: 'bev_skateboard',
    powertrains: ['bev'],
    drivetrain: 'FWD',
    dimensions: dims(4455, 1875, 1615, 2720, src('BYD Atto 3 dimensions', 'https://www.carsguide.com.au/byd/atto-3/car-dimensions/2025'), {
      groundClearanceMm: 175,
    }),
  },
  { brand: 'BYD', model: 'Seal', bodyStyle: 'Sedan', archetype: 'bev_skateboard', powertrains: ['bev'] },
  { brand: 'BYD', model: 'Sealion 7', bodyStyle: 'SUV', archetype: 'bev_skateboard', powertrains: ['bev'] },
  { brand: 'BYD', model: 'Sealion 6', bodyStyle: 'SUV', archetype: 'cuv_b', powertrains: ['phev_dmi'] },

  {
    brand: 'MG',
    model: 'MG4',
    bodyStyle: 'Hatchback',
    archetype: 'bev_skateboard',
    powertrains: ['bev'],
    dimensions: dims(4287, 1836, 1504, 2705, src('MG MG4 dimensions', 'https://www.carsguide.com.au/mg/mg4/car-dimensions/2025'), {
      groundClearanceMm: 150,
    }),
  },
  {
    brand: 'MG',
    model: 'MG S5',
    bodyStyle: 'Crossover',
    archetype: 'bev_skateboard',
    powertrains: ['bev'],
    verificationNote:
      'Propulsion not confirmed for the launch market. Verify against the manufacturer’s local site before publishing.',
  },
  { brand: 'MG', model: 'MG5', bodyStyle: 'Sedan', archetype: 'sedan_c', powertrains: ['na_petrol'] },
  { brand: 'MG', model: 'ZS', bodyStyle: 'Crossover', archetype: 'cuv_b', powertrains: ['na_petrol', 'bev'] },

  { brand: 'GWM', model: 'Ora Good Cat', bodyStyle: 'Hatchback', archetype: 'bev_skateboard', powertrains: ['bev'], drivetrain: 'FWD' },
  {
    brand: 'GWM',
    model: 'Haval H6',
    bodyStyle: 'SUV',
    archetype: 'suv_c',
    powertrains: ['hev_series_parallel', 'phev_dmi'],
  },
  { brand: 'GWM', model: 'Haval Jolion', bodyStyle: 'Crossover', archetype: 'cuv_b', powertrains: ['hev_series_parallel'] },

  {
    brand: 'Changan',
    brandAliases: ['Deepal'],
    model: 'Deepal S05',
    bodyStyle: 'Crossover',
    archetype: 'bev_skateboard',
    powertrains: ['bev', 'erev'],
    verificationNote:
      'Catalogued under both Changan and Deepal in the source data, and propulsion varies by market. Verify before publishing.',
  },
  {
    brand: 'Changan',
    brandAliases: ['Deepal'],
    model: 'Deepal S07',
    bodyStyle: 'SUV',
    archetype: 'bev_skateboard',
    powertrains: ['bev', 'erev'],
  },

  { brand: 'AION', model: 'Y Plus', bodyStyle: 'Crossover', archetype: 'bev_skateboard', powertrains: ['bev'], drivetrain: 'FWD' },
  { brand: 'AION', model: 'UT', bodyStyle: 'Hatchback', archetype: 'bev_skateboard', powertrains: ['bev'], drivetrain: 'FWD' },

  {
    brand: 'JAECOO',
    model: 'J5',
    bodyStyle: 'Crossover',
    archetype: 'cuv_b',
    powertrains: ['turbo_petrol'],
    verificationNote:
      'Source data labels this an EV; the model ships with combustion or electric propulsion depending on market. Verify before publishing.',
  },
  { brand: 'JAECOO', model: 'J7', bodyStyle: 'SUV', archetype: 'suv_c', powertrains: ['turbo_petrol', 'phev_dmi'] },
];

export const VEHICLES: Vehicle[] = SEEDS.map((seed) => ({
  id: `${slug(seed.brand)}-${slug(seed.model)}`,
  brand: seed.brand,
  ...(seed.brandAliases ? { brandAliases: seed.brandAliases } : {}),
  model: seed.model,
  bodyStyle: seed.bodyStyle,
  archetype: seed.archetype,
  trims: seed.powertrains.map((p) => trim(seed.archetype, p, seed.drivetrain)),
  disclaimerLevel: 'representative' as const,
  ...(seed.verificationNote ? { verificationNote: seed.verificationNote } : {}),
  ...(seed.dimensions ? { dimensions: seed.dimensions } : {}),
}));

export const VEHICLES_BY_ID: ReadonlyMap<string, Vehicle> = new Map(VEHICLES.map((v) => [v.id, v]));

export const BRANDS: string[] = [...new Set(VEHICLES.map((v) => v.brand))].sort();

export const DEFAULT_VEHICLE_ID = 'toyota-yaris-cross';
export const DEFAULT_TRIM_ID = 'hev-series-parallel';
