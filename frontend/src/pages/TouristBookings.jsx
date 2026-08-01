import React, { useMemo, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getBookings, cancelBooking } from '../api/bookings';
import AccountSidebar from '../components/AccountSidebar';
import Breadcrumb from '../components/Breadcrumb';
import { InfoPanel, KpiCard, StatusBadge } from '../components/UIPrimitives';
import { cleanPublicLabel, cleanPublicReview, toPublicExperience } from '../utils/homepageDisplay';

const formatReviewDate = (value) => value
  ? new Date(value).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
  : '';

const shortenReview = (value, limit = 120) => {
  const comment = String(value || '');
  return comment.length > limit ? `${comment.slice(0, limit).trimEnd()}…` : comment;
};

const TouristBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [cancelConfirmId, setCancelConfirmId] = useState(null);
  const [sortOrder, setSortOrder] = useState('newest');

  const fetchBookingsList = async () => {
    try {
      const data = await getBookings();
      setBookings(data);
    } catch (err) {
      console.error('Failed to retrieve bookings:', err);
      setError('Could not retrieve your booking history.');
    } finally {
      setLoading(false);
    }
  };

  const location = useLocation();

  useEffect(() => {
    fetchBookingsList();
    if (location.state && location.state.reviewSuccess) {
      setSuccessMsg('Review submitted successfully! Thank you for sharing your thoughts.');
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleCancelBooking = async (id, title) => {
    setError(null);
    setSuccessMsg(null);
    try {
      await cancelBooking(id);
      setSuccessMsg(`Successfully cancelled booking request for "${title}".`);
      await fetchBookingsList();
    } catch (err) {
      console.error('Cancellation failed:', err);
      setError('Failed to cancel booking request. Please try again.');
    }
  };

  // Compute stat counts
  const pendingCount = bookings.filter(b => b.booking_status === 'Pending Approval').length;
  const approvedCount = bookings.filter(b => b.booking_status === 'Approved').length;
  const completedCount = bookings.filter(b => b.booking_status === 'Completed').length;
  const cancelledCount = bookings.filter(b => b.booking_status === 'Cancelled' || b.booking_status === 'Rejected').length;
  const displayBookings = useMemo(() => bookings.map((booking) => ({
    ...booking,
    food_experience: toPublicExperience(booking.food_experience || {}),
    vendor_business_name: cleanPublicLabel(booking.vendor_business_name || ''),
    review: booking.review ? cleanPublicReview(booking.review) : null,
  })), [bookings]);
  const sortedBookings = [...displayBookings].sort((a, b) => {
    const aDate = new Date(a.timeslot?.slot_date || 0).getTime();
    const bDate = new Date(b.timeslot?.slot_date || 0).getTime();
    return sortOrder === 'newest' ? bDate - aDate : aDate - bDate;
  });

  return (
    <div className="sg-content-shell">
      {/* Top Breadcrumb */}
      <Breadcrumb items={[
        { label: 'My Account', path: '/profile' },
        { label: 'My Bookings', path: '/tourist/bookings' }
      ]} />

      <div className="row g-4">
        {/* Left Column: Account Navigation Sidebar */}
        <div className="col-lg-3">
          <AccountSidebar />
        </div>

        {/* Center/Right Column: Bookings content */}
        <div className="col-lg-9">
          <div className="sg-surface p-4 mb-4">
            <span className="sg-eyebrow">Tourist Account</span>
            <h1 className="sg-page-title">My Bookings</h1>
            <p className="text-muted small mb-0">Track and manage your requested local food experiences.</p>
          </div>

          {error && (
            <div className="alert alert-danger border-0 mb-4" role="alert">
              <strong>Error:</strong> {error}
            </div>
          )}

          {successMsg && (
            <div className="alert alert-success border-0 mb-4" role="alert">
              <strong>Success:</strong> {successMsg}
            </div>
          )}

          {/* WF9 Booking Counts Stats */}
          <div className="row g-3 mb-4">
            <div className="col-6 col-sm-3">
              <KpiCard icon="◷" label="Pending" value={pendingCount} tone="warning" />
            </div>
            <div className="col-6 col-sm-3">
              <KpiCard icon="✓" label="Approved" value={approvedCount} tone="success" />
            </div>
            <div className="col-6 col-sm-3">
              <KpiCard icon="★" label="Completed" value={completedCount} />
            </div>
            <div className="col-6 col-sm-3">
              <KpiCard icon="×" label="Cancelled / Rejected" value={cancelledCount} tone="danger" />
            </div>
          </div>

          <div className="row g-4">
            {/* Center Area: Booking Table */}
            <div className="col-xl-8">
              <div className="sg-table-card">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
                  <h5 className="fw-bold text-dark mb-0">Booking History</h5>
                  <select className="form-select form-select-sm w-auto" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} aria-label="Sort bookings">
                    <option value="newest">Booking date: newest</option>
                    <option value="oldest">Booking date: oldest</option>
                  </select>
                </div>

                {loading ? (
                  <div className="d-flex justify-content-center py-5">
                    <div className="spinner-border text-danger" role="status">
                      <span className="visually-hidden">Loading bookings...</span>
                    </div>
                  </div>
                ) : bookings.length === 0 ? (
                  <div className="text-center py-5">
                    <span className="fs-1 d-block mb-3">📅</span>
                    <h5 className="fw-bold text-dark mb-2">No Bookings Found</h5>
                    <p className="text-muted small mb-4">You haven't requested any food experience bookings yet.</p>
                    <Link to="/" className="btn btn-danger btn-sm px-4">
                      Browse Experiences
                    </Link>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead>
                        <tr className="text-muted uppercase small">
                          <th>Experience</th>
                          <th>Host</th>
                          <th>Schedule</th>
                          <th>Status</th>
                          <th className="text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedBookings.map((booking) => {
                          const exp = booking.food_experience || {};
                          const slot = booking.timeslot || {};

                          let formattedDate = slot.slot_date;
                          if (slot.slot_date) {
                            const dateObj = new Date(slot.slot_date);
                            formattedDate = dateObj.toLocaleDateString('en-SG', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            });
                          }

                          const isCancelable = booking.booking_status === 'Pending Approval' || booking.booking_status === 'Approved';

                          return (
                            <React.Fragment key={booking.booking_id}>
                            <tr>
                              <td>
                                <div className="d-flex align-items-center gap-2">
                                  <span style={{ fontSize: '20px' }}>🍜</span>
                                  <div>
                                    <Link to={`/experiences/${exp.food_experience_id}`} className="fw-bold text-dark text-decoration-none hover-danger">
                                      {exp.title}
                                    </Link>
                                    <span className="text-muted small d-block">S$ {parseFloat(exp.price_sgd || 0).toFixed(2)}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="small text-muted">{booking.vendor_business_name || 'Hawker Shop'}</td>
                              <td className="small text-dark">
                                <strong>{formattedDate}</strong><br />
                                <span className="text-muted">{slot.start_time?.substring(0, 5)} - {slot.end_time?.substring(0, 5)}</span>
                              </td>
                              <td>
                                <StatusBadge status={booking.booking_status} />
                              </td>
                              <td className="text-end">
                                {isCancelable ? (
                                  cancelConfirmId === booking.booking_id ? (
                                    <div className="d-flex justify-content-end gap-1">
                                      <button
                                        onClick={() => {
                                          handleCancelBooking(booking.booking_id, exp.title);
                                          setCancelConfirmId(null);
                                        }}
                                        className="btn btn-danger btn-sm py-1 px-2"
                                      >
                                        Yes
                                      </button>
                                      <button onClick={() => setCancelConfirmId(null)} className="btn btn-light btn-sm py-1 px-2">
                                        No
                                      </button>
                                    </div>
                                  ) : (
                                    <button onClick={() => setCancelConfirmId(booking.booking_id)} className="btn btn-sm btn-outline-danger">
                                      Cancel
                                    </button>
                                  )
                                ) : booking.booking_status === 'Completed' ? (
                                  booking.has_review || booking.review ? (
                                    <span className="text-success small fw-semibold">Reviewed</span>
                                  ) : (
                                    <Link to={`/bookings/${booking.booking_id}/review`} className="btn btn-sm btn-outline-danger">
                                      Write Review
                                    </Link>
                                  )
                                ) : (
                                  <span className="text-muted small">-</span>
                                )}
                              </td>
                            </tr>
                            {booking.review && (
                              <tr className="table-light">
                                <td colSpan="5" className="border-top-0 pt-0">
                                  <div className="border rounded p-2 text-break">
                                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 small">
                                      <span><strong className="text-success me-2">Your review</strong><span className="text-warning" aria-label={`${booking.review.rating} out of 5 stars`}>{'★'.repeat(booking.review.rating)}{'☆'.repeat(5 - booking.review.rating)}</span></span>
                                      {booking.review.created_at && <span className="text-muted">Submitted {formatReviewDate(booking.review.created_at)}</span>}
                                    </div>
                                    <p className="small text-muted mb-0 mt-1">{shortenReview(booking.review.comment)}</p>
                                  </div>
                                </td>
                              </tr>
                            )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Right Area: Booking Rules Info */}
            <div className="col-xl-4">
              <InfoPanel title="Booking Information" icon="i" tone="warm" className="mb-4">
                <ul className="list-unstyled space-y-3 small text-muted">
                  <li className="mb-3">
                    <strong>1. Request-Based System</strong>
                    <p className="mb-0">Vendors manually review each booking request and respond to confirm the selected slot.</p>
                  </li>
                  <li className="mb-3">
                    <strong>2. Manual Approvals</strong>
                    <p className="mb-0">Vendors can confirm or reject your slot. You will receive notifications inside your bookings tab.</p>
                  </li>
                  <li className="mb-3">
                    <strong>3. Review Limits</strong>
                    <p className="mb-0">Reviews can only be written after a booking request is fully approved and marked Completed.</p>
                  </li>
                </ul>
              </InfoPanel>

              <InfoPanel title="Status Legend" icon="✓">
                <ul className="list-unstyled space-y-2 small">
                  <li className="mb-2"><StatusBadge status="Pending Approval" /> Awaiting response</li>
                  <li className="mb-2"><StatusBadge status="Approved" /> Confirmed by vendor</li>
                  <li className="mb-2"><StatusBadge status="Completed" /> Attendance completed</li>
                  <li><StatusBadge status="Cancelled" /> Request retracted</li>
                </ul>
              </InfoPanel>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TouristBookings;
