import { describe, expect, it } from 'vitest';
import { validateRegistries } from '@/domain/validate';
import {
  ARCHETYPES,
  ARCHETYPE_IDS,
  COMPONENTS,
  COMPONENTS_BY_ID,
  VEHICLES,
  appliesTo,
  componentsFor,
  getRelated,
} from '@/domain/registry';

describe('registry integrity', () => {
  it('passes every schema and cross-reference check', () => {
    expect(validateRegistries()).toEqual([]);
  });

  it('gives every spec sheet at least one citation', () => {
    for (const vehicle of VEHICLES) {
      for (const trim of vehicle.trims) {
        expect(trim.specs.sources.length).toBeGreaterThan(0);
      }
    }
  });

  it('labels unverified figures as class-typical rather than as manufacturer specs', () => {
    for (const vehicle of VEHICLES) {
      for (const trim of vehicle.trims) {
        for (const source of trim.specs.sources) {
          expect(['class_typical', 'manufacturer', 'independent']).toContain(source.kind);
          if (source.kind === 'manufacturer') expect(source.url).toBeDefined();
        }
      }
    }
  });

  it('catalogues Deepal once, under Changan, with the alias retained', () => {
    const deepal = VEHICLES.filter((v) => v.model.includes('Deepal'));
    expect(deepal.length).toBeGreaterThan(0);
    for (const vehicle of deepal) {
      expect(vehicle.brand).toBe('Changan');
      expect(vehicle.brandAliases).toContain('Deepal');
    }
    expect(VEHICLES.some((v) => v.brand === 'Deepal')).toBe(false);
  });

  it('only fits a trim with a powertrain its archetype offers', () => {
    for (const vehicle of VEHICLES) {
      for (const trim of vehicle.trims) {
        expect(ARCHETYPES[vehicle.archetype].powertrains).toContain(trim.powertrain);
      }
    }
  });
});

describe('cross-system links', () => {
  it('resolves relatedTo in both directions', () => {
    const block = getRelated('powertrain.engine_block').map((c) => c.id);
    expect(block).toContain('cooling.water_jacket');

    const jacket = getRelated('cooling.water_jacket').map((c) => c.id);
    expect(jacket).toContain('powertrain.engine_block');
  });

  it('never links a component to itself', () => {
    for (const component of COMPONENTS) {
      expect(getRelated(component.id).map((c) => c.id)).not.toContain(component.id);
    }
  });

  it('links the heater core across the cooling and climate boundary', () => {
    const related = getRelated('cooling.heater_core').map((c) => c.id);
    expect(related).toContain('hvac.blower');
  });
});

describe('configuration filtering', () => {
  it('drops the fuel system from a battery-electric car', () => {
    const bev = componentsFor({ archetype: 'bev_skateboard', powertrain: 'bev' });
    expect(bev.some((c) => c.system === 'fuel')).toBe(false);
    expect(bev.some((c) => c.id === 'powertrain.engine_block')).toBe(false);
    expect(bev.some((c) => c.id === 'powertrain.hv_battery')).toBe(true);
  });

  it('keeps the alternator on a combustion car and swaps it for a converter on an electrified one', () => {
    const petrol = componentsFor({ archetype: 'sedan_c', powertrain: 'na_petrol' }).map((c) => c.id);
    const hybrid = componentsFor({ archetype: 'sedan_c', powertrain: 'hev_series_parallel' }).map((c) => c.id);

    expect(petrol).toContain('electrical.alternator');
    expect(petrol).not.toContain('electrical.dcdc_converter');
    expect(hybrid).not.toContain('electrical.alternator');
    expect(hybrid).toContain('electrical.dcdc_converter');
  });

  it('gives only the body-on-frame archetypes a transfer case', () => {
    for (const archetype of ARCHETYPE_IDS) {
      const powertrain = ARCHETYPES[archetype].powertrains[0]!;
      const ids = componentsFor({ archetype, powertrain }).map((c) => c.id);
      const expected = archetype === 'pickup' || archetype === 'ppv';
      expect(ids.includes('drivetrain.transfer_case')).toBe(expected);
    }
  });

  it('treats an omitted appliesTo as universal', () => {
    expect(appliesTo(undefined, { archetype: 'cuv_b', powertrain: 'bev' })).toBe(true);
  });
});

describe('safety metadata', () => {
  it('flags every high-voltage component as a hazard', () => {
    const hvIds = [
      'powertrain.hv_battery',
      'powertrain.traction_motor',
      'electrical.inverter',
      'electrical.hv_cable',
      'electrical.contactor',
      'electrical.service_disconnect',
      'electrical.bms',
      'electrical.obc',
      'electrical.dcdc_converter',
    ];
    for (const id of hvIds) {
      expect(COMPONENTS_BY_ID.get(id)?.hazard, id).toBe('high_voltage');
    }
  });

  it('flags airbags and pretensioners as pyrotechnic', () => {
    for (const id of ['safety_adas.airbag_front', 'safety_adas.airbag_curtain', 'safety_adas.pretensioner']) {
      expect(COMPONENTS_BY_ID.get(id)?.hazard, id).toBe('pyrotechnic');
    }
  });
});
