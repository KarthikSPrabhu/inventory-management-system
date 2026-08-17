import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { changePassword } from '../services/userService';

function Profile() {
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (formData.newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await changePassword(formData.currentPassword, formData.newPassword);
      setSuccess('Password changed successfully');
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-6">
        <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-3xl font-bold uppercase">
          {user?.name?.charAt(0)}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{user?.name}</h1>
          <p className="text-slate-500 mt-1">{user?.email}</p>
          <div className="flex items-center space-x-3 mt-3">
            <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${
              user?.role === 'admin' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'
            }`}>
              {user?.role}
            </span>
            <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider">
              Active
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-lg font-bold text-slate-900 mb-6 border-b border-slate-100 pb-4">Change Password</h2>
        
        <form onSubmit={handleSubmit} className="max-w-md space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg text-sm border border-emerald-100">
              {success}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
            <input
              type="password"
              required
              value={formData.currentPassword}
              onChange={e => setFormData({...formData, currentPassword: e.target.value})}
              className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={formData.newPassword}
              onChange={e => setFormData({...formData, newPassword: e.target.value})}
              className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
            <p className="text-xs text-slate-500 mt-1">Password must be at least 8 characters</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={formData.confirmPassword}
              onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
              className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Profile;
