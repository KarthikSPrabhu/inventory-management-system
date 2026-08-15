import React, { useEffect } from 'react';
import { storageImages } from '../../config/storageConfig';

/**
 * StorageVisualizer Component
 * 
 * Displays the pre-generated transparent PNG images of the physical storage rack.
 * Clicking a box opens it; clicking an opened box again closes it.
 * 
 * Accepts:
 *   selectedDrawer - number (0 = all closed, 1..6 = specific drawer open)
 *   location - location object { section, storageUnit, box, code }
 *   onSelectDrawer - callback when a physical box (1-6) is clicked
 *   onReset - callback to reset/close box
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
      // Clicking the already opened box closes it!
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
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Physical Storage Rack
          </span>
        </div>
      </div>

      {/* Main Hero Container - Larger Rack Size */}
      <div className="relative w-full max-w-xl min-h-[480px] sm:min-h-[540px] bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 flex flex-col items-center justify-center overflow-hidden shadow-2xl backdrop-blur-sm">
        
        {/* Storage Rack Image Container */}
        <div className="relative w-full h-[450px] sm:h-[500px] flex items-center justify-center">
          <img
            src={targetImage}
            alt="Physical Storage Rack"
            className="max-h-full max-w-full object-contain filter drop-shadow-[0_15px_30px_rgba(0,0,0,0.8)]"
          />

          {/* 100% Transparent Interactive Click Targets for Box 1 to 6 */}
          <div className="absolute inset-y-3 inset-x-8 flex flex-col justify-between py-2">
            {boxes.map((boxNum) => (
              <button
                key={boxNum}
                onClick={() => handleBoxClick(boxNum)}
                title={`Box ${boxNum} - Click to ${selectedDrawer === boxNum ? 'close' : 'open'}`}
                className="w-full flex-1 bg-transparent border-none outline-none cursor-pointer focus:outline-none my-0.5"
              />
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
