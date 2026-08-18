import React, { useState } from 'react';
import { useStorage } from '../../context/StorageContext';
import { resolveNodeHierarchy, getLocationDisplayId } from '../../utils/locationUtils';

/**
 * StorageLocationPanel Component
 * 
 * Displays details for the currently open physical box or located inventory item.
 */
function StorageLocationPanel({ selectedDrawer = 0, drawerItems = [], locations = [], item = null, onSelectLocation }) {
  const [copied, setCopied] = useState(false);
  const { tree } = useStorage();

  const handleCopyCode = async (codeToCopy) => {
    if (!codeToCopy) return;
    try {
      await navigator.clipboard.writeText(codeToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy location code:', err);
    }
  };

  const isDrawerOpen = selectedDrawer > 0 && selectedDrawer <= 6;

  if (!isDrawerOpen && !item) {
    return (
      <div className="w-full bg-white border border-slate-100 rounded-2xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] ring-4 ring-slate-50 text-center space-y-2">
        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
        </div>
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Storage Locator Idle</h4>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          Click any <strong className="text-indigo-600">BOX 1–6</strong> on the physical rack or click <strong className="text-indigo-600">LOCATE</strong> on an item to inspect its contents.
        </p>
      </div>
    );
  }

  // Determine which locations to display
  let displayLocations = [];
  if (item && item.locations) {
    displayLocations = item.locations;
  } else if (locations && locations.length > 0) {
    displayLocations = locations;
  }

  return (
    <div className="w-full bg-white border border-slate-100 rounded-2xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] ring-4 ring-slate-50 space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 border border-indigo-300 flex items-center justify-center text-indigo-600 shrink-0 shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-indigo-600">
              {isDrawerOpen && !item ? `BOX ${selectedDrawer}` : 'FOUND LOCATIONS'}
            </h4>
            <p className="text-[10px] text-slate-500 font-semibold">
              {item ? `${item.name} exists in ${displayLocations.length} location(s)` : 'Physical Drawer Inspection'}
            </p>
          </div>
        </div>
      </div>

      {/* Item Locations Listing */}
      {item && displayLocations.length > 0 && (
        <div className="space-y-3">
          {displayLocations.map((loc, idx) => {
            const node = loc.node;
            if (!node) return null;
            const resolved = resolveNodeHierarchy(node, tree);
            const path = resolved?.path || [node];
            const displayCode = resolved?.displayId || getLocationDisplayId(node, tree);
            
            return (
              <div
                key={idx}
                onClick={() => onSelectLocation && onSelectLocation(node)}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3 hover:border-indigo-300 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-extrabold text-indigo-600 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-sm">
                    📍 {displayCode || 'Location unavailable'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600">Qty: {loc.quantity}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCopyCode(displayCode); }}
                      className="text-slate-400 hover:text-indigo-600 transition-colors"
                      title="Copy Location Code"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
                {/* Breadcrumb Path */}
                <div className="flex items-center flex-wrap gap-1 text-[10px] font-medium text-slate-500">
                  {path.map((pNode, pIdx) => (
                    <React.Fragment key={pNode._id || pIdx}>
                      <span className={pIdx === path.length - 1 ? "text-indigo-600 font-bold" : ""}>
                        {pNode.name}
                      </span>
                      {pIdx < path.length - 1 && <span>›</span>}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Drawer Items Listing (when a drawer is selected) */}
      {!item && isDrawerOpen && (
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-1">
            Items Stored in Box {selectedDrawer}:
          </span>
          {drawerItems.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {drawerItems.map((drawerItem) => (
                <div
                  key={drawerItem._id}
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 bg-white shadow-sm"
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                    {drawerItem.image && drawerItem.image.trim() ? (
                      <img
                        src={drawerItem.image.trim()}
                        alt={drawerItem.name}
                        className="w-full h-full object-contain p-1"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xs font-bold text-slate-900 truncate">{drawerItem.name}</h5>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                        {drawerItem.quantity} total
                      </span>
                      {/* Show location code using authoritative getLocationDisplayId */}
                      <span className="font-mono text-[9px] text-indigo-500 truncate">
                        {drawerItem.locations.map(l => getLocationDisplayId(l.node, tree)).filter(Boolean).join(', ')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-100 border border-slate-200 p-4 rounded-xl text-center mt-2">
              <p className="text-xs text-slate-500 italic">No inventory items assigned to Box {selectedDrawer} yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default StorageLocationPanel;
