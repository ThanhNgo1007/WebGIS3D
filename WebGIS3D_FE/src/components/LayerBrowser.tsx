import React, { useCallback, useEffect, useState } from 'react';
import {
    Box,
    Checkbox,
    CircularProgress,
    IconButton,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Tooltip,
    Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import LayersIcon from '@mui/icons-material/Layers';
import MapIcon from '@mui/icons-material/Map';
import TimelineIcon from '@mui/icons-material/Timeline';
import PlaceIcon from '@mui/icons-material/Place';
import HexagonIcon from '@mui/icons-material/Hexagon';
import ErrorIcon from '@mui/icons-material/Error';
import { layerApi } from '../services/layerApi';
import type { GeoLayer } from '../types/GeoLayer';

interface LayerBrowserProps {
    layers: GeoLayer[];
    onLayersChange: () => void;
    onLayerVisibilityChange: (layerId: number, visible: boolean) => void;
}

const GEOM_ICONS: Record<string, React.ReactElement> = {
    POLYGON: <HexagonIcon sx={{ fontSize: 13 }} />,
    LINE: <TimelineIcon sx={{ fontSize: 13 }} />,
    POINT: <PlaceIcon sx={{ fontSize: 13 }} />,
    MIXED: <MapIcon sx={{ fontSize: 13 }} />,
    UNKNOWN: <LayersIcon sx={{ fontSize: 13 }} />,
};

const STATUS_COLORS: Record<string, string> = {
    READY: '#10b981',
    PROCESSING: '#f59e0b',
    ERROR: '#ef4444',
    PENDING: '#94a3b8',
};

const LayerBrowser: React.FC<LayerBrowserProps> = ({ layers, onLayersChange, onLayerVisibilityChange }) => {
    const [deleting, setDeleting] = useState<number | null>(null);

    // Auto-refresh processing layers every 5s
    useEffect(() => {
        const hasProcessing = layers.some((l) => l.status === 'PROCESSING' || l.status === 'PENDING');
        if (!hasProcessing) return;
        const interval = setInterval(onLayersChange, 5000);
        return () => clearInterval(interval);
    }, [layers, onLayersChange]);

    const handleToggle = useCallback(
        async (layer: GeoLayer) => {
            const newVisible = !layer.visible;
            try {
                await layerApi.updateLayer(layer.id, { visible: newVisible });
                onLayerVisibilityChange(layer.id, newVisible);
                onLayersChange();
            } catch (err) {
                console.error('Error toggling layer:', err);
            }
        },
        [onLayersChange, onLayerVisibilityChange]
    );

    const handleDelete = useCallback(
        async (id: number) => {
            if (!confirm('Xác nhận xóa lớp dữ liệu này?')) return;
            setDeleting(id);
            try {
                await layerApi.deleteLayer(id);
                onLayersChange();
            } catch (err) {
                console.error('Error deleting layer:', err);
            } finally {
                setDeleting(null);
            }
        },
        [onLayersChange]
    );

    const parseColor = (rgba: string): string => {
        if (!rgba) return '#64748b';
        const parts = rgba.split(',').map(Number);
        const r = Math.round((parts[0] || 0) * 255);
        const g = Math.round((parts[1] || 0) * 255);
        const b = Math.round((parts[2] || 0) * 255);
        return `rgb(${r},${g},${b})`;
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    GEOJSON LAYERS ({layers.length})
                </Typography>
                <Tooltip title="Làm mới">
                    <IconButton size="small" onClick={onLayersChange} sx={{ color: 'text.secondary' }}>
                        <RefreshIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </Tooltip>
            </Box>

            <List sx={{ p: 0 }}>
                {layers.map((layer) => (
                    <ListItem
                        key={layer.id}
                        disablePadding
                        secondaryAction={
                            <IconButton
                                edge="end"
                                size="small"
                                onClick={() => handleDelete(layer.id)}
                                disabled={deleting === layer.id}
                                sx={{ 
                                    color: 'text.secondary', 
                                    opacity: 0.4,
                                    '&:hover': { color: 'error.main', opacity: 1, bgcolor: 'rgba(239, 68, 68, 0.05)' } 
                                }}
                            >
                                {deleting === layer.id ? <CircularProgress size={14} color="inherit" /> : <DeleteIcon sx={{ fontSize: 15 }} />}
                            </IconButton>
                        }
                        sx={{ 
                            mb: 1, 
                            borderRadius: 1,
                            bgcolor: 'rgba(255, 255, 255, 0.015)',
                            border: '1px solid rgba(255, 255, 255, 0.03)',
                            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.03)' }
                        }}
                    >
                        <ListItemIcon sx={{ minWidth: 40, pl: 0.5 }}>
                            {layer.status === 'PROCESSING' ? (
                                <CircularProgress size={16} sx={{ color: 'warning.main' }} />
                            ) : (
                                <Checkbox
                                    edge="start"
                                    checked={layer.visible && layer.status === 'READY'}
                                    disabled={layer.status !== 'READY'}
                                    onChange={() => handleToggle(layer)}
                                    size="small"
                                    sx={{
                                        color: 'rgba(255, 255, 255, 0.1)',
                                        '&.Mui-checked': { color: parseColor(layer.colorRgba) },
                                        p: 0.5
                                    }}
                                />
                            )}
                        </ListItemIcon>
                        <ListItemText
                            primary={
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontWeight: 600, fontSize: '0.75rem',
                                        color: layer.status === 'READY' ? 'text.primary' : 'text.secondary',
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                        maxWidth: 160,
                                    }}
                                >
                                    {layer.name}
                                </Typography>
                            }
                            secondary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 0.4 }}>
                                    <Box sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center' }}>
                                        {layer.geometryType && GEOM_ICONS[layer.geometryType]}
                                    </Box>
                                    <Typography variant="caption" sx={{ color: STATUS_COLORS[layer.status], fontSize: '0.65rem', fontWeight: 600 }}>
                                        {layer.status === 'READY'
                                            ? `${layer.featureCount} Features`
                                            : layer.status === 'PROCESSING'
                                            ? 'Processing...'
                                            : layer.status === 'ERROR'
                                            ? 'Failed'
                                            : 'Queued'}
                                    </Typography>
                                    {layer.status === 'ERROR' && (
                                        <Tooltip title={layer.errorMessage || 'Error during conversion'}>
                                            <ErrorIcon sx={{ fontSize: 12, color: 'error.main', cursor: 'help' }} />
                                        </Tooltip>
                                    )}
                                </Box>
                            }
                        />
                    </ListItem>
                ))}
                {layers.length === 0 && (
                    <Box sx={{ py: 6, textAlign: 'center', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                            Không tìm thấy dữ liệu GeoJSON tự động
                        </Typography>
                    </Box>
                )}
            </List>
        </Box>
    );
};

export default LayerBrowser;
