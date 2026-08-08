import { useEffect } from 'react';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { VEHICLES_BY_ID, DEFAULT_VEHICLE_ID } from '@/domain/registry';
import { useAppStore } from './store/appStore';
import { AppShell } from './AppShell';
import { TextAnatomy } from '@/ui/Fallback/TextAnatomy';

function VehicleRoute() {
  const { vehicleId, trimId } = useParams<{ vehicleId: string; trimId?: string }>();
  const selectVehicle = useAppStore((s) => s.selectVehicle);
  const navigate = useNavigate();

  useEffect(() => {
    if (!vehicleId) return;
    if (!VEHICLES_BY_ID.has(vehicleId)) {
      navigate(`/v/${DEFAULT_VEHICLE_ID}`, { replace: true });
      return;
    }
    selectVehicle(vehicleId, trimId);
  }, [vehicleId, trimId, selectVehicle, navigate]);

  return <AppShell />;
}

function FallbackRoute() {
  const setForceFallback = useAppStore((s) => s.setForceFallback);
  useEffect(() => {
    setForceFallback(true);
  }, [setForceFallback]);
  return <TextAnatomy />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />} />
      <Route path="/v/:vehicleId" element={<VehicleRoute />} />
      <Route path="/v/:vehicleId/:trimId" element={<VehicleRoute />} />
      <Route path="/fallback" element={<FallbackRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
