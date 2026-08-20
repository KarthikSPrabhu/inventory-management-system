import React, { useState, useEffect } from 'react';
import { moveInventoryItem } from '../../services/inventoryService';
import LocationSelector from '../storage/LocationSelector';

/**
 * MoveItemModal Component
 * 
 * Allows users to move stock of an item from one specific physical location to another.
 */
function MoveItemModal({ item, isOpen, onClose, onSuccess }) {
  const [sourceLocationId, setSourceLocationId] = useState('');
  const [destinationLocationId, setDestinationLocationId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen && item) {
      setSourceLocationId(item.locations && item.locations.length > 0 ? item.locations[0].node?._id || '' : '');
      setDestinationLocationId('');
      setQuantity(1);
      setErrorMsg('');
      setSubmitting(false);
    }
  }, [isOpen, item]);

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

  if (!isOpen || !item) return null;

  // Find max available at the selected source location
  const sourceLocObj = item.locations?.find(l => l.node?._id === sourceLocationId);
  const maxAvailable = sourceLocObj ? sourceLocObj.quantity : 0;
  
  const numQty = Number(quantity);
  const isQtyValid = Number.isInteger(numQty) && numQty >= 1 && numQty <= maxAvailable;
  const isSourceValid = Boolean(sourceLocationId);
  const isDestValid = Boolean(destinationLocationId) && destinationLocationId !== sourceLocationId;
  const isFormValid = isQtyValid && isSourceValid && isDestValid && !submitting;

  let qtyError = '';
  if (numQty > maxAvailable) {
    qtyError = `Only ${maxAvailable} unit(s) available to move from this location.`;
  } else if (numQty < 1 && maxAvailable > 0) {
    qtyError = 'Quantity must be at least 1.';
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setSubmitting(true);
    setErrorMsg('');

    try {
      const response = await moveInventoryItem(item._id, {
        fromLocationId: sourceLocationId,
        toLocationId: destinationLocationId,
        quantity: numQty
      });

      if (response.success) {
        if (onSuccess) {
          onSuccess(response.message || `Successfully moved ${numQty} units.`);
        }
        onClose();
      } else {
        throw new Error(response.message || 'Unable to move item.');
      }
    } catch (err) {
      console.error('Move Item Error:', err);
      setErrorMsg(err.message || 'Unable to move item. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      <div className="fixed inset-0 bg-white backdrop-blur-sm transition-opacity" onClick={submitting ? undefined : onClose} />

      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-10 animate-fadeIn max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase">MOVE STOCK</h3>
              <p className="text-[11px] text-slate-500 font-semibold truncate max-w-[220px]">{item.name}</p>
            </div>
          </div>

          <button onClick={onClose} disabled={submitting} className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl text-rose-600 text-xs font-semibold flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Source Location */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 block">Move From (Source) <span className="text-amber-600">*</span></label>
            <LocationSelector 
              value={sourceLocationId} 
              onChange={setSourceLocationId} 
              disabled={submitting || !item.locations || item.locations.length === 0} 
              filterExistingItemLocations={item.locations} 
            />
          </div>

          {/* Quantity */}
          <div className="space-y-1.5">
            <div className="flex justify-between">
               <label className="text-xs font-bold text-slate-600 block">Quantity to Move <span className="text-amber-600">*</span></label>
               <span className="text-[10px] font-bold text-slate-500">Max: {maxAvailable}</span>
            </div>
            <input
              type="number"
              min="1"
              max={maxAvailable}
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={submitting || maxAvailable === 0}
              className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none transition-colors ${qtyError ? 'border-rose-500/70 focus:border-rose-500' : 'border-slate-200 focus:border-amber-500'}`}
            />
            {qtyError && <p className="text-[11px] font-semibold text-rose-600 px-1">{qtyError}</p>}
          </div>

          {/* Destination Location */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 block">Move To (Destination) <span className="text-amber-600">*</span></label>
            <LocationSelector 
              value={destinationLocationId} 
              onChange={setDestinationLocationId} 
              disabled={submitting} 
            />
            {destinationLocationId === sourceLocationId && destinationLocationId !== '' && (
              <p className="text-[11px] font-semibold text-rose-600 px-1">Source and destination cannot be the same.</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={onClose} disabled={submitting} className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-900 font-bold text-xs px-4 py-2.5 rounded-xl transition-all">Cancel</button>
            <button type="submit" disabled={!isFormValid} className={`font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2 ${isFormValid ? 'bg-amber-500 hover:bg-amber-400 text-slate-900 shadow-amber-500/30 cursor-pointer' : 'bg-slate-100 text-slate-500 border border-slate-300 cursor-not-allowed'}`}>
              {submitting ? 'Moving...' : 'Move Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default MoveItemModal;
