'use client';

import { useEffect, useRef, useState } from 'react';
import tzlookup from 'tz-lookup';
import type { City, LabelKey } from '@/lib/types';
import { LABELS, LABEL_COLORS } from '@/lib/types';

interface Props {
  onAdd: (city: City) => void;
  existingIds: Set<string>;
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    city?: string;
    country?: string;
    countrycode?: string;
    state?: string;
    osm_value?: string;
    osm_key?: string;
    type?: string;
  };
}

interface CityResult {
  id: string;
  name: string;
  country: string;
  state?: string;
  lat: number;
  lng: number;
  timezone: string;
  kind: string;
}

const ACCEPTED_PLACES = new Set([
  'city', 'town', 'village', 'hamlet', 'capital', 'locality', 'suburb', 'neighbourhood',
]);

export default function CitySearch({ onAdd, existingIds }: Props) {
  const [query, setQuery] = useState('');
  const [label, setLabel] = useState<LabelKey>('Client');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<CityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setOpen(false); setQuery(''); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Debounced search.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    debounceRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query.trim())}&limit=15`;
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) throw new Error(`Search failed: ${res.status}`);
        const data: { features: PhotonFeature[] } = await res.json();

        const mapped: CityResult[] = data.features
          .filter((f) => {
            const v = f.properties.osm_value ?? '';
            return f.properties.name && f.properties.osm_key === 'place' && ACCEPTED_PLACES.has(v);
          })
          .map((f) => {
            const [lng, lat] = f.geometry.coordinates;
            let timezone = 'UTC';
            try { timezone = tzlookup(lat, lng); } catch {}
            return {
              id: `${lat.toFixed(3)},${lng.toFixed(3)}`,
              name: f.properties.name ?? 'Unknown',
              country: f.properties.country ?? '',
              state: f.properties.state,
              lat, lng, timezone,
              kind: f.properties.osm_value ?? 'place',
            };
          })
          .slice(0, 10);

        setResults(mapped);
        setLoading(false);
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        setError('Search unavailable. Check connection.');
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function handleAdd(r: CityResult) {
    const city: City = {
      id: r.id,
      name: r.name,
      country: r.country,
      lat: r.lat,
      lng: r.lng,
      timezone: r.timezone,
      label,
      enabled: true,
    };
    onAdd(city);
    setQuery('');
    setOpen(false);
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(true)}
        style={{
          background: '#22c55e',
          border: 'none',
          borderRadius: 8,
          color: '#0a0e1a',
          padding: '8px 16px',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        + Add City
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 360,
            background: '#161b22ee',
            backdropFilter: 'blur(12px)',
            border: '1px solid #30363d',
            borderRadius: 12,
            padding: 12,
            zIndex: 1000,
            boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
          }}
        >
          <input
            autoFocus
            type="text"
            placeholder="Search any city, town, or village…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: '100%',
              background: '#0d1117',
              border: '1px solid #30363d',
              borderRadius: 6,
              padding: '8px 10px',
              color: '#e6edf3',
              fontSize: 13,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />

          <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {LABELS.map((l) => (
              <button
                key={l}
                onClick={() => setLabel(l)}
                style={{
                  background: label === l ? LABEL_COLORS[l] : '#0d1117',
                  border: `1px solid ${label === l ? LABEL_COLORS[l] : '#30363d'}`,
                  borderRadius: 6,
                  color: label === l ? '#0a0e1a' : '#8b949e',
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {l}
              </button>
            ))}
          </div>

          <div style={{ marginTop: 10, maxHeight: 280, overflowY: 'auto' }}>
            {loading && (
              <div style={{ color: '#8b949e', fontSize: 12, padding: 12, textAlign: 'center' }}>
                Searching…
              </div>
            )}
            {error && (
              <div style={{ color: '#f85149', fontSize: 12, padding: 12, textAlign: 'center' }}>
                {error}
              </div>
            )}
            {!loading && !error && results.length === 0 && query.length >= 2 && (
              <div style={{ color: '#8b949e', fontSize: 12, padding: 12, textAlign: 'center' }}>
                No places found.
              </div>
            )}
            {!loading && !error && query.length < 2 && (
              <div style={{ color: '#8b949e', fontSize: 12, padding: 12, textAlign: 'center' }}>
                Type at least 2 characters.
              </div>
            )}
            {results.map((r) => {
              const exists = existingIds.has(r.id);
              return (
                <button
                  key={r.id}
                  disabled={exists}
                  onClick={() => handleAdd(r)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 6,
                    color: exists ? '#484f58' : '#e6edf3',
                    padding: '8px 10px',
                    fontSize: 13,
                    cursor: exists ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                  onMouseEnter={(e) => { if (!exists) e.currentTarget.style.background = '#1f2937'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <strong>{r.name}</strong>
                    <span style={{ color: '#6b7280', fontSize: 11, marginLeft: 6 }}>
                      {[r.state, r.country].filter(Boolean).join(', ')}
                    </span>
                  </span>
                  <span style={{ color: '#484f58', fontSize: 10, marginLeft: 8, flexShrink: 0 }}>
                    {exists ? 'added' : r.kind}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 8, fontSize: 10, color: '#484f58', textAlign: 'center' }}>
            Powered by Photon · OpenStreetMap
          </div>
        </div>
      )}
    </div>
  );
}
