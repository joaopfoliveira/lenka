export default function Logo({ className = "", width = 160, height = 80 }: { className?: string; width?: number; height?: number }) {
  return (
    <svg 
      width={width} 
      height={height} 
      viewBox="28 12 256 115" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ background: 'transparent' }}
    >
      <defs>
        {/* Textura ligeira na tipografia (desgaste) */}
        <filter id="textGrain" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" stitchTiles="stitch" result="noise"/>
          <feComposite in="SourceGraphic" in2="noise" operator="out" result="eroded"/>
          <feBlend in="SourceGraphic" in2="eroded" mode="multiply"/>
        </filter>
      </defs>

      {/* Etiqueta sem filtro de fundo */}
      <g>
        {/* Corpo da etiqueta */}
        <path d="
          M60 40
          H260
          Q270 40 272 50
          V110
          Q270 120 260 120
          H60
          Q50 120 48 110
          V75
          L34 63
          L48 51
          V50
          Q50 40 60 40
          Z"
          fill="#E2B22C"
          stroke="#FF3B1F"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        
        {/* Buraco */}
        <circle cx="40" cy="63" r="7"
          fill="none"
          stroke="#FF3B1F"
          strokeWidth="3"/>
        
        {/* Fio com curva natural */}
        <path d="M40 63
                 C 18 40, 30 18, 72 24
                 S 150 40, 180 18"
              fill="none"
              stroke="#FF3B1F"
              strokeWidth="2.2"
              strokeLinecap="round"/>
        
        {/* Texto lenka */}
        <g filter="url(#textGrain)">
          <text x="90" y="93"
            fontFamily="'Playfair Display','Georgia','Times New Roman',serif"
            fontSize="42"
            fontWeight="800"
            letterSpacing="1.5"
            fill="#FF3B1F">
            lenka
          </text>
        </g>
      </g>
    </svg>
  );
}

