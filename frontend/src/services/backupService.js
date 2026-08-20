const API_BASE_URL = '/api/backups';

const getAuthHeader = () => {
  const token = localStorage.getItem('inventory_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const getBackups = async () => {
  const res = await fetch(API_BASE_URL, {
    headers: getAuthHeader()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch backup list');
  return data;
};

export const createBackup = async () => {
  const res = await fetch(`${API_BASE_URL}/create`, {
    method: 'POST',
    headers: {
      ...getAuthHeader(),
      'Content-Type': 'application/json'
    }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create backup');
  return data;
};

export const downloadBackupFile = async (filename) => {
  const res = await fetch(`${API_BASE_URL}/${encodeURIComponent(filename)}/download`, {
    headers: getAuthHeader()
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to download backup file');
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();
};

export const previewBackup = async (fileOrFilename) => {
  let body;
  let headers = getAuthHeader();

  if (fileOrFilename instanceof File) {
    const formData = new FormData();
    formData.append('file', fileOrFilename);
    body = formData;
  } else {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify({ filename: fileOrFilename });
  }

  const res = await fetch(`${API_BASE_URL}/preview`, {
    method: 'POST',
    headers,
    body
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to preview backup');
  return data;
};

export const restoreBackup = async (fileOrFilename, confirmRestore = true) => {
  let body;
  let headers = getAuthHeader();

  if (fileOrFilename instanceof File) {
    const formData = new FormData();
    formData.append('file', fileOrFilename);
    formData.append('confirmRestore', 'true');
    body = formData;
  } else {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify({ filename: fileOrFilename, confirmRestore: true });
  }

  const res = await fetch(`${API_BASE_URL}/restore`, {
    method: 'POST',
    headers,
    body
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to restore backup');
  return data;
};
