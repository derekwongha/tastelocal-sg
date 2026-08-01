import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Breadcrumb from '../components/Breadcrumb';

const RegisterVendor = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  
  // Vendor Profile details
  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');

  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState(null);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);

  const { registerVendorUser } = useAuth();

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
      await registerVendorUser({
        username,
        email,
        full_name: fullName,
        password,
        password_confirm: passwordConfirm,
        business_name: businessName,
        description,
        contact_number: contactNumber,
        business_address: businessAddress,
      });
      setRegistrationComplete(true);
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data) {
        const errors = err.response.data;
        if (typeof errors === 'object' && !errors.non_field_errors) {
          setFieldErrors(errors);
        } else if (errors.non_field_errors) {
          setGeneralError(errors.non_field_errors.join(' '));
        } else {
          setGeneralError('Registration failed. Please verify details.');
        }
      } else {
        setGeneralError('Network error. Please try again.');
      }
    } finally {
      setLoadingSubmit(false);
    }
  };

  if (registrationComplete) {
    return (
      <div className="sg-content-shell">
        <Breadcrumb items={[
          { label: 'Register', path: '/register/vendor' },
          { label: 'Application submitted', path: '/register/vendor' }
        ]} />
        <div className="row justify-content-center py-4 py-lg-5">
          <div className="col-lg-8 col-xl-7">
            <section className="sg-form-card text-center" role="status" aria-live="polite">
              <span className="d-inline-flex align-items-center justify-content-center rounded-circle bg-warning-subtle text-warning-emphasis fs-2 mb-3" style={{ width: '72px', height: '72px' }} aria-hidden="true">✓</span>
              <span className="sg-eyebrow d-block mb-2">Application received</span>
              <h1 className="sg-page-title">Vendor application submitted</h1>
              <p className="text-muted mx-auto mb-4" style={{ maxWidth: '650px' }}>Your vendor account has been created and your application is pending administrator approval. Once approved, you can manage listings, availability, and booking requests.</p>
              <div className="d-flex flex-column flex-sm-row justify-content-center gap-2">
                <Link to="/pending-vendor" className="btn btn-danger px-4">View Application Status</Link>
                <Link to="/" className="btn btn-outline-dark px-4">Return to Home</Link>
              </div>
              <div className="sg-alert-panel sg-alert-panel--info text-start mt-4 mb-0">
                <span className="sg-alert-panel__icon" aria-hidden="true">i</span>
                <div>You are signed in, but vendor workspace access remains restricted until an administrator approves your application.</div>
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
        { label: 'Register', path: '/register/vendor' },
        { label: 'Vendor Registration', path: '/register/vendor' }
      ]} />

      <div className="row g-4">
        {/* Left Column: Vendor Signup Form */}
        <div className="col-lg-7">
          <div className="sg-form-card">
            <div className="mb-4">
              <span className="sg-eyebrow">Vendor Partner Portal</span>
              <h1 className="sg-page-title">Vendor Registration</h1>
              <p className="text-muted small">Register your food business to list and promote your culinary experiences on TasteLocal SG.</p>
            </div>

            {generalError && (
              <div className="alert alert-danger border-0 text-start" role="alert">
                <strong>Error:</strong> {generalError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <h5 className="text-danger fw-bold mb-3 border-bottom pb-2">1. Account Details</h5>
              
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
                      placeholder="Enter email address"
                      required
                    />
                    {fieldErrors.email && (
                      <div className="invalid-feedback">{fieldErrors.email[0] || fieldErrors.email}</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label text-dark fw-semibold">Contact Person Full Name</label>
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

              <h5 className="text-danger fw-bold mt-4 mb-3 border-bottom pb-2">2. Business Profile</h5>

              <div className="mb-3">
                <label className="form-label text-dark fw-semibold">Business / Stall Name</label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0">🏪</span>
                  <input
                    type="text"
                    className={`form-control border-start-0 text-dark bg-white ${fieldErrors.business_name ? 'is-invalid' : ''}`}
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Taste of Katong Chicken Rice"
                    required
                  />
                  {fieldErrors.business_name && (
                    <div className="invalid-feedback">{fieldErrors.business_name[0] || fieldErrors.business_name}</div>
                  )}
                </div>
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label text-dark fw-semibold">Contact Phone Number</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">📞</span>
                    <input
                      type="text"
                      className={`form-control border-start-0 text-dark bg-white ${fieldErrors.contact_number ? 'is-invalid' : ''}`}
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                      placeholder="e.g. +65 9123 4567"
                      required
                    />
                    {fieldErrors.contact_number && (
                      <div className="invalid-feedback">{fieldErrors.contact_number[0] || fieldErrors.contact_number}</div>
                    )}
                  </div>
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label text-dark fw-semibold">Business Address / Location</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">📍</span>
                    <input
                      type="text"
                      className={`form-control border-start-0 text-dark bg-white ${fieldErrors.business_address ? 'is-invalid' : ''}`}
                      value={businessAddress}
                      onChange={(e) => setBusinessAddress(e.target.value)}
                      placeholder="Enter business address or location"
                      required
                    />
                    {fieldErrors.business_address && (
                      <div className="invalid-feedback">{fieldErrors.business_address[0] || fieldErrors.business_address}</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label text-dark fw-semibold">Short Business Description</label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0">📝</span>
                  <textarea
                    className={`form-control border-start-0 text-dark bg-white ${fieldErrors.description ? 'is-invalid' : ''}`}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows="3"
                    placeholder="Tell us about your business and the food experiences you offer..."
                    required
                  ></textarea>
                  {fieldErrors.description && (
                    <div className="invalid-feedback">{fieldErrors.description[0] || fieldErrors.description}</div>
                  )}
                </div>
              </div>

              <button type="submit" className="btn btn-danger btn-lg w-100 py-3 mt-3 fw-bold shadow-sm" disabled={loadingSubmit}>
                {loadingSubmit && <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>}
                Register as Vendor
              </button>
            </form>

            <div className="text-center mt-4 pt-4 border-top">
              <span className="text-muted">Already have an account?{' '}</span>
              <Link to="/login" className="text-danger fw-bold text-decoration-none">Login here</Link>
            </div>
            <div className="sg-alert-panel sg-alert-panel--info mt-3">
              <span className="sg-alert-panel__icon" aria-hidden="true">i</span>
              <div>Vendor registration requires administrator approval before the vendor workspace becomes available.</div>
            </div>
          </div>
        </div>

        {/* Right Column: Why Partner Sidebar */}
        <div className="col-lg-5">
          <div className="sg-info-panel sg-info-panel--warm h-100 p-4 p-md-5">
            <div className="mb-4 text-center text-lg-start">
              <span className="fs-1 mb-2 d-block">ℹ️</span>
              <h4 className="fw-bold text-dark">Important Notice</h4>
              <p className="text-muted small">Vendor registration requires administrator approval. You will be able to manage your listings, availability slots, and bookings only after your account is approved.</p>
            </div>

            <h5 className="fw-bold text-dark mb-3 mt-4">As a Vendor, you can:</h5>
            <ul className="list-unstyled space-y-4">
              <li className="sg-auth-benefit">
                <span className="fs-3">🥢</span>
                <div>
                  <h6 className="fw-bold text-dark mb-1">Manage Your Listings</h6>
                  <p className="small text-muted mb-0">Create and manage your food experience listings with descriptions, pricing and availability details.</p>
                </div>
              </li>
              <li className="sg-auth-benefit">
                <span className="fs-3">📅</span>
                <div>
                  <h6 className="fw-bold text-dark mb-1">Manage Availability Slots</h6>
                  <p className="small text-muted mb-0">Add and manage available date and time slots for your events dynamically.</p>
                </div>
              </li>
              <li className="sg-auth-benefit">
                <span className="fs-3">✉️</span>
                <div>
                  <h6 className="fw-bold text-dark mb-1">Manage Bookings</h6>
                  <p className="small text-muted mb-0">Review booking requests and update booking status (Approve, Reject, Cancel, or Mark as Completed).</p>
                </div>
              </li>
              <li className="sg-auth-benefit">
                <span className="fs-3">📈</span>
                <div>
                  <h6 className="fw-bold text-dark mb-1">Grow Your Business</h6>
                  <p className="small text-muted mb-0">Reach more tourists and grow your brand reputation with verified reviews.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterVendor;
