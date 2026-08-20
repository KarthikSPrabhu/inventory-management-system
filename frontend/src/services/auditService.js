const API_BASE_URL = '/api/audit-logs';

const getAuthHeader = () => {
  const token = localStorage.getItem('inventory_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const getAuditLogs = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE_URL}?${query}`, {
    headers: getAuthHeader()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch audit logs');
  return data;
};

export const getAuditLogById = async (id) => {
  const res = await fetch(`${API_BASE_URL}/${id}`, {
    headers: getAuthHeader()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch audit log details');
  return data;
};

export const getRecentActivity = async () => {
  const res = await fetch(`${API_BASE_URL}/recent`, {
    headers: getAuthHeader()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch recent activity');
  return data;
};
