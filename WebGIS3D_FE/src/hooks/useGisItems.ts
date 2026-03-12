import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { gisApi } from '../services/api';
import type { GisItem } from '../types/GisItem';

// Query keys
export const gisItemKeys = {
  all: ['gisItems'] as const,
  detail: (id: number) => ['gisItems', id] as const,
};

// Get all items
export function useGisItems() {
  return useQuery({
    queryKey: gisItemKeys.all,
    queryFn: gisApi.getAllItems,
    staleTime: 30000, // 30 seconds
  });
}

// Create item
export function useCreateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      item,
      lodFiles,
      geometricErrors,
    }: {
      item: Omit<GisItem, 'id' | 'createdAt' | 'updatedAt' | 'lodFiles'>;
      lodFiles: File[];
      geometricErrors: number[];
    }) => {
      return gisApi.createItem(item, lodFiles, geometricErrors);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gisItemKeys.all });
    },
  });
}

// Update item
export function useUpdateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: { name?: string; description?: string };
    }) => {
      return gisApi.updateItem(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gisItemKeys.all });
    },
  });
}

// Delete item
export function useDeleteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      return gisApi.deleteItem(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gisItemKeys.all });
    },
  });
}
