import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import HeightIcon from '@mui/icons-material/Height';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import OpenWithIcon from '@mui/icons-material/OpenWith';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import RotateLeftIcon from '@mui/icons-material/RotateLeft';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import SaveIcon from '@mui/icons-material/Save';
import ThreeSixtyIcon from '@mui/icons-material/ThreeSixty';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import { Box, Divider, IconButton, Menu, MenuItem, Paper, Tooltip, Typography } from '@mui/material';
import * as Cesium from 'cesium';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useCesium } from 'resium';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { setPreviewLocked, setPreviewModel } from '../store/slices/appSlice';

interface PlacementToolbarProps {
  onSave: () => void;
  isSaving: boolean;
  canSave: boolean;
}

// Camera view presets relative to the model position
type ViewPreset = 'top' | 'front' | 'side' | 'perspective' | 'orbit';

const PlacementToolbar: React.FC<PlacementToolbarProps> = ({ onSave, isSaving, canSave }) => {
  const dispatch = useAppDispatch();
  const { previewModel, pickedLocation, isPreviewLocked } = useAppSelector(state => state.app);
  const { viewer } = useCesium();

  const isActive = !!previewModel.url && !!pickedLocation;
  const orbitIntervalRef = useRef<number | null>(null);
  const [isOrbiting, setIsOrbiting] = useState(false);
  const [viewMenuAnchor, setViewMenuAnchor] = useState<null | HTMLElement>(null);

  const [scaleInput, setScaleInput] = useState<string>('');
  const [headingInput, setHeadingInput] = useState<string>('');
  const [heightInput, setHeightInput] = useState<string>('');

  // Sync inputs with Redux store when changed externally
  useEffect(() => {
    if (parseFloat(scaleInput) !== previewModel.scale) {
      setScaleInput(previewModel.scale.toString());
    }
  }, [previewModel.scale]);

  useEffect(() => {
    if (parseFloat(headingInput) !== previewModel.heading) {
      setHeadingInput(Math.round(previewModel.heading).toString());
    }
  }, [previewModel.heading]);

  useEffect(() => {
    if (parseFloat(heightInput) !== previewModel.heightOffset) {
      setHeightInput(previewModel.heightOffset.toString());
    }
  }, [previewModel.heightOffset]);

  // === Control callbacks ===
  const rotateBy = useCallback((deg: number) => {
    const newHeading = ((previewModel.heading + deg) % 360 + 360) % 360;
    dispatch(setPreviewModel({ heading: newHeading }));
  }, [dispatch, previewModel.heading]);

  const scaleBy = useCallback((factor: number) => {
    const newScale = Math.max(0.00001, previewModel.scale * factor);
    // Round to 5 decimal places to avoid float math artifacts
    const rounded = Math.round(newScale * 100000) / 100000;
    dispatch(setPreviewModel({ scale: rounded }));
  }, [dispatch, previewModel.scale]);

  const adjustHeight = useCallback((delta: number) => {
    const newH = Math.round((previewModel.heightOffset + delta) * 10) / 10;
    dispatch(setPreviewModel({ heightOffset: newH }));
  }, [dispatch, previewModel.heightOffset]);

  const resetOrientation = useCallback(() => {
    dispatch(setPreviewModel({ heading: 0, heightOffset: 0 }));
  }, [dispatch]);

  // === Lock/Unlock ===
  const toggleLock = useCallback(() => {
    dispatch(setPreviewLocked(!isPreviewLocked));
  }, [dispatch, isPreviewLocked]);

  // === Camera view presets ===
  const flyToView = useCallback((preset: ViewPreset) => {
    if (!viewer || !pickedLocation) return;
    // Stop any orbiting
    if (orbitIntervalRef.current) {
      cancelAnimationFrame(orbitIntervalRef.current);
      orbitIntervalRef.current = null;
      setIsOrbiting(false);
    }

    const { longitude, latitude } = pickedLocation;
    const dist = 150; // distance from model
    
    let destination: Cesium.Cartesian3;
    let orientation: { heading: number; pitch: number; roll: number };

    switch (preset) {
      case 'top':
        destination = Cesium.Cartesian3.fromDegrees(longitude, latitude, dist * 2);
        orientation = { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 };
        break;
      case 'front':
        destination = Cesium.Cartesian3.fromDegrees(longitude, latitude - 0.001, dist);
        orientation = { heading: 0, pitch: Cesium.Math.toRadians(-20), roll: 0 };
        break;
      case 'side':
        destination = Cesium.Cartesian3.fromDegrees(longitude + 0.001, latitude, dist);
        orientation = { heading: Cesium.Math.toRadians(-90), pitch: Cesium.Math.toRadians(-20), roll: 0 };
        break;
      case 'perspective':
        destination = Cesium.Cartesian3.fromDegrees(longitude + 0.0008, latitude - 0.0008, dist);
        orientation = { heading: Cesium.Math.toRadians(-45), pitch: Cesium.Math.toRadians(-25), roll: 0 };
        break;
      default:
        return;
    }

    viewer.camera.flyTo({
      destination,
      orientation,
      duration: 1.0,
    });
    setViewMenuAnchor(null);
  }, [viewer, pickedLocation]);

  // === Orbit around model ===
  const toggleOrbit = useCallback(() => {
    if (!viewer || !pickedLocation) return;

    if (isOrbiting) {
      // Stop orbiting
      if (orbitIntervalRef.current) {
        cancelAnimationFrame(orbitIntervalRef.current);
        orbitIntervalRef.current = null;
      }
      setIsOrbiting(false);
      return;
    }

    setIsOrbiting(true);
    // Lock the model while orbiting
    dispatch(setPreviewLocked(true));

    const center = Cesium.Cartesian3.fromDegrees(pickedLocation.longitude, pickedLocation.latitude, 0);
    
    const orbit = () => {
      if (!viewer || viewer.isDestroyed()) return;
      viewer.camera.rotateRight(0.005); // Small rotation per frame
      viewer.scene.requestRender();
      orbitIntervalRef.current = requestAnimationFrame(orbit);
    };

    // First fly to a good perspective view
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        pickedLocation.longitude + 0.001,
        pickedLocation.latitude - 0.001,
        200
      ),
      orientation: {
        heading: Cesium.Math.toRadians(-45),
        pitch: Cesium.Math.toRadians(-25),
        roll: 0,
      },
      duration: 0.8,
      complete: () => {
        // Set lookAt target so camera orbits around model
        viewer.camera.lookAt(center, new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-25), 200));
        orbitIntervalRef.current = requestAnimationFrame(orbit);
      },
    });
  }, [viewer, pickedLocation, isOrbiting, dispatch]);

  // Fly to model position
  const flyToModel = useCallback(() => {
    if (!viewer || !pickedLocation) return;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(pickedLocation.longitude, pickedLocation.latitude, 200),
      orientation: {
        heading: Cesium.Math.toRadians(-45),
        pitch: Cesium.Math.toRadians(-30),
        roll: 0,
      },
      duration: 1.0,
    });
  }, [viewer, pickedLocation]);

  // Stop orbiting and unlock camera on unmount or when leaving placement
  useEffect(() => {
    return () => {
      if (orbitIntervalRef.current) {
        cancelAnimationFrame(orbitIntervalRef.current);
        orbitIntervalRef.current = null;
      }
      if (viewer && !viewer.isDestroyed()) {
        viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
      }
    };
  }, [viewer]);

  // When stopping orbit, release camera lock
  useEffect(() => {
    if (!isOrbiting && viewer && !viewer.isDestroyed()) {
      viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    }
  }, [isOrbiting, viewer]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (isPreviewLocked && !['l', 'L', 'Enter', 'Escape'].includes(e.key)) return; // Only allow unlock key when locked

      switch (e.key) {
        case 'q': case 'Q': rotateBy(-5); break;
        case 'e': case 'E': rotateBy(5); break;
        case 'r': case 'R': adjustHeight(1); break;
        case 'f': case 'F': adjustHeight(-1); break;
        case 'z': case 'Z': scaleBy(0.9); break;
        case 'x': case 'X': scaleBy(1.1); break;
        case 'l': case 'L': toggleLock(); break;
        case 'Enter': if (canSave && !isSaving) onSave(); break;
        case 'Escape': 
          if (isOrbiting) toggleOrbit();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, rotateBy, scaleBy, adjustHeight, canSave, isSaving, onSave, toggleLock, isPreviewLocked, isOrbiting, toggleOrbit]);

  if (!isActive && !isPreviewLocked) return null;
  // Also show when locked (model visible but not in "placement mode")
  if (!previewModel.url || !pickedLocation) return null;

  const btnStyle = (color: string) => ({
    color,
    bgcolor: `${color}18`,
    '&:hover': { bgcolor: `${color}30` },
    width: 32,
    height: 32,
  });

  return (
    <Paper
      elevation={12}
      sx={{
        position: 'absolute',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 200,
        bgcolor: 'rgba(15, 23, 42, 0.94)',
        backdropFilter: 'blur(16px)',
        border: isPreviewLocked 
          ? '1px solid rgba(255, 179, 0, 0.4)' 
          : '1px solid rgba(0, 229, 255, 0.25)',
        borderRadius: 3,
        px: 1.5,
        py: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 0.8,
        boxShadow: isPreviewLocked
          ? '0 8px 32px rgba(0,0,0,0.5), 0 0 15px rgba(255,179,0,0.2)'
          : '0 8px 32px rgba(0,0,0,0.5), 0 0 15px rgba(0,229,255,0.15)',
        transition: 'all 0.3s',
      }}
    >
      {/* Mode indicator */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pr: 1, borderRight: '1px solid rgba(255,255,255,0.1)' }}>
        {isPreviewLocked ? (
          <LockIcon sx={{ color: '#ffb300', fontSize: 16 }} />
        ) : (
          <OpenWithIcon sx={{ color: '#00e5ff', fontSize: 16, animation: 'placementPulse 2s infinite' }} />
        )}
        <Typography variant="caption" sx={{ 
          color: isPreviewLocked ? '#ffb300' : '#00e5ff', 
          fontWeight: 700, 
          whiteSpace: 'nowrap', 
          fontSize: '0.6rem', 
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          {isPreviewLocked ? 'Xem trước' : 'Đặt Model'}
        </Typography>
      </Box>

      {/* Lock/Unlock toggle */}
      <Tooltip title={isPreviewLocked ? 'Gỡ khóa để chỉnh sửa (L)' : 'Đặt tạm để xem (L)'} arrow>
        <IconButton 
          size="small" 
          onClick={toggleLock}
          sx={{
            ...btnStyle(isPreviewLocked ? '#ffb300' : '#4caf50'),
            border: `1px solid ${isPreviewLocked ? 'rgba(255,179,0,0.3)' : 'rgba(76,175,80,0.3)'}`,
          }}
        >
          {isPreviewLocked ? <LockOpenIcon sx={{ fontSize: 16 }} /> : <LockIcon sx={{ fontSize: 16 }} />}
        </IconButton>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

      {/* Camera controls */}
      <Tooltip title="Góc nhìn" arrow>
        <IconButton
          size="small"
          onClick={(e) => setViewMenuAnchor(e.currentTarget)}
          sx={btnStyle('#64b5f6')}
        >
          <VisibilityIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={viewMenuAnchor}
        open={Boolean(viewMenuAnchor)}
        onClose={() => setViewMenuAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        slotProps={{ paper: { sx: { bgcolor: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', minWidth: 160 } } }}
      >
        <MenuItem onClick={() => flyToView('top')} sx={{ color: '#e0e0e0', fontSize: '0.8rem' }}>
          ⬇️ Nhìn từ trên
        </MenuItem>
        <MenuItem onClick={() => flyToView('front')} sx={{ color: '#e0e0e0', fontSize: '0.8rem' }}>
          👤 Nhìn từ trước
        </MenuItem>
        <MenuItem onClick={() => flyToView('side')} sx={{ color: '#e0e0e0', fontSize: '0.8rem' }}>
          👁️ Nhìn từ bên
        </MenuItem>
        <MenuItem onClick={() => flyToView('perspective')} sx={{ color: '#e0e0e0', fontSize: '0.8rem' }}>
          🔭 Góc phối cảnh
        </MenuItem>
      </Menu>

      <Tooltip title={isOrbiting ? 'Dừng xoay (Esc)' : 'Xoay quanh model'} arrow>
        <IconButton
          size="small"
          onClick={toggleOrbit}
          sx={{
            ...btnStyle(isOrbiting ? '#ff5722' : '#64b5f6'),
            animation: isOrbiting ? 'spin 2s linear infinite' : 'none',
          }}
        >
          <ThreeSixtyIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>

      <Tooltip title="Bay đến model" arrow>
        <IconButton size="small" onClick={flyToModel} sx={btnStyle('#64b5f6')}>
          <CenterFocusStrongIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

      {/* Rotation controls - disabled when locked */}
      <Tooltip title="Xoay trái (Q)" arrow>
        <span>
          <IconButton size="small" onClick={() => rotateBy(-15)} disabled={isPreviewLocked} sx={btnStyle('#00e5ff')}>
            <RotateLeftIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </span>
      </Tooltip>
      
      <Box sx={{ textAlign: 'center', minWidth: 46 }}>
        <input
          type="text"
          disabled={isPreviewLocked}
          value={headingInput}
          onChange={(e) => setHeadingInput(e.target.value)}
          onBlur={() => {
            const val = parseFloat(headingInput);
            if (!isNaN(val)) {
              const newHeading = ((val % 360) + 360) % 360; // Normalize 0-359
              dispatch(setPreviewModel({ heading: newHeading }));
            } else {
              setHeadingInput(Math.round(previewModel.heading).toString());
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          style={{
            width: '40px',
            background: 'transparent',
            border: 'none',
            color: '#00e5ff',
            fontWeight: 700,
            fontSize: '11px',
            textAlign: 'center',
            outline: 'none',
            fontFamily: 'inherit'
          }}
        />
        <span style={{ color: '#00e5ff', fontSize: '10px', fontWeight: 700 }}>°</span>
      </Box>
      
      <Tooltip title="Xoay phải (E)" arrow>
        <span>
          <IconButton size="small" onClick={() => rotateBy(15)} disabled={isPreviewLocked} sx={btnStyle('#00e5ff')}>
            <RotateRightIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </span>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

      {/* Scale controls */}
      <Tooltip title="Thu nhỏ (Z)" arrow>
        <span>
          <IconButton size="small" onClick={() => scaleBy(0.8)} disabled={isPreviewLocked} sx={btnStyle('#ffb300')}>
            <ZoomOutIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </span>
      </Tooltip>
      <Box sx={{ textAlign: 'center', minWidth: 46 }}>
        <input
          type="text"
          disabled={isPreviewLocked}
          value={scaleInput}
          onChange={(e) => setScaleInput(e.target.value)}
          onBlur={() => {
            const val = parseFloat(scaleInput);
            if (!isNaN(val) && val > 0) {
              dispatch(setPreviewModel({ scale: val }));
            } else {
              setScaleInput(previewModel.scale.toString());
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur();
            }
          }}
          style={{
            width: '46px',
            background: 'transparent',
            border: 'none',
            color: '#ffb300',
            fontWeight: 700,
            fontSize: '11px',
            textAlign: 'center',
            outline: 'none',
            fontFamily: 'inherit'
          }}
        />
      </Box>
      <Tooltip title="Phóng to (X)" arrow>
        <span>
          <IconButton size="small" onClick={() => scaleBy(1.25)} disabled={isPreviewLocked} sx={btnStyle('#ffb300')}>
            <ZoomInIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </span>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

      {/* Height */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
        <HeightIcon sx={{ color: '#ae52d4', fontSize: 14 }} />
        <input
          type="text"
          disabled={isPreviewLocked}
          value={heightInput}
          onChange={(e) => setHeightInput(e.target.value)}
          onBlur={() => {
            const val = parseFloat(heightInput);
            if (!isNaN(val)) {
              dispatch(setPreviewModel({ heightOffset: Math.round(val * 10) / 10 }));
            } else {
              setHeightInput(previewModel.heightOffset.toString());
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          style={{
            width: '36px',
            background: 'transparent',
            border: 'none',
            color: '#ae52d4',
            fontWeight: 700,
            fontSize: '11px',
            textAlign: 'right',
            outline: 'none',
            fontFamily: 'inherit'
          }}
        />
        <span style={{ color: '#ae52d4', fontSize: '10px', fontWeight: 700 }}>m</span>
      </Box>

      {/* Reset */}
      <Tooltip title="Reset góc & cao" arrow>
        <span>
          <IconButton size="small" onClick={resetOrientation} disabled={isPreviewLocked} sx={btnStyle('#ef5350')}>
            <RestartAltIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </span>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

      {/* Save button */}
      <Tooltip title="Xác nhận & Lưu (Enter)" arrow>
        <span>
          <IconButton
            onClick={onSave}
            disabled={!canSave || isSaving}
            sx={{
              bgcolor: canSave ? 'rgba(76, 175, 80, 0.9)' : 'rgba(100,100,100,0.3)',
              color: '#fff',
              width: 36,
              height: 36,
              '&:hover': { bgcolor: 'rgba(76, 175, 80, 1)', transform: 'scale(1.05)' },
              '&:disabled': { bgcolor: 'rgba(100,100,100,0.2)', color: 'rgba(255,255,255,0.3)' },
              boxShadow: canSave ? '0 0 12px rgba(76,175,80,0.4)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            <SaveIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </span>
      </Tooltip>

      {/* Usage hints bar */}
      <Box sx={{ 
        position: 'absolute', 
        top: -24, 
        left: '50%', 
        transform: 'translateX(-50%)',
        bgcolor: 'rgba(0,0,0,0.75)', 
        px: 1.5, 
        py: 0.2, 
        borderRadius: 1,
        whiteSpace: 'nowrap',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.55rem' }}>
          {isPreviewLocked 
            ? '🔒 Đã khóa — Tự do xoay camera xem model | L: Gỡ khóa | Enter: Lưu'
            : '🖱️ Kéo thả: Di chuyển | Shift+Scroll: Xoay | Ctrl+Scroll: Cao/Thấp | L: Đặt tạm | Enter: Lưu'}
        </Typography>
      </Box>

      <style>{`
        @keyframes placementPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Paper>
  );
};

// Wrapper to provide Cesium context
const PlacementToolbarWrapper: React.FC<PlacementToolbarProps> = (props) => {
  return <PlacementToolbar {...props} />;
};

export default PlacementToolbarWrapper;
