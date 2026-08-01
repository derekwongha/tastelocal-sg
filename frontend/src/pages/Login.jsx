import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Breadcrumb from '../components/Breadcrumb';

const getLoginLandingPath = ({ user, vendor_profile: vendorProfile }) => {
  if (user?.role === 'Administrator') {
    return '/admin/dashboard';
  }

  if (user?.role === 'Vendor') {
    return vendorProfile?.approval_status === 'Approved'
      ? '/vendor/dashboard'
      : '/pending-vendor';
  }

  return '/';
};

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoadingSubmit(true);
    try {
      const data = await loginUser({ username, password });
      navigate(getLoginLandingPath(data), { replace: true });
    } catch (err) {
      if (err.response?.data?.non_field_errors) {
        setError(err.response.data.non_field_errors.join(' '));
      } else {
        setError('Invalid username or password. Please try again.');
      }
    } finally {
      setLoadingSubmit(false);
    }
  };

  return (
    <div className="sg-content-shell">
      {/* Top Breadcrumb */}
      <Breadcrumb items={[{ label: 'Login', path: '/login' }]} />

      <div className="row g-4">
        {/* Left Column: Login Form */}
        <div className="col-lg-7">
          <div className="sg-form-card h-100">
            <div className="mb-4">
              <span className="sg-eyebrow">Welcome Back</span>
              <h1 className="sg-page-title">Login to Your Account</h1>
              <p className="text-muted small">Enter your credentials below to access your tourist or vendor dashboard.</p>
            </div>

            {error && (
              <div className="alert alert-danger border-0 text-start" role="alert">
                <strong>Error:</strong> {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label text-dark fw-semibold">Username / Email Address</label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0">👤</span>
                  <input
                    type="text"
                    className="form-control border-start-0 text-dark bg-white"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    required
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="form-label text-dark fw-semibold">Password</label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0">🔒</span>
                  <input
                    type="password"
                    className="form-control border-start-0 text-dark bg-white"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="btn btn-danger btn-lg w-100 py-3 fw-bold shadow-sm"
                disabled={loadingSubmit}
              >
                {loadingSubmit && <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>}
                Login
              </button>
            </form>

            <div className="text-center mt-4 pt-4 border-top">
              <span className="text-muted d-block mb-3">or register a new account:</span>
              <div className="d-flex flex-wrap gap-2 justify-content-center">
                <Link to="/register/tourist" className="btn btn-outline-danger px-4">
                  Register as Tourist
                </Link>
                <Link to="/register/vendor" className="btn btn-outline-dark px-4">
                  Register as Vendor
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Why Login Panel */}
        <div className="col-lg-5">
          <div className="sg-info-panel sg-info-panel--warm h-100 p-4 p-md-5">
            <div className="mb-4 text-center text-lg-start">
              <span className="sg-eyebrow">Welcome to TasteLocal SG</span>
              <h4 className="fw-bold text-dark">Why Login?</h4>
              <p className="text-muted small">Unlock full Singapore local food travel tools.</p>
            </div>

            <ul className="list-unstyled space-y-4">
              <li className="sg-auth-benefit">
                <span className="fs-3">📅</span>
                <div>
                  <h6 className="fw-bold text-dark mb-1">Submit Booking Requests</h6>
                  <p className="small text-muted mb-0">Request slots for your favorite food tours, workshops, and hawker walks instantly.</p>
                </div>
              </li>
              <li className="sg-auth-benefit">
                <span className="fs-3">🗺️</span>
                <div>
                  <h6 className="fw-bold text-dark mb-1">Plan Your Itinerary</h6>
                  <p className="small text-muted mb-0">Assemble single or multi-day calendars and schedule food stops dynamically.</p>
                </div>
              </li>
              <li className="sg-auth-benefit">
                <span className="fs-3">⭐</span>
                <div>
                  <h6 className="fw-bold text-dark mb-1">Write Local Reviews</h6>
                  <p className="small text-muted mb-0">Share ratings and feedback with photos after booking completions.</p>
                </div>
              </li>
              <li className="sg-auth-benefit">
                <span className="fs-3">🛡️</span>
                <div>
                  <h6 className="fw-bold text-dark mb-1">Secure & Trusted</h6>
                  <p className="small text-muted mb-0">We keep your account and booking history secured at all times.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
