'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import maplibregl from 'maplibre-gl';
import tzlookup from 'tz-lookup';
import type { City } from '@/lib/types';
import { DEFAULT_CITIES, LABEL_COLORS } from '@/lib/types';
import { buildMeridianFeatures, buildNightPolygon } from '@/lib/sun';
import CityList from './CityList';
import TimelineSlider from './TimelineSlider';

const STORAGE_KEY = 'soluxyzon.worldclock.cities.v3';

function loadCities(): City[] {
  if (typeof window === 'undefined') return DEFAULT_CITIES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CITIES;
    const parsed = JSON.parse(raw) as City[];
    return Array.isArray(parsed)
      ? parsed.map((c) => ({ ...c, enabled: c.enabled ?? true }))
      : DEFAULT_CITIES;
  } catch {
    return DEFAULT_CITIES;
  }
}

function buildCitiesGeoJSON(
  cities: City[],
  selectedId: string | null,
  hoveredId: string | null,
): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: cities.map((city) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [city.lng, city.lat] },
      properties: {
        id: city.id,
        name: city.name,
        color: LABEL_COLORS[city.label] ?? LABEL_COLORS.Other,
        enabled: city.enabled ? 1 : 0,
        selected: city.id === selectedId ? 1 : 0,
        hovered: city.id === hoveredId && city.id !== selectedId ? 1 : 0,
      },
    })),
  };
}

export default function WorldMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const [cities, setCities] = useState<City[]>(DEFAULT_CITIES);
  const [mapReady, setMapReady] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  // User's local timezone — auto-detected from the browser, no permission needed
  const userTimezone = useMemo(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }
    catch { return 'UTC'; }
  }, []);

  const [realTime, setRealTime] = useState(() => new Date());
  const [offsetMinutes, setOffsetMinutes] = useState(0);
  const virtualTime = useMemo(
    () => new Date(realTime.getTime() + offsetMinutes * 60_000),
    [realTime, offsetMinutes],
  );

  useEffect(() => { setCities(loadCities()); }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cities)); } catch {}
  }, [cities]);

  useEffect(() => {
    const id = setInterval(() => setRealTime(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  // ---------- Map init ----------
  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: [0, 20],
      zoom: 0,
      attributionControl: false,
      maxZoom: 7,
      minZoom: 0,
      renderWorldCopies: false,
    });
    mapRef.current = map;

    const fitWorld = () => {
      map.resize();
      map.fitBounds(
        [[-170, -58], [180, 78]],
        { padding: { top: 80, bottom: 360, left: 40, right: 40 }, duration: 0, linear: true },
      );
    };

    map.on('load', () => {
      // 1. Meridian lines (below night overlay)
      const { lines, labels } = buildMeridianFeatures();
      map.addSource('meridians', { type: 'geojson', data: lines });
      map.addLayer({
        id: 'meridian-lines',
        type: 'line',
        source: 'meridians',
        paint: {
          'line-color': '#f59e0b',
          'line-opacity': ['case', ['get', 'isGMT'], 0.7, 0.25],
          'line-width': ['case', ['get', 'isGMT'], 2, 1],
        },
      });

      // 2. Night fill
      map.addSource('night', {
        type: 'geojson',
        data: buildNightPolygon(new Date()) as GeoJSON.Feature,
      });
      map.addLayer({
        id: 'night-fill',
        type: 'fill',
        source: 'night',
        paint: { 'fill-color': '#0b1220', 'fill-opacity': 0.5 },
      });
      map.addLayer({
        id: 'night-edge',
        type: 'line',
        source: 'night',
        paint: { 'line-color': '#f59e0b', 'line-opacity': 0.5, 'line-width': 1, 'line-blur': 1 },
      });

      // 3. Meridian labels
      map.addSource('meridian-labels', { type: 'geojson', data: labels });
      map.addLayer({
        id: 'meridian-labels',
        type: 'symbol',
        source: 'meridian-labels',
        layout: {
          'text-field': ['get', 'label'],
          'text-font': ['Noto Sans Regular'],
          'text-size': ['case', ['get', 'isGMT'], 13, 11],
          'text-anchor': 'top',
          'text-offset': [0, 0.4],
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: {
          'text-color': ['case', ['get', 'isGMT'], '#f59e0b', '#475569'],
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.5,
        },
      });

      // 4. City pins — WebGL circle layers (pixel-perfect at every zoom level,
      //    no CSS transform, no HTML marker drift)
      map.addSource('cities', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // Outer glow ring shown only for the selected pin
      map.addLayer({
        id: 'city-pins-ring',
        type: 'circle',
        source: 'cities',
        filter: ['==', ['get', 'selected'], 1],
        paint: {
          'circle-radius': 17,
          'circle-color': 'rgba(0,0,0,0)',
          'circle-stroke-width': 2,
          'circle-stroke-color': ['get', 'color'],
          'circle-stroke-opacity': 0.65,
        },
      });

      // Main pin circles
      map.addLayer({
        id: 'city-pins',
        type: 'circle',
        source: 'cities',
        paint: {
          'circle-radius': [
            'case',
            ['==', ['get', 'selected'], 1], 11,
            ['==', ['get', 'hovered'], 1], 10,
            9,
          ],
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': ['case', ['==', ['get', 'enabled'], 1], 1, 0.35],
          'circle-stroke-opacity': ['case', ['==', ['get', 'enabled'], 1], 1, 0.35],
        },
      });

      // Single map-level click handler: hit-test pins first, deselect if miss
      map.on('click', (e) => {
        const hits = map.queryRenderedFeatures(e.point, { layers: ['city-pins'] });
        if (hits.length > 0) {
          const id = hits[0].properties?.id as string;
          setSelectedId((curr) => (curr === id ? null : id));
        } else {
          setSelectedId(null);
        }
      });

      map.on('mouseenter', 'city-pins', (e) => {
        map.getCanvas().style.cursor = 'pointer';
        const id = e.features?.[0]?.properties?.id as string | undefined;
        if (id) setHoveredId(id);
      });
      map.on('mouseleave', 'city-pins', () => {
        map.getCanvas().style.cursor = '';
        setHoveredId(null);
      });

      fitWorld();
      map.once('idle', () => setMapReady(true));
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Re-fit world on container resize (skip while a city is selected / zoomed in)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const ro = new ResizeObserver(() => {
      map.resize();
      if (!selectedId) {
        requestAnimationFrame(() => {
          map.fitBounds(
            [[-170, -58], [180, 78]],
            { padding: { top: 80, bottom: 360, left: 40, right: 40 }, duration: 0, linear: true },
          );
        });
      }
    });
    if (mapContainer.current) ro.observe(mapContainer.current);
    return () => ro.disconnect();
  }, [mapReady, selectedId]);

  // Update night overlay with virtual time
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const src = map.getSource('night') as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(buildNightPolygon(virtualTime) as GeoJSON.Feature);
  }, [virtualTime, mapReady]);

  // Push city data (positions + visual state) to the WebGL layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const src = map.getSource('cities') as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(buildCitiesGeoJSON(cities, selectedId, hoveredId));
  }, [cities, selectedId, hoveredId, mapReady]);

  // Fly to a newly selected city
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const city = cities.find((c) => c.id === selectedId);
    if (!city) return;
    map.flyTo({ center: [city.lng, city.lat], zoom: Math.max(map.getZoom(), 2.5), duration: 900 });
  }, [selectedId, cities]);

  function handleAdd(city: City) {
    setCities((prev) => {
      if (prev.some((c) => c.id === city.id)) return prev;
      return [...prev, { ...city, enabled: true }];
    });
    setSelectedId(city.id);
  }

  function handleUpdate(updated: City) {
    setCities((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }

  function handleDelete(id: string) {
    setCities((prev) => prev.filter((c) => c.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function handleLogoClick() {
    if (typeof window !== 'undefined') window.location.reload();
  }

  /**
   * Request browser geolocation, reverse-geocode via Photon, and add the
   * detected place as a "Home" pin. One click → tailored to user.
   */
  function handleUseMyLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocError('Geolocation not supported by this browser.');
      return;
    }
    setLocating(true);
    setLocError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        let name = 'My Location';
        let country = '';
        try {
          const res = await fetch(
            `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}&limit=1`,
          );
          if (res.ok) {
            const data = await res.json();
            const f = data.features?.[0];
            if (f) {
              name = f.properties.name || f.properties.city || 'My Location';
              country = f.properties.country || '';
            }
          }
        } catch { /* fall back to defaults */ }

        let timezone = userTimezone;
        try { timezone = tzlookup(lat, lng); } catch { /* keep user tz */ }

        const id = `home:${lat.toFixed(3)},${lng.toFixed(3)}`;
        const home: City = {
          id,
          name,
          country,
          lat,
          lng,
          timezone,
          label: 'Other',
          customLabel: 'Home',
          enabled: true,
        };

        setCities((prev) => {
          if (prev.some((c) => c.id === id)) return prev;
          // Put Home first so it leads the list
          return [home, ...prev];
        });
        setSelectedId(id);
        setLocating(false);
      },
      (err) => {
        const msg =
          err.code === err.PERMISSION_DENIED ? 'Permission denied.' :
          err.code === err.POSITION_UNAVAILABLE ? 'Location unavailable.' :
          'Could not get location.';
        setLocError(msg);
        setLocating(false);
        setTimeout(() => setLocError(null), 4000);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  }

  const isEmpty = cities.length === 0;

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      background: '#0a0e14',
      overflow: 'hidden',
    }}>
      {/* Full-screen map canvas */}
      <div ref={mapContainer} id="map" style={{ position: 'absolute', inset: 0 }} />

      {/* Logo */}
      <button
        onClick={handleLogoClick}
        aria-label="Refresh"
        style={{
          position: 'absolute', top: 20, left: 20,
          background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
          display: 'flex', alignItems: 'center', zIndex: 20,
        }}
      >
        <Image
          src="/logo-wordmark.png"
          alt="soluXYZon"
          width={160}
          height={48}
          priority
          style={{ height: 36, width: 'auto', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.7))' }}
        />
      </button>

      {/* Use my location button (top-right) */}
      <button
        onClick={handleUseMyLocation}
        disabled={locating}
        title="Detect your location and drop a Home pin"
        style={{
          position: 'absolute', top: 20, right: 20, zIndex: 20,
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(22, 27, 34, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(48, 54, 61, 0.6)',
          borderRadius: 10,
          color: '#e6edf3',
          padding: '8px 14px',
          fontSize: 12,
          fontWeight: 600,
          cursor: locating ? 'wait' : 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          opacity: locating ? 0.7 : 1,
        }}
        onMouseEnter={(e) => { if (!locating) e.currentTarget.style.borderColor = '#22c55e'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(48, 54, 61, 0.6)'; }}
      >
        <span style={{ fontSize: 14 }}>📍</span>
        <span>{locating ? 'Locating…' : 'Use my location'}</span>
      </button>

      {/* Location error toast */}
      {locError && (
        <div style={{
          position: 'absolute', top: 64, right: 20, zIndex: 20,
          background: 'rgba(127, 29, 29, 0.9)',
          border: '1px solid #f85149',
          borderRadius: 8,
          color: '#fecaca',
          padding: '6px 12px',
          fontSize: 12,
          maxWidth: 240,
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}>
          {locError}
        </div>
      )}

      {/* Empty-state hint */}
      {isEmpty && (
        <div style={{
          position: 'absolute', top: '38%', left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none', zIndex: 15,
        }}>
          <div style={{
            background: 'rgba(22, 27, 34, 0.85)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: '1px solid rgba(48, 54, 61, 0.6)',
            borderRadius: 14,
            padding: '20px 28px',
            color: '#e6edf3',
            textAlign: 'center',
            maxWidth: 360,
            boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
          }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Your map is empty.</div>
            <div style={{ fontSize: 12, color: '#8b949e' }}>
              Use <span style={{ color: '#22c55e', fontWeight: 600 }}>+ Add City</span> below to drop your first pin.
            </div>
          </div>
        </div>
      )}

      {/* Floating timeline (above the panel) */}
      <TimelineSlider
        offsetMinutes={offsetMinutes}
        onChange={setOffsetMinutes}
        virtualTime={virtualTime}
        userTimezone={userTimezone}
      />

      {/* Floating city panel docked at bottom */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'min(35vh, 360px)',
        background: 'rgba(10, 14, 20, 0.78)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderTop: '1px solid rgba(48, 54, 61, 0.5)',
        borderRadius: '16px 16px 0 0',
        boxShadow: '0 -12px 36px rgba(0,0,0,0.45)',
        zIndex: 10,
      }}>
        <CityList
          cities={cities}
          virtualTime={virtualTime}
          selectedId={selectedId}
          expandedId={selectedId}
          onSelect={(id) => setSelectedId((curr) => (curr === id ? null : id))}
          onHover={setHoveredId}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onAdd={handleAdd}
        />
      </div>
    </div>
  );
}
