import React, { useEffect, useState } from 'react';
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    TextField,
    Typography,
} from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { layerApi } from '../services/layerApi';
import type { AvailableFile, GeoLayerCreateRequest } from '../types/GeoLayer';

interface AddLayerDialogProps {
    open: boolean;
    onClose: () => void;
    onCreated: () => void;
}

// Preset colors
const PRESET_COLORS = [
    { label: 'Xanh dương', rgba: '0.47,0.78,0.98,1.0', hex: '#78C7FA' },
    { label: 'Xanh lá', rgba: '0.3,0.85,0.4,1.0', hex: '#4DD966' },
    { label: 'Đỏ cam', rgba: '0.95,0.4,0.3,1.0', hex: '#F2664D' },
    { label: 'Vàng', rgba: '0.95,0.82,0.2,1.0', hex: '#F2D133' },
    { label: 'Tím', rgba: '0.68,0.4,0.87,1.0', hex: '#AD66DE' },
    { label: 'Cam', rgba: '1.0,0.6,0.2,1.0', hex: '#FF9933' },
    { label: 'Hồng', rgba: '0.95,0.4,0.7,1.0', hex: '#F266B3' },
    { label: 'Xám xanh', rgba: '0.5,0.7,0.7,1.0', hex: '#80B3B3' },
];

const AddLayerDialog: React.FC<AddLayerDialogProps> = ({ open, onClose, onCreated }) => {
    const [files, setFiles] = useState<AvailableFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<AvailableFile | null>(null);
    const [layerName, setLayerName] = useState('');
    const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0].rgba);
    const [extrudeHeight, setExtrudeHeight] = useState(50);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (open) {
            setLoading(true);
            layerApi.getAvailableFiles()
                .then(setFiles)
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [open]);

    const handleSelectFile = (file: AvailableFile) => {
        setSelectedFile(file);
        setLayerName(file.displayName);
    };

    const handleCreate = async () => {
        if (!selectedFile || !layerName.trim()) return;
        setCreating(true);
        try {
            const request: GeoLayerCreateRequest = {
                name: layerName,
                sourceFile: selectedFile.fileName,
                colorRgba: selectedColor,
                extrudeHeight,
            };
            await layerApi.createLayer(request);
            onCreated();
            onClose();
            setSelectedFile(null);
            setLayerName('');
        } catch (error) {
            console.error('Error creating layer:', error);
        } finally {
            setCreating(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    bgcolor: 'rgba(15, 23, 42, 0.95)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 3,
                },
            }}
        >
            <DialogTitle sx={{ color: '#00e5ff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <FolderOpenIcon /> Thêm Layer GeoJSON
            </DialogTitle>
            <DialogContent>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress sx={{ color: '#00e5ff' }} />
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        {/* File list */}
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            Chọn file GeoJSON ({files.length} files)
                        </Typography>
                        <Box sx={{ maxHeight: 250, overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2 }}>
                            <List dense sx={{ p: 0 }}>
                                {files.map((file) => (
                                    <ListItem key={file.fileName} disablePadding>
                                        <ListItemButton
                                            selected={selectedFile?.fileName === file.fileName}
                                            onClick={() => handleSelectFile(file)}
                                            disabled={file.imported}
                                            sx={{
                                                '&.Mui-selected': {
                                                    bgcolor: 'rgba(0, 229, 255, 0.12)',
                                                    borderLeft: '3px solid #00e5ff',
                                                },
                                                '&:hover': { bgcolor: 'rgba(0, 229, 255, 0.06)' },
                                            }}
                                        >
                                            <ListItemText
                                                primary={
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        {file.imported && <CheckCircleIcon sx={{ fontSize: 14, color: '#4caf50' }} />}
                                                        <Typography variant="body2" sx={{ color: file.imported ? '#666' : '#f8fafc', fontSize: '0.8rem' }}>
                                                            {file.displayName}
                                                        </Typography>
                                                    </Box>
                                                }
                                                secondary={
                                                    <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.65rem' }}>
                                                        {file.fileSizeMB} MB {file.imported ? '• Đã import' : ''}
                                                    </Typography>
                                                }
                                            />
                                        </ListItemButton>
                                    </ListItem>
                                ))}
                            </List>
                        </Box>

                        {selectedFile && (
                            <>
                                {/* Layer name */}
                                <TextField
                                    label="Tên Layer"
                                    value={layerName}
                                    onChange={(e) => setLayerName(e.target.value)}
                                    fullWidth
                                    size="small"
                                />

                                {/* Color picker */}
                                <Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
                                        Màu hiển thị
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                        {PRESET_COLORS.map((c) => (
                                            <Box
                                                key={c.rgba}
                                                onClick={() => setSelectedColor(c.rgba)}
                                                sx={{
                                                    width: 28, height: 28,
                                                    borderRadius: '50%',
                                                    bgcolor: c.hex,
                                                    cursor: 'pointer',
                                                    border: selectedColor === c.rgba ? '3px solid #fff' : '2px solid transparent',
                                                    transition: 'all 0.2s',
                                                    '&:hover': { transform: 'scale(1.2)' },
                                                }}
                                                title={c.label}
                                            />
                                        ))}
                                    </Box>
                                </Box>

                                {/* Extrude height */}
                                <TextField
                                    label="Chiều cao đùn (m)"
                                    type="number"
                                    value={extrudeHeight}
                                    onChange={(e) => setExtrudeHeight(Number(e.target.value))}
                                    size="small"
                                    fullWidth
                                />
                            </>
                        )}
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{ p: 2, pt: 0 }}>
                <Button onClick={onClose} color="inherit" size="small">Hủy</Button>
                <Button
                    onClick={handleCreate}
                    variant="contained"
                    disabled={!selectedFile || !layerName.trim() || creating}
                    size="small"
                    sx={{
                        bgcolor: '#00e5ff', color: '#0f172a', fontWeight: 700,
                        '&:hover': { bgcolor: '#00b2cc' },
                    }}
                >
                    {creating ? <CircularProgress size={18} /> : '🚀 Tạo Layer'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AddLayerDialog;
