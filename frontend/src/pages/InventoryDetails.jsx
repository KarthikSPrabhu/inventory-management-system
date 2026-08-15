import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getInventoryItemById } from '../services/inventoryService';
import LocationDisplay from '../components/inventory/LocationDisplay';

function InventoryDetails() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchItemDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getInventoryItemById(id);
      if (response.success) {
        setItem(response.data);
      } else {
        throw new Error(response.message || 'Failed to retrieve item details');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unable to load item details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItemDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-16 text-center flex flex-col items-center justify-center gap-3 animate-fadeIn">
        <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="text-xs text-slate-500 font-medium">Loading item records from Atlas...</span>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-8 text-center flex flex-col items-center justify-center space-y-4 max-w-lg mx-auto animate-fadeIn">
        <div className="h-12 w-12 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-455">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <h4 className="text-sm font-bold text-white">Failed to retrieve item</h4>
          <p className="text-xs text-slate-500 mt-1">{error || 'This item may have been removed or does not exist.'}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchItemDetails}
            className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-350 font-bold text-xs px-4 py-2.5 rounded-xl transition-all"
          >
            Try Again
          </button>
          <Link
            to="/inventory"
            className="bg-indigo-650 hover:bg-indigo-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all"
          >
            Back to Inventory
          </Link>
        </div>
      </div>
    );
  }

  const { name, image, quantity, location: itemLocation, createdAt, updatedAt } = item;

  // Stock Badge parameters
  let stockBadgeClass = '';
  let stockText = '';
  if (quantity > 5) {
    stockBadgeClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    stockText = `${quantity} available (In Stock)`;
  } else if (quantity > 0) {
    stockBadgeClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse';
    stockText = `${quantity} available (Low Stock)`;
  } else {
    stockBadgeClass = 'bg-rose-500/10 text-rose-455 border-rose-500/20';
    stockText = '0 available (Out of Stock)';
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fadeIn">
      {/* Navigation link */}
      <div>
        <Link
          to="/inventory"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-indigo-400 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to Catalog</span>
        </Link>
      </div>

      {/* Structured splits container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left / Middle: Item Details Visual Card */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl flex flex-col">
          {/* Image Display */}
          <div className="h-64 sm:h-80 bg-slate-950/80 border-b border-slate-850 flex items-center justify-center relative overflow-hidden select-none">
            {image && image.trim() ? (
              <img
                src={image.trim()}
                alt={name}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
                className="w-full h-full object-cover"
              />
            ) : null}
            <div
              style={{ display: image && image.trim() ? 'none' : 'flex' }}
              className="absolute inset-0 flex flex-col items-center justify-center text-slate-700 bg-slate-950/30"
            >
              <svg className="w-16 h-16 stroke-[1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-650 mt-2">No Image Provided</span>
            </div>
          </div>

          {/* Texts & Stats content */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="space-y-3">
              <h3 className="text-xl font-bold text-white tracking-tight leading-tight">{name}</h3>
              
              <div className="flex">
                <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-lg text-xs font-semibold border ${stockBadgeClass}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    quantity > 5 ? 'bg-emerald-400' : quantity > 0 ? 'bg-amber-400' : 'bg-rose-500'
                  }`}></span>
                  {stockText}
                </span>
              </div>
            </div>

            {/* Time Metrics Logs */}
            <div className="pt-4 border-t border-slate-850/60 space-y-1.5 text-xs text-slate-500">
              <div className="flex justify-between">
                <span>Date Created:</span>
                <span className="font-semibold text-slate-400">{new Date(createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Last Updated:</span>
                <span className="font-semibold text-slate-400">{new Date(updatedAt).toLocaleString()}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-4 border-t border-slate-850 flex flex-col sm:flex-row gap-3">
              <button
                disabled
                className="flex-1 bg-slate-800 text-slate-500 border border-slate-850 font-bold text-xs px-4 py-2.5 rounded-xl cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                <span>Edit Item</span>
                <span className="text-[9px] bg-slate-900 text-slate-500 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Coming Soon</span>
              </button>
              <Link
                to="/inventory"
                className="flex-1 bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-350 hover:text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all text-center flex items-center justify-center"
              >
                Back to Inventory
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column: Visual Location Display Map */}
        <div className="flex flex-col items-center">
          <LocationDisplay location={itemLocation} />
        </div>
      </div>
    </div>
  );
}

export default InventoryDetails;
