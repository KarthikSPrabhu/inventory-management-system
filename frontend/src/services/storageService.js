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

  return response;
};

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const storageService = {
  getStorageTree: async () => {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/storage/tree`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching storage tree:', error);
      return { success: false, message: 'Network error occurred' };
    }
  },

  createStorageNode: async (nodeData) => {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/storage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nodeData)
      });
      return await response.json();
    } catch (error) {
      console.error('Error creating storage node:', error);
      return { success: false, message: 'Network error occurred' };
    }
  },

  deleteStorageNode: async (id) => {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/storage/${id}`, {
        method: 'DELETE'
      });
      return await response.json();
    } catch (error) {
      console.error('Error deleting storage node:', error);
      return { success: false, message: 'Network error occurred' };
    }
  },

  resolveStoragePath: async (locationData) => {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/storage/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(locationData)
      });
      return await response.json();
    } catch (error) {
      console.error('Error resolving storage path:', error);
      return { success: false, message: 'Network error occurred' };
    }
  }
};
