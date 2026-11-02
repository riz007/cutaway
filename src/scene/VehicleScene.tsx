import { memo, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html, useCursor } from '@react-three/drei';
import type { SystemId } from '@/domain/types';
import { ARCHETYPES, COMPONENTS_BY_ID } from '@/domain/registry';
import { applyDimensions } from './procedural/layout';
import { useAppStore, useConfiguration } from '@/app/store/appStore';
import { useSimStore } from '@/sim/simStore';
import { getBuiltVehicle } from './procedural/buildVehicle';
import { buildFlows } from './procedural/buildFlows';
import type { PartInstance } from './procedural/types';
import { acceleratedRaycast, getEdges, getGeometry } from './geometry';
import { realisticMaterial, schematicMaterial, xrayMaterial } from './materials';
import { advanceWheelAngle, applyMotion, planFor, type FrameContext } from './animation';
import { FlowTube } from './flow/FlowTube';
import { SystemDot } from '@/ui/primitives';

const OUTLINE_SELECTED = new THREE.LineBasicMaterial({ color: '#fbbf24', depthTest: false, transparent: true });
const OUTLINE_HOVER = new THREE.LineBasicMaterial({ color: '#7dd3fc', depthTest: false, transparent: true, opacity: 0.85 });
const NO_RAYCAST = () => undefined;

const SHELL: SystemId[] = ['structure', 'interior'];

// Housings that hide the moving parts. Cutaway makes them glass so the
// mechanism is visible while it runs.
const CASINGS = new Set([
  'powertrain.engine_block',
  'powertrain.cylinder_head',
  'powertrain.head_gasket',
  'powertrain.timing_chain',
  'lubrication.sump',
  'cooling.water_jacket',
  'drivetrain.transaxle',
  'drivetrain.gearbox',
]);

const damp = (current: number, target: number, lambda: number, dt: number) =>
  target + (current - target) * Math.exp(-lambda * dt);

interface PartMeshProps {
  part: PartInstance;
  index: number;
  visible: boolean;
  ghosted: boolean;
  schematic: boolean;
}

const PartMesh = memo(function PartMesh({ part, index, visible, ghosted, schematic }: PartMeshProps) {
  const geometry = getGeometry(part.shape, part.lod);
  const material = ghosted ? xrayMaterial() : schematic ? schematicMaterial(part.system) : realisticMaterial(part.material);

  return (
    <mesh
      name={part.nodeId}
      geometry={geometry}
      material={material}
      visible={visible}
      renderOrder={ghosted ? 3 : 0}
      raycast={acceleratedRaycast}
      userData={{ partIndex: index, componentId: part.componentId, nodeId: part.nodeId, ghosted }}
    />
  );
});

function Outline({ part, material }: { part: PartInstance; material: THREE.Material }) {
  const ref = useRef<THREE.LineSegments>(null);
  const edges = getEdges(part.shape, part.lod);

  useFrame(() => {
    const overlay = ref.current;
    if (!overlay) return;
    const source = overlay.parent?.getObjectByName(part.nodeId);
    if (source) {
      overlay.position.copy(source.position);
      overlay.quaternion.copy(source.quaternion);
    }
  });

  return (
    <lineSegments
      ref={ref}
      geometry={edges}
      material={material}
      renderOrder={5}
      frustumCulled={false}
      raycast={NO_RAYCAST}
    />
  );
}

function HoverLabel({ part, point }: { part: PartInstance; point: React.MutableRefObject<THREE.Vector3> }) {
  const group = useRef<THREE.Group>(null);
  const component = COMPONENTS_BY_ID.get(part.componentId);

  useFrame(() => {
    group.current?.position.copy(point.current);
  });

  if (!component) return null;

  return (
    <group ref={group}>
      <Html zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
        <div
          aria-hidden
          className="flex -translate-y-1/2 translate-x-4 items-center gap-2 whitespace-nowrap rounded-full border border-border-strong bg-surface/95 py-1 pl-1.5 pr-3 shadow-xl backdrop-blur"
        >
          <SystemDot system={component.system} />
          <span className="text-sm font-medium text-fg">{component.label}</span>
          {part.instanceLabel && <span className="text-2xs text-subtle">{part.instanceLabel}</span>}
        </div>
      </Html>
    </group>
  );
}

type PartHit = { object: THREE.Object3D; point: THREE.Vector3 };

function firstSolidHit(intersections: readonly PartHit[]): PartHit | null {
  for (const hit of intersections) {
    const data = hit.object.userData as { componentId?: string; ghosted?: boolean };
    if (data.componentId && !data.ghosted && hit.object.visible) return hit;
  }
  return null;
}

export function VehicleScene() {
  const config = useConfiguration();
  const { invalidate } = useThree();

  const activeSystems = useAppStore((s) => s.activeSystems);
  const renderMode = useAppStore((s) => s.renderMode);
  const selectedComponentId = useAppStore((s) => s.selectedComponentId);
  const selectedNodeId = useAppStore((s) => s.selectedNodeId);
  const hoveredComponentId = useAppStore((s) => s.hoveredComponentId);
  const focusedComponentId = useAppStore((s) => s.focusedComponentId);
  const showFlows = useAppStore((s) => s.showFlows);
  const cutaway = useAppStore((s) => s.cutaway);
  const reducedMotion = useAppStore((s) => s.reducedMotion);
  const select = useAppStore((s) => s.select);
  const hover = useAppStore((s) => s.hover);
  const focus = useAppStore((s) => s.focus);

  const built = useMemo(() => getBuiltVehicle(config), [config.vehicleId, config.archetype, config.powertrain]);
  const flows = useMemo(() => buildFlows(built.parts, config), [built, config.archetype, config.powertrain]);
  const plans = useMemo(() => built.parts.map(planFor), [built]);

  const groupRef = useRef<THREE.Group>(null);
  const explodeRef = useRef(useAppStore.getState().explode);
  const snapRef = useRef(useAppStore.getState().explodeSnap);
  const wheelAngleRef = useRef(0);
  const hoverPoint = useRef(new THREE.Vector3());
  const [canvasHover, setCanvasHover] = useState<string | null>(null);

  useCursor(canvasHover !== null);

  const cylinders = config.powertrain === 'hev_series_parallel' || config.powertrain === 'erev' ? 3 : 4;
  const wheelRadius = applyDimensions(ARCHETYPES[config.archetype].geometry, config.dimensions).wheelRadius;

  useEffect(
    () =>
      useAppStore.subscribe((next, prev) => {
        if (next.explode !== prev.explode || next.explodeSnap !== prev.explodeSnap) invalidate();
      }),
    [invalidate],
  );

  useEffect(() => {
    invalidate();
  }, [invalidate, renderMode, activeSystems, selectedComponentId, hoveredComponentId, focusedComponentId, showFlows, cutaway]);

  const visibility = useMemo(() => {
    const showAll = activeSystems.size === 0;
    const focusSystem: SystemId | null = focusedComponentId
      ? (COMPONENTS_BY_ID.get(focusedComponentId)?.system ?? null)
      : null;

    return built.parts.map((part) => {
      const inActive = showAll || activeSystems.has(part.system);
      const isFocusTarget = focusedComponentId ? part.componentId === focusedComponentId : false;
      const isSelected = part.componentId === selectedComponentId;

      if (focusedComponentId) {
        const housing = CASINGS.has(part.componentId);
        return { visible: true, ghosted: !isFocusTarget && (part.system !== focusSystem || housing) };
      }
      if (cutaway && !isSelected) {
        if (CASINGS.has(part.componentId)) return { visible: inActive, ghosted: true };
        if (SHELL.includes(part.system) && !activeSystems.has(part.system)) return { visible: showAll, ghosted: true };
      }
      if (renderMode === 'xray') {
        return { visible: true, ghosted: !inActive };
      }
      return { visible: inActive, ghosted: false };
    });
  }, [built.parts, activeSystems, renderMode, focusedComponentId, selectedComponentId, cutaway]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const { explode: target, explodeSnap } = useAppStore.getState();
    if (reducedMotion || explodeSnap !== snapRef.current) {
      explodeRef.current = target;
      snapRef.current = explodeSnap;
    } else {
      explodeRef.current = damp(explodeRef.current, target, 9, delta);
      if (Math.abs(explodeRef.current - target) < 0.0005) explodeRef.current = target;
      else invalidate();
    }

    const sim = useSimStore.getState();
    wheelAngleRef.current = advanceWheelAngle(wheelAngleRef.current, sim.vehicleSpeedKph, wheelRadius, delta);

    const ctx: FrameContext = {
      sim,
      explode: explodeRef.current,
      time: state.clock.elapsedTime,
      cylinders,
      wheelAngle: wheelAngleRef.current,
    };

    for (const child of group.children) {
      const index = (child.userData as { partIndex?: number }).partIndex;
      if (index === undefined) continue;
      const plan = plans[index];
      if (plan) applyMotion(child, plan, ctx);
    }
  });

  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    const hit = firstSolidHit(event.intersections);
    const componentId = (hit?.object.userData as { componentId?: string } | undefined)?.componentId ?? null;
    if (hit) hoverPoint.current.copy(hit.point);
    if (componentId !== canvasHover) {
      setCanvasHover(componentId);
      hover(componentId);
    }
    event.stopPropagation();
    invalidate();
  };

  const handlePointerLeave = () => {
    setCanvasHover(null);
    hover(null);
  };

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    const hit = firstSolidHit(event.intersections);
    if (!hit) return;
    const data = hit.object.userData as { componentId: string; nodeId?: string };
    event.stopPropagation();
    select(data.componentId, data.nodeId ?? null);
  };

  const handleDoubleClick = (event: ThreeEvent<MouseEvent>) => {
    const hit = firstSolidHit(event.intersections);
    if (!hit) return;
    event.stopPropagation();
    focus((hit.object.userData as { componentId: string }).componentId);
  };

  const selectedPart =
    built.parts.find((p) => (selectedNodeId ? p.nodeId === selectedNodeId : p.componentId === selectedComponentId)) ?? null;
  const hoveredPart =
    hoveredComponentId && hoveredComponentId !== selectedComponentId
      ? (built.parts.find((p) => p.componentId === hoveredComponentId) ?? null)
      : null;
  const labelPart = canvasHover ? (built.parts.find((p) => p.componentId === canvasHover) ?? null) : null;

  return (
    <group
      ref={groupRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
    >
      {built.parts.map((part, index) => (
        <PartMesh
          key={part.nodeId}
          part={part}
          index={index}
          visible={visibility[index]?.visible ?? true}
          ghosted={visibility[index]?.ghosted ?? false}
          schematic={renderMode === 'schematic'}
        />
      ))}

      {selectedPart && <Outline part={selectedPart} material={OUTLINE_SELECTED} />}
      {hoveredPart && <Outline part={hoveredPart} material={OUTLINE_HOVER} />}
      {labelPart && <HoverLabel part={labelPart} point={hoverPoint} />}

      {showFlows &&
        flows.map((flow) => (
          <FlowTube
            key={flow.id}
            flow={flow}
            visible
            dimmed={activeSystems.size > 0 && !activeSystems.has(flow.system)}
          />
        ))}
    </group>
  );
}
