export function MoonGraphic() {
  return (
    <figure className="moon-graphic-container">
      <svg
        viewBox="0 0 600 300"
        className="moon-graphic-svg"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Stylized illustration of the Moon and lunar horizon"
      >
        <defs>
          {/* Radial gradient giving the Moon depth and lighting from upper-left */}
          <radialGradient id="lunar-sphere" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#f1f5f9" />
            <stop offset="45%" stopColor="#cbd5e1" />
            <stop offset="75%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#1e293b" />
          </radialGradient>

          {/* Gradients for craters to simulate depth and rim illumination */}
          <radialGradient id="crater-depth" cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="70%" stopColor="#475569" />
            <stop offset="100%" stopColor="#94a3b8" />
          </radialGradient>

          {/* feTurbulence texture filter for realistic lunar regolith roughness */}
          <filter id="lunar-surface-texture" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="4" result="noise" />
            <feColorMatrix
              type="matrix"
              values="0.33 0.33 0.33 0 0
                      0.33 0.33 0.33 0 0
                      0.33 0.33 0.33 0 0
                      0 0 0 0.16 0"
              in="noise"
              result="contrastNoise"
            />
            <feBlend in="SourceGraphic" in2="contrastNoise" mode="multiply" />
          </filter>

          {/* Subtle lunar atmospheric glow */}
          <radialGradient id="moon-glow" cx="50%" cy="50%" r="50%">
            <stop offset="70%" stopColor="rgba(45, 212, 191, 0.08)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        {/* Ambient glow behind Moon */}
        <circle cx="300" cy="115" r="105" fill="url(#moon-glow)" />

        {/* Moon sphere with procedural regolith texture */}
        <circle
          cx="300"
          cy="115"
          r="80"
          fill="url(#lunar-sphere)"
          filter="url(#lunar-surface-texture)"
        />

        {/* Hard-coded craters of varying sizes */}
        <g className="moon-craters" filter="url(#lunar-surface-texture)">
          <circle cx="280" cy="95" r="16" fill="url(#crater-depth)" stroke="#64748b" strokeWidth="0.8" />
          <circle cx="330" cy="85" r="12" fill="url(#crater-depth)" stroke="#64748b" strokeWidth="0.6" />
          <circle cx="320" cy="130" r="15" fill="url(#crater-depth)" stroke="#64748b" strokeWidth="0.7" />
          <circle cx="265" cy="125" r="9" fill="url(#crater-depth)" stroke="#64748b" strokeWidth="0.5" />
          <circle cx="345" cy="120" r="8" fill="url(#crater-depth)" stroke="#64748b" strokeWidth="0.5" />
          <circle cx="290" cy="70" r="6" fill="url(#crater-depth)" stroke="#64748b" strokeWidth="0.4" />
          <circle cx="315" cy="160" r="11" fill="url(#crater-depth)" stroke="#64748b" strokeWidth="0.6" />
          <circle cx="270" cy="150" r="13" fill="url(#crater-depth)" stroke="#64748b" strokeWidth="0.7" />
          <circle cx="300" cy="115" r="7" fill="url(#crater-depth)" stroke="#475569" strokeWidth="0.4" />
        </g>

        {/* Distant lunar mountains / horizon silhouette */}
        <path
          d="M0,240 Q60,205 130,225 T270,210 Q340,195 420,220 T540,205 Q575,215 600,210 L600,300 L0,300 Z"
          fill="#0c1426"
          opacity="0.9"
        />

        {/* Foreground rugged lunar terrain silhouette */}
        <path
          d="M0,265 Q90,235 180,250 T360,235 Q450,225 530,245 T600,240 L600,300 L0,300 Z"
          fill="#060913"
        />

        {/* Surface crater rim highlight along the foreground ridge */}
        <path
          d="M170,250 Q230,242 270,246 M420,232 Q470,228 510,238"
          stroke="#1e293b"
          strokeWidth="1.5"
          fill="none"
        />
      </svg>
      <figcaption className="moon-graphic-caption">
        Illustration only. Not real lunar imagery or data.
      </figcaption>
    </figure>
  )
}
