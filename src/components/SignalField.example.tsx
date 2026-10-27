import React from 'react';

export function SignalField({ size = 600, variant = 'dots' }: { size?: number; variant?: 'dots' | 'outline' }) {
  if (variant === 'dots') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 600 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="signal-field signal-field--dots"
        style={{ position: 'absolute', top: -20, right: -40, zIndex: 1 }}
      >
        <defs>
          <radialGradient id="signalBlue" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#8AE8FF" stopOpacity="1" />
            <stop offset="50%" stopColor="#0087FF" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#7800FF" stopOpacity="0.6" />
          </radialGradient>
          <linearGradient id="signalPurple" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7800FF" />
            <stop offset="100%" stopColor="#8AE8FF" />
          </linearGradient>
          <filter id="innerGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur" />
            <feOffset dx="0" dy="0" result="offsetBlur" />
            <feComposite in="offsetBlur" in2="SourceAlpha" operator="out" result="inverse" />
            <feFlood floodColor="#0087FF" floodOpacity="0.3" result="color" />
            <feComposite in="color" in2="inverse" operator="in" result="shadow" />
            <feComposite in="shadow" in2="SourceGraphic" operator="over" />
          </filter>
          <pattern id="dotPattern" width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="4" cy="4" r="1.5" fill="url(#signalBlue)" opacity="0.8" />
          </pattern>
        </defs>
        {/* Organic blob path - from reference 1 */}
        <path
          d="M 150 100 Q 250 50 350 100 T 500 200 Q 550 350 450 450 T 250 500 Q 100 400 100 250 T 150 100"
          fill="url(#dotPattern)"
          stroke="#2A2A38"
          strokeWidth="1"
          strokeOpacity="0.5"
          filter="url(#innerGlow)"
          className="signal-blob"
        >
          <animateTransform
            attributeName="transform"
            type="scale"
            values="1;1.03;1"
            dur="6s"
            repeatCount="indefinite"
            additive="sum"
          />
        </path>
        {/* Additional dots for depth - varied sizes */}
        <g className="signal-dots" opacity="0.6">
          <circle cx="200" cy="150" r="2" fill="#8AE8FF" />
          <circle cx="400" cy="200" r="1.5" fill="#0087FF" />
          <circle cx="350" cy="350" r="2.5" fill="#7800FF" />
          <circle cx="180" cy="400" r="1.8" fill="#8AE8FF" />
        </g>
      </svg>
    );
  }

  // outline variant - from reference 2 Denis Concepts
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 600 600"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="signal-field signal-field--outline"
    >
      <defs>
        <linearGradient id="outlineGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0087FF" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#FF7A45" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      <path
        d="M 200 150 Q 300 100 400 150 T 500 300 Q 450 450 300 450 T 150 300 Q 100 200 200 150"
        fill="none"
        stroke="url(#outlineGrad)"
        strokeWidth="1.5"
        opacity="0.6"
      />
      <path
        d="M 220 170 Q 300 130 380 170 T 470 300 Q 430 420 300 420 T 170 300 Q 130 220 220 170"
        fill="#101014"
        fillOpacity="0.5"
        stroke="#2A2A38"
        strokeWidth="1"
      />
    </svg>
  );
}
