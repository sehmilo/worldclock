'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';

const LABEL_COLORS: Record<string, string> = {
  Client:    '#3b82f6',
  Family:    '#ec4899',
  Friend:    '#22c55e',
  Professor: '#a855f7',
  Team:      '#f59e0b',
  Other:     '#6b7280',
};

interface City {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  timezone: string;
  label: keyof typeof LABEL_COLORS;
}

const INITIAL_CITIES: City[] = [
  { id: '1', name: 'Santa Barbara', country: 'US', lat: 34.4208, lng: -119.6982, timezone: 'America/Los_Angeles', label: 'Friend' },
  { id: '2', name: 'Chicago',       country: 'US', lat: 41.8781, lng: -87.6298,  timezone: 'America/Chicago',     label: 'Client' },
  { id: '3', name: 'New Jersey',    country: 'US', lat: 40.0583, lng: -74.4057,  timezone: 'America/New_York',    label: 'Client' },
  { id: '4', name: 'London',        country: 'UK', lat: 51.5074, lng: -0.1278,   timezone: 'Europe/London',       label: 'Professor' },
  { id: '5', name: 'Dresden',       country: 'DE', lat: 51.0504, lng: 13.7373,   timezone: 'Europe/Berlin',       label: 'Professor' },
  { id: '6', name: 'Cape Town',     country: 'ZA', lat: -33.9249, lng: 18.4241,  timezone: 'Africa/Johannesburg', label: 'Family' },
  { id: '7', name: 'Beijing',       country: 'CN', lat: 39.9042, lng: 116.4074,  timezone: 'Asia/Shanghai',       label: 'Client' },
  { id: '8', name: 'Perth',         country: 'AU', lat: -31.9505, lng: 115.8605, timezone: 'Australia/Perth',     label: 'Other' },
];

function getLocalTime(timezone: string) {
  const now = new Date();
  return {
    time: now.toLocaleTimeString('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: true }),
    date: now.toLocaleDateString('en-US', { timeZone: timezone, weekday: 'short', month: 'short', day: 'numeric' }),
  };
}

export default function WorldMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const popupsRef = useRef<maplibregl.Popup[]>([]);
  const [cities] = useState<City[]>(INITIAL_CITIES);
  const [showLabels, setShowLabels] = useState(true);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function buildPopupHTML(city: City) {
    const { time, date } = getLocalTime(city.timezone);
    const color = LABEL_COLORS[city.label] ?? LABEL_COLORS.Other;
    return `
      <div class="city-popup">
        <div class="city-name">${city.name}</div>
        <div class="city-label" style="color:${color}">${city.label}</div>
        <div class="city-time">${time}</div>
        <div class="city-date">${date}</div>
      </div>
    `;
  }

  function refreshPopups() {
    popupsRef.current.forEach((popup, i) => {
      if (popup.isOpen()) {
        popup.setHTML(buildPopupHTML(cities[i]));
      }
    });
  }

  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/dark',
      center: [20, 20],
      zoom: 1.8,
      attributionControl: false,
    });

    mapRef.current = map;

    map.on('load', () => {
      markersRef.current = [];
      popupsRef.current = [];

      cities.forEach((city) => {
        const color = LABEL_COLORS[city.label] ?? LABEL_COLORS.Other;

        const el = document.createElement('div');
        el.style.cssText = `
          width: 14px; height: 14px;
          border-radius: 50%;
          background: ${color};
          border: 2px solid #fff;
          box-shadow: 0 0 10px ${color}88;
          cursor: pointer;
        `;

        const popup = new maplibregl.Popup({ offset: 18, closeButton: false, closeOnClick: false })
          .setHTML(buildPopupHTML(city));

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([city.lng, city.lat])
          .setPopup(popup)
          .addTo(map);

        if (showLabels) popup.addTo(map);

        markersRef.current.push(marker);
        popupsRef.current.push(popup);
      });

      tickRef.current = setInterval(refreshPopups, 10000);
    });

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      map.remove();
    };
  }, []);

  function toggleLabels() {
    const next = !showLabels;
    setShowLabels(next);
    popupsRef.current.forEach((popup, i) => {
      if (next) {
        popup.addTo(mapRef.current!);
      } else {
        popup.remove();
      }
    });
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <div ref={mapContainer} id="map" />

      {/* Header */}
      <div style={{
        position: 'absolute', top: 20, left: 20,
        background: '#161b22cc', backdropFilter: 'blur(8px)',
        border: '1px solid #30363d', borderRadius: 12,
        padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: '#e6edf3', letterSpacing: '-0.5px' }}>
          soluXYZon
        </span>
        <span style={{ fontSize: 13, color: '#8b949e' }}>World Clock</span>
      </div>

      {/* Controls */}
      <div style={{
        position: 'absolute', top: 20, right: 20,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <button
          onClick={toggleLabels}
          style={{
            background: showLabels ? '#3b82f6' : '#161b22cc',
            backdropFilter: 'blur(8px)',
            border: '1px solid #30363d',
            borderRadius: 8,
            color: '#e6edf3',
            padding: '8px 16px',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          {showLabels ? 'Hide Labels' : 'Show Labels'}
        </button>
      </div>

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 30, left: 20,
        background: '#161b22cc', backdropFilter: 'blur(8px)',
        border: '1px solid #30363d', borderRadius: 10,
        padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        {Object.entries(LABEL_COLORS).map(([label, color]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#8b949e' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
