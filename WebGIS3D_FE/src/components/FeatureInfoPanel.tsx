import React from 'react';
import {
    Box,
    IconButton,
    Paper,
    Divider,
    Typography,
    Stack,
    Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArticleIcon from '@mui/icons-material/Article';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

interface FeatureInfoPanelProps {
    properties: Record<string, string | number | null> | null;
    layerName?: string;
    onClose: () => void;
}

// Vietnamese field label mapping - Cleaned and professional
const FIELD_LABELS: Record<string, string> = {
    // Administrative
    tenHuyen: 'Quận / Huyện',
    tenXa: 'Phường / Xã',
    tenTinh: 'Tỉnh / Thành phố',
    maHuyen: 'Mã Quận Huyện',
    maXa: 'Mã Phường Xã',
    maTinh: 'Mã Tỉnh',
    dienTichTuNhien: 'Diện tích Tự nhiên (ha)',
    danSo: 'Dân số (Người)',
    
    // Land use & Planning
    loaiDat: 'Loại đất',
    mucDichSuDung: 'Mục đích sử dụng',
    thoiHanSuDung: 'Thời hạn sử dụng',
    hinhThucSuDung: 'Hình thức sử dụng',
    soTo: 'Số tờ',
    soThua: 'Số thửa',
    chuSuDung: 'Chủ sở hữu / Người sử dụng',
    diaChi: 'Địa chỉ đối tượng',
    tinhTrangPhapLy: 'Tình trạng pháp lý',
    ngayCap: 'Ngày cấp bản vẽ/GCN',
    soGCN: 'Số Giấy chứng nhận',
    
    // Infrastructure & Utilities
    loaiTram: 'Loại trạm',
    congSuat: 'Công suất hoạt động',
    donViQuanLy: 'Đơn vị quản lý',
    namXayDung: 'Năm xây dựng',
    tinhTrang: 'Tình trạng hiện hữu',
    
    // Transport
    tenDuong: 'Tên tuyến đường',
    loaiDuong: 'Cấp hạng đường',
    chieuDai: 'Chiều dài (m)',
    soLanXe: 'Số làn xe',
    tocDoThietKe: 'Vận tốc thiết kế (km/h)',
    loaiMatDuong: 'Loại mặt đường',
    loaiKetCau: 'Loại kết cấu',
    
    // Ports & Infrastructure
    tenCang: 'Tên cảng / bến',
    loaiCang: 'Phân loại cảng',
    congSuatThietKe: 'Công suất thiết kế',
    trongTaiTau: 'Trọng tải tàu (DWT)',
    
    // Hydrography
    tenSong: 'Tên sông / rạch',
    loaiSong: 'Cấp kỹ thuật sông',
    chieuRong: 'Chiều rộng trung bình (m)',
    doSau: 'Độ sâu trung bình (m)',
    
    // Generic
    Name: 'Tên đối tượng',
    name: 'Tên đối tượng',
    TEN: 'Tên đối tượng',
    ten: 'Tên đối tượng',
    tenDoiTuong: 'Tên đối tượng',
    Shape_Area: 'Diện tích (m²)',
    Shape_Leng: 'Chu vi (m)',
    SHAPE_Area: 'Diện tích (m²)',
    SHAPE_Leng: 'Chu vi (m)',
    geometry_area: 'Diện tích (m²)',
    geometry_len: 'Chu vi (m)',
};

// Technical fields to hide
const HIDDEN_FIELDS = new Set([
    'OBJECTID', 'OBJECTID_1', 'FID', 'fid', 'SHAPE', 'shape', 
    'GlobalID', 'globalid', 'gml_id', 'layer_id', 'feat_id',
    'id', 'ID', 'code', 'CODE', 'ma_huyen', 'ma_xa', 'ma_tinh',
    'geom', 'the_geom', 'GEOMETRY', 'version', 'created_at', 'updated_at'
]);

const FeatureInfoPanel: React.FC<FeatureInfoPanelProps> = ({ properties, layerName, onClose }) => {
    if (!properties) return null;

    // Identify the primary title with smarter priority
    const getPriority = (key: string): number => {
        const k = key.toLowerCase();
        const label = (FIELD_LABELS[key] || '').toLowerCase();
        
        // Priority 1: Direct entity names (Subject)
        if (['ten', 'name', 'tendoituong', 'ten_doi_tuong', 'ten_truong', 'tentruong', 'tenduong', 'tensong', 'tencang', 'ten_co_quan'].includes(k)) return 100;
        
        // Priority 2: Generic names
        if (k === 'ten' || k === 'name' || label === 'tên đối tượng') return 90;
        
        // Priority 3: Labels starting with "tên" but NOT personal names
        if (label.startsWith('tên') && !label.includes('hiệu trưởng') && !label.includes('giám đốc') && !label.includes('người') && !label.includes('liên hệ')) return 80;
        
        // Priority 4: Other keys starting with "ten"
        if (k.startsWith('ten') && !k.includes('hieutruong') && !k.includes('giamdoc')) return 70;
        
        return 0;
    };

    const titleKey = Object.keys(properties)
        .filter(k => getPriority(k) > 0)
        .sort((a, b) => getPriority(b) - getPriority(a))[0];
    
    const primaryTitle = titleKey ? String(properties[titleKey]) : layerName || 'Thông tin chi tiết';
    const secondaryLabel = titleKey ? (layerName || 'Dữ liệu không gian') : 'Dữ liệu không gian';

    const entries = Object.entries(properties)
        .filter(([key]) => key !== titleKey) // Don't repeat the title in the list
        .filter(([key]) => !HIDDEN_FIELDS.has(key) && !key.toLowerCase().includes('id') && !key.toLowerCase().includes('code'))
        .filter(([, val]) => val !== null && val !== '' && val !== undefined)
        .map(([key, val]) => ({
            label: FIELD_LABELS[key] || key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim(),
            value: typeof val === 'number' ? formatNumber(val) : String(val),
        }));

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
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
            {/* Header: Dynamic Title based on "Tên..." fields */}
            <Box
                sx={{
                    p: 2.5,
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                }}
            >
                <Stack direction="row" spacing={2} alignItems="center">
                    <Box sx={{ 
                        width: 42, 
                        height: 42, 
                        borderRadius: 3, 
                        bgcolor: 'primary.main', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                    }}>
                        <ArticleIcon sx={{ color: 'white', fontSize: 24 }} />
                    </Box>
                    <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary', display: 'block', lineHeight: 1.2 }}>
                            {primaryTitle}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            {secondaryLabel}
                        </Typography>
                    </Box>
                </Stack>
                <IconButton size="small" onClick={onClose} sx={{ mt: -0.5, mr: -0.5, bgcolor: 'rgba(255,255,255,0.03)', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' } }}>
                    <CloseIcon sx={{ fontSize: 18 }} />
                </IconButton>
            </Box>

            <Divider sx={{ mx: 2.5, opacity: 0.1 }} />

            {/* List of attributes */}
            <Box sx={{ 
                p: 2.5, 
                overflowY: 'auto', 
                flexGrow: 1,
                '&::-webkit-scrollbar': { width: '4px' },
                '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '10px' }
            }}>
                <Stack spacing={2.5}>
                    {entries.length > 0 ? entries.map(({ label, value }, idx) => (
                        <Box key={idx} sx={{ position: 'relative', '&:hover .copy-btn': { opacity: 1 } }}>
                            <Typography variant="caption" sx={{ color: 'primary.light', fontWeight: 800, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.5, display: 'block' }}>
                                {label}
                            </Typography>
                            
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500, lineHeight: 1.6, flex: 1 }}>
                                    {value}
                                </Typography>
                                <Tooltip title="Sao chép">
                                    <IconButton 
                                        className="copy-btn"
                                        size="small" 
                                        onClick={() => handleCopy(value)}
                                        sx={{ 
                                            p: 0.5, 
                                            opacity: 0, 
                                            transition: 'opacity 0.2s',
                                            bgcolor: 'rgba(255,255,255,0.05)'
                                        }}
                                    >
                                        <ContentCopyIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        </Box>
                    )) : (
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic', textAlign: 'center' }}>
                            Không có thêm thuộc tính khác.
                        </Typography>
                    )}
                </Stack>
            </Box>

            {/* Footer */}
            <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.15)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic', fontSize: '0.7rem', display: 'block', textAlign: 'center' }}>
                    Nghiên cứu khoa học & Quản lý đô thị Cần Thơ
                </Typography>
            </Box>
        </Paper>
    );
};

function formatNumber(n: number): string {
    if (Number.isInteger(n)) return n.toLocaleString('vi-VN');
    return n.toLocaleString('vi-VN', { maximumFractionDigits: 4 });
}

export default FeatureInfoPanel;
