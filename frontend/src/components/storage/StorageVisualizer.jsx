import React, { useEffect } from 'react';
import { storageImages } from '../../config/storageConfig';

/**
 * StorageVisualizer Component
 * 
 * Displays the pre-generated transparent PNG images of the 6-drawer physical storage rack.
 * Clicking a box opens it; clicking an opened box again closes it.
 * 
 * Overlay buttons are aspect-ratio locked (375:666) to match the physical rack frame:
 * - Top-to-Bottom: Box 1 (top) to Box 6 (bottom)
 * - Exact bounds: Y [4.8%..94.4%], X [21.3%..77.9%]
 */
function StorageVisualizer({ selectedDrawer = 0, location = null, onSelectDrawer, onReset }) {
  // Preload images to ensure instant, unnoticeable image swaps
  useEffect(() => {
    Object.values(storageImages).forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  const targetImage = storageImages[selectedDrawer] || storageImages.closed;

  const handleBoxClick = (boxNum) => {
    if (selectedDrawer === boxNum) {
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
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-50" />
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Physical Storage Rack
          </span>
        </div>
      </div>

      {/* Main Hero Container */}
      <div className="relative w-full max-w-xl min-h-[380px] sm:min-h-[500px] bg-white border border-slate-100 rounded-2xl p-3 sm:p-4 flex flex-col items-center justify-center overflow-hidden shadow-[0_15px_40px_-15px_rgba(0,0,0,0.1)] ring-4 ring-slate-50">
        
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
                title={`Box ${boxNum} - Click to ${selectedDrawer === boxNum ? 'close' : 'open'}`}
                className="w-full flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 cursor-pointer my-0.5"
              >
                <span className="sr-only">Box {boxNum}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Footnote instruction */}
        <div className="mt-2 text-center">
          <p className="text-[11px] text-slate-500 font-medium">
            Click any physical drawer on the rack to open/close it.
          </p>
        </div>
      </div>
    </div>
  );
}

export default StorageVisualizer;
