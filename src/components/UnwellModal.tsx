import React from 'react';
import { RestPoint } from '../types';

interface UnwellModalProps {
  isOpen: boolean;
  onClose: () => void;
  nearestPoint?: RestPoint;
  onNavigateToPoint?: (point: RestPoint) => void;
  lang: 'en' | 'hi' | 'te';
}

export const UnwellModal: React.FC<UnwellModalProps> = ({
  isOpen,
  onClose,
  nearestPoint,
  onNavigateToPoint,
  lang,
}) => {
  if (!isOpen) return null;
  const isHindi = lang === 'hi';

  return (
    <div className="fixed inset-0 z-[3000] bg-slate-900/40 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white border-2 border-rose-300 rounded-[36px] w-full max-w-lg p-5 sm:p-6 shadow-2xl text-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-rose-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-xl animate-bounce">
              🚨
            </div>
            <div>
              <h3 className="text-base font-extrabold text-rose-700">
                {isHindi ? 'हीट इमरजेंसी व प्राथमिक उपचार' : 'Heat Emergency & Immediate Aid'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {isHindi ? 'तुरंत सुरक्षित जगह रुकें और हेलमेट उतारें' : 'Pull over safely. Remove helmet and unbutton collar.'}
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

        {/* Nearest safe shelter */}
        {nearestPoint && (
          <div className="bg-amber-50/80 p-4 rounded-3xl border border-amber-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-amber-800 font-bold uppercase tracking-wider">
                📍 {isHindi ? 'सबसे नजदीकी सुरक्षित शेल्टर / पानी' : 'Nearest Shaded Point / Shelter'}
              </span>
              <span className="text-emerald-700 font-mono text-[11px] font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                {nearestPoint.verified ? 'VERIFIED ✓' : 'COMMUNITY'}
              </span>
            </div>
            <div className="font-extrabold text-slate-900 text-sm">{nearestPoint.name}</div>
            {nearestPoint.notes && (
              <div className="text-xs text-slate-600">{nearestPoint.notes}</div>
            )}
            <button
              onClick={() => {
                if (onNavigateToPoint) onNavigateToPoint(nearestPoint);
                onClose();
              }}
              className="w-full mt-1 py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-2xl transition shadow-md shadow-amber-500/20 flex items-center justify-center gap-2"
            >
              <span>🧭</span>
              <span>{isHindi ? 'इस शेल्टर की ओर नेविगेट करें' : 'Navigate To This Rest Spot'}</span>
            </button>
          </div>
        )}

        {/* 108 Emergency Call Button */}
        <div className="grid grid-cols-2 gap-2">
          <a
            href="tel:108"
            className="py-3 px-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-600/25 text-center"
          >
            <span>📞</span>
            <span>{isHindi ? '108 एम्बुलेंस कॉल करें' : 'Call 108 Ambulance'}</span>
          </a>
          <a
            href="tel:112"
            className="py-3 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 border border-slate-300 text-center"
          >
            <span>🚨</span>
            <span>{isHindi ? '112 आपातकालीन सेवा' : 'Call 112 SOS'}</span>
          </a>
        </div>

        {/* Symptoms Checklist */}
        <div className="space-y-2 pt-1 text-xs">
          <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider">
            {isHindi ? 'लक्षणों की पहचान (Triage)' : 'Symptoms Checklist:'}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl space-y-1">
              <div className="font-bold text-amber-900 flex items-center gap-1.5">
                <span>⚠️</span>
                <span>{isHindi ? 'हीट एग्जॉशन (लू)' : 'Heat Exhaustion'}</span>
              </div>
              <ul className="text-[11px] text-slate-600 space-y-0.5 list-disc list-inside">
                <li>{isHindi ? 'भारी पसीना व सिरदर्द' : 'Heavy sweating, cool skin'}</li>
                <li>{isHindi ? 'चक्कर या उल्टी जैसा लगना' : 'Dizziness, nausea'}</li>
                <li>{isHindi ? 'मांसपेशियों में ऐंठन' : 'Muscle cramps'}</li>
              </ul>
              <div className="text-[10px] text-amber-800 pt-1 font-semibold">
                👉 {isHindi ? 'छांव में बैठें, ORS या पानी पिएं' : 'Action: Sip water, rest in shade.'}
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 p-3 rounded-2xl space-y-1">
              <div className="font-bold text-rose-900 flex items-center gap-1.5">
                <span>🛑</span>
                <span>{isHindi ? 'हीट स्ट्रोक (गंभीर)' : 'Heat Stroke'}</span>
              </div>
              <ul className="text-[11px] text-slate-600 space-y-0.5 list-disc list-inside">
                <li>{isHindi ? 'पसीना बंद, लाल गर्म त्वचा' : 'High temp (>40°C), no sweat'}</li>
                <li>{isHindi ? 'भ्रम या बेहोशी' : 'Confusion, fainting'}</li>
                <li>{isHindi ? 'तेज धड़कन व सांस फूलना' : 'Rapid breathing'}</li>
              </ul>
              <div className="text-[10px] text-rose-800 pt-1 font-bold">
                🚨 {isHindi ? 'तत्काल 108 कॉल करें' : 'Action: Emergency 108 immediately.'}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition"
        >
          {isHindi ? 'बंद करें (Close Help)' : 'Close Help'}
        </button>
      </div>
    </div>
  );
};
