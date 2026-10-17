import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Volume2 } from 'lucide-react';
import { speak } from '../lib/util.js';

export function Sheet({ open, onClose, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true">
        <div className="grab" />
        {children}
      </div>
    </div>,
    document.body,
  );
}

let pushToast = () => {};
export const toast = (msg) => pushToast(msg);

export function Toaster() {
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    let t;
    pushToast = (m) => { setMsg(m); clearTimeout(t); t = setTimeout(() => setMsg(null), 2200); };
  }, []);
  return msg ? <div className="toast" role="status">{msg}</div> : null;
}

export function Notch({ children }) {
  return <div className="notch">{children}</div>;
}

export function SayButton({ text, className = 'icon-btn' }) {
  return (
    <button
      className={className}
      aria-label="Произнести"
      onClick={(e) => { e.stopPropagation(); speak(text); }}
    >
      <Volume2 size={18} />
    </button>
  );
}

export function ProgressBar({ p }) {
  const pct = (n) => (p.total ? (n / p.total) * 100 : 0);
  return (
    <div className="bar" aria-label={`Выучено ${p.learned} из ${p.total}`}>
      <span className="l1" style={{ width: `${pct(p.learned)}%` }} />
      <span className="l2" style={{ width: `${pct(p.learning)}%` }} />
    </div>
  );
}

export function Ring({ value, total, label }) {
  const r = 78, c = 2 * Math.PI * r;
  const [shown, setShown] = useState(0);
  useEffect(() => { const t = requestAnimationFrame(() => setShown(total ? value / total : 0)); return () => cancelAnimationFrame(t); }, [value, total]);
  return (
    <div className="ring">
      <svg width="180" height="180" viewBox="0 0 180 180">
        <circle cx="90" cy="90" r={r} fill="none" stroke="var(--blush)" strokeWidth="12" />
        <circle cx="90" cy="90" r={r} fill="none" stroke="var(--rose-deep)" strokeWidth="12" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - shown)} />
      </svg>
      <div className="val">{label ?? `${value}/${total}`}</div>
    </div>
  );
}

export function Flower({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="-128 -128 256 256" aria-hidden="true">
      <g fill="var(--rose)">
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} rx="34" ry="70" cy="-58" transform={`rotate(${a})`} opacity=".85" />
        ))}
      </g>
      <circle r="28" fill="var(--paper)" />
    </svg>
  );
}
