export interface GeoLayer {
  id: number;
  name: string;
  sourceFile: string;
  layerKey: string;
  geometryType: string | null;
  featureCount: number;
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'ERROR';
  errorMessage: string | null;
  colorRgba: string;
  extrudeHeight: number;
  lineWidth: number;
  pointRadius: number;
  visible: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface GeoLayerCreateRequest {
  name: string;
  sourceFile: string;
  colorRgba?: string;
  extrudeHeight?: number;
  lineWidth?: number;
  pointRadius?: number;
}

export interface GeoLayerUpdateRequest {
  name?: string;
  colorRgba?: string;
  visible?: boolean;
  extrudeHeight?: number;
  lineWidth?: number;
  pointRadius?: number;
}

export interface AvailableFile {
  fileName: string;
  fileSize: number;
  fileSizeMB: number;
  displayName: string;
  imported: boolean;
}
