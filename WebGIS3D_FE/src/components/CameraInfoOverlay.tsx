import * as Cesium from 'cesium';
import React, { useEffect, useState } from 'react';
import { useCesium } from 'resium';

interface CameraInfo {
  altitude: number;
  longitude: number;
  latitude: number;
  estimatedLod: number;
}

const CameraInfoOverlay: React.FC = () => {
  const { viewer } = useCesium();
  const [cameraInfo, setCameraInfo] = useState<CameraInfo | null>(null);

  // Calculate which LOD should be active based on altitude
  const getEstimatedLod = (altitude: number): number => {
    // Based on Cesium SSE formula: switching distance ≈ geometricError × 58
    // LOD 2 (root): error=35 → switches to LOD 1 at ~2000m
    // LOD 1: error=8 → switches to LOD 0 at ~500m
    // LOD 0 (leaf): error=0 → always rendered when visible
    if (altitude < 500) return 0;
    if (altitude < 2000) return 1;
    return 2;
  };

  // const getLodLabel = (lod: number): string => {
  //   switch (lod) {
  //     case 0: return 'LOD 0 (High Detail)';
  //     case 1: return 'LOD 1 (Medium Detail)';
  //     case 2: return 'LOD 2 (Low Detail)';
  //     default: return `LOD ${lod}`;
  //   }
  // };

  // const getLodColor = (lod: number): string => {
  //   switch (lod) {
  //     case 0: return 'linear-gradient(45deg, #00b09b, #96c93d)'; // Green/Cyan
  //     case 1: return 'linear-gradient(45deg, #f2994a, #f2c94c)'; // Warm Orange
  //     case 2: return 'linear-gradient(45deg, #eb3349, #f45c43)'; // Red
  //     default: return '#9e9e9e';
  //   }
  // };

  useEffect(() => {
    if (!viewer) return;

    const updateCameraInfo = () => {
      const camera = viewer.camera;
      const cartographic = camera.positionCartographic;
      
      if (cartographic) {
        const altitude = cartographic.height;
        const longitude = Cesium.Math.toDegrees(cartographic.longitude);
        const latitude = Cesium.Math.toDegrees(cartographic.latitude);
        
        setCameraInfo({
          altitude,
          longitude,
          latitude,
          estimatedLod: getEstimatedLod(altitude),
        });
      }
    };

    // Update on camera move
    viewer.camera.moveEnd.addEventListener(updateCameraInfo);
    // Also update periodically during movement
    const interval = setInterval(updateCameraInfo, 100);
    
    // Initial update
    updateCameraInfo();

    return () => {
      viewer.camera.moveEnd.removeEventListener(updateCameraInfo);
      clearInterval(interval);
    };
  }, [viewer]);

  if (!cameraInfo) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 24,
        right: 24,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        color: '#f8fafc',
        padding: '16px',
        borderRadius: 12,
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        fontSize: 13,
        zIndex: 1000,
        minWidth: 220,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}
    >
      <div style={{ marginBottom: 12, fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 8, display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{color: '#00e5ff'}}>⚡</span> TELEMETRY
      </div>
      
      <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: '#94a3b8' }}>ALTITUDE</span>
        <span style={{ fontWeight: 'bold', color: '#00e5ff' }}>{cameraInfo.altitude.toFixed(1)} m</span>
      </div>
      
      <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: '#94a3b8' }}>LNG</span>
        <span>{cameraInfo.longitude.toFixed(5)}</span>
      </div>
      
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: '#94a3b8' }}>LAT</span>
        <span>{cameraInfo.latitude.toFixed(5)}</span>
      </div>
      
      <div
        style={{
          // background: getLodColor(cameraInfo.estimatedLod),
          color: 'white',
          padding: '8px 12px',
          borderRadius: 6,
          textAlign: 'center',
          fontWeight: 'bold',
          letterSpacing: '0.5px',
          textShadow: '0 1px 2px rgba(0,0,0,0.2)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}
      >
        {/* {getLodLabel(cameraInfo.estimatedLod)} */}
      </div>
      
      <div style={{ marginTop: 12, fontSize: 10, color: '#64748b', textAlign: 'center' }}>
        L0:&lt;500m | L1:&lt;2km | L2:&gt;2km
      </div>
    </div>
  );
};

export default CameraInfoOverlay;
