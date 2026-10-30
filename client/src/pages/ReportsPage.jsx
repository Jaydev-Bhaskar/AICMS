import React, { useState, useEffect } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js';
import api from '../services/api';
import toast from 'react-hot-toast';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

const REPORT_TYPES = [
  { key: 'bureau_wise', label: 'Bureau-wise Report' },
  { key: 'region_wise', label: 'Region-wise Report' },
  { key: 'institution_wise', label: 'Institution-wise Report' },
  { key: 'ageing', label: 'Ageing Analysis' },
  { key: 'disposal_rate', label: 'Disposal Rate' },
  { key: 'overlap', label: 'Overlap / Duplicate Cases' },
];

const COLORS = ['#1a3fa6', '#fb8500', '#06d6a0', '#00b4d8', '#ffd166', '#ef233c', '#7c3aed'];

export default function ReportsPage() {
  const [reportType, setReportType] = useState('bureau_wise');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = { type: reportType };
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const { data: res } = await api.get('/reports', { params });
      setData(res);
    } catch { toast.error('Failed to generate report'); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchReport(); }, [reportType]);

  const renderChart = () => {
    if (!data?.data || loading) return null;

    if (reportType === 'bureau_wise') {
      const chartData = {
        labels: data.data.map((d) => d._id.bureauCode || d._id.bureauName || 'Unknown'),
        datasets: [{ label: 'Total Cases', data: data.data.map((d) => d.total), backgroundColor: COLORS }],
      };
      return <Bar data={chartData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} />;
    }

    if (reportType === 'region_wise') {
      const chartData = {
        labels: data.data.map((d) => d._id),
        datasets: [{ label: 'Cases', data: data.data.map((d) => d.total), backgroundColor: COLORS }],
      };
      return <Bar data={chartData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} />;
    }

    if (reportType === 'disposal_rate') {
      const chartData = {
        labels: data.data.map((d) => d._id.period),
        datasets: [
          { label: 'Total', data: data.data.map((d) => d.total), borderColor: '#1a3fa6', fill: false, tension: 0.4 },
          { label: 'Disposed', data: data.data.map((d) => d.disposed), borderColor: '#06d6a0', fill: false, tension: 0.4 },
        ],
      };
      return <Line data={chartData} options={{ responsive: true, scales: { y: { beginAtZero: true } } }} />;
    }

    if (reportType === 'ageing') {
      const bucketLabels = { 0: '0-7 days', 7: '8-15 days', 15: '16-30 days', 30: '31-60 days', 60: '61-90 days', 90: '91-180 days', '180+': '180+ days' };
      const chartData = {
        labels: data.data.map((d) => bucketLabels[d._id] || d._id),
        datasets: [{ label: 'Cases', data: data.data.map((d) => d.count), backgroundColor: COLORS }],
      };
      return <Bar data={chartData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} />;
    }

    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">Reports & Analytics</h2>
          <p className="page-subtitle">Generate and analyze complaint data</p>
        </div>
      </div>

      {/* Report Type Tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {REPORT_TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => setReportType(t.key)}
            style={{
              padding: '9px 16px', borderRadius: 20, border: '1.5px solid',
              borderColor: reportType === t.key ? 'var(--primary)' : 'var(--border)',
              background: reportType === t.key ? 'var(--primary)' : '#fff',
              color: reportType === t.key ? '#fff' : 'var(--text-secondary)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="filters-card">
        <div className="filters-row">
          <label style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Date From:</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'var(--font)', outline: 'none' }} />
          <label style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Date To:</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'var(--font)', outline: 'none' }} />
          <button className="btn-primary" onClick={fetchReport}>Generate Report</button>
        </div>
      </div>

      {/* Chart */}
      <div className="detail-card">
        <h3 className="detail-section-title">{REPORT_TYPES.find((t) => t.key === reportType)?.label}</h3>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
        ) : (
          <div style={{ height: 320 }}>
            {renderChart()}
          </div>
        )}
      </div>

      {/* Table Data */}
      {data?.data && !loading && reportType !== 'overlap' && (
        <div className="detail-card">
          <h3 className="detail-section-title">Detailed Data</h3>
          {reportType === 'bureau_wise' && (
            <table className="data-table">
              <thead><tr><th>Bureau</th><th>Total</th><th>Breakdown</th></tr></thead>
              <tbody>
                {data.data.map((d, i) => (
                  <tr key={i}>
                    <td><strong>{d._id.bureauName}</strong> ({d._id.bureauCode})</td>
                    <td><strong>{d.total}</strong></td>
                    <td>{(d.statuses || []).map((s) => `${s.status}: ${s.count}`).join(' | ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {reportType === 'institution_wise' && (
            <table className="data-table">
              <thead><tr><th>Institution</th><th>Total</th><th>Pending</th><th>Disposed</th><th>SLA Breached</th></tr></thead>
              <tbody>
                {data.data.map((d, i) => (
                  <tr key={i}>
                    <td>{d.institution?.name} <br/><small style={{ color: 'var(--text-muted)' }}>{d.institution?.aicteId}</small></td>
                    <td>{d.total}</td>
                    <td style={{ color: 'var(--accent-orange)', fontWeight: 700 }}>{d.pending}</td>
                    <td style={{ color: '#16a34a', fontWeight: 700 }}>{d.disposed}</td>
                    <td style={{ color: d.slaBreached > 0 ? '#dc2626' : '#16a34a', fontWeight: 700 }}>{d.slaBreached}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Overlap Table */}
      {reportType === 'overlap' && data?.data && !loading && (
        <div className="detail-card">
          <h3 className="detail-section-title">Overlapping / Duplicate Cases ({data.count})</h3>
          {data.data.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>✅ No overlapping cases found in the selected period.</div>
          ) : (
            <table className="data-table">
              <thead><tr><th>Case ID</th><th>Institution</th><th>Bureau</th><th>Status</th><th>Overlaps With</th><th>Reviewed</th></tr></thead>
              <tbody>
                {data.data.map((c) => (
                  <tr key={c._id}>
                    <td><a href={`/complaints/${c._id}`} className="case-id-link">{c.caseId}</a></td>
                    <td>{c.institution?.name}</td>
                    <td><span className="bureau-chip">{c.assignedBureau?.code || '—'}</span></td>
                    <td><span style={{ fontSize: 12, fontWeight: 600 }}>{c.status}</span></td>
                    <td>{(c.overlapFlags || []).map((o) => o.caseId).join(', ')}</td>
                    <td>{c.isOverlapReviewed ? '✅ Yes' : '⚠️ No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

