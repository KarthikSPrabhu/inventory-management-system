import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { getInventoryItems } from '../services/inventoryService';
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

  const searchQuery = searchParams.get('search') || '';
  const filterCategory = searchParams.get('category') || 'All';
  const filterStatus = searchParams.get('status') || 'All';
  const sortOption = searchParams.get('sort') || 'Recently Updated';
  
  const visualizerRef = useRef(null);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' or 'catalog'
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flashMessage, setFlashMessage] = useState('');
  
  // Two-way state management:
  // selectedItem - item chosen via clicking an item card
  // activeBoxDrawer - box chosen via clicking Box 1-6 on the physical rack
  // isRackBoxFilter - true ONLY when a physical rack drawer is clicked directly to filter contents
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeSection, setActiveSection] = useState('A');
  const [activeBoxDrawer, setActiveBoxDrawer] = useState(0);
  const [isRackBoxFilter, setIsRackBoxFilter] = useState(false);
  const [isUnresolvableLocation, setIsUnresolvableLocation] = useState(false);

  // Phase 9: Take Item Modal state
  const [takeItemTarget, setTakeItemTarget] = useState(null);
  const [isTakeModalOpen, setIsTakeModalOpen] = useState(false);

  // Phase 11: Add Stock Modal state
  const [addStockTarget, setAddStockTarget] = useState(null);
  const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);

  // Phase 20: Move Item Modal state
  const [moveItemTarget, setMoveItemTarget] = useState(null);
  const [isMoveItemModalOpen, setIsMoveItemModalOpen] = useState(false);

  // Fetch all items from Atlas
  const loadInventory = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getInventoryItems();
      if (response.success) {
        setItems(response.data);
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
  }, []);

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

  // Sync Search & Filter state with router URL
  const updateParams = (newParams) => {
    const params = new URLSearchParams(searchParams);
    Object.keys(newParams).forEach(key => {
      if (newParams[key] && newParams[key] !== 'All') {
        params.set(key, newParams[key]);
      } else {
        params.delete(key);
      }
    });
    setSearchParams(params);
  };

  const handleSearchChange = (query) => updateParams({ search: query });
  const handleCategoryChange = (cat) => updateParams({ category: cat });
  const handleStatusChange = (status) => updateParams({ status: status });
  const handleSortChange = (sort) => updateParams({ sort: sort });

  // ITEM -> DRAWER: Clicking an item card or specific location badge
  const handleLocateItem = (item, specificNode = null) => {
    if (selectedItem && selectedItem._id === item._id && !specificNode) {
      // Deselect
      setSelectedItem(null);
      setActiveBoxDrawer(0);
      setIsRackBoxFilter(false);
      setIsUnresolvableLocation(false);
    } else {
      setSelectedItem(item);
      setIsRackBoxFilter(false); // Keeps all catalog items visible!

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

      // Scroll to physical storage on mobile view
      if (window.innerWidth < 1024 && visualizerRef.current) {
        setTimeout(() => {
          visualizerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  };

  // Select a specific location from multi-location list in StorageLocationPanel
  const handleSelectSpecificLocation = (node) => {
    if (selectedItem) {
      handleLocateItem(selectedItem, node);
    }
  };

  // DRAWER -> ITEMS: Clicking Box 1..6 directly on the storage visualizer
  const handleSelectBoxDrawer = (drawerNum) => {
    if (activeBoxDrawer === drawerNum && isRackBoxFilter) {
      // Toggle close on second click
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

  // Reset storage view to default closed rack
  const handleResetStorageView = () => {
    setActiveBoxDrawer(0);
    setSelectedItem(null);
    setIsRackBoxFilter(false);
    setIsUnresolvableLocation(false);
  };

  // Open Take Item Modal
  const handleOpenTakeModal = (item) => {
    setTakeItemTarget(item);
    setIsTakeModalOpen(true);
  };

  // Close Take Item Modal
  const handleCloseTakeModal = () => {
    setIsTakeModalOpen(false);
    setTakeItemTarget(null);
  };

  // Handle successful withdrawal
  const handleTakeSuccess = (flashMsg) => {
    setFlashMessage(flashMsg);
    loadInventory(); // Refresh items from Atlas to update quantities in real time
  };

  // Open Add Stock Modal
  const handleOpenAddStockModal = (item) => {
    setAddStockTarget(item);
    setIsAddStockModalOpen(true);
  };

  // Close Add Stock Modal
  const handleCloseAddStockModal = () => {
    setIsAddStockModalOpen(false);
    setAddStockTarget(null);
  };

  // Handle successful stock-in
  const handleAddStockSuccess = (flashMsg) => {
    setFlashMessage(flashMsg);
    loadInventory(); // Refresh items from Atlas to update quantities in real time
  };

  // Open Move Item Modal
  const handleOpenMoveModal = (item) => {
    setMoveItemTarget(item);
    setIsMoveItemModalOpen(true);
  };

  // Close Move Item Modal
  const handleCloseMoveModal = () => {
    setIsMoveItemModalOpen(false);
    setMoveItemTarget(null);
  };

  // Handle successful move
  const handleMoveSuccess = (flashMsg) => {
    setFlashMessage(flashMsg);
    loadInventory(); // Refresh items
  };

  // Client-side search & box drawer filtering
  const filteredItems = items.filter((item) => {
    if (isRackBoxFilter && activeBoxDrawer > 0) {
      const itemDrawers = getPhysicalDrawerNumbers(item.locations, tree);
      const isMatch = itemDrawers.some(d => d.section === activeSection && d.drawer === activeBoxDrawer);
      if (!isMatch) return false;
    }

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      const nameMatch = (item.name || '').toLowerCase().includes(query);
      const codeMatch = (item.locations || []).some(loc => {
        if (!loc.node) return false;
        const displayCode = getLocationDisplayId(loc.node, tree);
        return displayCode.toLowerCase().includes(query) || (loc.node.code || '').toLowerCase().includes(query);
      });
      const sectionMatch = (item.locations || []).some(loc => 
        loc.node && (loc.node.section || '').toLowerCase().includes(query)
      );

      if (!(nameMatch || codeMatch || sectionMatch)) return false;
    }

    if (filterCategory !== 'All') {
      if ((item.category || 'Other') !== filterCategory) return false;
    }

    if (filterStatus !== 'All') {
      const minStock = item.minimumStock !== undefined ? item.minimumStock : (item.lowStockThreshold !== undefined ? item.lowStockThreshold : 0);
      if (filterStatus === 'Out of Stock' && item.quantity > 0) return false;
      if (filterStatus === 'Low Stock' && (item.quantity === 0 || item.quantity > minStock)) return false;
      if (filterStatus === 'In Stock' && item.quantity <= minStock) return false;
    }

    return true;
  });

  // Client-side Sorting
  filteredItems.sort((a, b) => {
    if (sortOption === 'Name A-Z') return a.name.localeCompare(b.name);
    if (sortOption === 'Name Z-A') return b.name.localeCompare(a.name);
    if (sortOption === 'Quantity Low-High') return a.quantity - b.quantity;
    if (sortOption === 'Quantity High-Low') return b.quantity - a.quantity;
    // Default 'Recently Updated'
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });

  // Calculate items assigned to currently open physical drawer
  const itemsInActiveDrawer = activeBoxDrawer > 0
    ? items.filter((it) => getPhysicalDrawerNumbers(it.locations, tree).includes(activeBoxDrawer))
    : [];

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
          onClick={() => setActiveTab('dashboard')}
          className={`text-xs font-bold px-4 py-2 rounded-t-lg transition-colors ${
            activeTab === 'dashboard'
              ? 'bg-slate-100 text-indigo-700 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          Intelligence Dashboard
        </button>
        <button
          onClick={() => setActiveTab('catalog')}
          className={`text-xs font-bold px-4 py-2 rounded-t-lg transition-colors ${
            activeTab === 'catalog'
              ? 'bg-slate-100 text-indigo-700 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          Inventory Catalog
        </button>
      </div>

      {/* Filters and Controls (Only show if catalog is active) */}
      {activeTab === 'catalog' && !loading && !error && items.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          
          {/* Search */}
          <div className="relative w-full md:w-1/3">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search items or location..."
              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500/60 rounded-xl pl-10 pr-10 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => {
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
          
          {/* Filters & Sort */}
          <div className="flex flex-wrap md:flex-nowrap items-center gap-3 w-full md:w-auto">
            <select
              value={filterCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 min-w-[120px]"
            >
              <option value="All">All Categories</option>
              <option value="Microcontrollers">Microcontrollers</option>
              <option value="Sensors">Sensors</option>
              <option value="Modules">Modules</option>
              <option value="Motors">Motors</option>
              <option value="Displays">Displays</option>
              <option value="LEDs">LEDs</option>
              <option value="Resistors">Resistors</option>
              <option value="Capacitors">Capacitors</option>
              <option value="Cables">Cables</option>
              <option value="Power">Power</option>
              <option value="Tools">Tools</option>
              <option value="Other">Other</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 min-w-[110px]"
            >
              <option value="All">All Statuses</option>
              <option value="In Stock">🟢 In Stock</option>
              <option value="Low Stock">🟠 Low Stock</option>
              <option value="Out of Stock">🔴 Out of Stock</option>
            </select>

            <select
              value={sortOption}
              onChange={(e) => handleSortChange(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 min-w-[130px]"
            >
              <option value="Recently Updated">Recently Updated</option>
              <option value="Name A-Z">Name A-Z</option>
              <option value="Name Z-A">Name Z-A</option>
              <option value="Quantity Low-High">Quantity Low-High</option>
              <option value="Quantity High-Low">Quantity High-Low</option>
            </select>
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
      ) : items.length === 0 ? (
        <InventoryEmptyState />
      ) : (
        /* ═══ WORKSPACE LAYOUT ═══ */
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 items-start">
          
          {/* PHYSICAL STORAGE RACK PANEL: Appears FIRST on mobile (order-1), RIGHT COLUMN on desktop (order-2, lg:col-span-5) */}
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
                onAction={(type) => {
                  // e.g. Navigate to /buy-list or open modals
                  if (type === 'catalog') setActiveTab('catalog');
                }} 
              />
            </div>
          ) : (
            <div className="order-2 lg:order-1 lg:col-span-7 space-y-4 w-full">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {isRackBoxFilter && activeBoxDrawer > 0 ? `Box ${activeBoxDrawer} Contents` : 'Inventory Catalog'}
                </span>
                <span className="bg-white border border-slate-200 text-indigo-600 font-mono text-[11px] font-bold px-2 py-0.5 rounded-md">
                  {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
                </span>
              </div>
            </div>

            {filteredItems.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center flex flex-col items-center justify-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center text-amber-600 border border-slate-200">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold text-slate-900">
                  {activeBoxDrawer > 0 ? `Box ${activeBoxDrawer} is currently empty` : `No items found matching "${searchQuery}"`}
                </h4>
                <p className="text-xs text-slate-500 max-w-xs">
                  {activeBoxDrawer > 0 ? 'Click the opened drawer again on the physical rack to view all inventory.' : 'Try searching for an item name, location code, or storage section.'}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => handleSearchChange('')}
                    className="bg-indigo-100 hover:bg-indigo-600 text-indigo-300 hover:text-slate-900 border border-indigo-300 text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer mt-1"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              /* Scrollable Cards Grid for Inventory Items (Scrolls internally on Desktop, scrolls with page on Mobile) */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:max-h-[780px] lg:overflow-y-auto lg:pr-1">
                {filteredItems.map((item) => {
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
