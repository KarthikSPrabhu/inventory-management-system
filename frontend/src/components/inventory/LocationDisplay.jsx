import React, { useState } from 'react';

function LocationDisplay({ location }) {
  const { section, storageUnit, box, code } = location || {};
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy location code: ', err);
    }
  };

  return (
    <div className="bg-slate-100 border border-slate-200 rounded-2xl p-6 shadow-lg max-w-sm w-full mx-auto space-y-6">
      {/* Title */}
      <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
        <span className="text-indigo-600">📍</span>
        <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest">Storage Location</span>
      </div>

      {/* Visual coordinates hierarchy mapping */}
      <div className="flex flex-col items-center space-y-3">
        {/* Section */}
        <div className="w-full text-center">
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Section</span>
          <div className="bg-white border border-slate-200 rounded-xl py-2 px-4 text-base font-extrabold text-slate-900 inline-block min-w-[70px]">
            {section || '-'}
          </div>
        </div>

        {/* Arrow ↓ */}
        <div className="text-indigo-500/80">
          <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>

        {/* Storage Unit */}
        <div className="w-full text-center">
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Storage Unit</span>
          <div className="bg-white border border-slate-200 rounded-xl py-2 px-4 text-base font-extrabold text-slate-900 inline-block min-w-[70px]">
            {storageUnit || '-'}
          </div>
        </div>

        {/* Arrow ↓ */}
        <div className="text-indigo-500/80">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>

        {/* Box */}
        <div className="w-full text-center">
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Box</span>
          <div className="bg-white border border-slate-200 rounded-xl py-2 px-4 text-base font-extrabold text-slate-900 inline-block min-w-[70px]">
            {box || '-'}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-200 pt-4 flex flex-col items-center space-y-2">
        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Location Code</span>
        
        {/* Code Badge with Clipboard Copy Trigger */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-base font-extrabold text-indigo-600 bg-white border border-slate-200 rounded-xl px-4 py-1.5 shadow-inner">
            {code}
          </span>
          
          <button
            onClick={handleCopy}
            className={`h-9 px-3 rounded-xl border font-bold text-xs transition-all duration-200 flex items-center justify-center gap-1.5 ${
              copied
                ? 'bg-emerald-50 text-emerald-450 border-emerald-200'
                : 'bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-900 border-slate-200 hover:border-slate-300'
            }`}
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
                <span>Copied!</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LocationDisplay;
