import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../services/api';
import StatusBadge from '../components/UI/StatusBadge';
import './InstitutionDetailPage.css';

export default function InstitutionDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/institutions/${id}`).then((r) => setData(r.data.data)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>;
  if (!data) return <div>Institution not found</div>;

  const { institution, complaintStats, recentComplaints } = data;
  const statsMap = {};
  (complaintStats || []).forEach((s) => { statsMap[s._id] = s.count; });

  return (
    <div className="institution-detail">
      <div className="breadcrumb">
        <Link to="/institutions">Institutions</Link>
        <span>/</span>
        <span>{institution.name}</span>
      </div>

      <div className="inst-header-card">
        <div className="inst-avatar-large">
          {institution.name[0]}
        </div>
        <div className="inst-meta-info">
          <h2>{institution.name}</h2>
          <p className="inst-subtitle">{institution.aicteId} · {institution.type} · {institution.region}</p>
          <p className="inst-address">{institution.address?.city}, {institution.address?.state} {institution.address?.pincode}</p>
        </div>
        <span className={`inst-approval-chip ${institution.approvalStatus?.toLowerCase().replace(/ /g, '-')}`} style={{ fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 20 }}>
          {institution.approvalStatus}
        </span>
      </div>

      <div className="inst-stats-grid">
        {['Pending', 'Under Process', 'Transferred', 'Escalated', 'Disposed'].map((s) => (
          <div key={s} className="inst-stat-box">
            <div className="inst-stat-num">{statsMap[s] || 0}</div>
            <div className="inst-stat-lbl">{s}</div>
          </div>
        ))}
      </div>

      <div className="inst-cases-card">
        <h3 className="inst-cases-title">Recent Complaints / Cases</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Case ID</th><th>Category</th><th>Bureau</th><th>Status</th><th>Received</th><th>SLA</th>
            </tr>
          </thead>
          <tbody>
            {(recentComplaints || []).length === 0 && <tr><td colSpan={6} className="empty-state">No complaints found</td></tr>}
            {(recentComplaints || []).map((c) => (
              <tr key={c._id}>
                <td><Link to={`/complaints/${c._id}`} className="case-id-link">{c.caseId}</Link></td>
                <td>{c.category}</td>
                <td><span className="bureau-chip">{c.assignedBureau?.code || '—'}</span></td>
                <td><StatusBadge status={c.status} /></td>
                <td className="date-cell">{c.receivedDate ? format(new Date(c.receivedDate), 'dd MMM yyyy') : '—'}</td>
                <td>{c.slaBreached ? <span className="sla-breach-badge">Breached</span> : <span className="sla-ok-badge">OK</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Link to={`/complaints?institutionId=${institution._id}`} className="view-all-link">View all cases for this institution →</Link>
      </div>
    </div>
  );
}

