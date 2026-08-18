import React, { useState } from 'react';
import { useStorage } from '../../context/StorageContext';
import { resolveNodeHierarchy, getLocationDisplayId } from '../../utils/locationUtils';

function LocationDisplay({ locations = [], location = null }) {
  const { tree } = useStorage();
  const [copiedCode, setCopiedCode] = useState('');

  const handleCopy = async (codeToCopy) => {
    if (!codeToCopy) return;
    try {
      await navigator.clipboard.writeText(codeToCopy);
      setCopiedCode(codeToCopy);
      setTimeout(() => setCopiedCode(''), 2000);
    } catch (err) {
      console.error('Failed to copy location code: ', err);
    }
  };

  // Convert inputs to location display items
  let displayList = [];

  if (Array.isArray(locations) && locations.length > 0) {
    displayList = locations.map(loc => {
      const node = loc.node;
      if (!node) return null;
      
      const resolved = resolveNodeHierarchy(node, tree);
      const path = resolved?.path || [node];
      const displayId = resolved?.displayId || getLocationDisplayId(node, tree);
      const pathText = path.map(n => n.name).join(' › ');

      return {
        id: node._id,
        displayId: displayId || 'Location unavailable',
        pathText,
        path,
        quantity: loc.quantity
      };
    }).filter(Boolean);
  } else if (location) {
    // Legacy fallback
    const { section, storageUnit, box, code } = location;
    displayList = [{
      id: 'legacy',
      displayId: code || `${section}${storageUnit}${box}`,
      pathText: `Section ${section || '-'} › Unit ${storageUnit || '-'} › Box ${box || '-'}`,
      path: [],
      quantity: null
    }];
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-lg max-w-sm w-full mx-auto space-y-5">
      {/* Title */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-indigo-600">📍</span>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            PHYSICAL STORAGE LOCATIONS
          </span>
        </div>
        <span className="bg-indigo-50 text-indigo-600 border border-indigo-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
          {displayList.length} {displayList.length === 1 ? 'location' : 'locations'}
        </span>
      </div>

      {/* Locations List */}
      {displayList.length > 0 ? (
        <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
          {displayList.map((item, idx) => (
            <div key={item.id || idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              {/* Location Badge Header */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-black text-indigo-600 bg-white border border-slate-200 rounded-lg px-3 py-1 shadow-sm">
                  📍 {item.displayId}
                </span>

                {item.quantity !== null && item.quantity !== undefined && (
                  <span className="text-xs font-extrabold text-slate-700 bg-white border border-slate-200 px-2.5 py-0.5 rounded-md">
                    {item.quantity} {item.quantity === 1 ? 'unit' : 'units'}
                  </span>
                )}
              </div>

              {/* Breadcrumb path */}
              <div className="text-xs font-semibold text-slate-600 bg-white border border-slate-100 rounded-lg p-2.5 leading-snug">
                {item.pathText}
              </div>

              {/* Copy Button */}
              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleCopy(item.displayId)}
                  className={`text-[11px] font-bold px-3 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                    copiedCode === item.displayId
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-300'
                      : 'bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-900 border-slate-200'
                  }`}
                >
                  {copiedCode === item.displayId ? (
                    <>
                      <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-xs text-slate-400 italic">
          No location registered for this item.
        </div>
      )}
    </div>
  );
}

export default LocationDisplay;
