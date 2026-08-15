import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import AddInventory from './pages/AddInventory';
import Inventory from './pages/Inventory';
import InventoryDetails from './pages/InventoryDetails';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/inventory" replace />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/inventory/add" element={<AddInventory />} />
          <Route path="/inventory/:id" element={<InventoryDetails />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
