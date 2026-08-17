import React, { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser } from '../services/userService';
import { useAuth } from '../context/AuthContext';

function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user: currentUser } = useAuth();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Form states
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'member' });
  const [editData, setEditData] = useState({ name: '', role: 'member', isActive: true });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await getUsers();
      setUsers(data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await createUser(formData);
      await fetchUsers();
      setShowAddModal(false);
      setFormData({ name: '', email: '', password: '', role: 'member' });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await updateUser(editingUser._id, editData);
      await fetchUsers();
      setShowEditModal(false);
      setEditingUser(null);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (u) => {
    setEditingUser(u);
    setEditData({ name: u.name, role: u.role, isActive: u.isActive });
    setShowEditModal(true);
  };

  const handleToggleStatus = async (u) => {
    try {
      await updateUser(u._id, { isActive: !u.isActive });
      await fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage system access and roles</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors shadow-sm"
        >
          + Add User
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map(u => (
          <div key={u._id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
            <div className={`h-2 ${u.isActive ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">{u.name}</h3>
                  <p className="text-slate-500 text-sm">{u.email}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${
                  u.role === 'admin' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {u.role}
                </span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm mt-4 mb-6">
                <span className={`w-2 h-2 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                <span className={u.isActive ? 'text-emerald-700' : 'text-red-700'}>
                  {u.isActive ? 'Active Account' : 'Disabled Account'}
                </span>
              </div>

              <div className="flex space-x-3 pt-4 border-t border-slate-100">
                <button
                  onClick={() => openEdit(u)}
                  className="flex-1 text-center bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium py-2 rounded-lg text-sm transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleToggleStatus(u)}
                  disabled={u._id === currentUser.id}
                  className={`flex-1 text-center font-medium py-2 rounded-lg text-sm transition-colors ${
                    u._id === currentUser.id
                      ? 'bg-slate-50 text-slate-400 cursor-not-allowed'
                      : u.isActive
                        ? 'bg-red-50 hover:bg-red-100 text-red-700'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {u.isActive ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-900">Create New User</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              {formError && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{formError}</div>}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
                <p className="text-xs text-slate-500 mt-1">Minimum 8 characters</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="pt-4 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-xl transition-colors disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-900">Edit User</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {formError && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{formError}</div>}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={editData.name}
                  onChange={e => setEditData({...editData, name: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select
                  value={editData.role}
                  onChange={e => setEditData({...editData, role: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="pt-4 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-xl transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Users;
