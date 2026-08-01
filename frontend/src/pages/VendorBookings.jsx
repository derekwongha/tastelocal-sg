import React, { useEffect, useMemo, useState } from 'react';
import { getVendorBookings, vendorApproveBooking, vendorRejectBooking, vendorCancelBooking, vendorCompleteBooking } from '../api/bookings';
import VendorSidebar from '../components/VendorSidebar';
import Breadcrumb from '../components/Breadcrumb';
import { AlertPanel, KpiCard, StatusBadge } from '../components/UIPrimitives';
import { cleanPublicLabel, toPublicExperience } from '../utils/homepageDisplay';

const tabMatches = (booking, tab) => tab === 'All'
  || (tab === 'Pending' && booking.booking_status === 'Pending Approval')
  || booking.booking_status === tab;

const formatDate = (value) => value
  ? new Date(`${value}T00:00:00`).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
  : 'Date unavailable';

const formatRequested = (value) => value
  ? new Date(value).toLocaleString('en-SG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  : 'Not recorded';

const VendorBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [activeTab, setActiveTab] = useState('All');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [actionState, setActionState] = useState({ id: null, type: null });
  const [submittingId, setSubmittingId] = useState(null);
  const [query, setQuery] = useState('');
  const [experienceFilter, setExperienceFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');

  const fetchBookings = async () => {
    try {
      const data = await getVendorBookings();
      setBookings(data);
      setSelectedBooking((current) => data.find((booking) => booking.booking_id === current?.booking_id) || data[0] || null);
      setError(null);
    } catch (err) {
      console.error('Failed to load vendor bookings:', err);
      setError('Could not retrieve booking requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, []);

  const handleAction = async (id, actionType, title) => {
    setError(null); setSuccessMsg(null); setSubmittingId(id);
    try {
      const actions = { approve: vendorApproveBooking, reject: vendorRejectBooking, cancel: vendorCancelBooking, complete: vendorCompleteBooking };
      await actions[actionType](id);
      const actionLabels = { approve: 'approved', reject: 'rejected', cancel: 'cancelled', complete: 'marked as completed' };
      setSuccessMsg(`${title}: booking ${actionLabels[actionType]} successfully.`);
      setActionState({ id: null, type: null });
      await fetchBookings();
    } catch (err) {
      console.error(`Action ${actionType} failed:`, err);
      setError(err.response?.data?.detail || 'The booking action could not be completed. Please try again.');
    } finally {
      setSubmittingId(null);
    }
  };

  const displayBookings = useMemo(() => bookings.map((booking) => ({
    ...booking,
    food_experience: toPublicExperience(booking.food_experience || {}),
    tourist_name: cleanPublicLabel(booking.tourist_name || ''),
  })), [bookings]);
  const displaySelectedBooking = displayBookings.find((booking) => booking.booking_id === selectedBooking?.booking_id) || null;
  const experienceTitles = useMemo(() => [...new Set(displayBookings.map((booking) => booking.food_experience?.title).filter(Boolean))].sort(), [displayBookings]);
  const filteredBookings = useMemo(() => displayBookings.filter((booking) => {
    const searchText = `${booking.tourist_name || ''} ${booking.food_experience?.title || ''}`.toLowerCase();
    return tabMatches(booking, activeTab)
      && searchText.includes(query.trim().toLowerCase())
      && (experienceFilter === 'All' || booking.food_experience?.title === experienceFilter)
      && (!dateFilter || booking.timeslot?.slot_date === dateFilter);
  }), [activeTab, dateFilter, displayBookings, experienceFilter, query]);

  const counts = useMemo(() => ({
    pending: bookings.filter((booking) => booking.booking_status === 'Pending Approval').length,
    approved: bookings.filter((booking) => booking.booking_status === 'Approved').length,
    cancelled: bookings.filter((booking) => booking.booking_status === 'Cancelled').length,
    completed: bookings.filter((booking) => booking.booking_status === 'Completed').length,
  }), [bookings]);

  const chooseAction = (event, booking, type) => {
    event.stopPropagation();
    setSelectedBooking(booking);
    setActionState({ id: booking.booking_id, type });
  };

  return (
    <main className="container py-4 sg-vendor-workspace">
      <Breadcrumb items={[{ label: 'Vendor Dashboard', path: '/vendor/dashboard' }, { label: 'Booking Requests', path: '/vendor/bookings' }]} />
      <div className="row g-4">
        <div className="col-lg-3"><VendorSidebar /></div>
        <div className="col-lg-9">
          <header className="sg-workflow-heading sg-surface sg-vendor-heading"><div><span className="sg-eyebrow">Request management</span><h1>Booking Requests</h1><p>Review and manage requests for your food experiences.</p></div></header>
          {error && <AlertPanel tone="danger" title="Booking action unavailable">{error}</AlertPanel>}
          {successMsg && <AlertPanel tone="success" title="Booking updated">{successMsg}</AlertPanel>}

          <section className="row g-3 mb-4" aria-label="Booking request metrics">
            <div className="col-6 col-xl-3"><KpiCard icon="◷" label="Pending requests" value={counts.pending} tone="warning" /></div>
            <div className="col-6 col-xl-3"><KpiCard icon="✓" label="Approved bookings" value={counts.approved} tone="success" /></div>
            <div className="col-6 col-xl-3"><KpiCard icon="×" label="Cancelled bookings" value={counts.cancelled} tone="danger" /></div>
            <div className="col-6 col-xl-3"><KpiCard icon="⚑" label="Completed bookings" value={counts.completed} /></div>
          </section>

          <nav className="sg-status-tabs" aria-label="Booking status filters">
            {['All', 'Pending', 'Approved', 'Completed', 'Cancelled', 'Rejected'].map((tab) => <button key={tab} type="button" className={activeTab === tab ? 'is-active' : ''} onClick={() => { setActiveTab(tab); setActionState({ id: null, type: null }); }}>{tab}</button>)}
          </nav>
          <div className="sg-vendor-filterbar sg-booking-filterbar sg-surface">
            <label className="sg-search-field"><span className="visually-hidden">Search by tourist or experience</span><input className="form-control" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tourist or experience" /></label>
            <label><span className="visually-hidden">Filter by experience</span><select className="form-select" value={experienceFilter} onChange={(event) => setExperienceFilter(event.target.value)}><option>All</option>{experienceTitles.map((title) => <option key={title}>{title}</option>)}</select></label>
            <label><span className="visually-hidden">Filter by slot date</span><input className="form-control" type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} /></label>
            {(query || experienceFilter !== 'All' || dateFilter) && <button type="button" className="btn btn-outline-secondary" onClick={() => { setQuery(''); setExperienceFilter('All'); setDateFilter(''); }}>Clear</button>}
          </div>

          <div className="sg-booking-management-layout mt-3">
            <section className="sg-table-card sg-vendor-section">
              <div className="sg-panel-heading"><div><span className="sg-eyebrow">Request registry</span><h2>{filteredBookings.length} request{filteredBookings.length === 1 ? '' : 's'}</h2></div><small>Select a row for full details</small></div>
              {loading ? <div className="text-center py-5"><span className="spinner-border text-danger" aria-label="Loading booking requests" /></div> : filteredBookings.length === 0 ? <p className="sg-empty-state py-5">No booking requests match these filters.</p> : (
                <div className="table-responsive"><table className="table sg-data-table sg-booking-table align-middle mb-0"><thead><tr><th>Tourist</th><th>Experience</th><th>Date / time slot</th><th>Requested</th><th>Status</th><th>Actions</th></tr></thead><tbody>
                  {filteredBookings.map((booking) => {
                    const isSelected = selectedBooking?.booking_id === booking.booking_id;
                    return <tr key={booking.booking_id} className={isSelected ? 'is-selected' : ''} onClick={() => { setSelectedBooking(booking); setActionState({ id: null, type: null }); }}><td><strong>{booking.tourist_name || 'Tourist'}</strong></td><td>{booking.food_experience?.title || 'Experience'}</td><td><strong>{formatDate(booking.timeslot?.slot_date)}</strong><small>{booking.timeslot?.start_time?.slice(0, 5) || '--:--'}–{booking.timeslot?.end_time?.slice(0, 5) || '--:--'}</small></td><td>{formatRequested(booking.requested_at)}</td><td><StatusBadge status={booking.booking_status} /></td><td><div className="sg-row-actions">
                      {booking.booking_status === 'Pending Approval' && <><button type="button" onClick={(event) => chooseAction(event, booking, 'approve')}>Approve</button><button type="button" onClick={(event) => chooseAction(event, booking, 'reject')}>Reject</button></>}
                      {booking.booking_status === 'Approved' && <><button type="button" onClick={(event) => chooseAction(event, booking, 'complete')}>Complete</button><button type="button" onClick={(event) => chooseAction(event, booking, 'cancel')}>Cancel</button></>}
                      {!['Pending Approval', 'Approved'].includes(booking.booking_status) && <button type="button" onClick={(event) => { event.stopPropagation(); setSelectedBooking(booking); }}>View</button>}
                    </div></td></tr>;
                  })}
                </tbody></table></div>
              )}
            </section>

            <aside className="sg-booking-details sg-info-panel">
              <div className="sg-info-panel__heading"><span className="sg-info-panel__icon">▤</span><h5>Booking details</h5></div>
              <div className="sg-info-panel__body">
                {displaySelectedBooking ? <>
                  <div className="sg-booking-person"><span aria-hidden="true">👤</span><div><strong>{displaySelectedBooking.tourist_name || 'Tourist'}</strong><small>Request #{displaySelectedBooking.booking_id}</small></div></div>
                  <dl className="sg-detail-list"><div><dt>Experience</dt><dd>{displaySelectedBooking.food_experience?.title || 'Experience'}</dd></div><div><dt>Date / time slot</dt><dd>{formatDate(displaySelectedBooking.timeslot?.slot_date)}<small>{displaySelectedBooking.timeslot?.start_time?.slice(0, 5)}–{displaySelectedBooking.timeslot?.end_time?.slice(0, 5)}</small></dd></div><div><dt>Requested</dt><dd>{formatRequested(displaySelectedBooking.requested_at)}</dd></div><div><dt>Status</dt><dd><StatusBadge status={displaySelectedBooking.booking_status} /></dd></div></dl>
                  <div className="sg-booking-detail-actions">
                    {submittingId === displaySelectedBooking.booking_id ? <span className="spinner-border spinner-border-sm text-danger" /> : actionState.id === displaySelectedBooking.booking_id ? <><p>Confirm this {actionState.type} action?</p><div><button type="button" className="btn btn-danger btn-sm" onClick={() => handleAction(displaySelectedBooking.booking_id, actionState.type, displaySelectedBooking.food_experience?.title || 'Booking')}>Confirm</button><button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setActionState({ id: null, type: null })}>Go back</button></div></> : <>
                      {displaySelectedBooking.booking_status === 'Pending Approval' && <div><button type="button" className="btn btn-success btn-sm" onClick={() => setActionState({ id: displaySelectedBooking.booking_id, type: 'approve' })}>Approve request</button><button type="button" className="btn btn-outline-danger btn-sm" onClick={() => setActionState({ id: displaySelectedBooking.booking_id, type: 'reject' })}>Reject request</button></div>}
                      {displaySelectedBooking.booking_status === 'Approved' && <div><button type="button" className="btn btn-success btn-sm" onClick={() => setActionState({ id: displaySelectedBooking.booking_id, type: 'complete' })}>Mark completed</button><button type="button" className="btn btn-outline-danger btn-sm" onClick={() => setActionState({ id: displaySelectedBooking.booking_id, type: 'cancel' })}>Cancel booking</button></div>}
                      {!['Pending Approval', 'Approved'].includes(displaySelectedBooking.booking_status) && <p className="text-muted mb-0">This request has already been processed.</p>}
                    </>}
                  </div>
                </> : <p className="sg-empty-state">Select a request to view its details.</p>}
              </div>
            </aside>
          </div>

          <div className="row g-3 mt-1">
            <div className="col-lg-7"><section className="sg-surface sg-vendor-section h-100"><div className="sg-panel-heading"><h2>Recent request activity</h2></div><ul className="sg-activity-list">{displayBookings.slice(0, 4).map((booking) => <li key={booking.booking_id}><StatusBadge status={booking.booking_status} /><span><strong>{booking.food_experience?.title || 'Experience'}</strong> · {booking.tourist_name || 'Tourist'}</span><small>{formatRequested(booking.requested_at)}</small></li>)}{bookings.length === 0 && <li>No recent activity.</li>}</ul></section></div>
            <div className="col-lg-5"><section className="sg-surface sg-vendor-section h-100"><div className="sg-panel-heading"><h2>Request summary</h2></div><dl className="sg-summary-list"><div><dt>Total requests</dt><dd>{bookings.length}</dd></div><div><dt>Pending</dt><dd>{counts.pending}</dd></div><div><dt>Approved</dt><dd>{counts.approved}</dd></div><div><dt>Completed</dt><dd>{counts.completed}</dd></div></dl></section></div>
          </div>
          <AlertPanel tone="info" className="mt-3" title="Workflow rules">Approved requests reserve their selected slot. Only approved bookings can be completed or cancelled; processed requests remain available as history.</AlertPanel>
        </div>
      </div>
    </main>
  );
};

export default VendorBookings;
