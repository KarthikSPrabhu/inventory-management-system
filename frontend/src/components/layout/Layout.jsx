import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { checkHealth } from '../../services/inventoryService';
import { useAuth } from '../../context/AuthContext';

function Layout({ children }) {
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [isOnline, setIsOnline] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const isInventoryActive = (location.pathname.startsWith('/inventory') && location.pathname !== '/history' && location.pathname !== '/analytics' && location.pathname !== '/buy-list') || location.pathname === '/';
  const isProjectsActive = location.pathname.startsWith('/projects');
  const isHistoryActive = location.pathname.startsWith('/history');
  const isAnalyticsActive = location.pathname.startsWith('/analytics');
  const isBuyListActive = location.pathname.startsWith('/buy-list');

  // If on login page, don't show full header layout
  if (location.pathname === '/login') {
    return <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col select-none overflow-x-hidden">
      {/* Top Header Bar */}
      <header className="h-16 border-b border-slate-200 bg-white backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6">
        {/* Brand Logo & Mobile Menu Toggle */}
        <div className="flex items-center gap-3 sm:gap-6">
          {/* Mobile Hamburger Toggle Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            {isMobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>

          {/* Brand Logo & Title */}
          <Link to="/inventory" className="flex items-center gap-2.5 sm:gap-3 group">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0 group-hover:scale-105 transition-transform">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight leading-none group-hover:text-indigo-600 transition-colors">
                Antigravity Tracker
              </h1>
              <span className="text-[8px] sm:text-[9px] text-indigo-600 font-bold uppercase tracking-wider block mt-0.5">
                Inventory System
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links (Hidden on Mobile) */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-xl">
            <Link
              to="/inventory"
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                isInventoryActive
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-[0_2px_10px_rgba(99,102,241,0.1)]'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-white border border-transparent hover:shadow-sm'
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
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-[0_2px_10px_rgba(99,102,241,0.1)]'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-white border border-transparent hover:shadow-sm'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>Projects</span>
            </Link>

            <Link
              to="/history"
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                isHistoryActive
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-[0_2px_10px_rgba(99,102,241,0.1)]'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-white border border-transparent hover:shadow-sm'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>History</span>
            </Link>

            <Link
              to="/analytics"
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                isAnalyticsActive
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-[0_2px_10px_rgba(99,102,241,0.1)]'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-white border border-transparent hover:shadow-sm'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 012-2h2a2 2 0 012 2v6m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Analytics</span>
            </Link>

            <Link
              to="/buy-list"
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                isBuyListActive
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-[0_2px_10px_rgba(99,102,241,0.1)]'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-white border border-transparent hover:shadow-sm'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span>Buy List</span>
            </Link>
          </nav>
        </div>

        {/* Right Section: Controls, User Profile & Status */}
        <div className="flex items-center gap-2 sm:gap-4">
          
          {/* User Profile Info */}
          {isAuthenticated && user && (
            <div className="flex items-center gap-2 sm:gap-3 bg-white shadow-sm border border-slate-200 px-2.5 sm:px-3 py-1.5 rounded-xl">
              <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 font-extrabold text-xs shadow-inner">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>

              <div className="text-left hidden sm:block">
                <span className="text-xs font-bold text-slate-900 block leading-tight truncate max-w-[120px]">
                  {user.name}
                </span>
                <span className={`text-[9px] font-extrabold uppercase tracking-wider block ${
                  user.role === 'admin' ? 'text-indigo-600' : 'text-slate-500'
                }`}>
                  {user.role === 'admin' ? '👑 ADMIN' : '👤 MEMBER'}
                </span>
              </div>

              <button
                onClick={logout}
                title="Sign Out"
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-rose-600 transition-colors ml-0.5 sm:ml-1 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          )}

          {/* Connection Status Indicator */}
          <div className="hidden md:flex items-center gap-2">
            {isOnline === null ? (
              <span className="flex items-center gap-1.5 bg-amber-50 text-amber-600 border border-amber-200 px-2.5 py-1 rounded-full text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-50 animate-pulse"></span> Testing
              </span>
            ) : isOnline ? (
              <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 px-2.5 py-1 rounded-full text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-450 animate-pulse"></span> API Online
              </span>
            ) : (
              <span className="flex items-center gap-1.5 bg-rose-50 text-rose-600 border border-rose-200 px-2.5 py-1 rounded-full text-[11px] font-semibold animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-50"></span> API Offline
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu (Visible when hamburger is clicked) */}
      {isMobileMenuOpen && (
        <div className="md:hidden sticky top-16 z-40 bg-white border-b border-slate-200 backdrop-blur-xl p-4 space-y-3 shadow-2xl animate-fadeIn">
          <nav className="flex flex-col space-y-1">
            <Link
              to="/inventory"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-extrabold transition-all ${
                isInventoryActive
                  ? 'bg-indigo-600/20 text-indigo-600 border border-indigo-300'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span>Inventory</span>
            </Link>

            <Link
              to="/projects"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-extrabold transition-all ${
                isProjectsActive
                  ? 'bg-indigo-600/20 text-indigo-600 border border-indigo-300'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>Projects</span>
            </Link>

            <Link
              to="/history"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-extrabold transition-all ${
                isHistoryActive
                  ? 'bg-indigo-600/20 text-indigo-600 border border-indigo-300'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>History</span>
            </Link>

            <Link
              to="/analytics"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-extrabold transition-all ${
                isAnalyticsActive
                  ? 'bg-indigo-600/20 text-indigo-600 border border-indigo-300'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 012-2h2a2 2 0 012 2v6m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Analytics</span>
            </Link>

            <Link
              to="/buy-list"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-extrabold transition-all ${
                isBuyListActive
                  ? 'bg-indigo-600/20 text-indigo-600 border border-indigo-300'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span>Buy List</span>
            </Link>
          </nav>

          {/* User info & Sign Out in mobile drawer */}
          {isAuthenticated && user && (
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-indigo-600/20 border border-indigo-300 flex items-center justify-center text-indigo-600 font-extrabold text-xs">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-indigo-600 font-bold uppercase">
                    {user.role === 'admin' ? '👑 ADMIN' : '👤 MEMBER'}
                  </span>
                </div>
              </div>

              <button
                onClick={logout}
                className="bg-rose-50 hover:bg-rose-50 border border-rose-200 text-rose-600 hover:text-slate-900 font-bold text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  );
}

export default Layout;
