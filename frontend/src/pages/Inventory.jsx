import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { getInventoryItems } from '../services/inventoryService';
import InventoryStats from '../components/inventory/InventoryStats';
import InventoryCard from '../components/inventory/InventoryCard';
import InventoryEmptyState from '../components/inventory/InventoryEmptyState';

// Skeleton Loader Card component for modern visual states
const SkeletonCard = () => (
  <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-md animate-pulse flex flex-col">
    <div className="h-44 bg-slate-950/60"></div>
    <div className="p-5 flex-grow space-y-4">
      <div className="space-y-2">
        <div className="h-4 bg-slate-950/80 rounded w-3/4"></div>
        <div className="h-4 bg-slate-950/80 rounded w-1/2"></div>
      </div>
      <div className="pt-3 border-t border-slate-850 space-y-2">
        <div className="h-3 bg-slate-950/80 rounded w-1/3"></div>
        <div className="h-5 bg-slate-950/80 rounded w-2/3"></div>
      </div>
      <div className="h-10 bg-slate-950/80 rounded-xl mt-2"></div>
    </div>
  </div>
);

function Inventory() {
  const routerLocation = useLocation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flashMessage, setFlashMessage] = useState('');

  // Fetch all items from Atlas
  const loadInventory = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getInventoryItems();
      if (response.success) {
        setItems(response.data);
      } else {
        throw new Error(response.message || 'Failed to retrieve catalog');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unable to load inventory.');
    } finally {
      setLoading(false);
    }
  };

  // Trigger load on component mount
  useEffect(() => {
    loadInventory();
  }, []);

  // Handle flash messages
  useEffect(() => {
    if (routerLocation.state && routerLocation.state.flash) {
      setFlashMessage(routerLocation.state.flash);
      window.history.replaceState({}, document.title);
      
      const timer = setTimeout(() => {
        setFlashMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [routerLocation]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header and Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-white tracking-tight">Inventory</h3>
          <p className="text-xs text-slate-400 mt-1">Manage and locate everything in your storage.</p>
        </div>
        <Link
          to="/inventory/add"
          className="inline-flex items-center gap-1.5 justify-center bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-650/15"
        >
          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Item</span>
        </Link>
      </div>

      {/* Flash Success Notification */}
      {flashMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-450 p-4 rounded-xl text-xs flex gap-3 items-center">
          <svg className="w-5 h-5 shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="font-semibold">{flashMessage}</div>
        </div>
      )}

      {/* API Error Box */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/25 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-400 shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h5 className="text-sm font-bold text-white">Connection Error</h5>
              <p className="text-xs text-slate-400 mt-0.5">Unable to load inventory. Check server status.</p>
            </div>
          </div>
          <button
            onClick={loadInventory}
            className="bg-rose-550/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 hover:border-transparent font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Summary Metrics Section (Visible only when not loading/error) */}
      {!loading && !error && items.length > 0 && (
        <InventoryStats items={items} />
      )}

      {/* Items Container View */}
      {loading ? (
        /* Skeleton Grid Loader */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : error ? (
        /* Fetch Error State Placeholder */
        <div className="bg-slate-900 border border-slate-805/80 p-12 rounded-2xl text-center flex flex-col items-center justify-center">
          <p className="text-xs text-slate-500 italic">Could not sync catalog with MongoDB Atlas.</p>
        </div>
      ) : items.length === 0 ? (
        /* Empty State */
        <InventoryEmptyState />
      ) : (
        /* Responsive Cards Grid Layout */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((item) => (
            <InventoryCard key={item._id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

export default Inventory;
