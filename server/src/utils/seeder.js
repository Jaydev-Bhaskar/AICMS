/**
 * Database Seeder for AICMS
 * Run from server/ directory: node src/utils/seeder.js
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Bureau = require('../models/Bureau');
const Institution = require('../models/Institution');
const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/aicms';

const bureauData = [
  { code: 'RB', name: 'Regulation Bureau', fullName: 'AICTE Regulation Bureau', sladays: 30, description: 'Handles regulatory compliance and institution approvals.' },
  { code: 'PGRC', name: 'Public Grievance Redressal Cell', fullName: 'Public Grievance Redressal Cell', sladays: 21, description: 'Handles public grievances from students, faculty, and stakeholders.' },
  { code: 'AB', name: 'Approval Bureau', fullName: 'AICTE Approval Bureau', sladays: 45, description: 'Manages new institution approvals and extensions.' },
  { code: 'RO_NORTH', name: 'Regional Office (North)', fullName: 'Northern Regional Office - Delhi', sladays: 30 },
  { code: 'RO_SOUTH', name: 'Regional Office (South)', fullName: 'Southern Regional Office - Chennai', sladays: 30 },
];

const institutionData = [
  { aicteId: 'AICTE-DL-001', name: 'Delhi Institute of Technology', type: 'Engineering', region: 'Northern', address: { city: 'New Delhi', state: 'Delhi', pincode: '110001' }, approvalStatus: 'Approved' },
  { aicteId: 'AICTE-MH-002', name: 'Mumbai Institute of Management', type: 'Management', region: 'Western', address: { city: 'Mumbai', state: 'Maharashtra', pincode: '400001' }, approvalStatus: 'Approved' },
  { aicteId: 'AICTE-KA-003', name: 'Bangalore College of Engineering', type: 'Engineering', region: 'Southern', address: { city: 'Bangalore', state: 'Karnataka', pincode: '560001' }, approvalStatus: 'Conditionally Approved' },
  { aicteId: 'AICTE-TN-004', name: 'Chennai School of Architecture', type: 'Architecture', region: 'Southern', address: { city: 'Chennai', state: 'Tamil Nadu', pincode: '600001' }, approvalStatus: 'Approved' },
  { aicteId: 'AICTE-WB-005', name: 'Kolkata Technical University', type: 'Engineering', region: 'Eastern', address: { city: 'Kolkata', state: 'West Bengal', pincode: '700001' }, approvalStatus: 'Approved' },
  { aicteId: 'AICTE-RJ-006', name: 'Jaipur College of Pharmacy', type: 'Pharmacy', region: 'Northern', address: { city: 'Jaipur', state: 'Rajasthan', pincode: '302001' }, approvalStatus: 'Under Review' },
  { aicteId: 'AICTE-MP-007', name: 'Bhopal Institute of Technology', type: 'Engineering', region: 'Central', address: { city: 'Bhopal', state: 'Madhya Pradesh', pincode: '462001' }, approvalStatus: 'Approved' },
  { aicteId: 'AICTE-GJ-008', name: 'Ahmedabad Management Institute', type: 'Management', region: 'Western', address: { city: 'Ahmedabad', state: 'Gujarat', pincode: '380001' }, approvalStatus: 'Approved' },
];

const categories = ['Fee Regulation', 'Faculty Issues', 'Infrastructure', 'Admission Malpractice', 'Anti-Ragging', 'Refund Issues', 'Academic Grievance', 'Administrative Misconduct'];
const statuses = ['Pending', 'Under Process', 'Transferred', 'Escalated', 'Disposed', 'Closed'];
const priorities = ['Low', 'Medium', 'High', 'Critical'];
const sources = ['Online Portal', 'Email', 'Physical', 'Ministry Referred'];

const seed = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Clear existing data
  await Promise.all([
    User.deleteMany({}),
    Bureau.deleteMany({}),
    Institution.deleteMany({}),
    Complaint.deleteMany({}),
    Notification.deleteMany({}),
  ]);
  console.log('🗑️  Cleared existing data');

  // Create bureaus
  const bureaus = await Bureau.insertMany(bureauData);
  console.log(`✅ Created ${bureaus.length} bureaus`);
  const rbBureau = bureaus.find((b) => b.code === 'RB');
  const pgrcBureau = bureaus.find((b) => b.code === 'PGRC');

  // Create users
  const password = await bcrypt.hash('Admin@123', 12);
  const users = await User.insertMany([
    { name: 'Super Admin', email: 'superadmin@aicte.edu.in', password, role: 'superadmin', designation: 'Super Administrator' },
    { name: 'Rajesh Kumar', email: 'admin@aicte.edu.in', password, role: 'admin', designation: 'System Administrator' },
    { name: 'Priya Sharma', email: 'rb.officer@aicte.edu.in', password, role: 'rb_officer', bureau: rbBureau._id, designation: 'Senior Officer - RB', region: 'Northern' },
    { name: 'Amit Singh', email: 'pgrc.officer@aicte.edu.in', password, role: 'pgrc_officer', bureau: pgrcBureau._id, designation: 'Grievance Officer - PGRC' },
    { name: 'Sunita Patel', email: 'regional@aicte.edu.in', password, role: 'regional_officer', designation: 'Regional Officer', region: 'Western' },
    { name: 'Viewer User', email: 'viewer@aicte.edu.in', password, role: 'viewer', designation: 'Data Analyst' },
  ]);
  console.log(`✅ Created ${users.length} users`);

  // Update bureau heads
  await Bureau.findByIdAndUpdate(rbBureau._id, { head: users[2]._id });
  await Bureau.findByIdAndUpdate(pgrcBureau._id, { head: users[3]._id });

  // Create institutions
  const institutions = await Institution.insertMany(institutionData);
  console.log(`✅ Created ${institutions.length} institutions`);

  // Create complaints with realistic data
  const complaintDescriptions = [
    'Students are being charged fees beyond the approved fee structure without any justification.',
    'Several faculty members have not received their salaries for the past three months.',
    'The laboratory infrastructure is inadequate and safety norms are being violated.',
    'Admission process was manipulated and students with lower ranks were given preference.',
    'Ragging incidents reported on campus. College authorities not taking appropriate action.',
    'Refund of fees not processed despite student withdrawal within stipulated time.',
    'Examination results are being withheld arbitrarily affecting student career prospects.',
    'Principal is involved in financial irregularities in hostel fee collection.',
    'Institution operating courses beyond approved intake capacity.',
    'Placement office is demanding money from students for campus placements.',
  ];

  const complaints = [];
  let caseCounter = 1;
  const year = new Date().getFullYear();

  for (let i = 0; i < 50; i++) {
    const inst = institutions[i % institutions.length];
    const bureau = i % 3 === 0 ? pgrcBureau : rbBureau;
    const officer = i % 3 === 0 ? users[3] : users[2];
    const status = statuses[i % statuses.length];
    const receivedDate = new Date();
    receivedDate.setDate(receivedDate.getDate() - Math.floor(Math.random() * 120));
    const slaDays = 30;
    const expectedDisposalDate = new Date(receivedDate);
    expectedDisposalDate.setDate(expectedDisposalDate.getDate() + slaDays);
    const slaBreached = !['Disposed', 'Closed'].includes(status) && new Date() > expectedDisposalDate;

    complaints.push({
      caseId: `AICMS-${year}-${String(caseCounter++).padStart(5, '0')}`,
      institution: inst._id,
      complainantName: `Complainant ${i + 1}`,
      complainantEmail: `complainant${i + 1}@example.com`,
      complainantType: ['Student', 'Faculty', 'Parent', 'Other Stakeholder'][i % 4],
      category: categories[i % categories.length],
      description: complaintDescriptions[i % complaintDescriptions.length],
      status,
      priority: priorities[i % priorities.length],
      assignedBureau: bureau._id,
      assignedOfficer: officer._id,
      receivedDate,
      expectedDisposalDate,
      slaBreached,
      slaDays,
      region: inst.region,
      source: sources[i % sources.length],
      actionHistory: [
        {
          actionBy: users[1]._id,
          bureau: bureau._id,
          actionType: 'Created',
          toStatus: 'Pending',
          remarks: 'Complaint registered',
          actionDate: receivedDate,
        },
      ],
    });
  }

  // Add some intentional overlaps (same institution, different bureaus)
  complaints.push({
    caseId: `AICMS-${year}-${String(caseCounter++).padStart(5, '0')}`,
    institution: institutions[0]._id,
    complainantName: 'Student Overlap Case A',
    complainantEmail: 'overlap_a@example.com',
    complainantType: 'Student',
    category: 'Fee Regulation',
    description: 'Excess fees being charged from students. Urgent action required.',
    status: 'Under Process',
    priority: 'High',
    assignedBureau: rbBureau._id,
    assignedOfficer: users[2]._id,
    receivedDate: new Date(Date.now() - 5 * 86400000),
    region: institutions[0].region,
    source: 'Online Portal',
    actionHistory: [{ actionBy: users[1]._id, bureau: rbBureau._id, actionType: 'Created', toStatus: 'Pending', remarks: 'Received via portal', actionDate: new Date(Date.now() - 5 * 86400000) }],
  });

  complaints.push({
    caseId: `AICMS-${year}-${String(caseCounter++).padStart(5, '0')}`,
    institution: institutions[0]._id,
    complainantName: 'Parent Overlap Case B',
    complainantEmail: 'overlap_b@example.com',
    complainantType: 'Parent',
    category: 'Fee Regulation',
    description: 'Institution charging excess fees from students without approval. Need immediate intervention.',
    status: 'Pending',
    priority: 'High',
    assignedBureau: pgrcBureau._id,
    assignedOfficer: users[3]._id,
    receivedDate: new Date(Date.now() - 3 * 86400000),
    region: institutions[0].region,
    source: 'Email',
    actionHistory: [{ actionBy: users[1]._id, bureau: pgrcBureau._id, actionType: 'Created', toStatus: 'Pending', remarks: 'Received via email', actionDate: new Date(Date.now() - 3 * 86400000) }],
  });

  const savedComplaints = await Complaint.insertMany(complaints);
  console.log(`✅ Created ${savedComplaints.length} complaints`);

  // Add rich overlap flags & CaseLink AI relationships for the cross-bureau overlap cases
  const overlapA = savedComplaints[savedComplaints.length - 2];
  const overlapB = savedComplaints[savedComplaints.length - 1];
  
  await Complaint.findByIdAndUpdate(overlapA._id, {
    overlapFlags: [overlapB._id],
    overlapRelationships: [{
      relatedComplaint: overlapB._id,
      relationshipType: 'RELATED',
      score: 0.78,
      evidence: [
        'Description similarity: 82%',
        'Same complaint category (Fee Regulation)',
        'Handled by different Bureaus/Cells (RB vs PGRC)',
        'Received within 2 day(s) of each other',
      ],
      reviewStatus: 'PENDING',
    }],
  });

  await Complaint.findByIdAndUpdate(overlapB._id, {
    overlapFlags: [overlapA._id],
    overlapRelationships: [{
      relatedComplaint: overlapA._id,
      relationshipType: 'RELATED',
      score: 0.78,
      evidence: [
        'Description similarity: 82%',
        'Same complaint category (Fee Regulation)',
        'Handled by different Bureaus/Cells (PGRC vs RB)',
        'Received within 2 day(s) of each other',
      ],
      reviewStatus: 'PENDING',
    }],
  });

  // Update institution complaint counts
  for (const inst of institutions) {
    const total = await Complaint.countDocuments({ institution: inst._id });
    const pending = await Complaint.countDocuments({ institution: inst._id, status: { $in: ['Pending', 'Under Process'] } });
    await Institution.findByIdAndUpdate(inst._id, { totalComplaints: total, pendingComplaints: pending });
  }

  // Create sample notifications
  await Notification.insertMany([
    { title: 'Overlapping Cases Detected', message: `Potential overlapping cases for ${institutions[0].name} - RB and PGRC both handling fee regulation complaints.`, type: 'overlap_alert', severity: 'warning', institution: institutions[0]._id },
    { title: 'SLA Breach Alert', message: '5 cases have exceeded their prescribed disposal timelines.', type: 'sla_breach', severity: 'critical' },
    { title: 'Pending Case Reminder', message: '12 cases have been pending for more than 15 days.', type: 'pending_reminder', severity: 'warning' },
  ]);

  console.log('✅ Created sample notifications');
  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📋 Default Login Credentials:');
  console.log('   SuperAdmin: superadmin@aicte.edu.in / Admin@123');
  console.log('   Admin:      admin@aicte.edu.in / Admin@123');
  console.log('   RB Officer: rb.officer@aicte.edu.in / Admin@123');
  console.log('   PGRC Off.:  pgrc.officer@aicte.edu.in / Admin@123');
  console.log('   Regional:   regional@aicte.edu.in / Admin@123');
  console.log('   Viewer:     viewer@aicte.edu.in / Admin@123\n');

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error('❌ Seeder error:', err);
  process.exit(1);
});

