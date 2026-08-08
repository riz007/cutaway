import type { PartDef } from '../types';
import { ALONG_X, ALONG_Z, corners, type Layout } from '../layout';

const cornerLabel = (variant: string) =>
  variant === 'fl' ? 'Front left' : variant === 'fr' ? 'Front right' : variant === 'rl' ? 'Rear left' : 'Rear right';

export function buildBraking(l: Layout): PartDef[] {
  const parts: PartDef[] = [];
  const { g } = l;
  const boosterZ = l.zFirewall - 0.14;
  const boosterY = l.beltlineY - 0.1;

  parts.push({
    component: 'braking.pedal',
    shape: { kind: 'box', size: [0.06, 0.16, 0.03] },
    position: [-0.24, l.floorY + 0.26, l.zFirewall + 0.2],
    rotation: [0.35, 0, 0],
    material: 'steel',
    explode: [0, 0.3, 0.8],
  });
  parts.push({
    component: 'braking.booster',
    shape: { kind: 'cylinder', radius: 0.1, height: 0.11 },
    position: [-0.28, boosterY, boosterZ],
    rotation: ALONG_Z,
    material: 'steel',
    explode: [-0.3, 0.4, -0.5],
  });
  parts.push({
    component: 'braking.master_cylinder',
    shape: { kind: 'cylinder', radius: 0.032, height: 0.17 },
    position: [-0.28, boosterY, boosterZ - 0.15],
    rotation: ALONG_Z,
    material: 'aluminium',
    explode: [-0.3, 0.5, -0.7],
  });
  parts.push({
    component: 'braking.reservoir',
    shape: { kind: 'box', size: [0.1, 0.1, 0.13] },
    position: [-0.28, boosterY + 0.1, boosterZ - 0.13],
    material: 'plastic_black',
    explode: [-0.3, 0.85, -0.5],
  });
  parts.push({
    component: 'braking.abs_modulator',
    shape: { kind: 'box', size: [0.12, 0.11, 0.11] },
    position: [-0.42, l.floorY + 0.42, l.zFirewall - 0.42],
    material: 'aluminium',
    explode: [-0.7, 0.45, -0.3],
  });

  for (const corner of corners(l)) {
    const sideSign = corner.left ? -1 : 1;
    const label = cornerLabel(corner.variant);
    const runZ = (corner.z + l.zFirewall) / 2;

    parts.push({
      component: 'braking.hard_line',
      variant: corner.variant,
      instanceLabel: label,
      shape: { kind: 'cylinder', radius: 0.006, height: Math.abs(corner.z - l.zFirewall) + 0.25 },
      position: [sideSign * (l.halfTrack - 0.16), l.floorY + 0.04, runZ],
      rotation: ALONG_Z,
      material: 'steel',
    });
    parts.push({
      component: 'braking.flex_hose',
      variant: corner.variant,
      instanceLabel: label,
      shape: { kind: 'cylinder', radius: 0.009, height: 0.22 },
      position: [corner.x - sideSign * 0.12, l.hubY + 0.1, corner.z - 0.03],
      rotation: [0, 0, sideSign * 0.9],
      material: 'rubber',
    });
    parts.push({
      component: 'braking.wheel_speed_sensor',
      variant: corner.variant,
      instanceLabel: label,
      shape: { kind: 'cylinder', radius: 0.01, height: 0.05 },
      position: [corner.x - sideSign * 0.05, l.hubY + 0.06, corner.z - 0.05],
      material: 'plastic_black',
    });

    const front = corner.front;
    const rotorRadius = g.wheelRadius * (front ? 0.66 : 0.6);

    parts.push({
      component: front ? 'braking.rotor_front' : 'braking.rotor_rear',
      variant: corner.variant,
      instanceLabel: label,
      shape: { kind: 'cylinder', radius: rotorRadius, height: front ? 0.026 : 0.012 },
      position: [corner.x + sideSign * 0.01, l.hubY, corner.z],
      rotation: ALONG_X,
      material: 'cast_iron',
      explode: [sideSign * 0.55, 0, 0],
    });
    parts.push({
      component: front ? 'braking.caliper_front' : 'braking.caliper_rear',
      variant: corner.variant,
      instanceLabel: label,
      shape: { kind: 'box', size: [0.06, 0.1, 0.13] },
      position: [corner.x - sideSign * 0.02, l.hubY + rotorRadius * 0.72, corner.z - 0.05],
      material: 'aluminium',
      explode: [sideSign * 0.3, 0.6, 0],
    });
    if (front) {
      parts.push({
        component: 'braking.pad_front',
        variant: corner.variant,
        instanceLabel: label,
        shape: { kind: 'box', size: [0.014, 0.06, 0.1] },
        position: [corner.x - sideSign * 0.026, l.hubY + rotorRadius * 0.72, corner.z - 0.05],
        material: 'fabric',
        explode: [sideSign * 0.15, 0.9, 0],
      });
    } else {
      parts.push({
        component: 'braking.drum_rear',
        variant: corner.variant,
        instanceLabel: label,
        shape: { kind: 'cylinder', radius: rotorRadius + 0.02, height: 0.06 },
        position: [corner.x + sideSign * 0.01, l.hubY, corner.z],
        rotation: ALONG_X,
        material: 'cast_iron',
        explode: [sideSign * 0.55, 0, 0],
      });
      parts.push({
        component: 'braking.epb_actuator',
        variant: corner.variant,
        instanceLabel: label,
        shape: { kind: 'cylinder', radius: 0.026, height: 0.07 },
        position: [corner.x - sideSign * 0.05, l.hubY + rotorRadius * 0.72, corner.z - 0.12],
        rotation: ALONG_X,
        material: 'plastic_black',
      });
    }
  }

  parts.push({
    component: 'braking.regen_blending',
    shape: { kind: 'box', size: [0.1, 0.07, 0.09] },
    position: [-0.42, l.floorY + 0.52, l.zFirewall - 0.4],
    material: 'plastic_black',
  });

  return parts;
}

export function buildDrivetrain(l: Layout): PartDef[] {
  const parts: PartDef[] = [];
  const { g } = l;
  const [ex, ey, ez] = l.engineBay;
  const longitudinal = g.engineLayout === 'longitudinal';

  parts.push({
    component: 'drivetrain.clutch',
    shape: { kind: 'cylinder', radius: 0.115, height: 0.03 },
    position: longitudinal ? [ex, ey - 0.12, ez + 0.32] : [ex + 0.3, ey - 0.12, ez],
    rotation: longitudinal ? ALONG_Z : ALONG_X,
    material: 'fabric',
    explode: longitudinal ? [0, 0.2, 0.75] : [0.75, 0.2, 0],
  });
  parts.push({
    component: 'drivetrain.torque_converter',
    shape: { kind: 'sphere', radius: 0.115 },
    position: longitudinal ? [ex, ey - 0.12, ez + 0.34] : [ex + 0.32, ey - 0.12, ez],
    material: 'steel',
    explode: longitudinal ? [0, 0.2, 0.75] : [0.75, 0.2, 0],
  });

  parts.push({
    component: 'drivetrain.transaxle',
    shape: { kind: 'box', size: [0.36, 0.3, 0.34] },
    position: [ex + 0.42, ey - 0.1, ez],
    material: 'aluminium',
    explode: [0.95, 0, 0],
  });
  parts.push({
    component: 'drivetrain.gearbox',
    shape: { kind: 'box', size: [0.24, 0.24, 0.6] },
    position: [ex, ey - 0.12, ez + 0.62],
    material: 'aluminium',
    explode: [0, -0.3, 0.9],
  });
  parts.push({
    component: 'drivetrain.transfer_case',
    shape: { kind: 'box', size: [0.22, 0.2, 0.24] },
    position: [-0.1, ey - 0.16, ez + 1.02],
    material: 'aluminium',
  });
  parts.push({
    component: 'drivetrain.propshaft',
    shape: { kind: 'cylinder', radius: 0.032, height: Math.abs(l.zAxleR - (ez + 1.1)) },
    position: [0, l.g.groundClearance + 0.08, (l.zAxleR + ez + 1.1) / 2],
    rotation: ALONG_Z,
    material: 'steel',
  });
  parts.push({
    component: 'drivetrain.reduction_gear',
    shape: { kind: 'cylinder', radius: 0.1, height: 0.12 },
    position: g.engineLayout === 'none' ? [0.22, l.hubY + 0.02, l.zAxleR - 0.14] : [ex + 0.34, ey - 0.08, ez],
    rotation: ALONG_X,
    material: 'aluminium',
  });

  parts.push({
    component: 'drivetrain.differential_front',
    shape: { kind: 'sphere', radius: 0.1 },
    position: longitudinal ? [-0.12, l.hubY - 0.04, l.zAxleF] : [ex + 0.3, ey - 0.18, ez],
    material: 'cast_iron',
    explode: [0, -0.6, 0],
  });
  parts.push({
    component: 'drivetrain.differential_rear',
    shape: { kind: 'sphere', radius: 0.11 },
    position: [0, l.hubY, l.zAxleR],
    material: 'cast_iron',
    explode: [0, -0.6, 0],
  });

  for (const corner of corners(l)) {
    const sideSign = corner.left ? -1 : 1;
    const label = cornerLabel(corner.variant);
    const diffX = corner.front && !longitudinal ? ex + 0.3 : 0;
    const shaftLength = Math.abs(corner.x - diffX) - 0.1;
    if (shaftLength <= 0.05) continue;

    parts.push({
      component: 'drivetrain.driveshaft',
      variant: corner.variant,
      instanceLabel: label,
      shape: { kind: 'cylinder', radius: 0.022, height: shaftLength },
      position: [(corner.x + diffX) / 2, l.hubY - (corner.front ? 0.02 : 0), corner.z],
      rotation: ALONG_X,
      material: 'steel',
      explode: [sideSign * 0.5, -0.3, 0],
    });
    parts.push({
      component: 'drivetrain.cv_joint',
      variant: corner.variant,
      instanceLabel: label,
      shape: { kind: 'sphere', radius: 0.045 },
      position: [corner.x - sideSign * 0.1, l.hubY - (corner.front ? 0.02 : 0), corner.z],
      material: 'rubber',
      explode: [sideSign * 0.6, -0.2, 0],
    });
  }

  return parts;
}
