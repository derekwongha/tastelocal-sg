import React from 'react';
import { Link } from 'react-router-dom';

const FOOD_ICONS = ['🍜', '🍢', '🌶️', '🍛', '🥘', '🦐', '🍱', '🥗'];

const ExperienceCard = ({ experience }) => {
  const { food_experience_id, title, description, price_sgd, image_url, category, location, vendor_profile } = experience;
  // Pick a deterministic food icon based on ID
  const icon = FOOD_ICONS[(food_experience_id || 0) % FOOD_ICONS.length];

  return (
    <div className="col">
      <div className="sg-exp-card">
        {/* Image or warm placeholder */}
        {image_url ? (
          <img
            src={image_url}
            className="card-img-top"
            alt={title}
            style={{ height: '200px', objectFit: 'cover' }}
          />
        ) : (
          <div className="exp-placeholder">
            <div className="text-center">
              <div style={{ fontSize: '2.5rem', marginBottom: '0.35rem' }}>{icon}</div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#a0856d' }}>
                Culinary Experience
              </span>
            </div>
          </div>
        )}

        <div className="exp-body">
          {/* Category & Location */}
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="exp-category">{category?.category_name || 'Food'}</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--sg-warm-grey)' }}>
              📍 {location?.address || 'Singapore'}
            </span>
          </div>

          {/* Title */}
          <h5 className="exp-title">{title}</h5>

          {/* Vendor */}
          <div className="exp-vendor">
            🍽️ {vendor_profile?.business_name || 'Local Vendor'}
          </div>

          {/* Description */}
          <p className="exp-desc">{description}</p>
        </div>

        {/* Footer */}
        <div className="exp-footer">
          <div>
            <small className="exp-price">
              <small>Price (SGD)</small>
              S$ {parseFloat(price_sgd).toFixed(2)}
            </small>
          </div>
          <Link
            to={`/experiences/${food_experience_id}`}
            className="btn btn-danger btn-sm"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ExperienceCard;
