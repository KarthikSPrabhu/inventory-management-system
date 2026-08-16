import React, { useState, useEffect } from 'react';
import { getBuyList, updateBuyListItem, deleteBuyListItem } from '../services/buyListService';
import AddBuyListModal from '../components/buylist/AddBuyListModal';
import { useAuth } from '../context/AuthContext';

function BuyListPage() {
  const { user, isAdmin } = useAuth();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [flashMessage, setFlashMessage] = useState('');

  // Delete Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadBuyList = async (search = '') => {
    try {
      setLoading(true);
      setError('');
      const res = await getBuyList(search);
      if (res.success) {
        setItems(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load buy list:', err);
      setError('Unable to load buy list items. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBuyList(searchQuery);
  }, [searchQuery]);

  // Flash message auto-clear
  useEffect(() => {
    if (flashMessage) {
      const timer = setTimeout(() => setFlashMessage(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [flashMessage]);

  const handleToggleStatus = async (item) => {
    const newStatus = item.status === 'BOUGHT' ? 'NEEDED' : 'BOUGHT';
    try {
      const res = await updateBuyListItem(item._id, { status: newStatus });
      if (res.success) {
        setFlashMessage(`"${item.name}" marked as ${newStatus}.`);
        loadBuyList(searchQuery);
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
      setFlashMessage('Unable to update status.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const res = await deleteBuyListItem(deleteTarget._id);
      if (res.success) {
        setFlashMessage(`"${deleteTarget.name}" removed from Buy List.`);
        setDeleteTarget(null);
        loadBuyList(searchQuery);
      }
    } catch (err) {
      console.error('Failed to delete buy list item:', err);
      setError(err.message || 'Unable to delete buy list item.');
    } finally {
      setDeleting(false);
    }
  };

  const handleAddSuccess = (msg) => {
    setFlashMessage(msg);
    loadBuyList(searchQuery);
  };

  const neededCount = items.filter(i => i.status === 'NEEDED').length;
  const boughtCount = items.filter(i => i.status === 'BOUGHT').length;

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">BUY LIST</h3>
          <p className="text-xs text-slate-500 mt-1">Note items you want to purchase in the future.</p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center gap-2 justify-center bg-indigo-600 hover:bg-indigo-50 text-slate-900 font-extrabold text-xs px-5 py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/25 hover:shadow-indigo-500/40 shrink-0 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
            </svg>
            <span>Add to Buy List</span>
          </button>
        )}
      </div>

      {/* Flash Success Alert */}
      {flashMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 p-4 rounded-xl text-xs flex gap-3 items-center">
          <svg className="w-5 h-5 shrink-0 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="font-semibold">{flashMessage}</div>
        </div>
      )}

      {/* API Error Alert */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-450 p-4 rounded-xl text-xs flex gap-3 items-center">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="font-semibold">{error}</div>
        </div>
      )}

      {/* Summary Badges & Prominent Search Input */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search buy list items..."
            className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-2xl pl-12 pr-10 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition-colors shadow-md"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Counter Pills */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="bg-amber-50 border border-amber-200 text-amber-600 font-extrabold text-xs px-3.5 py-2 rounded-xl">
            {neededCount} NEEDED
          </span>
          <span className="bg-emerald-50 border border-emerald-200 text-emerald-600 font-extrabold text-xs px-3.5 py-2 rounded-xl">
            {boughtCount} BOUGHT
          </span>
        </div>
      </div>

      {/* Main Content Grid / Empty State */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl h-36 animate-pulse" />
          <div className="bg-white border border-slate-200 rounded-2xl h-36 animate-pulse" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center text-indigo-600 border border-slate-200">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <h4 className="text-base font-bold text-slate-900">
            {searchQuery ? `No items found matching "${searchQuery}"` : 'Your buy list is empty'}
          </h4>
          <p className="text-xs text-slate-500 max-w-sm">
            {searchQuery ? 'Try searching for another item name or clear your search query.' : 'Add items you plan to purchase later for your robotics or electronics projects.'}
          </p>
          {isAdmin && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-50 text-slate-900 font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/25 cursor-pointer mt-2"
            >
              + Add to Buy List
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => {
            const isBought = item.status === 'BOUGHT';
            return (
              <div
                key={item._id}
                className={`bg-white border-2 rounded-2xl p-5 shadow-md flex flex-col justify-between space-y-4 transition-all ${
                  isBought ? 'border-slate-200 opacity-75' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Header Row */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className={`text-base font-extrabold text-slate-900 ${isBought ? 'line-through text-slate-500' : ''}`}>
                        {item.name}
                      </h4>
                      
                      {/* Optional Inventory Connection Badge */}
                      {item.inventoryStock !== null && item.inventoryStock !== undefined ? (
                        <span className="font-mono text-[11px] font-semibold text-indigo-600 mt-1 inline-block bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                          Inventory stock: {item.inventoryStock} available {item.inventoryLocation ? `(📍 ${item.inventoryLocation})` : ''}
                        </span>
                      ) : null}
                    </div>

                    {/* Status Badge */}
                    <span className={`px-2.5 py-1 rounded-xl text-xs font-black shrink-0 border ${
                      isBought
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        : 'bg-amber-50 text-amber-600 border-amber-200'
                    }`}>
                      {isBought ? '✓ BOUGHT' : 'NEEDED'}
                    </span>
                  </div>

                  {/* Quantity & Note */}
                  <div className="bg-slate-100 border border-slate-200 p-3 rounded-xl space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Quantity Needed:</span>
                      <span className="font-black text-slate-900">{item.quantityNeeded} units</span>
                    </div>
                    {item.note && (
                      <div className="text-slate-500 pt-1 border-t border-slate-200 italic text-[11px]">
                        "{item.note}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Action Bar */}
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200">
                  {/* Toggle Status Button */}
                  <button
                    onClick={() => handleToggleStatus(item)}
                    className={`font-bold text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                      isBought
                        ? 'bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600'
                        : 'bg-emerald-600/15 hover:bg-emerald-600 text-emerald-300 hover:text-slate-900 border border-emerald-300'
                    }`}
                  >
                    {isBought ? (
                      <span>Mark as Needed</span>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Mark as Bought</span>
                      </>
                    )}
                  </button>

                  {/* Delete Button (Admin only) */}
                  {isAdmin && (
                    <button
                      onClick={() => setDeleteTarget(item)}
                      title="Remove from Buy List"
                      className="bg-rose-50 hover:bg-rose-50 border border-rose-200 text-rose-600 hover:text-slate-900 p-2 rounded-xl transition-all cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      <AddBuyListModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
          <div
            className="fixed inset-0 bg-white backdrop-blur-sm"
            onClick={() => !deleting && setDeleteTarget(null)}
          />
          <div className="relative w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl z-10 space-y-4 animate-fadeIn">
            <h4 className="text-sm font-bold text-slate-900">Remove from Buy List?</h4>
            <p className="text-xs text-slate-500">
              Are you sure you want to remove <strong className="text-slate-900">"{deleteTarget.name}"</strong> from your Buy List?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold text-xs px-4 py-2 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="bg-rose-600 hover:bg-rose-50 text-slate-900 font-extrabold text-xs px-4 py-2 rounded-xl transition-all shadow-lg shadow-rose-600/25 cursor-pointer"
              >
                {deleting ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BuyListPage;
