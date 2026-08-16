import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { getInventoryItems } from '../services/inventoryService';
import InventoryCard from '../components/inventory/InventoryCard';
import InventoryEmptyState from '../components/inventory/InventoryEmptyState';
import StorageVisualizer from '../components/storage/StorageVisualizer';
import StorageLocationPanel from '../components/storage/StorageLocationPanel';
import TakeItemModal from '../components/inventory/TakeItemModal';
import AddStockModal from '../components/inventory/AddStockModal';
import { getPhysicalDrawerNumber } from '../config/storageConfig';
import { useAuth } from '../context/AuthContext';

// Skeleton Loader Card component
const SkeletonCard = () => (
  <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-md animate-pulse flex flex-col">
    <div className="h-36 bg-slate-950/60"></div>
    <div className="p-4 flex-grow space-y-3">
      <div className="space-y-2">
        <div className="h-4 bg-slate-950/80 rounded w-3/4"></div>
        <div className="h-3 bg-slate-950/80 rounded w-1/2"></div>
      </div>
      <div className="pt-2 border-t border-slate-850 space-y-2">
        <div className="h-3 bg-slate-950/80 rounded w-1/3"></div>
      </div>
      <div className="h-9 bg-slate-950/80 rounded-xl mt-2"></div>
    </div>
  </div>
);

function Inventory() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const routerLocation = useLocation();
  const { isAdmin } = useAuth();
  const searchQuery = searchParams.get('search') || '';
  const visualizerRef = useRef(null);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flashMessage, setFlashMessage] = useState('');
  
  // Two-way state management:
  // selectedItem - item chosen via clicking an item card
  // activeBoxDrawer - box chosen via clicking Box 1-6 on the physical rack
  // isRackBoxFilter - true ONLY when a physical rack drawer is clicked directly to filter contents
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeBoxDrawer, setActiveBoxDrawer] = useState(0);
  const [isRackBoxFilter, setIsRackBoxFilter] = useState(false);

  // Phase 9: Take Item Modal state
  const [takeItemTarget, setTakeItemTarget] = useState(null);
  const [isTakeModalOpen, setIsTakeModalOpen] = useState(false);

  // Phase 11: Add Stock Modal state
  const [addStockTarget, setAddStockTarget] = useState(null);
  const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);

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

  // Sync Search state with router URL
  const handleSearchChange = (query) => {
    if (query) {
      setSearchParams({ search: query });
    } else {
      setSearchParams({});
    }
  };

  // ITEM -> DRAWER: Clicking an item card
  // Highlights the item and opens its drawer on the storage visualizer WITHOUT hiding other items!
  const handleLocateItem = (item) => {
    if (selectedItem && selectedItem._id === item._id) {
      // Deselect
      setSelectedItem(null);
      setActiveBoxDrawer(0);
      setIsRackBoxFilter(false);
    } else {
      setSelectedItem(item);
      const drawerNum = getPhysicalDrawerNumber(item.location);
      setActiveBoxDrawer(drawerNum);
      setIsRackBoxFilter(false); // Keeps all catalog items visible!

      // Scroll to physical storage on mobile view
      if (window.innerWidth < 1024 && visualizerRef.current) {
        setTimeout(() => {
          visualizerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  };

  // DRAWER -> ITEMS: Clicking Box 1..6 directly on the storage visualizer
  const handleSelectBoxDrawer = (drawerNum) => {
    if (activeBoxDrawer === drawerNum && isRackBoxFilter) {
      // Toggle close on second click
      setActiveBoxDrawer(0);
      setSelectedItem(null);
      setIsRackBoxFilter(false);
    } else {
      setActiveBoxDrawer(drawerNum);
      setIsRackBoxFilter(true);
      const itemsInDrawer = items.filter((it) => getPhysicalDrawerNumber(it.location) === drawerNum);
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

  // Client-side search & box drawer filtering
  const filteredItems = items.filter((item) => {
    // Only filter out other items if user explicitly clicked a physical box on the rack visualizer directly!
    if (isRackBoxFilter && activeBoxDrawer > 0) {
      const itemDrawer = getPhysicalDrawerNumber(item.location);
      if (itemDrawer !== activeBoxDrawer) return false;
    }

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      const nameMatch = (item.name || '').toLowerCase().includes(query);
      const codeMatch = (item.location?.code || '').toLowerCase().includes(query);
      const sectionMatch = (item.location?.section || '').toLowerCase().includes(query);
      const unitMatch = item.location?.storageUnit !== undefined && String(item.location.storageUnit).includes(query);
      const boxMatch = item.location?.box !== undefined && String(item.location.box).includes(query);

      return nameMatch || codeMatch || sectionMatch || unitMatch || boxMatch;
    }

    return true;
  });

  // Calculate items assigned to currently open physical drawer
  const itemsInActiveDrawer = activeBoxDrawer > 0
    ? items.filter((it) => getPhysicalDrawerNumber(it.location) === activeBoxDrawer)
    : [];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header and Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h3 className="text-2xl font-black text-white tracking-tight">INVENTORY WORKSPACE</h3>
          <p className="text-xs text-slate-400 mt-1">Manage and locate everything in your physical storage.</p>
        </div>
        
        {/* Top-Right Prominent + Add Item Button (Admin only) */}
        {isAdmin && (
          <Link
            to="/inventory/add"
            className="inline-flex items-center gap-2 justify-center bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs px-5 py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/25 hover:shadow-indigo-500/40 shrink-0"
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
        <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 p-4 rounded-xl text-xs flex gap-3 items-center">
          <svg className="w-5 h-5 shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="font-semibold">{flashMessage}</div>
        </div>
      )}

      {/* API Error Alert */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/25 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-400 shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h5 className="text-sm font-bold text-white">Connection Error</h5>
              <p className="text-xs text-slate-400 mt-0.5">Unable to load inventory. Check server status.</p>
            </div>
          </div>
          <button
            onClick={loadInventory}
            className="bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 hover:border-transparent font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Prominent Search Bar */}
      {!loading && !error && items.length > 0 && (
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search items, location code, or storage coordinates (e.g., ESP32, A319)..."
            className="w-full bg-slate-900 border border-slate-800/85 focus:border-indigo-500/60 rounded-2xl pl-12 pr-12 py-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors shadow-lg"
          />
          
          {searchQuery && (
            <button
              onClick={() => {
                handleSearchChange('');
                handleResetStorageView();
              }}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
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
          <div className="lg:col-span-5 bg-slate-900/40 border border-slate-800 rounded-2xl h-96 animate-pulse" />
        </div>
      ) : error ? (
        <div className="bg-slate-900 border border-slate-800 p-12 rounded-2xl text-center flex flex-col items-center justify-center">
          <p className="text-xs text-slate-500 italic">Could not sync catalog with MongoDB Atlas.</p>
        </div>
      ) : items.length === 0 ? (
        <InventoryEmptyState />
      ) : (
        /* ═══ PERMANENT 2-COLUMN UNIFIED WORKSPACE LAYOUT ═══ */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT / CENTER COLUMN: Inventory Items List (~65% desktop width / 7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {isRackBoxFilter && activeBoxDrawer > 0 ? `Box ${activeBoxDrawer} Contents` : 'Inventory Catalog'}
                </span>
                <span className="bg-slate-900 border border-slate-800 text-indigo-400 font-mono text-[11px] font-bold px-2 py-0.5 rounded-md">
                  {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
                </span>
              </div>
            </div>

            {filteredItems.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-10 text-center flex flex-col items-center justify-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-slate-950 flex items-center justify-center text-amber-400 border border-slate-800">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold text-white">
                  {activeBoxDrawer > 0 ? `Box ${activeBoxDrawer} is currently empty` : `No items found matching "${searchQuery}"`}
                </h4>
                <p className="text-xs text-slate-400 max-w-xs">
                  {activeBoxDrawer > 0 ? 'Click the opened drawer again on the physical rack to view all inventory.' : 'Try searching for an item name, location code, or storage section.'}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => handleSearchChange('')}
                    className="bg-indigo-600/15 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer mt-1"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              /* Scrollable Cards Grid for Inventory Items */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[780px] overflow-y-auto pr-1">
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
                      isLocated={isSelected}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: PERMANENT PHYSICAL STORAGE PANEL (~35% desktop width / 5 cols) */}
          <div ref={visualizerRef} className="lg:col-span-5 space-y-5 sticky top-20">
            {/* Storage Rack Visualizer */}
            <StorageVisualizer
              selectedDrawer={activeBoxDrawer}
              location={selectedItem?.location}
              item={selectedItem}
              onSelectDrawer={handleSelectBoxDrawer}
              onReset={handleResetStorageView}
            />

            {/* Storage Location & Open Box Breakdown Panel */}
            <StorageLocationPanel
              selectedDrawer={activeBoxDrawer}
              drawerItems={itemsInActiveDrawer}
              location={selectedItem?.location}
              item={selectedItem}
            />
          </div>

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
    </div>
  );
}

export default Inventory;
