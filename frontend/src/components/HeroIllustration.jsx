export default function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 800 600"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "auto", maxWidth: 900, display: "block" }}
    >
      {/* Background pastel split blocks */}
      <rect width="800" height="600" fill="#EFF6FF" />
      <rect width="360" height="600" fill="#FDF2F8" />

      {/* Transition accent band */}
      <rect x="360" width="8" height="600" fill="#F472B6" opacity="0.08" />

      {/* Grid lines - left half */}
      <g stroke="#EC4899" strokeOpacity="0.06" strokeWidth="0.8" fill="none">
        <line x1="0" y1="0" x2="0" y2="600" /><line x1="60" y1="0" x2="60" y2="600" />
        <line x1="120" y1="0" x2="120" y2="600" /><line x1="180" y1="0" x2="180" y2="600" />
        <line x1="240" y1="0" x2="240" y2="600" /><line x1="300" y1="0" x2="300" y2="600" />
        <line x1="0" y1="75" x2="360" y2="75" /><line x1="0" y1="150" x2="360" y2="150" />
        <line x1="0" y1="225" x2="360" y2="225" /><line x1="0" y1="300" x2="360" y2="300" />
        <line x1="0" y1="375" x2="360" y2="375" /><line x1="0" y1="450" x2="360" y2="450" />
        <line x1="0" y1="525" x2="360" y2="525" />
      </g>

      {/* Grid lines - right half */}
      <g stroke="#3B82F6" strokeOpacity="0.06" strokeWidth="0.8" fill="none">
        <line x1="440" y1="0" x2="440" y2="600" /><line x1="500" y1="0" x2="500" y2="600" />
        <line x1="560" y1="0" x2="560" y2="600" /><line x1="620" y1="0" x2="620" y2="600" />
        <line x1="680" y1="0" x2="680" y2="600" /><line x1="740" y1="0" x2="740" y2="600" />
        <line x1="440" y1="75" x2="800" y2="75" /><line x1="440" y1="150" x2="800" y2="150" />
        <line x1="440" y1="225" x2="800" y2="225" /><line x1="440" y1="300" x2="800" y2="300" />
        <line x1="440" y1="375" x2="800" y2="375" /><line x1="440" y1="450" x2="800" y2="450" />
        <line x1="440" y1="525" x2="800" y2="525" />
      </g>

      {/* Diagonal accents - left */}
      <g stroke="#EC4899" strokeOpacity="0.05" strokeWidth="0.6" fill="none">
        <line x1="0" y1="0" x2="120" y2="600" /><line x1="60" y1="0" x2="180" y2="600" />
        <line x1="180" y1="0" x2="60" y2="600" /><line x1="300" y1="0" x2="180" y2="600" />
      </g>

      {/* Diagonal accents - right */}
      <g stroke="#3B82F6" strokeOpacity="0.05" strokeWidth="0.6" fill="none">
        <line x1="440" y1="0" x2="560" y2="600" /><line x1="500" y1="0" x2="620" y2="600" />
        <line x1="620" y1="0" x2="500" y2="600" /><line x1="740" y1="0" x2="620" y2="600" />
      </g>

      {/* Diamond accents - left */}
      <g fill="#EC4899" fillOpacity="0.10">
        <polygon points="180,150 184,154 180,158 176,154" />
        <polygon points="60,300 64,304 60,308 56,304" />
        <polygon points="300,300 304,304 300,308 296,304" />
        <polygon points="120,450 124,454 120,458 116,454" />
        <polygon points="240,450 244,454 240,458 236,454" />
        <polygon points="60,75 64,79 60,83 56,79" />
        <polygon points="300,525 304,529 300,533 296,529" />
      </g>

      {/* Diamond accents - right */}
      <g fill="#3B82F6" fillOpacity="0.10">
        <polygon points="560,150 564,154 560,158 556,154" />
        <polygon points="440,300 444,304 440,308 436,304" />
        <polygon points="680,300 684,304 680,308 676,304" />
        <polygon points="500,450 504,454 500,458 496,454" />
        <polygon points="620,450 624,454 620,458 616,454" />
        <polygon points="440,75 444,79 440,83 436,79" />
        <polygon points="680,525 684,529 680,533 676,529" />
      </g>

      {/* Tiny circle accents - left */}
      <g fill="#EC4899" fillOpacity="0.08">
        <circle cx="60" cy="300" r="2" /><circle cx="300" cy="300" r="2" />
        <circle cx="180" cy="75" r="1.5" /><circle cx="180" cy="525" r="1.5" />
        <circle cx="60" cy="150" r="1" /><circle cx="300" cy="450" r="1" />
      </g>

      {/* Tiny circle accents - right */}
      <g fill="#3B82F6" fillOpacity="0.08">
        <circle cx="440" cy="300" r="2" /><circle cx="680" cy="300" r="2" />
        <circle cx="560" cy="75" r="1.5" /><circle cx="560" cy="525" r="1.5" />
        <circle cx="440" cy="150" r="1" /><circle cx="680" cy="450" r="1" />
      </g>

      {/* Cross marks - left */}
      <g stroke="#EC4899" strokeOpacity="0.12" strokeWidth="0.7">
        <path d="M 116,226 L 126,226 M 121,221 L 121,231" />
        <path d="M 236,374 L 246,374 M 241,369 L 241,379" />
        <path d="M 176,75 L 186,75 M 181,70 L 181,80" />
      </g>

      {/* Cross marks - right */}
      <g stroke="#3B82F6" strokeOpacity="0.12" strokeWidth="0.7">
        <path d="M 556,226 L 566,226 M 561,221 L 561,231" />
        <path d="M 676,374 L 686,374 M 681,369 L 681,379" />
        <path d="M 556,75 L 566,75 M 561,70 L 561,80" />
      </g>

      {/* Continuous-line knot icon - left half */}
      <g transform="translate(180, 300)" stroke="#EC4899" strokeOpacity="0.20" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 0,-24 C 20,-24 30,-12 20,0 C 10,12 0,6 0,0 C 0,-6 -10,-12 -20,0 C -30,12 -20,24 0,24" />
        <path d="M 0,-24 C -20,-24 -30,-12 -20,0 C -10,12 0,6 0,0 C 0,-6 10,-12 20,0 C 30,12 20,24 0,24" />
      </g>

      {/* Continuous-line knot icon - right half */}
      <g transform="translate(560, 300)" stroke="#3B82F6" strokeOpacity="0.20" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M -22,-22 L 0,24 L 22,-22" />
        <path d="M -22,-22 C -10,-6 10,-6 22,-22" />
        <path d="M 22,-22 C 10,6 -10,6 -22,-22" />
      </g>

      {/* White Card - AI Features (top center) */}
      <g transform="translate(300, 50)">
        <rect x="0" y="0" width="200" height="36" rx="18" fill="#FFFFFF" />
        <rect x="4" y="4" width="28" height="28" rx="14" fill="#EC4899" />
        <path d="M14 18l4 4 6-6" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <text x="42" y="22" fill="#1e293b" fontSize="12" fontWeight="700" fontFamily="Inter, sans-serif">AI Resume Builder</text>
      </g>

      {/* Resume Document - Main Center */}
      <g transform="translate(400, 270)">
        <rect x="-110" y="-130" width="220" height="280" rx="8" fill="#FFFFFF" />
        {/* Resume header */}
        <rect x="-110" y="-130" width="220" height="36" rx="8" fill="#EC4899" />
        <rect x="-110" y="-94" width="220" height="2" fill="#EC4899" opacity="0.08" />
        <text x="0" y="-108" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="800" fontFamily="Inter, sans-serif">PROFESSIONAL RESUME</text>
        {/* Resume content lines */}
        <rect x="-90" y="-78" width="180" height="5" rx="2.5" fill="#1e293b" opacity="0.12" />
        <rect x="-90" y="-65" width="120" height="5" rx="2.5" fill="#1e293b" opacity="0.06" />
        <rect x="-90" y="-48" width="180" height="2" rx="1" fill="#1e293b" opacity="0.05" />
        <rect x="-90" y="-42" width="160" height="2" rx="1" fill="#1e293b" opacity="0.05" />
        <rect x="-90" y="-36" width="140" height="2" rx="1" fill="#1e293b" opacity="0.05" />
        {/* Section: Skills */}
        <rect x="-90" y="-24" width="40" height="10" rx="3" fill="#EC4899" />
        <rect x="-90" y="-6" width="180" height="2" rx="1" fill="#1e293b" opacity="0.05" />
        <rect x="-90" y="0" width="160" height="2" rx="1" fill="#1e293b" opacity="0.05" />
        <rect x="-90" y="6" width="120" height="2" rx="1" fill="#1e293b" opacity="0.05" />
        {/* Section: Experience */}
        <rect x="-90" y="20" width="50" height="10" rx="3" fill="#3B82F6" />
        <rect x="-90" y="38" width="180" height="2" rx="1" fill="#1e293b" opacity="0.05" />
        <rect x="-90" y="44" width="150" height="2" rx="1" fill="#1e293b" opacity="0.05" />
        <rect x="-90" y="58" width="180" height="2" rx="1" fill="#1e293b" opacity="0.05" />
        <rect x="-90" y="64" width="140" height="2" rx="1" fill="#1e293b" opacity="0.05" />
        {/* Section: Education */}
        <rect x="-90" y="78" width="48" height="10" rx="3" fill="#F472B6" />
        <rect x="-90" y="96" width="180" height="2" rx="1" fill="#1e293b" opacity="0.05" />
        <rect x="-90" y="102" width="130" height="2" rx="1" fill="#1e293b" opacity="0.05" />
        {/* ATS Score badge */}
        <rect x="70" y="-120" width="32" height="18" rx="4" fill="#3B82F6" />
        <text x="86" y="-108" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="800" fontFamily="Inter, sans-serif">96</text>
      </g>

      {/* White Card - Features (bottom center) */}
      <g transform="translate(260, 480)">
        <rect x="0" y="0" width="280" height="44" rx="10" fill="#FFFFFF" />
        <rect x="12" y="12" width="76" height="20" rx="10" fill="#EC4899" opacity="0.1" />
        <text x="28" y="25" fill="#EC4899" fontSize="10" fontWeight="700" fontFamily="Inter, sans-serif">ATS Scoring</text>
        <rect x="96" y="12" width="80" height="20" rx="10" fill="#3B82F6" opacity="0.1" />
        <text x="114" y="25" fill="#3B82F6" fontSize="10" fontWeight="700" fontFamily="Inter, sans-serif">AI Rewrite</text>
        <rect x="184" y="12" width="84" height="20" rx="10" fill="#F472B6" opacity="0.1" />
        <text x="202" y="25" fill="#EC4899" fontSize="10" fontWeight="700" fontFamily="Inter, sans-serif">Job Match</text>
      </g>

      {/* Geometric corner accents */}
      <path d="M 20 40 L 40 40 L 40 20" stroke="#EC4899" strokeWidth="1.5" opacity="0.25" fill="none" />
      <path d="M 780 40 L 760 40 L 760 20" stroke="#3B82F6" strokeWidth="1.5" opacity="0.25" fill="none" />
      <path d="M 20 560 L 40 560 L 40 580" stroke="#EC4899" strokeWidth="1.5" opacity="0.25" fill="none" />
      <path d="M 780 560 L 760 560 L 760 580" stroke="#3B82F6" strokeWidth="1.5" opacity="0.25" fill="none" />
    </svg>
  );
}
