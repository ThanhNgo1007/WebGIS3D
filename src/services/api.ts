import axios from 'axios';
import type { GisItem, GisItemUpdateRequest } from '../types/GisItem';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const gisApi = {
  // Get all items
  getAllItems: async (): Promise<GisItem[]> => {
    const response = await api.get<GisItem[]>('/api/items');
    return response.data;
  },

  // Get single item
  getItem: async (id: number): Promise<GisItem> => {
    const response = await api.get<GisItem>(`/api/items/${id}`);
    return response.data;
  },

  // Create item with LOD files
  createItem: async (
    data: {
      name: string;
      description?: string;
      scale: number;
      longitude: number;
      latitude: number;
      heading?: number;
      heightOffset?: number;
    },
    lodFiles: File[],
    geometricErrors?: number[]
  ): Promise<GisItem> => {
    const formData = new FormData();
    formData.append('name', data.name);
    if (data.description) formData.append('description', data.description);
    formData.append('scale', data.scale.toString());
    formData.append('longitude', data.longitude.toString());
    formData.append('latitude', data.latitude.toString());
    if (data.heading !== undefined) formData.append('heading', data.heading.toString());
    if (data.heightOffset !== undefined) formData.append('heightOffset', data.heightOffset.toString());

    lodFiles.forEach((file) => {
      formData.append('lodFiles', file);
    });

    if (geometricErrors) {
      geometricErrors.forEach((error) => {
        formData.append('geometricErrors', error.toString());
      });
    }

    const response = await api.post<GisItem>('/api/items', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Update item metadata
  updateItem: async (id: number, data: GisItemUpdateRequest): Promise<GisItem> => {
    const response = await api.put<GisItem>(`/api/items/${id}`, data);
    return response.data;
  },

  // Delete item
  deleteItem: async (id: number): Promise<void> => {
    await api.delete(`/api/items/${id}`);
  },

  // Get tileset URL
  getTilesetUrl: (id: number): string => {
    return `${API_BASE_URL}/api/items/${id}/tileset.json`;
  },

  // Get LOD file URL
  getLodFileUrl: (id: number, lodLevel: number): string => {
    return `${API_BASE_URL}/api/items/${id}/lod/${lodLevel}.glb`;
  },

  // Analyze GLB file to get dimensions and suggested scale
  analyzeGlb: async (file: File): Promise<{
    fileName: string;
    fileSize: number;
    dimensions: { width: number; height: number; depth: number } | null;
    maxDimension: number;
    suggestedScale: number;
    warning?: string;
  }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/api/items/analyze-glb', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

export default api;
