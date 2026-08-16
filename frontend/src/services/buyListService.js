const API_URL = '/api/buy-list';

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

  if (response.status === 401) {
    localStorage.removeItem('inventory_token');
    localStorage.removeItem('inventory_user');
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  return response;
};

/**
 * Fetch buy list items
 */
export const getBuyList = async (search = '') => {
  try {
    const url = search ? `${API_URL}?search=${encodeURIComponent(search)}` : API_URL;
    const res = await authenticatedFetch(url);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Failed to fetch buy list items');
    }

    return data;
  } catch (err) {
    console.error('getBuyList error:', err);
    throw err;
  }
};

/**
 * Create new buy list item
 */
export const createBuyListItem = async (itemData) => {
  try {
    const res = await authenticatedFetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(itemData)
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Failed to create buy list item');
    }

    return data;
  } catch (err) {
    console.error('createBuyListItem error:', err);
    throw err;
  }
};

/**
 * Update buy list item (toggle status, edit qty/note)
 */
export const updateBuyListItem = async (id, updateData) => {
  try {
    const res = await authenticatedFetch(`${API_URL}/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Failed to update buy list item');
    }

    return data;
  } catch (err) {
    console.error('updateBuyListItem error:', err);
    throw err;
  }
};

/**
 * Delete buy list item
 */
export const deleteBuyListItem = async (id) => {
  try {
    const res = await authenticatedFetch(`${API_URL}/${id}`, {
      method: 'DELETE'
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Failed to delete buy list item');
    }

    return data;
  } catch (err) {
    console.error('deleteBuyListItem error:', err);
    throw err;
  }
};
