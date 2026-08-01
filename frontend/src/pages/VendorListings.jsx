import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteVendorExperience, getVendorExperiences } from '../api/experiences';
import VendorSidebar from '../components/VendorSidebar';
import Breadcrumb from '../components/Breadcrumb';
import { AlertPanel, KpiCard, StatusBadge } from '../components/UIPrimitives';
import { toPublicExperience } from '../utils/homepageDisplay';

const PAGE_SIZE = 5;

const VendorListings = () => {
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(1);

  const fetchListings = async () => {
    setLoading(true);
    try {
      setExperiences(await getVendorExperiences());
      setError(null);
    } catch (err) {
      console.error('Failed to retrieve listings:', err);
      setError('Failed to retrieve listings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchListings(); }, []);

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to deactivate "${title}"? This will remove it from public discovery.`)) return;
    try {
      await deleteVendorExperience(id);
      await fetchListings();
    } catch (err) {
      console.error('Failed to deactivate listing:', err);
      setError('Failed to deactivate the listing. Please try again.');
    }
  };

  const displayExperiences = useMemo(() => experiences.map((experience) => toPublicExperience(experience)), [experiences]);
  const filtered = useMemo(() => displayExperiences.filter((experience) => {
    const searchText = `${experience.title || ''} ${experience.category?.category_name || ''} ${experience.location?.address || ''}`.toLowerCase();
    return searchText.includes(query.trim().toLowerCase()) && (status === 'All' || experience.status === status);
  }), [displayExperiences, query, status]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visibleListings = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const publishedCount = experiences.filter((experience) => experience.status === 'Published').length;
  const draftCount = experiences.filter((experience) => experience.status === 'Draft').length;

  const updateFilter = (setter) => (value) => { setter(value); setPage(1); };

  return (
    <main className="container py-4 sg-vendor-workspace">
      <Breadcrumb items={[{ label: 'Vendor Dashboard', path: '/vendor/dashboard' }, { label: 'My Listings', path: '/vendor/listings' }]} />
      <div className="row g-4">
        <div className="col-lg-3"><VendorSidebar /></div>
        <div className="col-lg-9">
          <header className="sg-workflow-heading sg-surface sg-vendor-heading">
            <div><span className="sg-eyebrow">Catalogue workspace</span><h1>My Listings</h1><p>Create, edit and manage your own food-experience listings.</p></div>
            <Link to="/vendor/experiences/new" className="btn btn-danger">＋ Add new listing</Link>
          </header>
          {error && <AlertPanel tone="danger" title="Listing action unavailable">{error}</AlertPanel>}

          <section className="row g-3 mb-4" aria-label="Listing metrics">
            <div className="col-4"><KpiCard icon="▦" label="Total listings" value={experiences.length} /></div>
            <div className="col-4"><KpiCard icon="✓" label="Published" value={publishedCount} tone="success" /></div>
            <div className="col-4"><KpiCard icon="▤" label="Drafts" value={draftCount} tone="warning" /></div>
          </section>
          <AlertPanel tone="info" className="mb-3">You may manage only your own food-experience listings. Publishing and approval rules remain unchanged.</AlertPanel>

          <div className="sg-listing-workspace">
            <section className="sg-table-card sg-vendor-section">
              <div className="sg-panel-heading"><div><span className="sg-eyebrow">Registry</span><h2>Your listings</h2></div><small>{filtered.length} result{filtered.length === 1 ? '' : 's'}</small></div>
              <div className="sg-vendor-filterbar">
                <label className="sg-search-field"><span className="visually-hidden">Search listings</span><input value={query} onChange={(event) => updateFilter(setQuery)(event.target.value)} className="form-control" placeholder="Search title, category or location" /></label>
                <label><span className="visually-hidden">Filter by status</span><select value={status} onChange={(event) => updateFilter(setStatus)(event.target.value)} className="form-select"><option>All</option><option>Published</option><option>Draft</option><option>Inactive</option></select></label>
              </div>

              {loading ? <div className="text-center py-5"><span className="spinner-border text-danger" aria-label="Loading listings" /></div> : visibleListings.length === 0 ? (
                <div className="sg-empty-state py-5"><span>🍜</span><strong>No listings found</strong><p>Adjust the filters or create a new food experience.</p></div>
              ) : <div className="table-responsive"><table className="table sg-data-table sg-listing-table align-middle mb-0"><thead><tr><th>Listing</th><th>Category / location</th><th>Price (SGD)</th><th>Status</th><th className="text-end">Actions</th></tr></thead><tbody>
                {visibleListings.map((experience) => <tr key={experience.food_experience_id}><td><div className="sg-listing-identity">{experience.image_url ? <img src={experience.image_url} alt="" /> : <span aria-hidden="true">🍜</span>}<strong>{experience.title}</strong></div></td><td>{experience.category?.category_name || 'Uncategorised'}<small>{experience.location?.address || 'Location not shown'}</small></td><td><strong>S${Number(experience.price_sgd || 0).toFixed(2)}</strong></td><td><StatusBadge status={experience.status} /></td><td><div className="sg-row-actions">
                  {experience.status === 'Published' && <Link to={`/experiences/${experience.food_experience_id}`} aria-label={`View ${experience.title}`}>View</Link>}
                  <Link to={`/vendor/experiences/${experience.food_experience_id}/edit`} aria-label={`Edit ${experience.title}`}>Edit</Link>
                  <Link to="/vendor/availability" aria-label={`Manage slots for ${experience.title}`}>Slots</Link>
                  {experience.status !== 'Inactive' && <button type="button" onClick={() => handleDelete(experience.food_experience_id, experience.title)}>Deactivate</button>}
                </div></td></tr>)}
              </tbody></table></div>}

              {!loading && filtered.length > 0 && <div className="sg-pagination-row"><small>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</small><div><button type="button" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>←</button><span>Page {page} of {totalPages}</span><button type="button" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}>→</button></div></div>}
            </section>

            <aside className="sg-listing-rail">
              <section className="sg-info-panel sg-info-panel--warm"><div className="sg-info-panel__heading"><span className="sg-info-panel__icon">＋</span><h5>Add or edit listing</h5></div><div className="sg-info-panel__body"><p>Use the existing full listing editor to manage descriptions, category, pricing and location details.</p><Link to="/vendor/experiences/new" className="btn btn-danger btn-sm w-100">Create listing</Link></div></section>
              <section className="sg-info-panel"><div className="sg-info-panel__heading"><span className="sg-info-panel__icon">▣</span><h5>Availability is separate</h5></div><div className="sg-info-panel__body"><p>After saving a listing, configure its dates and time slots in Availability Slots.</p><Link to="/vendor/availability">Manage availability →</Link></div></section>
              <section className="sg-info-panel"><div className="sg-info-panel__heading"><span className="sg-info-panel__icon">i</span><h5>Listing workflow</h5></div><div className="sg-info-panel__body"><ul><li>Drafts remain outside public discovery.</li><li>Published listings can be viewed by tourists.</li><li>Deactivation removes a listing from discovery.</li></ul></div></section>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
};

export default VendorListings;
