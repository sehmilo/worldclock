'use client';

import { useEffect, useRef, useState } from 'react';
import type { City, LabelKey } from '@/lib/types';
import { LABELS, LABEL_COLORS } from '@/lib/types';
import { isDaytime } from '@/lib/sun';

interface Props {
  city: City;
  virtualTime: Date;
  selected: boolean;
  expanded: boolean;
  onSelect: () => void;
  onHover: (hovered: boolean) => void;
  onUpdate: (city: City) => void;
  onDelete: (id: string) => void;
}

function formatLocalTime(date: Date, timezone: string) {
  return date.toLocaleTimeString('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDate(date: Date, timezone: string) {
  return date.toLocaleDateString('en-GB', { timeZone: timezone, day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Compute UTC offset hours for a given timezone at a given instant. */
function tzOffsetHours(date: Date, timezone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  parts.forEach((p) => { if (p.type !== 'literal') map[p.type] = p.value; });
  const asUTC = Date.UTC(
    Number(map.year), Number(map.month) - 1, Number(map.day),
    Number(map.hour), Number(map.minute), Number(map.second),
  );
  return Math.round((asUTC - date.getTime()) / 3_600_000);
}

function SunIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={2}>
      <circle cx="12" cy="12" r="4" fill="#f59e0b" />
      <line x1="12" y1="2" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="2" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
      <line x1="4.2" y1="4.2" x2="6.3" y2="6.3" />
      <line x1="17.7" y1="17.7" x2="19.8" y2="19.8" />
      <line x1="4.2" y1="19.8" x2="6.3" y2="17.7" />
      <line x1="17.7" y1="6.3" x2="19.8" y2="4.2" />
    </svg>
  );
}

function MoonIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#94a3b8" stroke="#94a3b8" strokeWidth={1}>
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
    </svg>
  );
}

function PencilIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

function TrashIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export default function CityWidget({ city, virtualTime, selected, expanded, onSelect, onHover, onUpdate, onDelete }: Props) {
  const [labelDraft, setLabelDraft] = useState(city.customLabel ?? '');
  const [editingLabel, setEditingLabel] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLabelDraft(city.customLabel ?? '');
  }, [city.customLabel]);

  useEffect(() => {
    if (editingLabel) inputRef.current?.focus();
  }, [editingLabel]);

  const day = isDaytime(city.lat, city.lng, virtualTime);
  const localTime = formatLocalTime(virtualTime, city.timezone);
  const date = formatDate(virtualTime, city.timezone);
  const offset = tzOffsetHours(virtualTime, city.timezone);
  const offsetStr = `${offset >= 0 ? '+' : '−'}${Math.abs(offset)} hrs`;
  const accent = LABEL_COLORS[city.label] ?? LABEL_COLORS.Other;

  function saveLabel() {
    onUpdate({ ...city, customLabel: labelDraft.trim() || undefined });
    setEditingLabel(false);
  }

  const baseBg = selected ? '#1c2632' : expanded ? '#161b22' : '#0f141b';
  const borderColor = selected ? accent : '#21262d';

  return (
    <div
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      style={{
        background: baseBg,
        borderTop: `1px solid ${borderColor}`,
        borderRight: `1px solid ${borderColor}`,
        borderBottom: `1px solid ${borderColor}`,
        borderLeft: `3px solid ${city.enabled ? accent : '#30363d'}`,
        borderRadius: 10,
        padding: '12px 16px',
        cursor: 'pointer',
        opacity: city.enabled ? 1 : 0.5,
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      {/* Main row */}
      <div
        onClick={onSelect}
        style={{ display: 'flex', alignItems: 'center', gap: 16 }}
      >
        <div style={{ width: 28, display: 'flex', justifyContent: 'center' }}>
          {day ? <SunIcon /> : <MoonIcon />}
        </div>

        <div style={{ minWidth: 80, fontSize: 28, fontWeight: 300, letterSpacing: '-1px', color: '#e6edf3', fontVariantNumeric: 'tabular-nums' }}>
          {localTime}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#e6edf3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {city.name}
            {city.customLabel && (
              <span style={{ marginLeft: 10, fontSize: 12, color: accent, fontWeight: 400 }}>
                · {city.customLabel}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: '#8b949e', marginTop: 2 }}>
            {date} · {offsetStr} · {city.country}
          </div>
        </div>

        {/* Action icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(); setEditingLabel(true); }}
            aria-label="Edit city"
            title="Edit"
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: '#8b949e', padding: 6, borderRadius: 6,
              display: 'flex', alignItems: 'center',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#21262d'; e.currentTarget.style.color = '#e6edf3'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8b949e'; }}
          >
            <PencilIcon />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Remove ${city.name} from your list?`)) onDelete(city.id);
            }}
            aria-label="Delete city"
            title="Delete"
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: '#8b949e', padding: 6, borderRadius: 6,
              display: 'flex', alignItems: 'center',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#3a1418'; e.currentTarget.style.color = '#f85149'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8b949e'; }}
          >
            <TrashIcon />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onUpdate({ ...city, enabled: !city.enabled }); }}
            aria-label={city.enabled ? 'Hide on map' : 'Show on map'}
            title={city.enabled ? 'Hide pin' : 'Show pin'}
            style={{
              width: 36, height: 20,
              background: city.enabled ? accent : '#30363d',
              border: 'none', borderRadius: 999,
              position: 'relative', cursor: 'pointer',
              marginLeft: 4,
            }}
          >
            <span style={{
              position: 'absolute',
              top: 2, left: city.enabled ? 18 : 2,
              width: 16, height: 16, borderRadius: '50%',
              background: '#fff', transition: 'left 0.15s',
            }} />
          </button>
        </div>
      </div>

      {/* Expanded controls */}
      {expanded && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #21262d', display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          {/* Custom label */}
          <div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', marginBottom: 6 }}>
              Note
            </div>
            {editingLabel ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  ref={inputRef}
                  value={labelDraft}
                  onChange={(e) => setLabelDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveLabel();
                    if (e.key === 'Escape') { setLabelDraft(city.customLabel ?? ''); setEditingLabel(false); }
                  }}
                  placeholder="e.g. Cork Oak Meeting With Scotty"
                  style={{
                    flex: 1,
                    background: '#0d1117', border: '1px solid #30363d', borderRadius: 6,
                    padding: '6px 10px', color: '#e6edf3', fontSize: 13, outline: 'none',
                  }}
                />
                <button onClick={saveLabel} style={{
                  background: accent, border: 'none', borderRadius: 6, color: '#0a0e1a',
                  padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>OK</button>
              </div>
            ) : (
              <button
                onClick={() => setEditingLabel(true)}
                style={{
                  background: 'transparent', border: '1px dashed #30363d', borderRadius: 6,
                  color: city.customLabel ? '#e6edf3' : '#6b7280',
                  padding: '6px 10px', fontSize: 12, cursor: 'pointer', width: '100%', textAlign: 'left',
                }}
              >
                {city.customLabel || '+ Add a note for this city'}
              </button>
            )}
          </div>

          {/* Category */}
          <div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', marginBottom: 6 }}>
              Category
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {LABELS.map((l) => (
                <button
                  key={l}
                  onClick={() => onUpdate({ ...city, label: l as LabelKey })}
                  style={{
                    background: city.label === l ? LABEL_COLORS[l] : '#0d1117',
                    border: `1px solid ${city.label === l ? LABEL_COLORS[l] : '#30363d'}`,
                    borderRadius: 6,
                    color: city.label === l ? '#0a0e1a' : '#8b949e',
                    padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Delete */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => onDelete(city.id)}
              style={{
                background: 'transparent', border: '1px solid #f8514955',
                borderRadius: 6, color: '#f85149',
                padding: '6px 12px', fontSize: 12, cursor: 'pointer',
              }}
            >
              Remove city
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
