import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import './InstitutionsPage.css';

const REGIONS = ['Northern', 'Southern', 'Eastern', 'Western', 'Central', 'North-Eastern', 'South-Western'];
const TYPES = ['Engineering', 'Management', 'Pharmacy', 'Architecture', 'Hotel Management', 'Applied Arts', 'MCA', 'Other'];

export default function InstitutionsPage() {
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ page: 1, limit: 12, search: '', region: '', type: '' });

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([,v]) => v !== ''));
      const { data } = await api.get('/institutions', { params });
      setInstitutions(data.data || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch { toast.error('Failed to load institutions'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetch(); }, [fetch]);
  const setF = (k, v) => setFilters((f) => ({ ...f, [k]: v, page: k !== 'page' ? 1 : v }));

  return (
    <div className="institutions-page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Institutions</h2>
          <p className="page-subtitle">{total.toLocaleString()} institutions registered</p>
        </div>
      </div>

      <div className="filters-card">
        <div className="filters-row">
          <div className="search-wrap">
            <SearchIcon />
            <input type="text" placeholder="Search by name, AICTE ID, city..." value={filters.search} onChange={(e) => setF('search', e.target.value)} />
          </div>
          <select value={filters.region} onChange={(e) => setF('region', e.target.value)}>
            <option value="">All Regions</option>
            {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={filters.type} onChange={(e) => setF('type', e.target.value)}>
            <option value="">All Types</option>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button className="btn-ghost" onClick={() => setFilters({ page: 1, limit: 12, search: '', region: '', type: '' })}>Clear</button>
        </div>
      </div>

      {loading ? (
        <div className="grid-loading"><div className="spinner" /></div>
      ) : (
        <div className="inst-grid">
          {institutions.length === 0 && <div className="empty-state-full">No institutions found</div>}
          {institutions.map((inst) => (
            <Link to={`/institutions/${inst._id}`} key={inst._id} className="inst-card">
              <div className="inst-card-header">
                <div className="inst-avatar">{inst.name[0]}</div>
                <div className="inst-header-info">
                  <span className="inst-type-chip">{inst.type}</span>
                  <span className={`inst-approval-chip ${inst.approvalStatus?.toLowerCase().replace(/ /g, '-')}`}>{inst.approvalStatus}</span>
                </div>
              </div>
              <h3 className="inst-name">{inst.name}</h3>
              <p className="inst-id">{inst.aicteId}</p>
              <div className="inst-location">
                <LocationIcon />
                <span>{inst.address?.city}, {inst.address?.state}</span>
                <span className="inst-region-chip">{inst.region}</span>
              </div>
              <div className="inst-stats">
                <div className="inst-stat">
                  <span className="inst-stat-val">{inst.totalComplaints || 0}</span>
                  <span className="inst-stat-label">Total Cases</span>
                </div>
                <div className="inst-stat">
                  <span className="inst-stat-val pending">{inst.pendingComplaints || 0}</span>
                  <span className="inst-stat-label">Pending</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <span className="pagination-info">Page {filters.page} of {totalPages}</span>
          <div className="pagination-btns">
            <button disabled={filters.page <= 1} onClick={() => setF('page', filters.page - 1)}><ChevronLeftIcon /></button>
            <button disabled={filters.page >= totalPages} onClick={() => setF('page', filters.page + 1)}><ChevronRightIcon /></button>
          </div>
        </div>
      )}
    </div>
  );
}

function SearchIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>; }
function LocationIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>; }
function ChevronLeftIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="15 18 9 12 15 6"/></svg>; }
function ChevronRightIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg>; }

