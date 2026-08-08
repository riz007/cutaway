import { useMemo } from 'react';
import type { SystemId } from '@/domain/types';
import { COMPONENTS_BY_ID, SYSTEMS } from '@/domain/registry';
import { useAppStore, useVehicleAndTrim } from '@/app/store/appStore';
import { useSimReadouts } from '@/sim/simStore';
import type { IgnitionPosition } from '@/sim/electrical';
import type { TransferRange } from '@/sim/drivetrain';
import { useT, type TranslationKey } from '@/i18n';
import { Card, LabelledSlider, Readout, SegmentedControl, Switch } from '../primitives';

const SCENARIO_SYSTEMS: SystemId[] = [
  'powertrain',
  'braking',
  'cooling',
  'fuel',
  'electrical',
  'hvac',
  'drivetrain',
  'air',
  'lubrication',
];

function useScenarioSystem(): SystemId {
  const activeSystems = useAppStore((s) => s.activeSystems);
  const selectedComponentId = useAppStore((s) => s.selectedComponentId);

  return useMemo(() => {
    if (activeSystems.size === 1) {
      const only = [...activeSystems][0]!;
      if (SCENARIO_SYSTEMS.includes(only)) return only;
    }
    if (selectedComponentId) {
      const system = COMPONENTS_BY_ID.get(selectedComponentId)?.system;
      if (system && SCENARIO_SYSTEMS.includes(system)) return system;
    }
    return 'powertrain';
  }, [activeSystems, selectedComponentId]);
}

export function SimulationPanel() {
  const t = useT();
  const { trim } = useVehicleAndTrim();
  const scenarioSystem = useScenarioSystem();

  const controls = useAppStore((s) => s.controls);
  const setControls = useAppStore((s) => s.setControls);
  const readouts = useSimReadouts();

  const hasEngine = trim.powertrain !== 'bev';
  const hasPack = ['hev_series_parallel', 'phev_dmi', 'erev', 'bev'].includes(trim.powertrain);
  const isBodyOnFrame = trim.drivetrain === '4WD_part_time';
  const fullIgnitionSwitch = scenarioSystem === 'electrical' || scenarioSystem === 'fuel';

  return (
    <div className="space-y-3">
      <Card
        title={t('transport.scenario')}
        description={t(`scenario.${scenarioSystem}` as TranslationKey)}
        action={
          <span className="shrink-0 text-2xs text-subtle">
            {t(SYSTEMS[scenarioSystem].labelKey as TranslationKey)}
          </span>
        }
      >
        <div className="space-y-3.5">
          {hasEngine && (
            <div className="space-y-1.5">
              <span className="block text-2xs font-medium text-muted">{t('control.ignition')}</span>
              <SegmentedControl<IgnitionPosition>
                ariaLabel={t('control.ignition')}
                value={fullIgnitionSwitch || controls.ignition === 'off' ? controls.ignition : 'on'}
                onChange={(ignition) => setControls({ ignition })}
                options={
                  fullIgnitionSwitch
                    ? [
                        { id: 'off', label: t('control.ignition.off') },
                        { id: 'accessory', label: t('control.ignition.accessory') },
                        { id: 'on', label: t('control.ignition.on') },
                        { id: 'crank', label: t('control.ignition.crank') },
                      ]
                    : [
                        { id: 'off', label: t('control.ignition.off') },
                        { id: 'on', label: t('control.ignition.on') },
                      ]
                }
              />
            </div>
          )}

          {isBodyOnFrame && (
            <div className="space-y-1.5">
              <span className="block text-2xs font-medium text-muted">{t('control.range')}</span>
              <SegmentedControl<TransferRange>
                ariaLabel={t('control.range')}
                value={controls.transferRange}
                onChange={(transferRange) => setControls({ transferRange })}
                options={[
                  { id: 'H2', label: t('control.range.H2') },
                  { id: 'H4', label: t('control.range.H4') },
                  { id: 'L4', label: t('control.range.L4') },
                ]}
              />
            </div>
          )}

          {scenarioSystem === 'drivetrain' && (
            <LabelledSlider
              id="steering"
              label={t('control.steering')}
              value={controls.steeringAngle}
              min={-0.5}
              max={0.5}
              step={0.01}
              onChange={(steeringAngle) => setControls({ steeringAngle })}
              format={(v) => `${((v * 180) / Math.PI).toFixed(0)}°`}
            />
          )}

          <div className="grid gap-1.5 sm:grid-cols-2">
            <Switch
              id="ac"
              label={t('control.ac')}
              checked={controls.acOn}
              onCheckedChange={(acOn) => setControls({ acOn })}
            />
            <Switch
              id="blower"
              label={t('control.blower')}
              checked={controls.blowerOn}
              onCheckedChange={(blowerOn) => setControls({ blowerOn })}
            />
            <Switch
              id="heater"
              label={t('control.heater')}
              checked={controls.heaterOn}
              onCheckedChange={(heaterOn) => setControls({ heaterOn })}
            />
            <Switch
              id="headlights"
              label={t('control.headlights')}
              checked={controls.headlightsOn}
              onCheckedChange={(headlightsOn) => setControls({ headlightsOn })}
            />
          </div>
        </div>
      </Card>

      <Card title={t('transport.gauges')}>
        <dl className="grid grid-cols-2 gap-1.5">
          {hasEngine && (
            <Readout label={t('readout.rpm')} value={readouts.engineRpm.toFixed(0)} unit={t('units.rpm')} />
          )}
          <Readout label={t('readout.speed')} value={readouts.vehicleSpeedKph.toFixed(0)} unit={t('units.kph')} />
          {hasEngine && (
            <>
              <Readout
                label={t('readout.coolant')}
                value={readouts.coolantTempC.toFixed(0)}
                unit={t('units.celsius')}
                tone={readouts.coolantTempC > 108 ? 'danger' : readouts.coolantTempC > 100 ? 'warn' : 'neutral'}
              />
              <Readout label={t('readout.oil')} value={readouts.oilPressureBar.toFixed(1)} unit={t('units.bar')} />
              <Readout
                label={t('readout.thermostat')}
                value={readouts.thermostatOpen ? t('readout.thermostat.open') : t('readout.thermostat.closed')}
              />
              <Readout
                label={t('readout.fan')}
                value={(readouts.fanDuty * 100).toFixed(0)}
                unit={t('units.percent')}
              />
            </>
          )}
          <Readout
            label={t('readout.line_pressure')}
            value={readouts.linePressureBar.toFixed(0)}
            unit={t('units.bar')}
          />
          <Readout
            label={t('readout.rotor')}
            value={readouts.rotorTempC.toFixed(0)}
            unit={t('units.celsius')}
            tone={readouts.rotorTempC > 450 ? 'danger' : readouts.rotorTempC > 250 ? 'warn' : 'neutral'}
          />
          {hasPack && (
            <>
              <Readout label={t('readout.soc')} value={(readouts.soc * 100).toFixed(0)} unit={t('units.percent')} />
              <Readout label={t('readout.pack')} value={readouts.packKw.toFixed(0)} unit={t('units.kw')} />
              <Readout
                label={t('readout.regen')}
                value={(readouts.regenFraction * 100).toFixed(0)}
                unit={t('units.percent')}
              />
            </>
          )}
          <Readout label={t('readout.voltage')} value={readouts.systemVoltage.toFixed(1)} unit={t('units.volt')} />
          <Readout label={t('readout.load')} value={readouts.total12vLoadA.toFixed(0)} unit={t('units.amp')} />
          {readouts.hybridMode && (
            <Readout label={t('readout.hybridMode')} value={t(`hybrid.${readouts.hybridMode}` as TranslationKey)} />
          )}
        </dl>
      </Card>
    </div>
  );
}
