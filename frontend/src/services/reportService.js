const API_BASE_URL = '/api/reports';

const getAuthHeader = () => {
  const token = localStorage.getItem('inventory_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const getInventoryReport = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE_URL}/inventory?${query}`, {
    headers: getAuthHeader()
  });
  if (!res.ok) throw new Error('Failed to fetch inventory report');
  return res.json();
};

export const getLocationReport = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE_URL}/location?${query}`, {
    headers: getAuthHeader()
  });
  if (!res.ok) throw new Error('Failed to fetch location report');
  return res.json();
};

export const getLowStockReport = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE_URL}/low-stock?${query}`, {
    headers: getAuthHeader()
  });
  if (!res.ok) throw new Error('Failed to fetch low stock report');
  return res.json();
};

export const getOutOfStockReport = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE_URL}/out-of-stock?${query}`, {
    headers: getAuthHeader()
  });
  if (!res.ok) throw new Error('Failed to fetch out of stock report');
  return res.json();
};

export const getStockMovementReport = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE_URL}/movement?${query}`, {
    headers: getAuthHeader()
  });
  if (!res.ok) throw new Error('Failed to fetch stock movement report');
  return res.json();
};

export const getProjectUsageReport = async () => {
  const res = await fetch(`${API_BASE_URL}/project-usage`, {
    headers: getAuthHeader()
  });
  if (!res.ok) throw new Error('Failed to fetch project usage report');
  return res.json();
};

export const getBuyListReport = async () => {
  const res = await fetch(`${API_BASE_URL}/buy-list`, {
    headers: getAuthHeader()
  });
  if (!res.ok) throw new Error('Failed to fetch buy list report');
  return res.json();
};

export const exportReportCSV = async (params = {}) => {
  const query = new URLSearchParams({ ...params, format: 'csv' }).toString();
  const res = await fetch(`${API_BASE_URL}/export?${query}`, {
    headers: getAuthHeader()
  });
  if (!res.ok) throw new Error('Failed to export report');
  
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `inventory_report_${params.type || 'complete'}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

export const previewImportCsv = async (csvData) => {
  const res = await fetch(`${API_BASE_URL}/import/preview`, {
    method: 'POST',
    headers: {
      ...getAuthHeader(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ csvData })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to preview CSV import');
  return data;
};

export const confirmImportCsv = async (rows) => {
  const res = await fetch(`${API_BASE_URL}/import/confirm`, {
    method: 'POST',
    headers: {
      ...getAuthHeader(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ rows })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to confirm CSV import');
  return data;
};
