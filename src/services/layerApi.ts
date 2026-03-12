import axios from 'axios';
import type { AvailableFile, GeoLayer, GeoLayerCreateRequest, GeoLayerUpdateRequest } from '../types/GeoLayer';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const layerApi = {
  // Get all layers
  getAllLayers: async (): Promise<GeoLayer[]> => {
    const response = await api.get<GeoLayer[]>('/api/layers');
    return response.data;
  },

  // Get single layer
  getLayer: async (id: number): Promise<GeoLayer> => {
    const response = await api.get<GeoLayer>(`/api/layers/${id}`);
    return response.data;
  },

  // Get available GeoJSON files
  getAvailableFiles: async (): Promise<AvailableFile[]> => {
    const response = await api.get<AvailableFile[]>('/api/layers/available-files');
    return response.data;
  },

  // Create a new layer
  createLayer: async (data: GeoLayerCreateRequest): Promise<GeoLayer> => {
    const response = await api.post<GeoLayer>('/api/layers', data);
    return response.data;
  },

  // Update layer
  updateLayer: async (id: number, data: GeoLayerUpdateRequest): Promise<GeoLayer> => {
    const response = await api.put<GeoLayer>(`/api/layers/${id}`, data);
    return response.data;
  },

  // Delete layer
  deleteLayer: async (id: number): Promise<void> => {
    await api.delete(`/api/layers/${id}`);
  },

  // Get tileset URL
  getLayerTilesetUrl: (id: number): string => {
    return `${API_BASE_URL}/api/layers/${id}/tiles/tileset.json`;
  },
};
