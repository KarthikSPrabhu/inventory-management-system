import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createItem } from '../services/inventoryService';

function AddInventory() {
  const navigate = useNavigate();
  
  // Field States
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Microcontrollers');
  const [quantity, setQuantity] = useState('0');
  const [minimumStock, setMinimumStock] = useState('5');
  const [maximumStock, setMaximumStock] = useState('0');
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

    // Minimum Stock Check (Integer >= 0)
    const tVal = Number(minimumStock);
    if (minimumStock !== '' && (isNaN(tVal) || !Number.isInteger(tVal) || tVal < 0)) {
      errors.minimumStock = 'Minimum stock must be a whole number >= 0';
    }

    // Maximum Stock Check (Integer >= 0)
    const mVal = Number(maximumStock);
    if (maximumStock !== '' && (isNaN(mVal) || !Number.isInteger(mVal) || mVal < 0)) {
      errors.maximumStock = 'Maximum stock must be a whole number >= 0';
    }
    
    if (mVal > 0 && tVal > mVal) {
      errors.minimumStock = 'Minimum stock cannot exceed maximum stock';
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
      category: category,
      quantity: parseInt(quantity, 10),
      minimumStock: minimumStock !== '' ? parseInt(minimumStock, 10) : 0,
      maximumStock: maximumStock !== '' ? parseInt(maximumStock, 10) : 0,
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
        <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Add Inventory Item</h3>
        <p className="text-xs text-slate-500 mt-1">Register a new item and track its location details.</p>
      </div>

      {/* Global API Error Banner */}
      {apiError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-450 p-4 rounded-xl text-xs flex gap-3 items-center">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <span className="font-bold">Error:</span> {apiError}
          </div>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
        
        {/* Item Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Item Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            placeholder="e.g. Raspberry Pi 4 Model B"
            className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors ${
              fieldErrors.name ? 'border-rose-500/50' : 'border-slate-200'
            }`}
          />
          {fieldErrors.name && (
            <p className="text-[11px] text-rose-450 font-medium">{fieldErrors.name}</p>
          )}
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={loading}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="Microcontrollers">Microcontrollers</option>
            <option value="Sensors">Sensors</option>
            <option value="Modules">Modules</option>
            <option value="Motors">Motors</option>
            <option value="Displays">Displays</option>
            <option value="LEDs">LEDs</option>
            <option value="Resistors">Resistors</option>
            <option value="Capacitors">Capacitors</option>
            <option value="Cables">Cables</option>
            <option value="Power">Power</option>
            <option value="Tools">Tools</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Quantity & Low Stock Threshold */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Stock Quantity *</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={loading}
              min="0"
              step="1"
              className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 transition-colors ${
                fieldErrors.quantity ? 'border-rose-500/50' : 'border-slate-200'
              }`}
            />
            {fieldErrors.quantity && (
              <p className="text-[11px] text-rose-450 font-medium">{fieldErrors.quantity}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Minimum Stock</label>
            <input
              type="number"
              value={minimumStock}
              onChange={(e) => setMinimumStock(e.target.value)}
              disabled={loading}
              min="0"
              step="1"
              className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 transition-colors ${
                fieldErrors.minimumStock ? 'border-rose-500/50' : 'border-slate-200'
              }`}
            />
            {fieldErrors.minimumStock && (
              <p className="text-[11px] text-rose-450 font-medium">{fieldErrors.minimumStock}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Maximum Stock</label>
            <input
              type="number"
              value={maximumStock}
              onChange={(e) => setMaximumStock(e.target.value)}
              disabled={loading}
              min="0"
              step="1"
              className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 transition-colors ${
                fieldErrors.maximumStock ? 'border-rose-500/50' : 'border-slate-200'
              }`}
            />
            {fieldErrors.maximumStock ? (
              <p className="text-[11px] text-rose-450 font-medium">{fieldErrors.maximumStock}</p>
            ) : (
              <p className="text-[10px] text-slate-500 font-medium">Optional maximum capacity.</p>
            )}
          </div>
        </div>

        {/* Location Section Header */}
        <div className="pt-2 border-t border-slate-200">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-50"></span> Storage coordinates
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Location Section */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Section *</label>
              <input
                type="text"
                maxLength="3"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                disabled={loading}
                placeholder="e.g. A"
                className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-sm text-slate-900 uppercase placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors ${
                  fieldErrors.section ? 'border-rose-500/50' : 'border-slate-200'
                }`}
              />
              {fieldErrors.section && (
                <p className="text-[10px] text-rose-450 font-medium">{fieldErrors.section}</p>
              )}
            </div>

            {/* Storage Unit */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Storage Unit *</label>
              <input
                type="number"
                min="1"
                step="1"
                value={storageUnit}
                onChange={(e) => setStorageUnit(e.target.value)}
                disabled={loading}
                placeholder="e.g. 3"
                className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 transition-colors ${
                  fieldErrors.storageUnit ? 'border-rose-500/50' : 'border-slate-200'
                }`}
              />
              {fieldErrors.storageUnit && (
                <p className="text-[10px] text-rose-450 font-medium">{fieldErrors.storageUnit}</p>
              )}
            </div>

            {/* Box */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Box Number *</label>
              <input
                type="number"
                min="1"
                step="1"
                value={box}
                onChange={(e) => setBox(e.target.value)}
                disabled={loading}
                placeholder="e.g. 19"
                className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 transition-colors ${
                  fieldErrors.box ? 'border-rose-500/50' : 'border-slate-200'
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
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Generated Location Code</label>
          <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-indigo-600 font-mono font-bold select-all flex items-center min-h-[42px]">
            {generatedCode || <span className="text-slate-600 font-sans font-normal italic">Fill coordinates to build location code...</span>}
          </div>
        </div>

        {/* Product Photo (Laptop File Picker + Base64 Preview) */}
        <div className="pt-2 border-t border-slate-200 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Product Photo (Optional)</label>
            
            <div className="flex items-center gap-3">
              <label className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer transition-colors inline-flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 00-2 2z" />
                </svg>
                <span>{image ? 'Change Image' : 'Choose Image'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
                    if (!validTypes.includes(file.type.toLowerCase())) {
                      setApiError('Please select a valid image file (.jpg, .jpeg, .png, .webp).');
                      return;
                    }
                    if (file.size > 5 * 1024 * 1024) {
                      setApiError('Image file size must be under 5MB.');
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = (evt) => setImage(evt.target.result);
                    reader.readAsDataURL(file);
                  }}
                  disabled={loading}
                  className="hidden"
                />
              </label>

              {image ? (
                <button
                  type="button"
                  onClick={() => setImage('')}
                  className="text-xs text-rose-600 hover:text-rose-300 font-semibold cursor-pointer"
                >
                  Remove Image
                </button>
              ) : null}
            </div>
          </div>

          {/* Image Preview Window */}
          {image ? (
            <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 flex items-center gap-4 animate-fadeIn">
              <div className="h-20 w-20 bg-white border border-slate-200 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                <img
                  src={image}
                  alt="Item preview"
                  className="h-full w-full object-contain p-4"
                />
              </div>
              <div>
                <h5 className="text-xs font-bold text-slate-900">Image Preview</h5>
                <p className="text-[10px] text-slate-500 mt-0.5">Selected laptop photo ready for inventory catalog.</p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-50 disabled:bg-slate-100 disabled:text-slate-500 text-slate-900 font-bold text-sm px-6 py-3 rounded-xl transition-all shadow-lg shadow-indigo-650/20 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24">
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
