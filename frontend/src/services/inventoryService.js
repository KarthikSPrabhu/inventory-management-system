/**
 * Service to handle communication with the Express backend REST API
 * Automatically includes JWT Authorization token from localStorage.
 */

const getAuthHeaders = () => {
  const token = localStorage.getItem('inventory_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

const authenticatedFetch = async (url, options = {}) => {
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (response.status === 401 && window.location.pathname !== '/login') {
    localStorage.removeItem('inventory_token');
    localStorage.removeItem('inventory_user');
    window.location.href = '/login';
  }

  return response;
};

// Fetch inventory categories
export const getInventoryCategories = async () => {
  const response = await authenticatedFetch('/api/inventory/categories');
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch categories');
  }
  return response.json();
};

// Fetch all inventory items
export const getItems = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  if (params.search) query.append('search', params.search);
  if (params.section) query.append('section', params.section);
  if (params.storageUnit) query.append('storageUnit', params.storageUnit);
  if (params.container) query.append('container', params.container);
  if (params.locationNode) query.append('locationNode', params.locationNode);
  if (params.category) query.append('category', params.category);
  if (params.status) query.append('status', params.status);
  if (params.project) query.append('project', params.project);
  if (params.buyList) query.append('buyList', params.buyList);
  if (params.sort) query.append('sort', params.sort);

  const queryString = query.toString();
  const url = queryString ? `/api/inventory?${queryString}` : '/api/inventory';

  const response = await authenticatedFetch(url);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch inventory items');
  }
  return response.json();
};

// Create a new inventory item
export const createItem = async (itemData) => {
  const response = await authenticatedFetch('/api/inventory', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(itemData),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to create inventory item');
  }
  return response.json();
};

// Check backend server health status
export const checkHealth = async () => {
  const response = await fetch('/api/health');
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};

// Alias getItems to getInventoryItems for Phase 4 compliance
export const getInventoryItems = getItems;

// Fetch inventory item by ID
export const getInventoryItemById = async (id) => {
  const response = await authenticatedFetch(`/api/inventory/${id}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch inventory item details');
  }
  return response.json();
};

// Update inventory item (Phase 13)
export const updateInventoryItem = async (id, itemData) => {
  const response = await authenticatedFetch(`/api/inventory/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(itemData),
  });
  
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Failed to update inventory item');
  }
  return data;
};

// Delete inventory item (Phase 13)
export const deleteInventoryItem = async (id) => {
  const response = await authenticatedFetch(`/api/inventory/${id}`, {
    method: 'DELETE',
  });
  
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Failed to delete inventory item');
  }
  return data;
};

// Record inventory item withdrawal (Phase 9)
export const createUsageRecord = async (usageData) => {
  const response = await authenticatedFetch('/api/usage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(usageData),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Unable to complete the withdrawal. Please try again.');
  }
  return data;
};

// Record inventory item stock-in / restocking (Phase 11)
export const createStockInRecord = async (stockInData) => {
  const response = await authenticatedFetch('/api/stock-in', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(stockInData),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Unable to add stock. Please try again.');
  }
  return data;
};

// Record inventory stock adjustment (Phase 19)
export const adjustStockRecord = async (id, adjustData) => {
  const response = await authenticatedFetch(`/api/inventory/${id}/adjust`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(adjustData),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Unable to adjust stock. Please try again.');
  }
  return data;
};

// Record inventory stock move (Phase 20)
export const moveInventoryItem = async (id, moveData) => {
  const response = await authenticatedFetch(`/api/inventory/${id}/move`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(moveData),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Unable to move item. Please try again.');
  }
  return data;
};

// Fetch all usage/activity records with filtering & pagination (Phase 10 & 11)
export const getUsageRecords = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  if (params.search) query.append('search', params.search);
  if (params.itemId) query.append('itemId', params.itemId);
  if (params.projectId) query.append('projectId', params.projectId);
  if (params.dateRange) query.append('dateRange', params.dateRange);
  if (params.activityType) query.append('activityType', params.activityType);

  const queryString = query.toString();
  const url = queryString ? `/api/usage?${queryString}` : '/api/usage';

  const response = await authenticatedFetch(url);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch usage records');
  }
  return response.json();
};

// Fetch usage records for single item (Phase 9)
export const getItemUsageRecords = async (itemId) => {
  const response = await authenticatedFetch(`/api/usage/item/${itemId}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch item usage records');
  }
  return response.json();
};

// Fetch all projects (Phase 9)
export const getProjects = async () => {
  const response = await authenticatedFetch('/api/projects');
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch projects');
  }
  return response.json();
};

// Create a new project (Phase 9)
export const createProject = async (projectData) => {
  const response = await authenticatedFetch('/api/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(projectData),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Failed to create project');
  }
  return data;
};

// Fetch project details by ID (Phase 9)
export const getProjectById = async (id) => {
  const response = await authenticatedFetch(`/api/projects/${id}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch project details');
  }
  return response.json();
};

// Fetch aggregated project usage (Phase 9)
export const getProjectUsage = async (id) => {
  const response = await authenticatedFetch(`/api/projects/${id}/usage`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch project usage');
  }
  return response.json();
};

// Fetch project suggestions for an item (Phase 9)
export const getProjectSuggestions = async (itemId) => {
  const url = itemId ? `/api/projects/suggestions?itemId=${itemId}` : '/api/projects/suggestions';
  const response = await authenticatedFetch(url);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch project suggestions');
  }
  return response.json();
};

// Update project status / details (Phase 9)
export const updateProject = async (id, updateData) => {
  const response = await authenticatedFetch(`/api/projects/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updateData),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Failed to update project');
  }
  return data;
};

// Delete project (Phase 9)
export const deleteProject = async (id) => {
  const response = await authenticatedFetch(`/api/projects/${id}`, {
    method: 'DELETE',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Failed to delete project');
  }
  return data;
};

// Analytics API Services (Phase 12)
export const getAnalyticsSummary = async (dateRange = 'all') => {
  const response = await authenticatedFetch(`/api/analytics/summary?dateRange=${dateRange}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Unable to load analytics summary.');
  }
  return response.json();
};

export const getAnalyticsMovement = async (dateRange = 'all') => {
  const response = await authenticatedFetch(`/api/analytics/movement?dateRange=${dateRange}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Unable to load movement analytics.');
  }
  return response.json();
};

export const getMostUsedItems = async (dateRange = 'all', limit = 5) => {
  const response = await authenticatedFetch(`/api/analytics/most-used-items?dateRange=${dateRange}&limit=${limit}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Unable to load most-used items.');
  }
  return response.json();
};

export const getMostUsedProjects = async (dateRange = 'all', limit = 5) => {
  const response = await authenticatedFetch(`/api/analytics/most-used-projects?dateRange=${dateRange}&limit=${limit}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Unable to load project consumption.');
  }
  return response.json();
};

export const getLowStockAnalytics = async () => {
  const response = await authenticatedFetch('/api/analytics/low-stock');
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Unable to load low stock items.');
  }
  return response.json();
};
