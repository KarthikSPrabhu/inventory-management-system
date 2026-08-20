import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { StorageProvider } from './context/StorageContext';
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
import Users from './pages/Users';
import Profile from './pages/Profile';

import Reports from './pages/Reports';
import AuditLogs from './pages/AuditLogs';

function App() {
  return (
    <AuthProvider>
      <StorageProvider>
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
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/audit-logs"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AuditLogs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Users />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            
            <Route path="*" element={<Navigate to="/inventory" replace />} />
          </Routes>
        </Layout>
      </Router>
      </StorageProvider>
      </AuthProvider>
  );
}

export default App;
