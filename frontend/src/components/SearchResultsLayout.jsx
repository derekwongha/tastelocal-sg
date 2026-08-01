import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { cleanPublicCategory, cleanPublicLocation, toPublicExperience } from '../utils/homepageDisplay';

const SearchResultsLayout = ({
  experiences,
  categories,
  locations,
  filters,
  loading,
  error,
  onApply,
  onReset
}) => {
  const [draft, setDraft] = useState(filters);
  const [sort, setSort] = useState('relevance');

  const displayCategories = useMemo(() => categories.map(cleanPublicCategory), [categories]);
  const displayLocations = useMemo(() => locations.map(cleanPublicLocation), [locations]);

  const sortedExperiences = useMemo(() => {
    const results = experiences.map(toPublicExperience);
    if (sort === 'price-low') results.sort((a, b) => Number(a.price_sgd) - Number(b.price_sgd));
    if (sort === 'price-high') results.sort((a, b) => Number(b.price_sgd) - Number(a.price_sgd));
    if (sort === 'title') results.sort((a, b) => a.title.localeCompare(b.title));
    return results;
  }, [experiences, sort]);

  const updateDraft = (key, value) => setDraft((current) => ({ ...current, [key]: value }));

  return (
    <main className="container py-4 py-lg-5">
      <div className="sg-results-heading">
        <div>
          <span className="sg-eyebrow">Curated discovery</span>
          <h1>Food experiences in Singapore</h1>
          <p>Refine the live public catalogue using the filters already supported by TasteLocal SG.</p>
        </div>
        <button className="btn btn-outline-dark" type="button" onClick={onReset}>Back to browse</button>
      </div>

      <div className="sg-results-layout">
        <aside className="sg-filter-rail" aria-label="Search filters">
          <div className="d-flex align-items-center justify-content-between mb-4">
            <h2 className="h5 mb-0">Filter results</h2>
            <button type="button" className="sg-text-button" onClick={() => {
              const cleared = { q: '', category: '', location: '', min_price: '', max_price: '' };
              setDraft(cleared);
              onApply(cleared);
            }}>Clear</button>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); onApply(draft); }}>
            <label className="form-label" htmlFor="result-keyword">Keyword</label>
            <input id="result-keyword" className="form-control mb-3" value={draft.q || ''} onChange={(event) => updateDraft('q', event.target.value)} placeholder="Satay, laksa, hawker..." />

            <label className="form-label" htmlFor="result-category">Category</label>
            <select id="result-category" className="form-select mb-3" value={draft.category || ''} onChange={(event) => updateDraft('category', event.target.value)}>
              <option value="">All categories</option>
              {displayCategories.map((category) => <option key={category.category_id} value={category.category_id}>{category.category_name}</option>)}
            </select>

            <label className="form-label" htmlFor="result-location">Location</label>
            <select id="result-location" className="form-select mb-3" value={draft.location || ''} onChange={(event) => updateDraft('location', event.target.value)}>
              <option value="">All locations</option>
              {displayLocations.map((location) => <option key={location.location_id} value={location.location_id}>{location.address}</option>)}
            </select>

            <div className="row g-2">
              <div className="col-6">
                <label className="form-label" htmlFor="result-min-price">Min S$</label>
                <input id="result-min-price" type="number" min="0" className="form-control" value={draft.min_price || ''} onChange={(event) => updateDraft('min_price', event.target.value)} placeholder="0" />
              </div>
              <div className="col-6">
                <label className="form-label" htmlFor="result-max-price">Max S$</label>
                <input id="result-max-price" type="number" min="0" className="form-control" value={draft.max_price || ''} onChange={(event) => updateDraft('max_price', event.target.value)} placeholder="200" />
              </div>
            </div>
            <button className="btn btn-danger w-100 mt-4" type="submit">Apply filters</button>
          </form>
        </aside>

        <section className="sg-results-list" aria-live="polite">
          <div className="sg-results-toolbar">
            <div>
              <strong>{loading ? 'Searching…' : `${experiences.length} experience${experiences.length === 1 ? '' : 's'} found`}</strong>
              <span>Booking requests are confirmed directly by vendors.</span>
            </div>
            <label className="d-flex align-items-center gap-2 mb-0">
              <span className="small text-muted text-nowrap">Sort by</span>
              <select className="form-select form-select-sm" value={sort} onChange={(event) => setSort(event.target.value)}>
                <option value="relevance">Most relevant</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
                <option value="title">Name A–Z</option>
              </select>
            </label>
          </div>

          {loading && <div className="sg-public-loading"><div className="spinner-border text-danger" role="status" /><span>Finding local food experiences…</span></div>}
          {!loading && error && <div className="sg-alert-panel sg-alert-error">{error}</div>}
          {!loading && !error && sortedExperiences.length === 0 && (
            <div className="sg-empty-state sg-panel"><span className="empty-icon">🍽️</span><h5>No matching experiences</h5><p>Try a broader keyword, price range, category, or location.</p></div>
          )}
          {!loading && !error && sortedExperiences.map((experience) => (
            <article className="sg-horizontal-card" key={experience.food_experience_id}>
              {experience.image_url ? <img src={experience.image_url} alt={experience.title} /> : <div className="sg-horizontal-placeholder" aria-hidden="true">🍜</div>}
              <div className="sg-horizontal-content">
                <div className="d-flex flex-wrap gap-2 mb-2">
                  <span className="sg-chip sg-chip-red">{experience.category?.category_name || 'Local food'}</span>
                  <span className="sg-chip">📍 {experience.location?.address || 'Singapore'}</span>
                </div>
                <h2>{experience.title}</h2>
                <p>{experience.description}</p>
                <span className="sg-host-line">Hosted by {experience.vendor_profile?.business_name || 'a local vendor'}</span>
              </div>
              <div className="sg-horizontal-action">
                <span>From</span>
                <strong>S$ {Number(experience.price_sgd).toFixed(2)}</strong>
                <small>per person</small>
                <Link className="btn btn-danger btn-sm mt-3" to={`/experiences/${experience.food_experience_id}`}>View experience</Link>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
};

export default SearchResultsLayout;
