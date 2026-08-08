import type { PartDef } from '../types';
import { ALONG_X, ALONG_Z, type Layout } from '../layout';

export function buildElectrical(l: Layout): PartDef[] {
  const parts: PartDef[] = [];
  const [ex, ey, ez] = l.engineBay;
  const bayFloorY = l.floorY + 0.42;
  const skateboard = l.g.engineLayout === 'none';

  parts.push({
    component: 'electrical.battery_12v',
    shape: { kind: 'box', size: [0.19, 0.18, 0.24] },
    position: [0.36, bayFloorY, l.zNose + 0.62],
    material: 'plastic_black',
    explode: [0.5, 0.7, 0],
  });
  parts.push({
    component: 'electrical.alternator',
    shape: { kind: 'cylinder', radius: 0.065, height: 0.12 },
    position: [ex - 0.28, ey - 0.06, ez - 0.14],
    rotation: ALONG_X,
    material: 'aluminium',
    explode: [-0.7, 0.1, -0.3],
  });
  parts.push({
    component: 'electrical.starter_motor',
    shape: { kind: 'cylinder', radius: 0.05, height: 0.16 },
    position: [ex + 0.18, ey - 0.16, ez + 0.14],
    rotation: ALONG_X,
    material: 'steel',
    explode: [0.5, -0.4, 0.3],
  });
  parts.push({
    component: 'electrical.dcdc_converter',
    shape: { kind: 'box', size: [0.2, 0.09, 0.16] },
    position: [-0.18, bayFloorY + 0.04, l.zNose + 0.66],
    material: 'aluminium',
    explode: [-0.3, 0.7, 0],
  });
  parts.push({
    component: 'electrical.fuse_box_engine',
    shape: { kind: 'box', size: [0.16, 0.1, 0.2] },
    position: [0.36, bayFloorY + 0.16, l.zNose + 0.62],
    material: 'plastic_black',
    explode: [0.5, 0.9, 0],
  });
  parts.push({
    component: 'electrical.fuse_box_cabin',
    shape: { kind: 'box', size: [0.14, 0.1, 0.06] },
    position: [-0.42, l.beltlineY - 0.18, l.zFirewall + 0.24],
    material: 'plastic_black',
  });

  for (const side of [-1, 1] as const) {
    parts.push({
      component: 'electrical.harness_main',
      variant: side < 0 ? 'l' : 'r',
      instanceLabel: side < 0 ? 'Left run' : 'Right run',
      shape: { kind: 'cylinder', radius: 0.014, height: l.g.length * 0.7 },
      position: [side * (l.halfWidth - 0.1), l.floorY + 0.08, 0],
      rotation: ALONG_Z,
      material: 'plastic_black',
    });
  }
  parts.push({
    component: 'electrical.can_bus',
    shape: { kind: 'cylinder', radius: 0.008, height: l.g.length * 0.62 },
    position: [0.02, l.floorY + 0.1, 0.05],
    rotation: ALONG_Z,
    material: 'copper',
    explode: [0, 0.9, 0],
  });
  parts.push({
    component: 'electrical.lin_bus',
    shape: { kind: 'cylinder', radius: 0.005, height: l.g.length * 0.36 },
    position: [-0.06, l.floorY + 0.1, l.zFirewall + 0.4],
    rotation: ALONG_Z,
    material: 'copper',
    explode: [0, 0.9, 0],
  });
  parts.push({
    component: 'electrical.ecu_engine',
    shape: { kind: 'box', size: [0.16, 0.04, 0.13] },
    position: [-0.34, l.beltlineY - 0.06, l.zFirewall - 0.16],
    material: 'aluminium',
    explode: [-0.4, 0.8, 0],
  });
  parts.push({
    component: 'electrical.ecu_body',
    shape: { kind: 'box', size: [0.14, 0.04, 0.11] },
    position: [0.34, l.beltlineY - 0.2, l.zFirewall + 0.24],
    material: 'aluminium',
  });
  parts.push({
    component: 'electrical.ignition_coil',
    shape: { kind: 'box', size: [0.28, 0.06, 0.04] },
    position: l.g.engineLayout === 'longitudinal' ? [ex + 0.06, ey + 0.32, ez] : [ex, ey + 0.32, ez + 0.06],
    rotation: l.g.engineLayout === 'longitudinal' ? ALONG_Z : [0, 0, 0],
    material: 'plastic_black',
    explode: [0, 1.1, 0],
  });

  for (const side of [-1, 1] as const) {
    parts.push({
      component: 'electrical.headlight',
      variant: side < 0 ? 'l' : 'r',
      instanceLabel: side < 0 ? 'Left' : 'Right',
      shape: { kind: 'box', size: [0.3, 0.14, 0.12] },
      position: [side * l.halfWidth * 0.68, l.beltlineY - 0.14, l.zNose + 0.1],
      material: 'glass',
      explode: [side * 0.4, 0.2, -0.7],
    });
    parts.push({
      component: 'electrical.taillight',
      variant: side < 0 ? 'l' : 'r',
      instanceLabel: side < 0 ? 'Left' : 'Right',
      shape: { kind: 'box', size: [0.22, 0.16, 0.08] },
      position: [side * l.halfWidth * 0.78, l.beltlineY - 0.12, l.zTail - 0.08],
      material: 'glass',
      explode: [side * 0.4, 0.2, 0.7],
    });
  }

  const packZ = skateboard ? (l.zAxleF + l.zAxleR) / 2 : l.zAxleR - 0.5;
  const packY = skateboard ? l.g.groundClearance + 0.07 : l.floorY + 0.14;
  parts.push({
    component: 'electrical.inverter',
    shape: { kind: 'box', size: [0.26, 0.13, 0.2] },
    position: skateboard ? [0, l.hubY + 0.2, l.zAxleR - 0.3] : [ex + 0.1, ey + 0.34, ez - 0.02],
    material: 'hv_orange',
    explode: [0, 0.9, 0],
  });
  parts.push({
    component: 'electrical.bms',
    shape: { kind: 'box', size: [0.16, 0.05, 0.12] },
    position: [0.2, packY + 0.1, packZ],
    material: 'plastic_black',
    explode: [0.4, 0.8, 0],
  });
  parts.push({
    component: 'electrical.contactor',
    shape: { kind: 'box', size: [0.09, 0.08, 0.09] },
    position: [-0.2, packY + 0.11, packZ - 0.1],
    material: 'hv_orange',
    explode: [-0.4, 0.8, 0],
  });
  parts.push({
    component: 'electrical.service_disconnect',
    shape: { kind: 'box', size: [0.08, 0.1, 0.06] },
    position: [0, packY + 0.13, packZ + 0.2],
    material: 'hv_orange',
    explode: [0, 1.0, 0],
  });
  parts.push({
    component: 'electrical.hv_cable',
    shape: { kind: 'cylinder', radius: 0.014, height: Math.abs(packZ - (skateboard ? l.zAxleR - 0.3 : ez)) + 0.2 },
    position: [-0.08, packY + 0.14, (packZ + (skateboard ? l.zAxleR - 0.3 : ez)) / 2],
    rotation: ALONG_Z,
    material: 'hv_orange',
    explode: [0, 0.7, 0],
  });
  parts.push({
    component: 'electrical.obc',
    shape: { kind: 'box', size: [0.22, 0.1, 0.18] },
    position: [0.24, packY + 0.14, packZ - 0.36],
    material: 'hv_orange',
  });
  parts.push({
    component: 'electrical.charge_port',
    shape: { kind: 'cylinder', radius: 0.055, height: 0.06 },
    position: [l.halfWidth - 0.03, l.beltlineY - 0.22, l.zNose + 0.85],
    rotation: ALONG_X,
    material: 'plastic_black',
    explode: [0.8, 0.1, 0],
  });

  return parts;
}

export function buildSafetyAdas(l: Layout): PartDef[] {
  const parts: PartDef[] = [];
  const dashY = l.beltlineY - 0.02;

  parts.push({
    component: 'safety_adas.airbag_front',
    variant: 'driver',
    instanceLabel: 'Driver',
    shape: { kind: 'cylinder', radius: 0.075, height: 0.05 },
    position: [-0.36, dashY + 0.18, l.zFirewall + 0.5],
    rotation: [0.4, 0, 0],
    material: 'fabric',
    explode: [0, 0.8, 0.5],
  });
  parts.push({
    component: 'safety_adas.airbag_front',
    variant: 'passenger',
    instanceLabel: 'Passenger',
    shape: { kind: 'box', size: [0.24, 0.06, 0.14] },
    position: [0.34, dashY + 0.04, l.zFirewall + 0.3],
    material: 'fabric',
    explode: [0, 0.8, 0.5],
  });

  for (const side of [-1, 1] as const) {
    const label = side < 0 ? 'Left' : 'Right';
    parts.push({
      component: 'safety_adas.airbag_curtain',
      variant: side < 0 ? 'l' : 'r',
      instanceLabel: label,
      shape: { kind: 'box', size: [0.05, 0.06, (l.zCabinEnd - l.zFirewall) * 0.8] },
      position: [side * (l.halfWidth - 0.05), l.roofY - 0.08, (l.zFirewall + l.zCabinEnd) / 2],
      material: 'fabric',
      explode: [side * 0.5, 0.5, 0],
    });
    parts.push({
      component: 'safety_adas.pretensioner',
      variant: side < 0 ? 'l' : 'r',
      instanceLabel: label,
      shape: { kind: 'cylinder', radius: 0.03, height: 0.09 },
      position: [side * (l.halfWidth - 0.08), l.beltlineY - 0.12, (l.zFirewall + l.zCabinEnd) / 2],
      rotation: ALONG_Z,
      material: 'steel',
    });
    parts.push({
      component: 'safety_adas.blind_spot_radar',
      variant: side < 0 ? 'l' : 'r',
      instanceLabel: label,
      shape: { kind: 'box', size: [0.07, 0.05, 0.03] },
      position: [side * l.halfWidth * 0.85, l.floorY + 0.32, l.zTail - 0.14],
      material: 'plastic_black',
    });
    parts.push({
      component: 'safety_adas.crash_sensor',
      variant: side < 0 ? 'l' : 'r',
      instanceLabel: label,
      shape: { kind: 'box', size: [0.04, 0.03, 0.03] },
      position: [side * l.halfWidth * 0.6, l.floorY + 0.3, l.zNose + 0.2],
      material: 'plastic_black',
      explode: [side * 0.3, 0.5, -0.6],
    });
  }

  parts.push({
    component: 'safety_adas.front_radar',
    shape: { kind: 'box', size: [0.11, 0.09, 0.04] },
    position: [0, l.floorY + 0.2, l.zNose + 0.05],
    material: 'plastic_black',
    explode: [0, 0.2, -0.9],
  });
  parts.push({
    component: 'safety_adas.windscreen_camera',
    shape: { kind: 'box', size: [0.09, 0.05, 0.06] },
    position: [0, l.roofY - 0.12, l.zFirewall + 0.5],
    material: 'plastic_black',
    explode: [0, 0.7, 0.3],
  });
  parts.push({
    component: 'safety_adas.yaw_sensor',
    shape: { kind: 'box', size: [0.05, 0.03, 0.05] },
    position: [0, l.floorY + 0.06, (l.zFirewall + l.zCabinEnd) / 2],
    material: 'plastic_black',
  });

  for (let i = 0; i < 4; i += 1) {
    parts.push({
      component: 'safety_adas.ultrasonic_sensor',
      variant: `front_${i}`,
      instanceLabel: `Front ${i + 1}`,
      shape: { kind: 'cylinder', radius: 0.011, height: 0.02 },
      position: [(-1.5 + i) * l.halfWidth * 0.42, l.floorY + 0.18, l.zNose + 0.02],
      rotation: ALONG_Z,
      material: 'plastic_black',
    });
    parts.push({
      component: 'safety_adas.ultrasonic_sensor',
      variant: `rear_${i}`,
      instanceLabel: `Rear ${i + 1}`,
      shape: { kind: 'cylinder', radius: 0.011, height: 0.02 },
      position: [(-1.5 + i) * l.halfWidth * 0.42, l.floorY + 0.18, l.zTail - 0.02],
      rotation: ALONG_Z,
      material: 'plastic_black',
    });
  }

  return parts;
}

export function buildInterior(l: Layout): PartDef[] {
  const parts: PartDef[] = [];
  const seatZFront = l.zFirewall + 0.75;
  const seatY = l.floorY + 0.28;
  const rowPitch = 0.8;

  for (const side of [-1, 1] as const) {
    const label = side < 0 ? 'Driver' : 'Passenger';
    parts.push({
      component: 'interior.seat_front',
      variant: side < 0 ? 'driver' : 'passenger',
      instanceLabel: label,
      shape: { kind: 'box', size: [0.44, 0.12, 0.46] },
      position: [side * l.halfWidth * 0.45, seatY, seatZFront],
      material: 'fabric',
      explode: [side * 0.4, 0.5, 0],
    });
    parts.push({
      component: 'interior.seat_front',
      variant: side < 0 ? 'driver_back' : 'passenger_back',
      instanceLabel: `${label} backrest`,
      shape: { kind: 'box', size: [0.44, 0.6, 0.1] },
      position: [side * l.halfWidth * 0.45, seatY + 0.34, seatZFront + 0.2],
      rotation: [0.16, 0, 0],
      material: 'fabric',
      explode: [side * 0.4, 0.5, 0.2],
    });
  }

  for (let row = 1; row < l.g.cabinRows; row += 1) {
    parts.push({
      component: 'interior.seat_rear',
      variant: `row${row + 1}`,
      instanceLabel: `Row ${row + 1}`,
      shape: { kind: 'box', size: [l.g.width * 0.78, 0.12, 0.44] },
      position: [0, seatY, seatZFront + rowPitch * row],
      material: 'fabric',
      explode: [0, 0.5, 0.3],
    });
    parts.push({
      component: 'interior.seat_rear',
      variant: `row${row + 1}_back`,
      instanceLabel: `Row ${row + 1} backrest`,
      shape: { kind: 'box', size: [l.g.width * 0.78, 0.55, 0.1] },
      position: [0, seatY + 0.32, seatZFront + rowPitch * row + 0.2],
      rotation: [0.2, 0, 0],
      material: 'fabric',
      explode: [0, 0.5, 0.4],
    });
  }

  parts.push({
    component: 'interior.dashboard',
    shape: { kind: 'box', size: [l.g.width * 0.88, 0.22, 0.34] },
    position: [0, l.beltlineY - 0.02, l.zFirewall + 0.28],
    material: 'plastic_black',
    explode: [0, 0.6, 0.6],
  });
  parts.push({
    component: 'interior.instrument_cluster',
    shape: { kind: 'box', size: [0.3, 0.14, 0.05] },
    position: [-0.36, l.beltlineY + 0.08, l.zFirewall + 0.42],
    rotation: [0.25, 0, 0],
    material: 'glass',
    explode: [-0.2, 0.8, 0.6],
  });
  parts.push({
    component: 'interior.infotainment',
    shape: { kind: 'box', size: [0.26, 0.17, 0.04] },
    position: [0, l.beltlineY + 0.06, l.zFirewall + 0.4],
    rotation: [0.12, 0, 0],
    material: 'glass',
    explode: [0, 0.8, 0.6],
  });
  parts.push({
    component: 'interior.steering_wheel',
    shape: { kind: 'torus', radius: 0.17, tube: 0.018 },
    position: [-0.36, l.beltlineY + 0.14, l.zFirewall + 0.52],
    rotation: [1.15, 0, 0],
    material: 'plastic_black',
    explode: [-0.2, 0.7, 0.8],
  });
  parts.push({
    component: 'interior.pedal_box',
    shape: { kind: 'box', size: [0.22, 0.08, 0.12] },
    position: [-0.3, l.floorY + 0.16, l.zFirewall + 0.16],
    material: 'steel',
    explode: [-0.3, 0.3, 0.7],
  });

  return parts;
}
