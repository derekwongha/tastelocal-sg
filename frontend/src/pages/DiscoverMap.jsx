import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPublicExperiences } from '../api/experiences';
import GoogleMapContainer from '../components/GoogleMapContainer';
import Breadcrumb from '../components/Breadcrumb';
import { toPublicExperience } from '../utils/homepageDisplay';

const DiscoverMap = () => {
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [maxPrice, setMaxPrice] = useState(200);
  const [selectedId, setSelectedId] = useState(null);
  const [mapStatus, setMapStatus] = useState('loading');

  useEffect(() => {
    getPublicExperiences()
      .then((data) => setExperiences(data || []))
      .catch((err) => {
        console.error('Error fetching experiences for map:', err);
        setError('We could not load discoverable food experiences.');
      })
      .finally(() => setLoading(false));
  }, []);

  const displayExperiences = useMemo(() => experiences.map(toPublicExperience), [experiences]);

  const filteredExperiences = useMemo(() => displayExperiences.filter((experience) => {
    const categoryMatch = selectedCategory === 'All' || experience.category?.category_name === selectedCategory;
    return categoryMatch && Number(experience.price_sgd) <= maxPrice;
  }), [displayExperiences, selectedCategory, maxPrice]);

  const categories = ['All', ...new Set(displayExperiences.map((experience) => experience.category?.category_name).filter(Boolean))];
  const selectedExperience = filteredExperiences.find((experience) => experience.food_experience_id === selectedId);

  return (
    <main className="container-fluid sg-discover-page">
      <div className="sg-wide-container">
        <Breadcrumb items={[{ label: 'Home', path: '/' }, { label: 'Discover Map', path: '/discover' }]} />
        <div className="sg-discover-heading">
          <div><span className="sg-eyebrow">Live map discovery</span><h1>Explore Singapore by flavour</h1><p>Filter local experiences and select a card or live marker to inspect its location.</p></div>
          <span className="sg-live-chip"><i /> {mapStatus === 'ready' ? 'Google Maps enabled' : mapStatus === 'unavailable' ? 'Map unavailable — catalogue active' : 'Loading map'}</span>
        </div>

        {loading && <div className="sg-public-loading"><div className="spinner-border text-danger" role="status" /><span>Preparing the discovery map…</span></div>}
        {!loading && error && <div className="sg-alert-panel sg-alert-error">{error}</div>}

        {!loading && !error && (
          <div className="sg-map-workspace">
            <aside className="sg-map-filters">
              <div className="sg-panel-title"><span>Filters</span><button type="button" className="sg-text-button" onClick={() => { setSelectedCategory('All'); setMaxPrice(200); }}>Reset</button></div>
              <label className="form-label" htmlFor="map-category">Experience type</label>
              <select id="map-category" className="form-select mb-4" value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
                {categories.map((category) => <option key={category} value={category}>{category === 'All' ? 'All categories' : category}</option>)}
              </select>
              <label className="form-label d-flex justify-content-between" htmlFor="map-price"><span>Maximum price</span><strong>S${maxPrice}</strong></label>
              <input id="map-price" type="range" className="form-range" min="0" max="200" step="10" value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))} />
              <div className="sg-map-filter-note"><strong>{filteredExperiences.length}</strong><span>experiences visible on this map</span></div>
              <div className="sg-map-legend"><span><i className="sg-legend-marker" /> Live experience marker</span><span><i className="sg-legend-selected" /> Selected listing</span></div>
            </aside>

            <section className="sg-map-list" aria-label="Mapped experiences">
              <div className="sg-panel-title"><span>Nearby experiences</span><small>{filteredExperiences.length} results</small></div>
              <div className="sg-map-list-scroll">
                {filteredExperiences.length === 0 && <div className="sg-empty-state"><span className="empty-icon">🗺️</span><h5>No mapped results</h5><p>Increase the price range or choose another category.</p></div>}
                {filteredExperiences.map((experience) => (
                  <article
                    key={experience.food_experience_id}
                    className={`sg-map-result ${selectedId === experience.food_experience_id ? 'is-selected' : ''}`}
                    onClick={() => setSelectedId(experience.food_experience_id)}
                  >
                    {experience.image_url ? <img src={experience.image_url} alt="" /> : <div className="sg-map-result-visual">🍜</div>}
                    <div><span className="sg-chip sg-chip-red">{experience.category?.category_name || 'Local food'}</span><h2>{experience.title}</h2><p>📍 {experience.location?.address || 'Singapore'}</p><div><strong>S${Number(experience.price_sgd).toFixed(2)}</strong><Link to={`/experiences/${experience.food_experience_id}`}>Details →</Link></div></div>
                  </article>
                ))}
              </div>
            </section>

            <section className="sg-map-stage">
              <GoogleMapContainer experiences={filteredExperiences} selectedExperienceId={selectedId} height="100%" onMarkerSelect={setSelectedId} onMapStatusChange={setMapStatus} />
              {selectedExperience && (
                <div className="sg-map-selection-card">
                  <button type="button" aria-label="Close selected experience" onClick={() => setSelectedId(null)}>×</button>
                  <span>{selectedExperience.category?.category_name || 'Local food'}</span>
                  <strong>{selectedExperience.title}</strong>
                  <small>{selectedExperience.location?.address || 'Singapore'} · S${Number(selectedExperience.price_sgd).toFixed(2)}</small>
                  <Link to={`/experiences/${selectedExperience.food_experience_id}`}>View full details</Link>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
};

export default DiscoverMap;
