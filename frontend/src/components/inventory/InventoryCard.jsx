import React, { useState } from 'react';
import { Link } from 'react-router-dom';

function InventoryCard({ item, searchQuery, onLocate, isLocated, onTakeItem, onAddStock }) {
  const { _id, name, image, quantity, location } = item;
  const { section, storageUnit, box, code } = location || {};
  const [copied, setCopied] = useState(false);

  // Text highlighting function to wrap matches in styled mark tags
  const highlightText = (text, query) => {
    if (!query || !query.trim() || !text) return <span>{text}</span>;
    
    // Escape regex characters to avoid execution errors
    const escapedQuery = query.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    const parts = String(text).split(regex);
    
    return (
      <span>
        {parts.map((part, index) => 
          regex.test(part) ? (
            <mark key={index} className="bg-yellow-500/20 text-yellow-300 font-semibold px-0.5 rounded">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  // Clipboard copy handler
  const handleCopy = async (e) => {
    e.preventDefault();
    e.stopPropagation(); // Avoid triggering locate
    if (!code) return;
    
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy location code: ', err);
    }
  };

  // Determine stock quantity indicator styling using lowStockThreshold
  const threshold = item.lowStockThreshold !== undefined ? item.lowStockThreshold : 5;
  let stockBadgeClass = '';
  let stockStatusLabel = '';
  
  if (quantity > threshold) {
    stockBadgeClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25';
    stockStatusLabel = 'IN STOCK';
  } else if (quantity > 0) {
    stockBadgeClass = 'bg-amber-500/10 text-amber-400 border-amber-500/25';
    stockStatusLabel = 'LOW STOCK';
  } else {
    stockBadgeClass = 'bg-rose-500/10 text-rose-400 border-rose-500/25';
    stockStatusLabel = 'OUT OF STOCK';
  }

  return (
    <div
      onClick={() => onLocate && onLocate(item)}
      className={`
        bg-slate-900 border-2 rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 flex flex-col group cursor-pointer select-none
        ${isLocated
          ? 'border-indigo-500/80 shadow-[0_0_25px_rgba(99,102,241,0.25)] ring-1 ring-indigo-500/30'
          : 'border-slate-800/80 hover:border-slate-700/80'
        }
      `}
    >
      {/* Product Image preview / placeholder window */}
      <div className="h-44 bg-slate-950/80 border-b border-slate-850 flex items-center justify-center relative overflow-hidden shrink-0 select-none">
        {image && image.trim() ? (
          <img
            src={image.trim()}
            alt={name}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />
        ) : null}
        
        {/* Placeholder container */}
        <div
          style={{ display: image && image.trim() ? 'none' : 'flex' }}
          className="absolute inset-0 flex flex-col items-center justify-center text-slate-700 bg-slate-950/40"
        >
          <svg className="w-12 h-12 stroke-[1.2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-650 mt-2">No Image Provided</span>
        </div>
      </div>

      {/* Card Details Body */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        {/* Title and Stock badge */}
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-slate-100 group-hover:text-indigo-400 transition-colors line-clamp-2 min-h-[40px]">
            {highlightText(name, searchQuery)}
          </h4>
          
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-extrabold border ${stockBadgeClass}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                quantity > threshold ? 'bg-emerald-400' : quantity > 0 ? 'bg-amber-400' : 'bg-rose-500'
              }`}></span>
              <span>{quantity} available &bull; {stockStatusLabel}</span>
            </span>
          </div>
        </div>

        {/* Location information */}
        <div className="space-y-3 pt-3 border-t border-slate-850/60 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Location Code</span>
            
            {/* Badge + Copy Trigger */}
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs font-bold text-indigo-400 bg-slate-950 px-2.5 py-0.5 rounded-lg border border-slate-850">
                📍 {highlightText(code, searchQuery)}
              </span>
              
              <button
                onClick={handleCopy}
                title="Copy location code"
                className={`p-1.5 rounded-md border transition-colors flex items-center justify-center ${
                  copied 
                    ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/25' 
                    : 'bg-slate-950 hover:bg-slate-850 text-slate-550 hover:text-slate-300 border-slate-850 hover:border-slate-700'
                }`}
              >
                {copied ? (
                  <svg className="w-3.5 h-3.5 text-emerald-450" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Coordinates row */}
          <div className="text-slate-400 flex items-center justify-between text-[11px] leading-tight">
            <div>Sec: <strong className="text-white">{highlightText(section, searchQuery)}</strong></div>
            <div className="text-slate-800 font-bold">&bull;</div>
            <div>Unit: <strong className="text-white">{storageUnit}</strong></div>
            <div className="text-slate-800 font-bold">&bull;</div>
            <div>Box: <strong className="text-white">{box}</strong></div>
          </div>
        </div>

        {/* Action Buttons Row: TAKE ITEM, ADD STOCK & DETAILS */}
        <div className="pt-1 grid grid-cols-3 gap-1.5 w-full">
          {onTakeItem ? (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (quantity > 0) onTakeItem(item);
              }}
              disabled={quantity === 0}
              title="Take item for a project"
              className={`h-9 font-extrabold text-[11px] px-1.5 rounded-xl transition-all flex items-center justify-center gap-1 min-w-0 ${
                quantity > 0
                  ? 'bg-purple-600/15 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 cursor-pointer shadow-sm'
                  : 'bg-slate-950 text-slate-600 border border-slate-850 cursor-not-allowed opacity-50'
              }`}
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 12H4m8-8l-8 8 8 8" />
              </svg>
              <span className="truncate">TAKE</span>
            </button>
          ) : (
            <div />
          )}

          {onAddStock ? (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAddStock(item);
              }}
              title="Add stock to inventory"
              className="h-9 bg-emerald-600/15 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 font-extrabold text-[11px] px-1.5 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer shadow-sm min-w-0"
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              <span className="truncate">+ STOCK</span>
            </button>
          ) : (
            <div />
          )}

          <Link
            to={`/inventory/${_id}`}
            onClick={(e) => e.stopPropagation()}
            title="View item details"
            className="h-9 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-bold text-[11px] px-1.5 rounded-xl transition-all flex items-center justify-center gap-1 text-center min-w-0"
          >
            <span className="truncate">Details</span>
            <svg className="w-3 h-3 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default InventoryCard;
