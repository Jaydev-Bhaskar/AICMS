import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import StatusBadge from '../components/UI/StatusBadge';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import './ComplaintsPage.css';

const STATUSES = ['Pending', 'Under Process', 'Transferred', 'Escalated', 'Disposed', 'Closed', 'Rejected'];
const CATEGORIES = ['Fee Regulation', 'Faculty Issues', 'Infrastructure', 'Admission Malpractice', 'Anti-Ragging', 'Refund Issues', 'Academic Grievance', 'Administrative Misconduct', 'Other'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

export default function ComplaintsPage() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [filters, setFilters] = useState({
    page: 1, limit: 10, search: '', status: '', category: '', priority: '',
    region: '', bureauId: '', dateFrom: '', dateTo: '', slaBreached: '',
  });

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([,v]) => v !== ''));
      const { data } = await api.get('/complaints', { params });
      setComplaints(data.data || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (e) {
      toast.error('Failed to load complaints');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchComplaints(); }, [fetchComplaints]);

  const setFilter = (key, val) => setFilters((f) => ({ ...f, [key]: val, page: key !== 'page' ? 1 : val }));

  return (
    <div className="complaints-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Complaints</h2>
          <p className="page-subtitle">{total.toLocaleString()} total cases</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/complaints/new')}>
          <PlusIcon /> New Complaint
        </button>
      </div>

      {/* Filters */}
      <div className="filters-card">
        <div className="filters-row">
          <div className="search-wrap">
            <SearchIcon />
            <input
              type="text"
              placeholder="Search by Case ID, complainant, description..."
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
            />
          </div>

          <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
            <option value="">All Statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select value={filters.category} onChange={(e) => setFilter('category', e.target.value)}>
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={filters.priority} onChange={(e) => setFilter('priority', e.target.value)}>
            <option value="">All Priorities</option>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>

          <select value={filters.slaBreached} onChange={(e) => setFilter('slaBreached', e.target.value)}>
            <option value="">SLA Status</option>
            <option value="true">SLA Breached</option>
            <option value="false">Within SLA</option>
          </select>

          <button className="btn-ghost" onClick={() => setFilters({ page: 1, limit: 10, search: '', status: '', category: '', priority: '', region: '', bureauId: '', dateFrom: '', dateTo: '', slaBreached: '' })}>
            Clear Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-card">
        {loading ? (
          <div className="table-loading">
            <div className="spinner" />
            <p>Loading complaints...</p>
          </div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Case ID</th>
                  <th>Institution</th>
                  <th>Category</th>
                  <th>Bureau</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Received</th>
                  <th>SLA</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {complaints.length === 0 && (
                  <tr><td colSpan={9} className="empty-state">No complaints found matching your filters.</td></tr>
                )}
                {complaints.map((c) => (
                  <tr key={c._id} className={c.slaBreached ? 'sla-breached-row' : ''}>
                    <td>
                      <Link to={`/complaints/${c._id}`} className="case-id-link">
                        {c.caseId}
                      </Link>
                      {c.overlapFlags?.length > 0 && (
                        <span className="overlap-dot" title="Potential overlap detected">⚠️</span>
                      )}
                    </td>
                    <td>
                      <div className="cell-main">{c.institution?.name || '—'}</div>
                      <div className="cell-sub">{c.institution?.aicteId}</div>
                    </td>
                    <td>{c.category}</td>
                    <td>
                      <span className="bureau-chip">{c.assignedBureau?.code || '—'}</span>
                    </td>
                    <td><StatusBadge status={c.priority} /></td>
                    <td><StatusBadge status={c.status} /></td>
                    <td className="date-cell">
                      {c.receivedDate ? format(new Date(c.receivedDate), 'dd MMM yyyy') : '—'}
                    </td>
                    <td>
                      {c.slaBreached ? (
                        <span className="sla-breach-badge">Breached</span>
                      ) : (
                        <span className="sla-ok-badge">On Track</span>
                      )}
                    </td>
                    <td>
                      <div className="action-btns">
                        <Link to={`/complaints/${c._id}`} className="action-btn view-btn" title="View">
                          <EyeIcon />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="pagination">
              <span className="pagination-info">
                Showing {((filters.page - 1) * filters.limit) + 1}–{Math.min(filters.page * filters.limit, total)} of {total}
              </span>
              <div className="pagination-btns">
                <button disabled={filters.page <= 1} onClick={() => setFilter('page', filters.page - 1)}>
                  <ChevronLeftIcon />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = Math.max(1, filters.page - 2) + i;
                  if (p > totalPages) return null;
                  return (
                    <button key={p} className={p === filters.page ? 'active' : ''} onClick={() => setFilter('page', p)}>
                      {p}
                    </button>
                  );
                })}
                <button disabled={filters.page >= totalPages} onClick={() => setFilter('page', filters.page + 1)}>
                  <ChevronRightIcon />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PlusIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function SearchIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>; }
function EyeIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>; }
function ChevronLeftIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="15 18 9 12 15 6"/></svg>; }
function ChevronRightIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg>; }

