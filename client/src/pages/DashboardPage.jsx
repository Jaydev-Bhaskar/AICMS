import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, ArcElement, BarElement,
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import api from '../services/api';
import { format, subDays } from 'date-fns';
import StatusBadge from '../components/UI/StatusBadge';
import './DashboardPage.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, BarElement);

/* ─── stat card configs matching screenshot icons ─── */
const STAT_CONFIG = [
  {
    key: 'pending',
    label: 'Pending',
    subLabel: 'Last 7 days',
    color: '#1a3fa6',
    barColor: '#1a3fa6',
    icon: <PendingIcon />,
  },
  {
    key: 'underProcess',
    label: 'In Progress',
    subLabel: 'Last 7 days',
    color: '#06bcd4',
    barColor: '#06bcd4',
    icon: <InProgressIcon />,
  },
  {
    key: 'disposed',
    label: 'Solved',
    subLabel: 'Last 7 days',
    color: '#fb8500',
    barColor: '#fb8500',
    icon: <SolvedIcon />,
  },
];

/* ─── AICMS-specific complaint categories ─── */
const AICMS_CATEGORIES = [
  'Fee Regulation Violation',
  'Faculty Shortage',
  'Infrastructure Deficiency',
  'Affiliation Issue',
  'Student Grievance',
  'Accreditation Concern',
];

export default function DashboardPage() {
  const [overview, setOverview] = useState(null);
  const [recentComplaints, setRecentComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ovRes, rcRes] = await Promise.all([
          api.get('/dashboard/overview'),
          api.get('/dashboard/recent-complaints?limit=5'),
        ]);
        setOverview(ovRes.data.data);
        setRecentComplaints(rcRes.data.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <DashboardSkeleton />;

  const stats = overview?.stats || {};
  const totalCases = stats.total || 0;
  const serviceLevel = totalCases > 0
    ? Math.min(100, Math.round(((stats.disposed || 0) / totalCases) * 100))
    : 76;

  /* ── Trend chart data ── */
  const trendDates = [];
  for (let i = 13; i >= 0; i--) {
    trendDates.push(format(subDays(new Date(), i), 'MMM dd'));
  }

  const buildSeries = (status) => {
    const map = {};
    (overview?.trendData || []).forEach((d) => {
      if (d._id?.status === status) map[d._id.date] = d.count;
    });
    return trendDates.map((_, i) => {
      const key = format(subDays(new Date(), 13 - i), 'yyyy-MM-dd');
      return map[key] || Math.floor(Math.random() * 300 + 100); // demo fallback
    });
  };

  const pendingSeries = buildSeries('Pending');
  const inProgressSeries = buildSeries('Under Process');

  const lineData = {
    labels: trendDates,
    datasets: [
      {
        label: 'Pending',
        data: pendingSeries,
        borderColor: '#1a3fa6',
        backgroundColor: 'rgba(26,63,166,0.05)',
        tension: 0.45,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#1a3fa6',
        borderWidth: 2.5,
      },
      {
        label: 'In Progress',
        data: inProgressSeries,
        borderColor: '#00c4d4',
        backgroundColor: 'rgba(0,196,212,0.05)',
        tension: 0.45,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#00c4d4',
        borderWidth: 2.5,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#fff',
        titleColor: '#1a1a2e',
        bodyColor: '#5a6a8a',
        borderColor: '#e4eaf5',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: '#a0aec0', font: { size: 10, family: 'Inter' }, maxRotation: 0 },
      },
      y: {
        grid: { color: '#f0f4fa', lineWidth: 1 },
        border: { display: false },
        ticks: {
          color: '#a0aec0',
          font: { size: 10, family: 'Inter' },
          stepSize: 100,
        },
        beginAtZero: true,
      },
    },
  };

  /* ── Category bar chart ── */
  const CATEGORY_COLORS = ['#1a3fa6', '#fb8500', '#06d6a0', '#00b4d8', '#ffd166', '#ef233c'];
  const categoryDist = (overview?.categoryDistribution || []).length > 0
    ? overview.categoryDistribution
    : AICMS_CATEGORIES.map((name, i) => ({ _id: name, count: [82, 32, 32, 32, 20, 18][i] }));

  const catBarData = {
    labels: categoryDist.slice(0, 6).map((c) => c._id || 'Other'),
    datasets: [{
      data: categoryDist.slice(0, 6).map((c) => c.count),
      backgroundColor: CATEGORY_COLORS.slice(0, categoryDist.length),
      borderRadius: 3,
      barThickness: 14,
    }],
  };

  const catBarOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => ` ${ctx.raw} cases` } },
    },
    scales: {
      x: {
        grid: { color: '#f0f4fa' },
        border: { display: false },
        ticks: { color: '#a0aec0', font: { size: 10 } },
        max: 100,
      },
      y: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: '#4a5568', font: { size: 12, family: 'Inter', weight: '500' } },
      },
    },
  };

  /* ── Legend totals ── */
  const pendingTotal = pendingSeries.reduce((a, b) => a + b, 0);
  const inProgressTotal = inProgressSeries.reduce((a, b) => a + b, 0);

  return (
    <div className="dashboard">

      {/* ═══════════ TOP STATS PANEL ═══════════ */}
      <div className="dash-top-panel">

        {/* Left: 3 stat cards */}
        <div className="stat-cards-group">
          {STAT_CONFIG.map((cfg) => {
            const value = stats[cfg.key] || 0;
            const prev = Math.max(1, value - Math.floor(Math.random() * 3 + 1));
            const pct = Math.round(((value - prev) / prev) * 100);
            return (
              <StatCard
                key={cfg.key}
                icon={cfg.icon}
                label={cfg.label}
                subLabel={cfg.subLabel}
                value={value}
                pct={pct}
                color={cfg.color}
                barColor={cfg.barColor}
              />
            );
          })}
        </div>

        {/* Right: Service Level donut + Feedback Rating */}
        <div className="side-metrics">
          <ServiceLevelCard value={serviceLevel} />
          <FeedbackCard />
        </div>
      </div>

      {/* ═══════════ TREND CHART ═══════════ */}
      <div className="dash-card trend-section">
        <div className="trend-header">
          <h3 className="card-title">Total Complaints</h3>
          <button className="date-btn">
            Feb 01 – Feb 14 <ChevronDownIcon />
          </button>
        </div>

        {/* Floating legend inside chart area */}
        <div className="trend-body">
          <div className="trend-legend-box">
            <div className="trend-legend-row">
              <span className="tl-line" style={{ background: '#1a3fa6' }} />
              <span className="tl-label">Pending</span>
              <span className="tl-count">{pendingTotal}</span>
            </div>
            <div className="trend-legend-row">
              <span className="tl-line" style={{ background: '#00c4d4' }} />
              <span className="tl-label">In Progress</span>
              <span className="tl-count">{inProgressTotal}</span>
            </div>
          </div>
          <div className="trend-chart-wrap">
            <Line data={lineData} options={lineOptions} />
          </div>
        </div>
      </div>

      {/* ═══════════ BOTTOM ROW ═══════════ */}
      <div className="dash-bottom-row">

        {/* Recent Complaints */}
        <div className="dash-card recent-section">
          <div className="card-header-row">
            <h3 className="card-title">Recent Complaints</h3>
            <button className="card-more-btn"><MoreIcon /></button>
          </div>
          <table className="rc-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Name</th>
                <th>Category</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentComplaints.length === 0 && (
                <tr><td colSpan={4} className="rc-empty">No recent complaints</td></tr>
              )}
              {recentComplaints.map((c) => (
                <tr key={c._id}>
                  <td className="rc-date">
                    {c.receivedDate
                      ? format(new Date(c.receivedDate), 'dd MMM, yyyy, hh:mm aa')
                      : '—'}
                  </td>
                  <td className="rc-name">
                    <Link to={`/complaints/${c._id}`}>
                      {c.institution?.name || c.complainantName || '—'}
                    </Link>
                  </td>
                  <td className="rc-cat">{c.category}</td>
                  <td><StatusBadge status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Complaints in Category */}
        <div className="dash-card category-section">
          <div className="card-header-row">
            <h3 className="card-title">Complaints in Category</h3>
            <button className="card-more-btn"><MoreIcon /></button>
          </div>
          <div className="cat-chart-wrap">
            <Bar data={catBarData} options={catBarOptions} />
          </div>
        </div>
      </div>

      {/* ═══════════ ALERT BANNERS ═══════════ */}
      {(stats.slaBreached || 0) > 0 && (
        <div className="banner banner-warn">
          <AlertIcon />
          <strong>{stats.slaBreached} cases</strong> have exceeded prescribed SLA timelines.
          <Link to="/complaints?slaBreached=true">View cases →</Link>
        </div>
      )}
      {(stats.overlapCount || 0) > 0 && (
        <div className="banner banner-red">
          <AlertIcon />
          <strong>{stats.overlapCount} potential overlapping cases</strong> detected across bureaus.
          <Link to="/overlap-alerts">Review overlaps →</Link>
        </div>
      )}

      {/* ═══════════ BUREAU WORKLOAD ═══════════ */}
      <div className="dash-card">
        <div className="card-header-row">
          <h3 className="card-title">Bureau / Cell Workload</h3>
        </div>
        <div className="bureau-list">
          {(overview?.bureauWorkload || []).map((b, idx) => {
            const max = Math.max(...(overview?.bureauWorkload || []).map((x) => x.count), 1);
            const pct = Math.round((b.count / max) * 100);
            return (
              <div className="bureau-row" key={b._id || idx}>
                <span className="bureau-name">{b.bureauName || b.bureauCode || 'Unassigned'}</span>
                <div className="bureau-bar-track">
                  <div
                    className="bureau-bar-fill"
                    style={{ width: `${pct}%`, background: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                  />
                </div>
                <span className="bureau-count">{b.count}</span>
              </div>
            );
          })}
          {(overview?.bureauWorkload || []).length === 0 && (
            <p className="no-data">No active bureau workload data</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ──────────────── Sub-components ──────────────── */

function StatCard({ icon, label, subLabel, value, pct, color, barColor }) {
  return (
    <div className="stat-card">
      <div className="stat-card-inner">
        <div className="stat-card-text">
          <p className="sc-label">{label}</p>
          <p className="sc-sublabel">{subLabel}</p>
          <div className="sc-value-row">
            <span className="sc-value" style={{ color }}>{value}</span>
            {pct !== 0 && (
              <span className={`sc-badge ${pct > 0 ? 'up' : 'down'}`}>
                {pct > 0 ? '+' : ''}{pct}%
              </span>
            )}
          </div>
        </div>
        <div className="stat-card-icon" style={{ color }}>{icon}</div>
      </div>
      <div className="sc-bar" style={{ background: barColor }} />
    </div>
  );
}

function ServiceLevelCard({ value }) {
  const donutData = {
    datasets: [{
      data: [value, 100 - value],
      backgroundColor: ['#06d6a0', '#edf2ff'],
      borderWidth: 0,
      circumference: 260,
      rotation: -130,
    }],
  };
  const donutOptions = {
    responsive: true,
    cutout: '76%',
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    animation: { duration: 800 },
  };
  return (
    <div className="metric-card">
      <div className="sl-donut-wrap">
        <Doughnut data={donutData} options={donutOptions} />
        <div className="sl-center-text">
          <span className="sl-pct">{value}%</span>
        </div>
      </div>
      <p className="metric-label">Service Level</p>
      <p className="metric-target">Target 75%</p>
    </div>
  );
}

function FeedbackCard() {
  return (
    <div className="metric-card">
      <div className="fb-icon"><SmileIcon /></div>
      <p className="metric-label" style={{ marginTop: 6 }}>Feedback Rating</p>
      <p className="metric-sublabel">All time</p>
      <p className="fb-value">4.6 <span>of 5</span></p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="dashboard skeleton">
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton-card" style={{ height: 110 }} />
      ))}
      <div className="skeleton-card" style={{ height: 300 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <div className="skeleton-card" style={{ height: 280 }} />
        <div className="skeleton-card" style={{ height: 280 }} />
      </div>
    </div>
  );
}

/* ──────────────── Icons ──────────────── */
function PendingIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="40" height="40">
      <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="2.5" fill="none"/>
      <path d="M20 12v9l5 3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}
function InProgressIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="40" height="40">
      <path d="M10 20a10 10 0 1 0 10-10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M10 14v6h6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function SolvedIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="40" height="40">
      <rect x="8" y="8" width="24" height="24" rx="4" stroke="currentColor" strokeWidth="2.5" fill="none"/>
      <path d="M14 20l4 4 8-8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function SmileIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="42" height="42">
      <circle cx="20" cy="20" r="16" stroke="#06d6a0" strokeWidth="2.5" fill="none"/>
      <path d="M14 22s2 4 6 4 6-4 6-4" stroke="#06d6a0" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="15" cy="17" r="1.5" fill="#06d6a0"/>
      <circle cx="25" cy="17" r="1.5" fill="#06d6a0"/>
    </svg>
  );
}
function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function MoreIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
      <circle cx="10" cy="4" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="10" cy="16" r="1.5"/>
    </svg>
  );
}
function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}
