import React, { useEffect } from 'react';
import { storageImages } from '../../config/storageConfig';

/**
 * StorageVisualizer Component
 * 
 * Displays the pre-generated transparent PNG images of the physical storage rack.
 * Swaps instantly and seamlessly between image states without flickers or intrusive text badges.
 * 
 * Accepts:
 *   selectedDrawer - number (0 = all closed, 1..6 = specific drawer open)
 *   location - location object { section, storageUnit, box, code }
 *   item - currently located item object
 *   onReset - callback to reset location back to closed state
 */
function StorageVisualizer({ selectedDrawer = 0, location = null, item = null, onReset }) {
  // Preload images to ensure instant, unnoticeable image swaps
  useEffect(() => {
    Object.values(storageImages).forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  const targetImage = storageImages[selectedDrawer] || storageImages.closed;
  const isDrawerOpen = selectedDrawer > 0 && selectedDrawer <= 6;

  return (
    <div className="w-full flex flex-col items-center justify-center space-y-4 select-none">
      {/* Header bar */}
      <div className="w-full flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-indigo-500" />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Physical Storage Rack
          </span>
        </div>

        {isDrawerOpen && onReset && (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-indigo-400 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 px-3 py-1 rounded-lg transition-all shadow-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Reset Location</span>
          </button>
        )}
      </div>

      {/* Main Hero Container */}
      <div className="relative w-full max-w-lg min-h-[420px] sm:min-h-[480px] bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 flex flex-col items-center justify-center overflow-hidden shadow-2xl backdrop-blur-sm">
        {/* Subtle background glow when active */}
        {isDrawerOpen && (
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent pointer-events-none transition-opacity duration-300" />
        )}

        {/* Physical Storage Rack Image (Instant, seamless swap) */}
        <div className="relative w-full h-[360px] sm:h-[420px] flex items-center justify-center py-2">
          <img
            src={targetImage}
            alt="Physical Storage Rack"
            className="max-h-full max-w-full object-contain filter drop-shadow-[0_15px_25px_rgba(0,0,0,0.75)] transition-none"
          />
        </div>

        {/* Bottom location code footnote */}
        <div className="mt-2 text-center">
          <p className="text-[11px] text-slate-500 font-medium">
            {isDrawerOpen && location?.code ? (
              <>Location Code: <span className="font-mono font-bold text-indigo-400">{location.code}</span></>
            ) : (
              '6-Box Vertical Plastic Storage Container'
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

export default StorageVisualizer;
