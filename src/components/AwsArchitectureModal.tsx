import React, { useState } from 'react';
import { AWS_SAM_TEMPLATE } from '../data/awsArchitecture';
import { speakWithPollyVoice } from '../utils/audio';

interface AwsArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftDose: number;
  redMinutes: number;
}

export const AwsArchitectureModal: React.FC<AwsArchitectureModalProps> = ({
  isOpen,
  onClose,
  shiftDose,
  redMinutes,
}) => {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'dynamodb' | 'sam' | 'polly'>('pipeline');
  const [copied, setCopied] = useState(false);
  const [cronRunning, setCronRunning] = useState(false);
  const [cronMessage, setCronMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyTemplate = () => {
    navigator.clipboard.writeText(AWS_SAM_TEMPLATE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulateEventBridge = () => {
    setCronRunning(true);
    setCronMessage('EventBridge Scheduler triggered at :05 -> Invoking buildGrid Lambda...');
    setTimeout(() => {
      setCronMessage('buildGrid: Fetched Open-Meteo 400 cells -> Computed WBGT & Bands -> Batch-wrote 400 rows to DynamoDB:HeatGrid & S3:grid/hyderabad/latest.geojson (Execution: 412ms, 0 errors)');
      setCronRunning(false);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[3000] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-[36px] w-full max-w-3xl shadow-2xl text-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-xl">
              ☁️
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <span>AWS Cloud Architecture & SAM Pipeline</span>
                <span className="text-[10px] bg-amber-100 text-amber-800 font-mono px-2 py-0.5 rounded-full font-bold">
                  ap-south-1 (Mumbai)
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Serverless, sub-second latency, on-demand DynamoDB pricing
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center font-bold text-sm"
          >
            ✕
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1.5 px-5 py-2.5 bg-white border-b border-slate-100 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`px-3 py-1.5 rounded-full font-bold transition whitespace-nowrap ${
              activeTab === 'pipeline' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Architecture Pipeline
          </button>
          <button
            onClick={() => setActiveTab('dynamodb')}
            className={`px-3 py-1.5 rounded-full font-bold transition whitespace-nowrap ${
              activeTab === 'dynamodb' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            DynamoDB Tables (5)
          </button>
          <button
            onClick={() => setActiveTab('polly')}
            className={`px-3 py-1.5 rounded-full font-bold transition whitespace-nowrap ${
              activeTab === 'polly' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Polly Voice Test
          </button>
          <button
            onClick={() => setActiveTab('sam')}
            className={`px-3 py-1.5 rounded-full font-bold transition whitespace-nowrap ${
              activeTab === 'sam' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            template.yaml (SAM)
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {activeTab === 'pipeline' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-4 rounded-3xl bg-sky-50 border border-sky-100 space-y-2">
                  <div className="font-extrabold text-sky-900 flex items-center gap-1.5">
                    <span>⏱️</span>
                    <span>1. Hourly Heat Grid</span>
                  </div>
                  <ul className="text-[11px] text-slate-600 space-y-1">
                    <li>• <b>EventBridge Scheduler</b> at :05</li>
                    <li>• <b>Open-Meteo</b> Temp, RH, Wind</li>
                    <li>• <b>Lambda (Python 3.12)</b> WBGT</li>
                    <li>• Writes to <b>DynamoDB & S3</b></li>
                  </ul>
                </div>

                <div className="p-4 rounded-3xl bg-amber-50 border border-amber-100 space-y-2">
                  <div className="font-extrabold text-amber-900 flex items-center gap-1.5">
                    <span>🛵</span>
                    <span>2. Rider Loop (60s)</span>
                  </div>
                  <ul className="text-[11px] text-slate-600 space-y-1">
                    <li>• GPS ping to <b>HTTP API Gateway</b></li>
                    <li>• <b>Lambda</b> matches grid cell</li>
                    <li>• Updates weighted heat dose</li>
                    <li>• Evaluates Idle / On-Route nudges</li>
                  </ul>
                </div>

                <div className="p-4 rounded-3xl bg-emerald-50 border border-emerald-100 space-y-2">
                  <div className="font-extrabold text-emerald-900 flex items-center gap-1.5">
                    <span>🔊</span>
                    <span>3. Zero-Detour Output</span>
                  </div>
                  <ul className="text-[11px] text-slate-600 space-y-1">
                    <li>• <b>Amazon Polly</b> Hindi/English</li>
                    <li>• <b>Amazon Location</b> Route guidance</li>
                    <li>• Stationary &gt;10m: <b>Auto Break</b></li>
                    <li>• <b>Amplify Hosting</b> Fast PWA</li>
                  </ul>
                </div>
              </div>

              {/* EventBridge Simulator */}
              <div className="p-4 rounded-3xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-600">
                  Simulate the scheduled EventBridge cron job right now:
                </div>
                <button
                  onClick={handleSimulateEventBridge}
                  disabled={cronRunning}
                  className="py-2 px-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-extrabold text-xs rounded-full transition shadow-md shadow-amber-500/20 flex items-center gap-1.5"
                >
                  <span>{cronRunning ? '⏳ Running Lambda...' : '⚡ Trigger EventBridge Cron'}</span>
                </button>
              </div>

              {cronMessage && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl font-mono text-[11px] text-amber-900 animate-in fade-in">
                  {cronMessage}
                </div>
              )}
            </div>
          )}

          {activeTab === 'dynamodb' && (
            <div className="space-y-3">
              <div className="space-y-2 text-xs">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-amber-800">SurakshaRide-HeatGrid</span>
                    <span className="text-[10px] text-slate-400">PK: cellId | SK: hour</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-700">
                    &#123; "cellId": "872_3919", "hour": "2026-10-10T14", "wbgtC": 32.4, "band": "red", "tempC": 41.2, "rh": 44 &#125;
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sky-800">SurakshaRide-Shifts</span>
                    <span className="text-[10px] text-slate-400">PK: riderId | SK: shiftId</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-700">
                    &#123; "riderId": "usr_9921", "dose": {Math.round(shiftDose)}, "redMin": {redMinutes}, "breakCount": 2 &#125;
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-emerald-800">SurakshaRide-Points</span>
                    <span className="text-[10px] text-slate-400">PK: pointId | GSI: cellId</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-700">
                    &#123; "pointId": "hyd_pt_1", "name": "HPCL Free RO Water", "kind": "water", "verified": true &#125;
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'polly' && (
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-900">Shift Start</div>
                  <div className="text-[11px] text-slate-500">"Shift started. Stay safe in the heat."</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => speakWithPollyVoice('Shift started. Stay safe in the heat.', 'en')}
                    className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-full text-xs font-bold"
                  >
                    🔊 English
                  </button>
                  <button
                    onClick={() => speakWithPollyVoice('शिफ्ट शुरू हो गई है। धूप में सुरक्षित रहें।', 'hi')}
                    className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-full text-xs font-bold"
                  >
                    🔊 हिंदी
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-900">Idle Waiting Break (Zero Cost)</div>
                  <div className="text-[11px] text-slate-500">"You have been in the heat a while. Shade and water are close by."</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => speakWithPollyVoice('You have been in the heat a while. Shade and water are close by while you wait.', 'en')}
                    className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-full text-xs font-bold"
                  >
                    🔊 English
                  </button>
                  <button
                    onClick={() => speakWithPollyVoice('आप काफी देर से धूप में हैं। इंतज़ार करते हुए पास ही छांव और पानी उपलब्ध है।', 'hi')}
                    className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-full text-xs font-bold"
                  >
                    🔊 हिंदी
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-900">On-Route Water (0 Detour)</div>
                  <div className="text-[11px] text-slate-500">"Water point just ahead on your route."</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => speakWithPollyVoice('Water point just ahead on your route.', 'en')}
                    className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-full text-xs font-bold"
                  >
                    🔊 English
                  </button>
                  <button
                    onClick={() => speakWithPollyVoice('आपके रास्ते में आगे पानी का पॉइंट है।', 'hi')}
                    className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-full text-xs font-bold"
                  >
                    🔊 हिंदी
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-900">Break Logged</div>
                  <div className="text-[11px] text-slate-500">"Break logged. Good job."</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => speakWithPollyVoice('Break logged. Good job.', 'en')}
                    className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-full text-xs font-bold"
                  >
                    🔊 English
                  </button>
                  <button
                    onClick={() => speakWithPollyVoice('ब्रेक दर्ज हो गया। शाबाश।', 'hi')}
                    className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-full text-xs font-bold"
                  >
                    🔊 हिंदी
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sam' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-mono">template.yaml</span>
                <button
                  onClick={copyTemplate}
                  className="py-1 px-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-full text-xs"
                >
                  {copied ? 'Copied YAML!' : 'Copy template.yaml'}
                </button>
              </div>
              <pre className="p-4 bg-slate-50 rounded-2xl border border-slate-200 font-mono text-[11px] text-slate-800 overflow-x-auto max-h-[380px] leading-relaxed">
                {AWS_SAM_TEMPLATE}
              </pre>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="py-2 px-5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-2xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
