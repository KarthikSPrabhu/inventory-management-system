import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { checkHealth } from '../../services/inventoryService';

function Layout({ children }) {
  const location = useLocation();
  const [isOnline, setIsOnline] = useState(null);

  useEffect(() => {
    const fetchStatus = () => {
      checkHealth()
        .then(() => setIsOnline(true))
        .catch(() => setIsOnline(false));
    };

    fetchStatus();
    // Poll health status every 15 seconds
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const isInventoryActive = location.pathname.startsWith('/inventory') || location.pathname === '/';
  const isProjectsActive = location.pathname.startsWith('/projects');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* Top Header Bar with Antigravity Tracker Branding, Navigation Tabs & Connection Status */}
      <header className="h-16 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-6">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-6">
          <Link to="/inventory" className="flex items-center gap-3 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-white tracking-tight leading-none group-hover:text-indigo-400 transition-colors">
                Antigravity Tracker
              </h1>
              <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider">
                Inventory & Project System
              </span>
            </div>
          </Link>

          {/* Navigation Links: Inventory & Projects */}
          <nav className="flex items-center gap-1 bg-slate-950 border border-slate-850 p-1 rounded-xl">
            <Link
              to="/inventory"
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                isInventoryActive
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span>Inventory</span>
            </Link>

            <Link
              to="/projects"
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                isProjectsActive
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>Projects</span>
            </Link>
          </nav>
        </div>

        {/* Connection Status Indicator */}
        <div className="flex items-center gap-2">
          {isOnline === null ? (
            <span className="flex items-center gap-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/25 px-3 py-1 rounded-full text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Testing...
            </span>
          ) : isOnline ? (
            <span className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-3 py-1 rounded-full text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-450 animate-pulse"></span> API Online
            </span>
          ) : (
            <span className="flex items-center gap-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/25 px-3 py-1 rounded-full text-xs font-semibold animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> API Offline
            </span>
          )}
        </div>
      </header>

      {/* Main Content Area - Full width workspace */}
      <main className="flex-1 p-5 md:p-8 w-full max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  );
}

export default Layout;
