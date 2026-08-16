import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getInventoryItemById, getItemUsageRecords, deleteInventoryItem } from '../services/inventoryService';
import LocationDisplay from '../components/inventory/LocationDisplay';
import AddStockModal from '../components/inventory/AddStockModal';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function InventoryDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [item, setItem] = useState(null);
  const [activityHistory, setActivityHistory] = useState([]);
  const [usageSummary, setUsageSummary] = useState({
    currentStock: 0,
    totalAdded: 0,
    totalUnitsUsed: 0,
    projectsCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [usageLoading, setUsageLoading] = useState(true);
  const [error, setError] = useState('');
  const [usageError, setUsageError] = useState('');

  // Add Stock Modal State
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [flashMessage, setFlashMessage] = useState('');

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

  const fetchItemUsage = async () => {
    setUsageLoading(true);
    setUsageError('');
    try {
      const response = await getItemUsageRecords(id);
      if (response.success) {
        setActivityHistory(response.data || []);
        if (response.summary) {
          setUsageSummary(response.summary);
        } else {
          // Fallback calculation
          let totalUsed = 0;
          let totalAdded = 0;
          const projects = new Set();
          (response.data || []).forEach(r => {
            if (r.type === 'stock_in') {
              totalAdded += Number(r.quantity) || 0;
            } else {
              totalUsed += Number(r.quantity) || 0;
              if (r.project) projects.add(r.project._id || r.project);
            }
          });
          setUsageSummary({
            currentStock: item ? item.quantity : 0,
            totalAdded,
            totalUnitsUsed: totalUsed,
            projectsCount: projects.size
          });
        }
      } else {
        throw new Error(response.message || 'Unable to load activity history.');
      }
    } catch (err) {
      console.error('Fetch item usage error:', err);
      setUsageError(err.message || 'Unable to load item activity.');
    } finally {
      setUsageLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchItemDetails();
      fetchItemUsage();
    }
  }, [id]);

  const handleAddStockSuccess = (msg) => {
    setFlashMessage(msg);
    fetchItemDetails();
    fetchItemUsage();
    setTimeout(() => setFlashMessage(''), 5000);
  };

  const handleDeleteItem = async () => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await deleteInventoryItem(id);
      navigate('/inventory', { state: { flash: `"${name}" was deleted.` } });
    } catch (err) {
      alert(err.message || 'Failed to delete item.');
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center flex flex-col items-center justify-center gap-3 animate-fadeIn">
        <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="text-xs text-slate-500 font-medium">Loading item records...</span>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center flex flex-col items-center justify-center space-y-4 max-w-lg mx-auto animate-fadeIn">
        <div className="h-12 w-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-900">Failed to retrieve item</h4>
          <p className="text-xs text-slate-500 mt-1">{error || 'This item may have been removed or does not exist.'}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchItemDetails}
            className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold text-xs px-4 py-2.5 rounded-xl transition-all"
          >
            Try Again
          </button>
          <Link
            to="/inventory"
            className="bg-indigo-600 hover:bg-indigo-50 text-slate-900 font-bold text-xs px-4 py-2.5 rounded-xl transition-all"
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
    stockBadgeClass = 'bg-emerald-50 text-emerald-600 border-emerald-200';
    stockText = `${quantity} available (In Stock)`;
  } else if (quantity > 0) {
    stockBadgeClass = 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse';
    stockText = `${quantity} available (Low Stock)`;
  } else {
    stockBadgeClass = 'bg-rose-50 text-rose-450 border-rose-200';
    stockText = '0 available (Out of Stock)';
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fadeIn pb-12">
      {/* Navigation link & Action */}
      <div className="flex items-center justify-between">
        <Link
          to="/inventory"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to Catalog</span>
        </Link>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddStockOpen(true)}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-50 text-slate-900 font-extrabold text-xs px-4 py-2 rounded-xl transition-all shadow-md cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
              </svg>
              <span>+ Add Stock</span>
            </button>

            <button
              onClick={handleDeleteItem}
              className="inline-flex items-center gap-1 bg-rose-100 hover:bg-rose-50 text-rose-600 hover:text-slate-900 border border-rose-300 text-xs font-extrabold px-3 py-2 rounded-xl transition-all cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>

      {/* Flash Success Notification */}
      {flashMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 p-4 rounded-xl text-xs flex gap-3 items-center">
          <svg className="w-5 h-5 shrink-0 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="font-semibold">{flashMessage}</div>
        </div>
      )}

      {/* Item Summary Cards (Requirement 17) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-md">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Current Stock</span>
          <span className="text-2xl font-black text-emerald-600 font-mono mt-1 block">
            {quantity}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">Units available</span>
        </div>

        <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-md">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Added</span>
          <span className="text-2xl font-black text-emerald-600 font-mono mt-1 block">
            {usageSummary.totalAdded}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">Total units ever restocked</span>
        </div>

        <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-md">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Used</span>
          <span className="text-2xl font-black text-rose-600 font-mono mt-1 block">
            {usageSummary.totalUnitsUsed}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">Total units ever withdrawn</span>
        </div>
      </div>

      {/* Structured splits container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left / Middle: Item Details Visual Card */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl flex flex-col">
          {/* Image Display */}
          <div className="h-64 sm:h-80 bg-white border-b border-slate-200 flex items-center justify-center relative overflow-hidden select-none">
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
              className="absolute inset-0 flex flex-col items-center justify-center text-slate-700 bg-slate-50"
            >
              <svg className="w-16 h-16 stroke-[1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-600 mt-2">No Image Provided</span>
            </div>
          </div>

          {/* Texts & Stats content */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="space-y-3">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">{name}</h3>
              
              <div className="flex">
                <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-lg text-xs font-semibold border ${stockBadgeClass}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    quantity > 5 ? 'bg-emerald-400' : quantity > 0 ? 'bg-amber-400' : 'bg-rose-50'
                  }`}></span>
                  {stockText}
                </span>
              </div>
            </div>

            {/* Time Metrics Logs */}
            <div className="pt-4 border-t border-slate-200 space-y-1.5 text-xs text-slate-500">
              <div className="flex justify-between">
                <span>Date Created:</span>
                <span className="font-semibold text-slate-500">{new Date(createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Last Updated:</span>
                <span className="font-semibold text-slate-500">{new Date(updatedAt).toLocaleString()}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setIsAddStockOpen(true)}
                className="flex-1 bg-emerald-600 hover:bg-emerald-50 text-slate-900 font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
                </svg>
                <span>+ Add Stock</span>
              </button>
              
              <Link
                to="/inventory"
                className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold text-xs px-4 py-2.5 rounded-xl transition-all text-center flex items-center justify-center"
              >
                Back to Inventory Workspace
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column: Visual Location Display Map */}
        <div className="flex flex-col items-center">
          <LocationDisplay location={itemLocation} />
        </div>
      </div>

      {/* ACTIVITY HISTORY Section (Stock In 🟢 and Stock Out 🔴) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight uppercase">ACTIVITY HISTORY</h3>
            <p className="text-xs text-slate-500 mt-0.5">Chronological log of restocks and withdrawals for {name}</p>
          </div>
          <Link
            to="/history"
            className="text-xs font-extrabold text-indigo-600 hover:text-indigo-300 transition-colors flex items-center gap-1"
          >
            <span>View All History</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {usageLoading ? (
          <div className="py-8 text-center flex flex-col items-center justify-center gap-2">
            <svg className="animate-spin h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-xs text-slate-500">Loading item activity...</span>
          </div>
        ) : usageError ? (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-center space-y-2">
            <p className="text-xs text-rose-600 font-semibold">{usageError}</p>
            <button
              onClick={fetchItemUsage}
              className="text-xs font-bold text-slate-600 underline hover:text-slate-900"
            >
              Try Again
            </button>
          </div>
        ) : activityHistory.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs font-medium">
            NO ACTIVITY YET
          </div>
        ) : (
          <div className="space-y-3">
            {activityHistory.map((rec) => {
              const isStockIn = rec.type === 'stock_in';
              const projName = rec.project?.name || 'Unassigned Project';
              const projId = rec.project?._id;
              const locationCode = rec.location || itemLocation?.code || 'N/A';

              return (
                <div
                  key={rec._id}
                  className="bg-slate-100 border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-black uppercase px-2 py-0.5 rounded ${
                        isStockIn
                          ? 'bg-emerald-100 text-emerald-600 border border-emerald-300'
                          : 'bg-indigo-100 text-indigo-600 border border-indigo-300'
                      }`}>
                        {isStockIn ? '🟢 Stock Added' : '🔴 Withdrawal'}
                      </span>

                      {isStockIn ? (
                        <span className="text-xs font-bold text-slate-600">
                          Reason: <span className="text-slate-900">{rec.reason}</span>
                        </span>
                      ) : (
                        <>
                          {projId ? (
                            <Link
                              to={`/projects/${projId}`}
                              className="text-xs font-bold text-indigo-600 hover:underline"
                            >
                              {projName}
                            </Link>
                          ) : (
                            <span className="text-xs font-bold text-slate-600">{projName}</span>
                          )}
                          <span className="font-mono text-[11px] font-bold text-slate-500">
                            📍 {locationCode}
                          </span>
                        </>
                      )}
                    </div>

                    {rec.notes && (
                      <p className="text-xs text-slate-500 italic">"{rec.notes}"</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    <span className={`text-xs font-bold font-mono ${
                      isStockIn ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {isStockIn ? `+${rec.quantity}` : `−${rec.quantity}`} {rec.quantity === 1 ? 'unit' : 'units'}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      {formatDate(rec.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Stock Modal */}
      <AddStockModal
        item={item}
        isOpen={isAddStockOpen}
        onClose={() => setIsAddStockOpen(false)}
        onSuccess={handleAddStockSuccess}
      />
    </div>
  );
}

export default InventoryDetails;
