import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';
import './LoginPage.css';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    const result = await login(email, password);
    if (result.success) {
      toast.success('Login successful!');
      navigate('/');
    } else {
      toast.error(result.message || 'Login failed');
    }
  };

  return (
    <div className="login-page">
      {/* Left Panel */}
      <div className="login-panel-left">
        <div className="login-brand">
          <div className="login-brand-logo">
            <AicteIcon />
          </div>
          <div>
            <h1 className="login-brand-name">AICMS</h1>
            <p className="login-brand-tagline">AICTE Complaint Monitoring System</p>
          </div>
        </div>

        <div className="login-hero">
          <h2>Integrated Dashboard for Institution Complaint Monitoring</h2>
          <p>
            A single-window platform for AICTE officials to monitor, track, and coordinate
            institution-related complaint cases across all Bureaus and Cells.
          </p>
          <ul className="login-features">
            <li><CheckIcon /> Real-time complaint tracking across RB & PGRC</li>
            <li><CheckIcon /> AI-assisted overlap detection</li>
            <li><CheckIcon /> SLA monitoring & alerts</li>
            <li><CheckIcon /> Institution-wise case history</li>
          </ul>
        </div>

        <div className="login-pattern" aria-hidden="true" />
      </div>

      {/* Right Panel - Form */}
      <div className="login-panel-right">
        <div className="login-form-container">
          <div className="login-form-header">
            <h2>Sign In</h2>
            <p>Enter your AICTE credentials to access the dashboard</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-wrap">
                <MailIcon />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@aicte.edu.in"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrap">
                <LockIcon />
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
                <button type="button" className="pwd-toggle" onClick={() => setShowPwd(!showPwd)}>
                  {showPwd ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <button type="submit" className="login-btn" disabled={isLoading}>
              {isLoading ? <span className="login-spinner" /> : 'Sign In'}
            </button>
          </form>

          <div className="login-demo-creds">
            <p className="demo-label">Demo Credentials</p>
            <div className="demo-creds-grid">
              {[
                { role: 'Super Admin', email: 'superadmin@aicte.edu.in' },
                { role: 'Admin', email: 'admin@aicte.edu.in' },
                { role: 'RB Officer', email: 'rb.officer@aicte.edu.in' },
                { role: 'PGRC Officer', email: 'pgrc.officer@aicte.edu.in' },
              ].map((c) => (
                <button
                  key={c.email}
                  className="demo-cred-btn"
                  onClick={() => { setEmail(c.email); setPassword('Admin@123'); }}
                >
                  <span className="demo-role">{c.role}</span>
                  <span className="demo-email">{c.email}</span>
                </button>
              ))}
            </div>
            <p className="demo-pwd">Password for all: <strong>Admin@123</strong></p>
          </div>
        </div>

        <p className="login-footer">
          © {new Date().getFullYear()} All India Council for Technical Education (AICTE). All rights reserved.
        </p>
      </div>
    </div>
  );
}

function AicteIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="18" stroke="white" strokeWidth="2.5" fill="none"/>
      <path d="M20 8L12 28H17L20 21L23 28H28L20 8Z" fill="white"/>
      <path d="M12 23H28" stroke="white" strokeWidth="2"/>
    </svg>
  );
}
function CheckIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>; }
function MailIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>; }
function LockIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>; }
function EyeIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>; }
function EyeOffIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>; }

export default LoginPage;

