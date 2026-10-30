import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';

import Layout from './components/Layout/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ComplaintsPage from './pages/ComplaintsPage';
import ComplaintDetailPage from './pages/ComplaintDetailPage';
import NewComplaintPage from './pages/NewComplaintPage';
import InstitutionsPage from './pages/InstitutionsPage';
import InstitutionDetailPage from './pages/InstitutionDetailPage';
import ReportsPage from './pages/ReportsPage';
import OverlapAlertsPage from './pages/OverlapAlertsPage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';
import StudentGrievancePage from './pages/StudentGrievancePage';

const ProtectedRoute = ({ children }) => {
  const { token } = useAuthStore();
  return token ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { token } = useAuthStore();
  return token ? <Navigate to="/" replace /> : children;
};

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            fontFamily: 'Inter, sans-serif',
            fontSize: '13px',
            borderRadius: '10px',
            boxShadow: '0 4px 16px rgba(26,63,166,0.15)',
          },
        }}
      />
      <Routes>
        {/* Public Student & Citizen Grievance Portal */}
        <Route path="/lodge-complaint" element={<StudentGrievancePage />} />
        <Route path="/track-complaint" element={<StudentGrievancePage />} />
        <Route path="/student-portal" element={<StudentGrievancePage />} />

        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="complaints" element={<ComplaintsPage />} />
          <Route path="complaints/new" element={<NewComplaintPage />} />
          <Route path="complaints/:id" element={<ComplaintDetailPage />} />
          <Route path="institutions" element={<InstitutionsPage />} />
          <Route path="institutions/:id" element={<InstitutionDetailPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="overlap-alerts" element={<OverlapAlertsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="settings" element={<SettingsPage />} />
          {/* Live Monitoring — redirects to dashboard for now */}
          <Route path="live" element={<DashboardPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

