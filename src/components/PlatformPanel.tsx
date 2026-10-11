import React, { useState } from 'react';
import { CityConfig } from '../types';

interface PlatformPanelProps {
  city: CityConfig;
  activeRiderDose: number;
}

interface MockFleetRider {
  id: string;
  name: string;
  vehicle: string;
  dose: number;
  status: 'Riding' | 'Waiting' | 'Resting';
  redMinutes: number;
  currentZone: 'Red' | 'Yellow' | 'Green';
  heatPayEarned: number;
}

export const PlatformPanel: React.FC<PlatformPanelProps> = ({
  city,
  activeRiderDose,
}) => {
  const [hazardPayActive, setHazardPayActive] = useState(true);
  const [heatAwareDispatchActive, setHeatAwareDispatchActive] = useState(true);

  const mockFleet: MockFleetRider[] = [
    { id: 'RD-104', name: 'Raju K. (Active Demo)', vehicle: 'Bicycle (1.3x rate)', dose: Math.round(activeRiderDose), status: 'Riding', redMinutes: 28, currentZone: 'Red', heatPayEarned: 80 },
    { id: 'RD-109', name: 'Suresh V.', vehicle: 'Hero Splendor', dose: 94, status: 'Waiting', redMinutes: 34, currentZone: 'Red', heatPayEarned: 100 },
    { id: 'RD-115', name: 'Mohd. Imran', vehicle: 'Honda Activa', dose: 42, status: 'Resting', redMinutes: 12, currentZone: 'Yellow', heatPayEarned: 40 },
    { id: 'RD-121', name: 'Venkatesh P.', vehicle: 'TVS Jupiter', dose: 18, status: 'Riding', redMinutes: 4, currentZone: 'Green', heatPayEarned: 20 },
    { id: 'RD-128', name: 'Anil Kumar', vehicle: 'Bicycle (1.3x rate)', dose: 112, status: 'Waiting', redMinutes: 45, currentZone: 'Red', heatPayEarned: 140 },
  ];

  return (
    <div className="bg-white rounded-[36px] p-5 sm:p-6 shadow-xl shadow-slate-200/60 border border-slate-200/80 text-slate-800 space-y-5">
      {/* Platform Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <span className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-[10px] font-black uppercase tracking-wider">
            FLEET & PLATFORM DISPATCH INTEGRATION
          </span>
          <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-1.5">
            Heat-Aware Fleet Dispatch & Hazard Allocation
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Coordinating gig economics: protecting rider biology while sustaining delivery fulfillment.
          </p>
        </div>

        <div className="bg-rose-50 px-3.5 py-2 rounded-2xl border border-rose-200 text-right">
          <div className="text-[10px] text-rose-600 font-bold uppercase">City Alert</div>
          <div className="text-sm font-black text-rose-700 font-mono">RED ZONE (&gt; 31°C WBGT)</div>
        </div>
      </div>

      {/* Policy Toggles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-amber-50/70 p-4 rounded-3xl border border-amber-200/80 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="font-extrabold text-sm text-amber-900 flex items-center gap-1.5">
              <span>⚡</span>
              <span>Heat Hazard Allowance (+₹20/Order)</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Triggered automatically during Red WBGT hours and 100% credited to delivery rider wallets.
            </p>
          </div>
          <button
            onClick={() => setHazardPayActive(!hazardPayActive)}
            className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${
              hazardPayActive ? 'bg-amber-500' : 'bg-slate-300'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
                hazardPayActive ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="bg-emerald-50/70 p-4 rounded-3xl border border-emerald-200/80 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="font-extrabold text-sm text-emerald-900 flex items-center gap-1.5">
              <span>🧠</span>
              <span>Dose-Weighted Order Routing</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Riders with dose &gt; 70 are prioritized for ultra-short deliveries (&lt; 2km) and AC mall pickups.
            </p>
          </div>
          <button
            onClick={() => setHeatAwareDispatchActive(!heatAwareDispatchActive)}
            className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${
              heatAwareDispatchActive ? 'bg-emerald-600' : 'bg-slate-300'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
                heatAwareDispatchActive ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Fleet Monitor Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Active Fleet Heat Strain Monitor ({city.name})
          </h4>
          <span className="text-xs font-mono text-slate-400">5 Partners Online</span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-[10px] text-slate-500 uppercase font-bold">
                <th className="py-2.5 px-3">Rider</th>
                <th className="py-2.5 px-3">Vehicle</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Heat Dose</th>
                <th className="py-2.5 px-3">Red Mins</th>
                <th className="py-2.5 px-3">Dispatch Action</th>
                <th className="py-2.5 px-3">Allowance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {mockFleet.map(rider => (
                <tr key={rider.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-2.5 px-3 font-bold text-slate-900 font-sans flex items-center gap-1.5">
                    <span>{rider.name}</span>
                    {rider.id.includes('104') && (
                      <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded-full">YOU</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 font-sans">{rider.vehicle}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        rider.status === 'Resting'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rider.status === 'Waiting'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-sky-100 text-sky-800'
                      }`}
                    >
                      {rider.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-bold">
                    <span
                      className={
                        rider.dose >= 110
                          ? 'text-rose-600'
                          : rider.dose >= 60
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }
                    >
                      {rider.dose} pts
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-rose-600 font-bold">{rider.redMinutes} m</td>
                  <td className="py-2.5 px-3 font-sans text-slate-700 text-[11px]">
                    {rider.dose >= 100
                      ? '⏸️ Mandatory 15m Shaded Pause'
                      : rider.dose >= 60
                      ? '🛍️ Short AC Pickup Assigned'
                      : '🛵 Normal Order Dispatch'}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-emerald-600">
                    +₹{rider.heatPayEarned}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
