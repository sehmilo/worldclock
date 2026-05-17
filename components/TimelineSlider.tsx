'use client';

import { useMemo } from 'react';

interface CityLite {
  timezone: string;
  enabled: boolean;
}

interface Props {
  offsetMinutes: number;
  onChange: (offset: number) => void;
  virtualTime: Date;
  realTime: Date;
  userTimezone: string;
  cities: CityLite[];
  workStart?: number; // hour (0-23), default 9
  workEnd?: number;   // hour (0-23), default 17
}

const MAX_OFFSET = 24 * 60; // ±24h
const STEP_MIN = 15;
const SAMPLES = 96; // every 30 min across the 48h window
const clamp = (n: number) => Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, n));

function formatOffset(min: number): string {
  if (min === 0) return 'Now';
  const sign = min > 0 ? '+' : '−';
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${sign}${m}m`;
  if (m === 0) return `${sign}${h}h`;
  return `${sign}${h}h ${m}m`;
}

/** Returns the hour-of-day (0-23) for a given UTC instant in the given IANA tz. */
function hourInTz(d: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const h = parts.find((p) => p.type === 'hour')?.value ?? '0';
  // Intl returns "24" at midnight in some locales — normalize.
  return parseInt(h, 10) % 24;
}

/** Ratio of enabled cities currently in [workStart, workEnd) local time. */
function overlapRatio(at: Date, cities: CityLite[], ws: number, we: number): number {
  const enabled = cities.filter((c) => c.enabled);
  if (enabled.length === 0) return 0;
  let n = 0;
  for (const c of enabled) {
    const h = hourInTz(at, c.timezone);
    if (h >= ws && h < we) n++;
  }
  return n / enabled.length;
}

function ratioColor(r: number): string {
  if (r === 0) return '#1f2937';        // dim — nobody available
  if (r < 0.34) return '#7f1d1d';       // mostly night
  if (r < 0.67) return '#b45309';       // partial overlap
  if (r < 1.0) return '#f59e0b';        // most awake
  return '#22c55e';                     // everyone in work hours
}

const stepBtnStyle: React.CSSProperties = {
  flexShrink: 0,
  width: 28,
  height: 28,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(13, 17, 23, 0.7)',
  border: '1px solid #30363d',
  borderRadius: 6,
  color: '#e6edf3',
  fontSize: 14,
  fontWeight: 700,
  lineHeight: 1,
  cursor: 'pointer',
  userSelect: 'none',
  transition: 'background 0.12s, border-color 0.12s, color 0.12s',
};

export default function TimelineSlider({
  offsetMinutes,
  onChange,
  virtualTime,
  realTime,
  userTimezone,
  cities,
  workStart = 9,
  workEnd = 17,
}: Props) {
  const localTime = virtualTime.toLocaleString('en-GB', {
    timeZone: userTimezone,
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
  });

  const tzAbbr = new Intl.DateTimeFormat('en-US', {
    timeZone: userTimezone,
    timeZoneName: 'short',
  })
    .formatToParts(virtualTime)
    .find((p) => p.type === 'timeZoneName')?.value ?? '';

  const utc = virtualTime.toLocaleString('en-GB', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
  });

  const step = (delta: number) => onChange(clamp(offsetMinutes + delta));
  const atMin = offsetMinutes <= -MAX_OFFSET;
  const atMax = offsetMinutes >= MAX_OFFSET;

  // Heatmap samples across the entire ±24h window
  const samples = useMemo(() => {
    const out: { offset: number; ratio: number }[] = [];
    for (let i = 0; i < SAMPLES; i++) {
      const t = i / (SAMPLES - 1);
      const offset = -MAX_OFFSET + t * (2 * MAX_OFFSET);
      const at = new Date(realTime.getTime() + offset * 60_000);
      out.push({ offset, ratio: overlapRatio(at, cities, workStart, workEnd) });
    }
    return out;
  }, [cities, realTime, workStart, workEnd]);

  const currentRatio = overlapRatio(virtualTime, cities, workStart, workEnd);
  const enabledCount = cities.filter((c) => c.enabled).length;
  const awakeCount = Math.round(currentRatio * enabledCount);

  // Jump to next time ≥80% of cities are awake (search forward from current)
  function findNextOverlap() {
    if (enabledCount === 0) return;
    const threshold = 0.8;
    // Walk forward in 15-min steps up to +24h from current offset
    for (let m = offsetMinutes + STEP_MIN; m <= MAX_OFFSET; m += STEP_MIN) {
      const at = new Date(realTime.getTime() + m * 60_000);
      if (overlapRatio(at, cities, workStart, workEnd) >= threshold) {
        onChange(m);
        return;
      }
    }
    // No overlap in next 24h — wrap and try from -MAX_OFFSET to current
    for (let m = -MAX_OFFSET; m < offsetMinutes; m += STEP_MIN) {
      const at = new Date(realTime.getTime() + m * 60_000);
      if (overlapRatio(at, cities, workStart, workEnd) >= threshold) {
        onChange(m);
        return;
      }
    }
  }

  // Position (0-100%) of the current slider value within the heatmap
  const markerPct = ((offsetMinutes + MAX_OFFSET) / (2 * MAX_OFFSET)) * 100;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 'calc(min(35vh, 360px) + 16px)',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(620px, 80vw)',
        background: 'rgba(22, 27, 34, 0.55)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: '1px solid rgba(48, 54, 61, 0.5)',
        borderRadius: 12,
        padding: '10px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        zIndex: 15,
      }}
    >
      {/* Status row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#8b949e' }}>
        <span>−24h</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: '#e6edf3', fontWeight: 600 }}>{formatOffset(offsetMinutes)}</span>
          <span style={{ color: '#484f58' }}>·</span>
          <span style={{ fontFamily: 'monospace', color: '#e6edf3' }} title={userTimezone}>
            {localTime} <span style={{ color: '#22c55e', fontWeight: 600 }}>{tzAbbr}</span>
          </span>
          <span style={{ color: '#484f58', fontFamily: 'monospace', fontSize: 11 }}>· {utc} UTC</span>
          {offsetMinutes !== 0 && (
            <button
              onClick={() => onChange(0)}
              style={{
                background: 'transparent',
                border: '1px solid #30363d',
                borderRadius: 4,
                color: '#22c55e',
                padding: '2px 8px',
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              Reset
            </button>
          )}
        </div>
        <span>+24h</span>
      </div>

      {/* Slider row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={() => step(-STEP_MIN)}
          disabled={atMin}
          aria-label="Step back 15 minutes"
          title="Step back 15 min (Shift+click = 1 hour, Alt+click = 6 hours)"
          onMouseDown={(e) => {
            if (e.shiftKey) { e.preventDefault(); step(-60); }
            else if (e.altKey) { e.preventDefault(); step(-360); }
          }}
          style={{ ...stepBtnStyle, opacity: atMin ? 0.35 : 1, cursor: atMin ? 'not-allowed' : 'pointer' }}
          onMouseEnter={(e) => {
            if (atMin) return;
            e.currentTarget.style.background = 'rgba(34, 197, 94, 0.15)';
            e.currentTarget.style.borderColor = '#22c55e';
            e.currentTarget.style.color = '#22c55e';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(13, 17, 23, 0.7)';
            e.currentTarget.style.borderColor = '#30363d';
            e.currentTarget.style.color = '#e6edf3';
          }}
        >◀</button>

        <input
          type="range"
          min={-MAX_OFFSET}
          max={MAX_OFFSET}
          step={15}
          value={offsetMinutes}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ flex: 1, accentColor: '#22c55e', cursor: 'pointer' }}
        />

        <button
          onClick={() => step(STEP_MIN)}
          disabled={atMax}
          aria-label="Step forward 15 minutes"
          title="Step forward 15 min (Shift+click = 1 hour, Alt+click = 6 hours)"
          onMouseDown={(e) => {
            if (e.shiftKey) { e.preventDefault(); step(60); }
            else if (e.altKey) { e.preventDefault(); step(360); }
          }}
          style={{ ...stepBtnStyle, opacity: atMax ? 0.35 : 1, cursor: atMax ? 'not-allowed' : 'pointer' }}
          onMouseEnter={(e) => {
            if (atMax) return;
            e.currentTarget.style.background = 'rgba(34, 197, 94, 0.15)';
            e.currentTarget.style.borderColor = '#22c55e';
            e.currentTarget.style.color = '#22c55e';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(13, 17, 23, 0.7)';
            e.currentTarget.style.borderColor = '#30363d';
            e.currentTarget.style.color = '#e6edf3';
          }}
        >▶</button>
      </div>

      {/* Meeting Finder heatmap */}
      {enabledCount > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 2 }}>
          {/* Heatmap strip */}
          <div
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              const newOffset = Math.round((-MAX_OFFSET + ratio * 2 * MAX_OFFSET) / STEP_MIN) * STEP_MIN;
              onChange(clamp(newOffset));
            }}
            title="Click to jump to that time"
            style={{
              position: 'relative',
              height: 10,
              borderRadius: 3,
              overflow: 'hidden',
              cursor: 'pointer',
              background: '#0d1117',
              border: '1px solid #30363d',
            }}
          >
            <svg width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
              {samples.map((s, i) => {
                const x = (i / samples.length) * 100;
                const w = 100 / samples.length;
                return (
                  <rect
                    key={i}
                    x={`${x}%`}
                    y={0}
                    width={`${w + 0.5}%`}
                    height="100%"
                    fill={ratioColor(s.ratio)}
                  />
                );
              })}
            </svg>
            {/* Current position marker */}
            <div
              style={{
                position: 'absolute',
                top: -2,
                bottom: -2,
                left: `${markerPct}%`,
                width: 2,
                background: '#ffffff',
                boxShadow: '0 0 6px rgba(255,255,255,0.7)',
                transform: 'translateX(-1px)',
                pointerEvents: 'none',
              }}
            />
          </div>

          {/* Legend + Find next overlap */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontSize: 11, color: '#6b7280',
          }}>
            <span>
              <span style={{ color: '#e6edf3', fontWeight: 600 }}>{awakeCount}</span>
              <span> / {enabledCount} in work hours ({workStart}–{workEnd} local)</span>
            </span>
            <button
              onClick={findNextOverlap}
              title="Jump to next time ≥80% of cities are in working hours"
              style={{
                background: 'transparent',
                border: '1px solid #30363d',
                borderRadius: 4,
                color: '#22c55e',
                padding: '2px 8px',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#22c55e'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#30363d'; }}
            >
              Find next overlap →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
