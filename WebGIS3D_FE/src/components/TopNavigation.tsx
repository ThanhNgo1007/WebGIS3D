import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SaveIcon from '@mui/icons-material/Save';
import LayersIcon from '@mui/icons-material/Layers';
import ViewListIcon from '@mui/icons-material/ViewList';
import BuildIcon from '@mui/icons-material/Build';
import CloseIcon from '@mui/icons-material/Close';
import {
    Box,
    Button,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Paper,
    Slider,
    TextField,
    Typography,
    Divider,
    Stack,
    Tooltip,
    Fade,
    ClickAwayListener
} from '@mui/material';
import { useSnackbar } from 'notistack';
import React, { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { gisApi } from '../services/api';
import { setPreviewModel } from '../store/slices/appSlice';
import type { GisItem } from '../types/GisItem';
import type { GeoLayer } from '../types/GeoLayer';
import LayerBrowser from './LayerBrowser';

interface TopNavigationProps {
  items: GisItem[];
  onFlyToItem: (item: GisItem) => void;
  onFlyToNinhKieu: () => void;
  onStartPicking: () => void;
  onReset: () => void;
  isPickingMode: boolean;
  pickedLocation: { longitude: number; latitude: number } | null;
  onSubmit: (data: {
    name: string;
    description: string;
    scale: number;
    lodFiles: File[];
    geometricErrors: number[];
    heading: number;
    heightOffset: number;
  }) => Promise<void>;
  onSubmitRef: React.MutableRefObject<(() => void) | null>;
  isSubmitting: boolean;
  setIsSubmitting: (v: boolean) => void;
  geoLayers: GeoLayer[];
  onGeoLayersChange: () => void;
}

const TopNavigation: React.FC<TopNavigationProps> = ({
  items,
  onFlyToItem,
  onFlyToNinhKieu,
  onStartPicking,
  onReset,
  isPickingMode,
  pickedLocation,
  onSubmit,
  onSubmitRef,
  isSubmitting,
  setIsSubmitting,
  geoLayers,
  onGeoLayersChange,
}) => {
  const [activeTab, setActiveTab] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scale, setScale] = useState(1);
  const [lodFiles, setLodFiles] = useState<File[]>([]);
  const [geometricErrors, setGeometricErrors] = useState<number[]>([0, 8, 35]);
  const dispatch = useAppDispatch();
  const { previewModel } = useAppSelector(state => state.app);
  const [modelInfo, setModelInfo] = useState<{
    dimensions: { width: number; height: number; depth: number } | null;
    maxDimension: number;
    suggestedScale: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    onSubmitRef.current = handleSubmit;
    return () => { onSubmitRef.current = null; };
  });

  const DEFAULT_GEOMETRIC_ERRORS = [0, 8, 35];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).sort((a, b) => a.name.localeCompare(b.name));
      setLodFiles(files);
      setGeometricErrors(files.map((_, i) => DEFAULT_GEOMETRIC_ERRORS[i] ?? 1000 * (i + 1)));
      
      if (files.length > 0) {
        const url = URL.createObjectURL(files[0]);
        dispatch(setPreviewModel({ url, scale, heading: previewModel.heading, heightOffset: previewModel.heightOffset }));
      }
      
      try {
        const analysis = await gisApi.analyzeGlb(files[0]);
        setModelInfo({
          dimensions: analysis.dimensions,
          maxDimension: analysis.maxDimension,
          suggestedScale: analysis.suggestedScale,
        });
        setScale(analysis.suggestedScale);
        dispatch(setPreviewModel({ scale: analysis.suggestedScale }));
      } catch (err) {
        console.warn('[Upload] Analysis failed:', err);
        setModelInfo(null);
      }
    }
  };

  const handleSubmit = async () => {
    if (!pickedLocation || lodFiles.length === 0 || !name.trim()) {
      enqueueSnackbar('Hãy điền tên, chọn file và chọn vị trí!', { variant: 'warning' });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name,
        description,
        scale: previewModel.scale,
        lodFiles,
        geometricErrors: geometricErrors.slice(0, lodFiles.length),
        heading: previewModel.heading,
        heightOffset: previewModel.heightOffset,
      });

      setName('');
      setDescription('');
      setScale(1);
      setLodFiles([]);
      dispatch(setPreviewModel({ url: null, scale: 1, heading: 0, heightOffset: 0 }));
      if (fileInputRef.current) fileInputRef.current.value = '';
      enqueueSnackbar('Lưu thành công!', { variant: 'success' });
      setActiveTab(null); // Close panel
    } catch (error) {
      enqueueSnackbar('Lỗi khi lưu dữ liệu!', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScaleChange = (val: number) => {
    setScale(val);
    dispatch(setPreviewModel({ scale: val }));
  };

  const toggleTab = (idx: number) => {
      setActiveTab(activeTab === idx ? null : idx);
  };

  return (
    <ClickAwayListener onClickAway={() => setActiveTab(null)}>
      <Box sx={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 1200 }}>
        {/* Main Dock Bar */}
        <Paper
          elevation={0}
          sx={{
            display: 'flex',
            alignItems: 'center',
            p: 0.8,
            px: 1.5,
            gap: 1,
            bgcolor: 'background.paper',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 10,
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
          }}
        >
          {/* Logo Section */}
          <Box sx={{ pr: 1.5, pl: 0.5, borderRight: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 32, height: 32, bgcolor: 'primary.main', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <LayersIcon sx={{ fontSize: 18 }} />
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 800, letterSpacing: '-0.02em', display: { xs: 'none', sm: 'block' } }}>
                  WEBGIS 3D
              </Typography>
          </Box>

          {/* Menu Items */}
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Danh sách thực thể">
                <IconButton 
                    onClick={() => toggleTab(0)}
                    sx={{ 
                        color: activeTab === 0 ? 'primary.main' : 'text.secondary',
                        bgcolor: activeTab === 0 ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } 
                    }}
                >
                    <ViewListIcon fontSize="small" />
                </IconButton>
            </Tooltip>

            <Tooltip title="Thêm mô hình mới">
                <IconButton 
                    onClick={() => toggleTab(1)}
                    sx={{ 
                        color: activeTab === 1 ? 'primary.main' : 'text.secondary',
                        bgcolor: activeTab === 1 ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } 
                    }}
                >
                    <BuildIcon fontSize="small" />
                </IconButton>
            </Tooltip>

            <Tooltip title="Lớp bản đồ GeoJSON">
                <IconButton 
                    onClick={() => toggleTab(2)}
                    sx={{ 
                        color: activeTab === 2 ? 'primary.main' : 'text.secondary',
                        bgcolor: activeTab === 2 ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } 
                    }}
                >
                    <LayersIcon fontSize="small" />
                </IconButton>
            </Tooltip>
          </Stack>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

          {/* Action Buttons */}
          <Stack direction="row" spacing={0.5}>
              <Tooltip title="Quay về trung tâm Cần Thơ">
                  <IconButton onClick={onFlyToNinhKieu} size="small" sx={{ color: 'text.secondary' }}>
                      <FlightTakeoffIcon fontSize="small" />
                  </IconButton>
              </Tooltip>
              <Tooltip title="Dọn sạch dữ liệu">
                  <IconButton onClick={onReset} size="small" sx={{ color: 'error.main', opacity: 0.6 }}>
                      <DeleteIcon fontSize="small" />
                  </IconButton>
              </Tooltip>
          </Stack>
        </Paper>

        {/* Floating Content Panels */}
        <Fade in={activeTab !== null}>
            <Paper
                elevation={6}
                sx={{
                    position: 'absolute',
                    top: 'calc(100% + 12px)',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: activeTab === 1 ? 380 : 320,
                    maxHeight: '60vh',
                    overflowY: 'auto',
                    bgcolor: 'background.paper',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 3,
                    p: 2,
                    boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {activeTab === 0 ? 'Thực thể 3D' : activeTab === 1 ? 'Công cụ tạo lập' : 'Lớp dữ liệu'}
                    </Typography>
                    <IconButton size="small" onClick={() => setActiveTab(null)}>
                        <CloseIcon fontSize="inherit" />
                    </IconButton>
                </Box>

                {activeTab === 0 && (
                    <List sx={{ p: 0 }}>
                        {items.map((item) => (
                            <ListItem key={item.id} disablePadding sx={{ mb: 1 }}>
                                <ListItemButton
                                    onClick={() => { onFlyToItem(item); setActiveTab(null); }}
                                    sx={{
                                        p: 1.5,
                                        borderRadius: 2,
                                        bgcolor: 'rgba(255,255,255,0.02)',
                                        border: '1px solid rgba(255,255,255,0.04)',
                                        '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.05)', borderColor: 'primary.light' }
                                    }}
                                >
                                    <ListItemText
                                        primary={item.name}
                                        secondary={`${item.lodFiles?.length || 1} LODs • Scale ${item.scale}x`}
                                        primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                                        secondaryTypographyProps={{ variant: 'caption', sx: { color: 'text.secondary', fontSize: '0.65rem' } }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        ))}
                        {items.length === 0 && (
                            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
                                Chưa có đối tượng nào
                            </Typography>
                        )}
                    </List>
                )}

                {activeTab === 1 && (
                    <Stack spacing={2.5}>
                        <Box>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', mb: 1.5, display: 'block', textTransform: 'uppercase' }}>
                                1. Tệp tin (GLB/GLTF)
                            </Typography>
                            <Button
                                component="label"
                                variant="outlined"
                                startIcon={<CloudUploadIcon />}
                                fullWidth
                                sx={{ borderStyle: 'dashed', py: 1.5, bgcolor: 'rgba(255,255,255,0.02)' }}
                            >
                                {lodFiles.length > 0 ? `${lodFiles.length} tệp đã chọn` : 'Tải lên mô hình'}
                                <input type="file" hidden ref={fileInputRef} accept=".glb,.gltf" multiple onChange={handleFileChange} />
                            </Button>
                        </Box>

                        {previewModel.url && (() => {
                            const ModelViewer = 'model-viewer' as any;
                            return (
                                <Box sx={{ width: '100%', height: 140, bgcolor: '#000', borderRadius: 2, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <ModelViewer src={previewModel.url} auto-rotate camera-controls style={{ width: '100%', height: '100%' }} shadow-intensity="1" exposure="0.8" />
                                </Box>
                            )
                        })()}

                         {modelInfo?.dimensions && (
                            <Box sx={{ p: 1.5, bgcolor: 'rgba(99, 102, 241, 0.05)', borderRadius: 1.5, border: '1px solid rgba(99, 102, 241, 0.1)' }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Kích thước LOD0:</span> 
                                    <strong>{modelInfo.dimensions.width.toFixed(1)}x{modelInfo.dimensions.height.toFixed(1)}x{modelInfo.dimensions.depth.toFixed(1)}m</strong>
                                </Typography>
                            </Box>
                        )}

                        <Box>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', mb: 1.5, display: 'block', textTransform: 'uppercase' }}>
                                2. Cấu hình & Đặt vị trí
                            </Typography>
                            <Stack spacing={2}>
                                <TextField label="Tên thực thể" value={name} onChange={(e) => setName(e.target.value)} size="small" fullWidth />
                                <Box>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Tỷ lệ (Scale): {scale}x</Typography>
                                    <Slider value={scale} onChange={(_, v) => handleScaleChange(v as number)} min={1} max={500} size="small" />
                                </Box>
                                <Button
                                    variant="contained"
                                    startIcon={<LocationOnIcon />}
                                    onClick={onStartPicking}
                                    disabled={lodFiles.length === 0}
                                    fullWidth
                                    sx={{
                                        py: 1,
                                        animation: isPickingMode ? 'pulse 2s infinite' : 'none',
                                        '@keyframes pulse': { '0%': { boxShadow: '0 0 0 0px rgba(99, 102, 241, 0.4)' }, '100%': { boxShadow: '0 0 0 10px rgba(99, 102, 241, 0)' } }
                                    }}
                                >
                                    {isPickingMode ? 'Đang chọn vị trí...' : pickedLocation ? 'Thay đổi vị trí' : 'Đặt lên bản đồ'}
                                </Button>
                            </Stack>
                        </Box>

                        {pickedLocation && lodFiles.length > 0 && (
                            <Button variant="contained" color="primary" startIcon={<SaveIcon />} onClick={handleSubmit} disabled={isSubmitting} fullWidth sx={{ py: 1.5, fontWeight: 700 }}>
                                {isSubmitting ? 'Đang xử lý...' : 'XÁC NHẬN KHỞI TẠO'}
                            </Button>
                        )}
                    </Stack>
                )}

                {activeTab === 2 && (
                    <LayerBrowser layers={geoLayers} onLayersChange={onGeoLayersChange} onLayerVisibilityChange={() => {}} />
                )}
            </Paper>
        </Fade>
      </Box>
    </ClickAwayListener>
  );
};

export default TopNavigation;
