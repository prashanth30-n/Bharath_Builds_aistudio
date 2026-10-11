import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { CityConfig, GridCell, RestPoint, ShiftPing } from '../types';

interface MapComponentProps {
  city: CityConfig;
  heatGrid: GridCell[];
  points: RestPoint[];
  currentPing?: ShiftPing;
  pingHistory: ShiftPing[];
  onAddPointClick?: (lat: number, lon: number) => void;
  onPointSelect?: (point: RestPoint) => void;
  targetPoint?: RestPoint | null;
  isVisible?: boolean;
}

export type MapStyleType = 'voyager' | 'satellite' | 'osm';
export type HeatmapMode = 'radar' | 'surge' | 'shade' | 'grid';

export const MapComponent: React.FC<MapComponentProps> = ({
  city,
  heatGrid,
  points,
  currentPing,
  pingHistory,
  onAddPointClick,
  onPointSelect,
  targetPoint,
  isVisible = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const pointsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const riderLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const routeLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const gridShapesLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const [mapStyle, setMapStyle] = useState<MapStyleType>('voyager');
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>('radar');
  const [selectedCell, setSelectedCell] = useState<GridCell | null>(null);
  const [inspectCoords, setInspectCoords] = useState<{ lat: number; lon: number } | null>(null);

  // Render Canvas Thermal Heatmap Layer
  const renderThermalCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const map = mapInstanceRef.current;
    if (!canvas || !map || !heatGrid.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    if (heatmapMode === 'grid') {
      // In grid mode, we render structured SVG shapes instead of canvas gradient
      return;
    }

    const zoom = map.getZoom();
    // Dynamic radius scales with zoom so heat areas seamlessly merge
    const radius = Math.max(38, Math.min(130, Math.pow(2, zoom - 11) * 32));

    ctx.globalCompositeOperation = 'source-over';

    heatGrid.forEach(cell => {
      const pt = map.latLngToContainerPoint([cell.lat, cell.lon]);
      // Skip if completely out of viewport bounds
      if (pt.x < -radius || pt.x > width + radius || pt.y < -radius || pt.y > height + radius) {
        return;
      }

      const grad = ctx.createRadialGradient(pt.x, pt.y, 2, pt.x, pt.y, radius);

      if (heatmapMode === 'surge') {
        // Rapido Surge Pay Mode: Highlight high hazard earnings zones
        if (cell.band === 'red') {
          grad.addColorStop(0, 'rgba(239, 68, 68, 0.72)');
          grad.addColorStop(0.35, 'rgba(249, 115, 22, 0.45)');
          grad.addColorStop(0.7, 'rgba(251, 146, 60, 0.2)');
          grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        } else if (cell.band === 'yellow') {
          grad.addColorStop(0, 'rgba(245, 158, 11, 0.55)');
          grad.addColorStop(0.5, 'rgba(251, 191, 36, 0.25)');
          grad.addColorStop(1, 'rgba(245, 158, 11, 0)');
        } else {
          grad.addColorStop(0, 'rgba(16, 185, 129, 0.3)');
          grad.addColorStop(1, 'rgba(16, 185, 129, 0)');
        }
      } else if (heatmapMode === 'shade') {
        // Tree Canopy & Cool Oasis Mode
        if (cell.band === 'green') {
          grad.addColorStop(0, 'rgba(16, 185, 129, 0.75)');
          grad.addColorStop(0.4, 'rgba(52, 211, 153, 0.45)');
          grad.addColorStop(1, 'rgba(16, 185, 129, 0)');
        } else {
          grad.addColorStop(0, 'rgba(251, 146, 60, 0.25)');
          grad.addColorStop(1, 'rgba(251, 146, 60, 0)');
        }
      } else {
        // Default: Thermal Radar Mode (Continuous FLIR thermal imagery)
        if (cell.wbgtC >= 32) {
          // Deep extreme asphalt & concrete radiation
          grad.addColorStop(0, 'rgba(225, 29, 72, 0.78)');
          grad.addColorStop(0.28, 'rgba(239, 68, 68, 0.6)');
          grad.addColorStop(0.65, 'rgba(249, 115, 22, 0.3)');
          grad.addColorStop(1, 'rgba(225, 29, 72, 0)');
        } else if (cell.wbgtC >= 30) {
          // Solar heat caution
          grad.addColorStop(0, 'rgba(245, 158, 11, 0.68)');
          grad.addColorStop(0.4, 'rgba(251, 191, 36, 0.4)');
          grad.addColorStop(0.75, 'rgba(253, 224, 71, 0.18)');
          grad.addColorStop(1, 'rgba(245, 158, 11, 0)');
        } else {
          // Moderate / Green oasis
          grad.addColorStop(0, 'rgba(16, 185, 129, 0.55)');
          grad.addColorStop(0.5, 'rgba(52, 211, 153, 0.28)');
          grad.addColorStop(1, 'rgba(16, 185, 129, 0)');
        }
      }

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [heatGrid, heatmapMode]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: city.center,
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });

    // Default: CartoDB Voyager HD — 100% reliable, ultra-vivid roads, zero API key errors
    const initialTile = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        maxZoom: 20,
        subdomains: 'abcd',
      }
    ).addTo(map);

    tileLayerRef.current = initialTile;

    gridShapesLayerGroupRef.current = L.layerGroup().addTo(map);
    pointsLayerGroupRef.current = L.layerGroup().addTo(map);
    routeLayerGroupRef.current = L.layerGroup().addTo(map);
    riderLayerGroupRef.current = L.layerGroup().addTo(map);

    map.on('move', renderThermalCanvas);
    map.on('zoom', renderThermalCanvas);
    map.on('resize', renderThermalCanvas);

    map.on('click', (e: L.LeafletMouseEvent) => {
      // Find closest grid cell to clicked coordinate
      let closest: GridCell | null = null;
      let minDistance = Infinity;

      heatGrid.forEach(cell => {
        const d = e.latlng.distanceTo([cell.lat, cell.lon]);
        if (d < minDistance) {
          minDistance = d;
          closest = cell;
        }
      });

      if (closest && minDistance < 1800) {
        setSelectedCell(closest);
        setInspectCoords({ lat: e.latlng.lat, lon: e.latlng.lng });
      } else {
        setSelectedCell(null);
        setInspectCoords(null);
      }
    });

    mapInstanceRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
      renderThermalCanvas();
    }, 150);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Re-render canvas whenever heat grid, mode, or map changes
  useEffect(() => {
    renderThermalCanvas();
  }, [renderThermalCanvas, heatGrid, heatmapMode]);

  // Update Tile Layer when mapStyle changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    let url = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    let subdomains: string | string[] = 'abcd';
    let maxZoom = 20;

    if (mapStyle === 'satellite') {
      // High-res Esri World Imagery
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      maxZoom = 19;
    } else if (mapStyle === 'osm') {
      // OpenStreetMap Standard
      url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      subdomains = 'abc';
      maxZoom = 19;
    }

    const newLayer = L.tileLayer(url, {
      maxZoom,
      subdomains,
    });

    newLayer.addTo(mapInstanceRef.current);
    tileLayerRef.current = newLayer;

    mapInstanceRef.current.invalidateSize();
    renderThermalCanvas();
  }, [mapStyle, renderThermalCanvas]);

  // Invalidate size when visibility changes
  useEffect(() => {
    if (!mapInstanceRef.current || !isVisible) return;
    const timer = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
      renderThermalCanvas();
    }, 120);
    return () => clearTimeout(timer);
  }, [isVisible, renderThermalCanvas]);

  // Window resize listener
  useEffect(() => {
    const handleResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
        renderThermalCanvas();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderThermalCanvas]);

  // Update center when city changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView(city.center, 14);
    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
      renderThermalCanvas();
    }, 200);
  }, [city, renderThermalCanvas]);

  // Render Grid Mode (Interactive micro-sensor cells if grid mode selected)
  useEffect(() => {
    if (!gridShapesLayerGroupRef.current) return;
    gridShapesLayerGroupRef.current.clearLayers();

    if (heatmapMode !== 'grid') return;

    const halfStep = 0.01;

    heatGrid.forEach(cell => {
      const bounds: L.LatLngBoundsLiteral = [
        [cell.lat - halfStep, cell.lon - halfStep],
        [cell.lat + halfStep, cell.lon + halfStep],
      ];

      let fillColor = '#10B981';
      let strokeColor = '#059669';
      if (cell.band === 'yellow') {
        fillColor = '#F59E0B';
        strokeColor = '#D97706';
      } else if (cell.band === 'red') {
        fillColor = '#F43F5E';
        strokeColor = '#E11D48';
      }

      const rect = L.rectangle(bounds, {
        color: strokeColor,
        weight: 1.5,
        fillColor: fillColor,
        fillOpacity: 0.25,
      });

      rect.on('click', () => {
        setSelectedCell(cell);
        setInspectCoords({ lat: cell.lat, lon: cell.lon });
      });

      rect.addTo(gridShapesLayerGroupRef.current!);
    });
  }, [heatGrid, heatmapMode]);

  // Rest and Water Points Markers
  useEffect(() => {
    if (!pointsLayerGroupRef.current) return;
    pointsLayerGroupRef.current.clearLayers();

    points.forEach(pt => {
      const isTarget = targetPoint?.id === pt.id;

      let iconSymbol = '💧';
      let ringColor = 'border-sky-500 bg-sky-50 text-sky-700 shadow-sky-500/20';

      if (pt.kind === 'shade') {
        iconSymbol = '⛱️';
        ringColor = 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-emerald-500/20';
      } else if (pt.kind === 'rest') {
        iconSymbol = '🛋️';
        ringColor = 'border-amber-500 bg-amber-50 text-amber-700 shadow-amber-500/20';
      } else if (pt.kind === 'fuel') {
        iconSymbol = '⛽';
        ringColor = 'border-violet-500 bg-violet-50 text-violet-700 shadow-violet-500/20';
      }

      const customIcon = L.divIcon({
        className: 'custom-point-marker',
        html: `
          <div class="relative cursor-pointer transition-transform hover:scale-125 ${isTarget ? 'scale-125 animate-bounce' : ''}">
            <div class="w-9 h-9 rounded-full border-2 ${ringColor} flex items-center justify-center text-sm shadow-md">
              <span>${iconSymbol}</span>
            </div>
            ${pt.verified ? `
              <div class="absolute -top-1 -right-1 w-4 h-4 bg-emerald-600 rounded-full border-2 border-white flex items-center justify-center text-[8px] text-white font-bold" title="Verified by ${pt.verifiedByCount} riders">
                ✓
              </div>
            ` : ''}
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([pt.lat, pt.lon], { icon: customIcon });

      marker.on('click', () => {
        if (onPointSelect) onPointSelect(pt);
      });

      const googleMapsNavUrl = `https://www.google.com/maps/dir/?api=1&destination=${pt.lat},${pt.lon}&travelmode=two_wheeler`;

      marker.bindPopup(`
        <div class="p-3 max-w-[240px] bg-white text-slate-800 rounded-3xl shadow-2xl font-sans border border-slate-100">
          <div class="text-[10px] font-black text-amber-600 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>${pt.kind.toUpperCase()} SPOT</span>
            <span class="text-slate-400 font-normal">${pt.verified ? `✓ ${pt.verifiedByCount} Verified` : 'Community'}</span>
          </div>
          <div class="font-extrabold text-sm text-slate-900 leading-snug mb-1">${pt.name}</div>
          ${pt.notes ? `<div class="text-xs text-slate-600 mb-2 leading-relaxed bg-slate-50 p-2 rounded-2xl">${pt.notes}</div>` : ''}
          <a href="${googleMapsNavUrl}" target="_blank" rel="noopener noreferrer" class="block w-full text-center py-2 px-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-extrabold text-xs rounded-2xl shadow-md transition">
            🧭 Open in Google Maps
          </a>
        </div>
      `);

      marker.addTo(pointsLayerGroupRef.current!);
    });
  }, [points, targetPoint, onPointSelect]);

  // Rider Marker & Trail
  useEffect(() => {
    if (!riderLayerGroupRef.current || !routeLayerGroupRef.current) return;
    riderLayerGroupRef.current.clearLayers();
    routeLayerGroupRef.current.clearLayers();

    if (!currentPing) return;

    if (pingHistory.length > 1) {
      const latlngs = pingHistory.map(p => [p.lat, p.lon] as [number, number]);
      const polyline = L.polyline(latlngs, {
        color: '#F97316',
        weight: 4,
        opacity: 0.9,
      });
      polyline.addTo(routeLayerGroupRef.current);
    }

    if (targetPoint) {
      const guideLine = L.polyline(
        [
          [currentPing.lat, currentPing.lon],
          [targetPoint.lat, targetPoint.lon],
        ],
        {
          color: '#0284C7',
          weight: 3,
          dashArray: '6, 6',
        }
      );
      guideLine.addTo(routeLayerGroupRef.current);
    }

    const riderIcon = L.divIcon({
      className: 'rider-position-marker',
      html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-12 h-12 bg-amber-400/30 rounded-full animate-ping"></div>
          <div class="w-10 h-10 rounded-full bg-white border-2 border-amber-500 flex items-center justify-center shadow-xl">
            <div class="text-base transform" style="transform: rotate(${currentPing.heading || 0}deg);">
              🛵
            </div>
          </div>
          <div class="absolute -bottom-5 px-2 py-0.5 bg-white text-amber-800 text-[10px] font-mono font-black rounded-full border border-amber-200 shadow-md whitespace-nowrap">
            ${currentPing.speedKmh > 0 ? `${currentPing.speedKmh} km/h` : 'WAITING'}
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    const riderMarker = L.marker([currentPing.lat, currentPing.lon], { icon: riderIcon });
    riderMarker.addTo(riderLayerGroupRef.current);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo([currentPing.lat, currentPing.lon], { animate: true, duration: 0.5 });
    }
  }, [currentPing, pingHistory, targetPoint]);

  const handleCenterOnRider = () => {
    if (mapInstanceRef.current && currentPing) {
      mapInstanceRef.current.setView([currentPing.lat, currentPing.lon], 15);
    }
  };

  return (
    <div className="relative w-full h-full min-h-[380px] bg-amber-50/20 overflow-hidden">
      {/* Real Map Tiles Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0 min-h-[380px]" />

      {/* Smooth Canvas Thermal Radar Overlay (60fps Gaussian thermal blend) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-[400] w-full h-full transition-opacity duration-300"
        style={{ mixBlendMode: 'multiply', opacity: 0.85 }}
      />

      {/* Floating Modern Map Controls (Right Top) */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2 pointer-events-auto">
        <button
          onClick={handleCenterOnRider}
          className="w-10 h-10 rounded-2xl bg-white/95 hover:bg-white text-slate-700 border border-amber-200/80 flex items-center justify-center shadow-lg transition active:scale-95 text-base"
          title="Center on Rider Location"
        >
          🎯
        </button>

        {/* Cycle Tile Layers: Voyager HD / Satellite / OpenStreetMap */}
        <button
          onClick={() => {
            const nextMap: Record<MapStyleType, MapStyleType> = {
              voyager: 'satellite',
              satellite: 'osm',
              osm: 'voyager',
            };
            setMapStyle(nextMap[mapStyle]);
          }}
          className="w-10 h-10 rounded-2xl bg-white/95 hover:bg-white text-slate-700 border border-amber-200/80 flex items-center justify-center shadow-lg transition text-base active:scale-95"
          title={`Map Layer: ${mapStyle.toUpperCase()} (Tap to switch satellite/streets)`}
        >
          {mapStyle === 'satellite' ? '🛰️' : mapStyle === 'osm' ? '🌐' : '🗺️'}
        </button>
      </div>

      {/* Real Map Layer Active Badge (Top Left) */}
      <div className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur-md px-3 py-1 rounded-full border border-amber-200 shadow-md text-[10px] text-slate-700 font-extrabold flex items-center gap-1.5 pointer-events-auto">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>
          {mapStyle === 'voyager'
            ? 'VOYAGER HD STREETS · ACTIVE'
            : mapStyle === 'satellite'
            ? 'ESRI SATELLITE · ACTIVE'
            : 'OPENSTREETMAP · ACTIVE'}
        </span>
      </div>

      {/* Interactive Thermal Inspector HUD Card (Pops up when driver taps anywhere on map) */}
      {selectedCell && (
        <div className="absolute top-14 left-3 right-3 z-[1200] bg-white/98 backdrop-blur-xl border-2 border-amber-300 rounded-[28px] p-4 shadow-2xl text-slate-800 space-y-2.5 animate-in slide-in-from-top duration-200 pointer-events-auto max-w-sm mx-auto">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">
                {selectedCell.band === 'red' ? '🔥' : selectedCell.band === 'yellow' ? '☀️' : '🌿'}
              </span>
              <div>
                <div className="text-[10px] uppercase font-black tracking-wider text-slate-400">
                  Micro-Climate Thermal Scan
                </div>
                <div className="font-black text-sm text-slate-900">
                  {selectedCell.band === 'red'
                    ? 'Extreme Thermal Radiation Zone'
                    : selectedCell.band === 'yellow'
                    ? 'High Solar Caution Zone'
                    : 'Cool Shaded Micro-Zone'}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedCell(null);
                setInspectCoords(null);
              }}
              className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-xs"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-2">
              <div className="text-[9px] font-bold text-rose-700 uppercase">WBGT Index</div>
              <div className="text-base font-black font-mono text-rose-800">{selectedCell.wbgtC}°C</div>
              <div className="text-[8px] text-rose-600 font-semibold uppercase">{selectedCell.band} RISK</div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-2">
              <div className="text-[9px] font-bold text-amber-700 uppercase">Road Asphalt</div>
              <div className="text-base font-black font-mono text-amber-800">
                {(selectedCell.tempC + 7.5).toFixed(1)}°C
              </div>
              <div className="text-[8px] text-amber-600 font-semibold">TARMAC HEAT</div>
            </div>

            <div className="bg-sky-50 border border-sky-200 rounded-2xl p-2">
              <div className="text-[9px] font-bold text-sky-700 uppercase">Air & Humidity</div>
              <div className="text-base font-black font-mono text-sky-800">{selectedCell.tempC}°C</div>
              <div className="text-[8px] text-sky-600 font-semibold">{selectedCell.rh}% RH</div>
            </div>
          </div>

          {/* Rapido Surcharge Bonus Tag in this Zone */}
          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-2xl px-3 py-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span>💰</span>
              <span className="font-extrabold text-emerald-900">Rapido Heat Hazard Pay:</span>
            </div>
            <span className="font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[11px]">
              {selectedCell.band === 'red' ? '+₹25/trip Active' : selectedCell.band === 'yellow' ? '+₹15/trip' : 'Standard'}
            </span>
          </div>

          {/* Quick Action: Report or Add Shade Point here */}
          <div className="flex items-center gap-2 pt-0.5">
            {onAddPointClick && inspectCoords && (
              <button
                onClick={() => {
                  onAddPointClick(inspectCoords.lat, inspectCoords.lon);
                  setSelectedCell(null);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold text-xs shadow-md active:scale-95 transition text-center"
              >
                + Add Water / Shade Spot Here
              </button>
            )}
            <button
              onClick={() => {
                const shade = points.find(p => p.kind === 'shade');
                if (shade && onPointSelect) onPointSelect(shade);
                setSelectedCell(null);
              }}
              className="py-2 px-3 rounded-xl bg-slate-100 text-slate-700 font-extrabold text-xs hover:bg-slate-200 active:scale-95 transition"
            >
              Find Nearest Shade
            </button>
          </div>
        </div>
      )}

      {/* Floating Heatmap Mode Switcher Bar (Bottom Center) */}
      <div className="absolute bottom-3 left-3 right-3 z-[1000] flex items-center justify-between gap-1 bg-white/95 backdrop-blur-xl p-1.5 rounded-3xl border border-amber-200 shadow-xl pointer-events-auto">
        <button
          onClick={() => setHeatmapMode('radar')}
          className={`flex-1 py-1.5 px-2 rounded-2xl text-[11px] font-black transition flex items-center justify-center gap-1 ${
            heatmapMode === 'radar'
              ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>🔥</span>
          <span>Thermal Radar</span>
        </button>

        <button
          onClick={() => setHeatmapMode('surge')}
          className={`flex-1 py-1.5 px-2 rounded-2xl text-[11px] font-black transition flex items-center justify-center gap-1 ${
            heatmapMode === 'surge'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>⚡</span>
          <span>+₹25 Surge</span>
        </button>

        <button
          onClick={() => setHeatmapMode('shade')}
          className={`flex-1 py-1.5 px-2 rounded-2xl text-[11px] font-black transition flex items-center justify-center gap-1 ${
            heatmapMode === 'shade'
              ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>🌳</span>
          <span>Shade Oasis</span>
        </button>

        <button
          onClick={() => setHeatmapMode('grid')}
          className={`py-1.5 px-2.5 rounded-2xl text-[11px] font-black transition flex items-center justify-center gap-1 ${
            heatmapMode === 'grid'
              ? 'bg-slate-800 text-white shadow-md'
              : 'text-slate-500 hover:bg-slate-100'
          }`}
          title="WBGT Sensor Micro-Grid"
        >
          <span>🔲</span>
          <span className="hidden sm:inline">Sensors</span>
        </button>
      </div>
    </div>
  );
};
