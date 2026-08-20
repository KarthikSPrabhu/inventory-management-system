import React, { useState, useEffect } from 'react';
import { createBuyListItem } from '../../services/buyListService';

/**
 * AddBuyListModal Component
 * 
 * Dialog for adding items to the Buy List.
 */
function AddBuyListModal({ isOpen, onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [quantityNeeded, setQuantityNeeded] = useState(1);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName('');
      setQuantityNeeded(1);
      setNote('');
      setErrorMsg('');
      setSubmitting(false);
    }
  }, [isOpen]);

  // Escape key listener to close modal safely
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !submitting && onClose) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, submitting, onClose]);

  if (!isOpen) return null;

  const numQty = Number(quantityNeeded);
  const isFormValid = name.trim().length > 0 && Number.isInteger(numQty) && numQty >= 1 && !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setSubmitting(true);
    setErrorMsg('');

    try {
      const response = await createBuyListItem({
        name: name.trim(),
        quantityNeeded: numQty,
        note: note.trim()
      });

      if (response.success) {
        if (onSuccess) {
          onSuccess(response.message || `"${name.trim()}" added to Buy List.`, response.data);
        }
        onClose();
      } else {
        throw new Error(response.message || 'Unable to add item to Buy List.');
      }
    } catch (err) {
      console.error('Add Buy List Item Error:', err);
      setErrorMsg(err.message || 'Unable to add item to Buy List.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-white backdrop-blur-sm transition-opacity"
        onClick={submitting ? undefined : onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-10 animate-fadeIn max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 border border-indigo-300 flex items-center justify-center text-indigo-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">ADD TO BUY LIST</h3>
              <p className="text-[11px] text-slate-500">Note an item you need to purchase later.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-slate-500 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Item Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Item Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
              placeholder="e.g. ESP32 DevKit V1"
              required
              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition-colors"
            />
          </div>

          {/* Quantity Needed */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Quantity Needed *</label>
            <input
              type="number"
              min="1"
              step="1"
              value={quantityNeeded}
              onChange={(e) => setQuantityNeeded(e.target.value)}
              disabled={submitting}
              required
              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none transition-colors"
            />
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Note (Optional)</label>
            <textarea
              rows="3"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={submitting}
              placeholder="e.g. For smart robotics project"
              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-650 focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold text-xs px-4 py-2.5 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isFormValid}
              className="bg-indigo-600 hover:bg-indigo-50 disabled:bg-slate-100 disabled:text-slate-600 text-slate-900 font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/25 flex items-center gap-1.5 cursor-pointer"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-slate-900" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Adding...</span>
                </>
              ) : (
                <span>Add to Buy List</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddBuyListModal;
