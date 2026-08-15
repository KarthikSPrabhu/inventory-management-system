import React from 'react';
import { Link } from 'react-router-dom';

function InventoryCard({ item, searchQuery }) {
  const { _id, name, image, quantity, location } = item;
  const { section, storageUnit, box, code } = location || {};

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

  // Determine stock quantity indicator styling
  let stockBadgeClass = '';
  let stockText = '';
  
  if (quantity > 5) {
    stockBadgeClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    stockText = `${quantity} available`;
  } else if (quantity > 0) {
    stockBadgeClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse';
    stockText = `${quantity} available (Low stock)`;
  } else {
    stockBadgeClass = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    stockText = '0 available (Out of stock)';
  }

  return (
    <div className="bg-slate-900 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-200 flex flex-col group">
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
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${stockBadgeClass}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                quantity > 5 ? 'bg-emerald-400' : quantity > 0 ? 'bg-amber-400' : 'bg-rose-555'
              }`}></span>
              {stockText}
            </span>
          </div>
        </div>

        {/* Location information */}
        <div className="space-y-2 pt-3 border-t border-slate-855/60 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Location Code</span>
            <span className="font-mono text-xs font-bold text-indigo-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-850">
              📍 {highlightText(code, searchQuery)}
            </span>
          </div>

          <div className="text-slate-400 space-y-0.5">
            <p>Section <strong className="text-white">{highlightText(section, searchQuery)}</strong></p>
            <p className="text-slate-500">Storage Unit {storageUnit} &bull; Box {box}</p>
          </div>
        </div>

        {/* Actions button */}
        <div className="pt-2">
          <Link
            to={`/inventory/${_id}`}
            className="w-full bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-350 hover:text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5"
          >
            <span>View Details</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default InventoryCard;
