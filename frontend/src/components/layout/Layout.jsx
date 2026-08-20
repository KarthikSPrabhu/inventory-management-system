import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { checkHealth } from '../../services/inventoryService';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../notifications/NotificationBell';

function Layout({ children }) {
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [isOnline, setIsOnline] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAdminDropdownOpen, setIsAdminDropdownOpen] = useState(false);
  const adminDropdownRef = useRef(null);

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

  // Close menus on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsAdminDropdownOpen(false);
  }, [location.pathname]);

  // Click outside listener for Admin Dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (adminDropdownRef.current && !adminDropdownRef.current.contains(event.target)) {
        setIsAdminDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isInventoryActive = (location.pathname.startsWith('/inventory') && location.pathname !== '/history' && location.pathname !== '/analytics' && location.pathname !== '/buy-list' && location.pathname !== '/reports') || location.pathname === '/';
  const isProjectsActive = location.pathname.startsWith('/projects');
  const isHistoryActive = location.pathname.startsWith('/history');
  const isAnalyticsActive = location.pathname.startsWith('/analytics');
  const isBuyListActive = location.pathname.startsWith('/buy-list');
  const isReportsActive = location.pathname.startsWith('/reports');
  const isAuditLogsActive = location.pathname.startsWith('/audit-logs');
  const isBackupActive = location.pathname.startsWith('/admin/backup');
  const isUsersActive = location.pathname.startsWith('/users');
  const isProfileActive = location.pathname.startsWith('/profile');
  const isAdminSectionActive = isAuditLogsActive || isBackupActive || isUsersActive;

  // If on login page, don't show full header layout
  if (location.pathname === '/login') {
    return <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col select-none overflow-x-hidden">
      {/* Top Header Bar */}
      <header className="h-16 border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6 lg:px-8 w-full">
        {/* Brand Logo & Desktop Navigation */}
        <div className="flex items-center gap-3 xl:gap-5 min-w-0">
          {/* Mobile Hamburger Toggle Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
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
          <Link to="/inventory" className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-black text-slate-900 tracking-tight leading-none group-hover:text-indigo-600 transition-colors whitespace-nowrap">
                Antigravity Tracker
              </h1>
              <span className="text-[9px] text-indigo-600 font-extrabold uppercase tracking-wider block mt-0.5 whitespace-nowrap">
                Inventory System
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100/80 border border-slate-200/80 p-1 rounded-2xl">
            <Link
              to="/inventory"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap shrink-0 ${
                isInventoryActive
                  ? 'bg-white text-indigo-600 border border-slate-200 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 border border-transparent'
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span>Inventory</span>
            </Link>

            <Link
              to="/projects"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap shrink-0 ${
                isProjectsActive
                  ? 'bg-white text-indigo-600 border border-slate-200 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 border border-transparent'
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>Projects</span>
            </Link>

            <Link
              to="/history"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap shrink-0 ${
                isHistoryActive
                  ? 'bg-white text-indigo-600 border border-slate-200 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 border border-transparent'
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>History</span>
            </Link>

            <Link
              to="/analytics"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap shrink-0 ${
                isAnalyticsActive
                  ? 'bg-white text-indigo-600 border border-slate-200 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 border border-transparent'
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 012-2h2a2 2 0 012 2v6m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Analytics</span>
            </Link>

            <Link
              to="/buy-list"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap shrink-0 ${
                isBuyListActive
                  ? 'bg-white text-indigo-600 border border-slate-200 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 border border-transparent'
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span>Buy List</span>
            </Link>

            <Link
              to="/reports"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap shrink-0 ${
                isReportsActive
                  ? 'bg-white text-indigo-600 border border-slate-200 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 border border-transparent'
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Reports</span>
            </Link>

            {/* Admin Tools Dropdown Menu */}
            {user?.role === 'admin' && (
              <div className="relative shrink-0" ref={adminDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsAdminDropdownOpen(!isAdminDropdownOpen)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer ${
                    isAdminSectionActive
                      ? 'bg-white text-indigo-600 border border-slate-200 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 border border-transparent'
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Admin</span>
                  <svg className={`w-3.5 h-3.5 transition-transform ${isAdminDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isAdminDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-fadeIn">
                    <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      Admin Controls
                    </div>

                    <Link
                      to="/audit-logs"
                      onClick={() => setIsAdminDropdownOpen(false)}
                      className={`flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold transition-colors ${
                        isAuditLogsActive ? 'bg-indigo-50 text-indigo-600' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span>Audit Logs</span>
                    </Link>

                    <Link
                      to="/admin/backup"
                      onClick={() => setIsAdminDropdownOpen(false)}
                      className={`flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold transition-colors ${
                        isBackupActive ? 'bg-indigo-50 text-indigo-600' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      <span>Backup & Restore</span>
                    </Link>

                    <Link
                      to="/users"
                      onClick={() => setIsAdminDropdownOpen(false)}
                      className={`flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold transition-colors ${
                        isUsersActive ? 'bg-indigo-50 text-indigo-600' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <span>User Management</span>
                    </Link>
                  </div>
                )}
              </div>
            )}

            <Link
              to="/profile"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap shrink-0 ${
                isProfileActive
                  ? 'bg-white text-indigo-600 border border-slate-200 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 border border-transparent'
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Profile</span>
            </Link>
          </nav>
        </div>

        {/* Right Section: Controls, User Profile & Status */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <NotificationBell />

          {/* User Profile Info */}
          {isAuthenticated && user && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl shrink-0">
              <div className="h-7 w-7 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 font-black text-xs shadow-inner shrink-0">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>

              <div className="text-left hidden sm:block">
                <span className="text-xs font-bold text-slate-900 block leading-tight truncate max-w-[110px]">
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
                className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors ml-0.5 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          )}

          {/* Connection Status Indicator */}
          <div className="hidden xl:flex items-center gap-2 shrink-0">
            {isOnline === null ? (
              <span className="flex items-center gap-1.5 bg-amber-50 text-amber-600 border border-amber-200 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Testing
              </span>
            ) : isOnline ? (
              <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> API Online
              </span>
            ) : (
              <span className="flex items-center gap-1.5 bg-rose-50 text-rose-600 border border-rose-200 px-2.5 py-1 rounded-full text-[11px] font-semibold animate-pulse whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> API Offline
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden sticky top-16 z-40 bg-white border-b border-slate-200 backdrop-blur-xl p-4 space-y-3 shadow-2xl animate-fadeIn">
          <nav className="flex flex-col space-y-1">
            <Link
              to="/inventory"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-extrabold transition-all ${
                isInventoryActive
                  ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
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
                  ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
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
                  ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
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
                  ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
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
                  ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span>Buy List</span>
            </Link>

            <Link
              to="/reports"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-extrabold transition-all ${
                isReportsActive
                  ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Reports</span>
            </Link>

            {user?.role === 'admin' && (
              <>
                <div className="pt-2 pb-1 px-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Admin Tools
                </div>

                <Link
                  to="/audit-logs"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-extrabold transition-all ${
                    isAuditLogsActive
                      ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Audit Logs</span>
                </Link>

                <Link
                  to="/admin/backup"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-extrabold transition-all ${
                    isBackupActive
                      ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  <span>Backup & Restore</span>
                </Link>

                <Link
                  to="/users"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-extrabold transition-all ${
                    isUsersActive
                      ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span>User Management</span>
                </Link>
              </>
            )}

            <div className="pt-2 pb-1 px-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">
              Account
            </div>

            <Link
              to="/profile"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-extrabold transition-all ${
                isProfileActive
                  ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Profile</span>
            </Link>
          </nav>

          {/* User info & Sign Out in mobile drawer */}
          {isAuthenticated && user && (
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 font-extrabold text-xs">
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
                className="bg-rose-50 border border-rose-200 text-rose-600 font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer"
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
