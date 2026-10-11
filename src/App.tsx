/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  GridCell,
  RestPoint,
  RiderProfile,
  ShiftPing,
  ShiftState,
  VehicleType,
  VoiceNudge,
} from './types';
import { SUPPORTED_CITIES, SEED_REST_POINTS, DEMO_TRACE } from './data/cities';
import { generateCityHeatGrid, generateHeatGridAroundCoord, generateLocalRestPoints, getThreeHourForecast } from './utils/grid';
import { calculateBearing, calculateDistanceMeters, computeCellId, getAngleDiff } from './utils/wbgt';
import { playChime, speakWithPollyVoice, unlockAudioContext } from './utils/audio';

import { MapComponent } from './components/MapComponent';
import { GoogleMapComponent } from './components/GoogleMapComponent';
import { Gauge } from './components/Gauge';
import { NudgeBanner } from './components/NudgeBanner';
import { UnwellModal } from './components/UnwellModal';
import { ShiftSummaryModal } from './components/ShiftSummaryModal';
import { AddPointModal } from './components/AddPointModal';
import { TracePlayerControls } from './components/TracePlayerControls';
import { PlatformPanel } from './components/PlatformPanel';
import { AwsArchitectureModal } from './components/AwsArchitectureModal';

type MobileTab = 'map' | 'cockpit' | 'points' | 'duty' | 'platform';
type CaptainDutyStatus = 'idle_waiting' | 'on_trip' | 'break';

export default function App() {
  const [activeTab, setActiveTab] = useState<MobileTab>('map');
  
  // Map Engine & API Key: default to 'leaflet' (Voyager HD) for 100% reliable real street maps with zero blockers
  const [mapEngine, setMapEngine] = useState<'leaflet' | 'google'>('leaflet');
  const [apiKeyInput, setApiKeyInput] = useState<string>(
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  );
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [googleMapError, setGoogleMapError] = useState<string | null>(null);

  // UI Drawers & Desktop Mode
  const [showForecastDrawer, setShowForecastDrawer] = useState(false);
  const [showAwsModal, setShowAwsModal] = useState(false);
  const [viewMode, setViewMode] = useState<'phone' | 'wide'>('phone');

  // Rider & Captain Duty Real-World Features
  const [captainStatus, setCaptainStatus] = useState<CaptainDutyStatus>('idle_waiting');
  const [idleWaitingMinutes, setIdleWaitingMinutes] = useState(6);
  const [hazardSurgeEarnings, setHazardSurgeEarnings] = useState(125);
  const [waterLoggedMl, setWaterLoggedMl] = useState(750);
  const [gpsMode, setGpsMode] = useState<'trace' | 'real_gps'>('trace');
  const [gpsActive, setGpsActive] = useState(false);
  const [isGpsLocating, setIsGpsLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [userGpsCoords, setUserGpsCoords] = useState<{ lat: number; lon: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Rider Profile
  const [profile, setProfile] = useState<RiderProfile>(() => {
    const saved = localStorage.getItem('suraksha_rider_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn(e);
      }
    }
    return {
      riderId: 'RP-9421',
      lang: 'en',
      vehicle: 'bike',
      city: 'hyderabad',
      createdAt: new Date().toISOString(),
    };
  });

  const currentCity = SUPPORTED_CITIES.find(c => c.id === profile.city) || SUPPORTED_CITIES[0];

  // Weather & Grid
  const [isReplayMode, setIsReplayMode] = useState(true);
  const [heatGrid, setHeatGrid] = useState<GridCell[]>([]);
  const [points, setPoints] = useState<RestPoint[]>([]);

  // Shift State
  const [shiftState, setShiftState] = useState<ShiftState>({
    riderId: profile.riderId,
    shiftId: '',
    status: 'idle',
    startTime: 0,
    dose: 0,
    redMin: 0,
    yellowMin: 0,
    greenMin: 0,
    breakCount: 0,
    replayMode: true,
    replayDate: '2025-05-17',
    pings: [],
  });

  // UI Dialogs
  const [activeNudge, setActiveNudge] = useState<VoiceNudge | null>(null);
  const [showUnwellModal, setShowUnwellModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [addPointCoords, setAddPointCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [targetPoint, setTargetPoint] = useState<RestPoint | null>(null);

  // Trace player simulation state
  const [traceIndex, setTraceIndex] = useState(0);
  const [isTracePlaying, setIsTracePlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(5);
  const traceTimerRef = useRef<number | null>(null);

  // Initialize City Grid and Points
  useEffect(() => {
    const grid = generateCityHeatGrid(currentCity, isReplayMode);
    setHeatGrid(grid);

    const cityPoints = SEED_REST_POINTS[currentCity.id] || SEED_REST_POINTS.hyderabad;
    setPoints(cityPoints);
  }, [currentCity, isReplayMode]);

  useEffect(() => {
    localStorage.setItem('suraksha_rider_profile', JSON.stringify(profile));
  }, [profile]);

  // Real GPS Geolocation Watcher
  useEffect(() => {
    if (gpsMode === 'real_gps' && 'geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const speedKmh = pos.coords.speed
            ? Math.round(pos.coords.speed * 3.6)
            : captainStatus === 'idle_waiting'
            ? 0
            : 24;
          const heading = pos.coords.heading || 0;
          setGpsActive(true);
          setUserGpsCoords({ lat, lon });
          processPing(lat, lon, speedKmh, heading, captainStatus === 'idle_waiting');
        },
        (err) => {
          console.warn('Real GPS Error / fallback:', err.message);
        },
        { enableHighAccuracy: true, maximumAge: 4000, timeout: 10000 }
      );
    } else if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [gpsMode, captainStatus]);

  // Idle waiting minutes counter
  useEffect(() => {
    if (captainStatus === 'idle_waiting' && shiftState.status === 'active') {
      const interval = setInterval(() => {
        setIdleWaitingMinutes(m => m + 1);
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [captainStatus, shiftState.status]);

  // Trace Simulation Timer
  useEffect(() => {
    if (isTracePlaying && shiftState.status === 'active' && gpsMode === 'trace') {
      const intervalMs = Math.max(200, 1000 / playbackSpeed);
      traceTimerRef.current = window.setInterval(() => {
        setTraceIndex((prev) => {
          const next = prev + 1;
          if (next >= DEMO_TRACE.length) {
            setIsTracePlaying(false);
            return prev;
          }
          const pt = DEMO_TRACE[next];
          processPing(pt.lat, pt.lon, pt.speedKmh, pt.heading, captainStatus === 'idle_waiting');
          return next;
        });
      }, intervalMs);
    } else if (traceTimerRef.current) {
      clearInterval(traceTimerRef.current);
      traceTimerRef.current = null;
    }

    return () => {
      if (traceTimerRef.current) clearInterval(traceTimerRef.current);
    };
  }, [isTracePlaying, playbackSpeed, shiftState.status, gpsMode, captainStatus]);

  // Core Heat Dose & Ping Processing
  const processPing = (
    lat: number,
    lon: number,
    speedKmh: number,
    heading: number,
    isIdleWaiting: boolean
  ) => {
    const cellId = computeCellId(lat, lon);
    let cell = heatGrid.find(c => c.cellId === cellId);
    if (!cell && heatGrid.length > 0) {
      let minDist = Infinity;
      for (const c of heatGrid) {
        const d = Math.hypot(c.lat - lat, c.lon - lon);
        if (d < minDist) {
          minDist = d;
          cell = c;
        }
      }
    }
    const band = cell ? cell.band : isReplayMode ? 'red' : 'yellow';
    const wbgt = cell ? cell.wbgtC : isReplayMode ? 32.5 : 29.0;
    const tempC = cell ? cell.tempC : isReplayMode ? 43.4 : 32.0;

    let doseIncrement = 0;
    if (band === 'green') doseIncrement = 0.05;
    else if (band === 'yellow') doseIncrement = 0.5;
    else if (band === 'red') doseIncrement = 1.0;

    // Bicycle riders incur 1.3x dose
    if (profile.vehicle === 'bicycle') doseIncrement *= 1.3;

    // Idle standing in sun adds 1.2x dose multiplier
    if (isIdleWaiting) doseIncrement *= 1.2;

    const newPing: ShiftPing = {
      shiftId: shiftState.shiftId || 'SH-DEMO',
      ts: Date.now(),
      lat,
      lon,
      speedKmh,
      heading,
      accuracyM: 8,
      wbgtC: wbgt,
      band,
      dose: shiftState.dose + doseIncrement,
    };

    setShiftState((prev) => {
      const newDose = prev.dose + doseIncrement;
      let newRed = prev.redMin;
      let newYellow = prev.yellowMin;
      let newGreen = prev.greenMin;

      if (band === 'red') newRed += 1;
      else if (band === 'yellow') newYellow += 1;
      else newGreen += 1;

      // Auto-detect break if stationary near a rest spot
      let breakCount = prev.breakCount;
      const nearestPt = points.find(p => calculateDistanceMeters(lat, lon, p.lat, p.lon) < 65);
      if (speedKmh <= 2 && nearestPt && prev.lastPing && prev.lastPing.speedKmh <= 2) {
        if (!prev.pings.some(p => p.ts > Date.now() - 120000 && p.speedKmh <= 2)) {
          breakCount += 1;
          triggerBreakLoggedNudge(nearestPt);
        }
      }

      return {
        ...prev,
        dose: newDose,
        redMin: newRed,
        yellowMin: newYellow,
        greenMin: newGreen,
        breakCount,
        lastPing: newPing,
        pings: [...prev.pings.slice(-150), newPing],
      };
    });

    evaluateVoiceNudges(lat, lon, speedKmh, heading, isIdleWaiting, wbgt);
  };

  const triggerBreakLoggedNudge = (spot: RestPoint) => {
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
    playChime('success');

    const msgEn = `Break logged at ${spot.name}. Good job staying hydrated!`;
    const msgHi = `${spot.name} पर ब्रेक दर्ज किया गया। पानी पीकर तरोताजा रहें।`;
    speakWithPollyVoice(profile.lang === 'hi' ? msgHi : msgEn, profile.lang === 'hi' ? 'hi' : 'en');

    setActiveNudge({
      id: 'break_logged_' + Date.now(),
      type: 'break-logged',
      severity: 'success',
      title: 'Break Logged · 0 Income Lost',
      titleHi: 'ब्रेक दर्ज · शून्य कमाई नुकसान',
      messageEn: msgEn,
      messageHi: msgHi,
      pointId: spot.id,
      pointName: spot.name,
      distanceM: 0,
      timestamp: Date.now(),
    });
  };

  // Real GPS acquisition and dynamic local heatmap calibration
  const handleRequestGps = () => {
    if (!('geolocation' in navigator)) {
      setGpsError('Geolocation is not supported by your browser');
      return;
    }

    setIsGpsLocating(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const speedKmh = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0;
        const heading = pos.coords.heading || 0;

        setUserGpsCoords({ lat, lon });
        setGpsActive(true);
        setIsGpsLocating(false);
        setGpsMode('real_gps');
        setIsTracePlaying(false);

        // Dynamically calibrate heat grid centered directly at user's real GPS location!
        const localHeatGrid = generateHeatGridAroundCoord(lat, lon, isReplayMode);
        setHeatGrid(localHeatGrid);

        // Generate local hydration & shade points if none within 8km
        const hasNearby = points.some(p => calculateDistanceMeters(lat, lon, p.lat, p.lon) < 8000);
        if (!hasNearby) {
          const localPoints = generateLocalRestPoints(lat, lon);
          setPoints(localPoints);
        }

        // Process ping to position rider marker and calculate heat metrics
        processPing(lat, lon, speedKmh, heading, captainStatus === 'idle_waiting');

        // Fetch live micro-weather from Open-Meteo for exact lat/lon
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m`)
          .then(res => res.json())
          .then(data => {
            if (data?.current?.temperature_2m !== undefined) {
              const liveTemp = Number(data.current.temperature_2m.toFixed(1));
              const liveRh = Math.round(data.current.relative_humidity_2m || 45);
              const liveWind = Number((data.current.wind_speed_10m || 2.5).toFixed(1));
              const calibratedGrid = generateHeatGridAroundCoord(lat, lon, isReplayMode, {
                tempC: liveTemp,
                rh: liveRh,
                windMs: liveWind,
              });
              setHeatGrid(calibratedGrid);
            }
          })
          .catch(e => console.warn('Live meteo sync notice:', e));
      },
      (err) => {
        console.warn('Geolocation acquisition error:', err);
        setIsGpsLocating(false);
        let errorMsg = 'Could not acquire GPS';
        if (err.code === 1) errorMsg = 'Location permission denied by browser';
        else if (err.code === 2) errorMsg = 'Position unavailable';
        else if (err.code === 3) errorMsg = 'GPS request timed out';
        setGpsError(errorMsg);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // Check if browser already has geolocation permission granted and auto-sync
  useEffect(() => {
    if ('permissions' in navigator && navigator.permissions?.query) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((res) => {
        if (res.state === 'granted') {
          handleRequestGps();
        }
      }).catch(() => {
        // Ignore permission query error
      });
    }
  }, []);

  // Evaluate Voice Nudges
  const evaluateVoiceNudges = (
    lat: number,
    lon: number,
    speedKmh: number,
    heading: number,
    isIdleWaiting: boolean,
    wbgt: number
  ) => {
    if (activeNudge && Date.now() - activeNudge.timestamp < 18000) return;

    // 1. Critical dose warning
    if (shiftState.dose >= 100) {
      const nearestSafe = points[0];
      const dist = nearestSafe ? Math.round(calculateDistanceMeters(lat, lon, nearestSafe.lat, nearestSafe.lon)) : 150;
      const msgEn = `Critical heat exposure! Take a 10-minute rest at ${nearestSafe?.name || 'nearest shaded spot'}.`;
      const msgHi = `गंभीर गर्मी का जोखिम! ${nearestSafe?.name || 'छायादार जगह'} पर 10 मिनट आराम करें।`;

      speakWithPollyVoice(profile.lang === 'hi' ? msgHi : msgEn, profile.lang === 'hi' ? 'hi' : 'en');
      playChime('critical');

      setActiveNudge({
        id: 'critical_dose_' + Date.now(),
        type: 'critical',
        severity: 'critical',
        title: 'Critical Heat Alert · Stop Now',
        titleHi: 'गंभीर गर्मी चेतावनी · तुरंत रुकें',
        messageEn: msgEn,
        messageHi: msgHi,
        pointId: nearestSafe?.id,
        pointName: nearestSafe?.name,
        distanceM: dist,
        timestamp: Date.now(),
      });
      return;
    }

    // 2. Idle Waiting Nudge for Rider / Captain
    if (isIdleWaiting && idleWaitingMinutes >= 5 && wbgt >= 31) {
      const shadePoint = points.find(p => p.kind === 'shade' || p.kind === 'rest') || points[0];
      const dist = shadePoint ? Math.round(calculateDistanceMeters(lat, lon, shadePoint.lat, shadePoint.lon)) : 120;
      const msgEn = `Captain, you have been waiting in direct sun for ${idleWaitingMinutes} minutes. Move to shade at ${shadePoint?.name || 'nearby spot'}.`;
      const msgHi = `कैप्टन, आप ${idleWaitingMinutes} मिनट से सीधी धूप में खड़े हैं। ${shadePoint?.name || 'पास की छांव'} में आ जाएं।`;

      speakWithPollyVoice(profile.lang === 'hi' ? msgHi : msgEn, profile.lang === 'hi' ? 'hi' : 'en');
      playChime('warning');

      setActiveNudge({
        id: 'idle_sun_' + Date.now(),
        type: 'idle',
        severity: 'warning',
        title: 'Waiting in Direct Sun · Move to Shade',
        titleHi: 'सीधी धूप में प्रतीक्षा · छांव में जाएं',
        messageEn: msgEn,
        messageHi: msgHi,
        pointId: shadePoint?.id,
        pointName: shadePoint?.name,
        distanceM: dist,
        timestamp: Date.now(),
      });
      return;
    }

    // 3. On-route water dispenser ahead
    for (const pt of points) {
      if (pt.kind === 'water') {
        const dist = calculateDistanceMeters(lat, lon, pt.lat, pt.lon);
        if (dist > 60 && dist < 350) {
          const bearing = calculateBearing(lat, lon, pt.lat, pt.lon);
          const diff = getAngleDiff(heading, bearing);
          if (diff < 45 || speedKmh < 8) {
            const distM = Math.round(dist);
            const msgEn = `Free drinking water ahead in ${distM} meters on your road at ${pt.name}.`;
            const msgHi = `आपकी सड़क पर ${distM} मीटर आगे ${pt.name} पर मुफ्त ठंडा पानी उपलब्ध है।`;

            speakWithPollyVoice(profile.lang === 'hi' ? msgHi : msgEn, profile.lang === 'hi' ? 'hi' : 'en');
            playChime('info');

            setActiveNudge({
              id: 'onroute_' + pt.id,
              type: 'on-route',
              severity: 'info',
              title: `Free Water Ahead (${distM}m)`,
              titleHi: `आगे पीने का पानी (${distM} मी)`,
              messageEn: msgEn,
              messageHi: msgHi,
              pointId: pt.id,
              pointName: pt.name,
              distanceM: distM,
              timestamp: Date.now(),
            });
            break;
          }
        }
      }
    }
  };

  // Shift Controls
  const handleStartShift = () => {
    unlockAudioContext();
    playChime('info');

    const msgEn = `Shift started in ${currentCity.name.split(' ')[0]}. Stay safe in the heat. Voice alerts active.`;
    const msgHi = `${currentCity.nameHi || currentCity.name} में शिफ्ट शुरू हुई। गर्मी से सुरक्षित रहें।`;
    speakWithPollyVoice(profile.lang === 'hi' ? msgHi : msgEn, profile.lang === 'hi' ? 'hi' : 'en');

    const startPt = DEMO_TRACE[0];
    setShiftState({
      riderId: profile.riderId,
      shiftId: 'SH-' + Date.now().toString().slice(-5),
      status: 'active',
      startTime: Date.now(),
      dose: 0,
      redMin: 0,
      yellowMin: 0,
      greenMin: 0,
      breakCount: 0,
      replayMode: isReplayMode,
      replayDate: '2025-05-17',
      pings: [],
    });

    setTraceIndex(0);
    processPing(startPt.lat, startPt.lon, startPt.speedKmh, startPt.heading, captainStatus === 'idle_waiting');
  };

  const handleEndShift = () => {
    setIsTracePlaying(false);
    playChime('info');
    setShiftState(s => ({ ...s, status: 'ended', endTime: Date.now() }));
    setShowSummaryModal(true);
  };

  const handleJumpToMilestone = (idx: number) => {
    setTraceIndex(idx);
    const pt = DEMO_TRACE[idx];
    processPing(pt.lat, pt.lon, pt.speedKmh, pt.heading, false);
  };

  const handleResetTrace = () => {
    setIsTracePlaying(false);
    setTraceIndex(0);
    setShiftState(s => ({ ...s, dose: 0, pings: [] }));
    const pt = DEMO_TRACE[0];
    processPing(pt.lat, pt.lon, pt.speedKmh, pt.heading, false);
  };

  const handleUnwellTrigger = () => {
    unlockAudioContext();
    setShowUnwellModal(true);
    playChime('critical');

    const msgEn = 'Rest in shade, drink water, and call for help if you feel worse.';
    const msgHi = 'छांव में आराम करें, पानी पिएं, और तबीयत बिगड़ने पर मदद मांगें।';
    speakWithPollyVoice(profile.lang === 'hi' ? msgHi : msgEn, profile.lang === 'hi' ? 'hi' : 'en');

    const nearestPt = points[0];
    setActiveNudge({
      id: 'nudge_unwell',
      type: 'critical',
      severity: 'critical',
      title: 'Emergency Medical Standby Active',
      titleHi: 'आपातकालीन सहायता सक्रिय',
      messageEn: msgEn,
      messageHi: msgHi,
      pointId: nearestPt?.id,
      pointName: nearestPt?.name,
      distanceM: 140,
      timestamp: Date.now(),
    });
  };

  const handleAddCrowdsourcedPoint = (newPt: RestPoint) => {
    setPoints(prev => [newPt, ...prev]);
    confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
    playChime('success');
  };

  const logWaterIntake = () => {
    setWaterLoggedMl(w => w + 250);
    confetti({ particleCount: 20, spread: 40, origin: { y: 0.8 } });
    playChime('success');
  };

  const forecastHours = getThreeHourForecast(currentCity, isReplayMode);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100/50 via-orange-50/30 to-emerald-50/40 flex flex-col justify-center items-center font-sans antialiased selection:bg-amber-500 selection:text-white">
      
      {/* View Mode Toggle Bar (Visible on desktop) */}
      <div className="hidden sm:flex items-center gap-3 py-2 px-4 mb-1">
        <span className="text-xs font-bold text-amber-900/70">Bharat Builds 2026 · Heat & Water Track</span>
        <div className="flex items-center bg-white/80 backdrop-blur rounded-full p-1 border border-amber-200/60 shadow-sm text-xs font-bold">
          <button
            onClick={() => setViewMode('phone')}
            className={`px-3 py-1 rounded-full transition ${
              viewMode === 'phone'
                ? 'bg-amber-500 text-white shadow'
                : 'text-amber-800 hover:text-amber-950'
            }`}
          >
            📱 Mobile Rider Screen
          </button>
          <button
            onClick={() => setViewMode('wide')}
            className={`px-3 py-1 rounded-full transition ${
              viewMode === 'wide'
                ? 'bg-amber-500 text-white shadow'
                : 'text-amber-800 hover:text-amber-950'
            }`}
          >
            🖥️ Expanded Cockpit
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MOBILE APPLICATION CHASSIS (FITS SMARTPHONE OR EXPANDED DESKTOP) */}
      {/* ============================================================== */}
      <div
        className={`w-full bg-white text-slate-800 flex flex-col relative overflow-hidden transition-all duration-300 ${
          viewMode === 'phone'
            ? 'max-w-md min-h-screen sm:min-h-[850px] sm:max-h-[920px] sm:rounded-[44px] sm:border-[6px] sm:border-amber-300/50 sm:shadow-2xl sm:shadow-orange-500/15 sm:my-3'
            : 'max-w-5xl min-h-screen sm:min-h-[850px] sm:rounded-[36px] sm:border-4 sm:border-amber-200 sm:shadow-2xl sm:my-4'
        }`}
      >
        {/* Dynamic Island / Smartphone Top Bezel */}
        <div className="hidden sm:flex items-center justify-center pt-2 pb-0.5 bg-white select-none">
          <div className="w-24 h-4 bg-amber-950/10 rounded-full flex items-center justify-center">
            <div className="w-3 h-3 bg-amber-900/20 rounded-full" />
          </div>
        </div>

        {/* Mobile App Header */}
        <header className="bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-[1500] shadow-md shadow-amber-500/10 select-none">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white text-amber-700 font-black text-sm flex items-center justify-center shadow-md">
              🛵
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base tracking-tight text-white drop-shadow-sm">SurakshaRide</span>
                <span className="text-[10px] bg-white/25 text-white font-black px-2 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-xs">
                  FLEET CAPTAIN
                </span>
              </div>
              <div className="text-[11px] text-amber-100 font-semibold flex items-center gap-1.5">
                <span>{currentCity.name.split(' ')[0]}</span>
                <span>•</span>
                <span className="font-mono font-bold">{isReplayMode ? '🔥 43.4°C May Wave' : '☀️ 32°C Live'}</span>
              </div>
            </div>
          </div>

          {/* Quick city and speech controls */}
          <div className="flex items-center gap-2">
            <select
              value={profile.city}
              onChange={e => setProfile({ ...profile, city: e.target.value })}
              className="bg-white/20 text-white font-bold text-xs rounded-full px-2.5 py-1.5 focus:outline-none border border-white/30 backdrop-blur-sm cursor-pointer"
            >
              {SUPPORTED_CITIES.map(c => (
                <option key={c.id} value={c.id} className="text-slate-900">
                  {c.name.split(' ')[0]}
                </option>
              ))}
            </select>

            <button
              onClick={() => setProfile({ ...profile, lang: profile.lang === 'en' ? 'hi' : 'en' })}
              className="px-2.5 py-1.5 rounded-full bg-white text-amber-700 text-xs font-black shadow-sm hover:bg-amber-50 transition active:scale-95"
              title="Toggle English / Hindi speech"
            >
              {profile.lang === 'en' ? 'EN' : 'हिंदी'}
            </button>

            <button
              onClick={() => setShowApiKeyModal(true)}
              className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs border border-white/30 transition"
              title="Google Maps API Key & Map Settings"
            >
              🗺️
            </button>
          </div>
        </header>

        {/* ------------------------------------------------------------- */}
        {/* Main Viewport Content                                        */}
        {/* ------------------------------------------------------------- */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-50/50">
          
          {/* TAB 1: REAL INTERACTIVE MAP */}
          <div className={activeTab === 'map' ? 'flex-1 flex flex-col relative w-full h-full' : 'hidden'}>
            <div className="flex-1 relative w-full h-full min-h-[380px]">
              {mapEngine === 'google' ? (
                <GoogleMapComponent
                  city={currentCity}
                  heatGrid={heatGrid}
                  points={points}
                  currentPing={shiftState.lastPing}
                  pingHistory={shiftState.pings}
                  apiKey={apiKeyInput}
                  onAddPointClick={(lat, lon) => setAddPointCoords({ lat, lon })}
                  onPointSelect={pt => setTargetPoint(pt)}
                  targetPoint={targetPoint}
                  onSwitchToLeaflet={() => setMapEngine('leaflet')}
                  onError={(err) => {
                    console.warn('Google Map error notice:', err);
                    setGoogleMapError(err);
                  }}
                  onRequestGps={handleRequestGps}
                />
              ) : (
                <MapComponent
                  city={currentCity}
                  heatGrid={heatGrid}
                  points={points}
                  currentPing={shiftState.lastPing}
                  pingHistory={shiftState.pings}
                  onAddPointClick={(lat, lon) => setAddPointCoords({ lat, lon })}
                  onPointSelect={pt => setTargetPoint(pt)}
                  targetPoint={targetPoint}
                  isVisible={activeTab === 'map'}
                  onRequestGps={handleRequestGps}
                  isGpsLocating={isGpsLocating}
                  gpsActive={gpsActive}
                  gpsError={gpsError}
                />
              )}

              {/* Navigation Guide Strip */}
              {targetPoint && (
                <div className="absolute top-3 left-3 right-3 z-[1100] bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-3xl p-3 shadow-xl flex items-center justify-between animate-in slide-in-from-top">
                  <div className="flex items-center gap-2.5 text-xs truncate">
                    <span className="text-xl">🧭</span>
                    <div className="truncate">
                      <div className="text-[10px] text-sky-100 font-extrabold uppercase">Navigating to</div>
                      <div className="font-black text-sm truncate">{targetPoint.name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 ml-2">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${targetPoint.lat},${targetPoint.lon}&travelmode=two_wheeler`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs bg-white text-blue-800 font-black px-3 py-1.5 rounded-full shadow hover:bg-sky-50 transition active:scale-95"
                    >
                      Turn-by-Turn
                    </a>
                    <button
                      onClick={() => setTargetPoint(null)}
                      className="text-white/80 hover:text-white px-2 py-1 rounded-full bg-white/20 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {/* Floating Quick Action Chips for Drivers */}
              <div className="absolute top-3 left-3 z-[1000] flex flex-wrap gap-1.5 pointer-events-auto">
                {/* 1-Tap Real GPS Lock Chip */}
                <button
                  onClick={handleRequestGps}
                  className={`py-1.5 px-3 rounded-full text-xs font-black shadow-md flex items-center gap-1.5 transition active:scale-95 ${
                    gpsActive
                      ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-sky-500/30'
                      : isGpsLocating
                      ? 'bg-amber-500 text-white animate-pulse'
                      : 'bg-white/95 text-sky-800 border border-sky-300 hover:bg-sky-50'
                  }`}
                  title="Lock My Real GPS & Generate Local Heatmap"
                >
                  <span>{isGpsLocating ? '⏳' : '📡'}</span>
                  <span>{gpsActive ? 'GPS Active' : isGpsLocating ? 'Locking GPS...' : 'Use My GPS'}</span>
                </button>

                <button
                  onClick={() => {
                    const waterPt = points.find(p => p.kind === 'water');
                    if (waterPt) setTargetPoint(waterPt);
                  }}
                  className="py-1.5 px-3 rounded-full bg-white/95 text-sky-800 border border-sky-200 text-xs font-black shadow-md flex items-center gap-1 hover:bg-sky-50 transition active:scale-95"
                >
                  <span>💧</span>
                  <span>Free Water</span>
                </button>

                <button
                  onClick={() => {
                    const shadePt = points.find(p => p.kind === 'shade');
                    if (shadePt) setTargetPoint(shadePt);
                  }}
                  className="py-1.5 px-3 rounded-full bg-white/95 text-emerald-800 border border-emerald-200 text-xs font-black shadow-md flex items-center gap-1 hover:bg-emerald-50 transition active:scale-95"
                >
                  <span>⛱️</span>
                  <span>Tree Shade</span>
                </button>

                <button
                  onClick={() => setShowForecastDrawer(!showForecastDrawer)}
                  className="py-1.5 px-3 rounded-full bg-white/95 text-amber-800 border border-amber-200 text-xs font-black shadow-md flex items-center gap-1 hover:bg-amber-50 transition active:scale-95"
                >
                  <span>🕒</span>
                  <span>Heat Wave</span>
                </button>

                {/* Map Engine Quick Toggle */}
                <button
                  onClick={() => setShowApiKeyModal(true)}
                  className="py-1.5 px-3 rounded-full bg-white/95 text-slate-800 border border-amber-300 text-xs font-black shadow-md flex items-center gap-1.5 active:scale-95 hover:bg-amber-50 transition"
                  title="Configure Map Engine & Google Maps Key"
                >
                  <span>{mapEngine === 'leaflet' ? '🗺️ Road + Heat Radar' : '📍 Google Maps'}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </button>
              </div>
            </div>

            {/* Expandable Forecast Drawer */}
            {showForecastDrawer && (
              <div className="bg-white/95 backdrop-blur-xl border-t border-amber-200 p-3 shadow-lg space-y-2 z-[1000] animate-in slide-in-from-bottom">
                <div className="flex items-center justify-between text-xs font-extrabold text-slate-800">
                  <span>3-Hour Heat Horizon</span>
                  <span className="text-rose-600 font-mono text-[11px] font-black">
                    {isReplayMode ? '🔴 RED WBGT UNTIL 4:30 PM' : '🟡 MODERATE CONDITIONS'}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {forecastHours.map((fh, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded-2xl border text-xs ${
                        fh.band === 'red'
                          ? 'bg-rose-50 border-rose-200 text-rose-800'
                          : fh.band === 'yellow'
                          ? 'bg-amber-50 border-amber-200 text-amber-800'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      }`}
                    >
                      <div className="text-[10px] text-slate-500 font-bold">{fh.hourLabel}</div>
                      <div className="font-black font-mono text-sm">{fh.wbgtC}°C</div>
                      <div className="text-[9px] uppercase font-black">{fh.band}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Card for Drivers: Captain Duty Status & Shift Actions */}
            <div className="p-3 bg-white/95 backdrop-blur-xl border-t border-amber-200/80 shadow-2xl z-20 space-y-2.5">
              
              {/* Captain Duty Selector (Realistic Field Workflow) */}
              <div className="flex items-center justify-between bg-amber-50/80 p-1 rounded-2xl border border-amber-200 text-xs">
                <button
                  onClick={() => setCaptainStatus('idle_waiting')}
                  className={`flex-1 py-1.5 px-2 rounded-xl font-black transition flex items-center justify-center gap-1.5 ${
                    captainStatus === 'idle_waiting'
                      ? 'bg-amber-500 text-white shadow-md'
                      : 'text-amber-900/70 hover:text-amber-900'
                  }`}
                >
                  <span>🟡</span>
                  <span>Waiting at Stand (Idle)</span>
                </button>
                <button
                  onClick={() => setCaptainStatus('on_trip')}
                  className={`flex-1 py-1.5 px-2 rounded-xl font-black transition flex items-center justify-center gap-1.5 ${
                    captainStatus === 'on_trip'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-amber-900/70 hover:text-amber-900'
                  }`}
                >
                  <span>🟢</span>
                  <span>On Trip / Delivering</span>
                </button>
                <button
                  onClick={() => setCaptainStatus('break')}
                  className={`py-1.5 px-2.5 rounded-xl font-black transition flex items-center justify-center gap-1 ${
                    captainStatus === 'break'
                      ? 'bg-sky-600 text-white shadow-md'
                      : 'text-amber-900/70 hover:text-amber-900'
                  }`}
                  title="Rest in Shade"
                >
                  <span>☕</span>
                  <span>Rest</span>
                </button>
              </div>

              {/* Live Exposure Stats & Shift Button */}
              <div className="flex items-center justify-between gap-3 pt-0.5">
                <div>
                  <div className="text-[10px] font-black text-amber-700 uppercase tracking-wider">
                    Personal Heat Dose
                  </div>
                  <div className="text-2xl font-black font-mono text-slate-900 flex items-baseline gap-1">
                    <span>{Math.round(shiftState.dose)}</span>
                    <span className="text-xs font-semibold text-slate-500">/ 140 max</span>
                  </div>
                  <div className="text-[11px] text-rose-600 font-extrabold">
                    {shiftState.redMin} mins in Red Heat Zone
                  </div>
                </div>

                {shiftState.status === 'active' ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleUnwellTrigger}
                      className="py-3 px-3.5 rounded-2xl bg-rose-100 hover:bg-rose-200 text-rose-700 font-black text-xs shadow-sm transition active:scale-95"
                    >
                      🚨 SOS
                    </button>
                    <button
                      onClick={handleEndShift}
                      className="py-3 px-5 rounded-2xl bg-gradient-to-r from-rose-500 to-red-600 text-white font-black text-xs shadow-md shadow-rose-500/30 transition active:scale-95"
                    >
                      End Shift
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleStartShift}
                    className="py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 active:scale-95 text-white font-black text-sm transition shadow-lg shadow-orange-500/30 flex items-center gap-2"
                  >
                    <span>🛵</span>
                    <span>START SHIFT</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* TAB 2: DETAILED SAFETY COCKPIT & GAUGE */}
          {activeTab === 'cockpit' && (
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between pb-1">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Safety Cockpit</h3>
                  <p className="text-xs text-slate-500 font-medium">Continuous biological WBGT heat monitoring</p>
                </div>
                <div className="flex items-center gap-1 bg-amber-50 p-1 rounded-full text-xs border border-amber-200">
                  <button
                    onClick={() => setIsReplayMode(false)}
                    className={`px-3 py-1 rounded-full font-black transition ${
                      !isReplayMode ? 'bg-white shadow text-slate-900' : 'text-slate-500'
                    }`}
                  >
                    Live
                  </button>
                  <button
                    onClick={() => setIsReplayMode(true)}
                    className={`px-3 py-1 rounded-full font-black transition ${
                      isReplayMode ? 'bg-rose-500 text-white shadow' : 'text-slate-500'
                    }`}
                  >
                    May Wave
                  </button>
                </div>
              </div>

              {/* Hero Circular Activity Ring Gauge */}
              <Gauge
                dose={shiftState.dose}
                currentBand={shiftState.lastPing?.band || (isReplayMode ? 'red' : 'yellow')}
                redMin={shiftState.redMin}
                ambientTempC={isReplayMode ? 43 : 32}
                wbgtC={shiftState.lastPing?.wbgtC || (isReplayMode ? 32.8 : 28.5)}
                speedKmh={shiftState.lastPing?.speedKmh || 0}
                isStationary={shiftState.lastPing?.speedKmh === 0}
                onUnwellClick={handleUnwellTrigger}
              />

              {/* Heat Hazard Surcharge Bonus Card */}
              <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-3xl p-4 text-white shadow-lg shadow-orange-500/20 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                    HEAT HAZARD SURCHARGE
                  </span>
                  <span className="font-mono font-black text-sm">+₹25 / TRIP ACTIVE</span>
                </div>
                <div className="text-2xl font-black font-mono">₹{hazardSurgeEarnings} Earned</div>
                <p className="text-xs text-amber-100 font-medium">
                  Extra hazard compensation for high WBGT heat exposure. Your biology is economically backed!
                </p>
              </div>

              {/* Water Intake Tracker */}
              <div className="bg-white rounded-3xl p-4 border border-amber-200/80 shadow-md space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black text-slate-800">Hydration Tracker</div>
                  <span className="text-xs font-mono font-black text-sky-600">{waterLoggedMl} / 2500 ml</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-sky-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (waterLoggedMl / 2500) * 100)}%` }}
                  />
                </div>
                <button
                  onClick={logWaterIntake}
                  className="w-full py-2.5 rounded-2xl bg-sky-50 hover:bg-sky-100 text-sky-700 font-black text-xs border border-sky-200 flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <span>💧</span>
                  <span>+ Log 250ml Water Consumed</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: WATER & SHADE DIRECTORY */}
          {activeTab === 'points' && (
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              <div className="flex items-center justify-between pb-1">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Free Relief Spots</h3>
                  <p className="text-xs text-slate-500 font-medium">Verified cold water & shaded rest points</p>
                </div>
                <button
                  onClick={() => setAddPointCoords({ lat: currentCity.center[0], lon: currentCity.center[1] })}
                  className="py-2 px-3.5 rounded-full bg-amber-500 text-white font-black text-xs shadow-md shadow-amber-500/20 active:scale-95 transition"
                >
                  + Add Spot
                </button>
              </div>

              {points.map(pt => (
                <div
                  key={pt.id}
                  onClick={() => {
                    setTargetPoint(pt);
                    setActiveTab('map');
                  }}
                  className="bg-white rounded-3xl p-4 border border-amber-200/80 shadow-sm hover:shadow-md cursor-pointer transition space-y-2 active:scale-98"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-slate-900 text-sm truncate max-w-[210px]">{pt.name}</span>
                    <span className="text-xs font-black text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                      {pt.kind === 'water' ? '💧 Water' : pt.kind === 'shade' ? '⛱️ Shade' : pt.kind === 'fuel' ? '⛽ AC Pump' : '🛋️ Rest'}
                    </span>
                  </div>
                  {pt.notes && <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2 rounded-2xl">{pt.notes}</p>}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                    <span className="font-semibold text-emerald-600">
                      {pt.verified ? `✓ Verified (${pt.verifiedByCount} riders)` : 'Community added'}
                    </span>
                    <span className="text-sky-600 font-black">Tap to Navigate 🧭</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: CAPTAIN DUTY & REAL GPS TRACKING */}
          {activeTab === 'duty' && (
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Captain Duty & GPS Telemetry</h3>
                <p className="text-xs text-slate-500 font-medium">Real-world driver telemetry & simulation controls</p>
              </div>

              {/* Location Source Selector */}
              <div className="bg-white p-4 rounded-3xl border border-amber-200 shadow-md space-y-3">
                <div className="text-xs font-black text-slate-800">Location Telemetry Source:</div>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => {
                      setGpsMode('real_gps');
                      setIsTracePlaying(false);
                      handleRequestGps();
                    }}
                    className={`p-3.5 rounded-2xl border text-xs font-bold text-left transition ${
                      gpsMode === 'real_gps'
                        ? 'bg-sky-50 border-sky-400 text-sky-900 shadow-sm ring-1 ring-sky-400'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-sm font-black mb-0.5 flex items-center justify-between">
                      <span>📡 Live Phone GPS</span>
                      {gpsActive && <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">ACTIVE</span>}
                    </div>
                    <div className="text-[10px] text-slate-500 font-normal">Tracks your actual bike ride outdoors & builds local heatmap</div>
                  </button>

                  <button
                    onClick={() => setGpsMode('trace')}
                    className={`p-3.5 rounded-2xl border text-xs font-bold text-left transition ${
                      gpsMode === 'trace'
                        ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-sm font-black mb-0.5">🎮 Demo 10x Replay</div>
                    <div className="text-[10px] text-slate-500 font-normal">Replays recorded May heatwave trace</div>
                  </button>
                </div>
              </div>

              {/* Trace player controls */}
              {gpsMode === 'trace' && (
                <TracePlayerControls
                  isPlaying={isTracePlaying}
                  onTogglePlay={() => setIsTracePlaying(!isTracePlaying)}
                  playbackSpeed={playbackSpeed}
                  onChangeSpeed={setPlaybackSpeed}
                  currentIndex={traceIndex}
                  totalPoints={DEMO_TRACE.length}
                  onJumpToMilestone={idx => {
                    handleJumpToMilestone(idx);
                    setActiveTab('map');
                  }}
                  onReset={handleResetTrace}
                />
              )}

              {/* Real World Driver Insight */}
              <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4 text-xs text-amber-900 space-y-2">
                <div className="font-black flex items-center gap-1.5 text-sm">
                  <span>💡</span>
                  <span>Captain Field Safety Protocol:</span>
                </div>
                <p className="leading-relaxed text-slate-700">
                  When waiting at street signals or vehicle stands, switch status to <b>Waiting at Stand</b>. If you remain stationary under direct 42°C sun for more than 5 minutes, SurakshaRide speaks in Hindi or English to guide you to shaded parking with free drinking water within 150 meters.
                </p>
              </div>
            </div>
          )}

          {/* TAB 5: PLATFORM PANEL */}
          {activeTab === 'platform' && (
            <div className="flex-1 p-3 overflow-y-auto">
              <PlatformPanel city={currentCity} activeRiderDose={shiftState.dose} />
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* Mobile Thumb-Friendly Bottom Navigation Bar                  */}
        {/* ------------------------------------------------------------- */}
        <nav aria-label="Bottom Navigation" className="bg-white border-t border-amber-200/80 px-2 py-2 flex items-center justify-around z-30 select-none shadow-lg">
          <button
            onClick={() => setActiveTab('map')}
            className={`flex flex-col items-center justify-center w-16 py-1 rounded-2xl transition ${
              activeTab === 'map' ? 'text-amber-600 font-black' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <span className="text-xl">🗺️</span>
            <span className="text-[10px] tracking-tight font-extrabold">Map</span>
          </button>

          <button
            onClick={() => setActiveTab('cockpit')}
            className={`flex flex-col items-center justify-center w-16 py-1 rounded-2xl transition ${
              activeTab === 'cockpit' ? 'text-amber-600 font-black' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <span className="text-xl">⚡</span>
            <span className="text-[10px] tracking-tight font-extrabold">Cockpit</span>
          </button>

          <button
            onClick={() => setActiveTab('points')}
            className={`flex flex-col items-center justify-center w-16 py-1 rounded-2xl transition ${
              activeTab === 'points' ? 'text-amber-600 font-black' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <span className="text-xl">💧</span>
            <span className="text-[10px] tracking-tight font-extrabold">Relief</span>
          </button>

          <button
            onClick={() => setActiveTab('duty')}
            className={`flex flex-col items-center justify-center w-16 py-1 rounded-2xl transition ${
              activeTab === 'duty' ? 'text-amber-600 font-black' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <span className="text-xl">🛵</span>
            <span className="text-[10px] tracking-tight font-extrabold">Duty</span>
          </button>

          <button
            onClick={() => setActiveTab('platform')}
            className={`flex flex-col items-center justify-center w-16 py-1 rounded-2xl transition ${
              activeTab === 'platform' ? 'text-purple-600 font-black' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <span className="text-xl">🏢</span>
            <span className="text-[10px] tracking-tight font-extrabold">Platform</span>
          </button>
        </nav>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Floating Active Voice Nudge Banner */}
      {/* ------------------------------------------------------------- */}
      {activeNudge && (
        <NudgeBanner
          nudge={activeNudge}
          lang={profile.lang}
          onNavigateToPoint={pointId => {
            const pt = points.find(p => p.id === pointId);
            if (pt) {
              setTargetPoint(pt);
              setActiveTab('map');
            }
            setActiveNudge(null);
          }}
          onDismiss={() => setActiveNudge(null)}
          onReplayAudio={() => {
            speakWithPollyVoice(
              profile.lang === 'hi' ? activeNudge.messageHi : activeNudge.messageEn,
              profile.lang === 'hi' ? 'hi' : 'en'
            );
          }}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* API Key & Map Engine Settings Modal */}
      {/* ------------------------------------------------------------- */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-[3500] bg-slate-900/40 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
          <div className="bg-white border-2 border-amber-300 rounded-[36px] w-full max-w-md p-5 sm:p-6 shadow-2xl text-slate-800 space-y-4 animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between border-b border-amber-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-lg">
                  🗺️
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Map Engine & API Key</h3>
                  <p className="text-xs text-slate-500 font-medium">Configure live road mapping & Google Maps</p>
                </div>
              </div>
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Map Engine Choice */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-800 block">Choose Map Engine:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setMapEngine('leaflet')}
                  className={`p-3 rounded-2xl border text-left transition ${
                    mapEngine === 'leaflet'
                      ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-sm font-black'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-xs font-black mb-0.5 flex items-center justify-between">
                    <span>🗺️ Road + Thermal Radar</span>
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-100 px-1.5 py-0.5 rounded-full">100% Live</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-normal">
                    Smooth Gaussian heat radar, +₹25 surge zones, zero API key blockers
                  </div>
                </button>

                <button
                  onClick={() => setMapEngine('google')}
                  className={`p-3 rounded-2xl border text-left transition ${
                    mapEngine === 'google'
                      ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-sm font-black'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-xs font-black mb-0.5 flex items-center justify-between">
                    <span>📍 Google Maps JS</span>
                    <span className="text-[10px] text-blue-600 font-bold bg-blue-100 px-1.5 py-0.5 rounded-full">Custom Key</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-normal">
                    Direct Google Maps JavaScript API (uses your configured key)
                  </div>
                </button>
              </div>
            </div>

            {/* Google Maps API Key Input */}
            <div className="space-y-2 bg-amber-50/70 p-4 rounded-2xl border border-amber-200">
              <div className="flex items-center justify-between text-xs font-black text-amber-900">
                <span>Google Maps JavaScript API Key:</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  apiKeyInput.trim() 
                    ? 'text-emerald-700 bg-emerald-100' 
                    : 'text-amber-800 bg-amber-200/80'
                }`}>
                  {apiKeyInput.trim() ? 'Configured ✓' : 'Optional (Free Map Available)'}
                </span>
              </div>
              <input
                type="text"
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
                placeholder="AIzaSy... (from Google Cloud Console)"
                className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <div className="text-[11px] text-slate-600 leading-relaxed pt-1 space-y-1.5">
                <p>
                  🔑 <strong>Which Key:</strong> From Google Cloud Console &rarr; <strong>Maps JavaScript API</strong> (starts with <code className="font-mono text-amber-800 font-bold bg-amber-100/80 px-1 py-0.5 rounded">AIzaSy...</code>).
                </p>
                <p className="text-[10px] text-slate-500">
                  ✨ <strong>No Key?</strong> Select the <strong>&ldquo;Road + Thermal Radar&rdquo;</strong> option above. It runs 100% free with live thermal heatmaps, GPS, shade stops, and surge zones with zero API keys required!
                </p>
                <p className="text-[10px] text-slate-500">
                  🌐 <strong>For Render Hosting:</strong> Add <code className="font-mono text-slate-700 bg-slate-200/60 px-1 rounded">VITE_GOOGLE_MAPS_API_KEY</code> in Render &rarr; Environment variables.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setShowApiKeyModal(false);
                confetti({ particleCount: 25, spread: 45, origin: { y: 0.7 } });
              }}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-xs shadow-md shadow-orange-500/20 active:scale-95 transition"
            >
              Apply Map Configuration
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Modals & Dialogs */}
      {/* ------------------------------------------------------------- */}
      <UnwellModal
        isOpen={showUnwellModal}
        onClose={() => setShowUnwellModal(false)}
        nearestPoint={points[0]}
        onNavigateToPoint={pt => {
          setTargetPoint(pt);
          setActiveTab('map');
        }}
        lang={profile.lang}
      />

      <ShiftSummaryModal
        isOpen={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        shiftState={shiftState}
        cityName={currentCity.name}
      />

      {addPointCoords && (
        <AddPointModal
          isOpen={true}
          onClose={() => setAddPointCoords(null)}
          lat={addPointCoords.lat}
          lon={addPointCoords.lon}
          onAddPoint={handleAddCrowdsourcedPoint}
          lang={profile.lang}
        />
      )}

      <AwsArchitectureModal
        isOpen={showAwsModal}
        onClose={() => setShowAwsModal(false)}
        shiftDose={shiftState.dose}
        redMinutes={shiftState.redMin}
      />
    </div>
  );
}
