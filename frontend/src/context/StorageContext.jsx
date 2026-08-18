import React, { createContext, useContext, useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { useAuth } from './AuthContext';

const StorageContext = createContext();

export const useStorage = () => useContext(StorageContext);

export const StorageProvider = ({ children }) => {
  const { user } = useAuth();
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTree = async () => {
    try {
      setLoading(true);
      const res = await storageService.getStorageTree();
      if (res.success) {
        setTree(res.data);
      }
    } catch (err) {
      setError('Failed to load storage structure');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTree();
    } else {
      setTree([]);
    }
  }, [user]);

  return (
    <StorageContext.Provider value={{ tree, loading, error, refreshTree: fetchTree }}>
      {children}
    </StorageContext.Provider>
  );
};
