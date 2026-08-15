import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { getItems } from '../services/inventoryService';

function Inventory() {
  const routerLocation = useLocation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flashMessage, setFlashMessage] = useState('');

  // Read success flash message from redirection state
  useEffect(() => {
    if (routerLocation.state && routerLocation.state.flash) {
      setFlashMessage(routerLocation.state.flash);
      
      // Clear history state to avoid flash message on manual reload
      window.history.replaceState({}, document.title);
      
      // Auto dismiss message after 5 seconds
      const timer = setTimeout(() => {
        setFlashMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [routerLocation]);

  useEffect(() => {
    const fetchAllItems = async () => {
      try {
        const response = await getItems();
        if (response.success) {
          setItems(response.data);
        }
      } catch (err) {
        console.error(err);
        setError(err.message || 'Failed to load inventory items');
      } finally {
        setLoading(false);
      }
    };

    fetchAllItems();
  }, []);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-white tracking-tight">Inventory Catalog</h3>
          <p className="text-xs text-slate-400 mt-1">Review currently registered inventory items and coordinates.</p>
        </div>
        <Link
          to="/inventory/add"
          className="inline-flex items-center gap-1.5 justify-center bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-650/15"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          Add Item
        </Link>
      </div>

      {/* Success Notification Banner */}
      {flashMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-450 p-4 rounded-xl text-xs flex gap-3 items-center">
          <svg className="w-5 h-5 shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="font-medium">{flashMessage}</div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/25 text-rose-455 p-4 rounded-xl text-xs flex gap-3 items-center">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>{error}</div>
        </div>
      )}

      {/* Loader */}
      {loading ? (
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3">
          <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-xs text-slate-500 font-medium">Fetching catalog from MongoDB Atlas...</span>
        </div>
      ) : items.length === 0 ? (
        /* Empty State */
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4">
          <div className="h-14 w-14 rounded-full bg-slate-950 flex items-center justify-center text-slate-600 border border-slate-850">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">No items found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">Inventory items will appear here once registered.</p>
          </div>
          <Link
            to="/inventory/add"
            className="bg-indigo-650 hover:bg-indigo-600 text-white font-medium text-xs px-4 py-2 rounded-xl transition-all shadow-md"
          >
            Create your first item
          </Link>
        </div>
      ) : (
        /* Table Layout (Premium catalog view) */
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/40 border-b border-slate-800/80">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Preview</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Item Name</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Qty</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Location Details</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Location Code</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/60">
                {items.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-950/20 transition-colors">
                    {/* Image Preview */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-10 w-10 bg-slate-950 border border-slate-800 rounded-lg overflow-hidden flex items-center justify-center">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'block';
                            }}
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                        <div
                          style={{ display: item.image ? 'none' : 'block' }}
                          className="text-slate-700"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 00-2 2z" />
                          </svg>
                        </div>
                      </div>
                    </td>
                    
                    {/* Item Name */}
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-slate-105">{item.name}</div>
                    </td>

                    {/* Quantity */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        item.quantity === 0 
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                          : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      }`}>
                        {item.quantity}
                      </span>
                    </td>

                    {/* Location coordinates details */}
                    <td className="px-6 py-4 whitespace-nowrap text-center text-xs text-slate-400">
                      <div className="flex justify-center items-center gap-4">
                        <span>Sec: <strong className="text-white">{item.location?.section}</strong></span>
                        <span className="text-slate-800">|</span>
                        <span>Unit: <strong className="text-white">{item.location?.storageUnit}</strong></span>
                        <span className="text-slate-800">|</span>
                        <span>Box: <strong className="text-white">{item.location?.box}</strong></span>
                      </div>
                    </td>

                    {/* Location Code */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-xs font-bold text-indigo-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-850">
                        {item.location?.code}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default Inventory;
