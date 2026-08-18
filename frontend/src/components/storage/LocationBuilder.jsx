import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { formatLocationSegment, generateLocationDisplayId } from '../../utils/locationUtils';
import { storageService } from '../../services/storageService';
import { useStorage } from '../../context/StorageContext';

/**
 * Step-by-Step Location Builder Component — Phase 20 Patch #2
 * 
 * Replaces generic location dropdown with a physical step-by-step hierarchy builder:
 * SECTION (Required, e.g. "A")
 *   ↓
 * STORAGE UNIT (Required, e.g. "2" -> "02")
 *   ↓
 * BOX 1 (Optional, e.g. "4" -> "04")
 *   ↓
 * BOX 2 (Optional, e.g. "1" -> "01")
 *   ↓
 * BOX N (Unlimited nesting)
 */
const LocationBuilder = forwardRef(({ 
  onChange, 
  disabled = false, 
  initialValue = null 
}, ref) => {
  const { refreshTree } = useStorage();

  // Field states
  const [section, setSection] = useState('A');
  const [storageUnit, setStorageUnit] = useState('');
  const [boxes, setBoxes] = useState([]); // Array of string box numbers: ['4', '1']
  
  // Error states
  const [unitError, setUnitError] = useState('');
  const [boxErrors, setBoxErrors] = useState([]);
  const [generalError, setGeneralError] = useState('');

  // Pre-populate if initialValue provided
  useEffect(() => {
    if (initialValue && typeof initialValue === 'object') {
      if (initialValue.section) setSection(initialValue.section.toUpperCase());
      if (initialValue.storageUnit) setStorageUnit(String(initialValue.storageUnit));
      if (Array.isArray(initialValue.boxes)) setBoxes(initialValue.boxes.map(String));
    }
  }, [initialValue]);

  // Compute live location display ID
  const computeLocationData = () => {
    const secStr = section.trim().toUpperCase();
    const unitStr = storageUnit.trim();

    // Check validity: Storage Unit must be between 1 and 6 inclusive for A, 1 and 2 inclusive for B
    const unitNum = Number(unitStr);
    const maxUnit = secStr === 'B' ? 2 : 6;
    const isUnitValid = /^[1-9]\d*$/.test(unitStr) && !isNaN(unitNum) && unitNum >= 1 && unitNum <= maxUnit;
    
    let areBoxesValid = true;
    const currentBoxErrors = boxes.map((b) => {
      if (!b.trim()) {
        areBoxesValid = false;
        return 'Box number required';
      }
      if (!/^[1-9]\d*$/.test(b.trim())) {
        areBoxesValid = false;
        return 'Must be a positive integer';
      }
      return '';
    });

    const pathCodes = [];
    if (secStr) pathCodes.push(secStr);
    if (unitStr) pathCodes.push(unitStr);
    boxes.forEach(b => {
      if (b.trim()) pathCodes.push(b.trim());
    });

    const displayId = generateLocationDisplayId(pathCodes);
    const isValid = Boolean(secStr) && isUnitValid && areBoxesValid;

    return {
      section: secStr,
      storageUnit: unitStr,
      boxes: boxes.map(b => b.trim()),
      displayId,
      isValid,
      currentBoxErrors,
      isUnitValid
    };
  };

  const locData = computeLocationData();

  // Notify parent on change
  useEffect(() => {
    if (onChange) {
      onChange({
        section: locData.section,
        storageUnit: locData.storageUnit,
        boxes: locData.boxes,
        displayId: locData.displayId,
        isValid: locData.isValid
      });
    }
  }, [section, storageUnit, JSON.stringify(boxes), locData.isValid]);

  // Expose resolve method to parent via ref
  useImperativeHandle(ref, () => ({
    resolveLocation: async () => {
      const data = computeLocationData();
      if (!data.isValid) {
        if (!data.isUnitValid) {
          setUnitError('Storage unit number is required (positive integer >= 1)');
        }
        throw new Error('Please fill in all required location fields correctly.');
      }

      const res = await storageService.resolveStoragePath({
        section: data.section,
        storageUnit: data.storageUnit,
        boxes: data.boxes
      });

      if (!res.success || !res.data?.nodeId) {
        throw new Error(res.message || 'Failed to resolve storage location node.');
      }

      // Refresh storage context tree so visualizer & options update
      if (refreshTree) {
        refreshTree();
      }

      return res.data; // { nodeId, displayId, node, path }
    }
  }));

  // Field change handlers
  const handleSectionChange = (e) => {
    const val = e.target.value.toUpperCase().trim().slice(0, 5); // Usually single char "A"
    setSection(val || 'A');
    setGeneralError('');
    setStorageUnit('');
    setUnitError('');
  };

  const handleUnitChange = (e) => {
    const val = e.target.value;
    setStorageUnit(val);
    setGeneralError('');
    
    if (val.trim() !== '') {
      const unitNum = Number(val);
      const secStr = section.trim().toUpperCase();
      const maxUnit = secStr === 'B' ? 2 : 6;
      if (!/^[1-9]\d*$/.test(val) || isNaN(unitNum) || unitNum < 1 || unitNum > maxUnit) {
        setUnitError(`Storage Unit must be between 1 and ${maxUnit} for Section ${secStr}`);
      } else {
        setUnitError('');
      }
    } else {
      setUnitError('');
    }
  };

  const handleBoxChange = (index, val) => {
    const newBoxes = [...boxes];
    newBoxes[index] = val;
    setBoxes(newBoxes);
    setGeneralError('');

    const newErrors = [...boxErrors];
    if (val && !/^[1-9]\d*$/.test(val.trim())) {
      newErrors[index] = 'Must be a positive integer (e.g. 1, 4, 10)';
    } else {
      newErrors[index] = '';
    }
    setBoxErrors(newErrors);
  };

  // Add Box button handler with validation
  const handleAddBox = () => {
    setGeneralError('');

    // Check storage unit
    if (!storageUnit.trim() || !/^[1-9]\d*$/.test(storageUnit.trim())) {
      setUnitError('Please enter a valid Storage Unit number before adding boxes.');
      return;
    }

    // Check previous box if any exist
    if (boxes.length > 0) {
      const lastIndex = boxes.length - 1;
      const lastBox = boxes[lastIndex].trim();
      if (!lastBox || !/^[1-9]\d*$/.test(lastBox)) {
        const newErrors = [...boxErrors];
        newErrors[lastIndex] = `Please enter a valid number for Box ${lastIndex + 1} before adding another box.`;
        setBoxErrors(newErrors);
        return;
      }
    }

    setBoxes([...boxes, '']);
    setBoxErrors([...boxErrors, '']);
  };

  // Remove Box button handler
  const handleRemoveBox = (index) => {
    const newBoxes = boxes.filter((_, idx) => idx !== index);
    const newErrors = boxErrors.filter((_, idx) => idx !== index);
    setBoxes(newBoxes);
    setBoxErrors(newErrors);
    setGeneralError('');
  };

  return (
    <div className="space-y-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-5 shadow-sm select-none">
      
      {/* General Error Banner */}
      {generalError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-600 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{generalError}</span>
        </div>
      )}

      {/* Section & Storage Unit Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Section Input */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide flex items-center justify-between">
            <span>SECTION <span className="text-indigo-600">*</span></span>
          </label>
          <div className="relative">
            <select
              value={section}
              onChange={handleSectionChange}
              disabled={disabled}
              className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm font-extrabold text-slate-900 uppercase focus:outline-none transition-colors appearance-none cursor-pointer"
            >
              <option value="A">Section A (6 Drawers)</option>
              <option value="B">Section B (2 Cabinets)</option>
            </select>
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Storage Unit Input */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide flex items-center justify-between">
            <span>STORAGE UNIT <span className="text-indigo-600">*</span></span>
            {storageUnit && /^[1-9]\d*$/.test(storageUnit.trim()) && (
              <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded font-bold">
                Segment: {formatLocationSegment(storageUnit)}
              </span>
            )}
          </label>
          <input
            type="number"
            min="1"
            max={section.trim().toUpperCase() === 'B' ? 2 : 6}
            step="1"
            value={storageUnit}
            onChange={handleUnitChange}
            disabled={disabled}
            placeholder="e.g. 2 or 12"
            className={`w-full bg-white border rounded-xl px-4 py-2.5 text-sm font-extrabold text-slate-900 focus:outline-none transition-colors ${
              unitError ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 focus:border-indigo-500'
            }`}
          />
          {unitError && (
            <p className="text-[11px] font-semibold text-rose-500 px-1">{unitError}</p>
          )}
        </div>
      </div>

      {/* Dynamic Boxes List */}
      {boxes.length > 0 && (
        <div className="pt-2 border-t border-slate-200/80 space-y-3">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            BOXES (OPTIONAL NESTING)
          </label>

          <div className="space-y-2.5">
            {boxes.map((boxVal, index) => {
              const boxNum = index + 1;
              const hasError = Boolean(boxErrors[index]);
              const formattedVal = boxVal ? formatLocationSegment(boxVal) : '';

              return (
                <div key={index} className="flex items-start gap-2.5 animate-fadeIn">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wide">
                        BOX {boxNum}
                      </label>
                      {formattedVal && /^[1-9]\d*$/.test(boxVal.trim()) && (
                        <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded font-bold">
                          Segment: {formattedVal}
                        </span>
                      )}
                    </div>

                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={boxVal}
                      onChange={(e) => handleBoxChange(index, e.target.value)}
                      disabled={disabled}
                      placeholder={`Enter box ${boxNum} number`}
                      className={`w-full bg-white border rounded-xl px-4 py-2 text-xs font-extrabold text-slate-900 focus:outline-none transition-colors ${
                        hasError ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 focus:border-indigo-500'
                      }`}
                    />
                    
                    {hasError && (
                      <p className="text-[11px] font-semibold text-rose-500 px-1">
                        {boxErrors[index]}
                      </p>
                    )}
                  </div>

                  {/* Remove Box Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveBox(index)}
                    disabled={disabled}
                    title={`Remove Box ${boxNum}`}
                    className="mt-6 p-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors shrink-0 flex items-center justify-center cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 12H4" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Box Button */}
      <div className="pt-1">
        <button
          type="button"
          onClick={handleAddBox}
          disabled={disabled}
          className="w-full bg-white hover:bg-indigo-50/50 border border-dashed border-indigo-300 text-indigo-600 font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:border-indigo-500 shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          <span>{boxes.length === 0 ? 'Add Box' : 'Add Another Box'}</span>
        </button>
      </div>

      {/* Prominent Live Generated Location Display Banner */}
      <div className="pt-2 border-t border-slate-200/80">
        <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-slate-100 border border-indigo-500/30 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
              GENERATED LOCATION
            </span>
            <span className="font-mono text-xl font-black text-indigo-600 tracking-wider mt-0.5 block">
              📍 {locData.displayId || '—'}
            </span>
          </div>

          {locData.isValid ? (
            <div className="text-right">
              <span className="inline-flex items-center gap-1 bg-emerald-100 border border-emerald-300 text-emerald-700 text-[10px] font-extrabold px-2.5 py-1 rounded-lg">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
                <span>Valid Hierarchy</span>
              </span>
            </div>
          ) : (
            <div className="text-right">
              <span className="inline-flex items-center gap-1 bg-amber-100 border border-amber-300 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                Complete inputs
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default LocationBuilder;
