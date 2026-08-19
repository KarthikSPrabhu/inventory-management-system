// Reuse the same pattern as dashboardService and inventoryService
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

const notificationService = {
  getNotifications: async (params = {}) => {
    try {
      const query = new URLSearchParams();
      if (params.isRead !== undefined) query.append('isRead', params.isRead);
      if (params.page) query.append('page', params.page);
      if (params.limit) query.append('limit', params.limit);

      const queryString = query.toString();
      const url = queryString ? `/api/notifications?${queryString}` : '/api/notifications';

      const response = await authenticatedFetch(url);
      if (!response.ok) throw new Error('Failed to fetch notifications');
      return await response.json();
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  },

  getUnreadCount: async () => {
    try {
      const response = await authenticatedFetch('/api/notifications/unread-count');
      if (!response.ok) throw new Error('Failed to fetch unread count');
      return await response.json();
    } catch (error) {
      console.error('Error fetching unread count:', error);
      throw error;
    }
  },

  markAsRead: async (id) => {
    try {
      const response = await authenticatedFetch(`/api/notifications/${id}/read`, {
        method: 'PATCH'
      });
      if (!response.ok) throw new Error('Failed to mark notification as read');
      return await response.json();
    } catch (error) {
      console.error('Error marking as read:', error);
      throw error;
    }
  },

  markAllAsRead: async () => {
    try {
      const response = await authenticatedFetch('/api/notifications/read-all', {
        method: 'PATCH'
      });
      if (!response.ok) throw new Error('Failed to mark all as read');
      return await response.json();
    } catch (error) {
      console.error('Error marking all as read:', error);
      throw error;
    }
  },

  deleteNotification: async (id) => {
    try {
      const response = await authenticatedFetch(`/api/notifications/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete notification');
      return await response.json();
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }
};

export default notificationService;
