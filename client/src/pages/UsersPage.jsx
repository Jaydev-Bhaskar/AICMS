import React, { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const ROLE_LABELS = { superadmin: 'Super Admin', admin: 'Admin', rb_officer: 'RB Officer', pgrc_officer: 'PGRC Officer', bureau_officer: 'Bureau Officer', regional_officer: 'Regional Officer', viewer: 'Viewer' };

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users').then((r) => setUsers(r.data.data || [])).catch(() => toast.error('Failed to load users')).finally(() => setLoading(false));
  }, []);

  const toggleActive = async (u) => {
    try {
      await api.put(`/users/${u._id}`, { isActive: !u.isActive });
      setUsers((prev) => prev.map((x) => x._id === u._id ? { ...x, isActive: !u.isActive } : x));
      toast.success(`User ${u.isActive ? 'deactivated' : 'activated'}`);
    } catch { toast.error('Failed to update user'); }
  };

  const initials = (name) => name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">Users & Access</h2>
          <p className="page-subtitle">{users.length} users registered</p>
        </div>
      </div>

      <div className="table-card">
        {loading ? <div className="table-loading"><div className="spinner" /></div> : (
          <table className="data-table">
            <thead>
              <tr><th>User</th><th>Email</th><th>Role</th><th>Bureau</th><th>Designation</th><th>Last Login</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                        {initials(u.name)}
                      </div>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</td>
                  <td>
                    <span style={{ fontSize: 11, fontWeight: 700, background: '#eef2ff', color: 'var(--primary)', padding: '3px 8px', borderRadius: 4 }}>
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td style={{ fontSize: 12 }}>{u.bureau?.name || '—'}</td>
                  <td style={{ fontSize: 12 }}>{u.designation || '—'}</td>
                  <td className="date-cell">{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('en-IN') : 'Never'}</td>
                  <td>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: u.isActive ? '#dcfce7' : '#fee2e2', color: u.isActive ? '#166534' : '#dc2626' }}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn-ghost"
                      style={{ padding: '4px 10px', fontSize: 12 }}
                      onClick={() => toggleActive(u)}
                    >
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

