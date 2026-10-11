/// <reference types="google.maps" />
import React, { useEffect, useRef, useState } from 'react';
import { CityConfig, GridCell, RestPoint, ShiftPing } from '../types';

interface GoogleMapComponentProps {
  city: CityConfig;
  heatGrid: GridCell[];
  points: RestPoint[];
  currentPing?: ShiftPing;
  pingHistory: ShiftPing[];
  apiKey: string;
  onAddPointClick?: (lat: number, lon: number) => void;
  onPointSelect?: (point: RestPoint) => void;
  targetPoint?: RestPoint | null;
  onSwitchToLeaflet?: () => void;
  onError?: (err: string) => void;
  onRequestGps?: () => void;
}

export const GoogleMapComponent: React.FC<GoogleMapComponentProps> = ({
  city,
  heatGrid,
  points,
  currentPing,
  pingHistory,
  apiKey,
  onAddPointClick,
  onPointSelect,
  targetPoint,
  onSwitchToLeaflet,
  onError,
  onRequestGps,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapInstance = useRef<google.maps.Map | null>(null);
  const heatCirclesRef = useRef<google.maps.Circle[]>([]);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const riderMarkerRef = useRef<google.maps.Marker | null>(null);
  const routePolylineRef = useRef<google.maps.Polyline | null>(null);

  const [mapType, setMapType] = useState<'roadmap' | 'hybrid'>('roadmap');
  const [showHeatGrid, setShowHeatGrid] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [authErrorNotice, setAuthErrorNotice] = useState<string | null>(null);

  // Initialize Google Maps Script
  useEffect(() => {
    let isMounted = true;

    if (!apiKey || !apiKey.trim()) {
      setIsLoading(false);
      setAuthErrorNotice(
        'A Google Maps JavaScript API key is required to render Google Maps. You can enter your key in settings, or switch to the built-in Road + Thermal Radar which needs zero API keys!'
      );
      return;
    }

    setIsLoading(true);
    setAuthErrorNotice(null);

    // Intercept Google Maps Auth Failure to prevent alert popup and auto-fallback
    const prevAuthFailure = (window as unknown as { gm_authFailure?: () => void }).gm_authFailure;
    (window as unknown as { gm_authFailure?: () => void }).gm_authFailure = () => {
      console.warn('Google Maps API Key auth failure detected (Check GCP Console: Maps JavaScript API enabled & Referrers)');
      if (isMounted) {
        setIsLoading(false);
        setAuthErrorNotice(
          'API Key received, but Google Cloud returned an authorization notice. Enable "Maps JavaScript API" in GCP Console and set Referrers to None or *.run.app.'
        );
        if (onError) {
          onError('Google Maps key requires Maps JavaScript API enabled or HTTP Referrer unrestricted.');
        }
        // Auto-switch to Voyager HD map so the rider is NEVER blocked by a grey map
        if (onSwitchToLeaflet) {
          setTimeout(() => {
            onSwitchToLeaflet();
          }, 1200);
        }
      }
    };

    const scriptId = 'google-maps-api-script';
    const initMap = () => {
      if (!isMounted || !mapRef.current || !window.google) return;

      try {
        const map = new window.google.maps.Map(mapRef.current, {
          center: { lat: city.center[0], lng: city.center[1] },
          zoom: 14,
          mapTypeId: mapType,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: [
            { featureType: 'poi', stylers: [{ visibility: 'simplified' }] },
            { featureType: 'transit', stylers: [{ visibility: 'simplified' }] },
          ],
        });

        map.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (e.latLng && onAddPointClick) {
            onAddPointClick(e.latLng.lat(), e.latLng.lng());
          }
        });

        googleMapInstance.current = map;
        setIsLoading(false);
      } catch (err: unknown) {
        console.error('Google Maps init error:', err);
        setIsLoading(false);
        setAuthErrorNotice('Failed to initialize Google Maps container.');
        if (onError) onError('Google Maps failed to initialize.');
        if (onSwitchToLeaflet) onSwitchToLeaflet();
      }
    };

    if (window.google && window.google.maps) {
      initMap();
    } else {
      let script = document.getElementById(scriptId) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        // Request geometry, places, and visualization (for official Google Maps Heatmap Layer)
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
          apiKey
        )}&libraries=geometry,places,visualization&v=weekly`;
        script.async = true;
        script.defer = true;
        script.onload = () => initMap();
        script.onerror = () => {
          setIsLoading(false);
          setAuthErrorNotice('Could not load Google Maps script. Check network or API key.');
          if (onError) onError('Failed to load Google Maps script.');
          if (onSwitchToLeaflet) onSwitchToLeaflet();
        };
        document.head.appendChild(script);
      } else {
        script.addEventListener('load', initMap);
      }
    }

    return () => {
      isMounted = false;
      (window as unknown as { gm_authFailure?: () => void }).gm_authFailure = prevAuthFailure;
      markersRef.current.forEach(m => m.setMap(null));
      heatCirclesRef.current.forEach(c => c.setMap(null));
      if (riderMarkerRef.current) riderMarkerRef.current.setMap(null);
      if (routePolylineRef.current) routePolylineRef.current.setMap(null);
    };
  }, [apiKey]);

  // Center update
  useEffect(() => {
    if (googleMapInstance.current) {
      googleMapInstance.current.setCenter({ lat: city.center[0], lng: city.center[1] });
      googleMapInstance.current.setZoom(14);
    }
  }, [city]);

  // Map type update
  useEffect(() => {
    if (googleMapInstance.current && window.google) {
      googleMapInstance.current.setMapTypeId(
        mapType === 'hybrid' ? window.google.maps.MapTypeId.HYBRID : window.google.maps.MapTypeId.ROADMAP
      );
    }
  }, [mapType]);

  // Render Google Maps Thermal Radiation Domes with Interactive Popups
  useEffect(() => {
    if (!googleMapInstance.current || !window.google) return;

    heatCirclesRef.current.forEach(c => c.setMap(null));
    heatCirclesRef.current = [];

    if (!showHeatGrid) return;

    heatGrid.forEach(cell => {
      let fillColor = '#10B981';
      let strokeColor = '#059669';
      let fillOpacity = 0.22;

      if (cell.band === 'yellow') {
        fillColor = '#F59E0B';
        strokeColor = '#D97706';
        fillOpacity = 0.32;
      } else if (cell.band === 'red') {
        fillColor = '#F43F5E';
        strokeColor = '#E11D48';
        fillOpacity = 0.42;
      }

      const circle = new window.google.maps.Circle({
        strokeColor: strokeColor,
        strokeOpacity: 0.8,
        strokeWeight: 1.5,
        fillColor: fillColor,
        fillOpacity: fillOpacity,
        map: googleMapInstance.current,
        center: { lat: cell.lat, lng: cell.lon },
        radius: 1100, // 1.1km thermal radiation dome
      });

      circle.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (!e.latLng || !googleMapInstance.current) return;
        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="font-family: sans-serif; padding: 6px; font-size: 12px; color: #1e293b; max-width: 220px;">
              <strong style="color: ${strokeColor}; text-transform: uppercase;">
                ${cell.band.toUpperCase()} HEAT ZONE (${cell.wbgtC}°C WBGT)
              </strong><br/>
              <span style="font-size: 11px;">Air Temp: ${cell.tempC}°C · Humidity: ${cell.rh}%</span><br/>
              <span style="font-size: 11px; font-weight: bold; color: #d97706;">Asphalt: ${(cell.tempC + 7.5).toFixed(1)}°C</span><br/>
              <span style="font-size: 10px; color: #64748b;">Grid Cell: ${cell.cellId}</span>
            </div>
          `,
          position: e.latLng,
        });
        infoWindow.open(googleMapInstance.current);
      });

      heatCirclesRef.current.push(circle);
    });
  }, [heatGrid, showHeatGrid]);

  // Render Rest and Water Points
  useEffect(() => {
    if (!googleMapInstance.current || !window.google) return;

    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    points.forEach(pt => {
      const isTarget = targetPoint?.id === pt.id;
      const marker = new window.google.maps.Marker({
        position: { lat: pt.lat, lng: pt.lon },
        map: googleMapInstance.current,
        title: pt.name,
        animation: isTarget ? window.google.maps.Animation.BOUNCE : undefined,
      });

      marker.addListener('click', () => {
        if (onPointSelect) onPointSelect(pt);

        const info = new window.google.maps.InfoWindow({
          content: `
            <div style="font-family: sans-serif; padding: 6px; font-size: 12px; color: #0f172a; max-width: 220px;">
              <strong style="color: #d97706; text-transform: uppercase; font-size: 10px;">${pt.kind} SPOT</strong>
              <div style="font-weight: 800; font-size: 13px; margin: 3px 0;">${pt.name}</div>
              ${pt.notes ? `<div style="font-size: 11px; color: #475569; margin-bottom: 6px;">${pt.notes}</div>` : ''}
              <a href="https://www.google.com/maps/dir/?api=1&destination=${pt.lat},${pt.lon}&travelmode=two_wheeler" target="_blank" rel="noopener noreferrer" style="display: block; text-align: center; background: #0284c7; color: white; padding: 4px 8px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 11px;">
                Open Directions 🧭
              </a>
            </div>
          `,
        });
        info.open(googleMapInstance.current, marker);
      });

      markersRef.current.push(marker);
    });
  }, [points, targetPoint, onPointSelect]);

  // Render Rider Marker & Trail
  useEffect(() => {
    if (!googleMapInstance.current || !window.google || !currentPing) return;

    if (riderMarkerRef.current) riderMarkerRef.current.setMap(null);
    if (routePolylineRef.current) routePolylineRef.current.setMap(null);

    if (pingHistory.length > 1) {
      const path = pingHistory.map(p => ({ lat: p.lat, lng: p.lon }));
      routePolylineRef.current = new window.google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#F97316',
        strokeOpacity: 0.9,
        strokeWeight: 4,
        map: googleMapInstance.current,
      });
    }

    riderMarkerRef.current = new window.google.maps.Marker({
      position: { lat: currentPing.lat, lng: currentPing.lon },
      map: googleMapInstance.current,
      title: 'Current Rider Location',
    });

    googleMapInstance.current.panTo({ lat: currentPing.lat, lng: currentPing.lon });
  }, [currentPing, pingHistory]);

  const handleCenter = () => {
    if (googleMapInstance.current && currentPing) {
      googleMapInstance.current.panTo({ lat: currentPing.lat, lng: currentPing.lon });
      googleMapInstance.current.setZoom(16);
    }
    if (onRequestGps) {
      onRequestGps();
    }
  };

  const handleArrowLocate = () => {
    if (onRequestGps) {
      onRequestGps();
    }
    if (googleMapInstance.current && currentPing) {
      googleMapInstance.current.panTo({ lat: currentPing.lat, lng: currentPing.lon });
      googleMapInstance.current.setZoom(16);
    }
  };

  return (
    <div className="relative w-full h-full min-h-[380px] bg-amber-50/20">
      <div ref={mapRef} className="w-full h-full z-0 min-h-[380px]" />

      {isLoading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center text-slate-800 text-xs z-50">
          <div className="flex items-center gap-2 p-3 bg-white rounded-2xl shadow-xl border border-amber-200">
            <span className="w-3 h-3 rounded-full bg-amber-500 animate-ping" />
            <span className="font-bold text-slate-700">Connecting to Google Maps API...</span>
          </div>
        </div>
      )}

      {/* Google Cloud Authorization Note Banner */}
      {authErrorNotice && (
        <div className="absolute top-12 left-3 right-3 z-[1100] bg-amber-50 border border-amber-300 rounded-3xl p-3 shadow-xl animate-in slide-in-from-top text-xs text-amber-900 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 font-extrabold text-amber-800">
              <span>⚠️</span>
              <span>Google Maps Authorization Note</span>
            </div>
            <button
              onClick={() => setAuthErrorNotice(null)}
              className="text-amber-600 hover:text-amber-900 font-bold px-1"
            >
              ✕
            </button>
          </div>
          <p className="text-[11px] text-slate-700 leading-relaxed">
            {authErrorNotice}
          </p>
          <div className="flex items-center gap-2 pt-1">
            {onSwitchToLeaflet && (
              <button
                onClick={onSwitchToLeaflet}
                className="py-1.5 px-3 rounded-full bg-amber-500 text-white font-extrabold text-xs shadow hover:bg-amber-600 transition"
              >
                Switch to Voyager HD Map (100% Active)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Floating Google Maps Controls */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2 pointer-events-auto">
        <button
          onClick={handleArrowLocate}
          className="w-10 h-10 rounded-2xl bg-white/95 hover:bg-white text-sky-700 border border-sky-300 flex items-center justify-center shadow-lg transition active:scale-95 text-base"
          title="Navigation Arrow: Lock & Track My Live GPS Location"
        >
          <span className="text-xl transform -rotate-45 font-black leading-none select-none">➤</span>
        </button>

        <button
          onClick={handleCenter}
          className="w-10 h-10 rounded-2xl bg-white/95 hover:bg-white text-slate-700 border border-amber-200/80 flex items-center justify-center shadow-lg transition active:scale-95 text-base"
          title="Center on Rider Location"
        >
          🎯
        </button>

        <button
          onClick={() => setMapType(mapType === 'roadmap' ? 'hybrid' : 'roadmap')}
          className="w-10 h-10 rounded-2xl bg-white/95 hover:bg-white text-slate-700 border border-amber-200/80 flex items-center justify-center shadow-lg transition text-base active:scale-95"
          title="Toggle Google Satellite / Roadmap"
        >
          {mapType === 'hybrid' ? '🛰️' : '🗺️'}
        </button>

        <button
          onClick={() => setShowHeatGrid(!showHeatGrid)}
          className={`w-10 h-10 rounded-2xl border flex items-center justify-center shadow-lg transition text-base active:scale-95 ${
            showHeatGrid
              ? 'bg-amber-500 text-white border-amber-600 shadow-amber-500/30'
              : 'bg-white/95 text-slate-400 border-amber-200/80'
          }`}
          title="Toggle Heatmap Layer"
        >
          🔥
        </button>
      </div>

      {/* Google Maps Powered Badge */}
      <div className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur-md px-3 py-1 rounded-full border border-amber-200 text-[10px] text-slate-700 shadow-md pointer-events-auto flex items-center gap-1.5 font-extrabold">
        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        <span>GOOGLE MAPS JS API</span>
      </div>
    </div>
  );
};
