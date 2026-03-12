import LayersIcon from '@mui/icons-material/Layers';
import { Box, Divider, IconButton, Paper, Switch, Tooltip, Typography } from '@mui/material';
import * as Cesium from 'cesium';
import React, { useCallback, useState } from 'react';
import { useCesium } from 'resium';

type BaseLayerType = 'bing' | 'arcgis' | 'osm';

interface LayerOption {
  id: BaseLayerType;
  label: string;
  description: string;
  icon: string;
}

const LAYER_OPTIONS: LayerOption[] = [
  { id: 'bing', label: 'Bing Satellite', description: 'Bing Maps — Cesium Ion', icon: '🛰️' },
  { id: 'arcgis', label: 'ArcGIS Satellite', description: 'ArcGIS World Imagery', icon: '🌍' },
  { id: 'osm', label: 'OpenStreetMap', description: 'Bản đồ đường phố', icon: '🗺️' },
];

const BaseLayerSwitcher: React.FC = () => {
  const { viewer } = useCesium();
  const [activeLayer, setActiveLayer] = useState<BaseLayerType>('bing');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTerrainEnabled, setIsTerrainEnabled] = useState(false);

  // Toggle 3D Terrain on/off (Flat vs Bumpy map)
  const toggleTerrain = useCallback(async () => {
    if (!viewer) return;
    try {
      if (isTerrainEnabled) {
        // Disable terrain -> use flat ellipsoid so models don't clip into bumpy ground
        viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
        setIsTerrainEnabled(false);
      } else {
        // Enable terrain -> use 3D world terrain
        viewer.terrainProvider = await Cesium.createWorldTerrainAsync();
        setIsTerrainEnabled(true);
      }
      viewer.scene.requestRender();
    } catch (e) {
      console.warn('Failed to toggle terrain', e);
    }
  }, [viewer, isTerrainEnabled]);

  const applyImageryEnhancements = useCallback((layer: Cesium.ImageryLayer, type: BaseLayerType) => {
    if (type === 'bing' || type === 'arcgis') {
      layer.brightness = 1.05;
      layer.contrast = 1.15;
      layer.saturation = 1.2;
      layer.gamma = 0.95;
    }
  }, []);

  const switchLayer = useCallback(async (layerType: BaseLayerType) => {
    if (!viewer) return;

    // Remove all existing imagery layers
    viewer.imageryLayers.removeAll();

    let provider: Cesium.ImageryProvider;

    switch (layerType) {
      case 'bing':
        provider = await Cesium.IonImageryProvider.fromAssetId(2);
        break;
      case 'arcgis':
        provider = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
          'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
        );
        break;
      case 'osm':
        provider = new Cesium.OpenStreetMapImageryProvider({
          url: 'https://tile.openstreetmap.org/',
        });
        break;
      default:
        return;
    }

    const layer = viewer.imageryLayers.addImageryProvider(provider);
    applyImageryEnhancements(layer, layerType);

    // Add road overlay for satellite layers
    if (layerType === 'bing' || layerType === 'arcgis') {
      try {
        const transportProvider = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
          'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer'
        );
        const roadsLayer = viewer.imageryLayers.addImageryProvider(transportProvider);
        roadsLayer.alpha = 0.45;
      } catch {
        // Road overlay is optional, ignore errors
      }
    }

    setActiveLayer(layerType);
    setIsExpanded(false);
    viewer.scene.requestRender();
  }, [viewer, applyImageryEnhancements]);

  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 24,
        left: 24,
        zIndex: 1000,
      }}
    >
      {/* Expanded panel */}
      {isExpanded && (
        <Paper
          sx={{
            mb: 1.5,
            p: 1.5,
            backgroundColor: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 2,
            minWidth: 200,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: '#00e5ff',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontSize: '0.65rem',
              mb: 1,
              display: 'block',
            }}
          >
            Nền bản đồ
          </Typography>
          {LAYER_OPTIONS.map((opt) => (
            <Box
              key={opt.id}
              onClick={() => switchLayer(opt.id)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 1,
                borderRadius: 1.5,
                cursor: 'pointer',
                backgroundColor: activeLayer === opt.id ? 'rgba(0, 229, 255, 0.15)' : 'transparent',
                border: activeLayer === opt.id ? '1px solid rgba(0, 229, 255, 0.4)' : '1px solid transparent',
                transition: 'all 0.15s ease',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.08)',
                },
                mb: 0.5,
              }}
            >
              <Typography sx={{ fontSize: '1.2rem', lineHeight: 1 }}>{opt.icon}</Typography>
              <Box>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: activeLayer === opt.id ? 700 : 500,
                    color: activeLayer === opt.id ? '#00e5ff' : '#f8fafc',
                    fontSize: '0.8rem',
                  }}
                >
                  {opt.label}
                </Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.65rem' }}>
                  {opt.description}
                </Typography>
              </Box>
            </Box>
          ))}

          <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.1)' }} />

          {/* 3D Terrain Toggle */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 1,
              px: 1.5,
              borderRadius: 1.5,
              backgroundColor: isTerrainEnabled ? 'rgba(174, 82, 212, 0.15)' : 'transparent',
              border: isTerrainEnabled ? '1px solid rgba(174, 82, 212, 0.4)' : '1px solid transparent',
              transition: 'all 0.2s ease',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography sx={{ fontSize: '1.2rem', lineHeight: 1, color: isTerrainEnabled ? '#ae52d4' : '#64748b' }}>⛰️</Typography>
              <Box>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: isTerrainEnabled ? 700 : 500,
                    color: isTerrainEnabled ? '#ae52d4' : '#f8fafc',
                    fontSize: '0.8rem',
                  }}
                >
                  Địa hình 3D
                </Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.65rem' }}>
                  {isTerrainEnabled ? 'Bật (Đồi núi gồ ghề)' : 'Tắt (Mặt phẳng 2D)'}
                </Typography>
              </Box>
            </Box>
            <Switch
              size="small"
              checked={isTerrainEnabled}
              onChange={toggleTerrain}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': { color: '#ae52d4' },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#ae52d4' },
              }}
            />
          </Box>
        </Paper>
      )}

      {/* Toggle button */}
      <Tooltip title="Chuyển nền bản đồ & Địa hình" placement="right" arrow>
        <IconButton
          onClick={() => setIsExpanded(!isExpanded)}
          sx={{
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: isExpanded ? '#00e5ff' : '#f8fafc',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            width: 44,
            height: 44,
            '&:hover': {
              backgroundColor: 'rgba(30, 41, 59, 0.9)',
              color: '#00e5ff',
            },
            transition: 'all 0.2s ease',
          }}
        >
          <LayersIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default BaseLayerSwitcher;
