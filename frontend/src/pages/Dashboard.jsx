import React from 'react';
import { Link } from 'react-router-dom';

function Dashboard() {
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Title */}
      <div>
        <h3 className="text-2xl font-bold text-white tracking-tight">Inventory Dashboard</h3>
        <p className="text-xs text-slate-400 mt-1">Real-time summaries and workspace management shortcuts.</p>
      </div>

      {/* Metrics Widgets (Mockup/Placeholders for clean aesthetics) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl"></div>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Items Type</p>
          <h4 className="text-3xl font-extrabold text-white mt-2">--</h4>
          <span className="text-[10px] text-slate-400 mt-2 block">Tracked across multiple storage locations</span>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl"></div>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Storage Sections</p>
          <h4 className="text-3xl font-extrabold text-white mt-2">--</h4>
          <span className="text-[10px] text-slate-400 mt-2 block">Active bins and storage boxes</span>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/5 rounded-full blur-2xl"></div>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Operations Log</p>
          <h4 className="text-3xl font-extrabold text-white mt-2">Phase 3</h4>
          <span className="text-[10px] text-slate-400 mt-2 block">Item addition interface ready</span>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="bg-slate-900 border border-slate-800/80 p-6 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-indigo-600/5 rounded-full blur-3xl"></div>
        <h4 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Quick Actions
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            to="/inventory/add"
            className="group bg-slate-950/40 border border-slate-850 hover:border-indigo-500/40 hover:bg-indigo-950/10 p-5 rounded-xl flex items-center gap-4 transition-all duration-200"
          >
            <div className="h-10 w-10 rounded-lg bg-indigo-600/10 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <h5 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">Add Item</h5>
              <p className="text-xs text-slate-400 mt-0.5">Register a new product in the location database</p>
            </div>
          </Link>

          <Link
            to="/inventory"
            className="group bg-slate-950/40 border border-slate-850 hover:border-indigo-500/40 hover:bg-indigo-950/10 p-5 rounded-xl flex items-center gap-4 transition-all duration-200"
          >
            <div className="h-10 w-10 rounded-lg bg-indigo-600/10 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </div>
            <div>
              <h5 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">View Inventory</h5>
              <p className="text-xs text-slate-400 mt-0.5">See catalog of existing items and stock counts</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
