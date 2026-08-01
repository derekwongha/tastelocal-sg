import React, { useEffect, useMemo, useState } from 'react';
import { getAdminCategories, getAdminExperiences, createCategory, updateCategory, deleteCategory } from '../api/administration';
import AdminSidebar from '../components/AdminSidebar';
import Breadcrumb from '../components/Breadcrumb';
import { AlertPanel, KpiCard, StatusBadge } from '../components/UIPrimitives';
import { cleanPublicCategory, cleanPublicLabel } from '../utils/homepageDisplay';

const PAGE_SIZE = 6;

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [editLoading, setEditLoading] = useState(false);
  const [editOriginal, setEditOriginal] = useState(null);
  const [editTouched, setEditTouched] = useState({ name: false, description: false });
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);

  const fetchCategories = async () => {
    try {
      const [categoryData, experienceData] = await Promise.all([getAdminCategories(), getAdminExperiences()]);
      setCategories(categoryData);
      setExperiences(experienceData);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to load the category registry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!newCatName.trim()) return;
    setError(null); setSuccessMsg(null); setCreateLoading(true);
    try {
      await createCategory({ category_name: newCatName.trim(), description: newCatDesc.trim() });
      setSuccessMsg(`Category "${newCatName.trim()}" created successfully.`);
      setNewCatName(''); setNewCatDesc('');
      await fetchCategories();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.category_name?.join(' ') || 'Failed to create category. Ensure the name is unique.');
    } finally { setCreateLoading(false); }
  };

  const handleUpdate = async (id) => {
    if (!editName.trim()) return;
    setError(null); setSuccessMsg(null); setEditLoading(true);
    try {
      await updateCategory(id, {
        category_name: editTouched.name ? editName.trim() : editOriginal?.category_name,
        description: editTouched.description ? editDesc.trim() : editOriginal?.description,
        is_active: editActive,
      });
      setSuccessMsg('Category updated successfully.');
      setEditingId(null); setEditOriginal(null); setEditTouched({ name: false, description: false });
      await fetchCategories();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.category_name?.join(' ') || 'Failed to update category.');
    } finally { setEditLoading(false); }
  };

  const handleDelete = async (id, name) => {
    setError(null); setSuccessMsg(null);
    try {
      await deleteCategory(id);
      setSuccessMsg(`Category "${name}" deleted successfully.`);
      setDeleteConfirmId(null);
      await fetchCategories();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || `Failed to delete "${name}". It may be in use by food experiences.`);
    }
  };

  const startEdit = (category) => {
    const original = categories.find((item) => item.category_id === category.category_id) || category;
    setEditingId(category.category_id); setEditName(category.category_name); setEditDesc(category.description || ''); setEditActive(category.is_active); setEditOriginal(original); setEditTouched({ name: false, description: false }); setDeleteConfirmId(null);
  };

  const displayCategories = useMemo(() => categories.map(cleanPublicCategory), [categories]);
  const filtered = useMemo(() => displayCategories.filter((category) => {
    const matchesQuery = `${category.category_name} ${category.description || ''}`.toLowerCase().includes(query.trim().toLowerCase());
    const matchesStatus = statusFilter === 'All' || (statusFilter === 'Active' ? category.is_active : !category.is_active);
    return matchesQuery && matchesStatus;
  }), [displayCategories, query, statusFilter]);
  const listingCounts = useMemo(() => experiences.reduce((counts, experience) => {
    const categoryName = cleanPublicLabel(experience.category_name || '');
    return { ...counts, [categoryName]: (counts[categoryName] || 0) + 1 };
  }, {}), [experiences]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visibleCategories = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeCount = categories.filter((category) => category.is_active).length;
  const updateFilter = (setter) => (value) => { setter(value); setPage(1); };

  return (
    <main className="container py-4 sg-admin-workspace">
      <Breadcrumb items={[{ label: 'Admin Dashboard', path: '/admin/dashboard' }, { label: 'Categories', path: '/admin/categories' }]} />
      <div className="row g-4">
        <div className="col-lg-3"><AdminSidebar /></div>
        <div className="col-lg-9">
          <header className="sg-workflow-heading sg-surface sg-admin-heading"><div><span className="sg-eyebrow">Controlled vocabulary</span><h1>Category Management</h1><p>Create, edit and manage the predefined categories used by food-experience listings.</p></div></header>
          {successMsg && <AlertPanel tone="success" title="Category updated">{successMsg}</AlertPanel>}
          {error && <AlertPanel tone="danger" title="Category action unavailable">{error}</AlertPanel>}

          <section className="row g-3 mb-4" aria-label="Category metrics">
            <div className="col-4"><KpiCard icon="◇" label="Total categories" value={categories.length} /></div>
            <div className="col-4"><KpiCard icon="✓" label="Active categories" value={activeCount} tone="success" /></div>
            <div className="col-4"><KpiCard icon="–" label="Inactive categories" value={categories.length - activeCount} tone="warning" /></div>
          </section>

          <section className="sg-form-card sg-admin-category-form mb-3">
            <div className="sg-panel-heading"><div><span className="sg-eyebrow">Registry control</span><h2>Add new category</h2></div><small>Category names must be unique.</small></div>
            <form onSubmit={handleCreate}>
              <label><span>Category name *</span><input type="text" required className="form-control" placeholder="e.g. Street Food Trails" value={newCatName} onChange={(event) => setNewCatName(event.target.value)} /></label>
              <label><span>Description</span><textarea rows="2" className="form-control" placeholder="Describe how vendors should use this category" value={newCatDesc} onChange={(event) => setNewCatDesc(event.target.value)} /></label>
              <button type="submit" disabled={createLoading || !newCatName.trim()} className="btn btn-danger">{createLoading ? 'Adding…' : '＋ Add category'}</button>
            </form>
          </section>

          <AlertPanel tone="info" className="mb-3" title="How categories are used">Vendors select from active predefined categories when creating listings. Categories already used by an experience are protected from deletion.</AlertPanel>

          <section className="sg-table-card sg-admin-section">
            <div className="sg-panel-heading"><div><span className="sg-eyebrow">Category registry</span><h2>{filtered.length} categor{filtered.length === 1 ? 'y' : 'ies'}</h2></div><small>Listing counts use the current moderation inventory.</small></div>
            <div className="sg-admin-filterbar">
              <label className="sg-search-field"><span className="visually-hidden">Search categories</span><input className="form-control" value={query} onChange={(event) => updateFilter(setQuery)(event.target.value)} placeholder="Search categories" /></label>
              <label><span className="visually-hidden">Category status</span><select className="form-select" value={statusFilter} onChange={(event) => updateFilter(setStatusFilter)(event.target.value)}><option>All</option><option>Active</option><option>Inactive</option></select></label>
            </div>

            {loading ? <div className="text-center py-5"><span className="spinner-border text-danger" aria-label="Loading categories" /></div> : visibleCategories.length === 0 ? <p className="sg-empty-state py-5">No categories match these filters.</p> : <div className="table-responsive"><table className="table sg-data-table sg-category-table align-middle mb-0"><thead><tr><th>Category name</th><th>Description</th><th>Status</th><th>Listings</th><th className="text-end">Actions</th></tr></thead><tbody>
              {visibleCategories.map((category) => {
                const isEditing = editingId === category.category_id;
                return <tr key={category.category_id}><td>{isEditing ? <input className="form-control form-control-sm" value={editName} onChange={(event) => { setEditName(event.target.value); setEditTouched((current) => ({ ...current, name: true })); }} /> : <strong>◇ {category.category_name}</strong>}</td><td>{isEditing ? <input className="form-control form-control-sm" value={editDesc} onChange={(event) => { setEditDesc(event.target.value); setEditTouched((current) => ({ ...current, description: true })); }} /> : <span>{category.description || 'No description provided.'}</span>}</td><td>{isEditing ? <select className="form-select form-select-sm" value={editActive ? 'true' : 'false'} onChange={(event) => setEditActive(event.target.value === 'true')}><option value="true">Active</option><option value="false">Inactive</option></select> : <StatusBadge status={category.is_active ? 'Active' : 'Inactive'} />}</td><td><strong>{listingCounts[category.category_name] || 0}</strong></td><td><div className="sg-row-actions">
                  {isEditing ? <><button type="button" disabled={editLoading} onClick={() => handleUpdate(category.category_id)}>Save</button><button type="button" onClick={() => { setEditingId(null); setEditOriginal(null); setEditTouched({ name: false, description: false }); }}>Cancel</button></> : deleteConfirmId === category.category_id ? <><span>Delete?</span><button type="button" onClick={() => handleDelete(category.category_id, category.category_name)}>Yes</button><button type="button" onClick={() => setDeleteConfirmId(null)}>No</button></> : <><button type="button" onClick={() => startEdit(category)}>Edit</button><button type="button" onClick={() => setDeleteConfirmId(category.category_id)}>Delete</button></>}
                </div></td></tr>;
              })}
            </tbody></table></div>}
            {!loading && filtered.length > 0 && <div className="sg-pagination-row"><small>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</small><div><button type="button" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>←</button><span>Page {page} of {totalPages}</span><button type="button" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}>→</button></div></div>}
          </section>
        </div>
      </div>
    </main>
  );
};

export default AdminCategories;
