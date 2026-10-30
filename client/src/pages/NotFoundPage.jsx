import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '60vh', gap: 16, textAlign: 'center',
    }}>
      <div style={{ fontSize: 80, lineHeight: 1 }}>📋</div>
      <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>404 — Page Not Found</h2>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 360 }}>
        The page you are looking for doesn't exist or you don't have permission to view it.
      </p>
      <Link
        to="/"
        style={{
          marginTop: 8, padding: '10px 24px', background: 'var(--primary)',
          color: '#fff', borderRadius: 8, textDecoration: 'none',
          fontSize: 14, fontWeight: 600,
        }}
      >
        ← Back to Dashboard
      </Link>
    </div>
  );
}

