import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getInventoryReport,
  getLocationReport,
  getLowStockReport,
  getOutOfStockReport,
  getStockMovementReport,
  getProjectUsageReport,
  getBuyListReport,
  exportReportCSV,
  previewImportCsv,
  confirmImportCsv
} from '../services/reportService';
import { createBuyListItem } from '../services/buyListService';

function Reports() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Active View State
  const [activeReport, setActiveReport] = useState(null); // 'inventory' | 'location' | 'low-stock' | 'out-of-stock' | 'movement' | 'project-usage' | 'buy-list' | null
  const [reportTitle, setReportTitle] = useState('');
  const [reportData, setReportData] = useState([]);
  const [reportSummary, setReportSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filters State
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterSection, setFilterSection] = useState('All');
  const [filterUnit, setFilterUnit] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterDateRange, setFilterDateRange] = useState('30days');
  const [filterActivityType, setFilterActivityType] = useState('All');

  // CSV Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [importFilterTab, setImportFilterTab] = useState('all'); // 'all' | 'errors' | 'warnings'

  // Buy List action state
  const [buyListActions, setBuyListActions] = useState({});

  const fileInputRef = useRef(null);

  // Load report data based on active report type & filters
  const loadReport = async (reportType) => {
    try {
      setLoading(true);
      setError('');

      let title = '';
      let res = null;

      const params = {
        category: filterCategory,
        section: filterSection,
        storageUnit: filterUnit,
        status: filterStatus,
        dateRange: filterDateRange,
        activityType: filterActivityType
      };

      if (reportType === 'inventory') {
        title = 'Complete Inventory Report';
        res = await getInventoryReport(params);
        setReportData(res.data || []);
        setReportSummary(res.summary || null);
      } else if (reportType === 'location') {
        title = 'Storage Location Hierarchy Report';
        res = await getLocationReport(params);
        setReportData(res.data || []);
        setReportSummary(null);
      } else if (reportType === 'low-stock') {
        title = 'Low Stock Report';
        res = await getLowStockReport(params);
        setReportData(res.data || []);
        setReportSummary(null);
      } else if (reportType === 'out-of-stock') {
        title = 'Out of Stock Report';
        res = await getOutOfStockReport(params);
        setReportData(res.data || []);
        setReportSummary(null);
      } else if (reportType === 'movement') {
        title = 'Stock Movement / Activity History Report';
        res = await getStockMovementReport(params);
        setReportData(res.data || []);
        setReportSummary(null);
      } else if (reportType === 'project-usage') {
        title = 'Project Usage & Inventory Consumption Report';
        res = await getProjectUsageReport();
        setReportData(res.data || []);
        setReportSummary(null);
      } else if (reportType === 'buy-list') {
        title = 'Buy List & Inventory Reorder Report';
        res = await getBuyListReport();
        setReportData(res.data || []);
        setReportSummary(null);
      }

      setReportTitle(title);
      setActiveReport(reportType);
    } catch (err) {
      console.error('Report Error:', err);
      setError(err.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeReport) {
      loadReport(activeReport);
    }
  }, [filterCategory, filterSection, filterUnit, filterStatus, filterDateRange, filterActivityType]);

  const handleExportCSV = async (type) => {
    try {
      await exportReportCSV({
        type: type || activeReport || 'inventory',
        category: filterCategory,
        section: filterSection,
        storageUnit: filterUnit
      });
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleAddToBuyList = async (item) => {
    try {
      setBuyListActions(prev => ({ ...prev, [item._id]: 'loading' }));
      const minStock = item.minimumStock || 5;
      const qtyNeeded = Math.max(1, minStock - item.quantity);

      await createBuyListItem({
        name: item.name,
        quantityNeeded: qtyNeeded,
        note: `Added from ${activeReport === 'out-of-stock' ? 'Out of Stock' : 'Low Stock'} Report`
      });

      setBuyListActions(prev => ({ ...prev, [item._id]: 'added' }));
      // Reload active report to update status
      loadReport(activeReport);
    } catch (err) {
      alert('Failed to add to buy list: ' + err.message);
      setBuyListActions(prev => ({ ...prev, [item._id]: 'error' }));
    }
  };

  // CSV Import Handlers
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImportFile(file);
      setImportPreview(null);
      setImportError('');
      setImportSuccess('');
    }
  };

  const handleParseAndPreview = async () => {
    if (!importFile) {
      setImportError('Please select a CSV file first');
      return;
    }

    try {
      setImportLoading(true);
      setImportError('');
      setImportSuccess('');

      const text = await importFile.text();
      const previewRes = await previewImportCsv(text);
      setImportPreview(previewRes);
    } catch (err) {
      setImportError(err.message || 'Failed to parse CSV file');
    } finally {
      setImportLoading(false);
    }
  };

  const handleDuplicateActionChange = (rowIndex, action) => {
    if (!importPreview || !importPreview.rows) return;
    const newRows = [...importPreview.rows];
    newRows[rowIndex] = { ...newRows[rowIndex], duplicateAction: action };
    setImportPreview({ ...importPreview, rows: newRows });
  };

  const handleConfirmImport = async () => {
    if (!importPreview || !importPreview.rows) return;

    try {
      setImportLoading(true);
      setImportError('');
      setImportSuccess('');

      const validRows = importPreview.rows.filter(r => r.status !== 'error');
      if (validRows.length === 0) {
        setImportError('No valid rows available to import');
        return;
      }

      const res = await confirmImportCsv(validRows);
      setImportSuccess(res.message || 'Import executed successfully!');
      setImportPreview(null);
      setImportFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setImportError(err.message || 'Failed to complete import');
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5 print:hidden">
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">REPORTS & DATA MANAGEMENT</h3>
          <p className="text-xs text-slate-500 mt-1">Export complete inventory reports, analyze stock movement, and import CSV data safely.</p>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              setIsImportModalOpen(true);
              setImportFile(null);
              setImportPreview(null);
              setImportError('');
              setImportSuccess('');
            }}
            className="inline-flex items-center gap-2 justify-center bg-indigo-600 hover:bg-indigo-700 text-slate-900 font-extrabold text-xs px-5 py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/25 shrink-0 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>Import Inventory from CSV</span>
          </button>
        )}
      </div>

      {/* 8 REPORT CARDS GRID (Workspace Hub) */}
      {!activeReport && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 print:hidden">
          
          {/* Card 1: Complete Inventory Report */}
          <div className="bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h4 className="text-sm font-black text-slate-900">INVENTORY REPORT</h4>
              <p className="text-xs text-slate-500">Complete item catalog with multi-location quantities, stock status, categories, and dates.</p>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => loadReport('inventory')}
                className="flex-1 bg-slate-100 hover:bg-indigo-50 text-indigo-700 font-bold text-xs py-2 rounded-xl border border-slate-200 hover:border-indigo-200 transition-colors"
              >
                VIEW
              </button>
              <button
                onClick={() => handleExportCSV('inventory')}
                className="bg-indigo-600 hover:bg-indigo-700 text-slate-900 font-bold text-xs px-3 py-2 rounded-xl shadow-sm transition-all"
              >
                EXPORT
              </button>
            </div>
          </div>

          {/* Card 2: Low Stock Report */}
          <div className="bg-white border border-slate-200 hover:border-amber-300 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h4 className="text-sm font-black text-slate-900">LOW STOCK REPORT</h4>
              <p className="text-xs text-slate-500">Items below minimum stock threshold with Buy List status and reorder triggers.</p>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => loadReport('low-stock')}
                className="flex-1 bg-slate-100 hover:bg-amber-50 text-amber-700 font-bold text-xs py-2 rounded-xl border border-slate-200 hover:border-amber-200 transition-colors"
              >
                VIEW
              </button>
              <button
                onClick={() => handleExportCSV('inventory')}
                className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs px-3 py-2 rounded-xl shadow-sm transition-all"
              >
                EXPORT
              </button>
            </div>
          </div>

          {/* Card 3: Out of Stock Report */}
          <div className="bg-white border border-slate-200 hover:border-rose-300 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="h-10 w-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <h4 className="text-sm font-black text-slate-900">OUT OF STOCK REPORT</h4>
              <p className="text-xs text-slate-500">Items with 0 current quantity and last known storage location assignment.</p>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => loadReport('out-of-stock')}
                className="flex-1 bg-slate-100 hover:bg-rose-50 text-rose-700 font-bold text-xs py-2 rounded-xl border border-slate-200 hover:border-rose-200 transition-colors"
              >
                VIEW
              </button>
              <button
                onClick={() => handleExportCSV('inventory')}
                className="bg-rose-600 hover:bg-rose-700 text-slate-900 font-bold text-xs px-3 py-2 rounded-xl shadow-sm transition-all"
              >
                EXPORT
              </button>
            </div>
          </div>

          {/* Card 4: Stock Movement Report */}
          <div className="bg-white border border-slate-200 hover:border-emerald-300 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h4 className="text-sm font-black text-slate-900">STOCK MOVEMENT REPORT</h4>
              <p className="text-xs text-slate-500">Comprehensive audit log of stock in, stock out, adjustments, and location moves.</p>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => loadReport('movement')}
                className="flex-1 bg-slate-100 hover:bg-emerald-50 text-emerald-700 font-bold text-xs py-2 rounded-xl border border-slate-200 hover:border-emerald-200 transition-colors"
              >
                VIEW
              </button>
              <button
                onClick={() => handleExportCSV('movement')}
                className="bg-emerald-600 hover:bg-emerald-700 text-slate-900 font-bold text-xs px-3 py-2 rounded-xl shadow-sm transition-all"
              >
                EXPORT
              </button>
            </div>
          </div>

          {/* Card 5: Storage Location Report */}
          <div className="bg-white border border-slate-200 hover:border-cyan-300 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="h-10 w-10 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h4 className="text-sm font-black text-slate-900">STORAGE LOCATION REPORT</h4>
              <p className="text-xs text-slate-500">Tree hierarchy report grouped by Section A/B, Storage Units (A01-A06, B01-B02), and Containers.</p>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => loadReport('location')}
                className="flex-1 bg-slate-100 hover:bg-cyan-50 text-cyan-700 font-bold text-xs py-2 rounded-xl border border-slate-200 hover:border-cyan-200 transition-colors"
              >
                VIEW
              </button>
              <button
                onClick={() => handleExportCSV('inventory')}
                className="bg-cyan-600 hover:bg-cyan-700 text-slate-900 font-bold text-xs px-3 py-2 rounded-xl shadow-sm transition-all"
              >
                EXPORT
              </button>
            </div>
          </div>

          {/* Card 6: Project Usage Report */}
          <div className="bg-white border border-slate-200 hover:border-purple-300 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="h-10 w-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h4 className="text-sm font-black text-slate-900">PROJECT USAGE REPORT</h4>
              <p className="text-xs text-slate-500">Inventory consumed per project with current stock availability and location references.</p>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => loadReport('project-usage')}
                className="flex-1 bg-slate-100 hover:bg-purple-50 text-purple-700 font-bold text-xs py-2 rounded-xl border border-slate-200 hover:border-purple-200 transition-colors"
              >
                VIEW
              </button>
              <button
                onClick={() => handleExportCSV('inventory')}
                className="bg-purple-600 hover:bg-purple-700 text-slate-900 font-bold text-xs px-3 py-2 rounded-xl shadow-sm transition-all"
              >
                EXPORT
              </button>
            </div>
          </div>

          {/* Card 7: Buy List Report */}
          <div className="bg-white border border-slate-200 hover:border-blue-300 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h4 className="text-sm font-black text-slate-900">BUY LIST REPORT</h4>
              <p className="text-xs text-slate-500">Active procurement list joined with current inventory quantity and low/out stock status.</p>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => loadReport('buy-list')}
                className="flex-1 bg-slate-100 hover:bg-blue-50 text-blue-700 font-bold text-xs py-2 rounded-xl border border-slate-200 hover:border-blue-200 transition-colors"
              >
                VIEW
              </button>
              <button
                onClick={() => handleExportCSV('inventory')}
                className="bg-blue-600 hover:bg-blue-700 text-slate-900 font-bold text-xs px-3 py-2 rounded-xl shadow-sm transition-all"
              >
                EXPORT
              </button>
            </div>
          </div>

          {/* Card 8: Import CSV */}
          {isAdmin && (
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-slate-900 rounded-2xl p-5 shadow-md flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <h4 className="text-sm font-black text-slate-900">IMPORT FROM CSV</h4>
                <p className="text-xs text-slate-300">Upload CSV files, validate location references, resolve duplicate items, and import safely.</p>
              </div>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="w-full bg-indigo-600 hover:bg-indigo-50 text-slate-900 font-extrabold text-xs py-2.5 rounded-xl shadow-lg transition-all"
              >
                LAUNCH IMPORT
              </button>
            </div>
          )}

        </div>
      )}

      {/* ACTIVE REPORT PREVIEW PANEL */}
      {activeReport && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          
          {/* Top Control Bar for Active Report */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4 print:pb-2">
            <div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveReport(null)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 print:hidden cursor-pointer"
                >
                  <span>← Back to Reports</span>
                </button>
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight mt-1">{reportTitle}</h3>
              <p className="text-xs text-slate-500 print:block">Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <button
                onClick={() => handleExportCSV(activeReport)}
                className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-slate-900 font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>EXPORT CSV</span>
              </button>
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-200 transition-all cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>PRINT REPORT</span>
              </button>
            </div>
          </div>

          {/* Filters Bar for Active Report */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center gap-3 print:hidden">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Filters:</span>
            
            {/* Category */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-600 font-semibold">Category:</span>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-white border border-slate-200 text-xs font-semibold rounded-lg px-2 py-1"
              >
                <option value="All">All</option>
                <option value="Microcontrollers">Microcontrollers</option>
                <option value="Sensors">Sensors</option>
                <option value="Motors">Motors</option>
                <option value="Passives">Passives</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Section */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-600 font-semibold">Section:</span>
              <select
                value={filterSection}
                onChange={(e) => setFilterSection(e.target.value)}
                className="bg-white border border-slate-200 text-xs font-semibold rounded-lg px-2 py-1"
              >
                <option value="All">All</option>
                <option value="A">Section A</option>
                <option value="B">Section B</option>
              </select>
            </div>

            {/* Storage Unit */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-600 font-semibold">Unit:</span>
              <select
                value={filterUnit}
                onChange={(e) => setFilterUnit(e.target.value)}
                className="bg-white border border-slate-200 text-xs font-semibold rounded-lg px-2 py-1"
              >
                <option value="All">All Units</option>
                <option value="A01">A01</option>
                <option value="A02">A02</option>
                <option value="A03">A03</option>
                <option value="A04">A04</option>
                <option value="A05">A05</option>
                <option value="A06">A06</option>
                <option value="B01">B01</option>
                <option value="B02">B02</option>
              </select>
            </div>

            {/* Date Range (For Movement) */}
            {activeReport === 'movement' && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-600 font-semibold">Time:</span>
                <select
                  value={filterDateRange}
                  onChange={(e) => setFilterDateRange(e.target.value)}
                  className="bg-white border border-slate-200 text-xs font-semibold rounded-lg px-2 py-1"
                >
                  <option value="today">Today</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="thisMonth">This Month</option>
                </select>
              </div>
            )}
          </div>

          {/* Report Summary Cards if present */}
          {reportSummary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Items</span>
                <span className="text-xl font-black text-slate-900">{reportSummary.totalItems}</span>
              </div>
              <div className="bg-indigo-50 border border-indigo-100 p-3.5 rounded-xl">
                <span className="text-[10px] font-bold text-indigo-600 uppercase block">Total Units</span>
                <span className="text-xl font-black text-indigo-700">{reportSummary.totalQuantity}</span>
              </div>
              <div className="bg-amber-50 border border-amber-100 p-3.5 rounded-xl">
                <span className="text-[10px] font-bold text-amber-600 uppercase block">Low Stock</span>
                <span className="text-xl font-black text-amber-700">{reportSummary.lowStock}</span>
              </div>
              <div className="bg-rose-50 border border-rose-100 p-3.5 rounded-xl">
                <span className="text-[10px] font-bold text-rose-600 uppercase block">Out of Stock</span>
                <span className="text-xl font-black text-rose-700">{reportSummary.outOfStock}</span>
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading ? (
            <div className="py-12 text-center text-slate-500 font-semibold text-xs">
              Loading report data from MongoDB Atlas...
            </div>
          ) : error ? (
            <div className="bg-rose-50 text-rose-600 border border-rose-200 p-4 rounded-xl text-xs font-semibold">
              {error}
            </div>
          ) : (
            /* DATA TABLE RENDERERS */
            <div className="overflow-x-auto">
              
              {/* 1. Complete Inventory / Low Stock / Out of Stock Table */}
              {(activeReport === 'inventory' || activeReport === 'low-stock' || activeReport === 'out-of-stock') && (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-3">Item Name</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">Quantity</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Location(s)</th>
                      {(activeReport === 'low-stock' || activeReport === 'out-of-stock') && (
                        <th className="py-3 px-3 print:hidden">Buy List Action</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800 font-semibold">
                    {reportData.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-8 text-center text-slate-400">No records found.</td>
                      </tr>
                    ) : (
                      reportData.map((item) => (
                        <tr key={item._id} className="hover:bg-slate-50/80">
                          <td className="py-3 px-3 font-bold text-slate-900">{item.name}</td>
                          <td className="py-3 px-3">{item.category}</td>
                          <td className="py-3 px-3 font-mono font-bold">{item.quantity}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              item.stockStatus === 'Out of Stock' || item.status === 'OUT OF STOCK'
                                ? 'bg-rose-100 text-rose-700'
                                : item.stockStatus === 'Low Stock' || item.status === 'LOW STOCK'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {item.stockStatus || item.status}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            {item.locationDisplay || (item.locations ? item.locations.map(l => `${l.displayId} (${l.quantity})`).join(', ') : 'Unassigned')}
                          </td>
                          {(activeReport === 'low-stock' || activeReport === 'out-of-stock') && (
                            <td className="py-3 px-3 print:hidden">
                              {item.onBuyList || item.buyListStatus === 'Already on Buy List' ? (
                                <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                                  ✓ Already on Buy List
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleAddToBuyList(item)}
                                  disabled={buyListActions[item._id] === 'loading'}
                                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-[11px] px-3 py-1 rounded-lg transition-colors cursor-pointer"
                                >
                                  {buyListActions[item._id] === 'loading' ? 'Adding...' : '+ Add to Buy List'}
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {/* 2. Storage Location Report Tree */}
              {activeReport === 'location' && (
                <div className="space-y-6">
                  {reportData.map((sec) => (
                    <div key={sec.section} className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-4">
                      <h4 className="text-sm font-black text-slate-900 border-b border-slate-200 pb-2 uppercase tracking-tight">{sec.name}</h4>
                      
                      <div className="space-y-3 pl-2">
                        {sec.units.map((unit) => (
                          <div key={unit._id} className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-indigo-700">{unit.displayId || unit.code} ({unit.name})</span>
                              <span className="text-[10px] text-slate-400 font-mono">{unit.containers.length} containers</span>
                            </div>

                            {/* Unit Direct Items */}
                            {unit.items && unit.items.length > 0 && (
                              <div className="pl-3 border-l-2 border-indigo-200 space-y-1 text-xs text-slate-700">
                                {unit.items.map((it) => (
                                  <div key={it.itemId} className="flex justify-between font-semibold">
                                    <span>• {it.name} ({it.category})</span>
                                    <span className="font-mono text-indigo-600 font-bold">{it.quantityAtLocation} units</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Containers */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                              {unit.containers.map((cnt) => (
                                <div key={cnt._id} className="bg-slate-50 border border-slate-200 rounded-md p-2 text-xs space-y-1">
                                  <span className="font-bold text-slate-800 block text-[11px]">{cnt.displayId} — {cnt.name}</span>
                                  {cnt.items.length === 0 ? (
                                    <span className="text-[10px] text-slate-400 italic block">Empty</span>
                                  ) : (
                                    cnt.items.map((it) => (
                                      <div key={it.itemId} className="flex justify-between text-[11px] text-slate-600">
                                        <span>• {it.name}</span>
                                        <span className="font-mono font-bold text-slate-900">{it.quantityAtLocation}</span>
                                      </div>
                                    ))
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 3. Stock Movement Report Table */}
              {activeReport === 'movement' && (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Item Name</th>
                      <th className="py-3 px-3">Event Type</th>
                      <th className="py-3 px-3">Quantity</th>
                      <th className="py-3 px-3">Project / Supplier</th>
                      <th className="py-3 px-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800 font-semibold">
                    {reportData.map((ev) => (
                      <tr key={ev._id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                          {new Date(ev.date).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900">{ev.itemName}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            ev.type === 'Stock In'
                              ? 'bg-emerald-100 text-emerald-800'
                              : ev.type === 'Stock Out'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}>
                            {ev.type}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold">
                          {ev.quantity > 0 ? `+${ev.quantity}` : ev.quantity}
                        </td>
                        <td className="py-3 px-3">{ev.project || ev.supplier || '-'}</td>
                        <td className="py-3 px-3 text-slate-500">{ev.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* 4. Project Usage Report */}
              {activeReport === 'project-usage' && (
                <div className="space-y-4">
                  {reportData.map((proj) => (
                    <div key={proj.projectId} className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div>
                          <h4 className="text-sm font-black text-slate-900">{proj.projectName}</h4>
                          <p className="text-xs text-slate-500">{proj.description}</p>
                        </div>
                        <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-[10px] px-2.5 py-1 rounded-full">
                          {proj.totalUnitsUsed} units consumed
                        </span>
                      </div>

                      {proj.items.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No inventory recorded for this project yet.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {proj.items.map((it) => (
                            <div key={it.itemId} className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs flex justify-between items-center">
                              <div>
                                <span className="font-bold text-slate-900 block">{it.itemName}</span>
                                <span className="text-[10px] text-slate-500">📍 {it.locations}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-black text-rose-600 block">Used: {it.quantityUsed}</span>
                                <span className="text-[10px] text-emerald-600 font-bold">Avail: {it.availableStock}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 5. Buy List Report Table */}
              {activeReport === 'buy-list' && (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-3">Item Name</th>
                      <th className="py-3 px-3">Requested Qty</th>
                      <th className="py-3 px-3">Buy Status</th>
                      <th className="py-3 px-3">Current Stock</th>
                      <th className="py-3 px-3">Stock Status</th>
                      <th className="py-3 px-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800 font-semibold">
                    {reportData.map((b) => (
                      <tr key={b._id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-3 font-bold text-slate-900">{b.name}</td>
                        <td className="py-3 px-3 font-mono font-bold">{b.quantityNeeded}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            b.status === 'NEEDED' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono">{b.inventoryStock}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            b.stockStatus === 'OUT OF STOCK' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {b.stockStatus}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500">{b.note || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

            </div>
          )}
        </div>
      )}

      {/* CSV IMPORT MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h4 className="text-base font-black text-slate-900 uppercase tracking-tight">Import Inventory from CSV</h4>
                <p className="text-xs text-slate-500">Upload CSV, preview validation, resolve duplicate records, and commit import safely.</p>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Error / Success Alerts */}
            {importError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-600 p-4 rounded-xl text-xs font-semibold">
                {importError}
              </div>
            )}
            {importSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 p-4 rounded-xl text-xs font-semibold">
                ✓ {importSuccess}
              </div>
            )}

            {/* File Selector Step */}
            {!importPreview && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-2xl p-8 text-center space-y-3 bg-slate-50/50 transition-colors">
                  <div className="h-12 w-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-slate-900">Select Inventory CSV File</h5>
                    <p className="text-xs text-slate-500 mt-0.5">Required columns: Item Name, Quantity, Category, Minimum Stock, Maximum Stock, Location</p>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="csv-file-input"
                  />

                  <label
                    htmlFor="csv-file-input"
                    className="inline-block bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-300 cursor-pointer shadow-sm transition-all"
                  >
                    Choose CSV File
                  </label>

                  {importFile && (
                    <div className="text-xs text-indigo-600 font-bold pt-2">
                      Selected: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setIsImportModalOpen(false)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleParseAndPreview}
                    disabled={!importFile || importLoading}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-slate-900 font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-lg transition-all"
                  >
                    {importLoading ? 'Validating CSV...' : 'Parse & Preview Import'}
                  </button>
                </div>
              </div>
            )}

            {/* PREVIEW & VALIDATION RESULTS STEP */}
            {importPreview && (
              <div className="space-y-4">
                
                {/* Summary Stat Counters */}
                <div className="grid grid-cols-4 gap-3 bg-slate-50 border border-slate-200 p-3 rounded-xl">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Rows</span>
                    <span className="text-lg font-black text-slate-900">{importPreview.summary.totalRows}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase block">Valid</span>
                    <span className="text-lg font-black text-emerald-700">{importPreview.summary.validCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-amber-600 uppercase block">Warnings</span>
                    <span className="text-lg font-black text-amber-700">{importPreview.summary.warningCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-rose-600 uppercase block">Errors</span>
                    <span className="text-lg font-black text-rose-700">{importPreview.summary.errorCount}</span>
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-bold">
                  <button
                    onClick={() => setImportFilterTab('all')}
                    className={`px-3 py-1 rounded-lg ${importFilterTab === 'all' ? 'bg-slate-200 text-slate-900' : 'text-slate-500'}`}
                  >
                    All ({importPreview.rows.length})
                  </button>
                  <button
                    onClick={() => setImportFilterTab('errors')}
                    className={`px-3 py-1 rounded-lg ${importFilterTab === 'errors' ? 'bg-rose-100 text-rose-800' : 'text-slate-500'}`}
                  >
                    Errors Only ({importPreview.summary.errorCount})
                  </button>
                  <button
                    onClick={() => setImportFilterTab('warnings')}
                    className={`px-3 py-1 rounded-lg ${importFilterTab === 'warnings' ? 'bg-amber-100 text-amber-800' : 'text-slate-500'}`}
                  >
                    Warnings Only ({importPreview.summary.warningCount})
                  </button>
                </div>

                {/* Preview Table */}
                <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                        <th className="p-2">Row</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Item Name</th>
                        <th className="p-2">Qty</th>
                        <th className="p-2">Location</th>
                        <th className="p-2">Resolution / Duplicate Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {importPreview.rows
                        .filter(r => {
                          if (importFilterTab === 'errors') return r.status === 'error';
                          if (importFilterTab === 'warnings') return r.status === 'warning';
                          return true;
                        })
                        .map((row, idx) => (
                          <tr key={idx} className={row.status === 'error' ? 'bg-rose-50/50' : row.status === 'warning' ? 'bg-amber-50/50' : ''}>
                            <td className="p-2 font-mono font-bold text-slate-500">#{row.rowNumber}</td>
                            <td className="p-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                row.status === 'valid' ? 'bg-emerald-100 text-emerald-800' : row.status === 'warning' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {row.status === 'valid' ? '✓ Valid' : row.status === 'warning' ? '⚠ Warning' : '✕ Error'}
                              </span>
                            </td>
                            <td className="p-2 font-bold text-slate-900">{row.data.name || '-'}</td>
                            <td className="p-2 font-mono">{row.data.quantity}</td>
                            <td className="p-2 font-mono text-indigo-700 font-bold">{row.data.locationDisplayId || '-'}</td>
                            <td className="p-2">
                              {row.errors && row.errors.length > 0 ? (
                                <span className="text-rose-600 text-[11px] font-semibold block">{row.errors.join('; ')}</span>
                              ) : row.duplicateMatch ? (
                                <div className="space-y-1">
                                  <span className="text-amber-700 text-[11px] block font-semibold">Duplicate found ({row.duplicateMatch.name})</span>
                                  <select
                                    value={row.duplicateAction}
                                    onChange={(e) => handleDuplicateActionChange(idx, e.target.value)}
                                    className="bg-white border border-amber-300 text-xs font-bold rounded px-1.5 py-0.5 text-amber-900"
                                  >
                                    <option value="update">Update existing quantity</option>
                                    <option value="create">Create duplicate item</option>
                                    <option value="skip">Skip row</option>
                                  </select>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[11px]">Ready to import</span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    onClick={() => setImportPreview(null)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl"
                  >
                    ← Select Different File
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    disabled={importLoading || importPreview.summary.validCount + importPreview.summary.warningCount === 0}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-slate-900 font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-lg transition-all"
                  >
                    {importLoading ? 'Executing Import...' : 'Confirm & Commit Import'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

export default Reports;
