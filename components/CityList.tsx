'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { City } from '@/lib/types';
import CityWidget from './CityWidget';
import CitySearch from './CitySearch';

interface Props {
  cities: City[];
  virtualTime: Date;
  selectedId: string | null;
  expandedId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onUpdate: (city: City) => void;
  onDelete: (id: string) => void;
  onAdd: (city: City) => void;
}

export default function CityList(props: Props) {
  const { cities, virtualTime, selectedId, expandedId, onSelect, onHover, onUpdate, onDelete, onAdd } = props;
  const refs = useRef<Map<string, HTMLDivElement>>(new Map());
  const existingIds = useMemo(() => new Set(cities.map((c) => c.id)), [cities]);

  // Scroll selected widget into view when selection changes from outside.
  useEffect(() => {
    if (!selectedId) return;
    const el = refs.current.get(selectedId);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedId]);

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'transparent',
    }}>
      {/* Panel header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        borderBottom: '1px solid rgba(48, 54, 61, 0.4)',
      }}>
        <div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b7280' }}>
            My Locations
          </div>
          <div style={{ fontSize: 13, color: '#8b949e', marginTop: 2 }}>
            {cities.filter((c) => c.enabled).length} active · {cities.length} total
          </div>
        </div>
        <CitySearch onAdd={onAdd} existingIds={existingIds} />
      </div>

      {/* Scrollable list */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        {cities.length === 0 && (
          <div style={{
            margin: 'auto',
            textAlign: 'center',
            padding: '40px 20px',
            color: '#8b949e',
            maxWidth: 360,
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🌍</div>
            <div style={{ fontSize: 14, color: '#e6edf3', fontWeight: 600, marginBottom: 6 }}>
              No locations yet
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.5 }}>
              Click <span style={{ color: '#22c55e', fontWeight: 600 }}>+ Add City</span> above to add the first place
              that matters to you — a client&apos;s city, a family member&apos;s timezone, a colleague abroad.
            </div>
          </div>
        )}
        {cities.map((city) => (
          <div
            key={city.id}
            ref={(el) => { if (el) refs.current.set(city.id, el); else refs.current.delete(city.id); }}
          >
            <CityWidget
              city={city}
              virtualTime={virtualTime}
              selected={selectedId === city.id}
              expanded={expandedId === city.id}
              onSelect={() => onSelect(city.id)}
              onHover={(h) => onHover(h ? city.id : null)}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
