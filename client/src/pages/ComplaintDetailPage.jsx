import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../services/api';
import StatusBadge from '../components/UI/StatusBadge';
import toast from 'react-hot-toast';
import './ComplaintDetailPage.css';

const STATUSES = ['Pending', 'Under Process', 'Transferred', 'Escalated', 'Disposed', 'Closed', 'Rejected'];

export default function ComplaintDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [remarkText, setRemarkText] = useState('');
  const [updates, setUpdates] = useState({});

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get(`/complaints/${id}`);
        setComplaint(data.data);
        setUpdates({
          status: data.data.status,
          priority: data.data.priority,
          nextAction: data.data.nextAction || '',
        });
      } catch {
        toast.error('Complaint not found');
        navigate('/complaints');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id, navigate]);

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const { data } = await api.put(`/complaints/${id}`, { ...updates, remarks: remarkText });
      setComplaint(data.data);
      setEditMode(false);
      setRemarkText('');
      toast.success('Complaint updated successfully');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleAddRemark = async () => {
    if (!remarkText.trim()) return toast.error('Please enter a remark');
    setSaving(true);
    try {
      await api.post(`/complaints/${id}/actions`, { actionType: 'Remark Added', remarks: remarkText });
      const { data } = await api.get(`/complaints/${id}`);
      setComplaint(data.data);
      setRemarkText('');
      toast.success('Remark added');
    } catch {
      toast.error('Failed to add remark');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="detail-loading"><div className="spinner" /></div>;
  if (!complaint) return null;

  const inst = complaint.institution;
  const bureau = complaint.assignedBureau;
  const officer = complaint.assignedOfficer;

  return (
    <div className="complaint-detail">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link to="/complaints">Complaints</Link>
        <span>/</span>
        <span>{complaint.caseId}</span>
      </div>

      {/* Header */}
      <div className="detail-header">
        <div className="detail-header-left">
          <h2 className="detail-case-id">{complaint.caseId}</h2>
          <StatusBadge status={complaint.status} size="md" />
          <StatusBadge status={complaint.priority} size="md" />
          {complaint.slaBreached && <span className="sla-breach-badge">SLA Breached</span>}
          {complaint.overlapFlags?.length > 0 && (
            <span className="overlap-warning-badge">⚠️ Potential Overlap</span>
          )}
        </div>
        <div className="detail-header-right">
          {!editMode ? (
            <button className="btn-primary" onClick={() => setEditMode(true)}>Edit Case</button>
          ) : (
            <>
              <button className="btn-ghost" onClick={() => setEditMode(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleUpdate} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Overlap Alert */}
      {complaint.overlapFlags?.length > 0 && (
        <div className="overlap-alert-box">
          <div className="overlap-alert-icon">⚠️</div>
          <div>
            <strong>Potential Overlapping Cases – Coordination Required</strong>
            <p>
              This case may overlap with: {complaint.overlapFlags.map((o) => (
                <Link key={o._id} to={`/complaints/${o._id}`}>{o.caseId}</Link>
              )).reduce((acc, el, i) => [acc, i > 0 ? ', ' : '', el], [])}. 
              Please coordinate with the relevant Bureau/Cell before taking action.
            </p>
          </div>
        </div>
      )}

      <div className="detail-grid">
        {/* Left Column */}
        <div className="detail-left">
          {/* Case Info */}
          <div className="detail-card">
            <h3 className="detail-section-title">Case Information</h3>
            <div className="info-grid">
              <InfoField label="Case ID" value={complaint.caseId} />
              <InfoField label="Source" value={complaint.source} />
              <InfoField label="Category" value={complaint.category} />
              <InfoField label="Sub-Category" value={complaint.subCategory || '—'} />
              <InfoField label="Complainant" value={complaint.complainantName} />
              <InfoField label="Complainant Type" value={complaint.complainantType} />
              <InfoField label="Email" value={complaint.complainantEmail || '—'} />
              <InfoField label="Phone" value={complaint.complainantPhone || '—'} />
              <InfoField label="Region" value={complaint.region || '—'} />
              <InfoField label="Received Date" value={complaint.receivedDate ? format(new Date(complaint.receivedDate), 'dd MMM yyyy, hh:mm aa') : '—'} />
              <InfoField label="Expected Disposal" value={complaint.expectedDisposalDate ? format(new Date(complaint.expectedDisposalDate), 'dd MMM yyyy') : '—'} />
              <InfoField label="Disposal Date" value={complaint.disposalDate ? format(new Date(complaint.disposalDate), 'dd MMM yyyy') : '—'} />
            </div>
            <div className="description-field">
              <label>Description</label>
              <p>{complaint.description}</p>
            </div>
          </div>

          {/* Assignment */}
          <div className="detail-card">
            <h3 className="detail-section-title">Assignment & Status</h3>
            {editMode ? (
              <div className="edit-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Status</label>
                    <select value={updates.status} onChange={(e) => setUpdates((u) => ({ ...u, status: e.target.value }))}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Priority</label>
                    <select value={updates.priority} onChange={(e) => setUpdates((u) => ({ ...u, priority: e.target.value }))}>
                      {['Low', 'Medium', 'High', 'Critical'].map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Next Action Required</label>
                  <input
                    type="text"
                    value={updates.nextAction}
                    onChange={(e) => setUpdates((u) => ({ ...u, nextAction: e.target.value }))}
                    placeholder="Describe the next action..."
                  />
                </div>
                <div className="form-group">
                  <label>Remarks</label>
                  <textarea
                    value={remarkText}
                    onChange={(e) => setRemarkText(e.target.value)}
                    rows={3}
                    placeholder="Enter remarks for this update..."
                  />
                </div>
              </div>
            ) : (
              <div className="info-grid">
                <InfoField label="Assigned Bureau" value={bureau ? `${bureau.name} (${bureau.code})` : '—'} />
                <InfoField label="Assigned Officer" value={officer ? `${officer.name} (${officer.email})` : '—'} />
                <InfoField label="Current Status" value={<StatusBadge status={complaint.status} />} />
                <InfoField label="Priority" value={<StatusBadge status={complaint.priority} />} />
                <InfoField label="Last Action" value={complaint.lastActionDate ? format(new Date(complaint.lastActionDate), 'dd MMM yyyy') : '—'} />
                <InfoField label="Next Action" value={complaint.nextAction || '—'} />
              </div>
            )}
          </div>

          {/* Add Remark */}
          {!editMode && (
            <div className="detail-card">
              <h3 className="detail-section-title">Add Remark</h3>
              <textarea
                className="remark-textarea"
                value={remarkText}
                onChange={(e) => setRemarkText(e.target.value)}
                rows={3}
                placeholder="Enter your remark or observation..."
              />
              <button className="btn-primary" style={{ marginTop: 10 }} onClick={handleAddRemark} disabled={saving}>
                {saving ? 'Adding...' : 'Add Remark'}
              </button>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="detail-right">
          {/* Institution Info */}
          <div className="detail-card">
            <h3 className="detail-section-title">Institution Details</h3>
            {inst ? (
              <>
                <div className="inst-name-row">
                  <span className="inst-name">{inst.name}</span>
                  <Link to={`/institutions/${inst._id}`} className="view-inst-link">View Profile</Link>
                </div>
                <div className="info-grid">
                  <InfoField label="AICTE ID" value={inst.aicteId} />
                  <InfoField label="Type" value={inst.type} />
                  <InfoField label="Region" value={inst.region} />
                  <InfoField label="City" value={inst.address?.city} />
                  <InfoField label="State" value={inst.address?.state} />
                  <InfoField label="Approval" value={inst.approvalStatus} />
                </div>
              </>
            ) : <p className="no-data">Institution not found</p>}
          </div>

          {/* Action History */}
          <div className="detail-card">
            <h3 className="detail-section-title">Action History</h3>
            <div className="timeline">
              {(complaint.actionHistory || []).length === 0 && (
                <p className="no-data">No action history</p>
              )}
              {[...(complaint.actionHistory || [])].reverse().map((action, i) => (
                <div className="timeline-item" key={i}>
                  <div className="timeline-dot" />
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <span className="timeline-action">{action.actionType}</span>
                      {action.toStatus && (
                        <span className="timeline-status-change">
                          {action.fromStatus && `${action.fromStatus} → `}{action.toStatus}
                        </span>
                      )}
                    </div>
                    {action.remarks && <p className="timeline-remark">{action.remarks}</p>}
                    <div className="timeline-meta">
                      <span>{action.actionBy?.name || 'System'}</span>
                      {action.bureau?.name && <span>· {action.bureau.name}</span>}
                      <span>· {action.actionDate ? format(new Date(action.actionDate), 'dd MMM yyyy, hh:mm aa') : '—'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value }) {
  return (
    <div className="info-field">
      <span className="info-label">{label}</span>
      <span className="info-value">{value || '—'}</span>
    </div>
  );
}

