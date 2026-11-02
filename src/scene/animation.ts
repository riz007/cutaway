import * as THREE from 'three';
import type { SimState } from '@/sim/simStore';
import { DEFAULT_ENGINE, TWO_PI, crankKinematics, cylinderCycleAngle, pistonTravel, valveState } from '@/sim/engine';
import type { PartInstance } from './procedural/types';
import { STAGE_REACH, partProgress, stageOf, staggerOf, type ExplodeStage } from './explodeStages';

export type MotionKind =
  | 'none'
  | 'piston'
  | 'rings'
  | 'rod'
  | 'valve_intake'
  | 'valve_exhaust'
  | 'crank_spin'
  | 'cam_spin'
  | 'wheel_spin'
  | 'fan_spin'
  | 'motor_spin'
  | 'caliper_clamp'
  | 'compressor_spin';

export interface MotionPlan {
  kind: MotionKind;

  index: number;

  basePosition: THREE.Vector3;
  baseQuaternion: THREE.Quaternion;
  explode: THREE.Vector3;

  sideSign: number;
  stage: ExplodeStage;
  stagger: number;
  crank: {
    pivot: THREE.Vector3;
    bank: THREE.Vector3;
    across: THREE.Vector3;
    tiltSign: number;
    rise: number;
  } | null;
}

const CYLINDER_VARIANT = /__c(\d+)(?:_(in|ex))?__/;

function motionFor(part: PartInstance): MotionKind {
  switch (part.componentId) {
    case 'powertrain.piston':
      return 'piston';
    case 'powertrain.piston_rings':
      return 'rings';
    case 'powertrain.connecting_rod':
      return 'rod';
    case 'powertrain.valve_intake':
      return 'valve_intake';
    case 'powertrain.valve_exhaust':
      return 'valve_exhaust';
    case 'powertrain.crankshaft':
    case 'powertrain.flywheel':
    case 'drivetrain.clutch':
    case 'drivetrain.torque_converter':
      return 'crank_spin';
    case 'powertrain.camshaft_intake':
    case 'powertrain.camshaft_exhaust':
    case 'powertrain.vvt_actuator':
      return 'cam_spin';
    case 'drivetrain.road_wheel':
    case 'drivetrain.wheel_hub':
    case 'braking.rotor_front':
    case 'braking.rotor_rear':
    case 'braking.drum_rear':
    case 'drivetrain.driveshaft':
    case 'drivetrain.cv_joint':
      return 'wheel_spin';
    case 'cooling.cooling_fan':
      return 'fan_spin';
    case 'powertrain.mg1':
    case 'powertrain.mg2':
    case 'powertrain.traction_motor':
    case 'electrical.alternator':
      return 'motor_spin';
    case 'braking.caliper_front':
    case 'braking.pad_front':
    case 'braking.caliper_rear':
      return 'caliper_clamp';
    case 'hvac.compressor':
      return 'compressor_spin';
    default:
      return 'none';
  }
}

export function planFor(part: PartInstance): MotionPlan {
  const match = CYLINDER_VARIANT.exec(part.nodeId);
  const index = match?.[1] ? Number(match[1]) - 1 : 0;
  const euler = new THREE.Euler(part.rotation[0], part.rotation[1], part.rotation[2], 'XYZ');
  const stage = stageOf(part);
  const k = part.kinematic;
  return {
    kind: motionFor(part),
    index,
    basePosition: new THREE.Vector3(...part.position),
    baseQuaternion: new THREE.Quaternion().setFromEuler(euler),
    explode: new THREE.Vector3(...part.explode).multiplyScalar(STAGE_REACH[stage]),
    sideSign: part.position[0] < 0 ? -1 : 1,
    stage,
    stagger: staggerOf(part.nodeId),
    crank: k
      ? {
          pivot: new THREE.Vector3(...k.pivot),
          bank: k.bank === 'x' ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1),
          across: k.bank === 'x' ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0),
          tiltSign: k.bank === 'x' ? 1 : -1,
          rise: k.rise ?? 0,
        }
      : null,
  };
}

const spin = new THREE.Quaternion();
const tilt = new THREE.Quaternion();
const spinAxis = new THREE.Vector3(0, 1, 0);
const offset = new THREE.Vector3();

const STROKE = DEFAULT_ENGINE.crankThrow * 2;

export interface FrameContext {
  sim: SimState;

  explode: number;

  time: number;
  cylinders: number;

  wheelAngle: number;
}

export function applyMotion(object: THREE.Object3D, plan: MotionPlan, ctx: FrameContext): void {
  const { sim } = ctx;

  offset.set(0, 0, 0);
  object.quaternion.copy(plan.baseQuaternion);
  const reach = partProgress(ctx.explode, plan.stage, plan.stagger);

  if (plan.crank && (plan.kind === 'piston' || plan.kind === 'rings' || plan.kind === 'rod')) {
    const angle = cylinderCycleAngle(sim.crankAngle, plan.index, ctx.cylinders);
    const k = crankKinematics(angle, DEFAULT_ENGINE.crankThrow, DEFAULT_ENGINE.rodLength);
    const { pivot, across, bank, tiltSign, rise } = plan.crank;

    object.position.copy(pivot);
    if (plan.kind === 'rod') {
      object.position.y += (k.pinUp + k.pistonHeight) / 2;
      object.position.addScaledVector(across, k.pinAcross / 2);
      tilt.setFromAxisAngle(bank, tiltSign * k.rodAngle);
      object.quaternion.premultiply(tilt);
    } else {
      object.position.y += k.pistonHeight + rise;
    }
    object.position.addScaledVector(plan.explode, reach);
    return;
  }

  switch (plan.kind) {
    case 'piston':
    case 'rings':
    case 'rod': {
      const angle = cylinderCycleAngle(sim.crankAngle, plan.index, ctx.cylinders);
      const travel = pistonTravel(angle, DEFAULT_ENGINE);
      const amplitude = plan.kind === 'rod' ? STROKE * 0.5 : STROKE;
      offset.y = (travel - 0.5) * amplitude;
      break;
    }
    case 'valve_intake':
    case 'valve_exhaust': {
      const angle = cylinderCycleAngle(sim.crankAngle, plan.index, ctx.cylinders);
      const lift = valveState(angle);
      offset.y = -(plan.kind === 'valve_intake' ? lift.intake : lift.exhaust) * 0.012;
      break;
    }
    case 'crank_spin': {
      spin.setFromAxisAngle(spinAxis, sim.crankAngle);
      object.quaternion.multiply(spin);
      break;
    }
    case 'cam_spin': {
      spin.setFromAxisAngle(spinAxis, sim.crankAngle * 0.5);
      object.quaternion.multiply(spin);
      break;
    }
    case 'wheel_spin': {
      spin.setFromAxisAngle(spinAxis, ctx.wheelAngle);
      object.quaternion.multiply(spin);
      break;
    }
    case 'fan_spin': {
      spin.setFromAxisAngle(spinAxis, ctx.time * sim.fanDuty * 34);
      object.quaternion.multiply(spin);
      break;
    }
    case 'motor_spin': {
      const rpm = sim.powertrain === 'bev' ? sim.mg2Rpm : Math.max(sim.mg2Rpm, sim.engineRpm);
      spin.setFromAxisAngle(spinAxis, ctx.time * (rpm / 60) * TWO_PI * 0.05);
      object.quaternion.multiply(spin);
      break;
    }
    case 'caliper_clamp': {
      offset.x = plan.sideSign * -sim.caliperTravelMm * 0.006;
      break;
    }
    case 'compressor_spin': {
      spin.setFromAxisAngle(spinAxis, sim.acOn ? ctx.time * 22 : 0);
      object.quaternion.multiply(spin);
      break;
    }
    case 'none':
      break;
  }

  object.position.copy(plan.basePosition).addScaledVector(plan.explode, reach).add(offset);
}

export function advanceWheelAngle(current: number, speedKph: number, wheelRadiusM: number, dt: number): number {
  const radPerS = speedKph / 3.6 / Math.max(wheelRadiusM, 0.05);
  return (current + radPerS * dt) % TWO_PI;
}
