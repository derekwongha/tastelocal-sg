import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Breadcrumb from '../components/Breadcrumb';
import { cleanPublicLabel } from '../utils/homepageDisplay';

const PendingVendor = () => {
  const { user, role, approvalStatus, logoutUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login');
  };

  const isPending  = approvalStatus === 'Pending';
  const isRejected = approvalStatus === 'Rejected';
  const displayFullName = cleanPublicLabel(user?.full_name || '');
  const displayBusinessName = cleanPublicLabel(user?.vendor_profile?.business_name || '');
  const displayBusinessAddress = cleanPublicLabel(user?.vendor_profile?.business_address || '');

  if (role === 'Administrator') return <Navigate to="/admin/vendors" replace />;
  if (role === 'Tourist') return <Navigate to="/profile" replace />;
  if (role === 'Vendor' && !isPending && !isRejected) return <Navigate to="/vendor/dashboard" replace />;
  if (role !== 'Vendor') return <Navigate to="/" replace />;

  return (
    <div className="sg-content-shell">
      {/* Top Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Vendor Registration', path: '/register/vendor' },
        { label: 'Pending Approval', path: '/pending-vendor' }
      ]} />

      <div className="row g-4">
        {/* Left Column: Application Status details */}
        <div className="col-lg-7">
          <div className="sg-form-card text-center text-lg-start">
            <div className="mb-4">
              <span className="sg-eyebrow">Application Status</span>
              <h1 className="sg-page-title">Vendor Application Pending</h1>
              <p className="text-muted small">Thank you for registering with TasteLocal SG. Your application is currently under review.</p>
            </div>

            {isPending && (
              <div className="p-4 rounded border border-warning bg-light-cream mb-4 text-start">
                <div className="d-flex align-items-center gap-3 mb-3">
                  <span className="fs-1">⏳</span>
                  <div>
                    <h5 className="fw-bold text-dark mb-0">PENDING REVIEW</h5>
                    <span className="small text-muted">Submitted successfully</span>
                  </div>
                </div>
                <p className="small text-dark mb-0">
                  Hello, <strong>{displayFullName}</strong>. Your vendor application for{' '}
                  <strong>{displayBusinessName}</strong> is currently pending review by our platform administrators.
                </p>
              </div>
            )}

            {isRejected && (
              <div className="p-4 rounded border border-danger bg-light-cream mb-4 text-start">
                <div className="d-flex align-items-center gap-3 mb-3">
                  <span className="fs-1">❌</span>
                  <div>
                    <h5 className="fw-bold text-danger mb-0">APPLICATION DECLINED</h5>
                    <span className="small text-muted font-monospace">Declined by Admin</span>
                  </div>
                </div>
                <p className="small text-dark mb-0">
                  Hello, <strong>{displayFullName}</strong>. Unfortunately your vendor application for{' '}
                  <strong>{displayBusinessName}</strong> was declined. Please contact support.
                </p>
              </div>
            )}

            <div className="border-top pt-4">
              <h6 className="fw-bold text-dark mb-3">Submitted Information</h6>
              <ul className="list-unstyled space-y-2 small text-muted">
                <li className="mb-2"><strong>Full Name:</strong> {displayFullName}</li>
                <li className="mb-2"><strong>Business Name:</strong> {displayBusinessName}</li>
                <li className="mb-2"><strong>Email Address:</strong> {user?.email}</li>
                <li className="mb-2"><strong>Phone Number:</strong> {user?.vendor_profile?.contact_number}</li>
                <li className="mb-2"><strong>Business Address:</strong> {displayBusinessAddress}</li>
              </ul>
            </div>

            <button onClick={handleLogout} className="btn btn-outline-danger mt-4 px-4 py-2 fw-semibold">
              🚪 Sign Out from TasteLocal SG
            </button>
          </div>
        </div>

        {/* Right Column: What happens next checklist steps */}
        <div className="col-lg-5">
          <div className="sg-info-panel sg-info-panel--warm p-4 p-md-5 mb-4">
            <h4 className="fw-bold text-dark mb-4">What happens next?</h4>
            
            <ol className="list-unstyled space-y-4">
              <li className="d-flex gap-3 mb-4">
                <span className="badge bg-danger text-white rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: '30px', height: '30px', flexShrink: 0 }}>1</span>
                <div>
                  <h6 className="fw-bold text-dark mb-1">Review by Administrator</h6>
                  <p className="small text-muted mb-0">Our administrator will review your application and business details for authenticity.</p>
                </div>
              </li>
              <li className="d-flex gap-3 mb-4">
                <span className="badge bg-danger text-white rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: '30px', height: '30px', flexShrink: 0 }}>2</span>
                <div>
                  <h6 className="fw-bold text-dark mb-1">Approval or Rejection</h6>
                  <p className="small text-muted mb-0">You will be notified via email about the platform administration's decision.</p>
                </div>
              </li>
              <li className="d-flex gap-3 mb-4">
                <span className="badge bg-danger text-white rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: '30px', height: '30px', flexShrink: 0 }}>3</span>
                <div>
                  <h6 className="fw-bold text-dark mb-1">Start Listing</h6>
                  <p className="small text-muted mb-0">Once approved, you can log in to start creating your local food experiences and managing availability slots.</p>
                </div>
              </li>
            </ol>

            <div className="sg-info-panel mt-4">
              <h6 className="fw-bold text-dark mb-2">Need Help?</h6>
              <p className="small text-muted mb-3">If you have any questions, feel free to contact our support team.</p>
              <a href="mailto:support@tastelocal.sg" className="btn btn-sm btn-outline-dark px-3 py-2 fw-semibold">
                ✉️ Contact Support
              </a>
            </div>
            <div className="sg-alert-panel sg-alert-panel--warning mt-4">
              <span className="sg-alert-panel__icon" aria-hidden="true">!</span>
              <div><strong className="d-block">Important note</strong>Keep your submitted contact information current so support can reach you about the decision.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingVendor;
