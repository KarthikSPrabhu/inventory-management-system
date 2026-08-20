import React, { useState, useEffect } from 'react';
import dashboardService from '../../services/dashboardService';
import { Link } from 'react-router-dom';

const Dashboard = ({ items, tree, isAdmin, onAction }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const res = await dashboardService.getSummary();
        if (res.success) {
          setData(res.data);
          setError(false);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    
    // Initial fetch
    fetchDashboard();
    
    // We don't automatically poll here to save server load, 
    // but the parent could trigger a re-render/refetch if needed, 
    // or we can just rely on the user refreshing/remounting the tab.
  }, [items]); // Re-fetch if the parent's items array changes (e.g., after an action)

  if (loading && !data) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 shadow-sm flex flex-col items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full mb-4"></div>
        <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Loading Intelligence...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-rose-50 border border-rose-200 p-8 rounded-2xl text-center">
        <h4 className="text-rose-600 font-bold mb-2">Unable to load dashboard intelligence</h4>
        <p className="text-xs text-rose-500 mb-4">Check your connection or try again later.</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-white text-rose-600 font-bold text-xs rounded-xl shadow-sm">
          Retry
        </button>
      </div>
    );
  }

  const {
    summary, stockStatus, lowStockItems, outOfStockItems,
    mostUsedItems, recentActivity, projectSummary,
    categorySummary, storageUtilization
  } = data;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. TOP SUMMARY METRICS */}
      {/* 1. TOP SUMMARY METRICS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div 
          onClick={() => onAction && onAction('catalog', { status: 'All' })}
          className="bg-white border border-slate-200 rounded-2xl p-4 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] cursor-pointer hover:border-indigo-300 transition-all"
        >
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Total Items</p>
          <div className="text-3xl font-black text-slate-800">{summary.totalItems}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Total Stock</p>
          <div className="text-3xl font-black text-indigo-600">{summary.totalQuantity}</div>
        </div>
        <div 
          onClick={() => onAction && onAction('catalog', { status: 'Low Stock' })}
          className="bg-white border border-rose-100 rounded-2xl p-4 shadow-[0_4px_20px_-10px_rgba(225,29,72,0.08)] bg-gradient-to-br from-white to-rose-50/30 cursor-pointer hover:border-rose-300 transition-all"
        >
          <p className="text-[10px] text-rose-400 font-black uppercase tracking-widest mb-1">Low / Out</p>
          <div className="text-3xl font-black text-rose-600">{stockStatus.lowStock + stockStatus.outOfStock}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Projects</p>
          <div className="text-3xl font-black text-emerald-600">{summary.activeProjects}</div>
        </div>
      </div>

      {/* 2. ALERTS: LOW STOCK & OUT OF STOCK */}
      {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
        <div className="bg-white border border-rose-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Attention Required</h4>
          </div>
          
          <div className="space-y-4">
            {outOfStockItems.length > 0 && (
              <div>
                <button
                  onClick={() => onAction && onAction('catalog', { status: 'Out of Stock' })}
                  className="text-[11px] font-bold text-rose-600 uppercase tracking-widest mb-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 inline-block px-2.5 py-0.5 rounded cursor-pointer transition-colors"
                >
                  Out of Stock ({outOfStockItems.length}) →
                </button>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {outOfStockItems.map(item => (
                    <div key={item._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{item.name}</p>
                        <p className="text-[10px] font-semibold text-slate-400">{item.category}</p>
                      </div>
                      <Link to="/buy-list" className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg hover:bg-indigo-100 transition-colors">
                        Buy List
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {lowStockItems.length > 0 && (
              <div>
                <button
                  onClick={() => onAction && onAction('catalog', { status: 'Low Stock' })}
                  className="text-[11px] font-bold text-amber-600 uppercase tracking-widest mb-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 inline-block px-2.5 py-0.5 rounded cursor-pointer transition-colors"
                >
                  Low Stock ({lowStockItems.length}) →
                </button>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {lowStockItems.map(item => (
                    <div key={item._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{item.name}</p>
                        <p className="text-[10px] font-semibold text-amber-600">{item.quantity} left (Min: {item.minStock})</p>
                      </div>
                      <Link to="/buy-list" className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg hover:bg-indigo-100 transition-colors">
                        Buy List
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. STORAGE UTILIZATION */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-4">Physical Storage Utilization</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div 
            onClick={() => onAction && onAction('catalog', { section: 'A' })}
            className="space-y-2 cursor-pointer p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all"
          >
            <div className="flex justify-between items-end">
              <div>
                <h5 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Section A</h5>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">6 Rack Drawers</p>
              </div>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{storageUtilization.sectionA.itemTypes} Item Types</span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div className="bg-indigo-500 h-full rounded-full transition-all duration-1000" style={{ width: Math.min(100, (storageUtilization.sectionA.itemTypes / (summary.totalItems || 1)) * 100) + '%' }}></div>
            </div>
          </div>
          
          <div 
            onClick={() => onAction && onAction('catalog', { section: 'B' })}
            className="space-y-2 cursor-pointer p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all"
          >
            <div className="flex justify-between items-end">
              <div>
                <h5 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Section B</h5>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">2 Cabinets</p>
              </div>
              <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-lg">{storageUtilization.sectionB.itemTypes} Item Types</span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div className="bg-teal-500 h-full rounded-full transition-all duration-1000" style={{ width: Math.min(100, (storageUtilization.sectionB.itemTypes / (summary.totalItems || 1)) * 100) + '%' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. ACTIVITY & PROJECTS (Side by Side) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* RECENT ACTIVITY */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col h-[400px]">
          <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-4 shrink-0">Recent Activity</h4>
          <div className="overflow-y-auto pr-2 space-y-4 flex-1 custom-scrollbar">
            {recentActivity.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium text-center py-8">No recent inventory activity.</p>
            ) : (
              recentActivity.map((act, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                      act.type === 'stock_in' ? 'bg-emerald-100 text-emerald-600' :
                      act.type === 'stock_out' ? 'bg-indigo-100 text-indigo-600' :
                      'bg-amber-100 text-amber-600'
                    }`}>
                      {act.type === 'stock_in' && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>}
                      {act.type === 'stock_out' && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 12H4"/></svg>}
                      {act.type === 'adjustment' && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 8h16M4 16h16"/></svg>}
                    </div>
                    {i !== recentActivity.length - 1 && <div className="w-[2px] h-full bg-slate-100 my-1"></div>}
                  </div>
                  <div className="pb-4">
                    <p className="text-xs font-bold text-slate-800">
                      {act.type === 'stock_in' && `+ ${act.quantity} added to ${act.itemName}`}
                      {act.type === 'stock_out' && `- ${act.quantity} taken from ${act.itemName}`}
                      {act.type === 'adjustment' && `Adjusted ${act.itemName} by ${act.quantity > 0 ? '+'+act.quantity : act.quantity}`}
                    </p>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                      {act.type === 'stock_out' && act.projectName && `Project: ${act.projectName} • `}
                      {new Date(act.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* MOST USED ITEMS */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col h-[400px]">
          <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-4 shrink-0">Most Used Items (90 Days)</h4>
          <div className="overflow-y-auto pr-2 space-y-3 flex-1 custom-scrollbar">
            {mostUsedItems.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium text-center py-8">No usage data recorded yet.</p>
            ) : (
              mostUsedItems.map((item, i) => (
                <div key={item._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-lg bg-slate-200 text-slate-600 font-black text-[10px] flex items-center justify-center shrink-0">
                      #{i + 1}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{item.name}</p>
                      <p className="text-[10px] font-semibold text-slate-400">{item.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-indigo-600">{item.totalUsed}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Units</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* 5. ACTIVE PROJECTS & CATEGORY BREAKDOWN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* PROJECTS */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Active Projects</h4>
            <Link to="/projects" className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg hover:bg-indigo-100 transition-colors">
              View All
            </Link>
          </div>
          
          <div className="space-y-2.5">
            {projectSummary.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium text-center py-4 bg-slate-50 rounded-xl">No active projects yet.</p>
            ) : (
              projectSummary.map(proj => (
                <div key={proj._id} className="flex justify-between items-center p-3 rounded-xl border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-colors group">
                  <div>
                    <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-900 transition-colors">{proj.name}</p>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{proj.uniqueItems} unique item types</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-800">{proj.totalUnits}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Units Used</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* CATEGORIES */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-4">Inventory Categories</h4>
          
          <div className="flex flex-wrap gap-2">
            {categorySummary.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium w-full text-center py-4">No items categorized yet.</p>
            ) : (
              categorySummary.map((cat, i) => (
                <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-700">{cat.name}</span>
                  <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 text-[9px] font-black flex items-center justify-center">
                    {cat.count}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* 6. ADMIN SYSTEM AUDIT QUICK VIEW (Admins Only) */}
      {isAdmin && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md text-white space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                🛡️ Recent System Activity
              </h4>
              <p className="text-[11px] text-slate-400">Live security & operational audit stream</p>
            </div>
            <Link to="/audit-logs" className="text-xs font-bold text-indigo-400 bg-indigo-950/80 border border-indigo-800/80 px-3 py-1.5 rounded-xl hover:bg-indigo-900 transition-colors">
              VIEW FULL AUDIT LOG ➔
            </Link>
          </div>

          <div className="space-y-2">
            {recentActivity && recentActivity.length > 0 ? (
              recentActivity.slice(0, 5).map((act, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] font-extrabold text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded-md border border-indigo-900">
                      {act.type === 'stock_in' ? 'STOCK_IN' : act.type === 'usage' ? 'STOCK_OUT' : 'ACTIVITY'}
                    </span>
                    <div>
                      <span className="font-bold text-slate-200">{act.item?.name || 'System Event'}</span>
                      <span className="text-[10px] text-slate-400 block">{act.notes || act.reason || 'Activity recorded'}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">{new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 text-center py-2">No recent system events recorded.</p>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
