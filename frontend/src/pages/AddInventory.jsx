import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createItem } from '../services/inventoryService';

function AddInventory() {
  const navigate = useNavigate();
  
  // Field States
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('0');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [section, setSection] = useState('');
  const [storageUnit, setStorageUnit] = useState('');
  const [box, setBox] = useState('');
  const [image, setImage] = useState('');
  
  // UX States
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError] = useState('');

  // Auto-generate the location code based on: section + storageUnit + box
  // Section and code must be uppercase
  const sectionClean = section.trim().toUpperCase();
  const unitClean = storageUnit.trim();
  const boxClean = box.trim();
  const generatedCode = (sectionClean && unitClean && boxClean)
    ? `${sectionClean}${unitClean}${boxClean}`
    : '';

  // Local Form Validations
  const validateForm = () => {
    const errors = {};
    
    // 1. Name Check
    if (!name.trim()) {
      errors.name = 'Item name is required';
    } else if (name.length > 100) {
      errors.name = 'Item name cannot exceed 100 characters';
    }

    // 2. Quantity Check (Positive Integer only)
    const qVal = Number(quantity);
    if (quantity === '' || isNaN(qVal)) {
      errors.quantity = 'Quantity must be a valid number';
    } else if (!Number.isInteger(qVal)) {
      errors.quantity = 'Quantity must be a whole number (no decimals)';
    } else if (qVal < 0) {
      errors.quantity = 'Quantity cannot be negative';
    }

    // Low Stock Threshold Check (Integer >= 0)
    const tVal = Number(lowStockThreshold);
    if (lowStockThreshold !== '' && (isNaN(tVal) || !Number.isInteger(tVal) || tVal < 0)) {
      errors.lowStockThreshold = 'Threshold must be a whole number >= 0';
    }

    // 3. Location Section Check
    if (!sectionClean) {
      errors.section = 'Section is required';
    }

    // 4. Location Storage Unit Check (Integer >= 1)
    const suVal = Number(unitClean);
    if (!unitClean || isNaN(suVal)) {
      errors.storageUnit = 'Storage unit is required';
    } else if (!Number.isInteger(suVal) || suVal < 1) {
      errors.storageUnit = 'Storage unit must be an integer >= 1';
    }

    // 5. Location Box Check (Integer >= 1)
    const bxVal = Number(boxClean);
    if (!boxClean || isNaN(bxVal)) {
      errors.box = 'Box is required';
    } else if (!Number.isInteger(bxVal) || bxVal < 1) {
      errors.box = 'Box must be an integer >= 1';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    const payload = {
      name: name.trim(),
      quantity: parseInt(quantity, 10),
      lowStockThreshold: lowStockThreshold !== '' ? parseInt(lowStockThreshold, 10) : 5,
      image: image.trim(),
      location: {
        section: sectionClean,
        storageUnit: parseInt(unitClean, 10),
        box: parseInt(boxClean, 10),
        code: generatedCode
      }
    };

    try {
      await createItem(payload);
      // Success redirection with a state flash message if necessary
      navigate('/inventory', { state: { flash: `"${payload.name}" was added successfully.` } });
    } catch (err) {
      console.error(err);
      setApiError(err.message || 'Unable to add item. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fadeIn">
      {/* Title */}
      <div>
        <h3 className="text-2xl font-bold text-white tracking-tight">Add Inventory Item</h3>
        <p className="text-xs text-slate-400 mt-1">Register a new item and track its location details.</p>
      </div>

      {/* Global API Error Banner */}
      {apiError && (
        <div className="bg-rose-500/10 border border-rose-500/25 text-rose-450 p-4 rounded-xl text-xs flex gap-3 items-center">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <span className="font-bold">Error:</span> {apiError}
          </div>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
        
        {/* Item Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-350 uppercase tracking-wide">Item Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            placeholder="e.g. Raspberry Pi 4 Model B"
            className={`w-full bg-slate-950 border rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors ${
              fieldErrors.name ? 'border-rose-500/50' : 'border-slate-800'
            }`}
          />
          {fieldErrors.name && (
            <p className="text-[11px] text-rose-450 font-medium">{fieldErrors.name}</p>
          )}
        </div>

        {/* Quantity & Low Stock Threshold */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-350 uppercase tracking-wide">Stock Quantity *</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={loading}
              min="0"
              step="1"
              className={`w-full bg-slate-950 border rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors ${
                fieldErrors.quantity ? 'border-rose-500/50' : 'border-slate-800'
              }`}
            />
            {fieldErrors.quantity && (
              <p className="text-[11px] text-rose-450 font-medium">{fieldErrors.quantity}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-350 uppercase tracking-wide">Low Stock Threshold</label>
            <input
              type="number"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
              disabled={loading}
              min="0"
              step="1"
              placeholder="5"
              className={`w-full bg-slate-950 border rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors ${
                fieldErrors.lowStockThreshold ? 'border-rose-500/50' : 'border-slate-800'
              }`}
            />
            {fieldErrors.lowStockThreshold ? (
              <p className="text-[11px] text-rose-450 font-medium">{fieldErrors.lowStockThreshold}</p>
            ) : (
              <p className="text-[10px] text-slate-500 font-medium">Default: 5 units. Triggers Low Stock alert when stock $\le$ threshold.</p>
            )}
          </div>
        </div>

        {/* Location Section Header */}
        <div className="pt-2 border-t border-slate-800/60">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Storage coordinates
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Location Section */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Section *</label>
              <input
                type="text"
                maxLength="3"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                disabled={loading}
                placeholder="e.g. A"
                className={`w-full bg-slate-950 border rounded-xl px-4 py-2.5 text-sm text-slate-100 uppercase placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors ${
                  fieldErrors.section ? 'border-rose-500/50' : 'border-slate-800'
                }`}
              />
              {fieldErrors.section && (
                <p className="text-[10px] text-rose-450 font-medium">{fieldErrors.section}</p>
              )}
            </div>

            {/* Storage Unit */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Storage Unit *</label>
              <input
                type="number"
                min="1"
                step="1"
                value={storageUnit}
                onChange={(e) => setStorageUnit(e.target.value)}
                disabled={loading}
                placeholder="e.g. 3"
                className={`w-full bg-slate-950 border rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors ${
                  fieldErrors.storageUnit ? 'border-rose-500/50' : 'border-slate-800'
                }`}
              />
              {fieldErrors.storageUnit && (
                <p className="text-[10px] text-rose-450 font-medium">{fieldErrors.storageUnit}</p>
              )}
            </div>

            {/* Box */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Box Number *</label>
              <input
                type="number"
                min="1"
                step="1"
                value={box}
                onChange={(e) => setBox(e.target.value)}
                disabled={loading}
                placeholder="e.g. 19"
                className={`w-full bg-slate-950 border rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors ${
                  fieldErrors.box ? 'border-rose-500/50' : 'border-slate-800'
                }`}
              />
              {fieldErrors.box && (
                <p className="text-[10px] text-rose-450 font-medium">{fieldErrors.box}</p>
              )}
            </div>
          </div>
        </div>

        {/* Generated Location Code (Read-Only) */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-350 uppercase tracking-wide">Generated Location Code</label>
          <div className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-sm text-indigo-400 font-mono font-bold select-all flex items-center min-h-[42px]">
            {generatedCode || <span className="text-slate-600 font-sans font-normal italic">Fill coordinates to build location code...</span>}
          </div>
        </div>

        {/* Optional Image URL */}
        <div className="pt-2 border-t border-slate-800/60 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-350 uppercase tracking-wide">Image URL (Optional)</label>
            <input
              type="url"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              disabled={loading}
              placeholder="e.g. https://example.com/item.jpg"
              className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Image Preview Window */}
          <div className="bg-slate-950/50 border border-slate-850 rounded-xl p-4 flex items-center gap-4">
            <div className="h-16 w-16 bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
              {image.trim() ? (
                <img
                  src={image.trim()}
                  alt="Item preview"
                  onError={(e) => {
                    // Fallback on broken image load
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                  className="h-full w-full object-cover"
                />
              ) : null}
              <div
                style={{ display: image.trim() ? 'none' : 'block' }}
                className="text-slate-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 00-2 2z" />
                </svg>
              </div>
            </div>
            <div>
              <h5 className="text-xs font-bold text-slate-300">Live Preview</h5>
              <p className="text-[10px] text-slate-500 mt-0.5">Supply an image URL to load the product preview window.</p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-sm px-6 py-3 rounded-xl transition-all shadow-lg shadow-indigo-650/20 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Adding Item...</span>
              </>
            ) : (
              <span>Add Item</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddInventory;
