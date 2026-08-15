/**
 * Service to handle communication with the Express backend REST API
 */

// Fetch all inventory items
export const getItems = async () => {
  const response = await fetch('/api/inventory');
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch inventory items');
  }
  return response.json();
};

// Create a new inventory item
export const createItem = async (itemData) => {
  const response = await fetch('/api/inventory', {
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
  const response = await fetch(`/api/inventory/${id}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch inventory item details');
  }
  return response.json();
};

