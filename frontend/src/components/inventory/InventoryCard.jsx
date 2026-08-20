import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStorage } from '../../context/StorageContext';
import { getLocationDisplayId, resolveNodeHierarchy } from '../../utils/locationUtils';

function InventoryCard({ item, searchQuery, onLocate, isLocated, onTakeItem, onAddStock, onMoveItem }) {
  const { _id, name, image, quantity, locations, location: legacyLocation } = item;
  const { tree } = useStorage();
  const [copied, setCopied] = useState(false);

  // Extract primary node hierarchy info
  const primaryNode = locations && locations.length > 0 ? locations[0].node : null;
  const resolved = resolveNodeHierarchy(primaryNode, tree);
  
  const displayCode = getLocationDisplayId(primaryNode, tree) || legacyLocation?.code || '';
  const sectionCode = resolved?.section || legacyLocation?.section || 'A';
  const unitNum = resolved?.primaryUnit !== null && resolved?.primaryUnit !== undefined
    ? String(resolved.primaryUnit).padStart(2, '0')
    : (legacyLocation?.storageUnit ? String(legacyLocation.storageUnit).padStart(2, '0') : '-');
  const boxNum = resolved?.containers && resolved.containers.length > 0
    ? resolved.containers.map(c => c.code).join(', ')
    : (legacyLocation?.box ? String(legacyLocation.box) : '-');

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
    if (!displayCode) return;
    
    try {
      await navigator.clipboard.writeText(displayCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy location code: ', err);
    }
  };

  // Determine stock quantity indicator styling using minimumStock
  const minStock = item.minimumStock !== undefined ? item.minimumStock : (item.lowStockThreshold !== undefined ? item.lowStockThreshold : 0);
  let stockBadgeClass = '';
  let stockStatusLabel = '';
  
  if (quantity === 0) {
    stockBadgeClass = 'bg-rose-50 text-rose-600 border-rose-200';
    stockStatusLabel = 'OUT OF STOCK';
  } else if (quantity <= minStock) {
    stockBadgeClass = 'bg-amber-50 text-amber-600 border-amber-200';
    stockStatusLabel = 'LOW STOCK';
  } else {
    stockBadgeClass = 'bg-emerald-50 text-emerald-600 border-emerald-200';
    stockStatusLabel = 'IN STOCK';
  }

  const navigate = useNavigate();

  return (
    <div
      onClick={() => onLocate && onLocate(item)}
      onDoubleClick={() => navigate(`/inventory/${_id}`)}
      className={`
        bg-white border-2 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group cursor-pointer select-none
        ${isLocated
          ? 'border-indigo-500 shadow-[0_8px_30px_rgba(99,102,241,0.2)] ring-4 ring-indigo-500/10'
          : 'border-slate-100 hover:border-indigo-200 hover:shadow-indigo-500/10'
        }
      `}
    >
      {/* Product Image preview / placeholder window */}
      <div className="h-44 bg-white border-b border-slate-200 flex items-center justify-center relative overflow-hidden shrink-0 select-none">
        {image && image.trim() ? (
          <img
            src={image.trim()}
            alt={name}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
            className="w-full h-full object-contain group-hover:scale-[1.03] transition-transform duration-300 p-4"
          />
        ) : null}
        
        {/* Placeholder container */}
        <div
          style={{ display: image && image.trim() ? 'none' : 'flex' }}
          className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-50"
        >
          <svg className="w-12 h-12 stroke-[1.2] mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">No Image</span>
        </div>
      </div>

      {/* Card Details Body */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        {/* Title and Stock badge */}
        <div className="space-y-2">
          {item.category && item.category !== 'Other' && (
            <span className="inline-block bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              {item.category}
            </span>
          )}
          <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 min-h-[40px]">
            {highlightText(name, searchQuery)}
          </h4>
          
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-extrabold border ${stockBadgeClass}`}>
              <span className={`w-1.5 h-1.5 rounded-full shadow-sm ${
                quantity > minStock ? 'bg-emerald-50' : quantity > 0 ? 'bg-amber-50' : 'bg-rose-50'
              }`}></span>
              <span>{quantity} available &bull; {stockStatusLabel}</span>
            </span>
          </div>
        </div>

        {/* Location information */}
        <div className="space-y-3 pt-3 border-t border-slate-200 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Location Code</span>
            
            {/* Badge + Copy Trigger */}
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs font-bold text-indigo-600 bg-slate-50 px-2.5 py-0.5 rounded-lg border border-slate-200">
                📍 {displayCode ? highlightText(displayCode, searchQuery) : 'Unassigned'}
              </span>

              {locations && locations.length > 1 && (
                <span className="text-[10px] font-extrabold text-indigo-500 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                  +{locations.length - 1}
                </span>
              )}
              
              <button
                onClick={handleCopy}
                title="Copy location code"
                aria-label={`Copy location code ${displayCode}`}
                className={`p-1.5 rounded-md border transition-colors flex items-center justify-center ${
                  copied 
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {copied ? (
                  <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div className="text-slate-500 flex items-center justify-between text-[11px] leading-tight">
            <div>Sec: <strong className="text-slate-900">{highlightText(sectionCode, searchQuery)}</strong></div>
            <div className="text-slate-800 font-bold">&bull;</div>
            <div>Unit: <strong className="text-slate-900">{unitNum}</strong></div>
            <div className="text-slate-800 font-bold">&bull;</div>
            <div>Box: <strong className="text-slate-900">{boxNum}</strong></div>
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
              aria-label={`Take ${name} for a project`}
              className={`h-9 font-extrabold text-[11px] px-1.5 rounded-xl transition-all flex items-center justify-center gap-1 min-w-0 ${
                quantity > 0
                  ? 'bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 cursor-pointer shadow-sm hover:shadow-md'
                  : 'bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed'
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
              aria-label={`Add stock to ${name}`}
              className="h-9 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 font-extrabold text-[11px] px-1.5 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer shadow-sm hover:shadow-md min-w-0"
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              <span className="truncate">STOCK</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex gap-1.5">
            <Link
              to={`/inventory/${_id}`}
              onClick={(e) => e.stopPropagation()}
              title="View item details"
              aria-label={`View details for ${name}`}
              className="h-9 flex-1 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 font-bold text-[11px] px-1.5 rounded-xl transition-all flex items-center justify-center gap-1 text-center min-w-0 shadow-sm hover:shadow-md"
            >
              <span className="truncate">Details</span>
            </Link>

            {onMoveItem && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMoveItem(item); }}
                className="h-9 flex-1 min-w-[36px] bg-slate-50 hover:bg-amber-50 text-slate-600 hover:text-amber-700 border border-slate-200 hover:border-amber-300 font-bold text-[11px] rounded-xl transition-all flex items-center justify-center cursor-pointer"
                title="Move item stock"
                aria-label={`Move stock location for ${name}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default InventoryCard;
