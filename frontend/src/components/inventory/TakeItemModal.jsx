import React, { useState, useEffect } from 'react';
import { createUsageRecord, getProjectSuggestions } from '../../services/inventoryService';
import CreateProjectModal from '../projects/CreateProjectModal';

/**
 * TakeItemModal Component — Phase 9
 * 
 * Polished modal dialog for withdrawing inventory items, offering project suggestions
 * ranked by previous item usage, search filtering, and seamless project creation.
 */
function TakeItemModal({ item, isOpen, onClose, onSuccess }) {
  const [quantityTake, setQuantityTake] = useState(1);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [notes, setNotes] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  // Embedded Create Project Modal state
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);

  // Reset form and fetch project suggestions when modal opens
  useEffect(() => {
    if (isOpen && item) {
      setQuantityTake(item.quantity > 0 ? 1 : 0);
      setSelectedProjectId('');
      setNotes('');
      setErrorMsg('');
      setSubmitting(false);
      setSearchFilter('');
      fetchSuggestions(item._id);
    }
  }, [isOpen, item]);

  const fetchSuggestions = async (itemId) => {
    setLoadingSuggestions(true);
    try {
      const response = await getProjectSuggestions(itemId);
      if (response.success && response.data) {
        setSuggestions(response.data);
        // Pre-select top suggestion if available
        if (response.data.length > 0) {
          setSelectedProjectId(response.data[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to load project suggestions:', err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  if (!isOpen || !item) return null;

  const availableQty = item.quantity || 0;
  const numQty = Number(quantityTake);

  // Validation checks
  const isQtyValid = Number.isInteger(numQty) && numQty >= 1 && numQty <= availableQty;
  const isProjectValid = Boolean(selectedProjectId);
  const isFormValid = isQtyValid && isProjectValid && availableQty > 0 && !submitting;

  let qtyError = '';
  if (numQty > availableQty) {
    qtyError = `Insufficient quantity. Only ${availableQty} unit(s) available.`;
  } else if (numQty < 1 && availableQty > 0) {
    qtyError = 'Quantity to take must be at least 1.';
  }

  // Filtered suggestions based on search query
  const filteredSuggestions = suggestions.filter(p => 
    p.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const selectedProject = suggestions.find(p => p._id === selectedProjectId);

  // Callback when a new project is created directly from Take Item modal
  const handleProjectCreated = (newProject) => {
    // Add new project to suggestions list ranked first and select it!
    const newEntry = {
      _id: newProject._id,
      name: newProject.name,
      description: newProject.description,
      status: newProject.status,
      usedBefore: false,
      reason: 'Newly created project'
    };

    setSuggestions(prev => [newEntry, ...prev]);
    setSelectedProjectId(newProject._id);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setSubmitting(true);
    setErrorMsg('');

    try {
      const response = await createUsageRecord({
        itemId: item._id,
        projectId: selectedProjectId,
        quantity: numQty,
        notes: notes.trim()
      });

      if (response.success) {
        const projName = selectedProject ? selectedProject.name : 'project';
        if (onSuccess) {
          onSuccess(response.message || `${numQty} unit(s) taken for ${projName}.`, response.data);
        }
        onClose();
      } else {
        throw new Error(response.message || 'Unable to complete the withdrawal.');
      }
    } catch (err) {
      console.error('Take Item error:', err);
      setErrorMsg(err.message || 'Unable to complete the withdrawal. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
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
              <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 12H4m8-8l-8 8 8 8" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-black text-white tracking-tight uppercase">TAKE INVENTORY</h3>
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

            {/* Stock Info */}
            <div className="bg-slate-950/60 border border-slate-850 p-3.5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Item Location</span>
                <span className="font-mono text-xs font-bold text-indigo-400 mt-0.5 block">📍 {item.location?.code}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Available Stock</span>
                <span className={`text-sm font-extrabold mt-0.5 block ${
                  availableQty > 5 ? 'text-emerald-400' : availableQty > 0 ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {availableQty} available
                </span>
              </div>
            </div>

            {/* Quantity Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                Quantity to Take <span className="text-indigo-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                max={availableQty}
                step="1"
                value={quantityTake}
                onChange={(e) => setQuantityTake(e.target.value)}
                disabled={submitting || availableQty === 0}
                placeholder="1"
                className={`w-full bg-slate-950 border rounded-xl px-4 py-2.5 text-sm font-bold text-white placeholder-slate-600 focus:outline-none transition-colors ${
                  qtyError ? 'border-rose-500/70 focus:border-rose-500' : 'border-slate-800 focus:border-indigo-500'
                }`}
              />
              {qtyError && (
                <p className="text-[11px] font-semibold text-rose-400 px-1">{qtyError}</p>
              )}
            </div>

            {/* Project Selector with Intelligent Suggestions */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-300 block">
                  Project <span className="text-indigo-400">*</span>
                </label>
                
                <button
                  type="button"
                  onClick={() => setIsCreateProjectOpen(true)}
                  className="text-[11px] font-extrabold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Create New Project</span>
                </button>
              </div>

              {loadingSuggestions ? (
                <div className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-500 animate-pulse">
                  Loading project suggestions...
                </div>
              ) : suggestions.length === 0 ? (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center space-y-2">
                  <p className="text-xs text-slate-400 font-medium">No active projects found.</p>
                  <button
                    type="button"
                    onClick={() => setIsCreateProjectOpen(true)}
                    className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-all"
                  >
                    + Create Project Now
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Select Dropdown */}
                  <select
                    value={selectedProjectId}
                    onChange={(e) => {
                      if (e.target.value === 'CREATE_NEW') {
                        setIsCreateProjectOpen(true);
                      } else {
                        setSelectedProjectId(e.target.value);
                      }
                    }}
                    disabled={submitting || availableQty === 0}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-colors cursor-pointer"
                  >
                    <option value="" disabled>Select a project...</option>
                    
                    {/* Ranked Suggestions */}
                    {suggestions.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.usedBefore ? `★ ${p.name} (Used ${item.name} before)` : p.name}
                      </option>
                    ))}

                    <option value="CREATE_NEW" className="text-indigo-400 font-bold">
                      + Create New Project...
                    </option>
                  </select>

                  {/* Highlighted reason badge */}
                  {selectedProject && (
                    <div className="flex items-center gap-1.5 px-1">
                      {selectedProject.usedBefore ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                          <span>★</span> Used {item.name} before
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-400">
                          Active Project
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

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
                disabled={submitting || availableQty === 0}
                placeholder="e.g. Vehicle prototype testing"
                maxLength={500}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-600 focus:outline-none transition-colors resize-none"
              />
            </div>

            {/* Confirmation summary box */}
            {isQtyValid && isProjectValid && selectedProject && (
              <div className="bg-indigo-950/30 border border-indigo-500/20 p-3 rounded-xl text-xs text-indigo-300 flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Take <strong>{numQty}</strong> × <strong>{item.name}</strong> for <strong>{selectedProject.name}</strong>?</span>
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
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                }`}
              >
                {submitting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Taking...</span>
                  </>
                ) : (
                  <span>Confirm Take</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Embedded Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        onSuccess={handleProjectCreated}
      />
    </>
  );
}

export default TakeItemModal;
