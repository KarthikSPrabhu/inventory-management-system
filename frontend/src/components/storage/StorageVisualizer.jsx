import React, { useEffect } from 'react';
import { storageImages } from '../../config/storageConfig';

/**
 * StorageVisualizer Component
 * 
 * Displays the pre-generated transparent PNG images of the 6-drawer physical storage rack.
 * Clicking a drawer opens it; clicking an opened drawer again closes it.
 * 
 * Explicit image mapping:
 * 0 = Closed rack
 * 1..6 = Physical Drawer 1..6 open (Top to Bottom)
 */
function StorageVisualizer({
  selectedDrawer = 0,
  selectedStorageUnit = null,
  unresolvable = false,
  unresolvableMessage = '',
  onSelectDrawer,
  onReset
}) {
  // Preload images to ensure instant, unnoticeable image swaps
  useEffect(() => {
    Object.values(storageImages).forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  const drawerNum = Number(selectedDrawer);
  const validDrawer = !isNaN(drawerNum) && drawerNum >= 1 && drawerNum <= 6 ? drawerNum : 0;
  const targetImage = validDrawer > 0 ? (storageImages[validDrawer] || storageImages.closed) : storageImages.closed;

  const handleBoxClick = (boxNum) => {
    if (validDrawer === boxNum) {
      if (onReset) onReset();
    } else {
      if (onSelectDrawer) onSelectDrawer(boxNum);
    }
  };

  const boxes = [1, 2, 3, 4, 5, 6];

  return (
    <div className="w-full flex flex-col items-center justify-center space-y-3 select-none">
      {/* Header bar */}
      <div className="w-full flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${validDrawer > 0 ? 'bg-indigo-600 animate-pulse' : 'bg-slate-300'}`} />
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Physical Storage Rack (Section A)
          </span>
        </div>
        {validDrawer > 0 && (
          <span className="text-[11px] font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
            Unit 0{validDrawer} &bull; Drawer {validDrawer} Open
          </span>
        )}
      </div>

      {/* Main Hero Container */}
      <div className="relative w-full max-w-xl min-h-[380px] sm:min-h-[500px] bg-white border border-slate-100 rounded-2xl p-3 sm:p-4 flex flex-col items-center justify-center overflow-hidden shadow-[0_15px_40px_-15px_rgba(0,0,0,0.1)] ring-4 ring-slate-50">
        
        {/* Unresolvable Location Warning */}
        {unresolvable ? (
          <div className="w-full p-4 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h5 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Storage location could not be resolved</h5>
            <p className="text-[11px] text-amber-700 font-medium">
              {unresolvableMessage || "Location unavailable for this item."}
            </p>
          </div>
        ) : null}

        {/* Storage Rack Image Wrapper — Locked to Rack Aspect Ratio 375:666 */}
        <div className="relative h-[360px] sm:h-[460px] lg:h-[500px] aspect-[375/666] flex items-center justify-center">
          <img
            src={targetImage}
            alt="Physical Storage Rack"
            className="w-full h-full object-contain filter drop-shadow-[0_15px_30px_rgba(0,0,0,0.25)]"
          />

          {/* 100% Precise Overlay Click Targets aligned to physical rack frame [Y: 4.8%..94.4%, X: 21.3%..77.9%] */}
          <div 
            className="absolute flex flex-col justify-between"
            style={{
              top: '4.8%',
              bottom: '5.6%',
              left: '21.3%',
              width: '56.6%'
            }}
          >
            {boxes.map((boxNum) => (
              <button
                key={boxNum}
                onClick={() => handleBoxClick(boxNum)}
                title={`Physical Drawer ${boxNum} (Primary Unit 0${boxNum}) - Click to ${validDrawer === boxNum ? 'close' : 'open'}`}
                className="w-full flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 cursor-pointer my-0.5 group"
              >
                <span className="sr-only">Physical Drawer {boxNum}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Footnote instruction */}
        <div className="mt-2 text-center">
          <p className="text-[11px] text-slate-500 font-medium">
            Click any physical drawer (1–6) on the rack frame to inspect its contents.
          </p>
        </div>
      </div>
    </div>
  );
}

export default StorageVisualizer;
