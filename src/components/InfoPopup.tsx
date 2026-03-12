import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SaveIcon from '@mui/icons-material/Save';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import LayersIcon from '@mui/icons-material/Layers';
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    Paper,
    Slider,
    TextField,
    Typography,
    Stack,
    Tooltip,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import React, { useEffect, useState } from 'react';
import type { GisItem, GisItemUpdateRequest } from '../types/GisItem';

interface InfoPopupProps {
  item: GisItem | null;
  onClose: () => void;
  onUpdate: (id: number, data: GisItemUpdateRequest) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

const InfoPopup: React.FC<InfoPopupProps> = ({ item, onClose, onUpdate, onDelete }) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [editLon, setEditLon] = useState(0);
  const [editLat, setEditLat] = useState(0);
  const [editHeading, setEditHeading] = useState(0);
  const [editHeightOffset, setEditHeightOffset] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (item) {
      setName(item.name);
      setDescription(item.description || '');
      setEditLon(item.longitude);
      setEditLat(item.latitude);
      setEditHeading(item.heading || 0);
      setEditHeightOffset(item.heightOffset || 0);
      setIsEditOpen(false);
    }
  }, [item]);

  if (!item) return null;

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await onUpdate(item.id, {
        name,
        description,
        longitude: editLon,
        latitude: editLat,
        heading: editHeading,
        heightOffset: editHeightOffset,
      });
      enqueueSnackbar('Cập nhật thành công!', { variant: 'success' });
      setIsEditOpen(false);
    } catch (error) {
      enqueueSnackbar('Lỗi khi cập nhật!', { variant: 'error' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Xác nhận xóa đối tượng này?')) return;

    setIsDeleting(true);
    try {
      await onDelete(item.id);
      enqueueSnackbar('Đã xóa đối tượng!', { variant: 'success' });
      onClose();
    } catch (error) {
      enqueueSnackbar('Lỗi khi xóa!', { variant: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* ===== SIDE PANEL LEFT (Like Google Maps) ===== */}
      <Paper
        elevation={0}
        sx={{
            position: 'fixed',
            top: 90,
            left: 20,
            width: 360,
            maxHeight: 'calc(100vh - 120px)',
            zIndex: 1300,
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.paper',
            backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.05))',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.6)',
            borderRadius: 4,
            overflow: 'hidden',
            animation: 'slideInLeft 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            '@keyframes slideInLeft': {
                from: { transform: 'translateX(-100%)', opacity: 0 },
                to: { transform: 'translateX(0)', opacity: 1 },
            },
        }}
      >
        {/* Header Photo or Banner */}
        <Box sx={{ width: '100%', height: 120, bgcolor: 'primary.dark', position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ 
                position: 'absolute', inset: 0, 
                backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 2px, transparent 2px, transparent 10px)',
                opacity: 0.5
            }} />
            <Box sx={{ position: 'absolute', bottom: 16, left: 16, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                 <Box sx={{ 
                    width: 52, height: 52, borderRadius: 2.5, 
                    bgcolor: 'background.paper', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)', color: 'primary.main'
                }}>
                    <ViewInArIcon sx={{ fontSize: 32 }} />
                </Box>
            </Box>
            <IconButton size="small" onClick={onClose} sx={{ position: 'absolute', top: 12, right: 12, bgcolor: 'rgba(0,0,0,0.3)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.5)' } }}>
                <CloseIcon fontSize="small" />
            </IconButton>
        </Box>

        {/* Content Body */}
        <Box sx={{ p: 2.5, flexGrow: 1, overflowY: 'auto' }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5, color: 'text.primary' }}>
                {item.name}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5, lineHeight: 1.6 }}>
                {item.description || 'Không có mô tả cho đối tượng này.'}
            </Typography>

            <Divider sx={{ mb: 2.5, opacity: 0.1 }} />

            <Stack spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <LocationOnIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                    <Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>
                            Vị trí đối tượng
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {item.longitude.toFixed(6)}, {item.latitude.toFixed(6)}
                        </Typography>
                    </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <LayersIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                    <Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>
                            Cấu hình hiển thị
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                            <Chip label={`${item.lodFiles?.length || 1} LODs`} size="small" sx={{ height: 22, fontWeight: 700, bgcolor: 'rgba(255,255,255,0.05)' }} />
                            <Chip label={`Tỷ lệ ${item.scale}x`} size="small" sx={{ height: 22, fontWeight: 700, bgcolor: 'rgba(99, 102, 241, 0.14)', color: 'primary.light' }} />
                        </Stack>
                    </Box>
                </Box>
            </Stack>

            <Box sx={{ mt: 4, display: 'flex', gap: 1.5 }}>
                <Button 
                    fullWidth 
                    variant="contained" 
                    startIcon={<EditIcon />} 
                    onClick={() => setIsEditOpen(true)}
                    sx={{ borderRadius: 2.5, py: 1.2, fontWeight: 700 }}
                >
                    Chỉnh sửa
                </Button>
                <IconButton onClick={handleDelete} sx={{ borderRadius: 2.5, border: '1px solid rgba(239, 68, 68, 0.2)', color: 'error.main' }}>
                    <DeleteIcon />
                </IconButton>
            </Box>
        </Box>

        <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.15)', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Hệ thống Quản lý 3D Cần Thơ • Model ID: {item.id}
            </Typography>
        </Box>
      </Paper>

      {/* ===== EDIT DIALOG remains same functional but theme adjusted ===== */}
      <Dialog
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.05))',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 4
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.2rem' }}>
            Cấu hình thực thể
          </Typography>
        </DialogTitle>

        <DialogContent dividers sx={{ borderBottom: 'none', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <Stack spacing={3} sx={{ py: 1 }}>
            <TextField label="Tên thực thể" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
            <TextField label="Mô tả" value={description} onChange={(e) => setDescription(e.target.value)} multiline rows={3} fullWidth />

            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.main', display: 'block', mb: 2, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Định vị không gian
              </Typography>
              <Stack direction="row" spacing={2}>
                 <TextField label="Kinh độ" type="number" value={editLon} onChange={(e) => setEditLon(parseFloat(e.target.value) || 0)} size="small" fullWidth inputProps={{ step: 0.000001 }} />
                 <TextField label="Vĩ độ" type="number" value={editLat} onChange={(e) => setEditLat(parseFloat(e.target.value) || 0)} size="small" fullWidth inputProps={{ step: 0.000001 }} />
              </Stack>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.main', display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Hiệu chỉnh hiển thị
              </Typography>
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>Góc xoay (Heading): {editHeading.toFixed(0)}°</Typography>
                  <Slider value={editHeading} onChange={(_, val) => setEditHeading(val as number)} min={0} max={360} size="small" />
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>Độ cao bù (Height): {editHeightOffset.toFixed(1)}m</Typography>
                  <Slider value={editHeightOffset} onChange={(_, val) => setEditHeightOffset(val as number)} min={-20} max={100} step={0.5} size="small" />
                </Box>
              </Stack>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 0 }}>
           <Button variant="text" onClick={() => setIsEditOpen(false)} sx={{ color: 'text.secondary', fontWeight: 700 }}>
                Hủy
            </Button>
            <Button variant="contained" startIcon={<SaveIcon />} onClick={handleUpdate} disabled={isUpdating} sx={{ borderRadius: 2, px: 3, fontWeight: 700 }}>
                {isUpdating ? 'Lưu...' : 'Cập nhật'}
            </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default InfoPopup;
