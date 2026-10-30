import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import useAuthStore from '../../store/authStore';
import { initSocket, disconnectSocket } from '../../services/socket';
import toast from 'react-hot-toast';
import './Layout.css';

const Layout = () => {
  const { token } = useAuthStore();

  useEffect(() => {
    if (token) {
      const socket = initSocket(token);
      socket.emit('join_admin');

      socket.on('overlap_detected', (data) => {
        toast.custom(
          (t) => (
            <div className={`overlap-toast ${t.visible ? 'visible' : ''}`}>
              <span className="overlap-toast-icon">⚠️</span>
              <div>
                <strong>Overlapping Cases Detected</strong>
                <p>
                  Case {data.complaint} for <em>{data.institution}</em> overlaps with{' '}
                  {data.overlappingWith.join(', ')}
                </p>
              </div>
            </div>
          ),
          { duration: 8000 }
        );
      });

      socket.on('complaint_updated', (data) => {
        toast.success(`Case ${data.caseId} status updated to ${data.status}`, { duration: 3000 });
      });
    }

    return () => disconnectSocket();
  }, [token]);

  return (
    <div className="layout">
      <Sidebar />
      <div className="layout-main">
        <Header />
        <main className="layout-content">
          <div className="content-wrapper animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;

