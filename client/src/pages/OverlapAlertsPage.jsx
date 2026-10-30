import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../services/api';
import StatusBadge from '../components/UI/StatusBadge';
import toast from 'react-hot-toast';
import './OverlapAlertsPage.css';

// ── Relationship type config ────────────────────────────────────────────────
const REL_CONFIG = {
  DUPLICATE: {
    label: 'Duplicate',
    color: '#dc2626',
    bg: '#fee2e2',
    border: '#fca5a5',
    icon: '🔴',
    desc: 'Same complaint re-submitted to another bureau',
  },
  RELATED: {
    label: 'Related',
    color: '#b45309',
    bg: '#fef3c7',
    border: '#fde68a',
    icon: '🟡',
    desc: 'Similar issue handled by different bureau — coordination needed',
  },
  SAME_INST_DIFF_ISSUE: {
    label: 'Same Institution',
    color: '#0369a1',
    bg: '#e0f2fe',
    border: '#7dd3fc',
    icon: '🔵',
    desc: 'Same institution, unrelated issue — awareness only',
  },
  CONFLICTING_ACTION: {
    label: 'Conflicting Action',
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#c4b5fd',
    icon: '⚡',
    desc: 'Bureaus taking contradictory actions on same institution',
  },
};

const REVIEW_FILTER_OPTIONS = [
  { value: 'PENDING',   label: 'Pending Review' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'REJECTED',  label: 'Rejected' },
  { value: 'DEFERRED',  label: 'Deferred' },
  { value: 'ALL',       label: 'All' },
];

export default function OverlapAlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({});
  const [slaData, setSlaData] = useState({ breached: [], dueSoon: [] });
  const [loading, setLoading] = useState(true);
  const [reviewFilter, setReviewFilter] = useState('PENDING');
  const [typeFilter, setTypeFilter] = useState('');
  const [pairwise, setPairwise] = useState(null);
  const [pairwiseLoading, setPairwiseLoading] = useState(false);
  const [reviewing, setReviewing] = useState(null); // { complaintId, relId, relatedId }
  const [reviewNote, setReviewNote] = useState('');

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { reviewStatus: reviewFilter };
      if (typeFilter) params.type = typeFilter;
      const [ovRes, slaRes] = await Promise.all([
        api.get('/overlaps', { params }),
        api.get('/dashboard/sla-alerts'),
      ]);
      setAlerts(ovRes.data.data || []);
      setStats(ovRes.data.stats || {});
      setSlaData(slaRes.data.data || { breached: [], dueSoon: [] });
    } catch {
      toast.error('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, [reviewFilter, typeFilter]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const loadPairwise = async (idA, idB) => {
    setPairwiseLoading(true);
    setPairwise(null);
    try {
      const { data } = await api.get('/overlaps/pairwise', { params: { a: idA, b: idB } });
      setPairwise(data.data);
    } catch {
      toast.error('Could not load NLP evidence');
    } finally {
      setPairwiseLoading(false);
    }
  };

  const submitReview = async (decision) => {
    if (!reviewing) return;
    try {
      await api.put(`/overlaps/${reviewing.complaintId}/review`, {
        relatedComplaintId: reviewing.relatedId,
        reviewStatus: decision,
        reviewNote,
      });
      toast.success(`Marked as ${decision}`);
      setReviewing(null);
      setReviewNote('');
      setPairwise(null);
      fetchAlerts();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Review failed');
    }
  };

  const rescan = async (complaintId) => {
    toast.loading('Re-scanning...', { id: 'rescan' });
    try {
      const { data } = await api.post(`/overlaps/${complaintId}/rescan`);
      toast.success(data.message, { id: 'rescan' });
      fetchAlerts();
    } catch {
      toast.error('Rescan failed', { id: 'rescan' });
    }
  };

  return (
    <div className="overlap-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">CaseLink AI — Overlap Alerts</h2>
          <p className="page-subtitle">
            AI-detected relationships between complaints across AICTE Bureaus/Cells
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="overlap-stats-row">
        {Object.entries(REL_CONFIG).map(([key, cfg]) => (
          <div
            key={key}
            className={`overlap-stat-card ${typeFilter === key ? 'active' : ''}`}
            style={{ borderColor: cfg.border, background: cfg.bg, cursor: 'pointer' }}
            onClick={() => setTypeFilter(typeFilter === key ? '' : key)}
          >
            <span className="os-icon">{cfg.icon}</span>
            <div className="os-count" style={{ color: cfg.color }}>{stats[key] || 0}</div>
            <div className="os-label">{cfg.label}</div>
          </div>
        ))}
        <div className="overlap-stat-card total-card">
          <span className="os-icon">📋</span>
          <div className="os-count">{stats.total || 0}</div>
          <div className="os-label">Total Pending</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-card">
        <div className="filters-row">
          <label className="filter-label">Review Status:</label>
          <div className="pill-filter-group">
            {REVIEW_FILTER_OPTIONS.map((o) => (
              <button
                key={o.value}
                className={`pill-btn ${reviewFilter === o.value ? 'active' : ''}`}
                onClick={() => setReviewFilter(o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
          <label className="filter-label" style={{ marginLeft: 16 }}>Type:</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All Types</option>
            {Object.entries(REL_CONFIG).map(([k, c]) => (
              <option key={k} value={k}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Alert Cards */}
      {loading ? (
        <div className="grid-loading"><div className="spinner" /></div>
      ) : alerts.length === 0 ? (
        <div className="detail-card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 48 }}>✅</div>
          <h3 style={{ marginTop: 12, color: 'var(--text-primary)' }}>No overlapping cases</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: 6 }}>
            {reviewFilter === 'PENDING'
              ? 'All potential overlaps have been reviewed.'
              : 'No cases match the selected filters.'}
          </p>
        </div>
      ) : (
        <div className="alert-cards-list">
          {alerts.map((complaint) =>
            (complaint.overlapRelationships || []).map((rel, ri) => {
              const cfg = REL_CONFIG[rel.relationshipType] || REL_CONFIG.RELATED;
              const relatedCase = rel.relatedComplaint;
              const isThisReviewing =
                reviewing &&
                reviewing.complaintId === complaint._id &&
                String(reviewing.relatedId) === String(relatedCase?._id);

              return (
                <div
                  key={`${complaint._id}-${ri}`}
                  className="overlap-alert-card"
                  style={{ borderLeftColor: cfg.color }}
                >
                  {/* Card Header */}
                  <div className="oac-header">
                    <div className="oac-header-left">
                      <span className="rel-badge" style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
                        {cfg.icon} {cfg.label}
                      </span>
                      <span className="oac-score">
                        NLP Score: <strong>{(rel.score * 100).toFixed(0)}%</strong>
                      </span>
                      <ReviewStatusBadge status={rel.reviewStatus} />
                    </div>
                    <div className="oac-header-right">
                      <span className="oac-date">
                        {complaint.receivedDate
                          ? format(new Date(complaint.receivedDate), 'dd MMM yyyy')
                          : ''}
                      </span>
                    </div>
                  </div>

                  {/* Relationship Description */}
                  <p className="oac-rel-desc">{cfg.desc}</p>

                  {/* Case Pair */}
                  <div className="case-pair-row">
                    <CaseCard
                      complaint={complaint}
                      label="Case A"
                      color={cfg.color}
                    />
                    <div className="pair-arrow">
                      <LinkIcon />
                      <span>Linked</span>
                    </div>
                    <CaseCard
                      complaint={relatedCase}
                      label="Case B"
                      color={cfg.color}
                    />
                  </div>

                  {/* Evidence */}
                  {rel.evidence?.length > 0 && (
                    <div className="evidence-section">
                      <span className="evidence-label">🔍 Evidence:</span>
                      <div className="evidence-chips">
                        {rel.evidence.map((e, i) => (
                          <span key={i} className="evidence-chip">{e}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {rel.reviewStatus === 'PENDING' && (
                    <div className="oac-actions">
                      <button
                        className="pairwise-btn"
                        onClick={() => loadPairwise(complaint._id, relatedCase?._id)}
                      >
                        🔬 View NLP Analysis
                      </button>
                      <button
                        className="rescan-btn"
                        onClick={() => rescan(complaint._id)}
                      >
                        🔄 Re-scan
                      </button>
                      <div className="review-btns">
                        <button
                          className="btn-confirm"
                          onClick={() => {
                            setReviewing({ complaintId: complaint._id, relatedId: relatedCase?._id });
                            setReviewNote('');
                          }}
                        >
                          ✅ Confirm Overlap
                        </button>
                        <button
                          className="btn-reject"
                          onClick={async () => {
                            setReviewing({ complaintId: complaint._id, relatedId: relatedCase?._id });
                            await submitReview('REJECTED');
                          }}
                        >
                          ❌ Reject
                        </button>
                        <button
                          className="btn-defer"
                          onClick={() => {
                            setReviewing({ complaintId: complaint._id, relatedId: relatedCase?._id });
                            setReviewNote('');
                          }}
                        >
                          ⏸ Defer
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Review Note Input */}
                  {isThisReviewing && (
                    <div className="review-note-panel">
                      <textarea
                        className="review-note-input"
                        placeholder="Add review note (optional)..."
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        rows={2}
                      />
                      <div className="review-note-btns">
                        <button className="btn-primary" onClick={() => submitReview('CONFIRMED')}>
                          Confirm &amp; Save
                        </button>
                        <button className="btn-ghost btn-sm" onClick={() => submitReview('DEFERRED')}>
                          Defer
                        </button>
                        <button className="btn-ghost btn-sm" onClick={() => setReviewing(null)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Reviewed status */}
                  {rel.reviewStatus !== 'PENDING' && rel.reviewNote && (
                    <div className="reviewed-note">
                      <strong>Review Note:</strong> {rel.reviewNote}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* NLP Pairwise Analysis Panel */}
      {(pairwise || pairwiseLoading) && (
        <div className="pairwise-panel">
          <div className="pairwise-panel-header">
            <h3>🔬 CaseLink AI — NLP Pairwise Analysis</h3>
            <button className="modal-close" onClick={() => setPairwise(null)}>✕</button>
          </div>

          {pairwiseLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></div>
          ) : pairwise && (
            <div className="pairwise-content">
              {/* Relationship classification */}
              <div className="pairwise-result" style={{
                background: REL_CONFIG[pairwise.relationship.type]?.bg || '#f8faff',
                borderColor: REL_CONFIG[pairwise.relationship.type]?.border || '#e2e8f8',
              }}>
                <span className="pairwise-type-icon">
                  {REL_CONFIG[pairwise.relationship.type]?.icon}
                </span>
                <div>
                  <strong>{REL_CONFIG[pairwise.relationship.type]?.label}</strong>
                  <span className="pairwise-score">
                    Composite score: {(pairwise.relationship.score * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Signal breakdown */}
              <h4 className="pairwise-section-title">Signal Breakdown</h4>
              <div className="signal-grid">
                <Signal
                  label="TF-IDF Cosine Similarity"
                  value={`${(pairwise.signals.textSimilarity * 100).toFixed(1)}%`}
                  bar={pairwise.signals.textSimilarity}
                  color="#1a3fa6"
                  weight="50%"
                />
                <Signal
                  label="Same Category"
                  value={pairwise.signals.categorySame ? 'Yes' : 'No'}
                  bar={pairwise.signals.categorySame ? 1 : 0}
                  color="#06d6a0"
                  weight="20%"
                />
                <Signal
                  label="Different Bureau/Cell"
                  value={pairwise.signals.bureauDiff ? 'Yes (overlap risk)' : 'Same bureau'}
                  bar={pairwise.signals.bureauDiff ? 1 : 0}
                  color="#fb8500"
                  weight="15%"
                />
                <Signal
                  label="Monetary Amount Overlap"
                  value={pairwise.signals.amountOverlap ? 'Detected' : 'None'}
                  bar={pairwise.signals.amountOverlap ? 1 : 0}
                  color="#00b4d8"
                  weight="10%"
                />
                <Signal
                  label="Days Between Receipt"
                  value={pairwise.signals.daysDiff !== null ? `${Math.round(pairwise.signals.daysDiff)} days` : 'N/A'}
                  bar={pairwise.signals.daysDiff !== null ? Math.max(0, 1 - pairwise.signals.daysDiff / 30) : 0}
                  color="#7c3aed"
                  weight="5%"
                />
                {pairwise.signals.statusConflict && (
                  <Signal
                    label="Conflicting Action Status"
                    value="⚡ Detected"
                    bar={1}
                    color="#ef233c"
                    weight="Trigger"
                  />
                )}
              </div>

              {/* Evidence */}
              <h4 className="pairwise-section-title">Evidence</h4>
              <ul className="pairwise-evidence-list">
                {pairwise.relationship.evidence.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
                {pairwise.relationship.evidence.length === 0 && (
                  <li style={{ color: 'var(--text-muted)' }}>No strong evidence detected</li>
                )}
              </ul>

              <p className="pairwise-disclaimer">
                ⚠️ These are AI-generated suggestions. An authorized reviewer must confirm or reject this relationship.
              </p>
            </div>
          )}
        </div>
      )}

      {/* SLA Sections */}
      <div className="detail-card">
        <h3 className="detail-section-title" style={{ color: '#dc2626' }}>
          🔴 SLA Breached Cases ({slaData.breached?.length || 0})
        </h3>
        {(slaData.breached || []).length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 24 }}>
            ✅ No SLA breaches. All cases within timelines.
          </p>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Case ID</th><th>Institution</th><th>Bureau</th><th>Status</th><th>Expected Disposal</th></tr>
            </thead>
            <tbody>
              {slaData.breached.map((c) => (
                <tr key={c._id} className="sla-breached-row">
                  <td><Link to={`/complaints/${c._id}`} className="case-id-link">{c.caseId}</Link></td>
                  <td>{c.institution?.name}</td>
                  <td><span className="bureau-chip">{c.assignedBureau?.code || '—'}</span></td>
                  <td><StatusBadge status={c.status} /></td>
                  <td className="date-cell" style={{ color: '#dc2626', fontWeight: 700 }}>
                    {c.expectedDisposalDate ? format(new Date(c.expectedDisposalDate), 'dd MMM yyyy') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="detail-card">
        <h3 className="detail-section-title" style={{ color: '#b45309' }}>
          🟡 Due in Next 3 Days ({slaData.dueSoon?.length || 0})
        </h3>
        {(slaData.dueSoon || []).length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 24 }}>
            No cases due in the next 3 days.
          </p>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Case ID</th><th>Institution</th><th>Bureau</th><th>Due Date</th></tr>
            </thead>
            <tbody>
              {slaData.dueSoon.map((c) => (
                <tr key={c._id}>
                  <td><Link to={`/complaints/${c._id}`} className="case-id-link">{c.caseId}</Link></td>
                  <td>{c.institution?.name}</td>
                  <td><span className="bureau-chip">{c.assignedBureau?.code || '—'}</span></td>
                  <td className="date-cell" style={{ color: '#b45309', fontWeight: 700 }}>
                    {c.expectedDisposalDate ? format(new Date(c.expectedDisposalDate), 'dd MMM yyyy') : '—'}
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

// ── Sub-components ───────────────────────────────────────────────────────────

function CaseCard({ complaint, label, color }) {
  if (!complaint) return <div className="case-card empty">Not found</div>;
  return (
    <div className="case-card" style={{ borderColor: color }}>
      <div className="cc-label" style={{ background: color }}>{label}</div>
      <Link to={`/complaints/${complaint._id}`} className="cc-case-id">{complaint.caseId || '—'}</Link>
      <div className="cc-bureau">
        {complaint.assignedBureau?.code
          ? <span className="bureau-chip">{complaint.assignedBureau.code}</span>
          : '—'}
      </div>
      <StatusBadge status={complaint.status} size="sm" />
      <p className="cc-category">{complaint.category || '—'}</p>
    </div>
  );
}

function ReviewStatusBadge({ status }) {
  const map = {
    PENDING:   { bg: '#fef3c7', color: '#b45309', label: 'Pending' },
    CONFIRMED: { bg: '#dcfce7', color: '#166534', label: 'Confirmed' },
    REJECTED:  { bg: '#fee2e2', color: '#b91c1c', label: 'Rejected' },
    DEFERRED:  { bg: '#e0f2fe', color: '#0369a1', label: 'Deferred' },
  };
  const cfg = map[status] || map.PENDING;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

function Signal({ label, value, bar, color, weight }) {
  return (
    <div className="signal-item">
      <div className="signal-header">
        <span className="signal-label">{label}</span>
        <span className="signal-weight">Weight: {weight}</span>
        <span className="signal-value" style={{ color }}>{value}</span>
      </div>
      <div className="signal-bar-bg">
        <div className="signal-bar-fill" style={{ width: `${Math.min(bar * 100, 100)}%`, background: color }} />
      </div>
    </div>
  );
}

function LinkIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;
}
