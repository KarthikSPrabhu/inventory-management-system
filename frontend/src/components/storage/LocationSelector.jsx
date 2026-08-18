import React, { useState, useMemo, useRef } from 'react';
import { useStorage } from '../../context/StorageContext';
import { generateLocationDisplayId, getLocationDisplayId } from '../../utils/locationUtils';
import LocationBuilder from './LocationBuilder';

export default function LocationSelector({ 
  value, 
  onChange, 
  disabled = false, 
  filterExistingItemLocations = null,
  placeholder = "Select Storage Location..."
}) {
  const { tree, loading } = useStorage();
  const [isBuildingMode, setIsBuildingMode] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [buildError, setBuildError] = useState('');
  const builderRef = useRef(null);

  const [builtNodes, setBuiltNodes] = useState([]);

  // Flatten the tree into an array of options with visual tree indentation
  const flattenedNodes = useMemo(() => {
    const nodes = [];

    const traverse = (nodeList, pathPrefix = [], depth = 0) => {
      nodeList.forEach((node, index) => {
        const currentPathCodes = [...pathPrefix, node.code];
        const displayId = node.displayId || generateLocationDisplayId(currentPathCodes);
        const isLast = index === nodeList.length - 1;
        
        let prefix = '';
        if (depth > 0) {
          const indent = '   '.repeat(depth - 1);
          const connector = isLast ? '└─ ' : '├─ ';
          prefix = `${indent}${connector}`;
        }

        const optionLabel = `${prefix}${displayId} — ${node.name}`;
        const fullPathText = currentPathCodes.join(' > ');

        nodes.push({
          id: node._id,
          name: node.name,
          displayId,
          code: node.code,
          type: node.type,
          depth,
          optionLabel,
          fullPathText,
          isSelectable: true
        });

        if (node.children && node.children.length > 0) {
          traverse(node.children, currentPathCodes, depth + 1);
        }
      });
    };

    if (tree && tree.length > 0) {
      traverse(tree, [], 0);
    }

    return nodes;
  }, [tree]);

  // Combine flattened tree nodes with any newly built nodes, filtered if needed
  const displayNodes = useMemo(() => {
    let baseNodes = flattenedNodes;
    if (filterExistingItemLocations) {
      const validIds = new Set(filterExistingItemLocations.map(l => l.node?._id));
      baseNodes = flattenedNodes.filter(n => validIds.has(n.id));
    }
    
    const combined = [...baseNodes];
    builtNodes.forEach(bNode => {
      if (bNode && bNode.nodeId && !combined.some(n => n.id === bNode.nodeId)) {
        combined.push({
          id: bNode.nodeId,
          name: bNode.node?.name || bNode.displayId,
          displayId: bNode.displayId,
          code: bNode.node?.code,
          type: bNode.node?.type,
          depth: 0,
          optionLabel: `📍 ${bNode.displayId} — Newly Added Location`,
          fullPathText: bNode.displayId,
          isSelectable: true
        });
      }
    });
    return combined;
  }, [flattenedNodes, filterExistingItemLocations, builtNodes]);

  const handleConfirmBuiltLocation = async () => {
    if (!builderRef.current) return;
    setResolving(true);
    setBuildError('');
    try {
      const resolved = await builderRef.current.resolveLocation();
      if (resolved && resolved.nodeId) {
        setBuiltNodes(prev => [...prev, resolved]);
        onChange(resolved.nodeId);
        setIsBuildingMode(false);
      }
    } catch (err) {
      setBuildError(err.message || 'Could not resolve specified location.');
    } finally {
      setResolving(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-400 animate-pulse">
        Loading storage structure...
      </div>
    );
  }

  if (isBuildingMode) {
    return (
      <div className="space-y-3 animate-fadeIn">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-600 uppercase">Step-by-Step Location Builder</span>
          <button
            type="button"
            onClick={() => setIsBuildingMode(false)}
            className="text-[11px] font-bold text-slate-500 hover:text-slate-900 underline cursor-pointer"
          >
            ← Select Existing
          </button>
        </div>

        {buildError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 p-2.5 rounded-xl text-xs font-semibold">
            {buildError}
          </div>
        )}

        <LocationBuilder ref={builderRef} disabled={disabled || resolving} />

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setIsBuildingMode(false)}
            disabled={disabled || resolving}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirmBuiltLocation}
            disabled={disabled || resolving}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {resolving ? 'Saving Location...' : 'Confirm & Select Location'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 w-full min-w-0">
      <div className="flex items-center gap-2 w-full min-w-0">
        <select
          value={value || ''}
          onChange={(e) => {
            if (e.target.value === '__BUILD_NEW__') {
              setIsBuildingMode(true);
            } else {
              onChange(e.target.value);
            }
          }}
          disabled={disabled}
          className="flex-1 min-w-0 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 sm:px-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none transition-colors cursor-pointer truncate"
        >
          <option value="" disabled>{placeholder}</option>
          {displayNodes.map(node => (
            <option key={node.id} value={node.id} disabled={!node.isSelectable}>
              {node.optionLabel}
              {filterExistingItemLocations && (() => {
                const matchingLoc = filterExistingItemLocations.find(l => l.node?._id === node.id);
                return matchingLoc ? ` (${matchingLoc.quantity} available)` : '';
              })()}
            </option>
          ))}
          {!filterExistingItemLocations && (
            <option value="__BUILD_NEW__" className="font-extrabold text-indigo-600">
              + Build / Add New Storage Location...
            </option>
          )}
        </select>

        {!filterExistingItemLocations && (
          <button
            type="button"
            onClick={() => setIsBuildingMode(true)}
            disabled={disabled}
            title="Step-by-step Location Builder"
            className="px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-600 rounded-xl font-extrabold text-xs shrink-0 transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Build Location</span>
          </button>
        )}
      </div>
    </div>
  );
}
