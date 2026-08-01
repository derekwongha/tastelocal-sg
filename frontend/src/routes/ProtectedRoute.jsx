import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, loading, role, approvalStatus } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100 bg-dark text-white">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Pending Vendor restriction flow
  if (role === 'Vendor' && approvalStatus === 'Pending') {
    if (location.pathname !== '/pending-vendor') {
      return <Navigate to="/pending-vendor" replace />;
    }
  }

  // Rejected Vendor restriction flow
  if (role === 'Vendor' && approvalStatus === 'Rejected') {
    if (location.pathname !== '/pending-vendor') {
      return <Navigate to="/pending-vendor" replace />;
    }
  }

  // Check roles
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
