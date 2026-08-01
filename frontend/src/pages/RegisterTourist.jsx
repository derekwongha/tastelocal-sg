import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Breadcrumb from '../components/Breadcrumb';

const RegisterTourist = () => {
  const [username, setUsername]             = useState('');
  const [email, setEmail]                   = useState('');
  const [fullName, setFullName]             = useState('');
  const [password, setPassword]             = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [fieldErrors, setFieldErrors]       = useState({});
  const [generalError, setGeneralError]     = useState(null);
  const [loadingSubmit, setLoadingSubmit]   = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);

  const { registerTouristUser } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    setGeneralError(null);
    if (password !== passwordConfirm) {
      setFieldErrors({ password_confirm: 'Passwords do not match.' });
      return;
    }
    setLoadingSubmit(true);
    try {
      await registerTouristUser({ username, email, full_name: fullName, password, password_confirm: passwordConfirm });
      setRegistrationComplete(true);
    } catch (err) {
      const errors = err.response?.data;
      if (errors && typeof errors === 'object' && !errors.non_field_errors) {
        setFieldErrors(errors);
      } else if (errors?.non_field_errors) {
        setGeneralError(errors.non_field_errors.join(' '));
      } else {
        setGeneralError('Registration failed. Please verify your details.');
      }
    } finally {
      setLoadingSubmit(false);
    }
  };

  if (registrationComplete) {
    return (
      <div className="sg-content-shell">
        <Breadcrumb items={[
          { label: 'Register', path: '/register/tourist' },
          { label: 'Registration successful', path: '/register/tourist' }
        ]} />
        <div className="row justify-content-center py-4 py-lg-5">
          <div className="col-lg-8 col-xl-7">
            <section className="sg-form-card text-center" role="status" aria-live="polite">
              <span className="d-inline-flex align-items-center justify-content-center rounded-circle bg-success-subtle text-success fs-2 mb-3" style={{ width: '72px', height: '72px' }} aria-hidden="true">✓</span>
              <span className="sg-eyebrow d-block mb-2">Tourist account ready</span>
              <h1 className="sg-page-title">Registration successful</h1>
              <p className="text-muted mx-auto mb-4" style={{ maxWidth: '620px' }}>Your TasteLocal SG account has been created. You can now browse local food experiences, request bookings, and start planning your itinerary.</p>
              <div className="d-flex flex-column flex-sm-row flex-wrap justify-content-center gap-2">
                <Link to="/" className="btn btn-danger px-4">Browse Experiences</Link>
                <Link to="/profile" className="btn btn-outline-dark px-4">View My Profile</Link>
                <Link to="/tourist/itinerary" className="btn btn-outline-danger px-4">My Itinerary</Link>
              </div>
              <div className="sg-alert-panel sg-alert-panel--info text-start mt-4 mb-0">
                <span className="sg-alert-panel__icon" aria-hidden="true">i</span>
                <div>You are already signed in and can begin using your tourist account immediately.</div>
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sg-content-shell">
      {/* Top Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Register', path: '/register/tourist' },
        { label: 'Tourist Registration', path: '/register/tourist' }
      ]} />

      <div className="row g-4">
        {/* Left Column: Tourist Form */}
        <div className="col-lg-7">
          <div className="sg-form-card">
            <div className="mb-4">
              <span className="badge bg-danger-light text-danger px-3 py-2 mb-2">🧳 Tourist Portal</span>
              <h1 className="sg-page-title">Tourist Registration</h1>
              <p className="text-muted small">Create your tourist account to start discovering and booking amazing food experiences in Singapore.</p>
            </div>

            {generalError && (
              <div className="alert alert-danger border-0 text-start" role="alert">
                <strong>Error:</strong> {generalError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label text-dark fw-semibold">Username</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">👤</span>
                    <input
                      type="text"
                      className={`form-control border-start-0 text-dark bg-white ${fieldErrors.username ? 'is-invalid' : ''}`}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Choose username"
                      required
                    />
                    {fieldErrors.username && (
                      <div className="invalid-feedback">{fieldErrors.username[0] || fieldErrors.username}</div>
                    )}
                  </div>
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label text-dark fw-semibold">Email Address</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">✉️</span>
                    <input
                      type="email"
                      className={`form-control border-start-0 text-dark bg-white ${fieldErrors.email ? 'is-invalid' : ''}`}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter email"
                      required
                    />
                    {fieldErrors.email && (
                      <div className="invalid-feedback">{fieldErrors.email[0] || fieldErrors.email}</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label text-dark fw-semibold">Full Name</label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0">📛</span>
                  <input
                    type="text"
                    className={`form-control border-start-0 text-dark bg-white ${fieldErrors.full_name ? 'is-invalid' : ''}`}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter full name"
                    required
                  />
                  {fieldErrors.full_name && (
                    <div className="invalid-feedback">{fieldErrors.full_name[0] || fieldErrors.full_name}</div>
                  )}
                </div>
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label text-dark fw-semibold">Password</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">🔒</span>
                    <input
                      type="password"
                      className={`form-control border-start-0 text-dark bg-white ${fieldErrors.password ? 'is-invalid' : ''}`}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create password"
                      required
                    />
                    {fieldErrors.password && (
                      <div className="invalid-feedback">{fieldErrors.password[0] || fieldErrors.password}</div>
                    )}
                  </div>
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label text-dark fw-semibold">Confirm Password</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">🔒</span>
                    <input
                      type="password"
                      className={`form-control border-start-0 text-dark bg-white ${fieldErrors.password_confirm ? 'is-invalid' : ''}`}
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      placeholder="Confirm password"
                      required
                    />
                    {fieldErrors.password_confirm && (
                      <div className="invalid-feedback">{fieldErrors.password_confirm}</div>
                    )}
                  </div>
                </div>
              </div>

              <button type="submit" className="btn btn-danger btn-lg w-100 py-3 mt-3 fw-bold shadow-sm" disabled={loadingSubmit}>
                {loadingSubmit && <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>}
                Create Tourist Account
              </button>
            </form>

            <div className="text-center mt-4 pt-4 border-top">
              <span className="text-muted">Already have an account?{' '}</span>
              <Link to="/login" className="text-danger fw-bold text-decoration-none">Login here</Link>
            </div>
            <div className="sg-alert-panel sg-alert-panel--info mt-3">
              <span className="sg-alert-panel__icon" aria-hidden="true">i</span>
              <div>By creating an account, you agree to the TasteLocal SG Terms of Use and Privacy Policy.</div>
            </div>
          </div>
        </div>

        {/* Right Column: Why Register Panel */}
        <div className="col-lg-5">
          <div className="sg-info-panel sg-info-panel--warm h-100 p-4 p-md-5">
            <div className="mb-4 text-center text-lg-start">
              <span className="fs-1 mb-2 d-block">✈️</span>
              <h4 className="fw-bold text-dark">Why Register as a Tourist?</h4>
              <p className="text-muted small">Access Singapore's premier local food finder tools.</p>
            </div>

            <ul className="list-unstyled space-y-4">
              <li className="sg-auth-benefit">
                <span className="fs-3">🎟️</span>
                <div>
                  <h6 className="fw-bold text-dark mb-1">Submit Booking Requests</h6>
                  <p className="small text-muted mb-0">Request slots for local hawker walks and traditional workshops easily.</p>
                </div>
              </li>
              <li className="sg-auth-benefit">
                <span className="fs-3">📅</span>
                <div>
                  <h6 className="fw-bold text-dark mb-1">Plan Your Itinerary</h6>
                  <p className="small text-muted mb-0">Save food experiences and compile them into a personal travel calendar.</p>
                </div>
              </li>
              <li className="sg-auth-benefit">
                <span className="fs-3">📝</span>
                <div>
                  <h6 className="fw-bold text-dark mb-1">Write Authentic Reviews</h6>
                  <p className="small text-muted mb-0">Share your food experience and photos after booking completion.</p>
                </div>
              </li>
              <li className="sg-auth-benefit">
                <span className="fs-3">⏱️</span>
                <div>
                  <h6 className="fw-bold text-dark mb-1">Track Your Bookings</h6>
                  <p className="small text-muted mb-0">Manage all pending and approved vendor reservations in one dashboard.</p>
                </div>
              </li>
              <li className="sg-auth-benefit">
                <span className="fs-3">🛡️</span>
                <div>
                  <h6 className="fw-bold text-dark mb-1">Secure & Trusted</h6>
                  <p className="small text-muted mb-0">We protect your account details and keep booking records secure.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterTourist;
