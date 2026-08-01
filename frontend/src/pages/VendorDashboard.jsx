import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getVendorExperiences } from '../api/experiences';
import { getVendorBookings } from '../api/bookings';
import VendorSidebar from '../components/VendorSidebar';
import Breadcrumb from '../components/Breadcrumb';
import { AlertPanel, KpiCard, StatusBadge } from '../components/UIPrimitives';
import { cleanPublicDescription, cleanPublicLabel, cleanPublicReview, toPublicExperience } from '../utils/homepageDisplay';

const formatDateTime = (value) => value
  ? new Date(value).toLocaleString('en-SG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : 'Not recorded';

const formatReviewDate = (value) => value
  ? new Date(value).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
  : '';

const shortenReview = (value, limit = 150) => {
  const comment = String(value || '');
  return comment.length > limit ? `${comment.slice(0, limit).trimEnd()}…` : comment;
};

const VendorDashboard = () => {
  const { user } = useAuth();
  const [experiences, setExperiences] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [experienceData, bookingData] = await Promise.all([getVendorExperiences(), getVendorBookings()]);
        setExperiences(experienceData);
        setBookings(bookingData);
      } catch (err) {
        console.error('Failed to load vendor dashboard stats:', err);
        setError('Could not retrieve the vendor workspace data.');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const metrics = useMemo(() => ({
    listings: experiences.length,
    pending: bookings.filter((booking) => booking.booking_status === 'Pending Approval').length,
    approved: bookings.filter((booking) => booking.booking_status === 'Approved').length,
    completed: bookings.filter((booking) => booking.booking_status === 'Completed').length,
  }), [bookings, experiences]);

  const displayBookings = useMemo(() => bookings.map((booking) => ({
    ...booking,
    food_experience: toPublicExperience(booking.food_experience || {}),
    tourist_name: cleanPublicLabel(booking.tourist_name || ''),
    review: booking.review ? cleanPublicReview(booking.review) : null,
  })), [bookings]);
  const upcomingBookings = displayBookings
    .filter((booking) => ['Pending Approval', 'Approved'].includes(booking.booking_status))
    .sort((a, b) => String(a.timeslot?.slot_date).localeCompare(String(b.timeslot?.slot_date)))
    .slice(0, 5);
  const recentBookings = [...displayBookings]
    .sort((a, b) => new Date(b.requested_at || 0) - new Date(a.requested_at || 0))
    .slice(0, 5);
  const recentReviews = displayBookings
    .filter((booking) => booking.review)
    .sort((a, b) => new Date(b.review.created_at || 0) - new Date(a.review.created_at || 0))
    .slice(0, 6);
  const vendor = useMemo(() => user?.vendor_profile ? ({
    ...user.vendor_profile,
    business_name: cleanPublicLabel(user.vendor_profile.business_name || ''),
    description: cleanPublicDescription(user.vendor_profile.description || ''),
    business_address: cleanPublicLabel(user.vendor_profile.business_address || ''),
  }) : null, [user]);
  const displayUserName = cleanPublicLabel(user?.full_name || '');

  return (
    <main className="container py-4 sg-vendor-workspace">
      <Breadcrumb items={[{ label: 'Vendor Dashboard', path: '/vendor/dashboard' }]} />
      <div className="row g-4">
        <div className="col-lg-3"><VendorSidebar /></div>
        <div className="col-lg-9">
          <header className="sg-workflow-heading sg-surface sg-vendor-heading">
            <div><span className="sg-eyebrow">Vendor partner portal</span><h1>Vendor Dashboard</h1><p>Manage your food experiences, availability slots and booking requests.</p></div>
            <Link to="/vendor/experiences/new" className="btn btn-danger">Add new listing</Link>
          </header>

          {error && <AlertPanel tone="danger" title="Dashboard unavailable">{error}</AlertPanel>}
          {loading ? <div className="sg-surface p-5 text-center"><span className="spinner-border text-danger" aria-label="Loading vendor dashboard" /></div> : (
            <>
              <section className="row g-3 mb-4" aria-label="Vendor workflow metrics">
                <div className="col-6 col-xl-3"><KpiCard icon="▦" label="Total listings" value={metrics.listings} helper="Your catalogue" /></div>
                <div className="col-6 col-xl-3"><KpiCard icon="◷" label="Pending requests" value={metrics.pending} tone="warning" helper="Awaiting response" /></div>
                <div className="col-6 col-xl-3"><KpiCard icon="✓" label="Approved bookings" value={metrics.approved} tone="success" helper="Currently confirmed" /></div>
                <div className="col-6 col-xl-3"><KpiCard icon="⚑" label="Completed bookings" value={metrics.completed} helper="Recorded history" /></div>
              </section>

              <div className="sg-vendor-dashboard-top mb-4">
                <section className="sg-surface sg-vendor-section">
                  <div className="sg-panel-heading"><div><span className="sg-eyebrow">Common tasks</span><h2>Quick actions</h2></div></div>
                  <div className="sg-vendor-action-grid">
                    <Link to="/vendor/experiences/new"><span>＋</span><strong>Add new listing</strong><small>Create a food experience.</small></Link>
                    <Link to="/vendor/availability"><span>▣</span><strong>Manage slots</strong><small>Add, edit or block availability.</small></Link>
                    <Link to="/vendor/bookings"><span>✓</span><strong>Review requests</strong><small>Respond to tourist requests.</small></Link>
                  </div>
                </section>
                <section className="sg-surface sg-vendor-section sg-vendor-profile-summary">
                  <div className="sg-panel-heading"><h2>Vendor profile summary</h2></div>
                  <div className="sg-vendor-profile-intro"><span aria-hidden="true">店</span><div><h3>{vendor?.business_name || displayUserName || 'Local vendor'}</h3><StatusBadge status={vendor?.approval_status || 'Approved'}>{vendor?.approval_status || 'Approved'} Vendor</StatusBadge></div></div>
                  <p>{vendor?.description || 'Your approved vendor profile supports the food experiences shown in your catalogue.'}</p>
                  {vendor?.business_address && <small>📍 {vendor.business_address}</small>}
                  <Link to="/profile">View profile →</Link>
                </section>
              </div>

              <div className="row g-4">
                <div className="col-xl-6"><section className="sg-table-card sg-vendor-section h-100">
                  <div className="sg-panel-heading"><h2>Recent request activity</h2><Link to="/vendor/bookings">View all</Link></div>
                  {recentBookings.length === 0 ? <p className="sg-empty-state">No recent booking activity.</p> : <div className="table-responsive"><table className="table sg-data-table align-middle mb-0"><thead><tr><th>Activity</th><th>Experience</th><th>Requested</th></tr></thead><tbody>
                    {recentBookings.map((booking) => <tr key={booking.booking_id}><td><StatusBadge status={booking.booking_status} /></td><td><strong>{booking.food_experience?.title || 'Experience'}</strong><small>{booking.tourist_name || 'Tourist'}</small></td><td>{formatDateTime(booking.requested_at)}</td></tr>)}
                  </tbody></table></div>}
                </section></div>
                <div className="col-xl-6"><section className="sg-table-card sg-vendor-section h-100">
                  <div className="sg-panel-heading"><h2>Upcoming and pending bookings</h2><Link to="/vendor/bookings">Manage</Link></div>
                  {upcomingBookings.length === 0 ? <p className="sg-empty-state">No upcoming or pending bookings.</p> : <div className="table-responsive"><table className="table sg-data-table align-middle mb-0"><thead><tr><th>Date &amp; time</th><th>Experience</th><th>Status</th></tr></thead><tbody>
                    {upcomingBookings.map((booking) => <tr key={booking.booking_id}><td><strong>{booking.timeslot?.slot_date || 'Date unavailable'}</strong><small>{booking.timeslot?.start_time?.slice(0, 5) || 'Time unavailable'}</small></td><td>{booking.food_experience?.title || 'Experience'}<small>{booking.tourist_name || 'Tourist'}</small></td><td><StatusBadge status={booking.booking_status} /></td></tr>)}
                  </tbody></table></div>}
                </section></div>
              </div>
              <section className="sg-surface sg-vendor-section mt-4" aria-labelledby="vendor-recent-reviews-heading">
                <div className="sg-panel-heading">
                  <div><span className="sg-eyebrow">Tourist feedback</span><h2 id="vendor-recent-reviews-heading">Recent Reviews</h2></div>
                </div>
                {recentReviews.length === 0 ? (
                  <p className="sg-empty-state">No reviews received yet.</p>
                ) : (
                  <div className="row g-3">
                    {recentReviews.map((booking) => (
                      <div className="col-md-6 col-xxl-4" key={booking.review.review_id}>
                        <article className="border rounded p-3 h-100 bg-light text-break">
                          <div className="d-flex flex-wrap justify-content-between gap-2 mb-2">
                            <strong>{booking.food_experience?.title || 'Experience'}</strong>
                            <span className="text-warning" aria-label={`${booking.review.rating} out of 5 stars`}>
                              {'★'.repeat(booking.review.rating)}{'☆'.repeat(5 - booking.review.rating)}
                            </span>
                          </div>
                          <p className="small text-muted mb-2">{shortenReview(booking.review.comment)}</p>
                          <small className="text-muted d-flex flex-wrap justify-content-between gap-2">
                            <span>{booking.tourist_name || 'Tourist'}</span>
                            {booking.review.created_at && <span>{formatReviewDate(booking.review.created_at)}</span>}
                          </small>
                        </article>
                      </div>
                    ))}
                  </div>
                )}
              </section>
              <AlertPanel tone="info" className="mt-4" title="Request-based workflow">Booking requests require a vendor response. Review pending requests promptly so tourists can plan with confidence.</AlertPanel>
            </>
          )}
        </div>
      </div>
    </main>
  );
};

export default VendorDashboard;
