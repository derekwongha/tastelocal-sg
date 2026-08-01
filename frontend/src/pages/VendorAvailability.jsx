import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  getVendorExperiences, 
  getVendorExperienceDetail, 
  createTimeSlot, 
  deleteTimeSlot 
} from '../api/experiences';
import VendorSidebar from '../components/VendorSidebar';
import Breadcrumb from '../components/Breadcrumb';
import { InfoPanel, StatusBadge } from '../components/UIPrimitives';
import { toPublicExperience } from '../utils/homepageDisplay';

const VendorAvailability = () => {
  const [experiences, setExperiences] = useState([]);
  const [selectedExpId, setSelectedExpId] = useState('');
  const [experienceDetail, setExperienceDetail] = useState(null);

  // Form states for new slot
  const [slotDate, setSlotDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // States
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    const fetchExperiences = async () => {
      try {
        const data = await getVendorExperiences();
        setExperiences(data);
        if (data.length > 0) {
          setSelectedExpId(data[0].food_experience_id);
        }
      } catch (err) {
        console.error('Failed to load experiences:', err);
        setGeneralError('Failed to load experiences list.');
      } finally {
        setLoadingList(false);
      }
    };
    fetchExperiences();
  }, []);

  const loadSlots = async (expId) => {
    if (!expId) return;
    setLoadingDetail(true);
    setGeneralError(null);
    setSuccessMsg(null);
    try {
      const data = await getVendorExperienceDetail(expId);
      setExperienceDetail(data);
    } catch (err) {
      console.error('Failed to load slots details:', err);
      setGeneralError('Failed to retrieve experience slots.');
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (selectedExpId) {
      loadSlots(selectedExpId);
    } else {
      setExperienceDetail(null);
    }
  }, [selectedExpId]);

  const handleCreateSlot = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    setGeneralError(null);
    setSuccessMsg(null);

    // Frontend validations
    if (!slotDate) {
      setFieldErrors({ slot_date: 'Date is required.' });
      return;
    }
    if (!startTime) {
      setFieldErrors({ start_time: 'Start time is required.' });
      return;
    }
    if (!endTime) {
      setFieldErrors({ end_time: 'End time is required.' });
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    if (slotDate < today) {
      setFieldErrors({ slot_date: 'Date cannot be in the past.' });
      return;
    }

    if (startTime >= endTime) {
      setFieldErrors({ start_time: 'Start time must be before end time.' });
      return;
    }

    setLoadingSubmit(true);

    const payload = {
      food_experience: parseInt(selectedExpId),
      slot_date: slotDate,
      start_time: startTime + ':00', // ensure HH:MM:SS format
      end_time: endTime + ':00'
    };

    try {
      await createTimeSlot(payload);
      setSuccessMsg('Availability slot added successfully!');
      setSlotDate('');
      setStartTime('');
      setEndTime('');
      await loadSlots(selectedExpId);
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data) {
        const errors = err.response.data;
        if (typeof errors === 'object' && !errors.non_field_errors) {
          setFieldErrors(errors);
        } else if (errors.non_field_errors) {
          setGeneralError(errors.non_field_errors.join(' '));
        } else {
          setGeneralError('Failed to create availability slot.');
        }
      } else {
        setGeneralError('Network error. Please try again.');
      }
    } finally {
      setLoadingSubmit(false);
    }
  };

  const handleDeleteSlot = async (slotId) => {
    if (window.confirm('Are you sure you want to remove this availability slot?')) {
      try {
        await deleteTimeSlot(slotId);
        setSuccessMsg('Availability slot removed.');
        await loadSlots(selectedExpId);
      } catch (err) {
        console.error('Delete slot failed:', err);
        setGeneralError('Failed to delete time slot.');
      }
    }
  };

  // Compute availability summary details
  const slotsList = experienceDetail?.timeslots || [];
  const totalSlots = slotsList.length;
  const availableSlots = slotsList.filter(s => s.availability_status === 'Available').length;
  const unavailableSlots = slotsList.filter(s => s.availability_status !== 'Available').length;
  const displayExperiences = useMemo(() => experiences.map(toPublicExperience), [experiences]);

  return (
    <div className="sg-content-shell">
      {/* Top Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Vendor Dashboard', path: '/vendor/dashboard' },
        { label: 'Availability Slots', path: '/vendor/availability' }
      ]} />

      <div className="row g-4">
        {/* Left Column: Vendor Sidebar */}
        <div className="col-lg-3">
          <VendorSidebar />
        </div>

        {/* Right Columns */}
        <div className="col-lg-9">
          <div className="sg-surface p-4 mb-4">
            <span className="sg-eyebrow">Vendor Workspace</span>
            <h1 className="sg-page-title">Manage Availability Slots</h1>
            <p className="text-muted small mb-0">Add, edit, and remove date/time slots so tourists can book when you are available.</p>
          </div>

          {generalError && (
            <div className="alert alert-danger border-0 mb-4" role="alert">
              <strong>Error:</strong> {generalError}
            </div>
          )}

          {successMsg && (
            <div className="alert alert-success border-0 mb-4" role="alert">
              <strong>Success:</strong> {successMsg}
            </div>
          )}

          {loadingList ? (
            <div className="d-flex justify-content-center py-5">
              <div className="spinner-border text-danger" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : experiences.length === 0 ? (
            <div className="text-center py-5 bg-white rounded border shadow-sm">
              <span className="fs-1 d-block mb-3">📅</span>
              <h5 className="fw-bold text-dark mb-2">No Active Experiences Found</h5>
              <p className="text-muted small mb-4">Create an experience listing first to manage slots.</p>
              <Link to="/vendor/experiences/new" className="btn btn-danger btn-sm">
                Create Experience
              </Link>
            </div>
          ) : (
            <div className="row g-4">
              {/* Center Panel: Selector & Form & Existing Table */}
              <div className="col-xl-8">
                <div className="sg-table-card mb-4">
                  <div className="mb-4">
                    <label className="form-label text-dark fw-bold">Select Food Experience</label>
                    <select
                      className="form-select text-dark bg-white"
                      value={selectedExpId}
                      onChange={(e) => setSelectedExpId(e.target.value)}
                    >
                      {displayExperiences.map((exp) => (
                        <option key={exp.food_experience_id} value={exp.food_experience_id}>
                          {exp.title} ({exp.status})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Add New Slot form panel */}
                  <h5 className="fw-bold text-dark mb-3 border-bottom pb-2">Add New Slot</h5>
                  <form onSubmit={handleCreateSlot} className="row g-2 align-items-end mb-4">
                    <div className="col-sm-4">
                      <label className="small text-muted mb-1 d-block">Date</label>
                      <input 
                        type="date"
                        className={`form-control form-control-sm text-dark bg-white ${fieldErrors.slot_date ? 'is-invalid' : ''}`}
                        value={slotDate}
                        onChange={(e) => setSlotDate(e.target.value)}
                      />
                    </div>
                    <div className="col-6 col-sm-3">
                      <label className="small text-muted mb-1 d-block">Start Time</label>
                      <input 
                        type="time"
                        className={`form-control form-control-sm text-dark bg-white ${fieldErrors.start_time ? 'is-invalid' : ''}`}
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                      />
                    </div>
                    <div className="col-6 col-sm-3">
                      <label className="small text-muted mb-1 d-block">End Time</label>
                      <input 
                        type="time"
                        className={`form-control form-control-sm text-dark bg-white ${fieldErrors.end_time ? 'is-invalid' : ''}`}
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                      />
                    </div>
                    <div className="col-12 col-sm-2 mt-2 mt-sm-0">
                      <button 
                        type="submit"
                        disabled={loadingSubmit}
                        className="btn btn-sm btn-danger w-100"
                      >
                        {loadingSubmit ? '...' : 'Add Slot'}
                      </button>
                    </div>
                  </form>

                  <h5 className="fw-bold text-dark mb-3 border-bottom pb-2">Existing Slots</h5>
                  {loadingDetail ? (
                    <div className="d-flex justify-content-center py-4">
                      <div className="spinner-border spinner-border-sm text-danger" role="status" />
                    </div>
                  ) : slotsList.length === 0 ? (
                    <p className="small text-muted text-center py-4">No slots scheduled yet.</p>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead>
                          <tr className="text-muted small">
                            <th>Date</th>
                            <th>Time</th>
                            <th>Status</th>
                            <th className="text-end">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {slotsList.map((slot) => (
                            <tr key={slot.timeslot_id}>
                              <td className="small text-dark fw-bold">📅 {slot.slot_date}</td>
                              <td className="small text-muted">🕒 {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}</td>
                              <td>
                                <StatusBadge status={slot.availability_status} />
                              </td>
                              <td className="text-end">
                                <button 
                                  onClick={() => handleDeleteSlot(slot.timeslot_id)}
                                  className="btn btn-xs btn-outline-danger py-0 px-2"
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel: Workflow rules & slot counts summary (WF14 layout) */}
              <div className="col-xl-4">
                <InfoPanel title="Workflow Rules" icon="i" tone="warm" className="mb-4">
                  <ol className="list-unstyled space-y-3 small text-muted">
                    <li className="mb-3">
                      <strong>1. Singular Bookings</strong>
                      <p className="mb-0">One availability slot supports precisely one approved booking request.</p>
                    </li>
                    <li className="mb-3">
                      <strong>2. Automatic Locking</strong>
                      <p className="mb-0">Once a booking is approved, the associated slot status automatically becomes Unavailable.</p>
                    </li>
                    <li>
                      <strong>3. Restore Status</strong>
                      <p className="mb-0">If a confirmed booking is cancelled, slot status will be automatically restored to Available.</p>
                    </li>
                  </ol>
                </InfoPanel>

                <InfoPanel title="Slot Summary" icon="◷">
                  <ul className="list-unstyled space-y-2 small">
                    <li className="mb-2"><strong>Total Slots:</strong> {totalSlots}</li>
                    <li className="mb-2"><StatusBadge status="Available" /> <strong>{availableSlots}</strong></li>
                    <li><StatusBadge status="Unavailable" /> <strong>{unavailableSlots}</strong></li>
                  </ul>
                </InfoPanel>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorAvailability;
