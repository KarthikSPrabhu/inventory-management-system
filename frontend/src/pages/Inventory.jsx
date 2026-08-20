import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { getInventoryItems, getInventoryCategories, getProjects } from '../services/inventoryService';
import InventoryCard from '../components/inventory/InventoryCard';
import InventoryEmptyState from '../components/inventory/InventoryEmptyState';
import StorageVisualizer from '../components/storage/StorageVisualizer';
import StorageLocationPanel from '../components/storage/StorageLocationPanel';
import Dashboard from '../components/dashboard/Dashboard';
import TakeItemModal from '../components/inventory/TakeItemModal';
import AddStockModal from '../components/inventory/AddStockModal';
import MoveItemModal from '../components/inventory/MoveItemModal';
import { getPhysicalDrawerNumbers } from '../config/storageConfig';
import { useAuth } from '../context/AuthContext';
import { useStorage } from '../context/StorageContext';
import { getLocationDisplayId, resolveNodeHierarchy } from '../utils/locationUtils';
import useDebounce from '../hooks/useDebounce';

// Skeleton Loader Card component
const SkeletonCard = () => (
  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-md animate-pulse flex flex-col">
    <div className="h-36 bg-slate-100"></div>
    <div className="p-4 flex-grow space-y-3">
      <div className="space-y-2">
        <div className="h-4 bg-white rounded w-3/4"></div>
        <div className="h-3 bg-white rounded w-1/2"></div>
      </div>
      <div className="pt-2 border-t border-slate-200 space-y-2">
        <div className="h-3 bg-white rounded w-1/3"></div>
      </div>
      <div className="h-9 bg-white rounded-xl mt-2"></div>
    </div>
  </div>
);

function Inventory() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const routerLocation = useLocation();
  const { isAdmin } = useAuth();
  const { tree } = useStorage();

  const activeTab = searchParams.get('tab') || 'dashboard';
  const searchQuery = searchParams.get('search') || '';
  const [searchInput, setSearchInput] = useState(searchQuery);
  const debouncedSearch = useDebounce(searchInput, 300);

  const filterSection = searchParams.get('section') || 'All';
  const filterUnit = searchParams.get('storageUnit') || searchParams.get('unit') || 'All';
  const filterContainer = searchParams.get('container') || searchParams.get('locationNode') || 'All';
  const filterStatus = searchParams.get('status') || 'All';
  const filterCategory = searchParams.get('category') || 'All';
  const filterProject = searchParams.get('project') || 'All';
  const filterBuyList = searchParams.get('buyList') || 'All';
  const sortOption = searchParams.get('sort') || 'Recently Updated';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  // Sync debounced search value to searchParams
  useEffect(() => {
    if (debouncedSearch !== searchQuery) {
      updateParams({ search: debouncedSearch });
    }
  }, [debouncedSearch]);

  // Sync searchInput if URL changes externally (e.g. clearing filter chip)
  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);
  
  const visualizerRef = useRef(null);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flashMessage, setFlashMessage] = useState('');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [paginationInfo, setPaginationInfo] = useState({ total: 0, page: 1, totalPages: 1, count: 0, limit: 20 });
  
  // Two-way state management for physical storage visualizer
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeSection, setActiveSection] = useState('A');
  const [activeBoxDrawer, setActiveBoxDrawer] = useState(0);
  const [isRackBoxFilter, setIsRackBoxFilter] = useState(false);
  const [isUnresolvableLocation, setIsUnresolvableLocation] = useState(false);

  // Modals state
  const [takeItemTarget, setTakeItemTarget] = useState(null);
  const [isTakeModalOpen, setIsTakeModalOpen] = useState(false);

  const [addStockTarget, setAddStockTarget] = useState(null);
  const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);

  const [moveItemTarget, setMoveItemTarget] = useState(null);
  const [isMoveItemModalOpen, setIsMoveItemModalOpen] = useState(false);

  // Fetch filter options (categories & projects)
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const catRes = await getInventoryCategories();
        if (catRes.success) setCategories(catRes.data || []);
      } catch (e) { console.error('Categories error:', e); }

      try {
        const projRes = await getProjects();
        if (projRes.success) setProjects(projRes.data || []);
      } catch (e) { console.error('Projects error:', e); }
    };
    fetchOptions();
  }, []);

  // Fetch items from API with server-side filtering, sorting, and pagination
  const loadInventory = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        search: searchQuery,
        section: filterSection,
        storageUnit: filterUnit,
        container: filterContainer,
        status: filterStatus,
        category: filterCategory,
        project: filterProject,
        buyList: filterBuyList,
        sort: sortOption,
        page: currentPage,
        limit: 20
      };

      const response = await getInventoryItems(params);
      if (response.success) {
        setItems(response.data || []);
        setPaginationInfo({
          total: response.total !== undefined ? response.total : (response.data || []).length,
          page: response.page || 1,
          totalPages: response.totalPages || 1,
          count: response.count !== undefined ? response.count : (response.data || []).length,
          limit: response.limit || 20
        });
      } else {
        throw new Error(response.message || 'Failed to retrieve catalog');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unable to load inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, [searchQuery, filterSection, filterUnit, filterContainer, filterStatus, filterCategory, filterProject, filterBuyList, sortOption, currentPage]);

  // Handle flash messages
  useEffect(() => {
    if (routerLocation.state && routerLocation.state.flash) {
      setFlashMessage(routerLocation.state.flash);
      window.history.replaceState({}, document.title);
      
      const timer = setTimeout(() => {
        setFlashMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [routerLocation]);

  // Sync parameters with URL query string
  const updateParams = (newParams) => {
    const params = new URLSearchParams(searchParams);
    Object.keys(newParams).forEach(key => {
      const val = newParams[key];
      if (val !== undefined && val !== null && val !== '' && val !== 'All') {
        params.set(key, val);
      } else {
        params.delete(key);
      }
    });

    if (!('page' in newParams)) {
      params.delete('page');
    }

    setSearchParams(params);
  };

  const handleTabChange = (tabName) => updateParams({ tab: tabName });
  const handleSearchChange = (query) => updateParams({ search: query });

  // ITEM -> DRAWER: Clicking an item card or specific location badge
  const handleLocateItem = (item, specificNode = null) => {
    if (selectedItem && selectedItem._id === item._id && !specificNode) {
      setSelectedItem(null);
      setActiveBoxDrawer(0);
      setIsRackBoxFilter(false);
      setIsUnresolvableLocation(false);
    } else {
      setSelectedItem(item);
      setIsRackBoxFilter(false);

      let drawerNum = 0;
      let section = 'A';
      if (specificNode) {
        const resolved = resolveNodeHierarchy(specificNode, tree);
        drawerNum = resolved?.physicalDrawer || 0;
        section = resolved?.section || 'A';
      } else {
        const drawers = getPhysicalDrawerNumbers(item.locations, tree);
        if (drawers.length > 0) {
          drawerNum = drawers[0].drawer;
          section = drawers[0].section;
        }
      }

      if (drawerNum > 0) {
        setActiveSection(section);
        setActiveBoxDrawer(drawerNum);
        setIsUnresolvableLocation(false);
      } else {
        setActiveBoxDrawer(0);
        setIsUnresolvableLocation(true);
      }

      if (window.innerWidth < 1024 && visualizerRef.current) {
        setTimeout(() => {
          visualizerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  };

  const handleSelectSpecificLocation = (node) => {
    if (selectedItem) {
      handleLocateItem(selectedItem, node);
    }
  };

  const handleSelectBoxDrawer = (drawerNum) => {
    if (activeBoxDrawer === drawerNum && isRackBoxFilter) {
      setActiveBoxDrawer(0);
      setSelectedItem(null);
      setIsRackBoxFilter(false);
      setIsUnresolvableLocation(false);
    } else {
      setActiveBoxDrawer(drawerNum);
      setIsRackBoxFilter(true);
      setIsUnresolvableLocation(false);
      const itemsInDrawer = items.filter((it) => 
        getPhysicalDrawerNumbers(it.locations, tree).some(d => d.section === activeSection && d.drawer === drawerNum)
      );
      if (itemsInDrawer.length > 0) {
        setSelectedItem(itemsInDrawer[0]);
      } else {
        setSelectedItem(null);
      }
    }
  };

  const handleResetStorageView = () => {
    setActiveBoxDrawer(0);
    setSelectedItem(null);
    setIsRackBoxFilter(false);
    setIsUnresolvableLocation(false);
  };

  // Modal handlers
  const handleOpenTakeModal = (item) => { setTakeItemTarget(item); setIsTakeModalOpen(true); };
  const handleCloseTakeModal = () => { setIsTakeModalOpen(false); setTakeItemTarget(null); };
  const handleTakeSuccess = (flashMsg) => { setFlashMessage(flashMsg); loadInventory(); };

  const handleOpenAddStockModal = (item) => { setAddStockTarget(item); setIsAddStockModalOpen(true); };
  const handleCloseAddStockModal = () => { setIsAddStockModalOpen(false); setAddStockTarget(null); };
  const handleAddStockSuccess = (flashMsg) => { setFlashMessage(flashMsg); loadInventory(); };

  const handleOpenMoveModal = (item) => { setMoveItemTarget(item); setIsMoveItemModalOpen(true); };
  const handleCloseMoveModal = () => { setIsMoveItemModalOpen(false); setMoveItemTarget(null); };
  const handleMoveSuccess = (flashMsg) => { setFlashMessage(flashMsg); loadInventory(); };

  // Calculate items assigned to currently open physical drawer
  const itemsInActiveDrawer = activeBoxDrawer > 0
    ? items.filter((it) => getPhysicalDrawerNumbers(it.locations, tree).some(d => d.section === activeSection && d.drawer === activeBoxDrawer))
    : [];

  // Storage Units dropdown options depending on Section
  const getAvailableUnits = () => {
    if (filterSection === 'A') return ['A01', 'A02', 'A03', 'A04', 'A05', 'A06'];
    if (filterSection === 'B') return ['B01', 'B02'];
    return ['A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'B01', 'B02'];
  };

  // Nested Containers options depending on selected Storage Unit
  const getAvailableContainers = () => {
    if (!tree || filterUnit === 'All') return [];
    let unitNode = null;
    for (const secNode of tree) {
      if (secNode.children) {
        for (const uNode of secNode.children) {
          if (String(uNode._id) === filterUnit || uNode.displayId === filterUnit || uNode.code === filterUnit) {
            unitNode = uNode;
            break;
          }
        }
      }
    }
    if (!unitNode || !unitNode.children) return [];
    const containersList = [];
    const traverse = (children) => {
      children.forEach(c => {
        containersList.push(c);
        if (c.children && c.children.length > 0) traverse(c.children);
      });
    };
    traverse(unitNode.children);
    return containersList;
  };

  // Active Filter Chips
  const activeFilterChips = [];
  if (searchQuery) {
    activeFilterChips.push({ key: 'search', label: `Search: "${searchQuery}"`, clear: () => updateParams({ search: '' }) });
  }
  if (filterSection !== 'All') {
    activeFilterChips.push({ key: 'section', label: `Section: ${filterSection}`, clear: () => updateParams({ section: 'All', storageUnit: 'All', container: 'All' }) });
  }
  if (filterUnit !== 'All') {
    activeFilterChips.push({ key: 'storageUnit', label: `Unit: ${filterUnit}`, clear: () => updateParams({ storageUnit: 'All', container: 'All' }) });
  }
  if (filterContainer !== 'All') {
    activeFilterChips.push({ key: 'container', label: `Container: ${filterContainer}`, clear: () => updateParams({ container: 'All' }) });
  }
  if (filterStatus !== 'All') {
    activeFilterChips.push({ key: 'status', label: `Status: ${filterStatus}`, clear: () => updateParams({ status: 'All' }) });
  }
  if (filterCategory !== 'All') {
    activeFilterChips.push({ key: 'category', label: `Category: ${filterCategory}`, clear: () => updateParams({ category: 'All' }) });
  }
  if (filterProject !== 'All') {
    const projName = projects.find(p => String(p._id) === filterProject || p.name === filterProject)?.name || filterProject;
    activeFilterChips.push({ key: 'project', label: `Project: ${projName}`, clear: () => updateParams({ project: 'All' }) });
  }
  if (filterBuyList !== 'All') {
    activeFilterChips.push({ key: 'buyList', label: `Buy List: ${filterBuyList}`, clear: () => updateParams({ buyList: 'All' }) });
  }
  const handleClearAllFilters = () => {
    setSearchParams(new URLSearchParams(activeTab !== 'dashboard' ? { tab: activeTab } : {}));
  };

  // Filter items by clicked physical rack box when isRackBoxFilter is active
  const displayItems = isRackBoxFilter && activeBoxDrawer > 0
    ? items.filter((it) => 
        getPhysicalDrawerNumbers(it.locations, tree).some(d => d.section === activeSection && d.drawer === activeBoxDrawer)
      )
    : items;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header and Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">INVENTORY WORKSPACE</h3>
          <p className="text-xs text-slate-500 mt-1">Manage and locate everything in your physical storage.</p>
        </div>
        
        {/* Top-Right Prominent + Add Item Button (Admin only) */}
        {isAdmin && (
          <Link
            to="/inventory/add"
            className="w-full sm:w-auto inline-flex items-center gap-2 justify-center bg-indigo-600 hover:bg-indigo-50 text-slate-900 font-extrabold text-xs px-5 py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/25 hover:shadow-indigo-500/40 shrink-0 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Item</span>
          </Link>
        )}
      </div>

      {/* Flash Success Notification */}
      {flashMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 p-4 rounded-xl text-xs flex gap-3 items-center">
          <svg className="w-5 h-5 shrink-0 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="font-semibold">{flashMessage}</div>
        </div>
      )}

      {/* API Error Alert */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h5 className="text-sm font-bold text-slate-900">Connection Error</h5>
              <p className="text-xs text-slate-500 mt-0.5">Unable to load inventory. Check server status.</p>
            </div>
          </div>
          <button
            onClick={loadInventory}
            className="bg-rose-50 hover:bg-rose-50 text-rose-600 hover:text-slate-900 border border-rose-200 hover:border-transparent font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Workspace Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => handleTabChange('dashboard')}
          className={`text-xs font-bold px-4 py-2 rounded-t-lg transition-colors cursor-pointer ${
            activeTab === 'dashboard'
              ? 'bg-slate-100 text-indigo-700 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          Intelligence Dashboard
        </button>
        <button
          onClick={() => handleTabChange('catalog')}
          className={`text-xs font-bold px-4 py-2 rounded-t-lg transition-colors cursor-pointer ${
            activeTab === 'catalog'
              ? 'bg-slate-100 text-indigo-700 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          Inventory Catalog
        </button>
      </div>

      {/* SEARCH AND MULTI-FILTER CONTROL BAR (Only if Catalog tab active) */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
            
            {/* Top Row: Search Input + Mobile Filter Button */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="🔍 Search inventory by name, location ID, section, unit, container, category, project..."
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500/60 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-colors"
                />
                {searchInput && (
                  <button
                    onClick={() => {
                      setSearchInput('');
                      handleSearchChange('');
                      handleResetStorageView();
                    }}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Mobile Filter Modal Toggle Button */}
              <button
                onClick={() => setIsMobileFilterOpen(true)}
                className="md:hidden flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span>FILTERS</span>
                {activeFilterChips.length > 0 && (
                  <span className="bg-indigo-600 text-slate-900 text-[10px] font-black rounded-full px-1.5 py-0.2">
                    {activeFilterChips.length}
                  </span>
                )}
              </button>
            </div>

            {/* Desktop Filter Bar (Hidden on Mobile) */}
            <div className="hidden md:flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
              
              {/* Section Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Section</span>
                <select
                  value={filterSection}
                  onChange={(e) => updateParams({ section: e.target.value, storageUnit: 'All', container: 'All' })}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                >
                  <option value="All">All</option>
                  <option value="A">Section A</option>
                  <option value="B">Section B</option>
                </select>
              </div>

              {/* Storage Unit Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Unit</span>
                <select
                  value={filterUnit}
                  onChange={(e) => updateParams({ storageUnit: e.target.value, container: 'All' })}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                >
                  <option value="All">All Units</option>
                  {getAvailableUnits().map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              {/* Container Filter */}
              {getAvailableContainers().length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Container</span>
                  <select
                    value={filterContainer}
                    onChange={(e) => updateParams({ container: e.target.value })}
                    className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="All">All Containers</option>
                    {getAvailableContainers().map(c => (
                      <option key={c._id} value={c.displayId || c.code}>{c.displayId} ({c.name})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Status Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</span>
                <select
                  value={filterStatus}
                  onChange={(e) => updateParams({ status: e.target.value })}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                >
                  <option value="All">All Statuses</option>
                  <option value="In Stock">🟢 In Stock</option>
                  <option value="Low Stock">🟠 Low Stock</option>
                  <option value="Out of Stock">🔴 Out of Stock</option>
                </select>
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Category</span>
                <select
                  value={filterCategory}
                  onChange={(e) => updateParams({ category: e.target.value })}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 max-w-[140px]"
                >
                  <option value="All">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Project Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Project</span>
                <select
                  value={filterProject}
                  onChange={(e) => updateParams({ project: e.target.value })}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 max-w-[140px]"
                >
                  <option value="All">All Projects</option>
                  {projects.map(p => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Buy List Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Buy List</span>
                <select
                  value={filterBuyList}
                  onChange={(e) => updateParams({ buyList: e.target.value })}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                >
                  <option value="All">All</option>
                  <option value="On Buy List">On Buy List</option>
                  <option value="Not On Buy List">Not On Buy List</option>
                </select>
              </div>

              {/* Sorting */}
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sort</span>
                <select
                  value={sortOption}
                  onChange={(e) => updateParams({ sort: e.target.value })}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                >
                  <option value="Recently Updated">Recently Updated</option>
                  <option value="Recently Added">Recently Added</option>
                  <option value="Name A-Z">Name A → Z</option>
                  <option value="Name Z-A">Name Z → A</option>
                  <option value="Quantity Low-High">Quantity low → high</option>
                  <option value="Quantity High-Low">Quantity high → low</option>
                  <option value="Most Used">Most Used</option>
                  <option value="Least Used">Least Used</option>
                </select>
              </div>
            </div>
          </div>

          {/* Active Filter Chips Row */}
          {activeFilterChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 px-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Filters:</span>
              {activeFilterChips.map(chip => (
                <span
                  key={chip.key}
                  className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold px-2.5 py-1 rounded-lg"
                >
                  <span>{chip.label}</span>
                  <button
                    onClick={chip.clear}
                    className="hover:text-indigo-900 transition-colors cursor-pointer"
                    title="Remove filter"
                  >
                    ×
                  </button>
                </span>
              ))}

              <button
                onClick={handleClearAllFilters}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1 rounded-lg transition-colors cursor-pointer ml-1"
              >
                Clear All
              </button>
            </div>
          )}


        </div>
      )}

      {/* Mobile Filter Modal Panel */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end animate-fadeIn">
          <div className="w-full max-w-xs bg-white h-full p-6 space-y-5 overflow-y-auto shadow-2xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Filter Inventory</h4>
                <button onClick={() => setIsMobileFilterOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Mobile Section */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Section</label>
                <select
                  value={filterSection}
                  onChange={(e) => updateParams({ section: e.target.value, storageUnit: 'All', container: 'All' })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl p-2.5"
                >
                  <option value="All">All Sections</option>
                  <option value="A">Section A</option>
                  <option value="B">Section B</option>
                </select>
              </div>

              {/* Mobile Storage Unit */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Storage Unit</label>
                <select
                  value={filterUnit}
                  onChange={(e) => updateParams({ storageUnit: e.target.value, container: 'All' })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl p-2.5"
                >
                  <option value="All">All Storage Units</option>
                  {getAvailableUnits().map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              {/* Mobile Container */}
              {getAvailableContainers().length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Nested Container</label>
                  <select
                    value={filterContainer}
                    onChange={(e) => updateParams({ container: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl p-2.5"
                  >
                    <option value="All">All Containers</option>
                    {getAvailableContainers().map(c => (
                      <option key={c._id} value={c.displayId || c.code}>{c.displayId} ({c.name})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Mobile Status */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Stock Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => updateParams({ status: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl p-2.5"
                >
                  <option value="All">All Statuses</option>
                  <option value="In Stock">🟢 In Stock</option>
                  <option value="Low Stock">🟠 Low Stock</option>
                  <option value="Out of Stock">🔴 Out of Stock</option>
                </select>
              </div>

              {/* Mobile Category */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Category</label>
                <select
                  value={filterCategory}
                  onChange={(e) => updateParams({ category: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl p-2.5"
                >
                  <option value="All">All Categories</option>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Mobile Project */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Project</label>
                <select
                  value={filterProject}
                  onChange={(e) => updateParams({ project: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl p-2.5"
                >
                  <option value="All">All Projects</option>
                  {projects.map(p => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Mobile Buy List */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Buy List</label>
                <select
                  value={filterBuyList}
                  onChange={(e) => updateParams({ buyList: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl p-2.5"
                >
                  <option value="All">All Items</option>
                  <option value="On Buy List">On Buy List</option>
                  <option value="Not On Buy List">Not On Buy List</option>
                </select>
              </div>

              {/* Mobile Sort */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Sort By</label>
                <select
                  value={sortOption}
                  onChange={(e) => updateParams({ sort: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl p-2.5"
                >
                  <option value="Recently Updated">Recently Updated</option>
                  <option value="Recently Added">Recently Added</option>
                  <option value="Name A-Z">Name A → Z</option>
                  <option value="Name Z-A">Name Z → A</option>
                  <option value="Quantity Low-High">Quantity low → high</option>
                  <option value="Quantity High-Low">Quantity high → low</option>
                  <option value="Most Used">Most Used</option>
                  <option value="Least Used">Least Used</option>
                </select>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-slate-200">
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="w-full bg-indigo-600 text-slate-900 font-extrabold text-xs py-3 rounded-xl shadow-lg"
              >
                Apply Filters
              </button>
              <button
                onClick={() => { handleClearAllFilters(); setIsMobileFilterOpen(false); }}
                className="w-full bg-slate-100 text-slate-700 font-bold text-xs py-2.5 rounded-xl"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN UNIFIED WORKSPACE */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl h-96 animate-pulse" />
        </div>
      ) : error ? (
        <div className="bg-white border border-slate-200 p-12 rounded-2xl text-center flex flex-col items-center justify-center">
          <p className="text-xs text-slate-500 italic">Could not sync catalog with MongoDB Atlas.</p>
        </div>
      ) : (
        /* ═══ WORKSPACE LAYOUT ═══ */
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 items-start">
          
          {/* PHYSICAL STORAGE RACK PANEL */}
          <div ref={visualizerRef} className="order-1 lg:order-2 lg:col-span-5 space-y-5 lg:sticky lg:top-20 w-full">
            {/* Storage Rack Visualizer */}
            <StorageVisualizer
              activeSection={activeSection}
              selectedDrawer={activeBoxDrawer}
              selectedStorageUnit={activeBoxDrawer}
              unresolvable={isUnresolvableLocation}
              unresolvableMessage={selectedItem ? `Item "${selectedItem.name}" location could not be resolved.` : ''}
              locations={selectedItem?.locations}
              item={selectedItem}
              onSelectDrawer={handleSelectBoxDrawer}
              onReset={handleResetStorageView}
              onSectionChange={(sec) => { setActiveSection(sec); setActiveBoxDrawer(0); setSelectedItem(null); setIsRackBoxFilter(false); }}
            />

            {/* Storage Location & Open Box Breakdown Panel */}
            <StorageLocationPanel
              selectedDrawer={activeBoxDrawer}
              drawerItems={itemsInActiveDrawer}
              locations={selectedItem?.locations}
              item={selectedItem}
              onSelectLocation={handleSelectSpecificLocation}
            />
          </div>

          {/* LEFT COLUMN: DASHBOARD OR CATALOG */}
          {activeTab === 'dashboard' ? (
            <div className="order-2 lg:order-1 lg:col-span-7 space-y-4 w-full">
              <Dashboard 
                items={items} 
                tree={tree} 
                isAdmin={isAdmin} 
                onAction={(type, payload) => {
                  if (type === 'catalog') {
                    updateParams({ tab: 'catalog', ...payload });
                  }
                }} 
              />
            </div>
          ) : (
            <div className="order-2 lg:order-1 lg:col-span-7 space-y-4 w-full">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {isRackBoxFilter && activeBoxDrawer > 0 ? `Box ${activeBoxDrawer} (Section ${activeSection}) Contents` : 'Inventory Catalog'}
                  </span>
                  <span className="bg-white border border-slate-200 text-indigo-600 font-mono text-[11px] font-bold px-2 py-0.5 rounded-md">
                    {displayItems.length} {displayItems.length === 1 ? 'item' : 'items'}
                  </span>
                </div>
              </div>

              {displayItems.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
                  <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-slate-900">
                      {isRackBoxFilter && activeBoxDrawer > 0 ? `Box ${activeBoxDrawer} (Section ${activeSection}) is currently empty` : 'No inventory items found.'}
                    </h4>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">
                      {isRackBoxFilter && activeBoxDrawer > 0
                        ? 'Click the opened drawer on the physical rack again or clear the box filter to view all catalog items.'
                        : 'Try clearing some filters, using a different search term, or checking another storage section.'}
                    </p>
                  </div>

                  <button
                    onClick={isRackBoxFilter ? handleResetStorageView : handleClearAllFilters}
                    className="bg-indigo-600 hover:bg-indigo-700 text-slate-900 text-xs font-extrabold px-5 py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    {isRackBoxFilter ? 'Clear Box Filter' : 'Clear Filters'}
                  </button>
                </div>
              ) : (
                /* Scrollable Cards Grid for Inventory Items */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:max-h-[760px] lg:overflow-y-auto lg:pr-1">
                    {displayItems.map((item) => {
                      const isSelected = selectedItem && selectedItem._id === item._id;
                      
                      return (
                        <InventoryCard
                          key={item._id}
                          item={item}
                          searchQuery={searchQuery}
                          onLocate={handleLocateItem}
                          onTakeItem={handleOpenTakeModal}
                          onAddStock={isAdmin ? handleOpenAddStockModal : undefined}
                          onMoveItem={isAdmin ? handleOpenMoveModal : undefined}
                          isLocated={isSelected}
                        />
                      );
                    })}
                  </div>

                  {/* Pagination Controls */}
                  {paginationInfo.totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 text-xs bg-white p-4 rounded-2xl border">
                      <span className="text-slate-500 font-medium">
                        Showing <strong className="text-slate-800">{((paginationInfo.page - 1) * paginationInfo.limit) + 1}</strong>–<strong className="text-slate-800">{Math.min(paginationInfo.page * paginationInfo.limit, paginationInfo.total)}</strong> of <strong className="text-slate-800">{paginationInfo.total}</strong> items
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateParams({ page: Math.max(1, paginationInfo.page - 1) })}
                          disabled={paginationInfo.page <= 1}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold"
                        >
                          Previous
                        </button>

                        {Array.from({ length: paginationInfo.totalPages }, (_, i) => i + 1).map(p => (
                          <button
                            key={p}
                            onClick={() => updateParams({ page: p })}
                            className={`w-8 h-8 rounded-lg font-bold transition-all cursor-pointer ${
                              paginationInfo.page === p
                                ? 'bg-indigo-600 text-slate-900 shadow-sm'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {p}
                          </button>
                        ))}

                        <button
                          onClick={() => updateParams({ page: Math.min(paginationInfo.totalPages, paginationInfo.page + 1) })}
                          disabled={paginationInfo.page >= paginationInfo.totalPages}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Phase 9: Take Item Modal */}
      <TakeItemModal
        item={takeItemTarget}
        isOpen={isTakeModalOpen}
        onClose={handleCloseTakeModal}
        onSuccess={handleTakeSuccess}
      />

      {/* Phase 11: Add Stock Modal */}
      <AddStockModal
        item={addStockTarget}
        isOpen={isAddStockModalOpen}
        onClose={handleCloseAddStockModal}
        onSuccess={handleAddStockSuccess}
      />

      {/* Phase 20: Move Item Modal */}
      <MoveItemModal
        item={moveItemTarget}
        isOpen={isMoveItemModalOpen}
        onClose={handleCloseMoveModal}
        onSuccess={handleMoveSuccess}
      />
    </div>
  );
}

export default Inventory;
