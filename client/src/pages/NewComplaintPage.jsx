import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import './NewComplaintPage.css';

const CATEGORIES = ['Fee Regulation', 'Faculty Issues', 'Infrastructure', 'Affiliation', 'Admission Malpractice', 'Anti-Ragging', 'Sexual Harassment', 'Irregular Conduct', 'Refund Issues', 'Academic Grievance', 'Administrative Misconduct', 'Other'];
const COMPLAINANT_TYPES = ['Student', 'Faculty', 'Parent', 'Staff', 'Other Stakeholder', 'Anonymous'];
const SOURCES = ['Online Portal', 'Email', 'Physical', 'Ministry Referred', 'Court Order', 'RTI', 'Other'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

export default function NewComplaintPage() {
  const navigate = useNavigate();
  const [institutions, setInstitutions] = useState([]);
  const [bureaus, setBureaus] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    institution: '', complainantName: '', complainantEmail: '',
    complainantPhone: '', complainantType: 'Student', category: '',
    subCategory: '', description: '', status: 'Pending',
    priority: 'Medium', assignedBureau: '', assignedOfficer: '',
    source: 'Online Portal', nextAction: '',
  });

  useEffect(() => {
    const fetch = async () => {
      const [instRes, bureauRes, userRes] = await Promise.all([
        api.get('/institutions?limit=200'),
        api.get('/bureaus'),
        api.get('/users'),
      ]);
      setInstitutions(instRes.data.data || []);
      setBureaus(bureauRes.data.data || []);
      setOfficers((userRes.data.data || []).filter((u) => ['rb_officer', 'pgrc_officer', 'bureau_officer'].includes(u.role)));
    };
    fetch().catch(() => toast.error('Failed to load form data'));
  }, []);

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.institution || !form.complainantName || !form.category || !form.description) {
      toast.error('Please fill all required fields');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post('/complaints', form);
      toast.success(`Complaint ${data.data.caseId} registered successfully!`);
      navigate(`/complaints/${data.data._id}`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to register complaint');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="new-complaint-page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Register New Complaint</h2>
          <p className="page-subtitle">Fill in all required fields to register a complaint/case</p>
        </div>
      </div>

      {/* Steps */}
      <div className="steps-indicator">
        {['Complainant Details', 'Complaint Info', 'Assignment'].map((s, i) => (
          <div key={i} className={`step-item ${step === i + 1 ? 'active' : step > i + 1 ? 'done' : ''}`}>
            <div className="step-circle">{step > i + 1 ? '✓' : i + 1}</div>
            <span>{s}</span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="complaint-form">
        {step === 1 && (
          <div className="form-card">
            <h3>Complainant Details</h3>
            <div className="form-grid">
              <div className="form-group required">
                <label>Institution *</label>
                <select value={form.institution} onChange={(e) => setF('institution', e.target.value)} required>
                  <option value="">Select Institution</option>
                  {institutions.map((i) => (
                    <option key={i._id} value={i._id}>{i.name} ({i.aicteId})</option>
                  ))}
                </select>
              </div>
              <div className="form-group required">
                <label>Complainant Name *</label>
                <input type="text" value={form.complainantName} onChange={(e) => setF('complainantName', e.target.value)} placeholder="Full name" required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={form.complainantEmail} onChange={(e) => setF('complainantEmail', e.target.value)} placeholder="email@example.com" />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input type="tel" value={form.complainantPhone} onChange={(e) => setF('complainantPhone', e.target.value)} placeholder="+91 XXXXX XXXXX" />
              </div>
              <div className="form-group">
                <label>Complainant Type *</label>
                <select value={form.complainantType} onChange={(e) => setF('complainantType', e.target.value)}>
                  {COMPLAINANT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Source</label>
                <select value={form.source} onChange={(e) => setF('source', e.target.value)}>
                  {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="form-nav">
              <button type="button" className="btn-primary" onClick={() => setStep(2)}>Next →</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="form-card">
            <h3>Complaint Information</h3>
            <div className="form-grid">
              <div className="form-group required">
                <label>Category *</label>
                <select value={form.category} onChange={(e) => setF('category', e.target.value)} required>
                  <option value="">Select Category</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Sub-Category</label>
                <input type="text" value={form.subCategory} onChange={(e) => setF('subCategory', e.target.value)} placeholder="Optional sub-category" />
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select value={form.priority} onChange={(e) => setF('priority', e.target.value)}>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group full-width required">
              <label>Description *</label>
              <textarea
                value={form.description}
                onChange={(e) => setF('description', e.target.value)}
                rows={6}
                placeholder="Provide a detailed description of the complaint..."
                required
              />
              <span className="char-count">{form.description.length} characters</span>
            </div>
            <div className="form-nav">
              <button type="button" className="btn-ghost" onClick={() => setStep(1)}>← Back</button>
              <button type="button" className="btn-primary" onClick={() => setStep(3)}>Next →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="form-card">
            <h3>Assignment & Filing</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Assign to Bureau/Cell</label>
                <select value={form.assignedBureau} onChange={(e) => setF('assignedBureau', e.target.value)}>
                  <option value="">Select Bureau</option>
                  {bureaus.map((b) => <option key={b._id} value={b._id}>{b.name} ({b.code})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Assign to Officer</label>
                <select value={form.assignedOfficer} onChange={(e) => setF('assignedOfficer', e.target.value)}>
                  <option value="">Select Officer</option>
                  {officers.map((u) => <option key={u._id} value={u._id}>{u.name} ({u.designation || u.role})</option>)}
                </select>
              </div>
              <div className="form-group full-width">
                <label>Next Action Required</label>
                <input type="text" value={form.nextAction} onChange={(e) => setF('nextAction', e.target.value)} placeholder="Describe the next action needed..." />
              </div>
            </div>

            {/* Summary */}
            <div className="form-summary">
              <h4>Summary</h4>
              <div className="summary-grid">
                <div><span>Institution:</span> {institutions.find((i) => i._id === form.institution)?.name || '—'}</div>
                <div><span>Complainant:</span> {form.complainantName || '—'}</div>
                <div><span>Category:</span> {form.category || '—'}</div>
                <div><span>Priority:</span> {form.priority}</div>
                <div><span>Bureau:</span> {bureaus.find((b) => b._id === form.assignedBureau)?.name || 'Unassigned'}</div>
                <div><span>Source:</span> {form.source}</div>
              </div>
            </div>

            <div className="form-nav">
              <button type="button" className="btn-ghost" onClick={() => setStep(2)}>← Back</button>
              <button type="submit" className="btn-primary btn-submit" disabled={submitting}>
                {submitting ? 'Registering...' : 'Register Complaint'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

