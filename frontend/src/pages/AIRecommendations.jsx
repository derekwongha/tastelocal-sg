import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAIRecommendations } from '../api/experiences';
import { addItemToItinerary } from '../api/itinerary';
import { useAuth } from '../context/AuthContext';
import Breadcrumb from '../components/Breadcrumb';
import { cleanPublicNarrative, toPublicExperience } from '../utils/homepageDisplay';

const SUGGESTIONS = [
  ['🍢', 'Smoky & savoury', 'spicy charcoal-grilled satay and a lively hawker atmosphere'],
  ['🍚', 'Singapore classics', 'authentic Hainanese chicken rice from a local specialist'],
  ['🍜', 'Rich & spicy', 'coconut laksa and heritage neighbourhood flavours']
];

const AIRecommendations = () => {
  const { isAuthenticated, role } = useAuth();
  const [initialQuery] = useState(() => new URLSearchParams(window.location.search).get('q') || '');
  const [query, setQuery] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const [explanation, setExplanation] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [isFallback, setIsFallback] = useState(false);
  const [itineraryStatuses, setItineraryStatuses] = useState({});

  useEffect(() => {
    if (!initialQuery) return undefined;
    const submitTimer = window.setTimeout(() => document.getElementById('ai-recommendation-form')?.requestSubmit(), 0);
    return () => window.clearTimeout(submitTimer);
  }, [initialQuery]);

  const handleSearch = async (event) => {
    event.preventDefault();
    const trimmedQuery = query.trim();
    setError(null);
    setValidationError(null);
    if (!trimmedQuery) {
      setValidationError('Please describe your food preferences or the experience you want.');
      return;
    }

    setSubmittedQuery(trimmedQuery);
    setLoading(true);
    setExplanation('');
    setRecommendations([]);
    setIsFallback(false);
    try {
      const data = await getAIRecommendations(trimmedQuery);
      setExplanation(cleanPublicNarrative(data.explanation || 'These public experiences best match the preferences you shared.'));
      setRecommendations((data.recommendations || []).map(toPublicExperience));
      setIsFallback(Boolean(data.is_fallback));
    } catch (err) {
      console.error('AI recommendation request failed:', err);
      try {
        const fallbackData = await getAIRecommendations(trimmedQuery);
        setExplanation(cleanPublicNarrative(fallbackData.explanation || 'Here are popular experiences from the public catalogue.'));
        setRecommendations((fallbackData.recommendations || []).map(toPublicExperience));
        setIsFallback(true);
      } catch (fallbackError) {
        console.error('Recommendation fallback failed:', fallbackError);
        setError('Recommendations are temporarily unavailable. Please browse the public catalogue instead.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddToItinerary = async (experience) => {
    if (!isAuthenticated || role !== 'Tourist') return;
    const id = experience.food_experience_id;
    setItineraryStatuses((current) => ({ ...current, [id]: { loading: true } }));
    try {
      await addItemToItinerary(id);
      setItineraryStatuses((current) => ({ ...current, [id]: { success: `${experience.title} added to your itinerary.` } }));
    } catch (err) {
      setItineraryStatuses((current) => ({ ...current, [id]: { error: err.response?.data?.detail || 'Could not add this experience.' } }));
    }
  };

  return (
    <main className="container sg-ai-page py-4 py-lg-5">
      <Breadcrumb items={[{ label: 'Discover', path: '/' }, { label: 'AI Recommendations', path: '/recommendations' }]} />

      <section className="sg-ai-hero">
        <div><span className="sg-eyebrow">Gemini-assisted discovery</span><h1>Tell us what you’re craving.</h1><p>Describe a flavour, neighbourhood, or kind of food experience. TasteLocal SG matches your request to existing public listings.</p></div>
        <div className="sg-ai-orb" aria-hidden="true"><span>✨</span><small>AI</small></div>
      </section>

      <section className="sg-ai-search-panel">
        <form id="ai-recommendation-form" onSubmit={handleSearch}>
          <label htmlFor="ai-query">What would make a great Singapore food day?</label>
          <div className="sg-ai-search-row">
            <input id="ai-query" className="form-control" value={query} onChange={(event) => setQuery(event.target.value)} disabled={loading} placeholder="e.g. A spicy hawker adventure with local stories…" />
            <button className="btn btn-danger" type="submit" disabled={loading}>{loading ? 'Matching…' : 'Get recommendations'}</button>
          </div>
          {validationError && <p className="text-danger small mt-2 mb-0">{validationError}</p>}
        </form>
        <div className="sg-suggestion-chips" aria-label="Suggested prompts">
          <span>Try:</span>{SUGGESTIONS.map(([icon, label, prompt]) => <button key={label} type="button" onClick={() => setQuery(prompt)}>{icon} {label}</button>)}
        </div>
      </section>

      {loading && <div className="sg-public-loading py-5"><div className="spinner-border text-danger" role="status" /><span>Gemini is matching your request to TasteLocal listings…</span></div>}
      {!loading && error && <div className="sg-alert-panel sg-alert-error mt-4">{error} <Link to="/">Browse experiences</Link></div>}
      {!loading && isFallback && <div className="sg-alert-panel sg-alert-warning mt-4"><strong>Catalogue fallback active.</strong> Live AI is unavailable, so TasteLocal matched your request against current public listings.</div>}

      {!loading && (explanation || recommendations.length > 0) && (
        <>
          <section className="sg-ai-summary">
            <div className="sg-ai-summary-icon">✦</div>
            <div><span>{isFallback ? 'Fallback summary' : 'TasteLocal AI summary'}</span><h2>{submittedQuery}</h2><p>{explanation}</p><div className="d-flex flex-wrap gap-2"><span className="sg-chip sg-chip-green">{recommendations.length} catalogue matches</span><span className="sg-chip">Explicit planning only</span><span className="sg-chip">No automatic booking</span></div></div>
          </section>

          <div className="sg-ai-results-heading"><div><span className="sg-eyebrow">Recommended for you</span><h2>Experiences worth exploring</h2></div><small>AI suggestions remain subject to live listing availability.</small></div>
          <section className="row g-4">
            {recommendations.map((experience) => {
              const status = itineraryStatuses[experience.food_experience_id] || {};
              return (
                <div className="col-md-6 col-xl-4" key={experience.food_experience_id}>
                  <article className="sg-ai-result-card">
                    {experience.image_url ? <img src={experience.image_url} alt={experience.title} /> : <div className="sg-ai-card-visual"><span>🍲</span><small>Local experience</small></div>}
                    <div className="sg-ai-card-body">
                      <div className="d-flex flex-wrap gap-2"><span className="sg-chip sg-chip-red">{experience.category?.category_name || 'Local food'}</span><span className="sg-chip">📍 {experience.location?.address || 'Singapore'}</span></div>
                      <h3>{experience.title}</h3>
                      <p className="sg-ai-reason"><strong>Why it fits:</strong> This live listing aligns with the food preferences in your request.</p>
                      <div className="sg-ai-card-meta"><span>Hosted by {experience.vendor_profile?.business_name || 'local vendor'}</span><strong>S${Number(experience.price_sgd).toFixed(2)}</strong></div>
                      {status.success && <div className="sg-alert-panel sg-alert-success py-2">{status.success}</div>}
                      {status.error && <div className="sg-alert-panel sg-alert-error py-2">{status.error}</div>}
                      <div className="d-flex gap-2 mt-3">
                        <Link className="btn btn-outline-danger flex-grow-1" to={`/experiences/${experience.food_experience_id}`}>View details</Link>
                        {isAuthenticated && role === 'Tourist' ? <button className="btn btn-danger" type="button" disabled={status.loading || status.success} onClick={() => handleAddToItinerary(experience)}>{status.loading ? 'Adding…' : status.success ? 'Added' : 'Add to itinerary'}</button> : <Link className="btn btn-danger" to="/login">Log in to plan</Link>}
                      </div>
                    </div>
                  </article>
                </div>
              );
            })}
          </section>
        </>
      )}

      {!loading && !error && !explanation && recommendations.length === 0 && (
        <section className="sg-ai-empty">
          <div><span>🤖</span><h2>Your food matchmaker is ready</h2><p>Start with a prompt above. Recommendations never create bookings or itinerary items automatically.</p></div>
          <div className="sg-itinerary-ideas">
            <h3>Itinerary inspiration</h3>
            <article><span>Morning</span><strong>Kopi & heritage breakfast</strong><small>Start gently with a local café story.</small></article>
            <article><span>Afternoon</span><strong>Hawker neighbourhood trail</strong><small>Compare signature dishes with a host.</small></article>
            <article><span>Evening</span><strong>Hands-on local cooking</strong><small>Finish with a recipe to remember.</small></article>
            <p>Display ideas only — choose “Add to itinerary” on a result to plan explicitly.</p>
          </div>
        </section>
      )}
    </main>
  );
};

export default AIRecommendations;
