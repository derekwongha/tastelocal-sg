import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getPublicExperienceDetail } from '../api/experiences';
import GoogleMapContainer from '../components/GoogleMapContainer';
import { useAuth } from '../context/AuthContext';
import { addItemToItinerary, getItinerary } from '../api/itinerary';
import Breadcrumb from '../components/Breadcrumb';
import { toPublicExperience } from '../utils/homepageDisplay';

const formatSlotDate = (value) => new Date(value).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });

const SUPPORTING_GALLERY_IMAGES = {
  'Hawker Food': ['/demo-images/experiences/chinatown_trail.webp', '/demo-images/experiences/kopi_breakfast.webp', '/demo-images/experiences/satay_stories.webp'],
  'Heritage Food': ['/demo-images/experiences/peranakan_stories.webp', '/demo-images/experiences/joo_chiat_tasting.webp'],
  'Local Desserts': ['/demo-images/experiences/kueh_colours.webp', '/demo-images/experiences/pandan_desserts.webp'],
  'Modern Singapore Food': ['/demo-images/experiences/modern_flavours.webp', '/demo-images/experiences/modern_tasting.webp'],
  'Culinary Workshops': ['/demo-images/experiences/dumpling_workshop.webp', '/demo-images/experiences/spice_blending.webp'],
};

const getSupportingGalleryImages = (categoryName, mainImage) => {
  const candidates = SUPPORTING_GALLERY_IMAGES[categoryName]
    || ['/demo-images/experiences/peranakan_stories.webp', '/demo-images/experiences/spice_heritage.webp'];
  const distinctImages = candidates.filter((candidate) => candidate !== mainImage);
  if (mainImage && distinctImages.length < 2) distinctImages.push(mainImage);
  return distinctImages.slice(0, 2);
};

const ExperienceDetails = () => {
  const { id } = useParams();
  const { isAuthenticated, role } = useAuth();
  const [experience, setExperience] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [selectedTimeslotId, setSelectedTimeslotId] = useState('');
  const [isInItinerary, setIsInItinerary] = useState(false);
  const [itineraryLoading, setItineraryLoading] = useState(false);
  const [itinerarySuccess, setItinerarySuccess] = useState(null);
  const [itineraryError, setItineraryError] = useState(null);
  const isTourist = isAuthenticated && role === 'Tourist';

  useEffect(() => {
    getPublicExperienceDetail(id)
      .then(setExperience)
      .catch((err) => {
        console.error('Failed to load experience details:', err);
        if (err.response?.status === 404) setNotFound(true);
        else setError('We could not retrieve this experience. Please try again shortly.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!isTourist || !id) return;
    getItinerary()
      .then((data) => setIsInItinerary(Boolean(data?.items?.some((item) => item.food_experience.food_experience_id === Number(id)))))
      .catch((err) => console.error('Failed to check itinerary state:', err));
  }, [id, isTourist]);

  const handleAddToItinerary = async () => {
    setItineraryLoading(true);
    setItinerarySuccess(null);
    setItineraryError(null);
    try {
      await addItemToItinerary(Number(id));
      setIsInItinerary(true);
      setItinerarySuccess('Added to your itinerary planner.');
    } catch (err) {
      setItineraryError(err.response?.data?.detail || 'Could not add this experience to your itinerary.');
    } finally {
      setItineraryLoading(false);
    }
  };

  if (loading) return <div className="sg-public-loading py-5"><div className="spinner-border text-danger" role="status" /><span>Loading experience details…</span></div>;

  if (notFound || error || !experience) {
    return <main className="container py-5"><div className="sg-empty-state sg-panel"><span className="empty-icon">🔎</span><h1 className="h3">{notFound ? 'Experience not found' : 'Experience unavailable'}</h1><p>{notFound ? 'This listing may have been unpublished or removed.' : error}</p><Link to="/" className="btn btn-danger">Return to browse</Link></div></main>;
  }

  const displayExperience = toPublicExperience(experience);
  const { title, description, price_sgd, image_url, category, location, vendor_profile, timeslots = [], reviews = [] } = displayExperience;
  const supportingGalleryImages = getSupportingGalleryImages(category?.category_name, image_url);
  const averageRating = reviews.length ? (reviews.reduce((total, review) => total + review.rating, 0) / reviews.length).toFixed(1) : null;

  return (
    <main className="container sg-detail-page py-4 py-lg-5">
      <Breadcrumb items={[{ label: 'Browse experiences', path: '/' }, { label: category?.category_name || 'Food experience', path: `/experiences/${id}` }]} />

      <header className="sg-detail-heading">
        <div><div className="d-flex flex-wrap gap-2 mb-3"><span className="sg-chip sg-chip-red">{category?.category_name || 'Local food'}</span><span className="sg-chip sg-chip-green">Approved local host</span></div><h1>{title}</h1><p>📍 {location?.address || 'Singapore'} · Hosted by <strong>{vendor_profile?.business_name || 'Local vendor'}</strong></p></div>
        <div className="sg-detail-rating">{averageRating ? <><strong>★ {averageRating}</strong><span>{reviews.length} review{reviews.length === 1 ? '' : 's'}</span></> : <><strong>New</strong><span>No reviews yet</span></>}</div>
      </header>

      <section className="sg-detail-gallery">
        <div className="sg-detail-gallery-main">{image_url ? <img src={image_url} alt={title} /> : <div className="sg-gallery-placeholder"><span>🍜</span><strong>Authentic Singapore food experience</strong><small>Gallery image coming from the local host</small></div>}</div>
        <div className="sg-detail-gallery-side">
          {supportingGalleryImages.map((supportingImage, index) => (
            <div key={supportingImage}>
              <img src={supportingImage} alt={`${title} supporting food experience view ${index + 1}`} />
            </div>
          ))}
        </div>
      </section>

      <div className="row g-4 mt-1">
        <div className="col-lg-8">
          <section className="sg-panel sg-detail-attributes">
            <div><span>📍</span><small>Location</small><strong>{location?.address || 'Singapore'}</strong></div>
            <div><span>🍽️</span><small>Category</small><strong>{category?.category_name || 'Local food'}</strong></div>
            <div><span>🏪</span><small>Host</small><strong>{vendor_profile?.business_name || 'Local vendor'}</strong></div>
            <div><span>🗓️</span><small>Availability</small><strong>{timeslots.length} open slot{timeslots.length === 1 ? '' : 's'}</strong></div>
          </section>

          <section className="sg-panel sg-content-panel"><span className="sg-eyebrow">The experience</span><h2>About this experience</h2><p className="sg-long-copy">{description}</p></section>

          <section className="sg-panel sg-content-panel" id="available-slots">
            <div className="sg-panel-heading"><div><span className="sg-eyebrow">Plan your visit</span><h2>Available booking slots</h2></div><span className="sg-chip sg-chip-green">{timeslots.length} available</span></div>
            {timeslots.length > 0 ? (
              <div className="sg-slot-grid">
                {timeslots.map((slot) => {
                  const selected = String(selectedTimeslotId) === String(slot.timeslot_id);
                  return <button key={slot.timeslot_id} type="button" disabled={!isTourist} className={selected ? 'is-selected' : ''} onClick={() => setSelectedTimeslotId(slot.timeslot_id)}><span>{formatSlotDate(slot.slot_date)}</span><strong>{slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}</strong><small>{isTourist ? selected ? 'Selected' : 'Select this slot' : 'Tourist login required'}</small></button>;
                })}
              </div>
            ) : <div className="sg-empty-inline"><span>🗓️</span><div><strong>No open slots right now</strong><p>The vendor has not published new availability yet.</p></div></div>}
          </section>

          <section className="sg-panel sg-content-panel">
            <div className="sg-panel-heading"><div><span className="sg-eyebrow">Find your way</span><h2>Experience location</h2></div><span className="small text-muted">{location?.address || 'Singapore'}</span></div>
            {location?.latitude && location?.longitude ? <GoogleMapContainer singleLatLng={{ lat: location.latitude, lng: location.longitude }} singleTitle={title} height="390px" /> : <div className="sg-empty-inline"><span>🗺️</span><div><strong>Map coordinates unavailable</strong><p>Use the location address shown above.</p></div></div>}
          </section>

          <section className="sg-panel sg-content-panel" id="reviews">
            <div className="sg-panel-heading"><div><span className="sg-eyebrow">Tourist feedback</span><h2>Reviews ({reviews.length})</h2></div>{averageRating && <strong className="sg-review-score">★ {averageRating} / 5</strong>}</div>
            {reviews.length > 0 ? <div className="sg-review-list">{reviews.map((review) => <article key={review.review_id}><div><strong>{review.full_name || review.username}</strong><span>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span></div><p>{review.comment}</p><small>{new Date(review.created_at).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}</small></article>)}</div> : <div className="sg-empty-inline"><span>⭐</span><div><strong>No reviews yet</strong><p>Completed tourists can be the first to share feedback.</p></div></div>}
          </section>
        </div>

        <aside className="col-lg-4">
          <div className="sg-booking-card">
            <span>From</span><div className="sg-booking-price"><strong>S${Number(price_sgd).toFixed(2)}</strong><small>per person</small></div>
            <hr />
            <label htmlFor="booking-slot">Choose an available slot</label>
            <select id="booking-slot" className="form-select" value={selectedTimeslotId} disabled={!isTourist || timeslots.length === 0} onChange={(event) => setSelectedTimeslotId(event.target.value)}>
              <option value="">Select date and time</option>
              {timeslots.map((slot) => <option key={slot.timeslot_id} value={slot.timeslot_id}>{formatSlotDate(slot.slot_date)}, {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}</option>)}
            </select>
            {itinerarySuccess && <div className="sg-alert-panel sg-alert-success">{itinerarySuccess}</div>}
            {itineraryError && <div className="sg-alert-panel sg-alert-error">{itineraryError}</div>}
            {isTourist ? <>{selectedTimeslotId ? <Link className="btn btn-danger w-100" to={`/experiences/${id}/book?slot=${selectedTimeslotId}`}>Review booking request</Link> : <button type="button" className="btn btn-danger w-100" disabled>Select a slot to continue</button>}<button type="button" className="btn btn-outline-dark w-100" disabled={isInItinerary || itineraryLoading} onClick={handleAddToItinerary}>{itineraryLoading ? 'Adding…' : isInItinerary ? 'Already in itinerary' : 'Add to itinerary'}</button></> : !isAuthenticated ? <><Link to="/login" state={{ from: { pathname: `/experiences/${id}` } }} className="btn btn-danger w-100">Log in to request booking</Link><Link to="/login" className="btn btn-outline-dark w-100">Log in to plan itinerary</Link></> : <div className="sg-alert-panel sg-alert-warning">Booking and itinerary actions are available to tourist accounts.</div>}
            <p className="sg-booking-note">This sends a request to the vendor for review. Confirmation appears in My Bookings.</p>
          </div>

          <section className="sg-panel sg-host-card"><span className="sg-host-avatar">🏪</span><div><small>Your local host</small><h2>{vendor_profile?.business_name || 'Local vendor'}</h2><span className="sg-chip sg-chip-green">✓ Approved host</span></div><p>{vendor_profile?.description || 'A Singapore host sharing authentic local food culture.'}</p></section>
          <section className="sg-panel sg-detail-note"><h2>Good to know</h2><ul><li>Booking requests require vendor confirmation.</li><li>Itinerary planning does not reserve a slot.</li><li>Reviews require a completed booking.</li></ul></section>
        </aside>
      </div>
    </main>
  );
};

export default ExperienceDetails;
