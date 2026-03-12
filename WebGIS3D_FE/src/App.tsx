import { Box, CircularProgress } from '@mui/material';
import { useSnackbar } from 'notistack';
import { useEffect, useRef, useState } from 'react';
import CesiumMap, { type CesiumMapRef } from './components/CesiumMap';
import InfoPopup from './components/InfoPopup';
import PlacementToolbar from './components/PlacementToolbar';
import TopNavigation from './components/TopNavigation';
import { useCreateItem, useDeleteItem, useGisItems, useUpdateItem } from './hooks/useGisItems';
import { useAppDispatch, useAppSelector } from './hooks/useRedux';
import { resetPicking, setPickedLocation, setPickingMode, setSelectedItem } from './store/slices/appSlice';
import type { GisItem, GisItemUpdateRequest } from './types/GisItem';
import { layerApi } from './services/layerApi';
import type { GeoLayer } from './types/GeoLayer';
import FeatureInfoPanel from './components/FeatureInfoPanel';

function App() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dispatch = useAppDispatch();
  const { isPickingMode, pickedLocation, selectedItem, previewModel } = useAppSelector((state) => state.app);
  const mapRef = useRef<CesiumMapRef>(null);
  const { enqueueSnackbar } = useSnackbar();

  // Navigation form state refs for PlacementToolbar save
  const navSubmitRef = useRef<(() => void) | null>(null);

  // TanStack Query hooks
  const { data: items = [], isLoading } = useGisItems();
  const createItemMutation = useCreateItem();
  const updateItemMutation = useUpdateItem();
  const deleteItemMutation = useDeleteItem();

  // GeoLayer state
  const [layers, setLayers] = useState<GeoLayer[]>([]);
  const [featureProperties, setFeatureProperties] = useState<Record<string, string | number | null> | null>(null);
  const [clickedLayerName, setClickedLayerName] = useState<string>('');

  const fetchLayers = async () => {
    try {
      const data = await layerApi.getAllLayers();
      setLayers(data);
    } catch (error) {
      console.error('Failed to fetch layers:', error);
    }
  };

  useEffect(() => {
    fetchLayers();
  }, []);

  const handleFlyToNinhKieu = () => {
    mapRef.current?.flyToNinhKieu();
  };

  const handleFlyToItem = (item: GisItem) => {
    mapRef.current?.flyToItem(item);
    dispatch(setSelectedItem(item)); // Also open the info popup
  };

  const handleStartPicking = () => {
    dispatch(setPickingMode(true));
  };

  const handleLocationPicked = (longitude: number, latitude: number) => {
    dispatch(setPickedLocation({ longitude, latitude }));
  };

  const handleItemClicked = (item: GisItem) => {
    dispatch(setSelectedItem(item));
    setFeatureProperties(null); // Close layer feature panel when clicking a 3D item
  };

  const handleFeatureClicked = (properties: Record<string, string | number | null>, layerName: string) => {
    setFeatureProperties(properties);
    setClickedLayerName(layerName);
    dispatch(setSelectedItem(null)); // Close standard info popup
  };

  const handleSubmit = async (data: {
    name: string;
    description: string;
    scale: number;
    lodFiles: File[];
    geometricErrors: number[];
    heading: number;
    heightOffset: number;
  }) => {
    if (!pickedLocation) return;

    try {
      await createItemMutation.mutateAsync({
        item: {
          name: data.name,
          description: data.description,
          scale: data.scale,
          longitude: pickedLocation.longitude,
          latitude: pickedLocation.latitude,
          heading: data.heading,
          heightOffset: data.heightOffset,
        },
        lodFiles: data.lodFiles,
        geometricErrors: data.geometricErrors,
      });
      dispatch(resetPicking());
    } catch (error) {
      console.error('Create error:', error);
      throw error;
    }
  };

  const handleReset = async () => {
    if (!confirm('Bạn có chắc muốn xóa sạch dữ liệu?')) return;

    try {
      for (const item of items) {
        await deleteItemMutation.mutateAsync(item.id);
      }
      window.location.reload();
    } catch (error) {
      console.error('Reset error:', error);
      enqueueSnackbar('Có lỗi khi xóa dữ liệu!', { variant: 'error' });
    }
  };

  const handleUpdate = async (id: number, data: GisItemUpdateRequest) => {
    await updateItemMutation.mutateAsync({ id, data });
  };

  const handleDelete = async (id: number) => {
    await deleteItemMutation.mutateAsync(id);
    dispatch(setSelectedItem(null));
  };

  // PlacementToolbar save handler
  const handlePlacementSave = () => {
    if (navSubmitRef.current) {
      navSubmitRef.current();
    }
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          width: '100vw',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  const canSavePlacement = !!pickedLocation && !!previewModel.url;

  return (
    <>
      <TopNavigation
        items={items}
        onFlyToNinhKieu={handleFlyToNinhKieu}
        onFlyToItem={handleFlyToItem}
        onStartPicking={handleStartPicking}
        onReset={handleReset}
        isPickingMode={isPickingMode}
        pickedLocation={pickedLocation}
        onSubmit={handleSubmit}
        onSubmitRef={navSubmitRef}
        isSubmitting={isSubmitting}
        setIsSubmitting={setIsSubmitting}
        geoLayers={layers}
        onGeoLayersChange={fetchLayers}
      />

      <CesiumMap
        ref={mapRef}
        items={items}
        geoLayers={layers}
        isPickingMode={isPickingMode}
        selectedItem={selectedItem}
        onLocationPicked={handleLocationPicked}
        onItemClicked={handleItemClicked}
        onFeatureClicked={handleFeatureClicked}
        onDeselectItem={() => dispatch(setSelectedItem(null))}
        isSidebarOpen={false}
      />

      {/* Placement Toolbar - appears at bottom of map when placing model */}
      <PlacementToolbar
        onSave={handlePlacementSave}
        isSaving={isSubmitting}
        canSave={canSavePlacement}
      />

      <InfoPopup
        item={selectedItem}
        onClose={() => dispatch(setSelectedItem(null))}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />

      <FeatureInfoPanel
        properties={featureProperties}
        layerName={clickedLayerName}
        onClose={() => setFeatureProperties(null)}
      />
    </>
  );
}

export default App;
