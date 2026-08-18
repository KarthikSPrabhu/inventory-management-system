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

const dashboardService = {
  getSummary: async () => {
    try {
      const response = await authenticatedFetch('/api/dashboard/summary');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard summary');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching dashboard summary:', error);
      throw error;
    }
  }
};

export default dashboardService;
