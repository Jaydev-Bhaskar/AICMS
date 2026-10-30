import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';
import './Header.css';

const PAGE_TITLES = {
  '/': 'Overview',
  '/live': 'Live Monitoring',
  '/complaints': 'Complaints',
  '/institutions': 'Call Recordings',
  '/reports': 'Reports',
  '/overlap-alerts': 'ABS Reports',
  '/users': 'Users',
  '/settings': 'Settings',
};

function Header() {
  const { user } = useAuthStore();
  const { pathname } = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const title = PAGE_TITLES[pathname] || 'AICMS';

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const { data } = await api.get('/notifications');
        setNotifications(data.data || []);
        setUnreadCount(data.unreadCount || 0);
      } catch {}
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 60000);
    return () => clearInterval(interval);
  }, []);

  const markRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <header className="header">
      <div className="header-left">
        <button className="header-menu-btn" aria-label="Menu">
          <MenuIcon />
        </button>
        <h1 className="header-title">{title}</h1>
      </div>

      <div className="header-center">
        <div className="header-search">
          <SearchIcon />
          <input type="text" placeholder="Search cases, institutions..." />
        </div>
      </div>

      <div className="header-right">
        {/* Notifications */}
        <div className="header-notif-wrapper">
          <button
            className="header-icon-btn"
            onClick={() => setNotifOpen(!notifOpen)}
            aria-label="Notifications"
          >
            <BellIcon />
            {unreadCount > 0 && (
              <span className="header-notif-badge">{unreadCount}</span>
            )}
          </button>

          {notifOpen && (
            <div className="header-notif-panel">
              <div className="notif-panel-header">
                <span>Notifications</span>
                {unreadCount > 0 && <span className="notif-unread-label">{unreadCount} new</span>}
              </div>
              <div className="notif-list">
                {notifications.length === 0 && (
                  <div className="notif-empty">No notifications</div>
                )}
                {notifications.slice(0, 8).map((n) => (
                  <div
                    key={n._id}
                    className={`notif-item ${n.severity} ${n.read ? 'read' : 'unread'}`}
                    onClick={() => markRead(n._id)}
                  >
                    <div className="notif-item-dot" />
                    <div className="notif-item-content">
                      <p className="notif-item-title">{n.title}</p>
                      <p className="notif-item-msg">{n.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Settings */}
        <button className="header-icon-btn" aria-label="Settings">
          <GearIcon />
        </button>

        {/* User */}
        <div className="header-user">
          <div className="header-user-avatar">{initials}</div>
          <div className="header-user-info">
            <span className="header-user-name">{user?.name || 'User'}</span>
            <span className="header-user-role">{formatRole(user?.role)}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

const formatRole = (role) => {
  const map = {
    superadmin: 'Super Admin',
    admin: 'Admin',
    rb_officer: 'RB Officer',
    pgrc_officer: 'PGRC Officer',
    bureau_officer: 'Bureau Officer',
    regional_officer: 'Regional Officer',
    viewer: 'Viewer',
    student: 'Student',
  };
  return map[role] || role;
};

function MenuIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
}
function SearchIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
}
function BellIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
}
function GearIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
}

export default Header;

