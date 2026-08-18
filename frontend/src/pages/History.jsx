import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getUsageRecords, getItems, getProjects } from '../services/inventoryService';
import { useStorage } from '../context/StorageContext';
import { getLocationDisplayId } from '../utils/locationUtils';

function History() {
  const { tree } = useStorage();
  const [historyRecords, setHistoryRecords] = useState([]);
  const [items, setItems] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter States
  const [activityType, setActivityType] = useState('all'); // 'all', 'stock_in', 'usage'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [dateRange, setDateRange] = useState('all');

  // Pagination States
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 20;

  // Fetch items & projects for filter dropdowns on mount
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [itemsRes, projectsRes] = await Promise.all([getItems(), getProjects()]);
        if (itemsRes?.success) setItems(itemsRes.data || []);
        if (projectsRes?.success) setProjects(projectsRes.data || []);
      } catch (err) {
        console.error('Failed to load filter options:', err);
      }
    };
    fetchOptions();
  }, []);

  // Fetch history records whenever filters or page change
  const fetchHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getUsageRecords({
        page,
        limit,
        activityType,
        search: searchTerm,
        itemId: selectedItem,
        projectId: selectedProject,
        dateRange
      });

      if (response.success) {
        setHistoryRecords(response.data || []);
        setTotalPages(response.totalPages || 1);
        setTotalCount(response.total || 0);
      } else {
        throw new Error(response.message || 'Unable to load activity.');
      }
    } catch (err) {
      console.error('Fetch history error:', err);
      setError(err.message || 'Unable to load activity.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page, activityType, selectedItem, selectedProject, dateRange]);

  // Handle Search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchHistory();
  };

  const handleResetFilters = () => {
    setActivityType('all');
    setSearchTerm('');
    setSelectedItem('');
    setSelectedProject('');
    setDateRange('all');
    setPage(1);
  };

  // Helper date formatter
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-50 animate-pulse"></span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Audit & Activity Log</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">RECENT ACTIVITY</h2>
          <p className="text-xs text-slate-500">
            Track all stock additions, withdrawals, locations, project assignments, and notes.
          </p>
        </div>

        {/* Quick Stats pill */}
        <div className="bg-white border border-slate-200 px-4 py-2.5 rounded-xl shrink-0 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-indigo-100 border border-indigo-300 flex items-center justify-center text-indigo-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Transactions</span>
            <span className="text-base font-black text-slate-900 font-mono">{totalCount}</span>
          </div>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-4 shadow-md">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search Box */}
          <div className="lg:col-span-2 relative">
            <input
              type="text"
              placeholder="Search activity..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 placeholder-slate-400 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button
              type="submit"
              className="absolute right-2.5 top-2.5 text-slate-500 hover:text-indigo-600 transition-colors"
              title="Search"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>

          {/* Activity Type Dropdown (Stock In vs Stock Out vs All) */}
          <div>
            <select
              value={activityType}
              onChange={(e) => {
                setActivityType(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">All Activity</option>
              <option value="stock_in">🟢 Stock In</option>
              <option value="usage">🔴 Stock Out</option>
              <option value="adjustment">🟠 Adjustment</option>
            </select>
          </div>

          {/* Item Dropdown */}
          <div>
            <select
              value={selectedItem}
              onChange={(e) => {
                setSelectedItem(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="">All Items</option>
              {items.map((it) => (
                <option key={it._id} value={it._id}>
                  {it.name}
                </option>
              ))}
            </select>
          </div>

          {/* Project Dropdown */}
          <div>
            <select
              value={selectedProject}
              onChange={(e) => {
                setSelectedProject(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Dropdown */}
          <div>
            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
            </select>
          </div>
        </form>

        {/* Active Filters Pill Bar if any filter set */}
        {(searchTerm || activityType !== 'all' || selectedItem || selectedProject || dateRange !== 'all') && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase font-extrabold text-slate-500">Active Filters:</span>
              {activityType !== 'all' && (
                <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold uppercase border ${
                  activityType === 'stock_in' 
                    ? 'bg-emerald-100 text-emerald-600 border-emerald-300'
                    : activityType === 'adjustment'
                    ? 'bg-amber-100 text-amber-700 border-amber-300'
                    : 'bg-rose-100 text-rose-600 border-rose-300'
                }`}>
                  {activityType === 'stock_in' ? '🟢 Stock In' : activityType === 'adjustment' ? '🟠 Adjustment' : '🔴 Stock Out'}
                </span>
              )}
              {searchTerm && (
                <span className="bg-indigo-100 text-indigo-300 border border-indigo-300 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold">
                  Search: "{searchTerm}"
                </span>
              )}
              {selectedItem && (
                <span className="bg-indigo-100 text-indigo-300 border border-indigo-300 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold">
                  Item Filter Active
                </span>
              )}
              {selectedProject && (
                <span className="bg-indigo-100 text-indigo-300 border border-indigo-300 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold">
                  Project Filter Active
                </span>
              )}
              {dateRange !== 'all' && (
                <span className="bg-indigo-100 text-indigo-300 border border-indigo-300 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold uppercase">
                  {dateRange}
                </span>
              )}
            </div>

            <button
              onClick={handleResetFilters}
              className="text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors underline"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center flex flex-col items-center justify-center space-y-3">
          <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-xs text-slate-500 font-medium">Loading activity history...</span>
        </div>
      ) : error ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4 max-w-lg mx-auto">
          <div className="h-12 w-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 border border-rose-200">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Unable to load activity.</h4>
            <p className="text-xs text-slate-500 mt-1">{error}</p>
          </div>
          <button
            onClick={fetchHistory}
            className="bg-indigo-600 hover:bg-indigo-50 text-slate-900 font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
          >
            Try Again
          </button>
        </div>
      ) : historyRecords.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center flex flex-col items-center justify-center space-y-3">
          <div className="h-14 w-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h4 className="text-base font-extrabold text-slate-900 uppercase tracking-wider">NO ACTIVITY YET</h4>
          <p className="text-xs text-slate-500 max-w-md">
            Once you add stock or withdraw items, activity records will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* History Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {historyRecords.map((record) => {
              const isStockIn = record.type === 'stock_in';
              const isAdjustment = record.type === 'adjustment';
              const itemName = record.item?.name || 'Inventory Item';
              const itemId = record.item?._id;
              const projectName = record.project?.name || 'Unassigned Project';
              const projectId = record.project?._id;
              const locationCode = record.location || (record.item?.locations && record.item.locations.length > 0 ? getLocationDisplayId(record.item.locations[0]?.node, tree) : record.item?.location?.code || 'N/A');
              const qty = record.quantity || 0;
              const formattedDate = formatDate(record.createdAt);

              return (
                <div
                  key={record._id}
                  className={`bg-white border-2 rounded-2xl p-5 hover:border-slate-300 transition-all shadow-md flex flex-col justify-between space-y-4 ${
                    isStockIn ? 'border-emerald-200' : isAdjustment ? 'border-amber-200' : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header Row: Item Name & Quantity Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        {itemId ? (
                          <Link
                            to={`/inventory/${itemId}`}
                            className="text-base font-extrabold text-slate-900 hover:text-indigo-600 transition-colors line-clamp-1"
                          >
                            {itemName}
                          </Link>
                        ) : (
                          <h4 className="text-base font-extrabold text-slate-900 line-clamp-1">{itemName}</h4>
                        )}

                        <span className="font-mono text-xs font-bold text-slate-500 mt-1 block">
                          📍 {locationCode}
                        </span>
                      </div>

                      {/* Quantity & Type Badge */}
                      <span className={`px-3 py-1 rounded-xl text-xs font-black shrink-0 font-mono border ${
                        isStockIn
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                          : isAdjustment
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-600 border-rose-200'
                      }`}>
                        {isStockIn ? `+${qty}` : isAdjustment ? `${qty > 0 ? '+' : ''}${qty}` : `−${qty}`} {Math.abs(qty) === 1 ? 'unit' : 'units'}
                      </span>
                    </div>

                    {/* Transaction Details (Reason for Stock In vs Project for Stock Out) */}
                    <div className="bg-slate-100 border border-slate-200 p-3 rounded-xl flex items-center justify-between text-xs">
                      {isStockIn || isAdjustment ? (
                        <>
                          <span className="text-slate-500 font-semibold flex items-center gap-1">
                            <span className={`w-2 h-2 rounded-full ${isAdjustment ? 'bg-amber-400' : 'bg-emerald-400'}`}></span> {isAdjustment ? 'Adjustment' : 'Stock Added'}:
                          </span>
                          <span className={`font-bold ${isAdjustment ? 'text-amber-700' : 'text-emerald-600'}`}>Reason: {record.reason}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-slate-500 font-semibold flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-indigo-400"></span> Project:
                          </span>
                          {projectId ? (
                            <Link
                              to={`/projects/${projectId}`}
                              className="font-bold text-indigo-600 hover:underline"
                            >
                              {projectName}
                            </Link>
                          ) : (
                            <span className="font-bold text-slate-600">{projectName}</span>
                          )}
                        </>
                      )}
                    </div>

                    {/* Notes if present */}
                    {record.notes && (
                      <div className="text-xs text-slate-600 italic bg-slate-100 p-3 rounded-xl border border-slate-200">
                        <span className="not-italic text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Notes:
                        </span>
                        "{record.notes}"
                      </div>
                    )}
                  </div>

                  {/* Timestamp Footer */}
                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1.5 font-medium">
                      <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {formattedDate}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-2xl">
              <span className="text-xs text-slate-500 font-medium font-mono">
                Showing {Math.min((page - 1) * limit + 1, totalCount)}–{Math.min(page * limit, totalCount)} of {totalCount}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="bg-slate-50 border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-600 disabled:text-slate-600 px-3.5 py-2 rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-xs font-bold text-slate-500 px-2 font-mono">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="bg-slate-50 border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-600 disabled:text-slate-600 px-3.5 py-2 rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default History;
