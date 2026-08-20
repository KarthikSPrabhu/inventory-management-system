import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAuditLogs } from '../services/auditService';

function AuditLogs() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Pagination & Filtering state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('All');
  const [filterResource, setFilterResource] = useState('All');
  const [filterDateRange, setFilterDateRange] = useState('30days');

  // Selected Log Entry for Detail Modal
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError('');

      const res = await getAuditLogs({
        page,
        limit: 20,
        search: searchQuery,
        action: filterAction,
        resourceType: filterResource,
        dateRange: filterDateRange
      });

      setLogs(res.data || []);
      setTotalPages(res.totalPages || 1);
      setTotalCount(res.total || 0);
    } catch (err) {
      console.error('Fetch Audit Logs Error:', err);
      setError(err.message || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, filterAction, filterResource, filterDateRange]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const getActionBadge = (action) => {
    if (action.includes('CREATE') || action.includes('STOCK_IN') || action === 'LOGIN') {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    if (action.includes('DELETE') || action.includes('DISABLE') || action === 'LOGIN_FAILED') {
      return 'bg-rose-100 text-rose-800 border-rose-200';
    }
    if (action.includes('MOVE') || action.includes('ADJUST') || action.includes('UPDATE') || action.includes('ROLE')) {
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    }
    if (action.includes('BUY_LIST') || action === 'ARCHIVE') {
      return 'bg-amber-100 text-amber-800 border-amber-200';
    }
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  if (!isAdmin) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-700 p-8 rounded-2xl text-center space-y-2">
        <h4 className="text-base font-black">Access Restricted</h4>
        <p className="text-xs">Only authorized Administrators can view system audit logs.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">PRODUCTION AUDIT LOG</h3>
          <p className="text-xs text-slate-500 mt-1">Permanent, append-only security and accountability trail across all system operations.</p>
        </div>
        <div className="bg-white border border-slate-200 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 shadow-sm shrink-0">
          Total Recorded Events: <span className="text-indigo-600 font-black">{totalCount}</span>
        </div>
      </div>

      {/* SEARCH AND FILTERS BAR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Search audit log by description, user name, email, resource name, action..."
              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl pl-9 pr-10 py-2.5 text-xs text-slate-900 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setPage(1); fetchLogs(); }}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ×
              </button>
            )}
          </div>
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-slate-900 font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm shrink-0 cursor-pointer"
          >
            Search
          </button>
        </form>

        {/* Dropdown Filters Row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          
          {/* Action Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Action:</span>
            <select
              value={filterAction}
              onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 max-w-[160px]"
            >
              <option value="All">All Actions</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="ARCHIVE">ARCHIVE</option>
              <option value="STOCK_IN">STOCK_IN</option>
              <option value="STOCK_OUT">STOCK_OUT</option>
              <option value="STOCK_ADJUST">STOCK_ADJUST</option>
              <option value="STOCK_MOVE">STOCK_MOVE</option>
              <option value="LOCATION_CREATE">LOCATION_CREATE</option>
              <option value="PROJECT_CREATE">PROJECT_CREATE</option>
              <option value="BUY_LIST_ADD">BUY_LIST_ADD</option>
              <option value="USER_CREATE">USER_CREATE</option>
              <option value="ROLE_CHANGE">ROLE_CHANGE</option>
              <option value="PASSWORD_CHANGE">PASSWORD_CHANGE</option>
              <option value="IMPORT">IMPORT</option>
              <option value="EXPORT">EXPORT</option>
              <option value="LOGIN">LOGIN</option>
            </select>
          </div>

          {/* Resource Type Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Resource:</span>
            <select
              value={filterResource}
              onChange={(e) => { setFilterResource(e.target.value); setPage(1); }}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="All">All Resources</option>
              <option value="InventoryItem">InventoryItem</option>
              <option value="StorageNode">StorageNode</option>
              <option value="Project">Project</option>
              <option value="BuyListItem">BuyListItem</option>
              <option value="User">User</option>
              <option value="System">System</option>
              <option value="Report">Report</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Time:</span>
            <select
              value={filterDateRange}
              onChange={(e) => { setFilterDateRange(e.target.value); setPage(1); }}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="thisMonth">This Month</option>
            </select>
          </div>

        </div>
      </div>

      {/* MAIN LOGS DATA RENDERER */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-xs font-semibold text-slate-500 animate-pulse">
          Loading audit logs from MongoDB Atlas...
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-600 p-5 rounded-2xl text-xs font-semibold">
          {error}
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-2 shadow-sm">
          <h4 className="text-sm font-black text-slate-900">No audit events match your filter criteria.</h4>
          <p className="text-xs text-slate-500">Try clearing your search query or selecting another date range.</p>
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* DESKTOP TABLE VIEW (Hidden on Mobile) */}
          <div className="hidden md:block bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Resource</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 font-semibold">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`border text-[10px] font-black px-2 py-0.5 rounded-md ${getActionBadge(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{log.userName}</span>
                      <span className="text-[10px] text-slate-500 block font-mono">{log.userEmail}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-indigo-700 block text-[11px]">{log.resourceType}</span>
                      <span className="text-slate-600 block text-[11px]">{log.resourceName}</span>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-700">
                      {log.description}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-bold px-3 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE TIMELINE CARDS VIEW (Visible on Mobile) */}
          <div className="md:hidden space-y-3">
            {logs.map((log) => (
              <div key={log._id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className={`border text-[10px] font-black px-2 py-0.5 rounded-md ${getActionBadge(log.action)}`}>
                    {log.action}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-900">{log.description}</h4>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>👤 {log.userName}</span>
                    <span className="font-mono text-indigo-600 font-bold">{log.resourceType}</span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedLog(log)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-2 rounded-xl border border-slate-200 text-center cursor-pointer"
                >
                  View Event Details
                </button>
              </div>
            ))}
          </div>

          {/* PAGINATION CONTROLS */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 bg-white p-4 rounded-2xl border text-xs">
              <span className="text-slate-500 font-medium">
                Page <span className="font-bold text-slate-900">{page}</span> of <span className="font-bold text-slate-900">{totalPages}</span> ({totalCount} events)
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 font-bold px-3.5 py-1.5 rounded-xl border border-slate-200 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 font-bold px-3.5 py-1.5 rounded-xl border border-slate-200 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* EVENT DETAILS MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`border text-[10px] font-black px-2.5 py-0.5 rounded-md ${getActionBadge(selectedLog.action)}`}>
                    {selectedLog.action}
                  </span>
                  <span className="text-xs font-bold text-slate-500 font-mono">
                    {new Date(selectedLog.createdAt).toLocaleString()}
                  </span>
                </div>
                <h4 className="text-base font-black text-slate-900 tracking-tight mt-1">{selectedLog.description}</h4>
              </div>

              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Event Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">User</span>
                <span className="font-bold text-slate-900 block">{selectedLog.userName}</span>
                <span className="text-[10px] text-slate-500 font-mono block">{selectedLog.userEmail}</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Resource</span>
                <span className="font-bold text-indigo-700 block">{selectedLog.resourceType}</span>
                <span className="text-[10px] text-slate-600 block">{selectedLog.resourceName}</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Network Info</span>
                <span className="font-mono text-[11px] text-slate-700 block">IP: {selectedLog.ipAddress || 'Internal'}</span>
              </div>
            </div>

            {/* Stock Move Hierarchical Locations Banner (if STOCK_MOVE) */}
            {selectedLog.action === 'STOCK_MOVE' && selectedLog.metadata && (
              <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl space-y-2 text-xs">
                <span className="font-extrabold text-indigo-900 uppercase tracking-wider text-[10px] block">Location Movement Details</span>
                <div className="flex items-center justify-between font-mono">
                  <div className="bg-white border border-indigo-200 px-3 py-1.5 rounded-lg text-slate-800 font-bold">
                    FROM: <span className="text-indigo-600 font-extrabold">{selectedLog.metadata.fromLocationDisplay || selectedLog.metadata.fromLocationId}</span>
                  </div>
                  <span className="text-indigo-500 font-bold text-sm">➔</span>
                  <div className="bg-white border border-indigo-200 px-3 py-1.5 rounded-lg text-slate-800 font-bold">
                    TO: <span className="text-indigo-600 font-extrabold">{selectedLog.metadata.toLocationDisplay || selectedLog.metadata.toLocationId}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Previous State vs New State Diff Viewer */}
            {(selectedLog.previousState || selectedLog.newState) && (
              <div className="space-y-3 pt-2">
                <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider">State Snapshot Comparison</h5>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  {selectedLog.previousState && (
                    <div className="bg-slate-900 text-slate-200 p-3 rounded-xl space-y-1 overflow-x-auto max-h-48 border border-slate-800">
                      <span className="text-[10px] text-rose-400 font-bold uppercase block tracking-wider">Previous State:</span>
                      <pre className="text-[11px] leading-tight">{JSON.stringify(selectedLog.previousState, null, 2)}</pre>
                    </div>
                  )}
                  {selectedLog.newState && (
                    <div className="bg-slate-900 text-slate-200 p-3 rounded-xl space-y-1 overflow-x-auto max-h-48 border border-slate-800">
                      <span className="text-[10px] text-emerald-400 font-bold uppercase block tracking-wider">New State:</span>
                      <pre className="text-[11px] leading-tight">{JSON.stringify(selectedLog.newState, null, 2)}</pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Metadata Payload */}
            {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
              <div className="space-y-2 pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Metadata Payload</span>
                <div className="bg-slate-100 p-3 rounded-xl text-xs font-mono text-slate-800 overflow-x-auto max-h-36">
                  <pre className="text-[11px]">{JSON.stringify(selectedLog.metadata, null, 2)}</pre>
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer"
              >
                Close Details
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default AuditLogs;
