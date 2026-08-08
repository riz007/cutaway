import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import type { SystemId } from '@/domain/types';
import { ARCHETYPES, COMPONENTS_BY_ID } from '@/domain/registry';
import { applyDimensions } from './procedural/layout';
import { useAppStore, useConfiguration } from '@/app/store/appStore';
import { useSimStore } from '@/sim/simStore';
import { getBuiltVehicle } from './procedural/buildVehicle';
import { buildFlows } from './procedural/buildFlows';
import type { PartInstance } from './procedural/types';
import { getEdges, getGeometry } from './geometry';
import { realisticMaterial, schematicMaterial, xrayMaterial } from './materials';
import { advanceWheelAngle, applyMotion, planFor, type FrameContext } from './animation';
import { FlowTube } from './flow/FlowTube';

const OUTLINE_SELECTED = new THREE.LineBasicMaterial({ color: '#fbbf24', depthTest: false, transparent: true });
const OUTLINE_HOVER = new THREE.LineBasicMaterial({ color: '#7dd3fc', depthTest: false, transparent: true, opacity: 0.85 });

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
      userData={{ partIndex: index, componentId: part.componentId, nodeId: part.nodeId }}
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

  return <lineSegments ref={ref} geometry={edges} material={material} renderOrder={5} frustumCulled={false} />;
}

export function VehicleScene() {
  const config = useConfiguration();
  const { invalidate } = useThree();

  const activeSystems = useAppStore((s) => s.activeSystems);
  const renderMode = useAppStore((s) => s.renderMode);
  const explodeTarget = useAppStore((s) => s.explode);
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
  const explodeRef = useRef(0);
  const wheelAngleRef = useRef(0);

  const cylinders = config.powertrain === 'hev_series_parallel' || config.powertrain === 'erev' ? 3 : 4;
  const wheelRadius = applyDimensions(ARCHETYPES[config.archetype].geometry, config.dimensions).wheelRadius;

  useEffect(() => {
    invalidate();
  }, [
    invalidate,
    explodeTarget,
    renderMode,
    activeSystems,
    selectedComponentId,
    hoveredComponentId,
    focusedComponentId,
    showFlows,
    cutaway,
  ]);

  const visibility = useMemo(() => {
    const showAll = activeSystems.size === 0;
    const focusSystem: SystemId | null = focusedComponentId
      ? (COMPONENTS_BY_ID.get(focusedComponentId)?.system ?? null)
      : null;

    const SHELL: SystemId[] = ['structure', 'interior'];

    return built.parts.map((part) => {
      const inActive = showAll || activeSystems.has(part.system);
      const isFocusTarget = focusedComponentId ? part.componentId === focusedComponentId : false;
      const isShell = SHELL.includes(part.system);

      if (focusedComponentId) {
        return { visible: true, ghosted: !isFocusTarget && part.system !== focusSystem };
      }
      if (cutaway && isShell && !activeSystems.has(part.system)) {
        return { visible: true, ghosted: true };
      }
      if (renderMode === 'xray') {
        return { visible: true, ghosted: !inActive };
      }
      return { visible: inActive, ghosted: false };
    });
  }, [built.parts, activeSystems, renderMode, focusedComponentId, cutaway]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const sim = useSimStore.getState();

    const target = explodeTarget;
    if (reducedMotion) {
      explodeRef.current = target;
    } else if (Math.abs(explodeRef.current - target) > 0.001) {
      explodeRef.current += (target - explodeRef.current) * Math.min(1, delta * 7);
      invalidate();
    } else {
      explodeRef.current = target;
    }

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

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    const data = event.object.userData as { componentId?: string; nodeId?: string };
    if (!data.componentId) return;
    event.stopPropagation();
    select(data.componentId, data.nodeId ?? null);
  };

  const handleDoubleClick = (event: ThreeEvent<MouseEvent>) => {
    const data = event.object.userData as { componentId?: string };
    if (!data.componentId) return;
    event.stopPropagation();
    focus(data.componentId);
  };

  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    const data = event.object.userData as { componentId?: string };
    if (!data.componentId) return;
    event.stopPropagation();
    hover(data.componentId);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    hover(null);
    document.body.style.cursor = '';
  };

  const selectedPart =
    built.parts.find((p) => (selectedNodeId ? p.nodeId === selectedNodeId : p.componentId === selectedComponentId)) ?? null;
  const hoveredPart =
    hoveredComponentId && hoveredComponentId !== selectedComponentId
      ? (built.parts.find((p) => p.componentId === hoveredComponentId) ?? null)
      : null;

  return (
    <group
      ref={groupRef}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
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
