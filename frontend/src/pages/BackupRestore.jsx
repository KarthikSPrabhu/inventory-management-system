import React, { useState, useEffect } from 'react';
import {
  getBackups,
  createBackup,
  downloadBackupFile,
  previewBackup,
  restoreBackup
} from '../services/backupService';

function BackupRestore() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Backup Creation State
  const [isCreating, setIsCreating] = useState(false);
  const [createSteps, setCreateSteps] = useState([]);

  // Restore Workflow State
  const [selectedFileOrName, setSelectedFileOrName] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);

  // Restore Execution State
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgressStep, setRestoreProgressStep] = useState('');
  const [restoreResult, setRestoreResult] = useState(null); // { success: boolean, data: object, error: string }

  const fetchBackupList = async () => {
    try {
      setLoading(true);
      const res = await getBackups();
      setBackups(res.data || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load backup list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackupList();
  }, []);

  // Handle Create Backup
  const handleCreateBackup = async () => {
    try {
      setIsCreating(true);
      setSuccessMessage(null);
      setError(null);
      setCreateSteps(['Gathering collections...']);

      const stepTimer1 = setTimeout(() => {
        setCreateSteps(prev => [...prev, '✓ Inventory & Storage Nodes']);
      }, 300);

      const stepTimer2 = setTimeout(() => {
        setCreateSteps(prev => [...prev, '✓ Projects & Buy List']);
      }, 600);

      const stepTimer3 = setTimeout(() => {
        setCreateSteps(prev => [...prev, '✓ History, Notifications & Audit Logs']);
      }, 900);

      const res = await createBackup();

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);

      setCreateSteps([
        '✓ Inventory',
        '✓ Storage Nodes',
        '✓ Projects',
        '✓ Buy List',
        '✓ History',
        '✓ Notifications',
        '✓ Audit Logs',
        '✓ Users',
        'Backup complete.'
      ]);

      setSuccessMessage(`Backup '${res.data.filename}' created successfully!`);
      await fetchBackupList();
    } catch (err) {
      setError(err.message || 'Failed to create backup');
    } finally {
      setIsCreating(false);
    }
  };

  // Handle Download
  const handleDownload = async (filename) => {
    try {
      await downloadBackupFile(filename);
    } catch (err) {
      alert(`Download failed: ${err.message}`);
    }
  };

  // Initiate Restore Preview for a file or uploaded zip
  const handleInitiatePreview = async (fileOrName) => {
    try {
      setIsPreviewing(true);
      setError(null);
      setSelectedFileOrName(fileOrName);
      setConfirmCheckbox(false);
      const res = await previewBackup(fileOrName);
      setPreviewData(res.data);
    } catch (err) {
      setError(`Backup preview failed: ${err.message}`);
      setPreviewData(null);
      setSelectedFileOrName(null);
    } finally {
      setIsPreviewing(false);
    }
  };

  // Handle File Upload Select
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleInitiatePreview(file);
    }
  };

  // Execute Safe Restore
  const handleExecuteRestore = async () => {
    if (!confirmCheckbox || !selectedFileOrName) return;

    try {
      setIsRestoring(true);
      setRestoreProgressStep('Creating Pre-restore Safety Backup...');
      setRestoreResult(null);

      // Simulated step notification
      setTimeout(() => {
        setRestoreProgressStep('Restoring collections in dependency order...');
      }, 1000);

      setTimeout(() => {
        setRestoreProgressStep('Verifying StorageNode physical hierarchy & relationships...');
      }, 2000);

      const res = await restoreBackup(selectedFileOrName, true);

      setRestoreResult({
        success: true,
        data: res.data
      });
      await fetchBackupList();
    } catch (err) {
      setRestoreResult({
        success: false,
        error: err.message || 'Restore failed'
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const closeRestoreModal = () => {
    setPreviewData(null);
    setSelectedFileOrName(null);
    setRestoreResult(null);
    setConfirmCheckbox(false);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              BACKUP & RESTORE
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            System administration & data safety protection suite
          </p>
        </div>

        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
          <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
            ADMINISTRATOR ACCESS ONLY
          </span>
        </div>
      </div>

      {/* Global Banners */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold flex items-start gap-3">
          <svg className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">{error}</div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-800 font-bold text-xs">Dismiss</button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-start gap-3">
          <svg className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          <div className="flex-1">{successMessage}</div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-800 font-bold text-xs">Dismiss</button>
        </div>
      )}

      {/* Main Grid: Create Backup & Upload Restore */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Create Backup */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Create a new backup
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Exports a full, dependency-aware ZIP snapshot containing all database collections and schema manifests.
            </p>

            {createSteps.length > 0 && (
              <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs font-semibold text-slate-700">
                {createSteps.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-indigo-600 font-bold">•</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleCreateBackup}
            disabled={isCreating}
            className={`w-full py-3 px-4 rounded-xl text-xs font-extrabold tracking-wider uppercase transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
              isCreating
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20 active:scale-[0.99]'
            }`}
          >
            {isCreating ? (
              <>
                <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Creating Backup...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                <span>[ CREATE BACKUP ]</span>
              </>
            )}
          </button>
        </div>

        {/* Card 2: Upload Backup for Restore */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload & Restore Backup
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Select an external ZIP backup archive from your disk to preview metadata, validate relationships, and perform safe restore.
            </p>

            <div className="mt-4 border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/50 rounded-xl p-6 text-center transition-colors">
              <input
                type="file"
                accept=".zip"
                id="backup-upload-input"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label htmlFor="backup-upload-input" className="cursor-pointer block space-y-2">
                <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div className="text-xs font-extrabold text-indigo-600">
                  Click to select backup .zip file
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  Validates integrity and shows preview before touch
                </div>
              </label>
            </div>
          </div>

          {isPreviewing && (
            <div className="text-center text-xs font-bold text-indigo-600 py-2 flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Validating archive & generating preview...</span>
            </div>
          )}
        </div>
      </div>

      {/* Backups History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              BACKUPS HISTORY
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Archives stored on server disk ready for download or restore
            </p>
          </div>
          <button
            onClick={fetchBackupList}
            className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            title="Refresh Backups List"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs font-bold text-slate-400">Loading backups list...</div>
        ) : backups.length === 0 ? (
          <div className="p-8 text-center text-xs font-bold text-slate-400">No backups generated yet.</div>
        ) : (
          <div className="divide-y divide-slate-200 overflow-x-auto">
            {backups.map((b) => (
              <div key={b.filename} className="p-5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-900 truncate">
                      {new Date(b.createdAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    {b.isSafetyBackup ? (
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                        Safety Snapshot
                      </span>
                    ) : (
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Full Backup
                      </span>
                    )}
                    <span className="text-[10px] font-bold text-slate-400">
                      ({b.sizeFormatted})
                    </span>
                  </div>

                  {/* Collection Counts Grid */}
                  <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1 font-medium">
                    <span>{b.counts.inventoryItems ?? 0} Inventory Items</span>
                    <span className="text-slate-300">•</span>
                    <span>{b.counts.storageNodes ?? 0} Storage Nodes</span>
                    <span className="text-slate-300">•</span>
                    <span>{b.counts.projects ?? 0} Projects</span>
                    <span className="text-slate-300">•</span>
                    <span>{(b.counts.inventoryUsages ?? 0) + (b.counts.inventoryStockIns ?? 0) + (b.counts.inventoryAdjustments ?? 0)} History Records</span>
                    <span className="text-slate-300">•</span>
                    <span>{b.counts.auditLogs ?? 0} Audit Events</span>
                  </div>

                  <div className="text-[11px] text-slate-400 font-mono truncate">
                    File: {b.filename} | Created By: {b.createdBy}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => handleDownload(b.filename)}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:border-indigo-300 bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-extrabold text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>[ DOWNLOAD ]</span>
                  </button>

                  <button
                    onClick={() => handleInitiatePreview(b.filename)}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>[ RESTORE ]</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RESTORE PREVIEW & EXECUTION MODAL */}
      {(previewData || isRestoring || restoreResult) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-fadeIn">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
                  RESTORE PREVIEW & VALIDATION
                </h3>
                <p className="text-xs text-slate-300 font-medium mt-0.5">
                  Verify backup integrity before executing database restoration
                </p>
              </div>

              {!isRestoring && (
                <button
                  onClick={closeRestoreModal}
                  className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">

              {/* RESTORE IN PROGRESS VIEW */}
              {isRestoring && (
                <div className="py-12 text-center space-y-4">
                  <div className="w-14 h-14 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <h4 className="text-base font-extrabold text-slate-900">Restoration in Progress...</h4>
                  <p className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl inline-block">
                    {restoreProgressStep}
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Do not close browser or navigate away while restore completes.
                  </p>
                </div>
              )}

              {/* RESTORE RESULT COMPLETION VIEW */}
              {!isRestoring && restoreResult && (
                <div className="space-y-6">
                  {restoreResult.success ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
                        <div className="flex items-center gap-2 text-base font-black text-emerald-800">
                          <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                          </svg>
                          <span>RESTORE COMPLETE</span>
                        </div>
                        <p className="text-xs font-medium text-emerald-700">
                          Database restored and verified successfully. Pre-restore safety snapshot saved as: <strong className="font-mono">{restoreResult.data.safetyBackup}</strong>
                        </p>
                      </div>

                      <div className="space-y-1.5 text-xs font-bold text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="text-slate-900 font-extrabold border-b border-slate-200 pb-2 mb-2">
                          Restoration Verification Summary:
                        </div>
                        <div>✓ Inventory Items: {restoreResult.data.verifiedCounts?.inventoryItems}</div>
                        <div>✓ Storage Nodes: {restoreResult.data.verifiedCounts?.storageNodes}</div>
                        <div>✓ Projects: {restoreResult.data.verifiedCounts?.projects}</div>
                        <div>✓ Buy List Items: {restoreResult.data.verifiedCounts?.buyListItems}</div>
                        <div>✓ History Records: {(restoreResult.data.verifiedCounts?.inventoryUsages || 0) + (restoreResult.data.verifiedCounts?.inventoryStockIns || 0) + (restoreResult.data.verifiedCounts?.inventoryAdjustments || 0)}</div>
                        <div>✓ Notifications: {restoreResult.data.verifiedCounts?.notifications}</div>
                        <div>✓ Audit Logs: {restoreResult.data.verifiedCounts?.auditLogs}</div>
                        <div>✓ Users: {restoreResult.data.verifiedCounts?.users}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-3">
                      <div className="flex items-center gap-2 text-base font-black text-rose-800">
                        <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>RESTORE FAILED</span>
                      </div>
                      <p className="text-xs font-semibold text-rose-700">
                        {restoreResult.error}
                      </p>
                    </div>
                  )}

                  <div className="pt-4 flex justify-end">
                    <button
                      onClick={closeRestoreModal}
                      className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs tracking-wider uppercase transition-all shadow-md cursor-pointer"
                    >
                      [ CLOSE ]
                    </button>
                  </div>
                </div>
              )}

              {/* RESTORE PREVIEW FORM VIEW */}
              {!isRestoring && !restoreResult && previewData && (
                <div className="space-y-6">
                  {/* Backup Info */}
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2">
                    <div className="text-xs font-mono font-bold text-indigo-700 truncate">
                      File: {previewData.filename}
                    </div>
                    <div className="text-xs font-semibold text-slate-600 flex justify-between">
                      <span>Created: {previewData.manifest?.createdAt ? new Date(previewData.manifest.createdAt).toLocaleString() : 'N/A'}</span>
                      <span>Version: v{previewData.manifest?.backupVersion || 1}</span>
                    </div>
                  </div>

                  {/* Validation Errors check */}
                  {!previewData.isValid ? (
                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-2 text-xs">
                      <div className="font-extrabold text-rose-900 flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        BACKUP VALIDATION FAILED — RESTORE DISALLOWED
                      </div>
                      <ul className="list-disc list-inside space-y-1 font-medium">
                        {previewData.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    /* Data breakdown counts */
                    <div className="space-y-3">
                      <h5 className="text-xs font-extrabold uppercase text-slate-500 tracking-wider">
                        Archive Data Breakdown
                      </h5>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold text-slate-800">
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                          <span className="block text-indigo-600 text-lg font-black">{previewData.collectionCounts?.inventoryItems || 0}</span>
                          <span className="text-[10px] text-slate-500 uppercase">Inventory</span>
                        </div>
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                          <span className="block text-indigo-600 text-lg font-black">{previewData.collectionCounts?.storageNodes || 0}</span>
                          <span className="text-[10px] text-slate-500 uppercase">Storage Nodes</span>
                        </div>
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                          <span className="block text-indigo-600 text-lg font-black">{previewData.collectionCounts?.projects || 0}</span>
                          <span className="text-[10px] text-slate-500 uppercase">Projects</span>
                        </div>
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                          <span className="block text-indigo-600 text-lg font-black">{previewData.collectionCounts?.buyListItems || 0}</span>
                          <span className="text-[10px] text-slate-500 uppercase">Buy List</span>
                        </div>
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                          <span className="block text-indigo-600 text-lg font-black">{(previewData.collectionCounts?.inventoryUsages || 0) + (previewData.collectionCounts?.inventoryStockIns || 0) + (previewData.collectionCounts?.inventoryAdjustments || 0)}</span>
                          <span className="text-[10px] text-slate-500 uppercase">History Records</span>
                        </div>
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                          <span className="block text-indigo-600 text-lg font-black">{previewData.collectionCounts?.notifications || 0}</span>
                          <span className="text-[10px] text-slate-500 uppercase">Notifications</span>
                        </div>
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                          <span className="block text-indigo-600 text-lg font-black">{previewData.collectionCounts?.auditLogs || 0}</span>
                          <span className="text-[10px] text-slate-500 uppercase">Audit Logs</span>
                        </div>
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                          <span className="block text-indigo-600 text-lg font-black">{previewData.collectionCounts?.users || 0}</span>
                          <span className="text-[10px] text-slate-500 uppercase">Users</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Warning Banner & Confirmation */}
                  {previewData.isValid && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-900 space-y-1">
                        <div className="font-extrabold text-sm text-amber-900 flex items-center gap-2">
                          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          ⚠ RESTORING THIS BACKUP WILL MODIFY EXISTING APPLICATION DATA.
                        </div>
                        <p className="text-xs font-medium text-amber-800">
                          A pre-restore safety backup will be created automatically before modification.
                        </p>
                      </div>

                      <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200">
                        <input
                          type="checkbox"
                          checked={confirmCheckbox}
                          onChange={(e) => setConfirmCheckbox(e.target.checked)}
                          className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-800 select-none">
                          I confirm that I want to execute database restoration from this backup file.
                        </span>
                      </label>

                      <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
                        <button
                          onClick={closeRestoreModal}
                          className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-extrabold text-xs transition-colors cursor-pointer"
                        >
                          CANCEL
                        </button>
                        <button
                          onClick={handleExecuteRestore}
                          disabled={!confirmCheckbox}
                          className={`px-5 py-2.5 rounded-xl text-xs font-extrabold tracking-wider uppercase transition-all shadow-md flex items-center gap-1.5 cursor-pointer ${
                            confirmCheckbox
                              ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20 active:scale-[0.98]'
                              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <span>[ CONFIRM AND RESTORE ]</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BackupRestore;
