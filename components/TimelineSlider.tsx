'use client';

interface Props {
  offsetMinutes: number;
  onChange: (offset: number) => void;
  virtualTime: Date;
}

const MAX_OFFSET = 24 * 60; // ±24h
const STEP_MIN = 15; // one click = 15 minutes
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

export default function TimelineSlider({ offsetMinutes, onChange, virtualTime }: Props) {
  const utc = virtualTime.toLocaleString('en-GB', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
  });

  const step = (delta: number) => onChange(clamp(offsetMinutes + delta));
  const atMin = offsetMinutes <= -MAX_OFFSET;
  const atMax = offsetMinutes >= MAX_OFFSET;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 'calc(min(35vh, 360px) + 16px)',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(560px, 76vw)',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#e6edf3', fontWeight: 600 }}>{formatOffset(offsetMinutes)}</span>
          <span style={{ color: '#484f58' }}>·</span>
          <span style={{ fontFamily: 'monospace' }}>{utc} UTC</span>
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

      {/* Slider row with step buttons on each side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={() => step(-STEP_MIN)}
          disabled={atMin}
          aria-label="Step back 15 minutes"
          title="Step back 15 min (Shift+click = 1 hour)"
          onMouseDown={(e) => {
            // Shift held = 1-hour jump; alt held = 6-hour jump
            if (e.shiftKey) { e.preventDefault(); step(-60); }
            else if (e.altKey) { e.preventDefault(); step(-360); }
          }}
          style={{
            ...stepBtnStyle,
            opacity: atMin ? 0.35 : 1,
            cursor: atMin ? 'not-allowed' : 'pointer',
          }}
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
        >
          ◀
        </button>

        <input
          type="range"
          min={-MAX_OFFSET}
          max={MAX_OFFSET}
          step={15}
          value={offsetMinutes}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            flex: 1,
            accentColor: '#22c55e',
            cursor: 'pointer',
          }}
        />

        <button
          onClick={() => step(STEP_MIN)}
          disabled={atMax}
          aria-label="Step forward 15 minutes"
          title="Step forward 15 min (Shift+click = 1 hour)"
          onMouseDown={(e) => {
            if (e.shiftKey) { e.preventDefault(); step(60); }
            else if (e.altKey) { e.preventDefault(); step(360); }
          }}
          style={{
            ...stepBtnStyle,
            opacity: atMax ? 0.35 : 1,
            cursor: atMax ? 'not-allowed' : 'pointer',
          }}
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
        >
          ▶
        </button>
      </div>
    </div>
  );
}
