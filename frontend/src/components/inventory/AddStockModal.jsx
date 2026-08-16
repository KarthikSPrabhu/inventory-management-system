import React, { useState, useEffect } from 'react';
import { createStockInRecord } from '../../services/inventoryService';

/**
 * AddStockModal Component — Phase 11
 * 
 * Polished modal dialog for adding stock (restocking) to an existing inventory item.
 * Includes quantity validation, predefined & custom reason handling, optional notes,
 * and double submission protection.
 */
function AddStockModal({ item, isOpen, onClose, onSuccess }) {
  const [quantityAdd, setQuantityAdd] = useState(1);
  const [reason, setReason] = useState('Purchased');
  const [customReason, setCustomReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const PREDEFINED_REASONS = ['Purchased', 'Returned', 'Found', 'Transferred In', 'Correction', 'Other'];

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && item) {
      setQuantityAdd(1);
      setReason('Purchased');
      setCustomReason('');
      setNotes('');
      setErrorMsg('');
      setSubmitting(false);
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const currentStock = item.quantity || 0;
  const numQty = Number(quantityAdd);

  // Validation checks
  const isQtyValid = Number.isInteger(numQty) && numQty >= 1;
  const isReasonValid = reason === 'Other' ? Boolean(customReason.trim()) : Boolean(reason);
  const isFormValid = isQtyValid && isReasonValid && !submitting;

  let qtyError = '';
  if (quantityAdd !== '' && (!Number.isInteger(numQty) || numQty < 1)) {
    qtyError = 'Quantity must be a positive whole number.';
  }

  let reasonError = '';
  if (reason === 'Other' && !customReason.trim()) {
    reasonError = 'Please provide an explanation for "Other".';
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setSubmitting(true);
    setErrorMsg('');

    try {
      const response = await createStockInRecord({
        itemId: item._id,
        quantity: numQty,
        reason,
        customReason: customReason.trim(),
        notes: notes.trim()
      });

      if (response.success) {
        if (onSuccess) {
          onSuccess(response.message || `${numQty} ${item.name} unit(s) added to inventory.`, response.data);
        }
        onClose();
      } else {
        throw new Error(response.message || 'Unable to add stock.');
      }
    } catch (err) {
      console.error('Add Stock Error:', err);
      setErrorMsg(err.message || 'Unable to add stock. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={submitting ? undefined : onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10 animate-fadeIn max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-black text-white tracking-tight uppercase">ADD INVENTORY STOCK</h3>
              <p className="text-[11px] text-slate-400 font-semibold truncate max-w-[220px]">{item.name}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Banner */}
          {errorMsg && (
            <div className="bg-rose-500/10 border border-rose-500/25 p-3.5 rounded-xl text-rose-400 text-xs font-semibold flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Current Stock Banner */}
          <div className="bg-slate-950/60 border border-slate-850 p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Item Location</span>
              <span className="font-mono text-xs font-bold text-indigo-400 mt-0.5 block">📍 {item.location?.code}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Current Stock</span>
              <span className={`text-sm font-extrabold mt-0.5 block ${
                currentStock > 5 ? 'text-emerald-400' : currentStock > 0 ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {currentStock} {currentStock === 1 ? 'unit' : 'units'} available
              </span>
            </div>
          </div>

          {/* Quantity to Add Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">
              Quantity to Add <span className="text-emerald-400">*</span>
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={quantityAdd}
              onChange={(e) => setQuantityAdd(e.target.value)}
              disabled={submitting}
              placeholder="5"
              className={`w-full bg-slate-950 border rounded-xl px-4 py-2.5 text-sm font-bold text-white placeholder-slate-600 focus:outline-none transition-colors ${
                qtyError ? 'border-rose-500/70 focus:border-rose-500' : 'border-slate-800 focus:border-emerald-500'
              }`}
            />
            {qtyError && (
              <p className="text-[11px] font-semibold text-rose-400 px-1">{qtyError}</p>
            )}
          </div>

          {/* Reason Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">
              Reason <span className="text-emerald-400">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={submitting}
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none transition-colors cursor-pointer"
            >
              {PREDEFINED_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Explanation Input if "Other" is selected */}
          {reason === 'Other' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                Custom Explanation <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                disabled={submitting}
                placeholder="e.g. Received from lab hardware grant"
                className={`w-full bg-slate-950 border rounded-xl px-4 py-2 text-xs font-medium text-white placeholder-slate-600 focus:outline-none transition-colors ${
                  reasonError ? 'border-rose-500/70 focus:border-rose-500' : 'border-slate-800 focus:border-emerald-500'
                }`}
              />
              {reasonError && (
                <p className="text-[11px] font-semibold text-rose-400 px-1">{reasonError}</p>
              )}
            </div>
          )}

          {/* Notes (Optional) */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-300 block">
                Notes <span className="text-slate-500 font-normal">(optional)</span>
              </label>
              <span className="text-[10px] text-slate-500">{notes.length}/500</span>
            </div>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={submitting}
              placeholder="e.g. Bought for upcoming robotics project"
              maxLength={500}
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-600 focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Confirmation summary box */}
          {isQtyValid && isReasonValid && (
            <div className="bg-emerald-950/30 border border-emerald-500/20 p-3 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                Add <strong>+{numQty}</strong> units to <strong>{item.name}</strong> ({currentStock} → <strong>{currentStock + numQty}</strong> available)?
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!isFormValid}
              className={`font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2 ${
                isFormValid
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
              }`}
            >
              {submitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Adding Stock...</span>
                </>
              ) : (
                <span>Add Stock</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddStockModal;
