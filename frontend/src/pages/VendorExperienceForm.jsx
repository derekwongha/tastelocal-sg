import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { 
  getVendorExperienceDetail, 
  createVendorExperience, 
  updateVendorExperience,
  getCategories,
  getLocations 
} from '../api/experiences';
import VendorSidebar from '../components/VendorSidebar';
import Breadcrumb from '../components/Breadcrumb';
import { cleanPublicDescription, cleanPublicLabel } from '../utils/homepageDisplay';

const VendorExperienceForm = () => {
  const { id } = useParams();
  const isEditMode = !!id;
  const navigate = useNavigate();

  // Predefined lists
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceSgd, setPriceSgd] = useState('');
  const [status, setStatus] = useState('Draft');
  const [imageUrl, setImageUrl] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [locationId, setLocationId] = useState('');
  
  // To keep track of slots during edit mode
  const [timeslots, setTimeslots] = useState([]);
  const [originalDisplayFields, setOriginalDisplayFields] = useState(null);
  const [displayFieldsTouched, setDisplayFieldsTouched] = useState({ title: false, description: false });

  // Errors & Loading states
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState(null);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [loadingFetch, setLoadingFetch] = useState(isEditMode);

  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        const [cats, locs] = await Promise.all([
          getCategories(),
          getLocations()
        ]);
        setCategories(cats);
        setLocations(locs);
        
        // Default to first category and location if not editing
        if (!isEditMode) {
          if (cats.length > 0) setCategoryId(cats[0].category_id);
          if (locs.length > 0) setLocationId(locs[0].location_id);
        }
      } catch (err) {
        console.error('Failed to load form metadata:', err);
        setGeneralError('Failed to load categories or locations list.');
      }
    };

    loadDropdownData();
  }, [isEditMode]);

  useEffect(() => {
    if (isEditMode) {
      const loadExperience = async () => {
        try {
          const data = await getVendorExperienceDetail(id);
          setTitle(cleanPublicLabel(data.title || ''));
          setDescription(cleanPublicDescription(data.description || ''));
          setOriginalDisplayFields({ title: data.title, description: data.description });
          setDisplayFieldsTouched({ title: false, description: false });
          setPriceSgd(data.price_sgd);
          setStatus(data.status);
          setImageUrl(data.image_url || '');
          setCategoryId(data.category?.category_id || '');
          setLocationId(data.location?.location_id || '');
          setTimeslots(data.timeslots || []);
        } catch (err) {
          console.error('Failed to load experience details:', err);
          setGeneralError('Failed to load experience details for editing.');
        } finally {
          setLoadingFetch(false);
        }
      };

      loadExperience();
    }
  }, [id, isEditMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    setGeneralError(null);

    // Validation checks
    const parsedPrice = parseFloat(priceSgd);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setFieldErrors({ price_sgd: ['Price must be a positive SGD amount.'] });
      return;
    }

    if (!title.trim()) {
      setFieldErrors({ title: ['Title is required.'] });
      return;
    }

    if (!description.trim()) {
      setFieldErrors({ description: ['Description is required.'] });
      return;
    }

    // Publication guard (Rule 8)
    if (status === 'Published') {
      if (!isEditMode) {
        setGeneralError("New listings must be created in 'Draft' status first, and can only be 'Published' after adding at least one available time slot.");
        return;
      }
      if (timeslots.length === 0) {
        setGeneralError("A listing cannot be published without at least one available time slot. Please save as Draft, add timeslots, and then update to Published.");
        return;
      }
    }

    setLoadingSubmit(true);

    const payload = {
      title: isEditMode && !displayFieldsTouched.title ? originalDisplayFields?.title : title,
      description: isEditMode && !displayFieldsTouched.description ? originalDisplayFields?.description : description,
      price_sgd: parsedPrice.toFixed(2),
      status,
      image_url: imageUrl || null,
      category_id: parseInt(categoryId),
      location_id: parseInt(locationId)
    };

    try {
      if (isEditMode) {
        await updateVendorExperience(id, payload);
      } else {
        await createVendorExperience(payload);
      }
      navigate('/vendor/listings');
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data) {
        const errors = err.response.data;
        if (typeof errors === 'object' && !errors.non_field_errors) {
          setFieldErrors(errors);
        } else if (errors.non_field_errors) {
          setGeneralError(errors.non_field_errors.join(' '));
        } else {
          setGeneralError('Failed to save experience listing.');
        }
      } else {
        setGeneralError('Network error. Please try again.');
      }
    } finally {
      setLoadingSubmit(false);
    }
  };

  if (loadingFetch) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-danger my-5" role="status">
          <span className="visually-hidden">Loading details...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      {/* Top Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Vendor Dashboard', path: '/vendor/dashboard' },
        { label: 'My Listings', path: '/vendor/listings' },
        { label: isEditMode ? 'Edit Experience' : 'New Experience', path: isEditMode ? `/vendor/experiences/${id}/edit` : '/vendor/experiences/new' }
      ]} />

      <div className="row g-4">
        {/* Left Column: Vendor Navigation Sidebar */}
        <div className="col-lg-3">
          <VendorSidebar />
        </div>

        {/* Right Column: Experience Form */}
        <div className="col-lg-9">
          <div className="bg-white p-4 rounded border border-light shadow-sm mb-4">
            <span className="badge bg-danger-light text-danger px-3 py-2 mb-2">Vendor Partner Portal</span>
            <h2 className="fw-bold text-dark mb-1">
              {isEditMode ? 'Edit Food Experience' : 'Create New Food Experience'}
            </h2>
            <p className="text-muted small mb-0">
              {isEditMode ? 'Modify listing details and status.' : 'Define new culinary trails or hawker tours for tourists to discover and book.'}
            </p>
          </div>

          <div className="bg-white p-4 rounded border border-light shadow-sm">
            {generalError && (
              <div className="alert alert-danger border-0 text-start mb-4" role="alert">
                <span className="fw-bold">Error:</span> {generalError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label text-dark fw-semibold">Experience Title</label>
                <input
                  type="text"
                  className={`form-control bg-white text-dark ${fieldErrors.title ? 'is-invalid' : ''}`}
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); setDisplayFieldsTouched((current) => ({ ...current, title: true })); }}
                  placeholder="e.g. Traditional Hainanese Satay Grilling Tour"
                />
                {fieldErrors.title && (
                  <div className="invalid-feedback">{fieldErrors.title.join(' ')}</div>
                )}
              </div>

              <div className="mb-3">
                <label className="form-label text-dark fw-semibold">Description</label>
                <textarea
                  className={`form-control bg-white text-dark ${fieldErrors.description ? 'is-invalid' : ''}`}
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); setDisplayFieldsTouched((current) => ({ ...current, description: true })); }}
                  placeholder="Describe the experience in detail, outlining the stops, history, and food tasting items."
                  rows="5"
                />
                {fieldErrors.description && (
                  <div className="invalid-feedback">{fieldErrors.description.join(' ')}</div>
                )}
              </div>

              <div className="row mb-3">
                <div className="col-md-6 mb-3 mb-md-0">
                  <label className="form-label text-dark fw-semibold">Price (S$ SGD)</label>
                  <input
                    type="number"
                    step="0.01"
                    className={`form-control bg-white text-dark ${fieldErrors.price_sgd ? 'is-invalid' : ''}`}
                    value={priceSgd}
                    onChange={(e) => setPriceSgd(e.target.value)}
                    placeholder="e.g. 35.00"
                  />
                  {fieldErrors.price_sgd && (
                    <div className="invalid-feedback">{fieldErrors.price_sgd.join(' ')}</div>
                  )}
                  <span className="text-muted small d-block mt-1">Price must be a positive number.</span>
                </div>
                <div className="col-md-6">
                  <label className="form-label text-dark fw-semibold">Listing Status</label>
                  <select
                    className={`form-select bg-white text-dark ${fieldErrors.status ? 'is-invalid' : ''}`}
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="Draft">Draft</option>
                    <option value="Published">Published</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                  {fieldErrors.status && (
                    <div className="invalid-feedback">{fieldErrors.status.join(' ')}</div>
                  )}
                </div>
              </div>

              <div className="row mb-4">
                <div className="col-md-6 mb-3 mb-md-0">
                  <label className="form-label text-dark fw-semibold">Predefined Category</label>
                  <select
                    className={`form-select bg-white text-dark ${fieldErrors.category_id ? 'is-invalid' : ''}`}
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    {categories.map((cat) => (
                      <option key={cat.category_id} value={cat.category_id}>
                        {cleanPublicLabel(cat.category_name || '')}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.category_id && (
                    <div className="invalid-feedback">{fieldErrors.category_id.join(' ')}</div>
                  )}
                </div>
                <div className="col-md-6">
                  <label className="form-label text-dark fw-semibold">Predefined Location</label>
                  <select
                    className={`form-select bg-white text-dark ${fieldErrors.location_id ? 'is-invalid' : ''}`}
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                  >
                    {locations.map((loc) => (
                      <option key={loc.location_id} value={loc.location_id}>
                        {cleanPublicLabel(loc.address || '')}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.location_id && (
                    <div className="invalid-feedback">{fieldErrors.location_id.join(' ')}</div>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label text-dark fw-semibold">Image URL (Optional)</label>
                <input
                  type="text"
                  className={`form-control bg-white text-dark ${fieldErrors.image_url ? 'is-invalid' : ''}`}
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="e.g. https://images.unsplash.com/photo-example"
                />
                {fieldErrors.image_url && (
                  <div className="invalid-feedback">{fieldErrors.image_url.join(' ')}</div>
                )}
              </div>

              <div className="d-flex justify-content-end gap-2 border-top pt-4 mt-4">
                <Link to="/vendor/listings" className="btn btn-outline-secondary px-4 py-2">
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loadingSubmit}
                  className="btn btn-danger px-4 py-2 fw-bold"
                >
                  {loadingSubmit ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Saving...
                    </>
                  ) : 'Save Experience'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorExperienceForm;
