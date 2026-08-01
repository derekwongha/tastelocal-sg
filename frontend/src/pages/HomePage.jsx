import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getCategories, getLocations, getPublicExperiences } from '../api/experiences';
import ExperienceCard from '../components/ExperienceCard';
import SearchBar from '../components/SearchBar';
import SearchResultsLayout from '../components/SearchResultsLayout';
import {
  cleanHomepageCategory,
  cleanHomepageLocation,
  HOMEPAGE_CATEGORY_ORDER,
  HOMEPAGE_CATEGORY_VISUALS,
  toHomepageExperience,
} from '../utils/homepageDisplay';

const FILTER_KEYS = ['q', 'category', 'location', 'min_price', 'max_price'];

const paramsFromSearch = (searchParams) => Object.fromEntries(
  FILTER_KEYS.map((key) => [key, searchParams.get(key) || ''])
);

const HomePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [experiences, setExperiences] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const filterSignature = FILTER_KEYS.map((key) => searchParams.get(key) || '').join('|');
  const filters = useMemo(() => paramsFromSearch(searchParams), [searchParams]);
  const isSearchView = FILTER_KEYS.some((key) => Boolean(filters[key]));

  useEffect(() => {
    Promise.all([getCategories(), getLocations()])
      .then(([categoryData, locationData]) => {
        setCategories(categoryData || []);
        setLocations(locationData || []);
      })
      .catch((err) => console.error('Failed to load public filters:', err));
  }, []);

  useEffect(() => {
    const activeFilters = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''));
    setLoading(true);
    setError(null);
    getPublicExperiences(activeFilters)
      .then((data) => setExperiences(data || []))
      .catch((err) => {
        console.error('Failed to load experiences:', err);
        setError('We could not retrieve the public catalogue. Please try again shortly.');
      })
      .finally(() => setLoading(false));
  }, [filters]);

  const applyFilters = (nextFilters) => {
    const nextParams = {};
    FILTER_KEYS.forEach((key) => {
      if (nextFilters[key] !== undefined && String(nextFilters[key]).trim() !== '') nextParams[key] = nextFilters[key];
    });
    setSearchParams(nextParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const returnToBrowse = () => setSearchParams({});

  if (isSearchView) {
    return (
      <SearchResultsLayout
        key={filterSignature}
        experiences={experiences}
        categories={categories}
        locations={locations}
        filters={filters}
        loading={loading}
        error={error}
        onApply={applyFilters}
        onReset={returnToBrowse}
      />
    );
  }

  const displayCategories = categories.map(cleanHomepageCategory);
  const displayLocations = locations.map(cleanHomepageLocation);
  const homepageExperiences = experiences.map(toHomepageExperience);
  const featuredCategories = HOMEPAGE_CATEGORY_ORDER
    .map((categoryName) => displayCategories.find((category) => category.category_name === categoryName))
    .filter(Boolean);

  return (
    <div className="sg-public-page">
      <section className="sg-home-hero">
        <div className="container">
          <div className="row align-items-center g-5">
            <div className="col-lg-6">
              <span className="sg-eyebrow">Singapore, served by locals</span>
              <h1>Find the stories behind every <em>local flavour.</em></h1>
              <p className="sg-hero-copy">Browse hawker trails, heritage tastings, and hands-on food experiences hosted by approved local vendors.</p>
              <div className="d-flex flex-wrap gap-3">
                <a href="#browse" className="btn btn-danger btn-lg">Browse experiences</a>
                <Link to="/discover" className="btn btn-outline-dark btn-lg">Explore the live map</Link>
              </div>
              <div className="sg-trust-row">
                <span>✓ Approved vendors</span><span>✓ Real booking requests</span><span>✓ Tourist reviews</span>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="sg-food-collage" aria-label="Singapore food experience highlights">
                <div className="sg-food-tile sg-food-tile-main">
                  <img src="/demo-images/experiences/peranakan_stories.webp" alt="Heritage food tasting spread" />
                  <div><strong>Heritage flavours</strong><small>Discover recipes, places, and people</small></div>
                </div>
                <div className="sg-food-tile">
                  <img src="/demo-images/experiences/chinatown_trail.webp" alt="Singapore heritage food trail" />
                  <div><strong>Hawker trails</strong></div>
                </div>
                <div className="sg-food-tile">
                  <img src="/demo-images/experiences/dumpling_workshop.webp" alt="Hands-on dumpling workshop" />
                  <div><strong>Hands-on classes</strong></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container sg-home-search" id="browse">
        <SearchBar categories={displayCategories} locations={displayLocations} onSearch={applyFilters} onReset={returnToBrowse} />
      </section>

      <section className="container sg-public-section">
        <div className="sg-section-heading">
          <div><span className="sg-eyebrow">Browse your way</span><h2>Explore by category</h2></div>
          <Link to="/discover">See all on map →</Link>
        </div>
        <div className="row g-4">
          {(featuredCategories.length === 4 ? featuredCategories : [
            { category_id: '', category_name: 'Heritage Food', description: 'Traditional flavours, family-table recipes and cultural food stories.' },
            { category_id: '', category_name: 'Local Desserts', description: 'Colourful kueh, pandan, coconut and nostalgic local sweets.' },
            { category_id: '', category_name: 'Modern Singapore Food', description: 'Contemporary plates inspired by familiar Singapore flavours.' },
            { category_id: '', category_name: 'Culinary Workshops', description: 'Hands-on sessions with local ingredients, techniques and guidance.' }
          ]).map((category, index) => (
            <div className="col-sm-6 col-lg-3" key={`${category.category_id}-${category.category_name}`}>
              <button type="button" className={`sg-category-visual sg-category-${index + 1}`} onClick={() => applyFilters({ category: category.category_id })}>
                <img src={HOMEPAGE_CATEGORY_VISUALS[category.category_name]} alt="" aria-hidden="true" />
                <div><strong>{category.category_name}</strong><small>{category.description || 'Authentic Singapore food experiences'}</small></div>
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="sg-popular-band">
        <div className="container sg-public-section">
          <div className="sg-section-heading">
            <div><span className="sg-eyebrow">Local favourites</span><h2>Popular food experiences</h2><p>Start with the newest published experiences from approved hosts.</p></div>
            <button type="button" className="sg-text-button" onClick={() => applyFilters({ q: 'food' })}>View results →</button>
          </div>
          {loading && <div className="sg-public-loading"><div className="spinner-border text-danger" role="status" /><span>Loading experiences…</span></div>}
          {!loading && error && <div className="sg-alert-panel sg-alert-error">{error}</div>}
          {!loading && !error && experiences.length === 0 && <div className="sg-empty-state sg-panel"><span className="empty-icon">🍽️</span><h5>Experiences are being prepared</h5><p>Check back soon for newly published local food activities.</p></div>}
          {!loading && !error && experiences.length > 0 && (
            <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
              {homepageExperiences.slice(0, 6).map((experience) => <ExperienceCard key={experience.food_experience_id} experience={experience} />)}
            </div>
          )}
        </div>
      </section>

      <section className="container sg-public-section">
        <div className="text-center sg-section-heading-centered"><span className="sg-eyebrow">Simple and transparent</span><h2>How it works</h2><p>From discovery to a memorable meal in three clear steps.</p></div>
        <div className="sg-how-grid">
          {[
            ['01', 'Discover', 'Search the catalogue, use AI suggestions, or explore experiences on the live map.'],
            ['02', 'Plan or request', 'Save ideas to your itinerary or select an available slot and send a booking request.'],
            ['03', 'Taste and review', 'Meet your local host, enjoy the experience, then share a verified review.']
          ].map(([number, title, copy]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>)}
        </div>
      </section>

      <section className="container pb-5">
        <div className="sg-vendor-cta">
          <div><span className="sg-eyebrow">For Singapore food businesses</span><h2>Share your food story with curious travellers.</h2><p>Create listings, manage availability, and respond to booking requests from one professional workspace.</p></div>
          <Link to="/register/vendor" className="btn btn-light btn-lg">Become a TasteLocal host</Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
