import type { PartDef } from '../types';
import { ALONG_X, ALONG_Z, corners, type Layout } from '../layout';

export function buildStructure(l: Layout): PartDef[] {
  const { g } = l;
  const parts: PartDef[] = [];
  const hw = l.halfWidth;
  const cabinLen = Math.max(0.6, l.zCabinEnd - l.zFirewall);
  const cabinMidZ = (l.zFirewall + l.zCabinEnd) / 2;
  const sillY = l.body.landmarks.sillY;

  if (g.bodyOnFrame) {
    for (const side of [-1, 1] as const) {
      parts.push({
        component: 'structure.ladder_frame',
        variant: side < 0 ? 'rail_l' : 'rail_r',
        instanceLabel: side < 0 ? 'Left rail' : 'Right rail',
        shape: { kind: 'box', size: [0.09, 0.17, g.length * 0.88] },
        position: [side * hw * 0.46, g.groundClearance + 0.05, 0],
        material: 'steel',
      });
    }
    for (let i = 0; i < 4; i += 1) {
      parts.push({
        component: 'structure.ladder_frame',
        variant: `cross_${i}`,
        instanceLabel: `Cross-member ${i + 1}`,
        shape: { kind: 'box', size: [hw * 0.92, 0.09, 0.08] },
        position: [0, g.groundClearance + 0.05, l.zNose + 0.9 + i * (g.length * 0.72) / 3],
        material: 'steel',
      });
    }
  } else {
    parts.push({
      component: 'structure.unibody_floor',
      shape: { kind: 'box', size: [g.width * 0.9, 0.05, g.length * 0.8] },
      position: [0, l.floorY, 0.05],
      material: 'steel',
    });
  }

  for (const side of [-1, 1] as const) {
    parts.push({
      component: 'structure.front_rail',
      variant: side < 0 ? 'l' : 'r',
      instanceLabel: side < 0 ? 'Left' : 'Right',
      shape: { kind: 'box', size: [0.09, 0.13, l.zFirewall - l.zNose - 0.35] },
      position: [side * hw * 0.55, l.floorY + 0.28, (l.zNose + 0.35 + l.zFirewall) / 2],
      material: 'steel',
    });
    parts.push({
      component: 'structure.crumple_box',
      variant: side < 0 ? 'l' : 'r',
      instanceLabel: side < 0 ? 'Left' : 'Right',
      shape: { kind: 'box', size: [0.11, 0.15, 0.24] },
      position: [side * hw * 0.55, l.floorY + 0.28, l.zNose + 0.24],
      material: 'steel',
    });
    parts.push({
      component: 'structure.rear_rail',
      variant: side < 0 ? 'l' : 'r',
      instanceLabel: side < 0 ? 'Left' : 'Right',
      shape: { kind: 'box', size: [0.09, 0.12, l.zTail - l.zAxleR + 0.5] },
      position: [side * hw * 0.55, l.floorY + 0.16, (l.zAxleR - 0.5 + l.zTail) / 2],
      material: 'steel',
    });
  }
  parts.push({
    component: 'structure.crash_beam_front',
    shape: { kind: 'box', size: [g.width * 0.82, 0.13, 0.08] },
    position: [0, l.floorY + 0.28, l.zNose + 0.1],
    material: 'steel',
    explode: [0, 0.15, -0.7],
  });
  parts.push({
    component: 'structure.radiator_support',
    shape: { kind: 'box', size: [g.width * 0.78, 0.55, 0.05] },
    position: [0, l.floorY + 0.45, l.zNose + 0.3],
    material: 'steel',
  });
  parts.push({
    component: 'structure.hood_latch',
    shape: { kind: 'box', size: [0.1, 0.08, 0.06] },
    position: [0, l.beltlineY - 0.06, l.zNose + 0.3],
    material: 'steel',
  });
  const bulkheadTop = l.body.landmarks.bonnetY;
  const bulkheadBottom = l.body.landmarks.sillY - 0.05;
  parts.push({
    component: 'structure.firewall',
    shape: { kind: 'box', size: [g.width * 0.9, Math.max(0.3, bulkheadTop - bulkheadBottom), 0.04] },
    position: [0, (bulkheadBottom + bulkheadTop) / 2, l.zFirewall],
    material: 'steel',
  });
  parts.push({
    component: 'structure.cowl',
    shape: { kind: 'box', size: [g.width * 0.86, 0.09, 0.18] },
    position: [0, bulkheadTop - 0.03, l.zFirewall + 0.08],
    material: 'steel',
  });

  for (const side of [-1, 1] as const) {
    const label = side < 0 ? 'Left' : 'Right';
    parts.push({
      component: 'structure.a_pillar',
      variant: side < 0 ? 'l' : 'r',
      instanceLabel: label,
      shape: { kind: 'box', size: [0.07, 0.78, 0.09] },
      position: [side * hw * 0.82, (l.beltlineY + l.roofY) / 2, l.zFirewall + 0.42],
      rotation: [-0.5, 0, 0],
      material: 'steel',
    });
    parts.push({
      component: 'structure.b_pillar',
      variant: side < 0 ? 'l' : 'r',
      instanceLabel: label,
      shape: { kind: 'box', size: [0.07, l.roofY - sillY, 0.11] },
      position: [side * hw * 0.86, (sillY + l.roofY) / 2, cabinMidZ],
      material: 'steel',
    });
    parts.push({
      component: 'structure.side_impact_bar',
      variant: side < 0 ? 'l' : 'r',
      instanceLabel: label,
      shape: { kind: 'box', size: [0.05, 0.09, cabinLen * 0.42] },
      position: [side * (hw - 0.06), l.beltlineY - 0.22, l.zFirewall + cabinLen * 0.28],
      rotation: [0, 0, 0.08 * side],
      material: 'steel',
    });
  }

  const lm = l.body.landmarks;

  for (const side of [-1, 1] as const) {
    parts.push({
      component: 'structure.body_panel',
      variant: side < 0 ? 'flank_l' : 'flank_r',
      instanceLabel: side < 0 ? 'Left flank' : 'Right flank',
      shape: { kind: 'profile', points: l.body.points, holes: l.body.holes, depth: 0.055, bevel: 0.005 },
      position: [side * (hw - 0.028), 0, 0],
      material: 'painted_body',
      explode: [side * 0.9, 0.1, 0],
    });
  }

  const panel = (
    variant: string,
    label: string,
    size: [number, number, number],
    pos: [number, number, number],
    rot?: [number, number, number],
  ): PartDef => ({
    component: 'structure.body_panel',
    variant,
    instanceLabel: label,
    shape: { kind: 'box', size },
    position: pos,
    ...(rot ? { rotation: rot } : {}),
    material: 'painted_body',
  });

  const bonnetRun = lm.zBonnetEnd - lm.zNose;
  parts.push(
    panel(
      'hood',
      'Hood',
      [g.width * 0.9, 0.05, bonnetRun * 0.98],
      [0, (lm.noseY + lm.bonnetY) / 2 + 0.015, lm.zNose + bonnetRun * 0.5],
      [Math.atan2(lm.bonnetY - lm.noseY, bonnetRun), 0, 0],
    ),
  );
  parts.push(
    panel(
      'roof',
      'Roof',
      [g.width * 0.84, 0.05, Math.max(0.4, lm.zRoofEnd - lm.zScreenTop)],
      [0, lm.roofY - 0.02, (lm.zScreenTop + lm.zRoofEnd) / 2],
    ),
  );
  parts.push(
    panel(
      'front_fascia',
      'Front fascia',
      [g.width * 0.94, Math.max(0.2, lm.noseY - lm.sillY), 0.12],
      [0, (lm.sillY + lm.noseY) / 2, lm.zNose + 0.06],
    ),
  );
  parts.push(
    panel(
      'rear_fascia',
      'Rear fascia',
      [g.width * 0.94, Math.max(0.2, lm.tailY - lm.sillY), 0.1],
      [0, (lm.sillY + lm.tailY) / 2, lm.zTail - 0.05],
    ),
  );

  if (g.hasBed) {
    parts.push({
      component: 'structure.bed_floor',
      shape: { kind: 'box', size: [g.width * 0.86, 0.05, lm.zTail - lm.zDeckStart] },
      position: [0, lm.deckY - 0.34, (lm.zDeckStart + lm.zTail) / 2],
      material: 'steel',
    });
    parts.push(
      panel(
        'tailgate',
        'Tailgate',
        [g.width * 0.9, lm.tailY - (lm.deckY - 0.36), 0.05],
        [0, (lm.tailY + lm.deckY - 0.36) / 2, lm.zTail - 0.04],
      ),
    );
  }

  const screenRun = lm.zScreenTop - lm.zBonnetEnd;
  const screenRise = lm.roofY - lm.bonnetY;
  parts.push({
    component: 'structure.glazing',
    variant: 'windscreen',
    instanceLabel: 'Windscreen',
    shape: { kind: 'box', size: [g.width * 0.8, Math.hypot(screenRun, screenRise), 0.015] },
    position: [0, (lm.bonnetY + lm.roofY) / 2, (lm.zBonnetEnd + lm.zScreenTop) / 2],
    rotation: [-Math.atan2(screenRun, screenRise), 0, 0],
    material: 'glass',
  });

  const backRun = lm.zDeckStart - lm.zRoofEnd;
  const backDrop = lm.roofY - lm.deckY;
  parts.push({
    component: 'structure.glazing',
    variant: 'backlight',
    instanceLabel: 'Rear screen',
    shape: { kind: 'box', size: [g.width * 0.76, Math.hypot(backRun, backDrop), 0.015] },
    position: [0, (lm.roofY + lm.deckY) / 2, (lm.zRoofEnd + lm.zDeckStart) / 2],
    rotation: [Math.atan2(backRun, backDrop), 0, 0],
    material: 'glass',
  });

  for (const side of [-1, 1] as const) {
    parts.push({
      component: 'structure.glazing',
      variant: side < 0 ? 'side_l' : 'side_r',
      instanceLabel: side < 0 ? 'Left side glass' : 'Right side glass',
      shape: { kind: 'box', size: [0.015, Math.max(0.2, lm.roofY - lm.deckY - 0.06), Math.max(0.3, lm.zRoofEnd - lm.zScreenTop + 0.2)] },
      position: [side * (hw - 0.01), (lm.deckY + lm.roofY) / 2 + 0.02, (lm.zScreenTop + lm.zRoofEnd) / 2],
      material: 'glass',
    });
  }

  return parts;
}

export function buildSuspension(l: Layout): PartDef[] {
  const { g } = l;
  const parts: PartDef[] = [];

  for (const corner of corners(l)) {
    const sideSign = corner.left ? -1 : 1;
    const label = corner.labelKey === 'corner.fl' ? 'Front left' : corner.labelKey === 'corner.fr' ? 'Front right' : corner.labelKey === 'corner.rl' ? 'Rear left' : 'Rear right';
    const inboard = corner.x - sideSign * 0.28;

    if (corner.front || !g.bodyOnFrame) {
      const strutComponent = corner.front && g.frontSuspension === 'double_wishbone' ? 'suspension.coil_spring' : 'suspension.front_strut';
      parts.push({
        component: strutComponent,
        variant: corner.variant,
        instanceLabel: label,
        shape: { kind: 'cylinder', radius: 0.055, height: 0.5 },
        position: [corner.x - sideSign * 0.04, l.hubY + 0.3, corner.z],
        rotation: [0, 0, sideSign * 0.12],
        material: 'steel',
        explode: [sideSign * 0.2, 0.55, 0],
      });
      parts.push({
        component: 'suspension.coil_spring',
        variant: `${corner.variant}_spring`,
        instanceLabel: label,
        shape: { kind: 'cylinder', radius: 0.09, height: 0.32 },
        position: [corner.x - sideSign * 0.04, l.hubY + 0.34, corner.z],
        rotation: [0, 0, sideSign * 0.12],
        material: 'steel',
        explode: [sideSign * 0.32, 0.5, 0],
      });
    }

    parts.push({
      component: 'suspension.control_arm_lower',
      variant: corner.variant,
      instanceLabel: label,
      shape: { kind: 'box', size: [0.3, 0.04, 0.12] },
      position: [corner.x - sideSign * 0.15, l.hubY - 0.1, corner.z],
      material: 'steel',
    });
    parts.push({
      component: 'suspension.ball_joint',
      variant: corner.variant,
      instanceLabel: label,
      shape: { kind: 'sphere', radius: 0.035 },
      position: [corner.x - sideSign * 0.02, l.hubY - 0.1, corner.z],
      material: 'steel',
    });

    if (corner.front && g.frontSuspension === 'double_wishbone') {
      parts.push({
        component: 'suspension.upper_wishbone',
        variant: corner.variant,
        instanceLabel: label,
        shape: { kind: 'box', size: [0.24, 0.04, 0.1] },
        position: [corner.x - sideSign * 0.13, l.hubY + 0.2, corner.z],
        material: 'steel',
      });
    }

    parts.push({
      component: 'drivetrain.wheel_hub',
      variant: corner.variant,
      instanceLabel: label,
      shape: { kind: 'cylinder', radius: 0.09, height: 0.1 },
      position: [corner.x, l.hubY, corner.z],
      rotation: ALONG_X,
      material: 'steel',
      explode: [sideSign * 0.45, 0.1, 0],
    });
    parts.push({
      component: 'drivetrain.road_wheel',
      variant: corner.variant,
      instanceLabel: label,
      shape: { kind: 'cylinder', radius: g.wheelRadius, height: g.wheelWidth },
      position: [corner.x + sideSign * 0.06, l.hubY, corner.z],
      rotation: ALONG_X,
      material: 'rubber',
      explode: [sideSign * 0.8, 0, 0],
    });
    parts.push({
      component: 'drivetrain.road_wheel',
      variant: `${corner.variant}_rim`,
      instanceLabel: `${label} rim`,
      shape: { kind: 'cylinder', radius: g.wheelRadius * 0.68, height: g.wheelWidth * 0.92 },
      position: [corner.x + sideSign * 0.075, l.hubY, corner.z],
      rotation: ALONG_X,
      material: 'aluminium',
      explode: [sideSign * 0.85, 0, 0],
    });

    if (corner.front) {
      parts.push({
        component: 'suspension.tie_rod',
        variant: corner.variant,
        instanceLabel: label,
        shape: { kind: 'cylinder', radius: 0.016, height: 0.34 },
        position: [corner.x - sideSign * 0.19, l.hubY + 0.02, corner.z + 0.14],
        rotation: ALONG_X,
        material: 'steel',
      });
    }

    parts.push({
      component: 'suspension.anti_roll_bar',
      variant: `${corner.variant}_link`,
      instanceLabel: `${label} drop link`,
      shape: { kind: 'cylinder', radius: 0.012, height: 0.22 },
      position: [corner.x - sideSign * 0.1, l.hubY + 0.02, corner.z - 0.1],
      material: 'steel',
    });

    void inboard;
  }

  for (const [variant, z, label] of [
    ['front_bar', l.zAxleF - 0.1, 'Front'],
    ['rear_bar', l.zAxleR - 0.1, 'Rear'],
  ] as const) {
    parts.push({
      component: 'suspension.anti_roll_bar',
      variant,
      instanceLabel: label,
      shape: { kind: 'cylinder', radius: 0.014, height: g.track * 0.86 },
      position: [0, l.hubY - 0.08, z],
      rotation: ALONG_X,
      material: 'steel',
    });
  }

  parts.push({
    component: 'suspension.subframe_front',
    shape: { kind: 'box', size: [g.track * 0.86, 0.07, 0.5] },
    position: [0, l.hubY - 0.16, l.zAxleF],
    material: 'steel',
  });

  parts.push({
    component: 'suspension.torsion_beam',
    shape: { kind: 'cylinder', radius: 0.05, height: g.track * 0.82 },
    position: [0, l.hubY - 0.06, l.zAxleR + 0.12],
    rotation: ALONG_X,
    material: 'steel',
  });
  for (const side of [-1, 1] as const) {
    parts.push({
      component: 'suspension.leaf_spring',
      variant: side < 0 ? 'l' : 'r',
      instanceLabel: side < 0 ? 'Left' : 'Right',
      shape: { kind: 'box', size: [0.07, 0.04, 1.25] },
      position: [side * l.halfTrack * 0.72, l.hubY - 0.14, l.zAxleR],
      material: 'steel',
    });
    parts.push({
      component: 'suspension.multilink_arm',
      variant: side < 0 ? 'l' : 'r',
      instanceLabel: side < 0 ? 'Left' : 'Right',
      shape: { kind: 'box', size: [0.26, 0.04, 0.08] },
      position: [side * l.halfTrack * 0.6, l.hubY - 0.02, l.zAxleR - 0.18],
      material: 'steel',
    });
  }
  parts.push({
    component: 'suspension.live_axle',
    shape: { kind: 'cylinder', radius: 0.055, height: g.track * 0.94 },
    position: [0, l.hubY, l.zAxleR],
    rotation: ALONG_X,
    material: 'cast_iron',
  });

  parts.push({
    component: 'suspension.steering_rack',
    shape: { kind: 'cylinder', radius: 0.035, height: g.track * 0.72 },
    position: [0, l.hubY + 0.02, l.zAxleF + 0.16],
    rotation: ALONG_X,
    material: 'aluminium',
  });
  parts.push({
    component: 'suspension.eps_motor',
    shape: { kind: 'cylinder', radius: 0.055, height: 0.13 },
    position: [0.16, l.hubY + 0.05, l.zAxleF + 0.16],
    rotation: ALONG_Z,
    material: 'aluminium',
  });

  return parts;
}

export function buildChassisHydraulics(l: Layout): PartDef[] {
  const parts: PartDef[] = [];

  for (const corner of corners(l)) {
    const sideSign = corner.left ? -1 : 1;
    parts.push({
      component: 'chassis_hydraulics.damper_internals',
      variant: corner.variant,
      instanceLabel: corner.front ? (corner.left ? 'Front left' : 'Front right') : corner.left ? 'Rear left' : 'Rear right',
      shape: { kind: 'cylinder', radius: 0.022, height: 0.36 },
      position: [corner.x - sideSign * 0.04, l.hubY + 0.28, corner.z],
      rotation: [0, 0, sideSign * 0.12],
      material: 'chrome',
      explode: [sideSign * 0.1, 0.85, 0],
    });
  }

  parts.push({
    component: 'chassis_hydraulics.clutch_master',
    shape: { kind: 'cylinder', radius: 0.032, height: 0.13 },
    position: [-0.3, l.beltlineY - 0.12, l.zFirewall - 0.06],
    rotation: ALONG_Z,
    material: 'aluminium',
  });
  parts.push({
    component: 'chassis_hydraulics.clutch_slave',
    shape: { kind: 'cylinder', radius: 0.026, height: 0.1 },
    position: [-0.22, l.floorY + 0.2, l.zFirewall - 0.34],
    rotation: ALONG_Z,
    material: 'aluminium',
  });
  parts.push({
    component: 'chassis_hydraulics.hps_pump',
    shape: { kind: 'cylinder', radius: 0.055, height: 0.12 },
    position: [-0.34, l.engineBay[1] + 0.06, l.engineBay[2] - 0.24],
    rotation: ALONG_X,
    material: 'aluminium',
  });

  return parts;
}
