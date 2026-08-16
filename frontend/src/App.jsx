import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import AddInventory from './pages/AddInventory';
import Inventory from './pages/Inventory';
import InventoryDetails from './pages/InventoryDetails';
import Projects from './pages/Projects';
import ProjectDetails from './pages/ProjectDetails';
import History from './pages/History';
import Analytics from './pages/Analytics';
import BuyListPage from './pages/BuyListPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            <Route path="/" element={<Navigate to="/inventory" replace />} />
            
            <Route
              path="/inventory"
              element={
                <ProtectedRoute>
                  <Inventory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/add"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AddInventory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/:id"
              element={
                <ProtectedRoute>
                  <InventoryDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects"
              element={
                <ProtectedRoute>
                  <Projects />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/:id"
              element={
                <ProtectedRoute>
                  <ProjectDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <History />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <Analytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/buy-list"
              element={
                <ProtectedRoute>
                  <BuyListPage />
                </ProtectedRoute>
              }
            />
            
            <Route path="*" element={<Navigate to="/inventory" replace />} />
          </Routes>
        </Layout>
      </Router>
      </AuthProvider>
  );
}

export default App;
