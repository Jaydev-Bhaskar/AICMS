import React from 'react';
import './StatusBadge.css';

const STATUS_CONFIG = {
  'Pending': { className: 'badge-pending', label: 'Pending' },
  'Under Process': { className: 'badge-inprogress', label: 'In Progress' },
  'Transferred': { className: 'badge-transferred', label: 'Transferred' },
  'Escalated': { className: 'badge-escalated', label: 'Escalated' },
  'Disposed': { className: 'badge-disposed', label: 'Disposed' },
  'Closed': { className: 'badge-closed', label: 'Closed' },
  'Rejected': { className: 'badge-rejected', label: 'Rejected' },
  // Priority
  'Low': { className: 'badge-low', label: 'Low' },
  'Medium': { className: 'badge-medium', label: 'Medium' },
  'High': { className: 'badge-high', label: 'High' },
  'Critical': { className: 'badge-critical', label: 'Critical' },
};

function StatusBadge({ status, size = 'sm' }) {
  const config = STATUS_CONFIG[status] || { className: 'badge-default', label: status };
  return (
    <span className={`status-badge ${config.className} size-${size}`}>
      {config.label}
    </span>
  );
}

export default StatusBadge;

