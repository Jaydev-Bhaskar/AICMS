import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import StatusBadge from '../components/UI/StatusBadge';
import { format } from 'date-fns';
import './StudentGrievancePage.css';

const STAKEHOLDER_TYPES = [
  { value: 'Student', label: '🎓 Student' },
  { value: 'Faculty', label: '👨‍🏫 Faculty Member / Teacher' },
  { value: 'Parent', label: '👨‍👩‍👧 Parent / Guardian' },
  { value: 'Staff', label: '💼 Non-Teaching Staff Member' },
  { value: 'Other Stakeholder', label: '🏛️ Concerned Citizen / Other Stakeholder' },
  { value: 'Anonymous', label: '🛡️ Anonymous / Whistleblower' },
];

const CATEGORIES = [
  'Fee Regulation',
  'Faculty Issues',
  'Infrastructure',
  'Affiliation',
  'Admission Malpractice',
  'Anti-Ragging',
  'Sexual Harassment',
  'Refund Issues',
  'Academic Grievance',
  'Administrative Misconduct',
  'Other',
];

export default function StudentGrievancePage() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'track' ? 'track' : 'lodge';
  const [activeTab, setActiveTab] = useState(initialTab);

  // ── Lodge Form State ──
  const [institutions, setInstitutions] = useState([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submittedCase, setSubmittedCase] = useState(null);

  const [form, setForm] = useState({
    institution: '',
    complainantName: '',
    complainantEmail: '',
    complainantPhone: '',
    complainantType: 'Student',
    stakeholderId: '',
    category: '',
    subCategory: '',
    priority: 'Medium',
    description: '',
  });

  // ── Track Form State ──
  const [trackCaseId, setTrackCaseId] = useState(searchParams.get('caseId') || '');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [trackingError, setTrackingError] = useState('');

  // Fetch institutions for dropdown
  useEffect(() => {
    api.get('/institutions?limit=300')
      .then((res) => setInstitutions(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoadingInstitutions(false));
  }, []);

  const performTrack = useCallback(async (cId) => {
    const id = (cId || trackCaseId).trim();
    if (!id) return;
    setTrackingLoading(true);
    setTrackingError('');
    setTrackingData(null);
    try {
      const res = await api.get(`/complaints/public/track/${encodeURIComponent(id)}`);
      setTrackingData(res.data.data);
    } catch (err) {
      setTrackingError(err.response?.data?.message || 'Grievance not found. Please verify the Case ID.');
    } finally {
      setTrackingLoading(false);
    }
  }, [trackCaseId]);

  // Auto-track if caseId present in URL
  useEffect(() => {
    const urlCaseId = searchParams.get('caseId');
    if (urlCaseId) {
      setTrackCaseId(urlCaseId);
      setActiveTab('track');
      performTrack(urlCaseId);
    }
  }, [searchParams, performTrack]);

  const handleLodgeSubmit = async (e) => {
    e.preventDefault();
    if (!form.institution) return toast.error('Please select the institution');
    if (!form.complainantName.trim()) return toast.error('Please enter your name (or Anonymous)');
    if (!form.complainantEmail.trim()) return toast.error('Please enter your email for status tracking');
    if (!form.category) return toast.error('Please select grievance category');
    if (!form.description.trim() || form.description.trim().length < 20) {
      return toast.error('Please provide a detailed description (min 20 characters)');
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        studentRollNo: form.stakeholderId,
      };
      const res = await api.post('/complaints/public/lodge', payload);
      setSubmittedCase(res.data.data);
      toast.success('Grievance registered successfully in AICTE UGMS!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit grievance. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ugms-student-portal">
      {/* ── Top Header Bar ── */}
      <header className="sp-header">
        <div className="sp-header-inner">
          <div className="sp-brand">
            <div className="sp-emblem"><AicteSealIcon /></div>
            <div>
              <h1 className="sp-title">AICTE UGMS</h1>
              <p className="sp-tagline">
                Unified Grievance Monitoring System · Portal for Students, Faculty & Stakeholders
              </p>
            </div>
          </div>
          <div className="sp-nav-actions">
            <Link to="/login" className="sp-officer-login-btn">
              AICTE Bureau Sign In →
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero Banner ── */}
      <section className="sp-hero">
        <div className="sp-hero-content">
          <span className="sp-badge">Official AICTE Grievance Window</span>
          <h2>Grievance Redressal for Students, Faculty & Stakeholders</h2>
          <p>
            Whether you are a student, faculty member, parent, staff, or concerned party, you can
            register institution-related complaints directly. Your grievance is automatically routed to
            the Public Grievance Redressal Cell (PGRC) and Regulation Bureau (RB) with explainable
            cross-bureau tracking and strict SLA monitoring.
          </p>

          {/* Tab Selector */}
          <div className="sp-tabs">
            <button
              className={`sp-tab-btn ${activeTab === 'lodge' ? 'active' : ''}`}
              onClick={() => { setActiveTab('lodge'); setSubmittedCase(null); }}
            >
              ✍️ Lodge Grievance
            </button>
            <button
              className={`sp-tab-btn ${activeTab === 'track' ? 'active' : ''}`}
              onClick={() => setActiveTab('track')}
            >
              🔍 Track Status
            </button>
          </div>
        </div>
      </section>

      {/* ── Main Content Area ── */}
      <main className="sp-main">

        {/* ═══════════ TAB 1: LODGE GRIEVANCE ═══════════ */}
        {activeTab === 'lodge' && (
          <div className="sp-card sp-lodge-card">
            {submittedCase ? (
              /* Success Receipt View */
              <div className="sp-success-receipt">
                <div className="success-icon-wrap">
                  <CheckmarkIcon />
                </div>
                <h3>Grievance Successfully Registered!</h3>
                <p className="success-sub">
                  Your case has been recorded in the AICTE Unified Grievance Monitoring System (UGMS).
                  An automated case file has been assigned for bureau coordination.
                </p>

                <div className="case-id-highlight">
                  <span className="cid-label">Official Tracking Case ID</span>
                  <span className="cid-value">{submittedCase.caseId}</span>
                </div>

                <div className="receipt-details-grid">
                  <div className="rd-box">
                    <span className="rd-lbl">Assigned Cell</span>
                    <span className="rd-val">{submittedCase.assignedBureau?.name || 'PGRC / Regulation Bureau'}</span>
                  </div>
                  <div className="rd-box">
                    <span className="rd-lbl">Current Stage</span>
                    <span className="rd-val status-pill-initial">Under Bureau Review</span>
                  </div>
                  <div className="rd-box">
                    <span className="rd-lbl">Receipt Date</span>
                    <span className="rd-val">{format(new Date(submittedCase.receivedDate), 'dd MMM yyyy')}</span>
                  </div>
                  <div className="rd-box">
                    <span className="rd-lbl">Prescribed SLA Target</span>
                    <span className="rd-val">
                      {submittedCase.expectedDisposalDate
                        ? format(new Date(submittedCase.expectedDisposalDate), 'dd MMM yyyy')
                        : 'Within 21 days'}
                    </span>
                  </div>
                </div>

                <div className="receipt-actions">
                  <button
                    className="sp-btn-primary"
                    onClick={() => {
                      setTrackCaseId(submittedCase.caseId);
                      setActiveTab('track');
                      performTrack(submittedCase.caseId);
                    }}
                  >
                    Track Progress Live →
                  </button>
                  <button
                    className="sp-btn-outline"
                    onClick={() => {
                      setSubmittedCase(null);
                      setForm({
                        institution: '', complainantName: '', complainantEmail: '',
                        complainantPhone: '', complainantType: 'Student', stakeholderId: '',
                        category: '', subCategory: '', priority: 'Medium', description: '',
                      });
                    }}
                  >
                    Lodge Another Grievance
                  </button>
                </div>
              </div>
            ) : (
              /* Lodge Form */
              <form className="sp-form" onSubmit={handleLodgeSubmit}>

                {/* Section 1 */}
                <div className="form-section-head">
                  <div className="step-num">1</div>
                  <div>
                    <h4>Institution Selection</h4>
                    <p>Select the technical institution concerning your complaint</p>
                  </div>
                </div>

                <div className="sp-field">
                  <label htmlFor="inst-select">Technical Institution (AICTE Approved) *</label>
                  <select
                    id="inst-select"
                    value={form.institution}
                    onChange={(e) => setForm({ ...form, institution: e.target.value })}
                    required
                  >
                    <option value="">-- Choose Institution by Name or AICTE Permanent ID --</option>
                    {institutions.map((inst) => (
                      <option key={inst._id} value={inst._id}>
                        {inst.name} ({inst.aicteId} · {inst.region} Region · {inst.address?.city}, {inst.address?.state})
                      </option>
                    ))}
                  </select>
                  {loadingInstitutions && <span className="field-hint">Loading technical institutions database...</span>}
                </div>

                {/* Section 2 */}
                <div className="form-section-head" style={{ marginTop: 24 }}>
                  <div className="step-num">2</div>
                  <div>
                    <h4>Complainant Affiliation & Details</h4>
                    <p>Tell us who you are (Student, Faculty Member, Parent, or Stakeholder)</p>
                  </div>
                </div>

                <div className="sp-field">
                  <label>I am lodging this grievance as: *</label>
                  <div className="stakeholder-radio-grid">
                    {STAKEHOLDER_TYPES.map((st) => (
                      <label
                        key={st.value}
                        className={`stakeholder-chip ${form.complainantType === st.value ? 'selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name="complainantType"
                          value={st.value}
                          checked={form.complainantType === st.value}
                          onChange={(e) => setForm({ ...form, complainantType: e.target.value })}
                        />
                        <span>{st.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="sp-grid-2">
                  <div className="sp-field">
                    <label>Full Name *</label>
                    <input
                      type="text"
                      placeholder={form.complainantType === 'Anonymous' ? 'Anonymous / Whistleblower' : 'Your full name'}
                      value={form.complainantName}
                      onChange={(e) => setForm({ ...form, complainantName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="sp-field">
                    <label>Email Address (For Case Updates) *</label>
                    <input
                      type="email"
                      placeholder="your.email@example.com"
                      value={form.complainantEmail}
                      onChange={(e) => setForm({ ...form, complainantEmail: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="sp-grid-2">
                  <div className="sp-field">
                    <label>Mobile / Contact Number</label>
                    <input
                      type="tel"
                      placeholder="+91 9876543210"
                      value={form.complainantPhone}
                      onChange={(e) => setForm({ ...form, complainantPhone: e.target.value })}
                    />
                  </div>
                  <div className="sp-field">
                    <label>
                      {form.complainantType === 'Student' && 'Student Roll / Enrollment No.'}
                      {form.complainantType === 'Faculty' && 'Faculty ID / Employee Code / Designation'}
                      {form.complainantType === 'Parent' && "Ward's Name & Semester"}
                      {form.complainantType === 'Staff' && 'Staff Designation / Department'}
                      {['Other Stakeholder', 'Anonymous'].includes(form.complainantType) && 'Organization / Reference (Optional)'}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Reference, Department, or ID"
                      value={form.stakeholderId}
                      onChange={(e) => setForm({ ...form, stakeholderId: e.target.value })}
                    />
                  </div>
                </div>

                {/* Section 3 */}
                <div className="form-section-head" style={{ marginTop: 24 }}>
                  <div className="step-num">3</div>
                  <div>
                    <h4>Grievance Information</h4>
                    <p>Categorize and specify the facts of the grievance</p>
                  </div>
                </div>

                <div className="sp-grid-2">
                  <div className="sp-field">
                    <label>Grievance Category *</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      required
                    >
                      <option value="">-- Select Grievance Category --</option>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sp-field">
                    <label>Urgency Level</label>
                    <select
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    >
                      <option value="Low">Low — General inquiry, suggestion, or non-urgent</option>
                      <option value="Medium">Medium — Standard grievance (Default)</option>
                      <option value="High">High — Urgent fee violation, salary denial, or admission issue</option>
                      <option value="Critical">Critical — Severe harassment, anti-ragging, or immediate safety</option>
                    </select>
                  </div>
                </div>

                <div className="sp-field">
                  <label>Detailed Grievance Description *</label>
                  <textarea
                    rows={5}
                    placeholder="Provide specific details: dates, departmental heads, excess fee amounts demanded, unpaid salary months, infrastructure lack, or relevant circulars. AICTE UGMS uses AI matching to connect related cases and trigger cross-bureau coordination."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    required
                  />
                  <span className="field-hint">
                    Minimum 20 characters. The CaseLink AI engine uses this description to identify overlapping submissions across AICTE cells.
                  </span>
                </div>

                <div className="form-submit-row">
                  <button type="submit" className="sp-submit-btn" disabled={submitting}>
                    {submitting ? 'Submitting to AICTE UGMS...' : 'Submit Grievance to AICTE →'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ═══════════ TAB 2: TRACK STATUS ═══════════ */}
        {activeTab === 'track' && (
          <div className="sp-card sp-track-card">
            <div className="track-search-bar">
              <label>Enter Official Grievance Case ID</label>
              <div className="track-input-group">
                <input
                  type="text"
                  placeholder="e.g. UGMS-2026-00053 or AICMS-2026-00001"
                  value={trackCaseId}
                  onChange={(e) => setTrackCaseId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && performTrack()}
                />
                <button
                  type="button"
                  className="track-search-btn"
                  onClick={() => performTrack()}
                  disabled={trackingLoading}
                >
                  {trackingLoading ? 'Locating...' : 'Track Grievance'}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {trackingError && (
              <div className="track-error-box">
                <p>⚠️ {trackingError}</p>
              </div>
            )}

            {/* Tracking Result View */}
            {trackingData && (
              <div className="track-result-panel animate-fade-in">
                <div className="track-header-row">
                  <div>
                    <span className="track-cid">{trackingData.caseId}</span>
                    <h3 className="track-inst-name">{trackingData.institution?.name}</h3>
                    <p className="track-inst-meta">
                      Permanent ID: {trackingData.institution?.aicteId} · Region: {trackingData.institution?.region} · {trackingData.institution?.city}, {trackingData.institution?.state}
                    </p>
                  </div>
                  <div className="track-status-box">
                    <StatusBadge status={trackingData.status} size="lg" />
                    <span className="track-priority-chip">Priority: {trackingData.priority}</span>
                  </div>
                </div>

                {/* Info Cards */}
                <div className="track-meta-grid">
                  <div className="tm-card">
                    <span className="tm-label">Complaint Category</span>
                    <span className="tm-val">{trackingData.category}</span>
                  </div>
                  <div className="tm-card">
                    <span className="tm-label">Assigned Cell</span>
                    <span className="tm-val">{trackingData.assignedBureau?.fullName || trackingData.assignedBureau?.name || 'PGRC'}</span>
                  </div>
                  <div className="tm-card">
                    <span className="tm-label">Receipt Date</span>
                    <span className="tm-val">
                      {trackingData.receivedDate ? format(new Date(trackingData.receivedDate), 'dd MMM yyyy') : '—'}
                    </span>
                  </div>
                  <div className="tm-card">
                    <span className="tm-label">Prescribed SLA Target</span>
                    <span className="tm-val">
                      {trackingData.expectedDisposalDate ? format(new Date(trackingData.expectedDisposalDate), 'dd MMM yyyy') : '—'}
                    </span>
                  </div>
                </div>

                {/* Progress Visual Tracker */}
                <div className="track-timeline-section">
                  <h4>Redressal Action & Status Movement</h4>
                  <div className="track-stepper">
                    {(trackingData.timeline || []).map((step, idx) => (
                      <div className="track-step-item" key={idx}>
                        <div className="step-marker" />
                        <div className="step-content">
                          <div className="step-top">
                            <span className="step-title">{step.actionType || 'Action Taken'}</span>
                            <span className="step-time">
                              {step.actionDate ? format(new Date(step.actionDate), 'dd MMM yyyy, hh:mm a') : ''}
                            </span>
                          </div>
                          <p className="step-desc">{step.remarks || 'Status updated by concerned bureau'}</p>
                          {step.toStatus && (
                            <span className="step-status-chip">Current Status: {step.toStatus}</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {(trackingData.timeline || []).length === 0 && (
                      <p className="no-timeline">Grievance under initial cell scrutiny.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── 6 Core Pillars Footer ── */}
      <footer className="sp-pillars-footer">
        <div className="pillars-container">
          <p className="pillars-head">AICTE UGMS — 6 Core Pillars of Grievance Intelligence</p>
          <div className="pillars-grid">
            <div className="pillar-item">🧠 <strong>Smart Intelligence:</strong> TF-IDF NLP similarity detection</div>
            <div className="pillar-item">🚨 <strong>Risk Detection:</strong> Automated SLA and priority monitors</div>
            <div className="pillar-item">🔗 <strong>Cross-Bureau Sync:</strong> PGRC, RB, and AB unified tracking</div>
            <div className="pillar-item">⏳ <strong>SLA Escalation:</strong> Automated alerts for time-sensitive cases</div>
            <div className="pillar-item">🔍 <strong>Transparency:</strong> End-to-end audit trails for accountability</div>
            <div className="pillar-item">📊 <strong>Institution Insights:</strong> Centralized compliance profile</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function AicteSealIcon() {
  return (
    <svg viewBox="0 0 36 36" fill="none" width="40" height="40">
      <circle cx="18" cy="18" r="16" stroke="white" strokeWidth="2" fill="none" />
      <path d="M18 7L13 22H16.5L18 17.5L19.5 22H23L18 7Z" fill="white" />
      <path d="M13 19H23" stroke="white" strokeWidth="1.2" />
      <circle cx="18" cy="18" r="11" stroke="rgba(255,255,255,0.4)" strokeDasharray="2 2" fill="none" />
    </svg>
  );
}

function CheckmarkIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" width="48" height="48">
      <circle cx="24" cy="24" r="22" fill="#d1fae5" stroke="#10b981" strokeWidth="2" />
      <path d="M16 24l6 6 12-12" stroke="#059669" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
