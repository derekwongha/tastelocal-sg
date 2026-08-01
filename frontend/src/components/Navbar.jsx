import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { isAuthenticated, user, logoutUser, role, approvalStatus } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login');
  };

  const isPendingVendor  = role === 'Vendor' && approvalStatus === 'Pending';
  const isRejectedVendor = role === 'Vendor' && approvalStatus === 'Rejected';
  const isRestrictedVendor = isPendingVendor || isRejectedVendor;

  const roleBadgeClass = {
    Tourist:       'bg-warning text-dark',
    Vendor:        'bg-success',
    Administrator: 'bg-danger',
  }[role] || 'bg-secondary';

  const roleIcon = {
    Tourist: '🧳',
    Vendor: '🍽️',
    Administrator: '🛡️',
  }[role] || '👤';

  return (
    <nav className="navbar navbar-expand-lg navbar-light sg-navbar">
      <div className="container">
        {/* Brand */}
        <Link className="navbar-brand sg-auth-logo" to="/">
          🍜 <span className="taste">Taste</span><span className="brand-local">Local SG</span>
        </Link>

        <button
          className="navbar-toggler border-0"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0 gap-1">
            <li className="nav-item">
              <NavLink className="nav-link" to="/" end>Browse</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/discover">Discover</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/recommendations">AI Picks</NavLink>
            </li>

            {isAuthenticated && !isRestrictedVendor && (
              <>
                {role === 'Tourist' && (
                  <>
                    <li className="nav-item"><span className="nav-separator nav-link">|</span></li>
                    <li className="nav-item">
                      <NavLink className="nav-link" to="/tourist/itinerary">Itinerary</NavLink>
                    </li>
                    <li className="nav-item">
                      <NavLink className="nav-link" to="/tourist/bookings">Bookings</NavLink>
                    </li>
                  </>
                )}

                {role === 'Vendor' && approvalStatus === 'Approved' && (
                  <>
                    <li className="nav-item"><span className="nav-separator nav-link">|</span></li>
                    <li className="nav-item">
                      <Link className="nav-link" to="/vendor/dashboard">📊 Dashboard</Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link" to="/vendor/listings">🥢 My Listings</Link>
                    </li>
                  </>
                )}

                {role === 'Administrator' && (
                  <>
                    <li className="nav-item"><span className="nav-separator nav-link">|</span></li>
                    <li className="nav-item">
                      <Link className="nav-link" to="/admin/dashboard">⚙️ Admin</Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link" to="/admin/vendors">🏢 Vendors</Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link" to="/admin/categories">📂 Categories</Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link" to="/admin/moderation">⚖️ Moderation</Link>
                    </li>
                  </>
                )}
              </>
            )}
          </ul>

          {/* Auth controls */}
          <div className="d-flex align-items-center gap-2">
            {isAuthenticated ? (
              <div className="dropdown">
                <button
                  className="btn sg-user-menu dropdown-toggle d-flex align-items-center gap-2"
                  type="button"
                  id="userDropdown"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <span className="sg-role-icon" aria-hidden="true">{roleIcon}</span>
                  <span className={`badge user-badge ${roleBadgeClass}`}>{role}</span>
                  <span className="sg-user-name">{user?.username}</span>
                </button>
                <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
                  {!isRestrictedVendor && (
                    <li><Link className="dropdown-item" to="/profile">👤 My Profile</Link></li>
                  )}
                  {isRestrictedVendor && (
                    <li><Link className="dropdown-item" to="/pending-vendor">📋 Application Status</Link></li>
                  )}
                  <li><hr className="dropdown-divider" /></li>
                  <li>
                    <button className="dropdown-item text-danger fw-semibold" onClick={handleLogout}>
                      🚪 Logout
                    </button>
                  </li>
                </ul>
              </div>
            ) : (
              <div className="d-flex gap-2">
                <Link className="btn-nav-login btn" to="/login">Login</Link>
                <div className="btn-group">
                  <button
                    type="button"
                    className="btn-nav-register btn dropdown-toggle"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                  >
                    Register
                  </button>
                  <ul className="dropdown-menu dropdown-menu-end">
                    <li><Link className="dropdown-item" to="/register/tourist">🧳 Tourist</Link></li>
                    <li><Link className="dropdown-item" to="/register/vendor">🍽️ Food Vendor</Link></li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
