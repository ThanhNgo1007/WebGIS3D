import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { GisItem } from '../../types/GisItem';

interface PickedLocation {
  longitude: number;
  latitude: number;
}

interface PreviewState {
  url: string | null;
  scale: number;
  heading: number;
  heightOffset: number;
}

interface AppState {
  isPickingMode: boolean;
  pickedLocation: PickedLocation | null;
  selectedItem: GisItem | null;
  previewModel: PreviewState;
  isPreviewLocked: boolean; // "Đặt tạm" mode - lock model, free camera
}

const initialState: AppState = {
  isPickingMode: false,
  pickedLocation: null,
  selectedItem: null,
  previewModel: {
    url: null,
    scale: 1,
    heading: 0,
    heightOffset: 0,
  },
  isPreviewLocked: false,
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setPickingMode: (state, action: PayloadAction<boolean>) => {
      state.isPickingMode = action.payload;
      if (action.payload) {
        // Only reset location, KEEP the previewModel so it can appear on map after picking
        state.pickedLocation = null;
        state.isPreviewLocked = false;
      }
    },
    setPickedLocation: (state, action: PayloadAction<PickedLocation | null>) => {
      state.pickedLocation = action.payload;
      state.isPickingMode = false;
    },
    setSelectedItem: (state, action: PayloadAction<GisItem | null>) => {
      state.selectedItem = action.payload;
    },
    setPreviewModel: (state, action: PayloadAction<Partial<PreviewState>>) => {
      if (action.payload.url !== undefined && state.previewModel.url && state.previewModel.url !== action.payload.url) {
        URL.revokeObjectURL(state.previewModel.url);
      }
      state.previewModel = { ...state.previewModel, ...action.payload };
    },
    setPreviewLocked: (state, action: PayloadAction<boolean>) => {
      state.isPreviewLocked = action.payload;
    },
    resetPicking: (state) => {
      state.pickedLocation = null;
      state.isPickingMode = false;
      state.isPreviewLocked = false;
      if (state.previewModel.url) {
        URL.revokeObjectURL(state.previewModel.url);
      }
      state.previewModel = { ...initialState.previewModel };
    },
  },
});

export const { setPickingMode, setPickedLocation, setSelectedItem, setPreviewModel, setPreviewLocked, resetPicking } = appSlice.actions;
export default appSlice.reducer;
