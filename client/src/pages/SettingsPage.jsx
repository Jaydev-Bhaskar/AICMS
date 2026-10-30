import React from 'react';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useState } from 'react';

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '', designation: user?.designation || '' });
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put('/auth/profile', form);
      updateUser(data.data);
      toast.success('Profile updated successfully');
    } catch { toast.error('Failed to update profile'); }
    finally { setSaving(false); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwd.newPassword !== pwd.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (pwd.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setSavingPwd(true);
    try {
      await api.put('/auth/change-password', { currentPassword: pwd.currentPassword, newPassword: pwd.newPassword });
      toast.success('Password changed successfully');
      setPwd({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to change password'); }
    finally { setSavingPwd(false); }
  };

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setP = (k, v) => setPwd((p) => ({ ...p, [k]: v }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <h2 className="page-title">Settings</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Profile Settings */}
        <form onSubmit={handleProfileSave} className="detail-card">
          <h3 className="detail-section-title">Profile Settings</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" value={form.name} onChange={(e) => setF('name', e.target.value)} placeholder="Your full name" />
            </div>
            <div className="form-group">
              <label>Email (readonly)</label>
              <input type="email" value={user?.email || ''} readOnly style={{ background: '#f5f5f5', cursor: 'not-allowed' }} />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input type="tel" value={form.phone} onChange={(e) => setF('phone', e.target.value)} placeholder="+91 XXXXX XXXXX" />
            </div>
            <div className="form-group">
              <label>Designation</label>
              <input type="text" value={form.designation} onChange={(e) => setF('designation', e.target.value)} placeholder="Your designation" />
            </div>
            <div className="form-group">
              <label>Role (readonly)</label>
              <input type="text" value={user?.role || ''} readOnly style={{ background: '#f5f5f5', cursor: 'not-allowed' }} />
            </div>
            <button type="submit" className="btn-primary" disabled={saving} style={{ alignSelf: 'flex-start' }}>
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>

        {/* Change Password */}
        <form onSubmit={handlePasswordChange} className="detail-card">
          <h3 className="detail-section-title">Change Password</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label>Current Password</label>
              <input type="password" value={pwd.currentPassword} onChange={(e) => setP('currentPassword', e.target.value)} required />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input type="password" value={pwd.newPassword} onChange={(e) => setP('newPassword', e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input type="password" value={pwd.confirmPassword} onChange={(e) => setP('confirmPassword', e.target.value)} required />
            </div>
            <div style={{ background: '#f0f4ff', border: '1px solid #dbeafe', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#3730a3' }}>
              Password must be at least 8 characters long.
            </div>
            <button type="submit" className="btn-primary" disabled={savingPwd} style={{ alignSelf: 'flex-start' }}>
              {savingPwd ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>

      {/* System Info */}
      <div className="detail-card">
        <h3 className="detail-section-title">System Information</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[
            { label: 'Application', value: 'AICMS v1.0.0' },
            { label: 'Developed For', value: 'AICTE, New Delhi' },
            { label: 'Tech Stack', value: 'MERN Stack' },
            { label: 'Session User', value: user?.email },
          ].map((i) => (
            <div key={i.label} className="info-field">
              <span className="info-label">{i.label}</span>
              <span className="info-value">{i.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

