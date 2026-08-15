import React, { useState } from 'react';

/**
 * StorageLocationPanel Component
 * 
 * Displays the detailed location breakdown panel below or beside the StorageVisualizer.
 * Accepts:
 *   location - location object { section, storageUnit, box, code }
 *   item - inventory item object
 */
function StorageLocationPanel({ location, item }) {
  const [copied, setCopied] = useState(false);

  if (!location && !item) return null;

  const loc = location || item?.location || {};
  const { section, storageUnit, box, code } = loc;

  const handleCopyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy location code:', err);
    }
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 animate-fadeIn">
      {/* Header with Location Code and Copy Action */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Found Location</h4>
            <p className="text-[10px] text-slate-500">Physical Coordinates Verified</p>
          </div>
        </div>

        {/* Location Code Pill + Copy */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-extrabold text-indigo-400 bg-slate-950 border border-slate-800 px-3 py-1 rounded-xl shadow-inner">
            📍 {code || 'N/A'}
          </span>
          {code && (
            <button
              onClick={handleCopyCode}
              title="Copy location code"
              className={`p-1.5 rounded-lg border transition-all text-xs font-bold flex items-center gap-1 ${
                copied
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-slate-950 hover:bg-slate-800 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Copy</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Item summary if provided */}
      {item && (
        <div className="flex items-center gap-3 bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl">
          <div className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
            {item.image && item.image.trim() ? (
              <img
                src={item.image.trim()}
                alt={item.name}
                className="w-full h-full object-cover"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h5 className="text-sm font-bold text-slate-100 truncate">{item.name}</h5>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`inline-flex items-center gap-1 text-xs font-semibold ${
                item.quantity > 5 ? 'text-emerald-400' : item.quantity > 0 ? 'text-amber-400' : 'text-rose-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  item.quantity > 5 ? 'bg-emerald-400' : item.quantity > 0 ? 'bg-amber-400' : 'bg-rose-500'
                }`} />
                {item.quantity} available
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Coordinate breakdown steps */}
      <div className="grid grid-cols-3 gap-3 pt-1 text-center">
        <div className="bg-slate-950/50 border border-slate-800/60 p-2.5 rounded-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Section</span>
          <span className="text-base font-black text-white mt-0.5 block">{section || '—'}</span>
        </div>
        <div className="bg-slate-950/50 border border-slate-800/60 p-2.5 rounded-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Storage Unit</span>
          <span className="text-base font-black text-white mt-0.5 block">{storageUnit !== undefined ? storageUnit : '—'}</span>
        </div>
        <div className="bg-slate-950/50 border border-slate-800/60 p-2.5 rounded-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Box</span>
          <span className="text-base font-black text-white mt-0.5 block">{box !== undefined ? box : '—'}</span>
        </div>
      </div>
    </div>
  );
}

export default StorageLocationPanel;
