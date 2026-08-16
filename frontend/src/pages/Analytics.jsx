import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getAnalyticsSummary,
  getAnalyticsMovement,
  getMostUsedItems,
  getMostUsedProjects,
  getLowStockAnalytics,
  getUsageRecords
} from '../services/inventoryService';

function Analytics() {
  const [dateRange, setDateRange] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Analytics Data States
  const [summary, setSummary] = useState({
    totalItems: 0,
    totalUnits: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    stockIn: 0,
    stockOut: 0,
    netChange: 0
  });
  const [mostUsedItems, setMostUsedItems] = useState([]);
  const [topProjects, setTopProjects] = useState([]);
  const [lowStockData, setLowStockData] = useState({ lowStock: [], outOfStock: [] });
  const [movementTimeline, setMovementTimeline] = useState([]);
  const [recentMovement, setRecentMovement] = useState([]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');

    try {
      const [
        summaryRes,
        mostUsedRes,
        topProjectsRes,
        lowStockRes,
        movementRes,
        recentRes
      ] = await Promise.all([
        getAnalyticsSummary(dateRange),
        getMostUsedItems(dateRange, 5),
        getMostUsedProjects(dateRange, 5),
        getLowStockAnalytics(),
        getAnalyticsMovement(dateRange),
        getUsageRecords({ page: 1, limit: 6, activityType: 'all', dateRange })
      ]);

      if (summaryRes?.success) setSummary(summaryRes.data);
      if (mostUsedRes?.success) setMostUsedItems(mostUsedRes.data || []);
      if (topProjectsRes?.success) setTopProjects(topProjectsRes.data || []);
      if (lowStockRes?.success) setLowStockData(lowStockRes.data || { lowStock: [], outOfStock: [] });
      if (movementRes?.success) setMovementTimeline(movementRes.data || []);
      if (recentRes?.success) setRecentMovement(recentRes.data || []);

    } catch (err) {
      console.error('Fetch Analytics Error:', err);
      setError(err.message || 'Unable to load analytics data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading && !summary.totalItems && mostUsedItems.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center flex flex-col items-center justify-center space-y-4 animate-fadeIn">
        <svg className="animate-spin h-10 w-10 text-indigo-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <div>
          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Loading analytics...</h4>
          <p className="text-xs text-slate-500 mt-1">Calculating real-time inventory intelligence from MongoDB Atlas</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4 max-w-md mx-auto animate-fadeIn">
        <div className="h-12 w-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 border border-rose-200">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <h4 className="text-base font-extrabold text-slate-900">Unable to load analytics</h4>
          <p className="text-xs text-slate-500 mt-1">{error}</p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="bg-indigo-600 hover:bg-indigo-50 text-slate-900 font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  const maxItemUsage = mostUsedItems.length > 0 ? Math.max(...mostUsedItems.map(i => i.totalQuantityUsed)) : 1;
  const maxProjectUsage = topProjects.length > 0 ? Math.max(...topProjects.map(p => p.totalUnitsConsumed)) : 1;

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fadeIn pb-12">
      {/* Header Banner & Date Filter */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-50 animate-pulse"></span>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">Inventory Intelligence</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">ANALYTICS</h2>
          <p className="text-xs text-slate-500">
            Real-time insights, stock movement, low-stock alerts, and project consumption.
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-xl shrink-0 overflow-x-auto max-w-full">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 hidden sm:inline">Range:</span>
          {[
            { id: 'today', label: 'Today' },
            { id: '7days', label: 'Last 7 days' },
            { id: '30days', label: 'Last 30 days' },
            { id: '90days', label: 'Last 90 days' },
            { id: 'all', label: 'All time' }
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setDateRange(opt.id)}
              className={`text-xs font-extrabold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                dateRange === opt.id
                  ? 'bg-indigo-100 text-indigo-300 border border-indigo-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-white border border-transparent'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. CURRENT INVENTORY SUMMARY CARDS */}
      <div className="space-y-3">
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-50"></span> CURRENT INVENTORY
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Items */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-md">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Items</span>
            <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
              {summary.totalItems}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">Distinct catalog items</span>
          </div>

          {/* Total Units */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-md">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Units</span>
            <span className="text-2xl font-black text-indigo-600 font-mono mt-1 block">
              {summary.totalUnits}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">Available physical units</span>
          </div>

          {/* Low Stock */}
          <div className="bg-white border border-amber-200 p-5 rounded-2xl shadow-md bg-gradient-to-b from-amber-500/5 to-transparent">
            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Low Stock</span>
            <span className="text-2xl font-black text-amber-600 font-mono mt-1 block">
              {summary.lowStockItems}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">Items $\le$ low threshold</span>
          </div>

          {/* Out of Stock */}
          <div className="bg-white border border-rose-200 p-5 rounded-2xl shadow-md bg-gradient-to-b from-rose-500/5 to-transparent">
            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Out of Stock</span>
            <span className="text-2xl font-black text-rose-600 font-mono mt-1 block">
              {summary.outOfStockItems}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">0 available units</span>
          </div>
        </div>
      </div>

      {/* 2. STOCK MOVEMENT CARDS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-50"></span> STOCK MOVEMENT
          </h3>
          <span className="text-[11px] text-slate-500 font-mono">
            Filtered by: <span className="text-indigo-600 font-bold uppercase">{dateRange}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Stock In */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-md">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Stock In</span>
              <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                🟢 Restocked
              </span>
            </div>
            <span className="text-2xl font-black text-emerald-600 font-mono mt-1 block">
              +{summary.stockIn}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">Total restocked units</span>
          </div>

          {/* Stock Out */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-md">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Stock Out</span>
              <span className="text-[10px] font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                🔴 Withdrawn
              </span>
            </div>
            <span className="text-2xl font-black text-rose-600 font-mono mt-1 block">
              −{summary.stockOut}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">Total withdrawn units</span>
          </div>

          {/* Net Change */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-md">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Net Change</span>
            <span className={`text-2xl font-black font-mono mt-1 block ${
              summary.netChange > 0
                ? 'text-emerald-600'
                : summary.netChange < 0
                ? 'text-rose-600'
                : 'text-slate-600'
            }`}>
              {summary.netChange > 0 ? `+${summary.netChange}` : summary.netChange}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">Net movement delta</span>
          </div>
        </div>
      </div>

      {/* 3. VISUAL CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Top Most Used Inventory Items */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">TOP 5 MOST USED ITEMS</h4>
              <p className="text-xs text-slate-500">Units withdrawn per inventory item</p>
            </div>
            <span className="text-[10px] font-extrabold text-indigo-600 font-mono">UNITS USED</span>
          </div>

          {mostUsedItems.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs font-medium">
              No usage data recorded for this date range.
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              {mostUsedItems.map((item, idx) => {
                const pct = Math.round((item.totalQuantityUsed / maxItemUsage) * 100);
                return (
                  <div key={item.itemId || idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <Link
                        to={`/inventory/${item.itemId}`}
                        className="font-bold text-slate-900 hover:text-indigo-600 transition-colors truncate max-w-[220px]"
                      >
                        {idx + 1}. {item.name}
                      </Link>
                      <span className="font-mono font-extrabold text-indigo-600 text-xs">
                        {item.totalQuantityUsed} units
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-200 flex">
                      <div
                        style={{ width: `${Math.max(pct, 4)}%` }}
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Chart 2: Top Projects by Consumption */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">TOP PROJECTS CONSUMPTION</h4>
              <p className="text-xs text-slate-500">Total units consumed per project</p>
            </div>
            <span className="text-[10px] font-extrabold text-purple-600 font-mono">CONSUMPTION</span>
          </div>

          {topProjects.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs font-medium">
              No project consumption recorded for this date range.
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              {topProjects.map((proj, idx) => {
                const pct = Math.round((proj.totalUnitsConsumed / maxProjectUsage) * 100);
                return (
                  <div key={proj.projectId || idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <Link
                        to={`/projects/${proj.projectId}`}
                        className="font-bold text-slate-900 hover:text-purple-600 transition-colors truncate max-w-[220px]"
                      >
                        {idx + 1}. {proj.name}
                      </Link>
                      <span className="font-mono font-extrabold text-purple-600 text-xs">
                        {proj.totalUnitsConsumed} units
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-200 flex">
                      <div
                        style={{ width: `${Math.max(pct, 4)}%` }}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 4. STOCK MOVEMENT OVER TIME GRAPH (SVG) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-2">
          <div>
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">STOCK MOVEMENT TIMELINE</h4>
            <p className="text-xs text-slate-500">Stock In (🟢 Restocks) vs Stock Out (🔴 Withdrawals) across dates</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-emerald-600">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-50"></span> Stock In
            </span>
            <span className="flex items-center gap-1.5 text-rose-600">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-50"></span> Stock Out
            </span>
          </div>
        </div>

        {movementTimeline.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs font-medium">
            No stock movement recorded for the selected date range.
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {movementTimeline.map((pt) => (
                <div key={pt.date} className="bg-slate-100 border border-slate-200 p-3.5 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="font-bold text-slate-600">📅 {pt.date}</span>
                    <span className={`text-[11px] font-black ${
                      pt.netChange > 0 ? 'text-emerald-600' : pt.netChange < 0 ? 'text-rose-600' : 'text-slate-500'
                    }`}>
                      Net: {pt.netChange > 0 ? `+${pt.netChange}` : pt.netChange}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200 font-mono">
                    <span className="text-emerald-600 font-bold">🟢 +{pt.stockIn} In</span>
                    <span className="text-rose-600 font-bold">🔴 −{pt.stockOut} Out</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 5. LOW STOCK & OUT OF STOCK PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LOW STOCK */}
        <div className="bg-white border border-amber-200 rounded-2xl p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <h4 className="text-sm font-black text-amber-600 uppercase tracking-tight">LOW STOCK ALERT</h4>
            </div>
            <span className="text-xs font-extrabold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
              {lowStockData.lowStock.length} items
            </span>
          </div>

          {lowStockData.lowStock.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs font-medium">
              ✅ All stock levels are optimal. No low-stock items.
            </div>
          ) : (
            <div className="space-y-3">
              {lowStockData.lowStock.map(item => (
                <div key={item._id} className="bg-white border border-amber-200 p-4 rounded-xl flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <h5 className="text-sm font-bold text-slate-900 line-clamp-1">{item.name}</h5>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-amber-600 font-bold font-mono">{item.quantity} available</span>
                      <span className="text-slate-500">|</span>
                      <span className="text-slate-500">Threshold: {item.lowStockThreshold}</span>
                      <span className="text-slate-500">|</span>
                      <span className="font-mono text-indigo-600 font-bold">📍 {item.location?.code}</span>
                    </div>
                  </div>

                  <Link
                    to={`/inventory/${item._id}`}
                    className="bg-amber-100 hover:bg-amber-50 text-amber-300 hover:text-slate-950 border border-amber-300 text-xs font-extrabold px-3 py-2 rounded-xl transition-all shrink-0"
                  >
                    View Item
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* OUT OF STOCK */}
        <div className="bg-white border border-rose-200 rounded-2xl p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-50 animate-ping"></span>
              <h4 className="text-sm font-black text-rose-600 uppercase tracking-tight">OUT OF STOCK</h4>
            </div>
            <span className="text-xs font-extrabold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded border border-rose-200">
              {lowStockData.outOfStock.length} items
            </span>
          </div>

          {lowStockData.outOfStock.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs font-medium">
              ✅ No out-of-stock items in catalog.
            </div>
          ) : (
            <div className="space-y-3">
              {lowStockData.outOfStock.map(item => (
                <div key={item._id} className="bg-white border border-rose-200 p-4 rounded-xl flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <h5 className="text-sm font-bold text-slate-900 line-clamp-1">{item.name}</h5>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-rose-600 font-extrabold font-mono">0 available</span>
                      <span className="text-slate-500">|</span>
                      <span className="font-mono text-indigo-600 font-bold">📍 {item.location?.code}</span>
                    </div>
                  </div>

                  <Link
                    to={`/inventory/${item._id}`}
                    className="bg-rose-100 hover:bg-rose-50 text-rose-300 hover:text-slate-900 border border-rose-300 text-xs font-extrabold px-3 py-2 rounded-xl transition-all shrink-0"
                  >
                    View Item
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 6. RECENT MOVEMENT TIMELINE FEED */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">RECENT MOVEMENT</h4>
            <p className="text-xs text-slate-500">Latest activity records across all inventory</p>
          </div>
          <Link
            to="/history"
            className="text-xs font-extrabold text-indigo-600 hover:underline flex items-center gap-1"
          >
            <span>View Full History</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {recentMovement.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs font-medium">
            No recent activity recorded yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {recentMovement.map(rec => {
              const isStockIn = rec.type === 'stock_in';
              const itemName = rec.item?.name || 'Inventory Item';
              const itemId = rec.item?._id;

              return (
                <div key={rec._id} className="bg-slate-100 border border-slate-200 p-4 rounded-xl space-y-2 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                        isStockIn ? 'bg-emerald-100 text-emerald-600 border border-emerald-300' : 'bg-rose-100 text-rose-600 border border-rose-300'
                      }`}>
                        {isStockIn ? '🟢 Stock In' : '🔴 Stock Out'}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-slate-500">
                        {isStockIn ? `+${rec.quantity}` : `−${rec.quantity}`} units
                      </span>
                    </div>

                    {itemId ? (
                      <Link to={`/inventory/${itemId}`} className="text-xs font-bold text-slate-900 hover:text-indigo-600 transition-colors line-clamp-1">
                        {itemName}
                      </Link>
                    ) : (
                      <h5 className="text-xs font-bold text-slate-900 line-clamp-1">{itemName}</h5>
                    )}

                    <p className="text-[11px] text-slate-500">
                      {isStockIn ? `Reason: ${rec.reason}` : `Project: ${rec.project?.name || 'Unassigned'}`}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500 font-mono">
                    {formatDate(rec.createdAt)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Analytics;
