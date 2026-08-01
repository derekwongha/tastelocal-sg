import React, { useEffect, useRef, useState } from 'react';

const GoogleMapContainer = ({ experiences, singleLatLng, singleTitle, selectedExperienceId, height = '350px', onMarkerSelect }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersByExperienceRef = useRef(new Map());
  const infoWindowContentRef = useRef(new Map());
  const activeInfoWindowRef = useRef(null);
  const [mapError, setMapError] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey || apiKey.includes('placeholder')) {
      setMapError(true);
      return undefined;
    }
    if (window.google?.maps) {
      setScriptLoaded(true);
      return undefined;
    }

    const scriptId = 'google-maps-script';
    let script = document.getElementById(scriptId);
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
      script.async = true;
      script.defer = true;
    }
    const handleLoad = () => setScriptLoaded(true);
    const handleError = () => setMapError(true);
    script.addEventListener('load', handleLoad);
    script.addEventListener('error', handleError);
    if (!script.isConnected) document.head.appendChild(script);
    return () => {
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
    };
  }, [apiKey]);

  useEffect(() => {
    if (!scriptLoaded || !mapRef.current || !window.google?.maps) return;

    try {
      let center = { lat: 1.352083, lng: 103.819836 };
      let zoom = 11;
      if (singleLatLng?.lat && singleLatLng?.lng) {
        center = { lat: Number(singleLatLng.lat), lng: Number(singleLatLng.lng) };
        zoom = 15;
      } else {
        const firstMapped = experiences?.find((experience) => experience.location?.latitude && experience.location?.longitude);
        if (firstMapped) center = { lat: Number(firstMapped.location.latitude), lng: Number(firstMapped.location.longitude) };
      }

      const map = new window.google.maps.Map(mapRef.current, {
        center,
        zoom,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#f5efe4' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#4b4038' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#fffaf2' }] },
          { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#dce8d3' }] },
          { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#55734b' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
          { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#efd7ac' }] },
          { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#eadfd1' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#b9d8df' }] },
          { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#537984' }] }
        ]
      });
      mapInstanceRef.current = map;
      markersByExperienceRef.current.clear();
      infoWindowContentRef.current.clear();
      activeInfoWindowRef.current?.close();
      activeInfoWindowRef.current = null;

      if (singleLatLng?.lat && singleLatLng?.lng) {
        new window.google.maps.Marker({ position: center, map, title: singleTitle || 'Food experience location' });
        return;
      }

      const activeInfoWindow = new window.google.maps.InfoWindow();
      activeInfoWindowRef.current = activeInfoWindow;

      (experiences || []).forEach((experience) => {
        if (!experience.location?.latitude || !experience.location?.longitude) return;
        const marker = new window.google.maps.Marker({
          position: { lat: Number(experience.location.latitude), lng: Number(experience.location.longitude) },
          map,
          title: experience.title
        });
        const infoWindowContent = `<div style="color:#302a25;font-family:Inter,sans-serif;padding:7px;min-width:170px"><strong style="display:block;margin-bottom:5px">${experience.title}</strong><span style="font-size:12px;color:#74675e">${experience.category?.category_name || 'Local food'} · S$${experience.price_sgd}</span><a href="/experiences/${experience.food_experience_id}" style="display:block;margin-top:9px;color:#b9342b;font-size:12px;font-weight:700">View experience →</a></div>`;
        const experienceKey = String(experience.food_experience_id);
        markersByExperienceRef.current.set(experienceKey, marker);
        infoWindowContentRef.current.set(experienceKey, infoWindowContent);
        marker.addListener('click', () => {
          activeInfoWindow.close();
          activeInfoWindow.setContent(infoWindowContent);
          activeInfoWindow.open(map, marker);
          onMarkerSelect?.(experience.food_experience_id);
        });
      });
    } catch (err) {
      console.error('Error during Google Maps initialization:', err);
      setMapError(true);
    }
  }, [scriptLoaded, experiences, singleLatLng, singleTitle, onMarkerSelect]);

  useEffect(() => {
    const activeInfoWindow = activeInfoWindowRef.current;
    if (!activeInfoWindow || singleLatLng) return;
    if (selectedExperienceId === null || selectedExperienceId === undefined) {
      activeInfoWindow.close();
      return;
    }

    const experienceKey = String(selectedExperienceId);
    const marker = markersByExperienceRef.current.get(experienceKey);
    const infoWindowContent = infoWindowContentRef.current.get(experienceKey);
    const map = mapInstanceRef.current;
    if (!marker || !infoWindowContent || !map) return;

    activeInfoWindow.close();
    map.panTo(marker.getPosition());
    activeInfoWindow.setContent(infoWindowContent);
    activeInfoWindow.open(map, marker);
  }, [selectedExperienceId, singleLatLng, experiences]);

  if (mapError) {
    return (
      <div className="sg-map-fallback" style={{ height }} role="status">
        <span aria-hidden="true">🗺️</span><h3>Interactive map unavailable</h3><p>The catalogue remains available while Google Maps is offline or not configured.</p>
      </div>
    );
  }

  return <div ref={mapRef} className="google-map-container" style={{ width: '100%', height, minHeight: '350px' }} />;
};

export default GoogleMapContainer;
