import React from 'react';
import { useNavigate } from 'react-router-dom';
import PortalSidebar from './PortalSidebar';
import { useAuth } from '../context/AuthContext';
import { cleanPublicLabel } from '../utils/homepageDisplay';

export default function VendorSidebar() {
  const navigate = useNavigate();
  const { user, logoutUser } = useAuth();
  const vendorName = cleanPublicLabel(user?.vendor_profile?.business_name || user?.full_name || '') || user?.username || 'Local Vendor';

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login');
  };

  const navItems = [
    { label: '▦ Dashboard', path: '/vendor/dashboard' },
    { label: '🍽️ My Listings', path: '/vendor/listings' },
    { label: '📅 Availability Slots', path: '/vendor/availability' },
    { label: '✉️ Booking Requests', path: '/vendor/bookings' },
    { label: '👤 Profile', path: '/profile' },
  ];

  return <PortalSidebar icon="🏪" title={vendorName} status="Approved Vendor" statusTone="approved" items={navItems} onLogout={handleLogout} />;
}
