import type { Component, SystemId } from '../types';

const node = (system: SystemId, name: string) => `SYS_${system}__${name}`;

function c(
  system: SystemId,
  name: string,
  label: string,
  shortDescription: string,
  extra: Partial<Omit<Component, 'id' | 'nodeId' | 'system' | 'label' | 'shortDescription'>> = {},
): Component {
  const id = `${system === 'suspension_steering' ? 'suspension' : system}.${name}`;
  return {
    id,
    nodeId: node(system, name),
    system,
    label,
    shortDescription,
    contentSlug: id.replace(/\./g, '-'),
    relatedTo: [],
    ...extra,
  };
}

const ICE_ONLY = { powertrains: ['na_petrol', 'turbo_petrol', 'turbo_diesel'] } as const;
const HAS_ENGINE = {
  powertrains: ['na_petrol', 'turbo_petrol', 'turbo_diesel', 'hev_series_parallel', 'phev_dmi', 'erev'],
} as const;
const ELECTRIFIED = { powertrains: ['hev_series_parallel', 'phev_dmi', 'erev', 'bev'] } as const;
const PURE_EV = { powertrains: ['bev'] } as const;

export const COMPONENTS: Component[] = [
  c('powertrain', 'engine_block', 'Engine block', 'The cast structure that holds the cylinders, crankshaft and coolant jacket.', {
    appliesTo: HAS_ENGINE,
    relatedTo: ['cooling.water_jacket', 'lubrication.oil_gallery', 'drivetrain.transaxle'],
    hazard: 'hot_surface',
  }),
  c('powertrain', 'cylinder_head', 'Cylinder head', 'Caps the cylinders and carries the valves, camshafts and injectors.', {
    appliesTo: HAS_ENGINE,
    relatedTo: ['powertrain.camshaft_intake', 'powertrain.valve_intake', 'air.intake_manifold'],
    hazard: 'hot_surface',
  }),
  c('powertrain', 'head_gasket', 'Head gasket', 'Seals combustion pressure, coolant and oil between the block and the head.', {
    appliesTo: HAS_ENGINE,
    relatedTo: ['cooling.water_jacket'],
    failureModes: [
      { symptom: 'White exhaust smoke, coolant loss with no visible leak', cause: 'Gasket breach into a cylinder', severity: 'immobilising' },
      { symptom: 'Oil emulsified to a pale sludge on the filler cap', cause: 'Coolant crossing into the oil gallery', severity: 'immobilising' },
    ],
  }),
  c('powertrain', 'crankshaft', 'Crankshaft', 'Converts the pistons’ reciprocating motion into rotation.', {
    appliesTo: HAS_ENGINE,
    relatedTo: ['powertrain.connecting_rod', 'powertrain.flywheel', 'lubrication.main_bearing'],
  }),
  c('powertrain', 'piston', 'Piston', 'Takes the force of combustion and transmits it to the connecting rod.', {
    appliesTo: HAS_ENGINE,
    relatedTo: ['powertrain.connecting_rod', 'powertrain.piston_rings'],
    hazard: 'hot_surface',
  }),
  c('powertrain', 'piston_rings', 'Piston rings', 'Seal combustion gases above and meter oil off the bore below.', {
    appliesTo: HAS_ENGINE,
    relatedTo: ['lubrication.oil_gallery', 'air.pcv_valve'],
  }),
  c('powertrain', 'connecting_rod', 'Connecting rod', 'Links the piston to the crank throw.', { appliesTo: HAS_ENGINE }),
  c('powertrain', 'camshaft_intake', 'Intake camshaft', 'Its lobes open the intake valves in time with the crankshaft.', {
    appliesTo: HAS_ENGINE,
    relatedTo: ['powertrain.timing_chain', 'powertrain.vvt_actuator'],
  }),
  c('powertrain', 'camshaft_exhaust', 'Exhaust camshaft', 'Opens the exhaust valves to scavenge burnt gas.', {
    appliesTo: HAS_ENGINE,
    relatedTo: ['powertrain.timing_chain'],
  }),
  c('powertrain', 'valve_intake', 'Intake valve', 'Admits the air (or air–fuel) charge into the cylinder.', { appliesTo: HAS_ENGINE }),
  c('powertrain', 'valve_exhaust', 'Exhaust valve', 'Releases burnt gas into the exhaust port.', {
    appliesTo: HAS_ENGINE,
    hazard: 'hot_surface',
  }),
  c('powertrain', 'timing_chain', 'Timing chain', 'Keeps the camshafts in fixed phase with the crankshaft.', {
    appliesTo: HAS_ENGINE,
    relatedTo: ['lubrication.oil_pump'],
    serviceIntervalKm: 200000,
  }),
  c('powertrain', 'vvt_actuator', 'Variable valve timing actuator', 'Rotates the cam relative to its sprocket using oil pressure, shifting valve timing with load.', {
    appliesTo: HAS_ENGINE,
    relatedTo: ['lubrication.oil_pump'],
  }),
  c('powertrain', 'spark_plug', 'Spark plug', 'Ignites the compressed charge in a petrol engine.', {
    appliesTo: { powertrains: ['na_petrol', 'turbo_petrol', 'hev_series_parallel', 'phev_dmi', 'erev'] },
    relatedTo: ['electrical.ignition_coil'],
    serviceIntervalKm: 100000,
  }),
  c('powertrain', 'glow_plug', 'Glow plug', 'Pre-heats the combustion chamber so a cold diesel will fire.', {
    appliesTo: { powertrains: ['turbo_diesel'] },
    relatedTo: ['electrical.battery_12v'],
  }),
  c('powertrain', 'turbocharger', 'Turbocharger', 'Uses exhaust energy to drive a compressor that pressurises the intake.', {
    appliesTo: { powertrains: ['turbo_petrol', 'turbo_diesel'] },
    relatedTo: ['air.intercooler', 'air.exhaust_manifold', 'lubrication.oil_gallery'],
    hazard: 'hot_surface',
  }),
  c('powertrain', 'flywheel', 'Flywheel', 'Stores rotational inertia between power strokes and carries the starter ring gear.', {
    appliesTo: HAS_ENGINE,
    relatedTo: ['drivetrain.clutch', 'electrical.starter_motor'],
  }),
  c('powertrain', 'engine_mount', 'Engine mount', 'Carries the powertrain’s weight and isolates its vibration from the body.', {
    relatedTo: ['structure.front_rail'],
  }),
  c('powertrain', 'mg1', 'Motor-generator 1 (MG1)', 'Starts the engine and generates electricity; its speed sets the engine’s operating point.', {
    appliesTo: { powertrains: ['hev_series_parallel', 'phev_dmi', 'erev'] },
    relatedTo: ['powertrain.planetary_gearset', 'electrical.inverter'],
    hazard: 'high_voltage',
  }),
  c('powertrain', 'mg2', 'Motor-generator 2 (MG2)', 'Drives the wheels and recovers energy under braking.', {
    appliesTo: ELECTRIFIED,
    relatedTo: ['powertrain.planetary_gearset', 'braking.regen_blending', 'electrical.inverter'],
    hazard: 'high_voltage',
  }),
  c('powertrain', 'planetary_gearset', 'Power-split planetary gearset', 'Splits engine torque between the wheels and the generator with no clutches at all.', {
    appliesTo: { powertrains: ['hev_series_parallel'] },
    relatedTo: ['powertrain.mg1', 'powertrain.mg2'],
  }),
  c('powertrain', 'traction_motor', 'Traction motor', 'The electric machine that propels the vehicle.', {
    appliesTo: { powertrains: ['bev', 'erev'] },
    relatedTo: ['electrical.inverter', 'drivetrain.reduction_gear'],
    hazard: 'high_voltage',
  }),
  c('powertrain', 'hv_battery', 'High-voltage battery', 'Stores the traction energy; on a skateboard platform it is also a structural floor member.', {
    appliesTo: ELECTRIFIED,
    relatedTo: ['electrical.bms', 'cooling.battery_chiller', 'electrical.service_disconnect'],
    hazard: 'high_voltage',
  }),

  c('fuel', 'tank', 'Fuel tank', 'Holds the fuel, usually saddled over or ahead of the rear axle for crash protection.', {
    appliesTo: HAS_ENGINE,
    relatedTo: ['fuel.in_tank_pump', 'fuel.evap_canister', 'structure.rear_rail'],
    hazard: 'pressurised',
  }),
  c('fuel', 'in_tank_pump', 'In-tank fuel pump', 'Submerged pump that delivers fuel to the rail; the fuel itself cools it.', {
    appliesTo: HAS_ENGINE,
    relatedTo: ['fuel.fuel_filter', 'electrical.fuse_box_engine'],
  }),
  c('fuel', 'fuel_filter', 'Fuel filter', 'Traps particulates before they reach the injectors’ fine clearances.', {
    appliesTo: HAS_ENGINE,
    serviceIntervalKm: 40000,
  }),
  c('fuel', 'fuel_line', 'Fuel line', 'Carries fuel from the tank to the engine bay.', { appliesTo: HAS_ENGINE }),
  c('fuel', 'fuel_rail', 'Fuel rail', 'A pressurised manifold that feeds every injector at the same pressure.', {
    appliesTo: HAS_ENGINE,
    relatedTo: ['fuel.injector'],
    hazard: 'pressurised',
  }),
  c('fuel', 'injector', 'Fuel injector', 'A solenoid valve that atomises a metered pulse of fuel.', {
    appliesTo: HAS_ENGINE,
    relatedTo: ['fuel.fuel_rail', 'electrical.ecu_engine'],
  }),
  c('fuel', 'hp_pump', 'High-pressure pump', 'Raises diesel to common-rail pressure — well over 1,500 bar.', {
    appliesTo: { powertrains: ['turbo_diesel'] },
    relatedTo: ['fuel.fuel_rail'],
    hazard: 'pressurised',
  }),
  c('fuel', 'evap_canister', 'EVAP charcoal canister', 'Adsorbs fuel vapour from the tank and releases it to be burnt.', {
    appliesTo: { powertrains: ['na_petrol', 'turbo_petrol', 'hev_series_parallel', 'phev_dmi', 'erev'] },
    relatedTo: ['air.intake_manifold'],
  }),
  c('fuel', 'filler_neck', 'Filler neck', 'The filling path, sized and shaped to reject the wrong nozzle.', { appliesTo: HAS_ENGINE }),
  c('fuel', 'dpf', 'Diesel particulate filter', 'Traps soot and periodically burns it off in a regeneration cycle.', {
    appliesTo: { powertrains: ['turbo_diesel'] },
    relatedTo: ['air.catalytic_converter'],
    hazard: 'hot_surface',
  }),
  c('fuel', 'scr_tank', 'AdBlue / SCR tank', 'Holds urea solution that is dosed into the exhaust to reduce NOx.', {
    appliesTo: { powertrains: ['turbo_diesel'] },
    relatedTo: ['fuel.dpf'],
  }),

  c('lubrication', 'sump', 'Oil sump', 'The reservoir the oil drains back into.', { appliesTo: HAS_ENGINE }),
  c('lubrication', 'pickup', 'Oil pickup', 'Draws oil from the sump through a coarse strainer.', { appliesTo: HAS_ENGINE }),
  c('lubrication', 'oil_pump', 'Oil pump', 'Generates the gallery pressure everything else depends on.', {
    appliesTo: HAS_ENGINE,
    relatedTo: ['lubrication.oil_gallery', 'lubrication.pressure_sensor', 'powertrain.vvt_actuator'],
  }),
  c('lubrication', 'oil_filter', 'Oil filter', 'Removes wear debris; its bypass valve keeps oil flowing if it clogs.', {
    appliesTo: HAS_ENGINE,
    serviceIntervalKm: 10000,
  }),
  c('lubrication', 'oil_gallery', 'Oil gallery', 'Drilled passages that carry pressurised oil to the bearings and head.', { appliesTo: HAS_ENGINE }),
  c('lubrication', 'main_bearing', 'Main bearing', 'A plain bearing that rides on a wedge of oil, not on metal.', { appliesTo: HAS_ENGINE }),
  c('lubrication', 'pressure_sensor', 'Oil pressure sensor', 'Reports gallery pressure; the warning lamp means stop, not top up.', {
    appliesTo: HAS_ENGINE,
    relatedTo: ['electrical.ecu_engine', 'interior.instrument_cluster'],
  }),
  c('lubrication', 'oil_cooler', 'Oil cooler', 'Sheds heat from the oil, usually into the coolant circuit.', {
    appliesTo: HAS_ENGINE,
    relatedTo: ['cooling.radiator'],
  }),

  c('cooling', 'radiator', 'Radiator', 'Dumps engine heat into the airstream.', {
    relatedTo: ['cooling.cooling_fan', 'cooling.upper_hose', 'structure.radiator_support'],
    hazard: 'pressurised',
  }),
  c('cooling', 'cooling_fan', 'Cooling fan', 'Pulls air through the radiator when road speed alone will not.', {
    relatedTo: ['electrical.fuse_box_engine'],
  }),
  c('cooling', 'water_pump', 'Water pump', 'Circulates coolant through the block, head and radiator.', {
    appliesTo: HAS_ENGINE,
    relatedTo: ['cooling.thermostat', 'powertrain.timing_chain'],
  }),
  c('cooling', 'thermostat', 'Thermostat', 'A wax valve that blocks the radiator until the engine is warm.', {
    appliesTo: HAS_ENGINE,
    relatedTo: ['cooling.bypass_hose', 'cooling.radiator'],
    failureModes: [
      { symptom: 'Gauge never reaches normal; weak cabin heat', cause: 'Thermostat stuck open', severity: 'degraded' },
      { symptom: 'Rapid overheat with a cold lower hose', cause: 'Thermostat stuck shut', severity: 'immobilising' },
    ],
  }),
  c('cooling', 'upper_hose', 'Upper radiator hose', 'Carries hot coolant from the engine to the radiator.', { hazard: 'pressurised' }),
  c('cooling', 'lower_hose', 'Lower radiator hose', 'Returns cooled coolant to the pump inlet.', { hazard: 'pressurised' }),
  c('cooling', 'bypass_hose', 'Bypass hose', 'Lets coolant circulate around the engine while the thermostat is shut.', {
    appliesTo: HAS_ENGINE,
  }),
  c('cooling', 'expansion_tank', 'Expansion tank', 'Absorbs the volume change as coolant heats, and holds the system’s pressure cap.', {
    hazard: 'pressurised',
  }),
  c('cooling', 'water_jacket', 'Water jacket', 'The cast passages that carry coolant around the cylinders and combustion chambers.', {
    appliesTo: HAS_ENGINE,
  }),
  c('cooling', 'heater_core', 'Heater core', 'A small radiator in the dash that heats the cabin using engine coolant.', {
    relatedTo: ['hvac.blower', 'cooling.water_pump'],
  }),
  c('cooling', 'egr_cooler', 'EGR cooler', 'Cools recirculated exhaust gas before it re-enters the intake.', {
    appliesTo: { powertrains: ['turbo_diesel'] },
    relatedTo: ['air.egr_valve'],
    hazard: 'hot_surface',
  }),
  c('cooling', 'battery_chiller', 'Battery chiller', 'Couples the refrigerant loop to the pack coolant loop to hold cell temperature.', {
    appliesTo: ELECTRIFIED,
    relatedTo: ['powertrain.hv_battery', 'hvac.compressor'],
  }),

  c('air', 'airbox', 'Airbox', 'Houses the air filter and tunes intake noise.', { appliesTo: HAS_ENGINE }),
  c('air', 'air_filter', 'Air filter', 'Keeps abrasive dust out of the engine.', { appliesTo: HAS_ENGINE, serviceIntervalKm: 30000 }),
  c('air', 'maf_sensor', 'Mass airflow sensor', 'Measures the air actually entering, so fuelling can match it.', {
    appliesTo: HAS_ENGINE,
    relatedTo: ['electrical.ecu_engine', 'fuel.injector'],
  }),
  c('air', 'throttle_body', 'Throttle body', 'Meters how much air the engine may draw; on modern cars it is driven by a motor, not a cable.', {
    appliesTo: HAS_ENGINE,
    relatedTo: ['electrical.ecu_engine'],
  }),
  c('air', 'intake_manifold', 'Intake manifold', 'Distributes the charge evenly to each cylinder.', { appliesTo: HAS_ENGINE }),
  c('air', 'intercooler', 'Intercooler', 'Cools compressed intake air so it is denser and less knock-prone.', {
    appliesTo: { powertrains: ['turbo_petrol', 'turbo_diesel'] },
    relatedTo: ['powertrain.turbocharger'],
  }),
  c('air', 'exhaust_manifold', 'Exhaust manifold', 'Collects exhaust from each port into one pipe.', {
    appliesTo: HAS_ENGINE,
    hazard: 'hot_surface',
  }),
  c('air', 'o2_sensor', 'Oxygen (lambda) sensor', 'Reads residual oxygen so the ECU can hold the mixture at stoichiometric.', {
    appliesTo: HAS_ENGINE,
    relatedTo: ['electrical.ecu_engine', 'air.catalytic_converter'],
    hazard: 'hot_surface',
  }),
  c('air', 'catalytic_converter', 'Catalytic converter', 'Converts CO, unburnt fuel and NOx into CO₂, water and nitrogen.', {
    appliesTo: HAS_ENGINE,
    hazard: 'hot_surface',
  }),
  c('air', 'egr_valve', 'EGR valve', 'Recirculates inert exhaust gas to lower peak combustion temperature and NOx.', {
    appliesTo: HAS_ENGINE,
    relatedTo: ['cooling.egr_cooler'],
  }),
  c('air', 'resonator', 'Resonator', 'A tuned volume that cancels specific exhaust frequencies.', { appliesTo: HAS_ENGINE }),
  c('air', 'muffler', 'Muffler', 'Absorbs and reflects sound energy before the gas leaves the tailpipe.', { appliesTo: HAS_ENGINE }),
  c('air', 'pcv_valve', 'PCV valve', 'Draws blow-by gases out of the crankcase and back into the intake.', {
    appliesTo: HAS_ENGINE,
    relatedTo: ['powertrain.piston_rings'],
  }),

  c('braking', 'pedal', 'Brake pedal', 'A lever that multiplies the driver’s foot force before the booster sees it.', {
    relatedTo: ['braking.booster', 'interior.pedal_box'],
  }),
  c('braking', 'booster', 'Brake booster', 'Uses vacuum, or an electric pump on hybrids and EVs, to amplify pedal force.', {
    relatedTo: ['braking.master_cylinder', 'air.intake_manifold'],
  }),
  c('braking', 'master_cylinder', 'Master cylinder', 'Turns pedal force into hydraulic pressure in two independent circuits.', {
    relatedTo: ['braking.reservoir', 'braking.abs_modulator'],
    hazard: 'pressurised',
  }),
  c('braking', 'reservoir', 'Brake fluid reservoir', 'Feeds the master cylinder and shows pad wear as a slowly falling level.', {
    serviceIntervalKm: 40000,
  }),
  c('braking', 'abs_modulator', 'ABS / ESC modulator', 'Valves and a pump that can lower, hold or raise pressure at each wheel independently.', {
    relatedTo: ['braking.wheel_speed_sensor', 'electrical.ecu_body', 'safety_adas.yaw_sensor'],
    hazard: 'pressurised',
  }),
  c('braking', 'hard_line', 'Brake hard line', 'Rigid steel tubing along the body — the bulk of the run.', { hazard: 'pressurised' }),
  c('braking', 'flex_hose', 'Brake flex hose', 'Flexible section that lets the wheel steer and travel without cracking the line.', {
    serviceIntervalKm: 100000,
    hazard: 'pressurised',
  }),
  c('braking', 'caliper_front', 'Front brake caliper', 'Clamps the pads onto the rotor; the fronts do most of the work.', {
    relatedTo: ['braking.pad_front', 'braking.rotor_front'],
    hazard: 'hot_surface',
  }),
  c('braking', 'pad_front', 'Front brake pad', 'The sacrificial friction material.', { serviceIntervalKm: 40000 }),
  c('braking', 'rotor_front', 'Front brake rotor', 'A ventilated iron disc that converts kinetic energy into heat and sheds it.', {
    hazard: 'hot_surface',
  }),
  c('braking', 'caliper_rear', 'Rear brake caliper', 'Clamps the rear rotor and often houses the parking-brake actuator.', {
    relatedTo: ['braking.epb_actuator'],
    hazard: 'hot_surface',
  }),
  c('braking', 'rotor_rear', 'Rear brake rotor', 'Usually a solid disc — the rear axle sheds far less energy.', { hazard: 'hot_surface' }),
  c('braking', 'drum_rear', 'Rear brake drum', 'A drum and shoes: cheaper, self-energising, and fine for a light rear axle.', {
    appliesTo: { archetypes: ['hatch_b', 'sedan_c', 'cuv_b', 'pickup', 'mpv_van'] },
    hazard: 'hot_surface',
  }),
  c('braking', 'epb_actuator', 'Electric parking brake actuator', 'A geared motor that applies the rear brake and holds it without hydraulics.', {
    relatedTo: ['electrical.ecu_body'],
  }),
  c('braking', 'wheel_speed_sensor', 'Wheel speed sensor', 'Reads a toothed ring; the signal underpins ABS, ESC, traction control and the speedometer.', {
    relatedTo: ['braking.abs_modulator', 'safety_adas.yaw_sensor'],
  }),
  c('braking', 'regen_blending', 'Regenerative braking blend unit', 'Decides moment to moment how much retardation comes from the motor and how much from friction.', {
    appliesTo: ELECTRIFIED,
    relatedTo: ['powertrain.mg2', 'braking.abs_modulator'],
  }),

  c('chassis_hydraulics', 'damper_internals', 'Damper internals', 'A piston forcing oil through valved orifices — this is what damping physically is.', {
    relatedTo: ['suspension.front_strut'],
    hazard: 'pressurised',
  }),
  c('chassis_hydraulics', 'clutch_master', 'Clutch master cylinder', 'Converts clutch pedal travel into hydraulic pressure.', {
    appliesTo: { powertrains: ['na_petrol', 'turbo_petrol', 'turbo_diesel'] },
    relatedTo: ['chassis_hydraulics.clutch_slave', 'drivetrain.clutch'],
  }),
  c('chassis_hydraulics', 'clutch_slave', 'Clutch slave cylinder', 'Pushes the release bearing to disengage the clutch.', {
    appliesTo: { powertrains: ['na_petrol', 'turbo_petrol', 'turbo_diesel'] },
  }),
  c('chassis_hydraulics', 'hps_pump', 'Hydraulic power steering pump', 'Legacy belt-driven assistance. Most vehicles in this catalogue use electric assist instead.', {
    appliesTo: { archetypes: ['pickup', 'ppv'] },
    relatedTo: ['suspension.steering_rack'],
    hazard: 'pressurised',
  }),

  c('electrical', 'battery_12v', '12 V battery', 'Starts the engine and holds up the low-voltage network. Even a BEV has one.', {
    relatedTo: ['electrical.starter_motor', 'electrical.alternator', 'electrical.dcdc_converter'],
  }),
  c('electrical', 'alternator', 'Alternator', 'Belt-driven generator that charges the 12 V battery and carries the running load.', {
    appliesTo: ICE_ONLY,
    relatedTo: ['powertrain.crankshaft', 'electrical.battery_12v'],
  }),
  c('electrical', 'dcdc_converter', 'DC-DC converter', 'Steps high voltage down to 12 V. On an electrified car it replaces the alternator.', {
    appliesTo: ELECTRIFIED,
    relatedTo: ['powertrain.hv_battery', 'electrical.battery_12v'],
    hazard: 'high_voltage',
  }),
  c('electrical', 'starter_motor', 'Starter motor', 'Cranks the engine through the flywheel ring gear.', {
    appliesTo: ICE_ONLY,
    relatedTo: ['powertrain.flywheel'],
  }),
  c('electrical', 'fuse_box_engine', 'Engine bay fuse and relay box', 'Protects and switches the high-current circuits nearest the battery.', {}),
  c('electrical', 'fuse_box_cabin', 'Cabin fuse box', 'Protects the low-current circuits reachable from inside.', {}),
  c('electrical', 'harness_main', 'Main wiring harness', 'The bundled conductors that connect every module, sensor and actuator.', {}),
  c('electrical', 'can_bus', 'CAN bus', 'A two-wire differential network that lets modules share data instead of running a wire per signal.', {
    relatedTo: ['electrical.ecu_engine', 'electrical.ecu_body', 'interior.instrument_cluster'],
  }),
  c('electrical', 'lin_bus', 'LIN bus', 'A cheap single-wire network for slow devices — mirrors, wipers, seat motors.', {
    relatedTo: ['electrical.can_bus'],
  }),
  c('electrical', 'ecu_engine', 'Engine control unit', 'Computes fuelling, ignition and airflow targets many times per revolution.', {
    relatedTo: ['air.maf_sensor', 'fuel.injector', 'electrical.can_bus'],
  }),
  c('electrical', 'ecu_body', 'Body control module', 'Runs lighting, locking, wipers and the comfort functions.', { relatedTo: ['electrical.can_bus'] }),
  c('electrical', 'ignition_coil', 'Ignition coil', 'Steps 12 V up to tens of kilovolts to jump the plug gap.', {
    appliesTo: { powertrains: ['na_petrol', 'turbo_petrol', 'hev_series_parallel', 'phev_dmi', 'erev'] },
    relatedTo: ['powertrain.spark_plug'],
  }),
  c('electrical', 'headlight', 'Headlight assembly', 'Projects a beam shaped to light the road without dazzling oncoming traffic.', {}),
  c('electrical', 'taillight', 'Tail light assembly', 'Position, brake, indicator and reverse functions in one housing.', {}),
  c('electrical', 'inverter', 'Traction inverter', 'Converts pack DC into three-phase AC and controls motor torque directly.', {
    appliesTo: ELECTRIFIED,
    relatedTo: ['powertrain.traction_motor', 'powertrain.hv_battery'],
    hazard: 'high_voltage',
  }),
  c('electrical', 'bms', 'Battery management system', 'Monitors every cell group’s voltage and temperature and limits current accordingly.', {
    appliesTo: ELECTRIFIED,
    relatedTo: ['powertrain.hv_battery'],
    hazard: 'high_voltage',
  }),
  c('electrical', 'hv_cable', 'High-voltage cable', 'Orange-sheathed, shielded, and never to be cut or probed outside a trained workshop.', {
    appliesTo: ELECTRIFIED,
    hazard: 'high_voltage',
  }),
  c('electrical', 'contactor', 'HV contactor', 'A relay that isolates the pack whenever the vehicle is off or a fault is detected.', {
    appliesTo: ELECTRIFIED,
    relatedTo: ['electrical.bms'],
    hazard: 'high_voltage',
  }),
  c('electrical', 'service_disconnect', 'Service disconnect plug', 'A manual plug that physically breaks the pack in half before anyone works on it.', {
    appliesTo: ELECTRIFIED,
    hazard: 'high_voltage',
  }),
  c('electrical', 'obc', 'On-board charger', 'Rectifies AC from a wallbox into DC the pack can accept.', {
    appliesTo: { powertrains: ['bev', 'phev_dmi', 'erev'] },
    relatedTo: ['powertrain.hv_battery'],
    hazard: 'high_voltage',
  }),
  c('electrical', 'charge_port', 'Charge port', 'AC and DC inlets, with a lock and a temperature sensor in each contact.', {
    appliesTo: { powertrains: ['bev', 'phev_dmi', 'erev'] },
    hazard: 'high_voltage',
  }),

  c('hvac', 'compressor', 'A/C compressor', 'Raises refrigerant pressure and temperature; belt-driven on an engine, electric on an EV.', {
    relatedTo: ['hvac.condenser', 'powertrain.crankshaft'],
    hazard: 'pressurised',
  }),
  c('hvac', 'condenser', 'Condenser', 'Rejects heat to ambient air, condensing the refrigerant to a liquid.', {
    relatedTo: ['cooling.radiator'],
    hazard: 'pressurised',
  }),
  c('hvac', 'receiver_drier', 'Receiver / drier', 'Stores liquid refrigerant and adsorbs moisture that would otherwise freeze the valve.', {}),
  c('hvac', 'expansion_valve', 'Expansion valve', 'The pressure drop across it is what actually makes the refrigerant cold.', {}),
  c('hvac', 'evaporator', 'Evaporator', 'Boils refrigerant, absorbing heat and moisture from the cabin air.', { relatedTo: ['hvac.blower'] }),
  c('hvac', 'blower', 'Blower motor', 'Pushes cabin air across the evaporator and heater core.', {
    relatedTo: ['hvac.cabin_filter', 'cooling.heater_core'],
  }),
  c('hvac', 'cabin_filter', 'Cabin air filter', 'Filters dust and pollen out of the air entering the cabin.', { serviceIntervalKm: 20000 }),
  c('hvac', 'heat_pump', 'Heat pump', 'Runs the A/C loop in reverse to heat the cabin at a fraction of a resistive heater’s energy cost.', {
    appliesTo: PURE_EV,
    relatedTo: ['hvac.compressor', 'cooling.battery_chiller'],
  }),

  c('drivetrain', 'clutch', 'Clutch', 'A friction disc that connects and disconnects the engine from the gearbox.', {
    appliesTo: { powertrains: ['na_petrol', 'turbo_petrol', 'turbo_diesel'] },
    relatedTo: ['powertrain.flywheel', 'chassis_hydraulics.clutch_slave'],
  }),
  c('drivetrain', 'torque_converter', 'Torque converter', 'A fluid coupling that also multiplies torque when the turbine is slower than the pump.', {
    appliesTo: { powertrains: ['na_petrol', 'turbo_petrol', 'turbo_diesel'] },
  }),
  c('drivetrain', 'transaxle', 'Transaxle', 'Gearbox and final drive in one case — the standard transverse front-drive layout.', {
    appliesTo: { archetypes: ['hatch_b', 'sedan_c', 'cuv_b', 'suv_c', 'mpv_van'] },
    relatedTo: ['drivetrain.differential_front', 'drivetrain.driveshaft'],
  }),
  c('drivetrain', 'gearbox', 'Gearbox', 'Trades torque against speed so the engine can stay in its useful band.', {
    appliesTo: { archetypes: ['pickup', 'ppv'] },
    relatedTo: ['drivetrain.propshaft'],
  }),
  c('drivetrain', 'reduction_gear', 'Reduction gear', 'A single fixed ratio — an electric motor needs no gearbox.', {
    appliesTo: { powertrains: ['bev', 'erev'] },
    relatedTo: ['powertrain.traction_motor'],
  }),
  c('drivetrain', 'transfer_case', 'Transfer case', 'Sends drive to the front axle and offers a low range for traction.', {
    appliesTo: { archetypes: ['pickup', 'ppv'] },
    relatedTo: ['drivetrain.propshaft'],
  }),
  c('drivetrain', 'propshaft', 'Propeller shaft', 'Carries torque the length of the vehicle to the rear axle.', {
    appliesTo: { archetypes: ['pickup', 'ppv'] },
  }),
  c('drivetrain', 'differential_front', 'Front differential', 'Lets the driven wheels turn at different speeds through a corner.', {}),
  c('drivetrain', 'differential_rear', 'Rear differential', 'The rear axle’s differential, in its own housing on a body-on-frame vehicle.', {
    appliesTo: { archetypes: ['pickup', 'ppv', 'bev_skateboard', 'suv_c'] },
  }),
  c('drivetrain', 'driveshaft', 'Driveshaft', 'Transmits torque from the differential to the hub while the suspension moves.', {
    relatedTo: ['drivetrain.cv_joint'],
  }),
  c('drivetrain', 'cv_joint', 'Constant-velocity joint', 'Transmits torque smoothly through a steering and suspension angle.', {
    relatedTo: ['drivetrain.driveshaft'],
    failureModes: [
      { symptom: 'Rhythmic clicking on full lock', cause: 'Outer joint worn after a split boot let grease out and grit in', severity: 'degraded' },
    ],
  }),
  c('drivetrain', 'wheel_hub', 'Wheel hub and bearing', 'Carries the vehicle’s weight and lets the wheel rotate.', {
    relatedTo: ['braking.wheel_speed_sensor'],
  }),
  c('drivetrain', 'road_wheel', 'Wheel and tyre', 'The only parts touching the road — and the tyre is the vehicle’s first spring and damper.', {
    relatedTo: ['drivetrain.wheel_hub', 'suspension.coil_spring'],
  }),

  c('suspension_steering', 'front_strut', 'MacPherson strut', 'Combines spring, damper and upper steering pivot in one compact unit.', {
    relatedTo: ['chassis_hydraulics.damper_internals', 'suspension.control_arm_lower'],
  }),
  c('suspension_steering', 'control_arm_lower', 'Lower control arm', 'Locates the hub laterally and takes braking and cornering loads.', {
    relatedTo: ['suspension.ball_joint'],
  }),
  c('suspension_steering', 'upper_wishbone', 'Upper wishbone', 'The upper link of a double-wishbone front end, giving better camber control than a strut.', {
    appliesTo: { archetypes: ['pickup', 'ppv'] },
  }),
  c('suspension_steering', 'ball_joint', 'Ball joint', 'A spherical bearing that lets the hub steer and travel at once.', { serviceIntervalKm: 120000 }),
  c('suspension_steering', 'coil_spring', 'Coil spring', 'Carries the static load and sets the wheel rate.', {}),
  c('suspension_steering', 'leaf_spring', 'Leaf spring', 'Springs and locates the axle in one part — which is why load-carriers still use it.', {
    appliesTo: { archetypes: ['pickup'] },
  }),
  c('suspension_steering', 'torsion_beam', 'Torsion beam axle', 'A twisting cross-member acting as spring and anti-roll bar; cheap, compact, and good enough.', {
    appliesTo: { archetypes: ['hatch_b', 'sedan_c', 'cuv_b', 'mpv_van'] },
  }),
  c('suspension_steering', 'multilink_arm', 'Multilink arm', 'One of several links that control each rear wheel’s path independently.', {
    appliesTo: { archetypes: ['suv_c', 'bev_skateboard'] },
  }),
  c('suspension_steering', 'anti_roll_bar', 'Anti-roll bar', 'A torsion spring between left and right that resists body roll only.', {}),
  c('suspension_steering', 'subframe_front', 'Front subframe', 'Carries the powertrain, arms and rack, and bolts into the body as one assembly.', {
    relatedTo: ['structure.front_rail'],
  }),
  c('suspension_steering', 'steering_rack', 'Steering rack', 'Converts steering-wheel rotation into lateral tie-rod movement.', {
    relatedTo: ['suspension.tie_rod', 'suspension.eps_motor'],
  }),
  c('suspension_steering', 'eps_motor', 'Electric power steering motor', 'Adds assistance torque on demand instead of running a pump continuously.', {
    relatedTo: ['electrical.ecu_body'],
  }),
  c('suspension_steering', 'tie_rod', 'Tie rod', 'Pushes and pulls the steering arm to turn the wheel.', {}),
  c('suspension_steering', 'live_axle', 'Live rear axle', 'Housing, differential and both shafts as one unsprung assembly.', {
    appliesTo: { archetypes: ['pickup', 'ppv'] },
  }),

  c('structure', 'unibody_floor', 'Unibody floor', 'The stamped and welded floor that is the vehicle’s primary structure.', {
    appliesTo: { archetypes: ['hatch_b', 'sedan_c', 'cuv_b', 'suv_c', 'mpv_van', 'bev_skateboard'] },
  }),
  c('structure', 'ladder_frame', 'Ladder frame', 'Two rails and cross-members carrying everything; the body is bolted on top.', {
    appliesTo: { archetypes: ['pickup', 'ppv'] },
  }),
  c('structure', 'front_rail', 'Front rail', 'The main longitudinal load path from the crash beam back into the floor.', {
    relatedTo: ['structure.crumple_box'],
  }),
  c('structure', 'rear_rail', 'Rear rail', 'The rear longitudinal load path, shaped to protect the fuel tank or pack.', {}),
  c('structure', 'crash_beam_front', 'Front crash beam', 'Spreads an impact across both rails and matches height with other vehicles.', {
    relatedTo: ['structure.crumple_box'],
  }),
  c('structure', 'crumple_box', 'Crumple box', 'Engineered to fold at a controlled force, converting kinetic energy into deformation.', {
    relatedTo: ['safety_adas.airbag_front'],
  }),
  c('structure', 'radiator_support', 'Radiator support', 'The front frame that carries the cooling pack, latch and lights.', {
    relatedTo: ['cooling.radiator'],
  }),
  c('structure', 'hood_latch', 'Hood latch', 'A two-stage catch so a released hood cannot fly up at speed.', {}),
  c('structure', 'firewall', 'Firewall / bulkhead', 'Separates engine bay from cabin, and carries the pedal box and HVAC case.', {}),
  c('structure', 'cowl', 'Cowl', 'The structural and drainage channel at the base of the windscreen.', {}),
  c('structure', 'side_impact_bar', 'Side impact bar', 'A beam inside each door that spreads a side impact into the pillars.', {}),
  c('structure', 'a_pillar', 'A-pillar', 'The roof support ahead of the doors; usually the strongest steel in the car.', {}),
  c('structure', 'b_pillar', 'B-pillar', 'The central pillar carrying the roof, seat belts and door latches.', {}),
  c('structure', 'bed_floor', 'Bed floor', 'The load-carrying deck behind the cabin of a pickup.', { appliesTo: { archetypes: ['pickup'] } }),
  c('structure', 'body_panel', 'Body panel', 'Outer skin: largely non-structural, shaped for airflow, pedestrian impact and looks.', {}),
  c('structure', 'glazing', 'Glazing', 'Laminated windscreen and toughened side glass; the screen is a structural member too.', {
    relatedTo: ['safety_adas.windscreen_camera'],
  }),

  c('safety_adas', 'airbag_front', 'Front airbag module', 'A gas generator and fabric bag that decelerate the occupant over a longer distance.', {
    relatedTo: ['safety_adas.crash_sensor', 'safety_adas.pretensioner'],
    hazard: 'pyrotechnic',
  }),
  c('safety_adas', 'airbag_curtain', 'Curtain airbag', 'Deploys along the roof rail to protect heads in a side impact or rollover.', { hazard: 'pyrotechnic' }),
  c('safety_adas', 'pretensioner', 'Seat belt pretensioner', 'Fires to remove belt slack milliseconds before the occupant loads it.', {
    relatedTo: ['safety_adas.airbag_front'],
    hazard: 'pyrotechnic',
  }),
  c('safety_adas', 'crash_sensor', 'Crash sensor', 'Accelerometers that distinguish a real impact from a kerb strike in a few milliseconds.', {}),
  c('safety_adas', 'front_radar', 'Front radar', 'Measures range and closing speed for adaptive cruise and autonomous braking.', {
    relatedTo: ['safety_adas.windscreen_camera', 'braking.abs_modulator'],
  }),
  c('safety_adas', 'windscreen_camera', 'Windscreen camera', 'Reads lane markings, signs and vehicle shapes; must be recalibrated after a screen replacement.', {}),
  c('safety_adas', 'ultrasonic_sensor', 'Ultrasonic sensor', 'Short-range parking detection by time-of-flight.', {}),
  c('safety_adas', 'blind_spot_radar', 'Blind-spot radar', 'Corner radar watching the adjacent lane behind you.', {}),
  c('safety_adas', 'yaw_sensor', 'Yaw rate sensor', 'Measures how fast the car is rotating — the input that makes stability control possible.', {
    relatedTo: ['braking.abs_modulator'],
  }),

  c('interior', 'seat_front', 'Front seat', 'Structure, restraint anchor and, in a crash, part of the safety system.', {}),
  c('interior', 'seat_rear', 'Rear seat', 'Bench or split seat with belt anchorages and child-seat mounts.', {}),
  c('interior', 'dashboard', 'Dashboard', 'Carries the cluster, vents, airbag and the HVAC case behind it.', { relatedTo: ['hvac.evaporator'] }),
  c('interior', 'instrument_cluster', 'Instrument cluster', 'Presents speed, engine and warning state from data on the CAN bus.', {
    relatedTo: ['electrical.can_bus'],
  }),
  c('interior', 'steering_wheel', 'Steering wheel', 'Driver input, driver airbag housing, and most of the switchgear.', {
    relatedTo: ['suspension.steering_rack', 'safety_adas.airbag_front'],
  }),
  c('interior', 'pedal_box', 'Pedal box', 'Mounts the pedals to the firewall; designed to release in a frontal impact.', {
    relatedTo: ['braking.pedal'],
  }),
  c('interior', 'infotainment', 'Infotainment head unit', 'Media, navigation and increasingly the HVAC and vehicle settings too.', {
    relatedTo: ['electrical.can_bus'],
  }),
];

export const COMPONENTS_BY_ID: ReadonlyMap<string, Component> = new Map(COMPONENTS.map((x) => [x.id, x]));

export const COMPONENTS_BY_NODE: ReadonlyMap<string, Component> = new Map(COMPONENTS.map((x) => [x.nodeId, x]));
