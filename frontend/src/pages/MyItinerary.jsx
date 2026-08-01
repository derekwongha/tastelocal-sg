import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getItinerary, removeItemFromItinerary, updateItineraryItem } from '../api/itinerary';
import AccountSidebar from '../components/AccountSidebar';
import Breadcrumb from '../components/Breadcrumb';
import { KpiCard } from '../components/UIPrimitives';
import { cleanPublicLabel, toPublicExperience } from '../utils/homepageDisplay';

const formatDay = (value) => new Date(`${value}T00:00:00`).toLocaleDateString('en-SG', {
  weekday: 'short', day: 'numeric', month: 'short'
});

const MyItinerary = () => {
  const [itinerary, setItinerary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [editStates, setEditStates] = useState({});
  const [updatingId, setUpdatingId] = useState(null);
  const [removeConfirmId, setRemoveConfirmId] = useState(null);
  const [activeGroup, setActiveGroup] = useState('unscheduled');

  const fetchItinerary = async () => {
    try {
      const data = await getItinerary();
      setItinerary(data);
      const initialEdits = {};
      (data?.items || []).forEach((item) => {
        initialEdits[item.itinerary_item_id] = {
          planned_date: item.planned_date || '',
          planned_time: item.planned_time ? item.planned_time.substring(0, 5) : ''
        };
      });
      setEditStates(initialEdits);

      const validGroups = [...new Set((data?.items || []).map((item) => item.planned_date).filter(Boolean))].sort();
      if ((data?.items || []).some((item) => !item.planned_date)) validGroups.push('unscheduled');
      setActiveGroup((current) => validGroups.includes(current) ? current : (validGroups[0] || 'unscheduled'));
    } catch (err) {
      console.error('Failed to fetch itinerary:', err);
      setError('Could not retrieve your itinerary planner.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItinerary(); }, []);

  const items = useMemo(() => (itinerary?.items || []).map((item) => ({
    ...item,
    food_experience: toPublicExperience(item.food_experience || {}),
  })), [itinerary]);
  const dayKeys = useMemo(() => [...new Set(items.map((item) => item.planned_date).filter(Boolean))].sort(), [items]);
  const hasUnscheduled = items.some((item) => !item.planned_date);
  const visibleItems = items
    .filter((item) => activeGroup === 'unscheduled' ? !item.planned_date : item.planned_date === activeGroup)
    .sort((a, b) => (a.planned_time || '99:99').localeCompare(b.planned_time || '99:99') || (a.sequence_order || 0) - (b.sequence_order || 0));
  const destinations = new Set(items.map((item) => item.food_experience?.location?.address).filter(Boolean));

  const handleInputChange = (itemId, field, value) => setEditStates((current) => ({
    ...current, [itemId]: { ...current[itemId], [field]: value }
  }));

  const handleSaveSchedule = async (itemId) => {
    setError(null);
    setSuccessMsg(null);
    setUpdatingId(itemId);
    const schedule = editStates[itemId];
    try {
      await updateItineraryItem(itemId, {
        planned_date: schedule.planned_date || null,
        planned_time: schedule.planned_time ? `${schedule.planned_time}:00` : null
      });
      setSuccessMsg('Itinerary schedule saved. This did not create a booking request.');
      await fetchItinerary();
    } catch (err) {
      console.error('Failed to update itinerary schedule:', err);
      setError('Failed to save schedule changes. Check the date and time, then try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (itemId, title) => {
    setError(null);
    setSuccessMsg(null);
    try {
      await removeItemFromItinerary(itemId);
      setSuccessMsg(`Removed "${title}" from your itinerary.`);
      setRemoveConfirmId(null);
      await fetchItinerary();
    } catch (err) {
      console.error('Failed to remove itinerary item:', err);
      setError('Could not remove this itinerary item.');
    }
  };

  if (loading) return <div className="sg-public-loading py-5"><div className="spinner-border text-danger" role="status" /><span>Loading your itinerary…</span></div>;

  return (
    <main className="sg-content-shell sg-itinerary-page">
      <Breadcrumb items={[{ label: 'My Account', path: '/profile' }, { label: 'My Itinerary', path: '/tourist/itinerary' }]} />
      <div className="row g-4">
        <aside className="col-lg-3"><AccountSidebar /></aside>
        <div className="col-lg-9">
          <header className="sg-workflow-heading sg-panel">
            <div><span className="sg-eyebrow">Itinerary planner</span><h1>My itinerary</h1><p>Organise saved food experiences into practical day-by-day plans.</p></div>
            <Link to="/" className="btn btn-danger">Add experience</Link>
          </header>

          {error && <div className="sg-alert-panel sg-alert-error mb-3"><strong>Error:</strong> {error}</div>}
          {successMsg && <div className="sg-alert-panel sg-alert-success mb-3"><strong>Success:</strong> {successMsg}</div>}

          <section className="row g-3 mb-4">
            <div className="col-6 col-xl-3"><KpiCard icon="☷" label="Total planned" value={items.length} /></div>
            <div className="col-6 col-xl-3"><KpiCard icon="🗓️" label="Scheduled stops" value={items.filter((item) => item.planned_date).length} tone="success" /></div>
            <div className="col-6 col-xl-3"><KpiCard icon="🔖" label="Unscheduled" value={items.filter((item) => !item.planned_date).length} tone="warning" /></div>
            <div className="col-6 col-xl-3"><KpiCard icon="🗺️" label="Planned days" value={dayKeys.length} /></div>
          </section>

          <div className="sg-itinerary-layout">
            <section className="sg-panel sg-planner-panel">
              <div className="sg-planner-toolbar"><div><h2>Planned itinerary</h2><small>Group and schedule using the existing itinerary controls.</small></div><Link to="/" className="btn btn-sm btn-outline-danger">+ Add experience</Link></div>

              <div className="sg-day-tabs" role="tablist" aria-label="Itinerary days">
                {dayKeys.map((day, index) => <button key={day} role="tab" aria-selected={activeGroup === day} className={activeGroup === day ? 'is-active' : ''} onClick={() => setActiveGroup(day)}><strong>Day {index + 1}</strong><small>{formatDay(day)}</small></button>)}
                {hasUnscheduled && <button role="tab" aria-selected={activeGroup === 'unscheduled'} className={activeGroup === 'unscheduled' ? 'is-active' : ''} onClick={() => setActiveGroup('unscheduled')}><strong>Plan later</strong><small>Unscheduled</small></button>}
              </div>

              {items.length === 0 ? (
                <div className="sg-empty-state"><span className="empty-icon">🗺️</span><h3>Your itinerary is empty</h3><p>Add an experience from Browse, Discover, or AI Picks to begin planning.</p><Link to="/" className="btn btn-danger btn-sm">Browse experiences</Link></div>
              ) : visibleItems.length === 0 ? (
                <div className="sg-empty-state"><span className="empty-icon">🗓️</span><h3>No stops in this group</h3><p>Select another day or add an experience.</p></div>
              ) : (
                <div className="sg-itinerary-timeline">
                  {visibleItems.map((item) => {
                    const experience = item.food_experience || {};
                    const edits = editStates[item.itinerary_item_id] || { planned_date: '', planned_time: '' };
                    return (
                      <article key={item.itinerary_item_id}>
                        <div className="sg-timeline-time"><strong>{item.planned_time?.substring(0, 5) || 'Plan time'}</strong><span /></div>
                        <div className="sg-itinerary-stop">
                          {experience.image_url ? <img src={experience.image_url} alt="" /> : <div className="sg-itinerary-visual">🍜</div>}
                          <div className="sg-itinerary-stop-copy"><span className="sg-chip sg-chip-red">{experience.category?.category_name || 'Local food'}</span><h3>{experience.title}</h3><p>📍 {experience.location?.address || 'Singapore'} · S${Number(experience.price_sgd || 0).toFixed(2)}</p></div>
                          <div className="sg-itinerary-item-actions"><Link to={`/experiences/${experience.food_experience_id}`}>View details</Link>{removeConfirmId === item.itinerary_item_id ? <span><button className="btn btn-danger btn-sm" onClick={() => handleRemove(item.itinerary_item_id, experience.title)}>Confirm remove</button><button className="btn btn-light btn-sm" onClick={() => setRemoveConfirmId(null)}>Keep</button></span> : <button className="btn btn-outline-danger btn-sm" onClick={() => setRemoveConfirmId(item.itinerary_item_id)}>Remove</button>}</div>
                          <div className="sg-itinerary-scheduler">
                            <label>Date<input type="date" className="form-control form-control-sm" value={edits.planned_date} onChange={(event) => handleInputChange(item.itinerary_item_id, 'planned_date', event.target.value)} /></label>
                            <label>Time<input type="time" className="form-control form-control-sm" value={edits.planned_time} onChange={(event) => handleInputChange(item.itinerary_item_id, 'planned_time', event.target.value)} /></label>
                            <button className="btn btn-danger btn-sm" disabled={updatingId === item.itinerary_item_id} onClick={() => handleSaveSchedule(item.itinerary_item_id)}>{updatingId === item.itinerary_item_id ? 'Saving…' : 'Save schedule'}</button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
              <Link to="/" className="sg-add-day-experience">+ Add another experience to this plan</Link>
            </section>

            <aside className="sg-itinerary-overview">
              <section className="sg-panel"><h2>Itinerary overview</h2><dl><div><dt>Trip duration</dt><dd>{dayKeys.length || 0} planned day{dayKeys.length === 1 ? '' : 's'}</dd></div><div><dt>Destinations</dt><dd>{destinations.size} area{destinations.size === 1 ? '' : 's'}</dd></div><div><dt>Total experiences</dt><dd>{items.length}</dd></div><div><dt>Plan status</dt><dd>Draft planning</dd></div></dl></section>
              <section className="sg-panel sg-current-itinerary"><div><h2>Current itinerary</h2><span className="sg-chip sg-chip-green">Active plan</span></div><strong>{cleanPublicLabel(itinerary?.itinerary_name || '') || 'My Singapore Food Itinerary'}</strong><small>Created {itinerary?.created_at ? new Date(itinerary.created_at).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' }) : 'for this tourist account'}</small></section>
              <section className="sg-panel sg-quick-actions"><h2>Quick actions</h2><Link to="/">Browse more experiences <span>→</span></Link><Link to="/tourist/bookings">View my bookings <span>→</span></Link><Link to="/discover">Discover new areas <span>→</span></Link></section>
            </aside>
          </div>

          <div className="sg-planning-only-note"><span>i</span><p><strong>Planning only, not a booking.</strong> Adding or scheduling an experience here does not create a booking request. Booking must be submitted separately to the vendor.</p></div>
        </div>
      </div>
    </main>
  );
};

export default MyItinerary;
