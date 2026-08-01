import React from 'react';
import { useNavigate } from 'react-router-dom';
import PortalSidebar from './PortalSidebar';
import { useAuth } from '../context/AuthContext';

export default function AdminSidebar() {
  const navigate = useNavigate();
  const { logoutUser } = useAuth();

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login');
  };

  const navItems = [
    { label: '▦ Dashboard', path: '/admin/dashboard' },
    { label: '🏪 Vendor Applications', path: '/admin/vendors' },
    { label: '◇ Category Management', path: '/admin/categories' },
    { label: '⚑ Listings & Reviews', path: '/admin/moderation' },
    { label: '👤 Profile', path: '/profile' },
  ];

  return <PortalSidebar icon="🛡️" title="Platform Admin" status="Administrator" statusTone="neutral" items={navItems} onLogout={handleLogout} />;
}
