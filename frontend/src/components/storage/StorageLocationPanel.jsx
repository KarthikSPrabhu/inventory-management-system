import React, { useState } from 'react';

/**
 * StorageLocationPanel Component
 * 
 * Displays details for the currently open physical box or located inventory item.
 * 
 * Accepts:
 *   selectedDrawer - number (1..6)
 *   drawerItems - array of items assigned to the open drawer
 *   location - location object { section, storageUnit, box, code }
 *   item - currently located item object
 */
function StorageLocationPanel({ selectedDrawer = 0, drawerItems = [], location = null, item = null }) {
  const [copied, setCopied] = useState(false);

  const loc = location || item?.location || (drawerItems.length > 0 ? drawerItems[0].location : null);
  const { section, storageUnit, box, code } = loc || {};

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
      <div className="w-full bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg text-center space-y-2">
        <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
        </div>
        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Storage Locator Idle</h4>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          Click any <strong className="text-indigo-400">BOX 1–6</strong> on the physical rack or click <strong className="text-indigo-400">LOCATE</strong> on an item to inspect its contents.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-indigo-300">
              {isDrawerOpen ? `BOX ${selectedDrawer}` : 'FOUND LOCATION'}
            </h4>
            <p className="text-[10px] text-slate-500 font-semibold">
              {drawerItems.length > 0
                ? `${drawerItems.length} item(s) stored in this drawer`
                : 'Physical Drawer Inspection'}
            </p>
          </div>
        </div>

        {/* Location Code Pill + Copy Button */}
        {code && (
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-extrabold text-indigo-400 bg-slate-950 border border-slate-800 px-3 py-1 rounded-xl shadow-inner">
              📍 {code}
            </span>
            <button
              onClick={() => handleCopyCode(code)}
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
          </div>
        )}
      </div>

      {/* Drawer Items Listing */}
      {drawerItems.length > 0 ? (
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-1">
            Items Stored Here:
          </span>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {drawerItems.map((drawerItem) => (
              <div
                key={drawerItem._id}
                className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                  item && item._id === drawerItem._id
                    ? 'bg-indigo-950/40 border-indigo-500/50 shadow-md ring-1 ring-indigo-500/30'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                  {drawerItem.image && drawerItem.image.trim() ? (
                    <img
                      src={drawerItem.image.trim()}
                      alt={drawerItem.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h5 className="text-xs font-bold text-slate-100 truncate">{drawerItem.name}</h5>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                      drawerItem.quantity > 5 ? 'text-emerald-400' : drawerItem.quantity > 0 ? 'text-amber-400' : 'text-rose-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        drawerItem.quantity > 5 ? 'bg-emerald-400' : drawerItem.quantity > 0 ? 'bg-amber-400' : 'bg-rose-500'
                      }`} />
                      {drawerItem.quantity} available
                    </span>
                    <span className="font-mono text-[10px] text-indigo-400 font-semibold">
                      📍 {drawerItem.location?.code}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : isDrawerOpen ? (
        <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl text-center">
          <p className="text-xs text-slate-500 italic">No inventory items assigned to Box {selectedDrawer} yet.</p>
        </div>
      ) : null}

      {/* Coordinate breakdown steps */}
      {loc && (
        <div className="grid grid-cols-3 gap-3 pt-2 text-center border-t border-slate-850">
          <div className="bg-slate-950/50 border border-slate-800/60 p-2 rounded-xl">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Section</span>
            <span className="text-sm font-black text-white mt-0.5 block">{section || '—'}</span>
          </div>
          <div className="bg-slate-950/50 border border-slate-800/60 p-2 rounded-xl">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Storage Unit</span>
            <span className="text-sm font-black text-white mt-0.5 block">{storageUnit !== undefined ? storageUnit : '—'}</span>
          </div>
          <div className="bg-slate-950/50 border border-slate-800/60 p-2 rounded-xl">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Box</span>
            <span className="text-sm font-black text-white mt-0.5 block">{box !== undefined ? box : '—'}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default StorageLocationPanel;
