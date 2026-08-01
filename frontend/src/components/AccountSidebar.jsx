import React from 'react';
import { useNavigate } from 'react-router-dom';
import PortalSidebar from './PortalSidebar';
import { useAuth } from '../context/AuthContext';

export default function AccountSidebar() {
  const navigate = useNavigate();
  const { logoutUser } = useAuth();

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login');
  };

  const navItems = [
    { label: '📅 My Bookings', path: '/tourist/bookings' },
    { label: '🗺️ My Itinerary', path: '/tourist/itinerary' },
    { label: '👤 Profile', path: '/profile' },
  ];

  return <PortalSidebar icon="🧭" title="Tourist Portal" status="Active Tourist" statusTone="active" items={navItems} onLogout={handleLogout} />;
}
