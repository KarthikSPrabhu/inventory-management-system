import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProjects, deleteProject } from '../services/inventoryService';
import CreateProjectModal from '../components/projects/CreateProjectModal';
import { useAuth } from '../context/AuthContext';

function Projects() {
  const { isAdmin } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [flashMsg, setFlashMsg] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const fetchProjectsList = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getProjects();
      if (response.success) {
        setProjects(response.data || []);
      } else {
        throw new Error(response.message || 'Failed to load projects');
      }
    } catch (err) {
      console.error('Fetch Projects error:', err);
      setError(err.message || 'Unable to load projects.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectsList();
  }, []);

  const handleProjectCreated = (newProj) => {
    setFlashMsg(`Project "${newProj.name}" created successfully.`);
    fetchProjectsList();
    setTimeout(() => setFlashMsg(''), 4000);
  };

  const handleDeleteProject = async (proj) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete "${proj.name}"?\n\nThis will remove the project and its associated withdrawal records.`);
    if (!confirmDelete) return;

    setDeletingId(proj._id);
    try {
      const response = await deleteProject(proj._id);
      if (response.success) {
        setFlashMsg(`Project "${proj.name}" deleted successfully.`);
        fetchProjectsList();
        setTimeout(() => setFlashMsg(''), 4000);
      } else {
        throw new Error(response.message || 'Failed to delete project');
      }
    } catch (err) {
      console.error('Delete Project Error:', err);
      alert(err.message || 'Unable to delete project.');
    } finally {
      setDeletingId(null);
    }
  };

  // Filter projects by search query
  const filteredProjects = projects.filter(p => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.trim().toLowerCase();
    const nameMatch = p.name.toLowerCase().includes(query);
    const descMatch = (p.description || '').toLowerCase().includes(query);
    const statusMatch = p.status.toLowerCase().includes(query);
    return nameMatch || descMatch || statusMatch;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header and Create Project Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h3 className="text-2xl font-black text-white tracking-tight">PROJECTS</h3>
          <p className="text-xs text-slate-400 mt-1">Track components used across your hardware and software projects.</p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center gap-2 justify-center bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs px-5 py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/25 hover:shadow-indigo-500/40 shrink-0 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
            </svg>
            <span>Create Project</span>
          </button>
        )}
      </div>

      {/* Flash Success Notification */}
      {flashMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 p-4 rounded-xl text-xs flex gap-3 items-center">
          <svg className="w-5 h-5 shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="font-semibold">{flashMsg}</div>
        </div>
      )}

      {/* API Error Alert */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/25 p-5 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-400 shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h5 className="text-sm font-bold text-white">Error</h5>
              <p className="text-xs text-slate-400 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchProjectsList}
            className="bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 font-bold text-xs px-4 py-2 rounded-xl transition-all"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Search Input */}
      {!loading && !error && projects.length > 0 && (
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects by name, description, or status..."
            className="w-full bg-slate-900 border border-slate-800/85 focus:border-indigo-500/60 rounded-2xl pl-12 pr-12 py-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors shadow-lg"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Projects List Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl h-44 animate-pulse" />
          <div className="bg-slate-900 border border-slate-800 rounded-2xl h-44 animate-pulse" />
          <div className="bg-slate-900 border border-slate-800 rounded-2xl h-44 animate-pulse" />
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h4 className="text-base font-extrabold text-white">No projects created yet</h4>
          <p className="text-xs text-slate-400 max-w-sm">
            Create a project to begin taking inventory items and tracking component usage per project.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md"
          >
            + Create Project
          </button>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-10 text-center">
          <p className="text-xs text-slate-400">No projects match "{searchQuery}".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((proj) => {
            const stats = proj.stats || { differentItemsCount: 0, totalUnitsUsed: 0 };
            
            let statusBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25';
            if (proj.status === 'completed') statusBadge = 'bg-blue-500/10 text-blue-400 border-blue-500/25';
            if (proj.status === 'archived') statusBadge = 'bg-slate-500/10 text-slate-400 border-slate-500/25';

            const isDeletingThis = deletingId === proj._id;

            return (
              <Link
                key={proj._id}
                to={`/projects/${proj._id}`}
                className="bg-slate-900 border border-slate-800/80 hover:border-indigo-500/60 rounded-2xl p-5 flex flex-col justify-between shadow-md hover:shadow-lg transition-all group cursor-pointer"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-base font-extrabold text-white group-hover:text-indigo-400 transition-colors line-clamp-1">
                      {proj.name}
                    </h4>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${statusBadge}`}>
                        {proj.status}
                      </span>

                      {/* Delete Project Button */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteProject(proj);
                        }}
                        disabled={isDeletingThis}
                        title="Delete project"
                        className="p-1.5 rounded-lg border border-slate-800 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 hover:border-rose-500/30 transition-colors"
                      >
                        {isDeletingThis ? (
                          <svg className="w-3.5 h-3.5 animate-spin text-rose-400" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {proj.description ? (
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {proj.description}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-600 italic">No description provided</p>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-slate-850 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">
                    <strong className="text-indigo-400 font-mono">{stats.differentItemsCount}</strong> items &bull; <strong className="text-emerald-400 font-mono">{stats.totalUnitsUsed}</strong> units
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleProjectCreated}
      />
    </div>
  );
}

export default Projects;
