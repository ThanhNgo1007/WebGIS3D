import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import CloseIcon from '@mui/icons-material/Close';
import Rotate90DegreesCcwIcon from '@mui/icons-material/Rotate90DegreesCcw';
import StreetviewIcon from '@mui/icons-material/Streetview';
import ThreeDRotationIcon from '@mui/icons-material/ThreeDRotation';
import VerticalAlignTopIcon from '@mui/icons-material/VerticalAlignTop';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import { Box, IconButton, Paper, Slider, Tooltip, Typography } from '@mui/material';
import * as Cesium from 'cesium';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { GisItem } from '../types/GisItem';

interface ModelViewControlsProps {
  viewer: Cesium.Viewer | null | undefined;
  selectedItem: GisItem | null;
  onClose: () => void;
}

// Preset camera angles: { label, icon, pitch (degrees), heading (degrees) }
// distance is optional — uses the slider value if not set
const PRESETS = [
  { label: 'Nhìn từ trên', icon: <VerticalAlignTopIcon fontSize="small" />, pitch: -90, heading: 0 },
  { label: 'Nhìn nghiêng 45°', icon: <ViewInArIcon fontSize="small" />, pitch: -45, heading: 0 },
  { label: 'Ngang tầm mắt', icon: <StreetviewIcon fontSize="small" />, pitch: -10, heading: 0 },
  { label: 'Từ phía Bắc', icon: <ThreeDRotationIcon fontSize="small" />, pitch: -30, heading: 0 },
  { label: 'Từ phía Đông', icon: <ThreeDRotationIcon fontSize="small" />, pitch: -30, heading: 90 },
  { label: 'Từ phía Nam', icon: <ThreeDRotationIcon fontSize="small" />, pitch: -30, heading: 180 },
];

const ModelViewControls: React.FC<ModelViewControlsProps> = ({ viewer, selectedItem, onClose }) => {
  const [isOrbiting, setIsOrbiting] = useState(false);
  const [orbitSpeed, setOrbitSpeed] = useState(6); // degrees per second
  const [viewDistance, setViewDistance] = useState(300);
  const orbitRef = useRef<{ cancel: () => void } | null>(null);

  // Fly camera to a specific angle around the selected item using lookAt
  const flyToAngle = useCallback((pitch: number, heading: number, distance?: number) => {
    if (!viewer || !selectedItem) return;

    // Stop any active orbit first
    if (orbitRef.current) {
      orbitRef.current.cancel();
      orbitRef.current = null;
      setIsOrbiting(false);
    }

    const target = Cesium.Cartesian3.fromDegrees(selectedItem.longitude, selectedItem.latitude, 0);
    const range = distance ?? viewDistance;

    // Use lookAt to precisely center camera on the model
    const offset = new Cesium.HeadingPitchRange(
      Cesium.Math.toRadians(heading),
      Cesium.Math.toRadians(pitch),
      range
    );

    viewer.camera.lookAt(target, offset);
    viewer.scene.requestRender();

    // Unlock camera after a short delay so user can continue navigating
    setTimeout(() => {
      if (viewer && !viewer.isDestroyed()) {
        viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
      }
    }, 100);
  }, [viewer, selectedItem, viewDistance]);

  // Start/stop orbiting around the model
  const toggleOrbit = useCallback(() => {
    if (!viewer || !selectedItem) return;

    if (isOrbiting) {
      // Stop orbit
      if (orbitRef.current) {
        orbitRef.current.cancel();
        orbitRef.current = null;
      }
      setIsOrbiting(false);
      return;
    }

    // Start orbit
    setIsOrbiting(true);

    const center = Cesium.Cartesian3.fromDegrees(selectedItem.longitude, selectedItem.latitude, 0);
    let currentHeading = viewer.camera.heading;
    let cancelled = false;

    const tick = () => {
      if (cancelled || !viewer) return;
      currentHeading += Cesium.Math.toRadians(orbitSpeed * 0.016); // ~60fps

      const offset = new Cesium.HeadingPitchRange(
        currentHeading,
        Cesium.Math.toRadians(-35),
        viewDistance
      );

      viewer.camera.lookAt(center, offset);
      viewer.scene.requestRender();
      requestAnimationFrame(tick);
    };

    orbitRef.current = {
      cancel: () => {
        cancelled = true;
        // Unlock camera from lookAt
        viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
      },
    };

    tick();
  }, [viewer, selectedItem, isOrbiting, orbitSpeed, viewDistance]);

  // Cleanup orbit on unmount or item change
  useEffect(() => {
    return () => {
      if (orbitRef.current) {
        orbitRef.current.cancel();
        orbitRef.current = null;
      }
    };
  }, [selectedItem]);

  // Stop orbit when item deselected
  useEffect(() => {
    if (!selectedItem && orbitRef.current) {
      orbitRef.current.cancel();
      orbitRef.current = null;
      setIsOrbiting(false);
    }
  }, [selectedItem]);

  if (!selectedItem) return null;

  return (
    <Paper
      sx={{
        position: 'absolute',
        top: '50%',
        right: 16,
        transform: 'translateY(-50%)',
        zIndex: 1000,
        p: 1.5,
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        minWidth: 52,
        alignItems: 'center',
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
        <ViewInArIcon sx={{ fontSize: 14, color: '#00e5ff' }} />
        <Typography variant="caption" sx={{ color: '#00e5ff', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          3D
        </Typography>
        <IconButton size="small" onClick={onClose} sx={{ p: 0.2, color: '#64748b', ml: 'auto' }}>
          <CloseIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Box>

      {/* Preset angles */}
      {PRESETS.map((preset, i) => (
        <Tooltip key={i} title={preset.label} placement="left" arrow>
          <IconButton
            size="small"
            onClick={() => flyToAngle(preset.pitch, preset.heading)}
            sx={{
              color: '#cbd5e1',
              width: 36,
              height: 36,
              '&:hover': { color: '#00e5ff', bgcolor: 'rgba(0,229,255,0.1)' },
            }}
          >
            {preset.icon}
          </IconButton>
        </Tooltip>
      ))}

      {/* Divider */}
      <Box sx={{ width: '80%', height: 1, bgcolor: 'rgba(255,255,255,0.08)', my: 0.5 }} />

      {/* Orbit button */}
      <Tooltip title={isOrbiting ? 'Dừng quay' : 'Quay quanh model'} placement="left" arrow>
        <IconButton
          size="small"
          onClick={toggleOrbit}
          sx={{
            color: isOrbiting ? '#0f172a' : '#cbd5e1',
            bgcolor: isOrbiting ? '#00e5ff' : 'transparent',
            width: 36,
            height: 36,
            animation: isOrbiting ? 'spin 2s linear infinite' : 'none',
            '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } },
            '&:hover': {
              color: isOrbiting ? '#0f172a' : '#00e5ff',
              bgcolor: isOrbiting ? '#6effff' : 'rgba(0,229,255,0.1)',
            },
          }}
        >
          <Rotate90DegreesCcwIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      {/* Focus / Center button */}
      <Tooltip title="Tập trung vào model" placement="left" arrow>
        <IconButton
          size="small"
          onClick={() => flyToAngle(-45, 0, 250)}
          sx={{
            color: '#cbd5e1',
            width: 36,
            height: 36,
            '&:hover': { color: '#00e5ff', bgcolor: 'rgba(0,229,255,0.1)' },
          }}
        >
          <CenterFocusStrongIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      {/* Distance slider */}
      <Box sx={{ px: 0.5, width: '100%' }}>
        <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.55rem', display: 'block', textAlign: 'center' }}>
          Khoảng cách
        </Typography>
        <Slider
          value={viewDistance}
          onChange={(_, val) => setViewDistance(val as number)}
          min={30}
          max={1000}
          step={10}
          size="small"
          orientation="vertical"
          sx={{
            height: 80,
            mx: 'auto',
            display: 'block',
            color: '#00e5ff',
            '& .MuiSlider-thumb': { width: 12, height: 12 },
            '& .MuiSlider-track': { width: 3 },
            '& .MuiSlider-rail': { width: 3, bgcolor: 'rgba(255,255,255,0.1)' },
          }}
        />
        <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.55rem', display: 'block', textAlign: 'center' }}>
          {viewDistance}m
        </Typography>
      </Box>

      {/* Speed slider (only visible when orbiting) */}
      {isOrbiting && (
        <Box sx={{ px: 0.5, width: '100%' }}>
          <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.55rem', display: 'block', textAlign: 'center' }}>
            Tốc độ
          </Typography>
          <Slider
            value={orbitSpeed}
            onChange={(_, val) => setOrbitSpeed(val as number)}
            min={1}
            max={30}
            step={1}
            size="small"
            sx={{
              color: '#00e5ff',
              '& .MuiSlider-thumb': { width: 10, height: 10 },
            }}
          />
        </Box>
      )}
    </Paper>
  );
};

export default ModelViewControls;
