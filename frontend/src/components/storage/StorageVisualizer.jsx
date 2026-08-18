import React, { useEffect } from 'react';
import { storageImages, storageImagesB } from '../../config/storageConfig';

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
  activeSection = 'A',
  selectedDrawer = 0,
  selectedStorageUnit = null,
  unresolvable = false,
  unresolvableMessage = '',
  onSelectDrawer,
  onReset,
  onSectionChange
}) {
  // Preload images to ensure instant, unnoticeable image swaps
  useEffect(() => {
    Object.values(storageImages).forEach((src) => {
      const img = new Image();
      img.src = src;
    });
    Object.values(storageImagesB).forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  const drawerNum = Number(selectedDrawer);
  
  // Section A logic
  const isSectionA = activeSection === 'A';
  const maxDrawers = isSectionA ? 6 : 2;
  const validDrawer = !isNaN(drawerNum) && drawerNum >= 1 && drawerNum <= maxDrawers ? drawerNum : 0;
  
  const currentImages = isSectionA ? storageImages : storageImagesB;
  const targetImage = validDrawer > 0 ? (currentImages[validDrawer] || currentImages.closed) : currentImages.closed;

  const handleBoxClick = (boxNum) => {
    if (validDrawer === boxNum) {
      if (onReset) onReset();
    } else {
      if (onSelectDrawer) onSelectDrawer(boxNum);
    }
  };

  const boxes = isSectionA ? [1, 2, 3, 4, 5, 6] : [1, 2];

  return (
    <div className="w-full flex flex-col items-center justify-center space-y-3 select-none">
      {/* Header bar */}
      <div className="w-full flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${validDrawer > 0 ? 'bg-indigo-600 animate-pulse' : 'bg-slate-300'}`} />
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Physical Storage Rack (Section {activeSection})
          </span>
        </div>
        {validDrawer > 0 && (
          <span className="text-[11px] font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
            Unit 0{validDrawer} &bull; {isSectionA ? 'Drawer' : 'Location'} {validDrawer} Open
          </span>
        )}
      </div>

      {/* Main Hero Container */}
      <div className="relative w-full max-w-3xl min-h-[360px] sm:min-h-[540px] bg-white border border-slate-100 rounded-2xl p-2 sm:p-6 flex flex-row items-center justify-center overflow-hidden shadow-[0_15px_40px_-15px_rgba(0,0,0,0.1)] ring-4 ring-slate-50 gap-1 sm:gap-6 transition-all duration-500">
        
        {/* Unresolvable Location Warning */}
        {unresolvable ? (
          <div className="absolute top-4 left-4 right-4 z-20 p-4 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-2 shadow-sm">
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

        {/* Section A Container */}
        <div 
          className={`relative flex flex-col items-center justify-center transition-all duration-500 ease-in-out ${
            isSectionA 
              ? 'w-[55%] sm:w-[60%] h-[320px] sm:h-[480px] opacity-100 z-10 scale-100' 
              : 'w-[40%] sm:w-[30%] h-[220px] sm:h-[340px] opacity-40 z-0 scale-75 cursor-pointer hover:opacity-70 hover:scale-[0.80]'
          }`}
          onClick={() => { if (!isSectionA && onSectionChange) onSectionChange('A'); }}
        >

          <img
            src={isSectionA && validDrawer > 0 ? (storageImages[validDrawer] || storageImages.closed) : storageImages.closed}
            alt="Physical Storage Section A"
            className={`w-full h-full object-contain filter transition-all duration-500 ${isSectionA ? 'drop-shadow-[0_15px_30px_rgba(0,0,0,0.25)]' : 'drop-shadow-sm'}`}
          />
          
          {isSectionA && (
            <div 
              className="absolute flex flex-col justify-between"
              style={{ top: '4.8%', bottom: '5.6%', left: '21.3%', width: '56.6%' }}
            >
              {[1, 2, 3, 4, 5, 6].map((boxNum) => (
                <button
                  key={boxNum}
                  onClick={(e) => { e.stopPropagation(); handleBoxClick(boxNum); }}
                  title={`Physical Location ${boxNum} (Primary Unit 0${boxNum}) - Click to ${validDrawer === boxNum ? 'close' : 'open'}`}
                  className="w-full flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 cursor-pointer my-0.5 group"
                >
                  <span className="sr-only">Physical Location {boxNum}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Section B Container */}
        <div 
          className={`relative flex flex-col items-center justify-center transition-all duration-500 ease-in-out ${
            !isSectionA 
              ? 'w-[55%] sm:w-[60%] h-[320px] sm:h-[480px] opacity-100 z-10 scale-100' 
              : 'w-[40%] sm:w-[30%] h-[220px] sm:h-[340px] opacity-40 z-0 scale-75 cursor-pointer hover:opacity-70 hover:scale-[0.80]'
          }`}
          onClick={() => { if (isSectionA && onSectionChange) onSectionChange('B'); }}
        >
          <div className={`relative w-full h-full flex items-center justify-center transition-all duration-500 ${!isSectionA ? 'scale-110 sm:scale-125' : 'scale-100'}`}>
            <img
              src={!isSectionA && validDrawer > 0 ? (storageImagesB[validDrawer] || storageImagesB.closed) : storageImagesB.closed}
              alt="Physical Storage Section B"
              className={`w-full h-full object-contain filter transition-all duration-500 ${!isSectionA ? 'drop-shadow-[0_15px_30px_rgba(0,0,0,0.25)]' : 'drop-shadow-sm'}`}
            />
            
            {!isSectionA && (
              <div 
                className="absolute flex flex-col justify-between"
                style={{ top: '5%', bottom: '5%', left: '5%', width: '90%' }}
              >
                {[1, 2].map((boxNum) => (
                  <button
                    key={boxNum}
                    onClick={(e) => { e.stopPropagation(); handleBoxClick(boxNum); }}
                    title={`Physical Location ${boxNum} (Primary Unit 0${boxNum}) - Click to ${validDrawer === boxNum ? 'close' : 'open'}`}
                    className="w-full flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 cursor-pointer my-0.5 group"
                  >
                    <span className="sr-only">Physical Location {boxNum}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Footnote instruction */}
      <div className="mt-2 text-center">
        <p className="text-[11px] text-slate-500 font-medium">
          Click any physical location (1–{maxDrawers}) on the active image to inspect its contents.
        </p>
      </div>
    </div>
  );
}

export default StorageVisualizer;
