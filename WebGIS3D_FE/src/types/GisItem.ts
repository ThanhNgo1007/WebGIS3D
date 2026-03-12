export interface GisItemLod {
  lodLevel: number;
  geometricError: number;
  fileName: string;
  fileSize: number;
}

export interface GisItem {
  id: number;
  name: string;
  description: string;
  scale: number;
  longitude: number;
  latitude: number;
  heading: number;       // Rotation in degrees (0-360)
  heightOffset: number;  // Meters above/below terrain
  createdAt: string;
  updatedAt: string;
  lodFiles: GisItemLod[];
}

export interface GisItemCreateRequest {
  name: string;
  description?: string;
  scale: number;
  longitude: number;
  latitude: number;
  heading?: number;
  heightOffset?: number;
}

export interface GisItemUpdateRequest {
  name?: string;
  description?: string;
  scale?: number;
  longitude?: number;
  latitude?: number;
  heading?: number;
  heightOffset?: number;
}
