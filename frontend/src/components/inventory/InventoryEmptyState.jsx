import React from 'react';
import { Link } from 'react-router-dom';

function InventoryEmptyState() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4">
      {/* Icon placeholder */}
      <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 border border-slate-200 shadow-inner select-none">
        <svg className="w-7 h-7 stroke-[1.2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      </div>

      {/* Info */}
      <div className="space-y-1">
        <h4 className="text-base font-bold text-slate-900 tracking-tight">No inventory items yet.</h4>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          Start building your location tracking catalog by registering your first item coordinate.
        </p>
      </div>

      {/* Trigger Link */}
      <div className="pt-2">
        <Link
          to="/inventory/add"
          className="inline-flex items-center gap-1.5 justify-center bg-indigo-600 hover:bg-indigo-50 text-slate-900 font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-650/15"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Your First Item</span>
        </Link>
      </div>
    </div>
  );
}

export default InventoryEmptyState;
