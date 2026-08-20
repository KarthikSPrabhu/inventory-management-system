import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import notificationService from '../../services/notificationService';

const NotificationDropdown = ({ onClose, onUpdateCount }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationService.getNotifications({ limit: 20 });
      if (res.success) {
        setNotifications(res.data);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await notificationService.markAsRead(id);
      setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
      onUpdateCount();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      onUpdateCount();
    } catch (err) {
      console.error(err);
    }
  };

  const getPriorityColors = (priority, isRead) => {
    if (isRead) return 'bg-slate-50 border-slate-100 opacity-70';
    switch (priority) {
      case 'CRITICAL': return 'bg-rose-50 border-rose-200';
      case 'WARNING': return 'bg-amber-50 border-amber-200';
      case 'INFO': return 'bg-indigo-50 border-indigo-200';
      default: return 'bg-slate-50 border-slate-200';
    }
  };

  const getPriorityIcon = (priority, isRead) => {
    if (isRead) return '○';
    switch (priority) {
      case 'CRITICAL': return '🔴';
      case 'WARNING': return '🟠';
      case 'INFO': return '🔵';
      default: return '●';
    }
  };

  // Handle Escape key listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 bg-white border border-slate-200 shadow-xl rounded-2xl z-50 overflow-hidden flex flex-col max-h-[80vh]">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <h3 className="font-black text-slate-800 tracking-tight text-sm">Notifications</h3>
        <button 
          onClick={handleMarkAllRead}
          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-wider"
        >
          Mark all read
        </button>
      </div>
      
      <div className="overflow-y-auto flex-1 custom-scrollbar">
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full"></div>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-rose-500 text-xs font-semibold">
            Unable to load notifications.
            <button onClick={fetchNotifications} className="block w-full mt-2 text-indigo-600 underline">Retry</button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs font-medium">
            You have no notifications.
          </div>
        ) : (
          <div className="flex flex-col">
            {notifications.map((notif) => (
              <div 
                key={notif._id} 
                onClick={(e) => !notif.isRead && handleMarkAsRead(notif._id, e)}
                className={`p-4 border-b border-slate-100 transition-colors cursor-pointer ${getPriorityColors(notif.priority, notif.isRead)}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-sm shrink-0">{getPriorityIcon(notif.priority, notif.isRead)}</span>
                  <div className="flex-1">
                    <p className="text-xs font-black text-slate-800 break-words">{notif.title}</p>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-snug break-words">{notif.message}</p>
                    
                    <div className="flex justify-between items-end mt-2">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        {new Date(notif.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      
                      {/* Action buttons based on type */}
                      {(notif.type === 'LOW_STOCK' || notif.type === 'OUT_OF_STOCK') && notif.item && (
                        <div className="flex gap-2">
                          <Link to="/buy-list" onClick={onClose} className="text-[10px] bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-2 py-1 rounded shadow-sm font-bold transition-colors">
                            Buy List
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="p-2 border-t border-slate-100 bg-slate-50/50 text-center">
        <button onClick={onClose} className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-slate-800 transition-colors">
          Close
        </button>
      </div>
    </div>
  );
};

export default NotificationDropdown;
