import React, { useState } from 'react';
import { RestPoint } from '../types';
import { computeCellId } from '../utils/wbgt';

interface AddPointModalProps {
  isOpen: boolean;
  onClose: () => void;
  lat: number;
  lon: number;
  onAddPoint: (point: RestPoint) => void;
  lang: 'en' | 'hi' | 'te';
}

export const AddPointModal: React.FC<AddPointModalProps> = ({
  isOpen,
  onClose,
  lat,
  lon,
  onAddPoint,
  lang,
}) => {
  const [kind, setKind] = useState<'water' | 'shade' | 'fuel' | 'rest'>('water');
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;
  const isHindi = lang === 'hi';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newPoint: RestPoint = {
      id: `pt_${Date.now()}`,
      cellId: computeCellId(lat, lon),
      lat,
      lon,
      name: name.trim(),
      kind,
      source: 'rider',
      verified: false,
      verifiedByCount: 1,
      notes: notes.trim(),
      addedBy: 'rider_self',
    };

    onAddPoint(newPoint);
    setName('');
    setNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[3000] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-3 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-[36px] w-full max-w-md p-5 sm:p-6 shadow-2xl text-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📍</span>
            <h3 className="font-extrabold text-base text-slate-900">
              {isHindi ? 'नया पानी या छांव पॉइंट जोड़ें' : 'Add Water or Shade Point'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center font-bold text-sm"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-500 font-medium">
          {isHindi
            ? 'आपके द्वारा जोड़ा गया पॉइंट अन्य डिलीवरी राइडर्स को धूप से बचने में मदद करेगा।'
            : 'Help fellow gig delivery riders find free cool water or shade.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Category Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {isHindi ? 'पॉइंट का प्रकार:' : 'Type of Relief Spot:'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setKind('water')}
                className={`py-2 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 border transition ${
                  kind === 'water'
                    ? 'bg-sky-50 border-sky-400 text-sky-800 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>💧</span>
                <span>{isHindi ? 'मुफ्त पानी (मटका/RO)' : 'Drinking Water'}</span>
              </button>

              <button
                type="button"
                onClick={() => setKind('shade')}
                className={`py-2 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 border transition ${
                  kind === 'shade'
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>⛱️</span>
                <span>{isHindi ? 'ठंडी छांव' : 'Cool Shade'}</span>
              </button>

              <button
                type="button"
                onClick={() => setKind('rest')}
                className={`py-2 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 border transition ${
                  kind === 'rest'
                    ? 'bg-amber-50 border-amber-400 text-amber-800 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>🛋️</span>
                <span>{isHindi ? 'राइडर रेस्ट हब' : 'Rest Hub'}</span>
              </button>

              <button
                type="button"
                onClick={() => setKind('fuel')}
                className={`py-2 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 border transition ${
                  kind === 'fuel'
                    ? 'bg-purple-50 border-purple-400 text-purple-800 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>⛽</span>
                <span>{isHindi ? 'पेट्रोल पंप' : 'Petrol Pump'}</span>
              </button>
            </div>
          </div>

          {/* Point Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isHindi ? 'स्थान का नाम:' : 'Landmark Name:'}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Free Matka at Tea Stall, HP Petrol Pump Water"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isHindi ? 'विशेष जानकारी (वैकल्पिक):' : 'Notes (Optional):'}
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. 24x7 chilled water, stone bench in neem shade"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-3 bg-slate-100 text-slate-700 rounded-2xl text-xs font-bold hover:bg-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-2xl text-xs transition shadow-md shadow-amber-500/20"
            >
              {isHindi ? 'पॉइंट सेव करें' : 'Save Relief Point'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
