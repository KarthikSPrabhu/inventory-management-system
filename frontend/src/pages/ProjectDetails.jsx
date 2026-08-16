import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getProjectUsage, updateProject, deleteProject } from '../services/inventoryService';

function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [projectData, setProjectData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getProjectUsage(id);
      if (response.success && response.data) {
        setProjectData(response.data);
      } else {
        throw new Error(response.message || 'Failed to load project usage details');
      }
    } catch (err) {
      console.error('Project Details error:', err);
      setError(err.message || 'Unable to load project details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDetails();
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    if (!projectData?.project || updatingStatus) return;
    setUpdatingStatus(true);
    try {
      const response = await updateProject(id, { status: newStatus });
      if (response.success && response.data) {
        setProjectData(prev => ({
          ...prev,
          project: { ...prev.project, status: newStatus }
        }));
      }
    } catch (err) {
      console.error('Update status error:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectData?.project || deleting) return;
    const confirmDelete = window.confirm(`Are you sure you want to delete project "${projectData.project.name}"?\n\nThis will remove the project and its associated withdrawal history.`);
    if (!confirmDelete) return;

    setDeleting(true);
    try {
      const response = await deleteProject(id);
      if (response.success) {
        navigate('/projects', { state: { flash: `Project "${projectData.project.name}" deleted successfully.` } });
      } else {
        throw new Error(response.message || 'Failed to delete project');
      }
    } catch (err) {
      console.error('Delete project error:', err);
      alert(err.message || 'Unable to delete project.');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-slate-900 rounded" />
        <div className="h-24 bg-slate-900 rounded-2xl" />
        <div className="h-64 bg-slate-900 rounded-2xl" />
      </div>
    );
  }

  if (error || !projectData) {
    return (
      <div className="space-y-6">
        <Link to="/projects" className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white">
          &larr; Back to Projects
        </Link>
        <div className="bg-rose-500/10 border border-rose-500/25 p-6 rounded-2xl text-rose-400 text-sm font-semibold">
          {error || 'Project not found.'}
        </div>
      </div>
    );
  }

  const { project, summary, items, activityRecords = [] } = projectData;

  let statusBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25';
  if (project.status === 'completed') statusBadge = 'bg-blue-500/10 text-blue-400 border-blue-500/25';
  if (project.status === 'archived') statusBadge = 'bg-slate-500/10 text-slate-400 border-slate-500/25';

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Breadcrumb & Delete Action */}
      <div className="flex items-center justify-between">
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Projects</span>
        </Link>

        {/* Delete Project Action Button */}
        <button
          onClick={handleDeleteProject}
          disabled={deleting}
          className="inline-flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/25 hover:border-transparent font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
        >
          {deleting ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Deleting...</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Delete Project</span>
            </>
          )}
        </button>
      </div>

      {/* Project Banner Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{project.name}</h2>
              <span className={`text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-lg border ${statusBadge}`}>
                {project.status}
              </span>
            </div>
            {project.description && (
              <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-2xl leading-relaxed">
                {project.description}
              </p>
            )}
          </div>

          {/* Status Switcher Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status:</span>
            <select
              value={project.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={updatingStatus}
              className="bg-slate-950 border border-slate-800 text-xs font-bold text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Summary Metrics Bar (Requirement 9) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-850">
          <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Different Items</span>
            <span className="text-xl font-black text-indigo-400 font-mono mt-1 block">
              {summary.differentItemsCount}
            </span>
          </div>

          <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Units Used</span>
            <span className="text-xl font-black text-emerald-400 font-mono mt-1 block">
              {summary.totalUnitsUsed}
            </span>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-slate-950/60 border border-slate-850 p-4 rounded-xl">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Created On</span>
            <span className="text-xs font-bold text-slate-300 font-mono mt-1.5 block">
              {new Date(project.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* CURRENT COMPONENTS (Requirement 8) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">CURRENT COMPONENTS</h3>
          <Link
            to="/inventory"
            className="text-xs font-extrabold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
          >
            <span>+ Take More Items</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-amber-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h4 className="text-sm font-bold text-white">No components taken for this project yet</h4>
            <p className="text-xs text-slate-400 max-w-sm">
              Head to the Inventory Workspace, select any item, click <strong>TAKE</strong>, and choose this project.
            </p>
            <Link
              to="/inventory"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md mt-2"
            >
              Go to Inventory Workspace
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((row) => {
              const { item, quantityUsed, location, notes } = row;
              const currentStock = item?.quantity ?? 0;
              const itemId = item?._id;

              return (
                <div
                  key={itemId || location}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-md flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Item header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        {itemId ? (
                          <Link
                            to={`/inventory/${itemId}`}
                            className="text-sm font-extrabold text-white hover:text-indigo-400 transition-colors line-clamp-1"
                          >
                            {item?.name || 'Inventory Item'}
                          </Link>
                        ) : (
                          <h4 className="text-sm font-extrabold text-white line-clamp-1">
                            {item?.name || 'Inventory Item'}
                          </h4>
                        )}
                        <span className="font-mono text-xs font-bold text-indigo-400 mt-1 block">
                          📍 {location}
                        </span>
                      </div>

                      <span className="bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-xl text-xs font-black shrink-0 font-mono">
                        {quantityUsed} {quantityUsed === 1 ? 'unit' : 'units'}
                      </span>
                    </div>

                    {notes && (
                      <p className="text-xs text-slate-400 italic bg-slate-950/60 p-2.5 rounded-xl border border-slate-850">
                        "{notes}"
                      </p>
                    )}
                  </div>

                  {/* Stock footer info */}
                  <div className="pt-3 border-t border-slate-850 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-semibold">Current Stock:</span>
                    <span className={`font-bold font-mono ${currentStock > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {currentStock > 0 ? `${currentStock} available` : '0 available (Out of stock)'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ACTIVITY Section (Requirement 8) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-850 pb-4">
          <div>
            <h3 className="text-base font-extrabold text-white tracking-tight uppercase">ACTIVITY</h3>
            <p className="text-xs text-slate-400 mt-0.5">Chronological log of withdrawals for {project.name}</p>
          </div>
          <Link
            to="/history"
            className="text-xs font-extrabold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
          >
            <span>View All History</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {activityRecords.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs font-medium">
            NO ACTIVITY YET
          </div>
        ) : (
          <div className="space-y-3">
            {activityRecords.map((rec) => {
              const itemName = rec.item?.name || 'Inventory Item';
              const itemId = rec.item?._id;
              const locationCode = rec.location || 'N/A';

              return (
                <div
                  key={rec._id}
                  className="bg-slate-950/70 border border-slate-850 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {itemId ? (
                        <Link
                          to={`/inventory/${itemId}`}
                          className="text-sm font-bold text-white hover:text-indigo-400 transition-colors"
                        >
                          {itemName}
                        </Link>
                      ) : (
                        <span className="text-sm font-bold text-white">{itemName}</span>
                      )}
                      <span className="font-mono text-[11px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        📍 {locationCode}
                      </span>
                    </div>
                    {rec.notes && (
                      <p className="text-xs text-slate-400 italic">"{rec.notes}"</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    <span className="text-xs font-bold text-rose-400 font-mono">
                      {rec.quantity} {rec.quantity === 1 ? 'unit' : 'units'}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {formatDate(rec.createdAt)}
                    </span>
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

export default ProjectDetails;
