import React from 'react';
import { useAuth } from '../context/AuthContext';
import { cleanPublicLabel } from '../utils/homepageDisplay';

const Profile = () => {
  const { user, role } = useAuth();

  const roleBadge = { Tourist: '🧳 Tourist', Vendor: '🍽️ Vendor', Administrator: '⚙️ Administrator' }[role] || role;
  const roleBadgeClass = { Tourist: 'bg-warning text-dark', Vendor: 'bg-success', Administrator: 'bg-danger' }[role] || 'bg-secondary';

  return (
    <div className="container sg-page">
      <div className="row justify-content-center">
        <div className="col-lg-6 col-md-8">
          <div className="glass-card fade-in-up text-center">
            {/* Avatar */}
            <div
              className="mx-auto mb-4 d-flex align-items-center justify-content-center"
              style={{
                width: 80, height: 80, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--sg-red-light), var(--sg-gold-light))',
                fontSize: '2rem', border: '3px solid var(--sg-card-border)'
              }}
            >
              👤
            </div>

            <span className={`badge ${roleBadgeClass} mb-2`} style={{ fontSize: '0.8rem', padding: '0.4em 0.85em' }}>
              {roleBadge}
            </span>
            <h2 className="fw-bold mt-1 mb-0">{cleanPublicLabel(user?.full_name || user?.username || '')}</h2>
            <p className="text-muted small mt-1 mb-4">@{user?.username}</p>

            <div className="text-start" style={{ borderTop: '1px solid var(--sg-card-border)', paddingTop: '1.25rem' }}>
              <div className="row g-3">
                <div className="col-12">
                  <div className="d-flex justify-content-between py-2 border-bottom" style={{ borderColor: 'var(--sg-card-border) !important' }}>
                    <span className="text-muted small fw-semibold">Username</span>
                    <span className="fw-semibold" style={{ color: 'var(--sg-charcoal)' }}>{user?.username}</span>
                  </div>
                </div>
                <div className="col-12">
                  <div className="d-flex justify-content-between py-2 border-bottom">
                    <span className="text-muted small fw-semibold">Email</span>
                    <span className="fw-semibold" style={{ color: 'var(--sg-charcoal)' }}>{user?.email || '—'}</span>
                  </div>
                </div>
                <div className="col-12">
                  <div className="d-flex justify-content-between py-2">
                    <span className="text-muted small fw-semibold">Account Role</span>
                    <span className="fw-semibold" style={{ color: 'var(--sg-charcoal)' }}>{role}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
