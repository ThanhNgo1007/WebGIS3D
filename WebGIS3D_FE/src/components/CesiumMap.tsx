import * as Cesium from 'cesium';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { ScreenSpaceEvent, ScreenSpaceEventHandler, useCesium, Viewer } from 'resium';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { gisApi } from '../services/api';
import { setPickedLocation, setPreviewModel } from '../store/slices/appSlice';
import type { GisItem } from '../types/GisItem';
import type { GeoLayer } from '../types/GeoLayer';
import { layerApi } from '../services/layerApi';
import BaseLayerSwitcher from './BaseLayerSwitcher';
import CameraInfoOverlay from './CameraInfoOverlay';
import MapToolbar from './MapToolbar';
import ModelViewControls from './ModelViewControls';

// Build a pin SVG as data URI for the picked location marker
function buildPinSvgDataUri(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="64" viewBox="0 0 48 64">
    <defs>
      <filter id="shadow" x="-20%" y="-10%" width="140%" height="130%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.5"/>
      </filter>
    </defs>
    <path d="M24 0C10.7 0 0 10.7 0 24c0 18 24 40 24 40s24-22 24-40C48 10.7 37.3 0 24 0z" fill="#00e5ff" filter="url(#shadow)"/>
    <circle cx="24" cy="24" r="10" fill="#0f172a" stroke="#fff" stroke-width="2"/>
    <circle cx="24" cy="24" r="4" fill="#fff"/>
  </svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

// Cesium Ion Token
Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI4ZjdmYjY4MS05YmM2LTRkZTgtYTUyMC0xYzhlOTE3N2EwNjIiLCJpZCI6Mzc4MzM3LCJpYXQiOjE3NjgzNjkxMTJ9.5PdIXm67qggL6I0GvrR1UcRmmrSihLcNNJTaLqzAUZU";

interface CesiumMapProps {
  items: GisItem[];
  geoLayers: GeoLayer[];
  isPickingMode: boolean;
  onLocationPicked: (longitude: number, latitude: number) => void;
  onItemClicked: (item: GisItem) => void;
  onFeatureClicked: (properties: Record<string, string | number | null>, layerName: string) => void;
  isSidebarOpen: boolean;
  selectedItem: GisItem | null;
  onDeselectItem: () => void;
}

export interface CesiumMapRef {
  flyToNinhKieu: () => void;
  flyToItem: (item: GisItem) => void;
}

// Inner component to access Cesium viewer
const MapContent: React.FC<CesiumMapProps & { mapRef: React.ForwardedRef<CesiumMapRef>; initialPosition: Cesium.Cartesian3 }> = ({
  items,
  geoLayers,
  isPickingMode,
  onLocationPicked,
  onItemClicked,
  onFeatureClicked,
  selectedItem,
  onDeselectItem,
  mapRef,
  initialPosition,
}) => {
  const { viewer } = useCesium();
  // Use ref instead of state to avoid re-renders
  const loadedTilesetsRef = useRef<Map<number, Cesium.Cesium3DTileset>>(new Map());
  const loadedGeoLayersRef = useRef<Map<number, Cesium.Cesium3DTileset>>(new Map());
  const previewEntityRef = useRef<Cesium.Entity | null>(null);
  const pinEntityRef = useRef<Cesium.Entity | null>(null);
  const { previewModel, pickedLocation: reduxPickedLocation, isPreviewLocked } = useAppSelector((state) => state.app);
  const dispatch = useAppDispatch();

  // Flag to only initialize camera and lighting once
  const hasInitializedRef = useRef(false);

  // Set camera to initial position (Cần Thơ) only on first load
  // Configure lighting for proper model colors
  useEffect(() => {
    if (viewer && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      
      viewer.camera.flyTo({
        destination: initialPosition,
        orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 },
        duration: 0,
      });

      // ========== IMAGERY: Default to Bing Satellite (via Cesium Ion) ==========
      viewer.imageryLayers.removeAll();

      // Bing Maps Aerial via Cesium Ion — best quality for Vietnam
      Cesium.IonImageryProvider.fromAssetId(2).then((bingProvider) => {
        const layer = viewer.imageryLayers.addImageryProvider(bingProvider);
        layer.brightness = 1.05;
        layer.contrast = 1.15;
        layer.saturation = 1.2;
        layer.gamma = 0.95;
      });

      // Road overlay
      Cesium.ArcGisMapServerImageryProvider.fromUrl(
        'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer'
      ).then((transportLayer) => {
        const roadsLayer = viewer.imageryLayers.addImageryProvider(transportLayer);
        roadsLayer.alpha = 0.45;
      }).catch(() => { /* optional */ });

      // ========== GLOBE RENDERING OPTIMIZATION ==========
      const globe = viewer.scene.globe;
      // Lower SSE = higher quality tiles loaded (default is 2, 1.5 = sharper)
      globe.maximumScreenSpaceError = 1.5;
      // Increase tile cache to reduce re-fetching
      globe.tileCacheSize = 1000;
      // Disable depth testing against terrain so GeoJSON data isn't hidden beneath the globe surface
      globe.depthTestAgainstTerrain = false;
      // Disable lighting so imagery is always bright and consistent
      globe.enableLighting = false;
      // Preload ancestor tiles for smoother zoom transitions
      globe.preloadAncestors = true;
      globe.preloadSiblings = true;

      // ========== SCENE QUALITY SETTINGS ==========
      const scene = viewer.scene;
      // Enable FXAA anti-aliasing to reduce jagged edges and blur
      scene.postProcessStages.fxaa.enabled = true;
      // Use SunLight for natural 3D model lighting
      scene.light = new Cesium.SunLight();
      // Disable shadows for performance
      viewer.shadows = false;

      // Request render mode: only re-render when something changes
      // This dramatically reduces GPU usage when map is idle
      scene.requestRenderMode = true;
      scene.maximumRenderTimeChange = Infinity; // Always re-render on camera move

      // Resolution scaling: 1.0 = native, >1.0 = supersampling for sharper text/lines
      // Use 1.0 for performance, 1.25-1.5 for quality on powerful GPUs
      viewer.resolutionScale = 1.0;

      // ========== CAMERA CONTROLS ==========
      scene.screenSpaceCameraController.enableRotate = true;
      scene.screenSpaceCameraController.enableTilt = true;
      scene.screenSpaceCameraController.enableLook = true;
      scene.screenSpaceCameraController.enableZoom = true;
      scene.screenSpaceCameraController.minimumZoomDistance = 1;
      scene.screenSpaceCameraController.maximumZoomDistance = 50000000;
      
      console.log('Cesium viewer initialized');
    }
  }, [viewer, initialPosition]);

  // Expose methods to parent
  useImperativeHandle(mapRef, () => ({
    flyToNinhKieu: () => {
      if (viewer) {
        viewer.camera.flyTo({
          destination: INITIAL_CAMERA_POSITION,
          orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 },
        });
      }
    },
    flyToItem: (item: GisItem) => {
      if (viewer) {
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(item.longitude, item.latitude, 800),
          orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 },
        });
      }
    },
  }));

  // === PLACEMENT MODE: Game-like drag-to-place ===
  const isDraggingModelRef = useRef(false);
  const isPlacementMode = !!(previewModel.url && reduxPickedLocation && !isPreviewLocked);

  // Helper: get world position from screen position
  const getWorldPosition = useCallback((screenPos: Cesium.Cartesian2): { lon: number; lat: number } | null => {
    if (!viewer) return null;
    let cartesian = viewer.scene.pickPosition(screenPos);
    if (!cartesian) {
      const ellipsoidResult = viewer.camera.pickEllipsoid(screenPos);
      if (ellipsoidResult) cartesian = ellipsoidResult;
    }
    if (!cartesian) return null;
    const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
    return {
      lon: Cesium.Math.toDegrees(cartographic.longitude),
      lat: Cesium.Math.toDegrees(cartographic.latitude),
    };
  }, [viewer]);

  // Handle click events
  const handleClick = useCallback(
    (movement: { position: Cesium.Cartesian2 } | { startPosition: Cesium.Cartesian2; endPosition: Cesium.Cartesian2 }) => {
      if (!viewer) return;
      if (!('position' in movement)) return;

      if (isPickingMode) {
        const pos = getWorldPosition(movement.position);
        if (pos) onLocationPicked(pos.lon, pos.lat);
      } else if (isPlacementMode && !isPreviewLocked) {
        // In placement mode (not locked): click to move model
        const pos = getWorldPosition(movement.position);
        if (pos) dispatch(setPickedLocation({ longitude: pos.lon, latitude: pos.lat }));
      } else {
        const picked = viewer.scene.pick(movement.position);
        if (Cesium.defined(picked)) {
          if (picked.content?.tileset?.dbData) {
            onItemClicked(picked.content.tileset.dbData);
          } else if (picked instanceof Cesium.Cesium3DTileFeature) {
            const properties: Record<string, string | number | null> = {};
            const propertyNames = picked.getPropertyIds();
            for (const name of propertyNames) {
              properties[name] = picked.getProperty(name);
            }
            if (Object.keys(properties).length > 0) {
              const layerName = (picked.tileset as any).layerData?.name || 'Thông tin đối tượng';
              onFeatureClicked(properties, layerName);
            }
          }
        }
      }
    },
    [viewer, isPickingMode, isPlacementMode, onLocationPicked, onItemClicked, onFeatureClicked, getWorldPosition, dispatch]
  );

  // Drag start: begin dragging model 
  const handleDragStart = useCallback(
    (movement: { position: Cesium.Cartesian2 } | { startPosition: Cesium.Cartesian2; endPosition: Cesium.Cartesian2 }) => {
      if (!viewer || !isPlacementMode) return;
      if (!('position' in movement)) return;
      isDraggingModelRef.current = true;
      // Disable camera controls during drag
      viewer.scene.screenSpaceCameraController.enableRotate = false;
      viewer.scene.screenSpaceCameraController.enableTranslate = false;
      viewer.scene.screenSpaceCameraController.enableTilt = false;
      viewer.scene.screenSpaceCameraController.enableZoom = false;
      viewer.canvas.style.cursor = 'grabbing';
      const pos = getWorldPosition(movement.position);
      if (pos) dispatch(setPickedLocation({ longitude: pos.lon, latitude: pos.lat }));
    },
    [viewer, isPlacementMode, getWorldPosition, dispatch]
  );

  // Drag move: update model position in real-time
  const handleDragMove = useCallback(
    (movement: { position: Cesium.Cartesian2 } | { startPosition: Cesium.Cartesian2; endPosition: Cesium.Cartesian2 }) => {
      if (!viewer || !isDraggingModelRef.current) return;
      if (!('endPosition' in movement)) return;
      const pos = getWorldPosition(movement.endPosition);
      if (pos) {
        dispatch(setPickedLocation({ longitude: pos.lon, latitude: pos.lat }));
        viewer.scene.requestRender();
      }
    },
    [viewer, getWorldPosition, dispatch]
  );

  // Drag end: stop dragging, re-enable camera
  const handleDragEnd = useCallback(() => {
    if (!viewer) return;
    if (isDraggingModelRef.current) {
      isDraggingModelRef.current = false;
      viewer.scene.screenSpaceCameraController.enableRotate = true;
      viewer.scene.screenSpaceCameraController.enableTranslate = true;
      viewer.scene.screenSpaceCameraController.enableTilt = true;
      viewer.scene.screenSpaceCameraController.enableZoom = true;
      viewer.canvas.style.cursor = 'crosshair';
    }
  }, [viewer]);

  // Mouse wheel: Shift+wheel = rotate, Ctrl+wheel = height
  useEffect(() => {
    if (!viewer || !isPlacementMode) return;
    const handleWheel = (e: WheelEvent) => {
      if (e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        const delta = e.deltaY > 0 ? 5 : -5;
        const newHeading = ((previewModel.heading + delta) % 360 + 360) % 360;
        dispatch(setPreviewModel({ heading: newHeading }));
        viewer.scene.requestRender();
      } else if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        const delta = e.deltaY > 0 ? -1 : 1;
        dispatch(setPreviewModel({ heightOffset: Math.round((previewModel.heightOffset + delta) * 10) / 10 }));
        viewer.scene.requestRender();
      }
    };
    viewer.canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => { viewer.canvas.removeEventListener('wheel', handleWheel); };
  }, [viewer, isPlacementMode, previewModel.heading, previewModel.heightOffset, dispatch]);

  // Set cursor style during placement mode
  useEffect(() => {
    if (!viewer) return;
    if (isPlacementMode) {
      viewer.canvas.style.cursor = 'crosshair';
      return () => { viewer.canvas.style.cursor = ''; };
    }
  }, [viewer, isPlacementMode]);

  // Handle Pin Marker at picked location
  // Hide pin when model preview is showing (avoid overlap)
  useEffect(() => {
    if (!viewer) return;

    // Remove pin if no location OR if model preview is already showing
    if (!reduxPickedLocation || previewModel.url) {
      if (pinEntityRef.current) {
        viewer.entities.remove(pinEntityRef.current);
        pinEntityRef.current = null;
        viewer.scene.requestRender();
      }
      return;
    }

    // Only show pin when there's a location but NO model preview
    const pinPosition = Cesium.Cartesian3.fromDegrees(
      reduxPickedLocation.longitude,
      reduxPickedLocation.latitude,
      0
    );

    if (!pinEntityRef.current) {
      pinEntityRef.current = viewer.entities.add({
        position: pinPosition,
        billboard: {
          image: buildPinSvgDataUri(),
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          scale: 0.8,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: `📍 ${reduxPickedLocation.longitude.toFixed(5)}, ${reduxPickedLocation.latitude.toFixed(5)}`,
          font: '11px sans-serif',
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          outlineWidth: 2,
          outlineColor: Cesium.Color.BLACK,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -50),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          fillColor: Cesium.Color.fromCssColorString('#00e5ff'),
          showBackground: true,
          backgroundColor: Cesium.Color.fromCssColorString('rgba(15,23,42,0.85)'),
          backgroundPadding: new Cesium.Cartesian2(8, 4),
        },
      });
    } else {
      pinEntityRef.current.position = new Cesium.ConstantPositionProperty(pinPosition) as any;
      (pinEntityRef.current.label as any).text = new Cesium.ConstantProperty(
        `📍 ${reduxPickedLocation.longitude.toFixed(5)}, ${reduxPickedLocation.latitude.toFixed(5)}`
      );
    }
    viewer.scene.requestRender();
  }, [viewer, reduxPickedLocation, previewModel.url]);

  // Handle Live Preview of Model
  useEffect(() => {
    let active = true;
    if (!viewer) return;

    const updatePreview = async () => {
      // Remove preview if no URL or no location
      if (!previewModel.url || !reduxPickedLocation) {
        if (previewEntityRef.current) {
          viewer.entities.remove(previewEntityRef.current);
          previewEntityRef.current = null;
        }
        return;
      }

      // Calculate terrain height
      const cartographic = Cesium.Cartographic.fromDegrees(reduxPickedLocation.longitude, reduxPickedLocation.latitude);
      let terrainHeight = 0;
      try {
        const updatedPositions = await Cesium.sampleTerrainMostDetailed(
          viewer.terrainProvider,
          [cartographic]
        );
        terrainHeight = updatedPositions[0].height;
      } catch {
        terrainHeight = viewer.scene.globe.getHeight(cartographic) || 0;
      }

      if (!active) return; // Component unmounted or request superseded

      const position = Cesium.Cartesian3.fromDegrees(
        reduxPickedLocation.longitude,
        reduxPickedLocation.latitude,
        terrainHeight + previewModel.heightOffset
      );
      const hpr = new Cesium.HeadingPitchRoll(Cesium.Math.toRadians(previewModel.heading), 0, 0);
      const orientation = Cesium.Transforms.headingPitchRollQuaternion(position, hpr);
      
      console.log(`[Preview] Placing model at heading: ${previewModel.heading} deg`);

      if (!previewEntityRef.current) {
         previewEntityRef.current = viewer.entities.add({
           position,
           orientation,
           model: {
             uri: previewModel.url,
             scale: previewModel.scale,
             silhouetteColor: Cesium.Color.fromCssColorString('#00e5ff'),
             silhouetteSize: 2.0,
           }
         });
      } else {
         previewEntityRef.current.position = new Cesium.ConstantPositionProperty(position) as any;
         previewEntityRef.current.orientation = new Cesium.ConstantProperty(orientation) as any;
         (previewEntityRef.current.model as any).scale = new Cesium.ConstantProperty(previewModel.scale);
         
         const currentUri = (previewEntityRef.current.model as any).uri?.getValue(viewer.clock.currentTime);
         if (currentUri !== previewModel.url) {
            (previewEntityRef.current.model as any).uri = new Cesium.ConstantProperty(previewModel.url);
         }
      }
      viewer.scene.requestRender();
    };

    updatePreview();

    return () => {
      active = false;
    };
  }, [viewer, previewModel, reduxPickedLocation]);

  // Load and position 3D Tiles for each item
  useEffect(() => {
    if (!viewer) return;

    const loadedTilesets = loadedTilesetsRef.current;

    // Helper to calculate matrix
    const updateTilesetMatrix = async (tileset: Cesium.Cesium3DTileset, item: any) => {
      const cartographic = Cesium.Cartographic.fromDegrees(item.longitude, item.latitude);
      let terrainHeight = 0;
      try {
        const updatedPositions = await Cesium.sampleTerrainMostDetailed(
          viewer.terrainProvider,
          [cartographic]
        );
        terrainHeight = updatedPositions[0].height;
      } catch {
        terrainHeight = viewer.scene.globe.getHeight(cartographic) || 0;
      }

      const heightOffset = item.heightOffset || 0;
      const position = Cesium.Cartesian3.fromDegrees(item.longitude, item.latitude, terrainHeight + heightOffset);
      
      // Note: Entity.model inherently applies a 90-degree yaw to glTF to make it face East at heading 0.
      // 3D Tileset does not. To make the saved 3D Tileset match the Entity preview perfectly, 
      // we subtract 90 degrees (Math.PI / 2) from the stored heading.
      const headingRad = Cesium.Math.toRadians(item.heading || 0) - Cesium.Math.PI_OVER_TWO;
      const hpr = new Cesium.HeadingPitchRoll(headingRad, 0, 0);
      const modelMatrix = Cesium.Transforms.headingPitchRollToFixedFrame(position, hpr);
      const scaleVal = item.scale || 100.0;
      const scaleMatrix = Cesium.Matrix4.fromUniformScale(scaleVal);
      Cesium.Matrix4.multiply(modelMatrix, scaleMatrix, modelMatrix);

      tileset.modelMatrix = modelMatrix;
      tileset.maximumScreenSpaceError = 16 * scaleVal;
      (tileset as any).dbData = item;
      viewer.scene.requestRender();
    };

    // Load or update items
    items.forEach(async (item) => {
      // If already loaded, check if properties changed
      if (loadedTilesets.has(item.id)) {
        const tileset = loadedTilesets.get(item.id);
        if (!tileset) return;
        const oldData = (tileset as any).dbData;
        if (
          oldData.longitude !== item.longitude ||
          oldData.latitude !== item.latitude ||
          oldData.scale !== item.scale ||
          oldData.heading !== item.heading ||
          oldData.heightOffset !== item.heightOffset
        ) {
          await updateTilesetMatrix(tileset, item);
        }
        return;
      }

      try {
        const tilesetUrl = gisApi.getTilesetUrl(item.id);
        const tileset = await Cesium.Cesium3DTileset.fromUrl(tilesetUrl, {
          dynamicScreenSpaceError: false,
          maximumScreenSpaceError: 16,
          skipLevelOfDetail: false,
          preloadFlightDestinations: true,
        });
        
        tileset.tileLoad.addEventListener((tile: any) => {
          const url = tile.content?.url || 'unknown';
          const lodMatch = url.match(/lod\/(\d+)/);
          const lodLevel = lodMatch ? lodMatch[1] : '?';
          console.log(`[LOD] ✅ Tile LOADED for "${item.name}": LOD ${lodLevel} (${url})`);
        });
        tileset.tileUnload.addEventListener((tile: any) => {
          const url = tile.content?.url || 'unknown';
          const lodMatch = url.match(/lod\/(\d+)/);
          const lodLevel = lodMatch ? lodMatch[1] : '?';
          console.log(`[LOD] ❌ Tile UNLOADED for "${item.name}": LOD ${lodLevel} (${url})`);
        });
        
        tileset.customShader = new Cesium.CustomShader({
          lightingModel: Cesium.LightingModel.UNLIT,
          translucencyMode: Cesium.CustomShaderTranslucencyMode.OPAQUE,
          fragmentShaderText: `
            void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
              if (material.alpha < 0.5) { discard; }
              material.diffuse = material.diffuse;
              material.alpha = 1.0;
            }
          `,
        });
        
        tileset.lightColor = new Cesium.Cartesian3(5.0, 5.0, 5.0);

        await updateTilesetMatrix(tileset, item);

        viewer.scene.primitives.add(tileset);
        loadedTilesets.set(item.id, tileset);
        
        console.log(`Loaded tileset for item ${item.id}: ${item.name} (LOD count: ${item.lodFiles?.length || 'unknown'})`);
      } catch (error) {
        console.error(`Failed to load tileset for item ${item.id}:`, error);
      }
    });

    // Cleanup removed items
    const itemIds = new Set(items.map((item) => item.id));
    loadedTilesets.forEach((tileset, id) => {
      if (!itemIds.has(id)) {
        viewer.scene.primitives.remove(tileset);
        loadedTilesets.delete(id);
      }
    });
  }, [viewer, items]); // Only depend on viewer and items, not on loadedTilesets

  // Load and manage GeoLayer 3D Tiles
  useEffect(() => {
    if (!viewer) return;
    const loadedLayers = loadedGeoLayersRef.current;

    geoLayers.forEach(async (layer) => {
      if (!layer.visible || layer.status !== 'READY') {
        if (loadedLayers.has(layer.id)) {
          viewer.scene.primitives.remove(loadedLayers.get(layer.id)!);
          loadedLayers.delete(layer.id);
        }
        return;
      }

      if (loadedLayers.has(layer.id)) return;

      try {
        const tilesetUrl = layerApi.getLayerTilesetUrl(layer.id);
        const tileset = await Cesium.Cesium3DTileset.fromUrl(tilesetUrl, {
          maximumScreenSpaceError: 16,
          dynamicScreenSpaceError: false,
        });
        (tileset as any).layerData = layer;
        
        // Use a glowing shader for GeoJSON layers
        tileset.customShader = new Cesium.CustomShader({
          lightingModel: Cesium.LightingModel.UNLIT,
          fragmentShaderText: `
            void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
              material.diffuse = material.diffuse;
              material.alpha = 1.0;
            }
          `,
        });

        viewer.scene.primitives.add(tileset);
        loadedLayers.set(layer.id, tileset);

        // Fly to the newly toggled layer ONLY if user clicked it recently (not on initial load)
        // For now, let's just avoid automatic flyTo to respect the initial city-wide view
        /*
        try {
            await (tileset as any).readyPromise;
            viewer.flyTo(tileset, { ... });
        } catch (err: any) { ... }
        */

      } catch (error) {
        console.error('Failed to load layer tileset:', error);
      }
    });

    // Cleanup removed layers
    const layerIds = new Set(geoLayers.map((l) => l.id));
    loadedLayers.forEach((tileset, id) => {
      if (!layerIds.has(id)) {
        viewer.scene.primitives.remove(tileset);
        loadedLayers.delete(id);
      }
    });
  }, [viewer, geoLayers]);

  return (
    <>
      <ScreenSpaceEventHandler>
        <ScreenSpaceEvent action={handleClick} type={Cesium.ScreenSpaceEventType.LEFT_CLICK} />
        {isPlacementMode && (
          <>
            <ScreenSpaceEvent action={handleDragStart} type={Cesium.ScreenSpaceEventType.LEFT_DOWN} />
            <ScreenSpaceEvent action={handleDragMove} type={Cesium.ScreenSpaceEventType.MOUSE_MOVE} />
            <ScreenSpaceEvent action={handleDragEnd} type={Cesium.ScreenSpaceEventType.LEFT_UP} />
          </>
        )}
      </ScreenSpaceEventHandler>
      <MapToolbar viewer={viewer} />
      <ModelViewControls viewer={viewer} selectedItem={selectedItem} onClose={onDeselectItem} />
    </>
  );
};

// Initial camera position - center of Ninh Kieu, Can Tho with higher altitude for full city overview
const INITIAL_CAMERA_POSITION = Cesium.Cartesian3.fromDegrees(105.7845, 10.0340, 35000);

const CesiumMap = forwardRef<CesiumMapRef, CesiumMapProps>((props, ref) => {
  return (
    <Viewer
      full
      shouldAnimate={true}
      baseLayerPicker={false}
      animation={false}
      timeline={false}
      selectionIndicator={false}
      infoBox={false}
      shadows={false}
      geocoder={false}
      homeButton={false}
      sceneModePicker={false}
      navigationHelpButton={false}
      fullscreenButton={false}
      vrButton={false}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      <MapContent {...props} mapRef={ref} initialPosition={INITIAL_CAMERA_POSITION} />
      <CameraInfoOverlay />
      <BaseLayerSwitcher />
    </Viewer>
  );
});

CesiumMap.displayName = 'CesiumMap';

export default CesiumMap;
