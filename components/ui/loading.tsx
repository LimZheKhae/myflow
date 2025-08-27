import React from 'react';

const Loading = () => {
  return (
    <div className="mf-loader-container" role="status" aria-busy="true" aria-live="polite">
      <div className="mf-orbit one" />
      <div className="mf-orbit two" />
      <div className="mf-orbit three" />

      <div className="mf-core">
        <svg viewBox="0 0 128 128" className="mf-icon" aria-hidden="true">
          <defs>
            <linearGradient id="mfBrand" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#7C3AED" />
            </linearGradient>
            <linearGradient id="mfRing" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#A78BFA" />
            </linearGradient>
            <linearGradient id="mfGem" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#06B6D4" />
              <stop offset="100%" stopColor="#6366F1" />
            </linearGradient>
          </defs>

          {/* Rotating inner ring and ticks */}
          <g className="mf-icon-rotate">
            <circle cx="64" cy="64" r="28" fill="none" stroke="url(#mfRing)" strokeWidth="3" />
            <g stroke="#FFFFFF" strokeOpacity="0.6" strokeLinecap="round">
              <path d="M64 34 L64 38" />
              <path d="M64 90 L64 94" />
              <path d="M34 64 L38 64" />
              <path d="M90 64 L94 64" />
            </g>
          </g>

          {/* Diamond core */}
          <g>
            <polygon points="64,48 78,64 64,80 50,64" fill="url(#mfGem)" />
            <path d="M64 48 L78 64 L64 80 L50 64 Z" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1.5" fill="none" />
            <path d="M64 48 L64 80 M50 64 L78 64" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="1" />
          </g>
        </svg>
        <div className="mf-shimmer" />
        <div className="mf-core-ring" />
      </div>

      <div className="mf-caption">Loading MY Flow…</div>
      <span className="sr-only">Loading content</span>
    </div>
  );
};

export default Loading; 