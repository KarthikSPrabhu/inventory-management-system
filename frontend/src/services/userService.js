const getAuthHeaders = () => {
  const token = localStorage.getItem('inventory_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const getUsers = async () => {
  const response = await fetch('/api/users', {
    headers: getAuthHeaders()
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to fetch users');
  }
  return data.data;
};

export const createUser = async (userData) => {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(userData)
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to create user');
  }
  return data.data;
};

export const updateUser = async (userId, updateData) => {
  const response = await fetch(`/api/users/${userId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updateData)
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to update user');
  }
  return data.data;
};

export const changePassword = async (currentPassword, newPassword) => {
  const response = await fetch('/api/auth/change-password', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ currentPassword, newPassword })
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to change password');
  }
  return data;
};
