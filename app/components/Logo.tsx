export default function Logo({
  className = '',
  width = 220,
  height = 120,
}: {
  className?: string;
  width?: number;
  height?: number;
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="-20 -10 400 200"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="lenka-panel" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1029B8" />
          <stop offset="35%" stopColor="#0B1B6B" />
          <stop offset="100%" stopColor="#040924" />
        </linearGradient>
        <linearGradient id="lenka-border" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFED8A" />
          <stop offset="50%" stopColor="#F6C84F" />
          <stop offset="100%" stopColor="#FFED8A" />
        </linearGradient>
        <linearGradient id="lenka-letter" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFF4D0" />
          <stop offset="60%" stopColor="#FFD05A" />
          <stop offset="100%" stopColor="#F8A930" />
        </linearGradient>
        <filter id="lenka-glow" x="-30%" y="-40%" width="160%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#F8D87F" />
        </filter>
        <filter id="lenka-neon" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g>
        {/* Outer marquee */}
        <rect
          x="0"
          y="25"
          width="360"
          height="130"
          rx="42"
          fill="url(#lenka-panel)"
          stroke="url(#lenka-border)"
          strokeWidth="6"
          filter="url(#lenka-glow)"
        />

        {/* Inner glowing border */}
        {/* Removed inner dashed border for a cleaner stage */}

        {/* LENKA wordmark */}
        <g filter="url(#lenka-glow)" role="presentation">
          <text
            x="180"
            y="120"
            fontFamily="'Bungee', 'Luckiest Guy', 'Poppins', sans-serif"
            fontSize="78"
            fontWeight="800"
            letterSpacing="0.18em"
            fill="url(#lenka-letter)"
            stroke="#FF6F3E"
            strokeWidth="3"
            paintOrder="stroke"
            textAnchor="middle"
          >
            LENKA
          </text>
        </g>

      </g>
    </svg>
  );
}
