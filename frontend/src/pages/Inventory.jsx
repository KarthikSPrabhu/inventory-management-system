import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useSearchParams } from 'react-router-dom';
import { getInventoryItems } from '../services/inventoryService';
import InventoryStats from '../components/inventory/InventoryStats';
import InventoryCard from '../components/inventory/InventoryCard';
import InventoryEmptyState from '../components/inventory/InventoryEmptyState';
import StorageVisualizer from '../components/storage/StorageVisualizer';
import StorageLocationPanel from '../components/storage/StorageLocationPanel';
import { getPhysicalDrawerNumber } from '../config/storageConfig';

// Skeleton Loader Card component for modern visual states
const SkeletonCard = () => (
  <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-md animate-pulse flex flex-col">
    <div className="h-44 bg-slate-950/60"></div>
    <div className="p-5 flex-grow space-y-4">
      <div className="space-y-2">
        <div className="h-4 bg-slate-950/80 rounded w-3/4"></div>
        <div className="h-4 bg-slate-950/80 rounded w-1/2"></div>
      </div>
      <div className="pt-3 border-t border-slate-850 space-y-2">
        <div className="h-3 bg-slate-950/80 rounded w-1/3"></div>
        <div className="h-5 bg-slate-950/80 rounded w-2/3"></div>
      </div>
      <div className="h-10 bg-slate-950/80 rounded-xl mt-2"></div>
    </div>
  </div>
);

function Inventory() {
  const routerLocation = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const visualizerRef = useRef(null);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flashMessage, setFlashMessage] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);

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

  // Trigger load on component mount
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

  // Sync Search state with router URL query parameters
  const handleSearchChange = (query) => {
    if (query) {
      setSearchParams({ search: query });
    } else {
      setSearchParams({});
    }
  };

  // Handle LOCATE button click
  const handleLocateItem = (item) => {
    if (selectedItem && selectedItem._id === item._id) {
      // Toggle off if already selected
      setSelectedItem(null);
    } else {
      setSelectedItem(item);
      // Smooth scroll to visualizer on mobile screens
      if (window.innerWidth < 1024 && visualizerRef.current) {
        setTimeout(() => {
          visualizerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  };

  // Reset selected location to default closed rack state (0-removebg-preview.png)
  const handleResetLocation = () => {
    setSelectedItem(null);
  };

  // Client-side filtering logic
  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.trim().toLowerCase();
    
    const nameMatch = (item.name || '').toLowerCase().includes(query);
    const codeMatch = (item.location?.code || '').toLowerCase().includes(query);
    const sectionMatch = (item.location?.section || '').toLowerCase().includes(query);
    
    // Convert numeric fields to string for matching
    const unitMatch = item.location?.storageUnit !== undefined && String(item.location.storageUnit).includes(query);
    const boxMatch = item.location?.box !== undefined && String(item.location.box).includes(query);

    return nameMatch || codeMatch || sectionMatch || unitMatch || boxMatch;
  });

  // Calculate physical drawer for currently selected item (0 if none selected)
  const selectedDrawer = selectedItem ? getPhysicalDrawerNumber(selectedItem.location) : 0;

  // Render Result Count Text
  const renderResultCount = () => {
    const count = filteredItems.length;
    if (count === 1) {
      return '1 item found';
    }
    return `${count} items found`;
  };

  const suggestions = [
    { label: 'ESP32', term: 'ESP32' },
    { label: 'A319', term: 'A319' },
    { label: 'Section A', term: 'A' },
    { label: 'Unit 3', term: '3' },
    { label: 'Box 19', term: '19' }
  ];

  // Show 2-column split view if user has an active search or selected an item
  const showSplitLayout = Boolean(searchQuery.trim() || selectedItem);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header and Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-white tracking-tight">Inventory</h3>
          <p className="text-xs text-slate-400 mt-1">Manage and locate everything in your storage.</p>
        </div>
        <Link
          to="/inventory/add"
          className="inline-flex items-center gap-1.5 justify-center bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-650/15"
        >
          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Item</span>
        </Link>
      </div>

      {/* Flash Success Notification */}
      {flashMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-450 p-4 rounded-xl text-xs flex gap-3 items-center">
          <svg className="w-5 h-5 shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="font-semibold">{flashMessage}</div>
        </div>
      )}

      {/* API Error Box */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/25 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-455 shrink-0">
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
            className="bg-rose-550/10 hover:bg-rose-500 text-rose-455 hover:text-white border border-rose-500/20 hover:border-transparent font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Summary Metrics Section */}
      {!loading && !error && items.length > 0 && (
        <InventoryStats items={items} />
      )}

      {/* Search Bar Section */}
      {!loading && !error && items.length > 0 && (
        <div className="space-y-3">
          <div className="relative">
            {/* Search Icon */}
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            {/* Input Element */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search items, location code, or storage coordinates..."
              className="w-full bg-slate-900 border border-slate-800/85 focus:border-indigo-500/60 rounded-2xl pl-12 pr-12 py-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors shadow-lg"
            />
            
            {/* Clear Input Icon (✕) */}
            {searchQuery && (
              <button
                onClick={() => {
                  handleSearchChange('');
                  handleResetLocation();
                }}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-550 hover:text-slate-300 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Quick Search Suggestions */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 px-1">
            <span className="font-medium">Try:</span>
            {suggestions.map((s) => (
              <button
                key={s.label}
                onClick={() => handleSearchChange(s.term)}
                className={`px-2.5 py-0.5 rounded-full border border-slate-850 bg-slate-900/40 text-slate-400 hover:text-white hover:border-slate-700 transition-colors ${
                  searchQuery.toLowerCase() === s.term.toLowerCase() ? 'bg-indigo-950/20 text-indigo-400 border-indigo-500/20' : ''
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        /* Skeleton Grid Loader */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fadeIn">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : error ? (
        /* Fetch Error State Placeholder */
        <div className="bg-slate-900 border border-slate-800 p-12 rounded-2xl text-center flex flex-col items-center justify-center">
          <p className="text-xs text-slate-500 italic">Could not sync catalog with MongoDB Atlas.</p>
        </div>
      ) : items.length === 0 ? (
        /* Database Empty State */
        <InventoryEmptyState />
      ) : showSplitLayout ? (
        /* Split Layout: Search Results (Left) + Physical Storage Locator (Right) */
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-semibold text-indigo-400">
              {renderResultCount()}
            </p>
            {selectedItem && (
              <button
                onClick={handleResetLocation}
                className="text-[11px] font-bold text-slate-400 hover:text-indigo-400 bg-slate-900 border border-slate-800 px-3 py-1 rounded-lg transition-colors flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Clear Selection</span>
              </button>
            )}
          </div>

          {filteredItems.length === 0 ? (
            /* Search Query No Results Empty State */
            <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4 animate-fadeIn">
              <div className="h-16 w-16 rounded-full bg-slate-950 flex items-center justify-center text-rose-500/80 border border-slate-850 shadow-inner">
                <svg className="w-7 h-7 stroke-[1.2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white tracking-tight">No inventory items found</h4>
                <p className="text-xs text-slate-550 max-w-xs mx-auto">
                  We couldn't find matches for <span className="text-indigo-400 font-mono">"{searchQuery}"</span>. Try searching for an item name, location code, or storage section.
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => {
                    handleSearchChange('');
                    handleResetLocation();
                  }}
                  className="bg-slate-950 hover:bg-slate-805 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all"
                >
                  Clear Search
                </button>
              </div>
            </div>
          ) : (
            /* Split layout: Results on Left, Rack Visualizer on Right */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Search Results Cards (45% on desktop / 5 cols) */}
              <div className="lg:col-span-5 space-y-4 max-h-[750px] overflow-y-auto pr-1">
                <div className="grid grid-cols-1 gap-4">
                  {filteredItems.map((item) => (
                    <InventoryCard
                      key={item._id}
                      item={item}
                      searchQuery={searchQuery}
                      onLocate={handleLocateItem}
                      isLocated={selectedItem && selectedItem._id === item._id}
                    />
                  ))}
                </div>
              </div>

              {/* Right Column: Hero Physical Storage Location Visualizer (55% on desktop / 7 cols) */}
              <div ref={visualizerRef} className="lg:col-span-7 space-y-6 sticky top-6">
                <StorageVisualizer
                  selectedDrawer={selectedDrawer}
                  location={selectedItem?.location}
                  item={selectedItem}
                  onReset={handleResetLocation}
                />

                {/* Storage Location Info Panel (if an item is selected) */}
                {selectedItem ? (
                  <StorageLocationPanel
                    location={selectedItem.location}
                    item={selectedItem}
                  />
                ) : (
                  <div className="bg-slate-900/50 border border-slate-800/60 p-4 rounded-2xl text-center text-slate-500 text-xs">
                    Click <strong className="text-indigo-400">LOCATE</strong> on any search result to open its physical storage drawer.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Default View: Grid Layout for Cards */
        <div className="space-y-8 animate-fadeIn">
          {/* Card Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item) => (
              <InventoryCard
                key={item._id}
                item={item}
                searchQuery={searchQuery}
                onLocate={handleLocateItem}
                isLocated={selectedItem && selectedItem._id === item._id}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Inventory;
