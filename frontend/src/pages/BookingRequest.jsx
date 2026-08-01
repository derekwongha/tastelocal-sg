import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getPublicExperienceDetail } from '../api/experiences';
import { createBooking } from '../api/bookings';
import { addItemToItinerary, getItinerary } from '../api/itinerary';
import Breadcrumb from '../components/Breadcrumb';
import { toPublicExperience } from '../utils/homepageDisplay';

const formatDate = (value) => new Date(value).toLocaleDateString('en-SG', {
  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
});

const BookingRequest = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [experience, setExperience] = useState(null);
  const [selectedSlotId, setSelectedSlotId] = useState(searchParams.get('slot') || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdBooking, setCreatedBooking] = useState(null);
  const [isInItinerary, setIsInItinerary] = useState(false);
  const [itineraryStatus, setItineraryStatus] = useState(null);

  useEffect(() => {
    Promise.all([getPublicExperienceDetail(id), getItinerary()])
      .then(([experienceData, itineraryData]) => {
        setExperience(experienceData);
        setIsInItinerary(Boolean(itineraryData?.items?.some((item) => item.food_experience.food_experience_id === Number(id))));
      })
      .catch((err) => {
        console.error('Failed to prepare booking request:', err);
        setError('We could not prepare this booking request. Return to the experience and try again.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const selectedSlot = useMemo(
    () => experience?.timeslots?.find((slot) => String(slot.timeslot_id) === String(selectedSlotId)),
    [experience, selectedSlotId]
  );
  const displayExperience = useMemo(() => toPublicExperience(experience || {}), [experience]);

  const handleSubmit = async () => {
    if (!selectedSlot) return;
    setSubmitting(true);
    setError(null);
    try {
      const booking = await createBooking({ food_experience_id: Number(id), timeslot_id: Number(selectedSlot.timeslot_id) });
      setCreatedBooking(booking);
    } catch (err) {
      const data = err.response?.data;
      setError(data?.detail || (Array.isArray(data?.timeslot_id) ? data.timeslot_id.join(' ') : data?.timeslot_id) || 'The booking request could not be submitted.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddToItinerary = async () => {
    setItineraryStatus(null);
    try {
      await addItemToItinerary(Number(id));
      setIsInItinerary(true);
      setItineraryStatus({ tone: 'success', message: 'Added to your itinerary planner.' });
    } catch (err) {
      setItineraryStatus({ tone: 'error', message: err.response?.data?.detail || 'Could not add this experience to your itinerary.' });
    }
  };

  if (loading) return <div className="sg-public-loading py-5"><div className="spinner-border text-danger" role="status" /><span>Preparing your booking request…</span></div>;

  if (!experience) return <main className="container py-5"><div className="sg-alert-panel sg-alert-error">{error}</div></main>;

  return (
    <main className="container sg-booking-request-page py-4 py-lg-5">
      <Breadcrumb items={[{ label: 'Browse experiences', path: '/' }, { label: displayExperience.title, path: `/experiences/${id}` }, { label: 'Booking request', path: `/experiences/${id}/book` }]} />

      <header className="sg-workflow-heading">
        <div><span className="sg-eyebrow">Booking request</span><h1>Submit booking request</h1><p>Review the experience and available time before sending your request to the vendor.</p></div>
        <span className="sg-chip sg-chip-green">Tourist account</span>
      </header>

      {createdBooking ? (
        <section className="sg-booking-success sg-panel">
          <span>✓</span><h2>Request sent to the vendor</h2><p>Your request is now <strong>{createdBooking.booking_status}</strong>. The selected slot is not confirmed until the vendor approves it.</p>
          <div><Link className="btn btn-danger" to="/tourist/bookings">View booking history</Link><Link className="btn btn-outline-dark" to="/">Browse more experiences</Link></div>
        </section>
      ) : (
        <div className="sg-booking-request-layout">
          <div>
            <section className="sg-panel sg-selected-experience">
              <h2>Selected food experience</h2>
              <div className="sg-selected-experience-grid">
                {displayExperience.image_url ? <img src={displayExperience.image_url} alt={displayExperience.title} /> : <div className="sg-booking-visual">🍜</div>}
                <div><div className="d-flex flex-wrap gap-2"><span className="sg-chip sg-chip-red">{displayExperience.category?.category_name || 'Local food'}</span><span className="sg-chip">📍 {displayExperience.location?.address || 'Singapore'}</span></div><h3>{displayExperience.title}</h3><p>Hosted by <strong>{displayExperience.vendor_profile?.business_name || 'Local vendor'}</strong></p><p className="sg-booking-description">{displayExperience.description}</p><strong className="sg-booking-request-price">S${Number(displayExperience.price_sgd).toFixed(2)} <small>per person</small></strong></div>
              </div>
            </section>

            <section className="sg-panel sg-booking-form-panel">
              <div className="sg-panel-heading"><div><span className="sg-eyebrow">Booking request details</span><h2>Select an available date and time</h2></div><span className="sg-chip sg-chip-green">{displayExperience.timeslots?.length || 0} available</span></div>
              {displayExperience.timeslots?.length ? <div className="sg-booking-slot-options">{displayExperience.timeslots.map((slot) => {
                const selected = String(selectedSlotId) === String(slot.timeslot_id);
                return <button type="button" key={slot.timeslot_id} className={selected ? 'is-selected' : ''} onClick={() => setSelectedSlotId(String(slot.timeslot_id))}><span>📅 {formatDate(slot.slot_date)}</span><strong>{slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}</strong><small>{selected ? 'Selected for request' : 'Select this slot'}</small></button>;
              })}</div> : <div className="sg-empty-inline"><span>🗓️</span><div><strong>No available slots</strong><p>Return later when the vendor publishes new availability.</p></div></div>}

              {selectedSlot && <div className="sg-selected-slot-summary"><span>Selected schedule</span><strong>{formatDate(selectedSlot.slot_date)}</strong><small>{selectedSlot.start_time.slice(0, 5)} – {selectedSlot.end_time.slice(0, 5)}</small></div>}
              {error && <div className="sg-alert-panel sg-alert-error">{error}</div>}
              {itineraryStatus && <div className={`sg-alert-panel ${itineraryStatus.tone === 'success' ? 'sg-alert-success' : 'sg-alert-error'}`}>{itineraryStatus.message}</div>}
              <div className="sg-booking-form-actions">
                <button type="button" className="btn btn-danger" disabled={!selectedSlot || submitting} onClick={handleSubmit}>{submitting ? 'Sending request…' : 'Submit booking request'}</button>
                <button type="button" className="btn btn-outline-dark" disabled={isInItinerary} onClick={handleAddToItinerary}>{isInItinerary ? 'Already in itinerary' : 'Add to itinerary'}</button>
                <Link to={`/experiences/${id}`} className="btn btn-link">Back to details</Link>
              </div>
              <p className="sg-secure-note">🔒 Your account and request details are shared only as needed with the experience vendor.</p>
            </section>
          </div>

          <aside>
            <section className="sg-panel sg-booking-guidance"><h2>Booking information</h2>{[
              ['i', 'This is a request only', 'Your booking is not confirmed until the vendor approves it.'],
              ['✓', 'Request details only', 'TasteLocal SG sends the selected slot to the vendor for review.'],
              ['↗', 'Vendor decision', 'The vendor will approve or reject the request in the existing workflow.'],
              ['★', 'Reviews follow completion', 'A review becomes available only after a completed booking.']
            ].map(([icon, title, copy]) => <div key={title}><span>{icon}</span><p><strong>{title}</strong><small>{copy}</small></p></div>)}</section>
            <section className="sg-panel sg-booking-steps"><h2>Booking steps</h2><ol>{[
              ['Select slot', 'Choose an available date and time.'],
              ['Submit request', 'Send the request to the vendor.'],
              ['Vendor decision', 'Track approval in My Bookings.'],
              ['Enjoy', 'Attend after confirmation.'],
              ['Review', 'Share feedback after completion.']
            ].map(([title, copy]) => <li key={title}><span>{title}</span><small>{copy}</small></li>)}</ol></section>
          </aside>
        </div>
      )}
    </main>
  );
};

export default BookingRequest;
