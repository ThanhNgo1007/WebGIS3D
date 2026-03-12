import AddIcon from '@mui/icons-material/Add';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ExploreIcon from '@mui/icons-material/Explore';
import RemoveIcon from '@mui/icons-material/Remove';
import RotateLeftIcon from '@mui/icons-material/RotateLeft';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import StopIcon from '@mui/icons-material/Stop';
import ThreeSixtyIcon from '@mui/icons-material/ThreeSixty';
import { Box, Divider, IconButton, Paper, Tooltip, Typography } from '@mui/material';
import * as Cesium from 'cesium';
import React, { useCallback, useEffect, useRef, useState } from 'react';

interface MapToolbarProps {
  viewer: Cesium.Viewer | null | undefined;
}

const MapToolbar: React.FC<MapToolbarProps> = ({ viewer }) => {
  const [isOrbiting, setIsOrbiting] = useState(false);
  const orbitIntervalRef = useRef<number | null>(null);

  // === Camera Rotation (Heading) ===
  const rotateLeft = useCallback(() => {
    if (!viewer) return;
    viewer.camera.lookLeft(Cesium.Math.toRadians(10));
    viewer.scene.requestRender();
  }, [viewer]);

  const rotateRight = useCallback(() => {
    if (!viewer) return;
    viewer.camera.lookRight(Cesium.Math.toRadians(10));
    viewer.scene.requestRender();
  }, [viewer]);

  // === Camera Pitch (Góc ngẩng/cúi) ===
  const lookUp = useCallback(() => {
    if (!viewer) return;
    viewer.camera.lookUp(Cesium.Math.toRadians(5));
    viewer.scene.requestRender();
  }, [viewer]);

  const lookDown = useCallback(() => {
    if (!viewer) return;
    viewer.camera.lookDown(Cesium.Math.toRadians(5));
    viewer.scene.requestRender();
  }, [viewer]);

  // === Zoom ===
  const zoomIn = useCallback(() => {
    if (!viewer) return;
    viewer.camera.moveForward(viewer.camera.positionCartographic.height * 0.2);
    viewer.scene.requestRender();
  }, [viewer]);

  const zoomOut = useCallback(() => {
    if (!viewer) return;
    viewer.camera.moveBackward(viewer.camera.positionCartographic.height * 0.2);
    viewer.scene.requestRender();
  }, [viewer]);
  
  // === Move Down/Up (Height) ===
  const moveDown = useCallback(() => {
      if(!viewer) return;
      viewer.camera.moveDown(viewer.camera.positionCartographic.height * 0.1);
      viewer.scene.requestRender();
  }, [viewer]);
  
  const moveUp = useCallback(() => {
      if(!viewer) return;
      viewer.camera.moveUp(viewer.camera.positionCartographic.height * 0.1);
      viewer.scene.requestRender();
  }, [viewer]);

  // === Utility ===
  const handeResetNorth = useCallback(() => {
    if (!viewer) return;
    viewer.camera.flyTo({
      destination: viewer.camera.position,
      orientation: {
        heading: 0,
        pitch: viewer.camera.pitch,
        roll: 0
      },
      duration: 1.0,
    });
  }, [viewer]);

  // === Orbit (Xoay quanh vị trí hiện tại) ===
  const getScreenCenterCartesian = useCallback(() => {
    if (!viewer) return null;
    const windowPosition = new Cesium.Cartesian2(viewer.canvas.clientWidth / 2, viewer.canvas.clientHeight / 2);
    let cartesian = viewer.scene.pickPosition(windowPosition);
    if (!cartesian) {
      const ellipsoidResult = viewer.camera.pickEllipsoid(windowPosition, viewer.scene.globe.ellipsoid);
      if (ellipsoidResult) {
        cartesian = ellipsoidResult;
      }
    }
    return cartesian;
  }, [viewer]);

  const toggleOrbit = useCallback(() => {
    if (!viewer) return;

    if (isOrbiting) {
      if (orbitIntervalRef.current) {
        cancelAnimationFrame(orbitIntervalRef.current);
        orbitIntervalRef.current = null;
      }
      setIsOrbiting(false);
      viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
      return;
    }

    const center = getScreenCenterCartesian();
    if (!center) return;

    setIsOrbiting(true);
    
    const orbit = () => {
      if (!viewer || viewer.isDestroyed()) return;
      viewer.camera.rotateRight(0.002);
      viewer.scene.requestRender();
      orbitIntervalRef.current = requestAnimationFrame(orbit);
    };

    const pitch = Cesium.Math.clamp(viewer.camera.pitch, Cesium.Math.toRadians(-80), Cesium.Math.toRadians(-15));
    const range = viewer.camera.positionCartographic.height;

    viewer.camera.flyToBoundingSphere(new Cesium.BoundingSphere(center, 0), {
      offset: new Cesium.HeadingPitchRange(viewer.camera.heading, pitch, range),
      duration: 1.0,
      complete: () => {
        viewer.camera.lookAt(center, new Cesium.HeadingPitchRange(viewer.camera.heading, pitch, range));
        orbitIntervalRef.current = requestAnimationFrame(orbit);
      }
    });

  }, [viewer, isOrbiting, getScreenCenterCartesian]);

  useEffect(() => {
    return () => {
      if (orbitIntervalRef.current) {
        cancelAnimationFrame(orbitIntervalRef.current);
      }
      if (viewer && !viewer.isDestroyed()) {
        viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
      }
    };
  }, [viewer]);

  const btnStyle = (color: string) => ({
    color,
    bgcolor: `${color}18`,
    '&:hover': { bgcolor: `${color}30` },
    width: 36,
    height: 36,
  });

  return (
    <Paper
      elevation={6}
      sx={{
        position: 'absolute',
        top: 24,
        right: 24,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.8,
        p: 1.5,
        borderRadius: 4,
        zIndex: 100,
        bgcolor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.6rem', fontWeight: 'bold', mb: 0.5, letterSpacing: '1px' }}>
        ĐIỀU KHIỂN CAMERA
      </Typography>

      {/* D-PAD Style Camera Control */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0.5, mb: 1 }}>
        <Box />
        <Tooltip title="Ngẩng nhìn lên" arrow placement="top">
          <IconButton size="small" onClick={lookUp} sx={btnStyle('#00e5ff')}>
            <ArrowUpwardIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>
        <Box />

        <Tooltip title="Quay trái" arrow placement="left">
          <IconButton size="small" onClick={rotateLeft} sx={btnStyle('#00e5ff')}>
            <RotateLeftIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Cúi nhìn xuống" arrow placement="bottom">
          <IconButton size="small" onClick={lookDown} sx={btnStyle('#00e5ff')}>
            <ArrowDownwardIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Quay phải" arrow placement="right">
          <IconButton size="small" onClick={rotateRight} sx={btnStyle('#00e5ff')}>
            <RotateRightIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>
      </Box>

      <Divider flexItem sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 1 }} />

      {/* Height and Zoom Control */}
      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>
          <Tooltip title="Nâng cao camera" arrow placement="left">
            <IconButton size="small" onClick={moveUp} sx={btnStyle('#ae52d4')}>
              <AddIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Typography variant="caption" sx={{ color: '#ae52d4', fontSize: '0.55rem' }}>CAO</Typography>
          <Tooltip title="Hạ thấp camera" arrow placement="left">
            <IconButton size="small" onClick={moveDown} sx={btnStyle('#ae52d4')}>
              <RemoveIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>
          <Tooltip title="Phóng to (Tiến tới)" arrow placement="right">
            <IconButton size="small" onClick={zoomIn} sx={btnStyle('#ffb300')}>
              <AddIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Typography variant="caption" sx={{ color: '#ffb300', fontSize: '0.55rem' }}>ZOOM</Typography>
          <Tooltip title="Thu nhỏ (Lùi lại)" arrow placement="right">
            <IconButton size="small" onClick={zoomOut} sx={btnStyle('#ffb300')}>
              <RemoveIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Divider flexItem sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

      {/* Orbit & North */}
      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
        <Tooltip title="Về hướng Bắc" arrow placement="bottom">
          <IconButton size="small" onClick={handeResetNorth} sx={btnStyle('#e2e8f0')}>
            <ExploreIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>

        <Tooltip title={isOrbiting ? 'Dừng xoay' : 'Xoay tròn 360 quanh điểm hiện tại'} arrow placement="bottom">
          <IconButton
            size="small"
            onClick={toggleOrbit}
            sx={{
              ...btnStyle(isOrbiting ? '#ff5722' : '#64b5f6'),
              animation: isOrbiting ? 'spin 2.5s linear infinite' : 'none',
            }}
          >
            {isOrbiting ? <StopIcon sx={{ fontSize: 18 }} /> : <ThreeSixtyIcon sx={{ fontSize: 18 }} />}
          </IconButton>
        </Tooltip>
      </Box>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Paper>
  );
};

export default MapToolbar;
