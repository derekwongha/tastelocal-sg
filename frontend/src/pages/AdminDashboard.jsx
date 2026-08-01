import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminVendors, getAdminCategories, getAdminExperiences, getAdminReviews, getAdminUsers } from '../api/administration';
import AdminSidebar from '../components/AdminSidebar';
import Breadcrumb from '../components/Breadcrumb';
import { AlertPanel, KpiCard, StatusBadge } from '../components/UIPrimitives';
import { cleanPublicLabel, cleanPublicNarrative } from '../utils/homepageDisplay';

const AdminDashboard = () => {
  const [data, setData] = useState({ vendors: [], categories: [], experiences: [], reviews: [], users: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [vendors, categories, experiences, reviews, users] = await Promise.all([
          getAdminVendors(), getAdminCategories(), getAdminExperiences(), getAdminReviews(), getAdminUsers(),
        ]);
        setData({ vendors, categories, experiences, reviews, users });
      } catch (err) {
        console.error('Failed to load dashboard stats:', err);
        setError('Administrative workspace data could not be loaded.');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const summary = useMemo(() => ({
    users: data.users.length,
    vendors: data.vendors.length,
    pendingVendors: data.vendors.filter((vendor) => vendor.approval_status === 'Pending').length,
    categories: data.categories.length,
    activeCategories: data.categories.filter((category) => category.is_active).length,
    listings: data.experiences.length,
    publishedListings: data.experiences.filter((experience) => experience.status === 'Published').length,
    inactiveListings: data.experiences.filter((experience) => experience.status === 'Inactive').length,
    reviews: data.reviews.length,
  }), [data]);

  const displayVendors = useMemo(() => data.vendors.map((vendor) => ({
    ...vendor,
    business_name: cleanPublicLabel(vendor.business_name || ''),
    user: vendor.user ? { ...vendor.user, full_name: cleanPublicLabel(vendor.user.full_name || '') } : vendor.user,
  })), [data.vendors]);
  const displayReviews = useMemo(() => data.reviews.map((review) => ({
    ...review,
    experience_title: cleanPublicLabel(review.experience_title || ''),
    tourist_name: cleanPublicLabel(review.tourist_name || ''),
    comment: cleanPublicNarrative(review.comment || ''),
  })), [data.reviews]);
  const pendingVendors = displayVendors.filter((vendor) => vendor.approval_status === 'Pending').slice(0, 4);
  const recentReviews = [...displayReviews].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 4);

  return (
    <main className="container py-4 sg-admin-workspace">
      <Breadcrumb items={[{ label: 'Admin Dashboard', path: '/admin/dashboard' }]} />
      <div className="row g-4">
        <div className="col-lg-3"><AdminSidebar /></div>
        <div className="col-lg-9">
          <header className="sg-workflow-heading sg-surface sg-admin-heading">
            <div><span className="sg-eyebrow">Platform administration</span><h1>Administrator Dashboard</h1><p>Review platform inventory, vendor applications, categories and moderation activity.</p></div>
            <Link to="/admin/vendors" className="btn btn-danger">Review applications</Link>
          </header>
          {error && <AlertPanel tone="danger" title="Dashboard unavailable">{error}</AlertPanel>}

          {loading ? <div className="sg-surface p-5 text-center"><span className="spinner-border text-danger" aria-label="Loading administrator dashboard" /></div> : <>
            <section className="row g-3 mb-4" aria-label="Administrator metrics">
              <div className="col-6 col-xl-3"><KpiCard icon="♙" label="Registered users" value={summary.users} helper="All account roles" /></div>
              <div className="col-6 col-xl-3"><KpiCard icon="店" label="Vendor profiles" value={summary.vendors} tone="success" helper={`${summary.pendingVendors} awaiting review`} /></div>
              <div className="col-6 col-xl-3"><KpiCard icon="▦" label="Food listings" value={summary.listings} tone="warning" helper={`${summary.publishedListings} published`} /></div>
              <div className="col-6 col-xl-3"><KpiCard icon="★" label="Tourist reviews" value={summary.reviews} helper="Moderation inventory" /></div>
            </section>

            <section className="sg-surface sg-admin-section mb-4">
              <div className="sg-panel-heading"><div><span className="sg-eyebrow">Common tasks</span><h2>Quick actions</h2></div></div>
              <div className="sg-admin-action-grid">
                <Link to="/admin/vendors"><span>▤</span><strong>Vendor applications</strong><small>{summary.pendingVendors} pending application{summary.pendingVendors === 1 ? '' : 's'}</small></Link>
                <Link to="/admin/categories"><span>◇</span><strong>Category management</strong><small>{summary.activeCategories} active categories</small></Link>
                <Link to="/admin/moderation"><span>⚑</span><strong>Listing moderation</strong><small>{summary.inactiveListings} inactive listings</small></Link>
                <Link to="/admin/moderation"><span>★</span><strong>Review moderation</strong><small>{summary.reviews} review records</small></Link>
              </div>
            </section>

            <div className="sg-admin-dashboard-grid">
              <section className="sg-table-card sg-admin-section">
                <div className="sg-panel-heading"><div><span className="sg-eyebrow">Current inventory</span><h2>Content operations summary</h2></div><Link to="/admin/moderation">Open moderation</Link></div>
                <div className="sg-admin-inventory-grid">
                  <div><span>Categories</span><strong>{summary.categories}</strong><small>{summary.activeCategories} active</small></div>
                  <div><span>Listings</span><strong>{summary.listings}</strong><small>{summary.publishedListings} published</small></div>
                  <div><span>Inactive listings</span><strong>{summary.inactiveListings}</strong><small>Retained in registry</small></div>
                  <div><span>Reviews</span><strong>{summary.reviews}</strong><small>Available to moderate</small></div>
                </div>
                <AlertPanel tone="info" className="mt-3">Counts reflect current administrator API records. No projected trends or unsupported analytics are displayed.</AlertPanel>
              </section>

              <section className="sg-table-card sg-admin-section">
                <div className="sg-panel-heading"><h2>Pending vendor applications</h2><Link to="/admin/vendors">View all</Link></div>
                {pendingVendors.length === 0 ? <p className="sg-empty-state py-4">No vendor applications are awaiting review.</p> : <ul className="sg-admin-record-list">
                  {pendingVendors.map((vendor) => <li key={vendor.vendor_profile_id}><span aria-hidden="true">店</span><div><strong>{vendor.business_name}</strong><small>{vendor.user?.full_name || vendor.user?.username || 'Vendor applicant'}</small></div><StatusBadge status={vendor.approval_status} /></li>)}
                </ul>}
              </section>
            </div>

            <div className="row g-3 mt-1">
              <div className="col-lg-7"><section className="sg-table-card sg-admin-section h-100"><div className="sg-panel-heading"><h2>Recent review records</h2><Link to="/admin/moderation">Moderate reviews</Link></div>
                {recentReviews.length === 0 ? <p className="sg-empty-state py-4">No review records are available.</p> : <div className="table-responsive"><table className="table sg-data-table align-middle mb-0"><thead><tr><th>Experience</th><th>Reviewer</th><th>Rating</th><th>Created</th></tr></thead><tbody>{recentReviews.map((review) => <tr key={review.review_id}><td><strong>{review.experience_title}</strong></td><td>{review.tourist_name || 'Tourist'}</td><td><span className="sg-rating-text">★ {review.rating}/5</span></td><td>{review.created_at ? new Date(review.created_at).toLocaleDateString('en-SG') : 'Not recorded'}</td></tr>)}</tbody></table></div>}
              </section></div>
              <div className="col-lg-5"><section className="sg-surface sg-admin-section h-100"><div className="sg-panel-heading"><h2>Operational notices</h2></div><ul className="sg-admin-notice-list"><li><span className="sg-notice-warning">!</span><div><strong>{summary.pendingVendors} vendor applications</strong><small>Awaiting an administrator decision</small></div></li><li><span className="sg-notice-info">i</span><div><strong>{summary.inactiveListings} inactive listings</strong><small>Retained in the moderation registry</small></div></li><li><span className="sg-notice-success">✓</span><div><strong>{summary.activeCategories} active categories</strong><small>Available for vendor listing forms</small></div></li></ul></section></div>
            </div>
          </>}
        </div>
      </div>
    </main>
  );
};

export default AdminDashboard;
