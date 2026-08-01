import React, { useEffect, useMemo, useState } from 'react';
import { getAdminExperiences, deactivateExperience, getAdminReviews, deleteReview, getAdminUsers } from '../api/administration';
import AdminSidebar from '../components/AdminSidebar';
import Breadcrumb from '../components/Breadcrumb';
import { AlertPanel, KpiCard, StatusBadge } from '../components/UIPrimitives';
import { cleanPublicDescription, cleanPublicLabel, cleanPublicNarrative } from '../utils/homepageDisplay';

const PAGE_SIZE = 6;

const toDisplayExperience = (experience) => ({
  ...experience,
  title: cleanPublicLabel(experience.title || ''),
  vendor_business_name: cleanPublicLabel(experience.vendor_business_name || ''),
  category_name: cleanPublicLabel(experience.category_name || ''),
  description: cleanPublicDescription(experience.description || ''),
});

const toDisplayReview = (review) => ({
  ...review,
  experience_title: cleanPublicLabel(review.experience_title || ''),
  tourist_name: cleanPublicLabel(review.tourist_name || ''),
  comment: cleanPublicNarrative(review.comment || ''),
});

const toDisplayUser = (user) => ({ ...user, full_name: cleanPublicLabel(user.full_name || '') });

const AdminModeration = () => {
  const [experiences, setExperiences] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [activeTab, setActiveTab] = useState('Experiences');
  const [deactivateConfirmId, setDeactivateConfirmId] = useState(null);
  const [deleteReviewConfirmId, setDeleteReviewConfirmId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [ratingFilter, setRatingFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const fetchData = async () => {
    try {
      const [experienceData, reviewData, userData] = await Promise.all([getAdminExperiences(), getAdminReviews(), getAdminUsers()]);
      setExperiences(experienceData); setReviews(reviewData); setUsers(userData); setError(null);
      setSelectedRecord((current) => {
        if (!current) return experienceData[0] ? { type: 'experience', data: experienceData[0] } : null;
        const collection = current.type === 'experience' ? experienceData : current.type === 'review' ? reviewData : userData;
        const key = current.type === 'experience' ? 'food_experience_id' : current.type === 'review' ? 'review_id' : 'user_id';
        const match = collection.find((item) => item[key] === current.data[key]);
        return match ? { type: current.type, data: match } : null;
      });
    } catch (err) {
      console.error(err);
      setError('Failed to fetch listing, review or user records.');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDeactivateExperience = async (id, title) => {
    setError(null); setSuccessMsg(null); setActionLoading(true);
    try {
      await deactivateExperience(id);
      setSuccessMsg(`Food experience "${title}" has been deactivated successfully.`);
      await fetchData();
    } catch (err) {
      console.error(err); setError(`Failed to deactivate "${title}".`);
    } finally { setActionLoading(false); setDeactivateConfirmId(null); }
  };

  const handleDeleteReview = async (id) => {
    setError(null); setSuccessMsg(null); setActionLoading(true);
    try {
      await deleteReview(id);
      setSuccessMsg('Review has been removed from the platform.');
      await fetchData();
    } catch (err) {
      console.error(err); setError('Failed to delete review.');
    } finally { setActionLoading(false); setDeleteReviewConfirmId(null); }
  };

  const switchTab = (tab) => {
    setActiveTab(tab); setQuery(''); setStatusFilter('All'); setRatingFilter('All'); setPage(1); setDeactivateConfirmId(null); setDeleteReviewConfirmId(null);
    const first = tab === 'Experiences' ? experiences[0] : tab === 'Reviews' ? reviews[0] : users[0];
    setSelectedRecord(first ? { type: tab === 'Experiences' ? 'experience' : tab === 'Reviews' ? 'review' : 'user', data: first } : null);
  };

  const displayExperiences = useMemo(() => experiences.map(toDisplayExperience), [experiences]);
  const displayReviews = useMemo(() => reviews.map(toDisplayReview), [reviews]);
  const displayUsers = useMemo(() => users.map(toDisplayUser), [users]);
  const displaySelectedRecord = useMemo(() => {
    if (!selectedRecord) return null;
    const cleaner = selectedRecord.type === 'experience' ? toDisplayExperience : selectedRecord.type === 'review' ? toDisplayReview : toDisplayUser;
    return { ...selectedRecord, data: cleaner(selectedRecord.data) };
  }, [selectedRecord]);

  const filteredExperiences = useMemo(() => displayExperiences.filter((experience) => {
    const text = `${experience.title} ${experience.vendor_business_name} ${experience.category_name}`.toLowerCase();
    return text.includes(query.trim().toLowerCase()) && (statusFilter === 'All' || experience.status === statusFilter);
  }), [displayExperiences, query, statusFilter]);
  const filteredReviews = useMemo(() => displayReviews.filter((review) => {
    const text = `${review.experience_title} ${review.tourist_name} ${review.comment}`.toLowerCase();
    return text.includes(query.trim().toLowerCase()) && (ratingFilter === 'All' || review.rating === Number(ratingFilter));
  }), [displayReviews, query, ratingFilter]);
  const filteredUsers = useMemo(() => displayUsers.filter((user) => {
    const text = `${user.full_name} ${user.username} ${user.email} ${user.role}`.toLowerCase();
    return text.includes(query.trim().toLowerCase()) && (statusFilter === 'All' || user.account_status === statusFilter);
  }), [displayUsers, query, statusFilter]);
  const currentRows = activeTab === 'Experiences' ? filteredExperiences : activeTab === 'Reviews' ? filteredReviews : filteredUsers;
  const totalPages = Math.max(1, Math.ceil(currentRows.length / PAGE_SIZE));
  const visibleRows = currentRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const publishedCount = experiences.filter((experience) => experience.status === 'Published').length;
  const inactiveCount = experiences.filter((experience) => experience.status === 'Inactive').length;

  return (
    <main className="container py-4 sg-admin-workspace">
      <Breadcrumb items={[{ label: 'Admin Dashboard', path: '/admin/dashboard' }, { label: 'Listing and Review Moderation', path: '/admin/moderation' }]} />
      <div className="row g-4">
        <div className="col-lg-3"><AdminSidebar /></div>
        <div className="col-lg-9">
          <header className="sg-workflow-heading sg-surface sg-admin-heading"><div><span className="sg-eyebrow">Content quality</span><h1>Listing and Review Moderation</h1><p>Inspect listings and tourist reviews using the existing administrator moderation rules.</p></div></header>
          {successMsg && <AlertPanel tone="success" title="Moderation completed">{successMsg}</AlertPanel>}
          {error && <AlertPanel tone="danger" title="Moderation unavailable">{error}</AlertPanel>}

          <section className="row g-3 mb-4" aria-label="Moderation metrics">
            <div className="col-6 col-xl-3"><KpiCard icon="▤" label="Total listings" value={experiences.length} /></div>
            <div className="col-6 col-xl-3"><KpiCard icon="✓" label="Published" value={publishedCount} tone="success" /></div>
            <div className="col-6 col-xl-3"><KpiCard icon="–" label="Inactive listings" value={inactiveCount} tone="warning" /></div>
            <div className="col-6 col-xl-3"><KpiCard icon="★" label="Review records" value={reviews.length} /></div>
          </section>

          <nav className="sg-status-tabs sg-admin-tabs" aria-label="Moderation registries">
            <button type="button" className={activeTab === 'Experiences' ? 'is-active' : ''} onClick={() => switchTab('Experiences')}>Listings ({experiences.length})</button>
            <button type="button" className={activeTab === 'Reviews' ? 'is-active' : ''} onClick={() => switchTab('Reviews')}>Reviews ({reviews.length})</button>
            <button type="button" className={activeTab === 'Users' ? 'is-active' : ''} onClick={() => switchTab('Users')}>User directory ({users.length})</button>
          </nav>

          <div className="sg-moderation-layout">
            <section className="sg-table-card sg-admin-section">
              <div className="sg-panel-heading"><div><span className="sg-eyebrow">{activeTab} registry</span><h2>{currentRows.length} record{currentRows.length === 1 ? '' : 's'}</h2></div><small>Select a row for details.</small></div>
              <div className="sg-admin-filterbar">
                <label className="sg-search-field"><span className="visually-hidden">Search {activeTab.toLowerCase()}</span><input className="form-control" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder={`Search ${activeTab.toLowerCase()}`} /></label>
                {activeTab === 'Reviews' ? <label><span className="visually-hidden">Filter rating</span><select className="form-select" value={ratingFilter} onChange={(event) => { setRatingFilter(event.target.value); setPage(1); }}><option value="All">All ratings</option>{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} stars</option>)}</select></label> : <label><span className="visually-hidden">Filter status</span><select className="form-select" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}><option>All</option>{(activeTab === 'Experiences' ? ['Published', 'Draft', 'Inactive'] : ['Active', 'Inactive']).map((status) => <option key={status}>{status}</option>)}</select></label>}
              </div>

              {loading ? <div className="text-center py-5"><span className="spinner-border text-danger" aria-label="Loading moderation records" /></div> : visibleRows.length === 0 ? <p className="sg-empty-state py-5">No records match these filters.</p> : <div className="table-responsive">
                {activeTab === 'Experiences' && <table className="table sg-data-table sg-moderation-table align-middle mb-0"><thead><tr><th>Listing</th><th>Vendor / category</th><th>Status</th><th className="text-end">Actions</th></tr></thead><tbody>{visibleRows.map((experience) => <tr key={experience.food_experience_id} onClick={() => setSelectedRecord({ type: 'experience', data: experience })} className={selectedRecord?.type === 'experience' && selectedRecord.data.food_experience_id === experience.food_experience_id ? 'is-selected' : ''}><td><strong>{experience.title}</strong><small>S${Number(experience.price_sgd || 0).toFixed(2)}</small></td><td>{experience.vendor_business_name}<small>{experience.category_name}</small></td><td><StatusBadge status={experience.status} /></td><td><div className="sg-row-actions">{experience.status !== 'Inactive' ? deactivateConfirmId === experience.food_experience_id ? <><span>Deactivate?</span><button type="button" disabled={actionLoading} onClick={(event) => { event.stopPropagation(); handleDeactivateExperience(experience.food_experience_id, experience.title); }}>Yes</button><button type="button" onClick={(event) => { event.stopPropagation(); setDeactivateConfirmId(null); }}>Cancel</button></> : <button type="button" onClick={(event) => { event.stopPropagation(); setSelectedRecord({ type: 'experience', data: experience }); setDeactivateConfirmId(experience.food_experience_id); }}>Deactivate</button> : <span>Deactivated</span>}</div></td></tr>)}</tbody></table>}
                {activeTab === 'Reviews' && <table className="table sg-data-table sg-moderation-table align-middle mb-0"><thead><tr><th>Experience / reviewer</th><th>Rating</th><th>Comment preview</th><th className="text-end">Actions</th></tr></thead><tbody>{visibleRows.map((review) => <tr key={review.review_id} onClick={() => setSelectedRecord({ type: 'review', data: review })} className={selectedRecord?.type === 'review' && selectedRecord.data.review_id === review.review_id ? 'is-selected' : ''}><td><strong>{review.experience_title}</strong><small>{review.tourist_name || 'Tourist'}</small></td><td><span className="sg-rating-text">★ {review.rating}/5</span></td><td><span className="sg-comment-preview">{review.comment}</span></td><td><div className="sg-row-actions">{deleteReviewConfirmId === review.review_id ? <><span>Remove?</span><button type="button" disabled={actionLoading} onClick={(event) => { event.stopPropagation(); handleDeleteReview(review.review_id); }}>Yes</button><button type="button" onClick={(event) => { event.stopPropagation(); setDeleteReviewConfirmId(null); }}>Cancel</button></> : <button type="button" onClick={(event) => { event.stopPropagation(); setSelectedRecord({ type: 'review', data: review }); setDeleteReviewConfirmId(review.review_id); }}>Remove review</button>}</div></td></tr>)}</tbody></table>}
                {activeTab === 'Users' && <table className="table sg-data-table sg-moderation-table align-middle mb-0"><thead><tr><th>Name</th><th>Username / email</th><th>Role</th><th>Status</th></tr></thead><tbody>{visibleRows.map((user) => <tr key={user.user_id} onClick={() => setSelectedRecord({ type: 'user', data: user })} className={selectedRecord?.type === 'user' && selectedRecord.data.user_id === user.user_id ? 'is-selected' : ''}><td><strong>{user.full_name || 'Unnamed user'}</strong></td><td>{user.username}<small>{user.email}</small></td><td><StatusBadge status={user.role} /></td><td><StatusBadge status={user.account_status} /></td></tr>)}</tbody></table>}
              </div>}
              {!loading && currentRows.length > 0 && <div className="sg-pagination-row"><small>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, currentRows.length)} of {currentRows.length}</small><div><button type="button" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>←</button><span>Page {page} of {totalPages}</span><button type="button" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}>→</button></div></div>}
            </section>

            <aside className="sg-info-panel sg-moderation-detail">
              <div className="sg-info-panel__heading"><span className="sg-info-panel__icon">i</span><h5>Record details</h5></div><div className="sg-info-panel__body">
                {!displaySelectedRecord ? <p className="sg-empty-state">Select a record for details.</p> : displaySelectedRecord.type === 'experience' ? <><StatusBadge status={displaySelectedRecord.data.status} /><h3>{displaySelectedRecord.data.title}</h3><dl className="sg-detail-list"><div><dt>Vendor</dt><dd>{displaySelectedRecord.data.vendor_business_name}</dd></div><div><dt>Category</dt><dd>{displaySelectedRecord.data.category_name}</dd></div><div><dt>Price</dt><dd>S${Number(displaySelectedRecord.data.price_sgd || 0).toFixed(2)}</dd></div><div><dt>Description</dt><dd>{displaySelectedRecord.data.description || 'No description provided.'}</dd></div></dl></> : displaySelectedRecord.type === 'review' ? <><span className="sg-rating-text">{'★'.repeat(displaySelectedRecord.data.rating)}{'☆'.repeat(5 - displaySelectedRecord.data.rating)}</span><h3>{displaySelectedRecord.data.experience_title}</h3><dl className="sg-detail-list"><div><dt>Reviewer</dt><dd>{displaySelectedRecord.data.tourist_name || 'Tourist'}</dd></div><div><dt>Submitted</dt><dd>{displaySelectedRecord.data.created_at ? new Date(displaySelectedRecord.data.created_at).toLocaleDateString('en-SG') : 'Not recorded'}</dd></div><div><dt>Review comment</dt><dd>{displaySelectedRecord.data.comment}</dd></div></dl></> : <><StatusBadge status={displaySelectedRecord.data.account_status} /><h3>{displaySelectedRecord.data.full_name || displaySelectedRecord.data.username}</h3><dl className="sg-detail-list"><div><dt>Username</dt><dd>{displaySelectedRecord.data.username}</dd></div><div><dt>Email</dt><dd>{displaySelectedRecord.data.email}</dd></div><div><dt>Role</dt><dd>{displaySelectedRecord.data.role}</dd></div></dl></>}
              </div>
            </aside>
          </div>
          <AlertPanel tone="info" className="mt-3" title="Moderation rules">Administrators may deactivate listings and remove tourist reviews. Existing ownership, visibility, and deletion rules remain unchanged; no audit state is added.</AlertPanel>
        </div>
      </div>
    </main>
  );
};

export default AdminModeration;
