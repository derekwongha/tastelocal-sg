import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getBookings } from '../api/bookings';
import { submitReview } from '../api/reviews';
import Breadcrumb from '../components/Breadcrumb';
import { cleanPublicLabel, toPublicExperience } from '../utils/homepageDisplay';

const SubmitReview = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form states
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [confirmHonest, setConfirmHonest] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        const bookingsList = await getBookings();
        const found = bookingsList.find(b => b.booking_id === parseInt(bookingId));
        if (found) {
          if (found.booking_status !== 'Completed') {
            setError('Only completed food experiences can be reviewed.');
          } else if (found.has_review) {
            setError('You have already submitted a review for this booking.');
          } else {
            setBooking(found);
          }
        } else {
          setError('Booking request not found.');
        }
      } catch (err) {
        console.error('Failed to load booking details:', err);
        setError('Could not retrieve booking details.');
      } finally {
        setLoading(false);
      }
    };
    fetchBookingDetails();
  }, [bookingId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      setError('Please provide a written review comment.');
      return;
    }
    if (!confirmHonest) {
      setError('Please confirm that this review is based on your actual experience.');
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      await submitReview({
        booking_id: parseInt(bookingId),
        rating: rating,
        comment: comment.trim()
      });
      // Redirect back to bookings list on success
      navigate('/tourist/bookings', { state: { reviewSuccess: true } });
    } catch (err) {
      console.error('Review submission failed:', err);
      if (err.response && err.response.data) {
        const details = err.response.data.detail || err.response.data.comment || err.response.data.rating || 'Failed to submit review. Please try again.';
        setError(Array.isArray(details) ? details[0] : details);
      } else {
        setError('Failed to submit review. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-danger" role="status">
          <span className="visually-hidden">Loading details...</span>
        </div>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="container py-5 text-start">
        <div className="alert alert-danger border-0 p-4 text-center" role="alert" style={{ borderRadius: '12px' }}>
          <h4 className="mb-2">Review Access Blocked</h4>
          <p className="mb-4">{error}</p>
          <Link to="/tourist/bookings" className="btn btn-danger px-4 py-2" style={{ borderRadius: '8px' }}>
            Back to Bookings
          </Link>
        </div>
      </div>
    );
  }

  const exp = toPublicExperience(booking?.food_experience || {});
  const slot = booking?.timeslot || {};
  let formattedDate = slot.slot_date;
  if (slot.slot_date) {
    const dateObj = new Date(slot.slot_date);
    formattedDate = dateObj.toLocaleDateString('en-SG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  return (
    <div className="sg-content-shell">
      {/* Breadcrumbs */}
      <Breadcrumb items={[
        { label: 'My Bookings', path: '/tourist/bookings' },
        { label: 'Write a Review', path: `/bookings/${bookingId}/review` }
      ]} />

      <div className="row g-4">
        {/* Left Column: Review Form */}
        <div className="col-lg-7">
          <div className="sg-form-card">
            <div className="mb-4">
              <span className="sg-eyebrow">Write a Review</span>
              <h1 className="sg-page-title">Share Your Food Experience</h1>
              <p className="text-muted small">Help other food lovers discover amazing local food experiences in Singapore.</p>
            </div>

            {error && (
              <div className="alert alert-danger border-0 mb-4" role="alert">
                <strong>Error:</strong> {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Rating Selector */}
              <div className="mb-4 bg-light p-3 rounded border text-center">
                <label className="form-label text-dark fw-bold mb-2">1. Your Experience Rating</label>
                <div className="d-flex justify-content-center gap-2 fs-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}
                      className="hover-scale"
                    >
                      {(hoverRating || rating) >= star ? '★' : '☆'}
                    </span>
                  ))}
                </div>
                <span className="text-danger small mt-1 d-block fw-bold">
                  {rating === 5 ? 'Excellent!' :
                   rating === 4 ? 'Very Good!' :
                   rating === 3 ? 'Average' :
                   rating === 2 ? 'Disappointing' : 'Very Poor'}
                </span>
              </div>

              {/* Review Title & Comment */}
              <div className="mb-4">
                <label className="form-label text-dark fw-bold mb-2">2. Your Written Review</label>
                <textarea
                  rows="5"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="form-control text-dark bg-white"
                  placeholder="What made this experience special? Share details about the host, the food, and the environment..."
                  required
                ></textarea>
              </div>

              {/* Mock Photo Slots (WF11 display-only placeholders) */}
              <div className="mb-4">
                <label className="form-label text-dark fw-bold mb-2">3. Add Photos (Optional)</label>
                <div className="p-3 bg-light rounded border text-center border-dashed mb-2" style={{ borderStyle: 'dashed' }}>
                  <span className="fs-3 mb-1 d-block">📸</span>
                  <span className="small text-muted d-block">Drag & drop photos here or click to upload</span>
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>JPG, PNG up to 5MB each. Max 5 photos.</span>
                </div>
                <div className="d-flex gap-2 justify-content-center">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-light rounded border d-flex align-items-center justify-content-center" style={{ width: '60px', height: '60px', borderStyle: 'dashed' }}>
                      <span className="text-muted small">＋</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Honest Confirmation checkbox */}
              <div className="form-check mb-4">
                <input 
                  type="checkbox"
                  id="confirmHonest"
                  className="form-check-input text-danger"
                  checked={confirmHonest}
                  onChange={(e) => setConfirmHonest(e.target.checked)}
                  required
                />
                <label htmlFor="confirmHonest" className="form-check-label small text-muted">
                  I confirm that this review is based on my actual experience and is honest.
                </label>
              </div>

              <div className="d-flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-danger flex-grow-1 py-3 fw-bold shadow-sm"
                >
                  {submitting ? 'Submitting...' : 'Submit Review'}
                </button>
                <Link to="/tourist/bookings" className="btn btn-outline-dark px-4 py-3 fw-bold">
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Experience Context & Tips */}
        <div className="col-lg-5">
          {/* Experience Summary */}
          <div className="sg-info-panel mb-4">
            <h5 className="fw-bold text-dark mb-3 border-bottom pb-2">Your Experience Summary</h5>
            <div className="d-flex align-items-center gap-3 mb-3">
              <span className="fs-1">🍜</span>
              <div>
                <h6 className="fw-bold text-dark mb-0">{exp.title}</h6>
                <span className="small text-muted">Hosted by {cleanPublicLabel(booking.vendor_business_name || '') || 'Hawker Host'}</span>
              </div>
            </div>
            <ul className="list-unstyled space-y-2 small text-muted mt-3">
              <li className="mb-2"><strong>Booking Reference:</strong> TLB-2026-0710-{bookingId}</li>
              <li className="mb-2"><strong>Attended Date:</strong> {formattedDate}</li>
              <li><strong>Time Slot:</strong> {slot.start_time?.substring(0, 5)} - {slot.end_time?.substring(0, 5)}</li>
            </ul>
          </div>

          {/* Review Tips */}
          <div className="sg-info-panel sg-info-panel--warm">
            <h5 className="fw-bold text-dark mb-3">Review Tips</h5>
            <ul className="list-unstyled space-y-3 small text-muted">
              <li className="mb-3">
                <strong>💡 Be Specific & Helpful</strong>
                <p className="mb-0">Share details about the dishes served, the walking route, or the host's hospitality.</p>
              </li>
              <li className="mb-3">
                <strong>📸 Add Photos</strong>
                <p className="mb-0">Photos of dishes, hawker stalls, and workshop details help other foodies plan their trips.</p>
              </li>
              <li>
                <strong>🛡️ No Inappropriate Content</strong>
                <p className="mb-0">Keep reviews polite and respectful. Offensive content or spam is moderated.</p>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubmitReview;
