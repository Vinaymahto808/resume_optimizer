export default function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 800 600"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "auto", maxWidth: 900, display: "block" }}
    >
      {/* Background flat color blocks */}
      <rect width="800" height="600" fill="#2563EB" />
      <rect x="0" y="0" width="360" height="600" fill="#EC4899" />
      <rect x="360" y="0" width="160" height="600" fill="#DB2777" />
      <rect x="520" y="0" width="140" height="600" fill="#2563EB" opacity="0.7" />

      {/* Geometric accent shapes */}
      <rect x="0" y="0" width="800" height="4" fill="#93C5FD" opacity="0.5" />
      <rect x="0" y="596" width="800" height="4" fill="#93C5FD" opacity="0.3" />
      <rect x="40" y="40" width="120" height="2" fill="#93C5FD" opacity="0.3" />
      <rect x="640" y="40" width="120" height="2" fill="#93C5FD" opacity="0.3" />
      <rect x="40" y="558" width="80" height="2" fill="#93C5FD" opacity="0.3" />
      <rect x="680" y="558" width="80" height="2" fill="#93C5FD" opacity="0.3" />

      {/* Decorative geometric diamond shapes */}
      <rect x="80" y="100" width="16" height="16" rx="2" fill="#93C5FD" opacity="0.15" transform="rotate(45 88 108)" />
      <rect x="704" y="100" width="16" height="16" rx="2" fill="#93C5FD" opacity="0.15" transform="rotate(45 712 108)" />
      <rect x="80" y="484" width="12" height="12" rx="2" fill="#93C5FD" opacity="0.15" transform="rotate(45 86 490)" />
      <rect x="708" y="484" width="12" height="12" rx="2" fill="#93C5FD" opacity="0.15" transform="rotate(45 714 490)" />

      {/* Subtle grid dots */}
      <g opacity="0.06">
        {Array.from({ length: 12 }).map((_, xi) =>
          Array.from({ length: 8 }).map((_, yi) => (
            <circle key={`g-${xi}-${yi}`} cx={60 + xi * 60} cy={80 + yi * 60} r="1.5" fill="#FFFFFF" />
          ))
        )}
      </g>

      {/* Glowing lines - geometric connection lines */}
      <line x1="120" y1="200" x2="280" y2="160" stroke="#93C5FD" strokeWidth="1" opacity="0.2" />
      <line x1="120" y1="200" x2="200" y2="380" stroke="#F9A8D4" strokeWidth="1" opacity="0.2" />
      <line x1="680" y1="200" x2="520" y2="160" stroke="#93C5FD" strokeWidth="1" opacity="0.2" />
      <line x1="680" y1="200" x2="600" y2="380" stroke="#F9A8D4" strokeWidth="1" opacity="0.2" />
      <line x1="280" y1="160" x2="520" y2="160" stroke="#93C5FD" strokeWidth="0.5" opacity="0.15" />
      <line x1="200" y1="380" x2="600" y2="380" stroke="#93C5FD" strokeWidth="0.5" opacity="0.15" />

      {/* White Card - AI Features (top center) */}
      <g transform="translate(300, 80)">
        <rect x="0" y="0" width="200" height="36" rx="18" fill="#FFFFFF" />
        <rect x="4" y="4" width="28" height="28" rx="14" fill="#EC4899" />
        <path d="M14 18l4 4 6-6" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <text x="42" y="22" fill="#1e293b" fontSize="12" fontWeight="700" fontFamily="Inter, sans-serif">AI Resume Builder</text>
      </g>

      {/* AI Brain Icon - abstract geometric (left center) */}
      <g transform="translate(140, 200)">
        {/* Outer brain shape */}
        <path
          d="M 60 20 Q 80 0 100 20 Q 120 40 110 60 Q 120 80 100 100 Q 80 120 60 100 Q 40 120 20 100 Q 0 80 10 60 Q 0 40 20 20 Q 40 0 60 20 Z"
          fill="none"
          stroke="#93C5FD"
          strokeWidth="1.5"
          opacity="0.6"
        />
        {/* Inner brain circuits */}
        <path
          d="M 60 30 Q 75 20 85 35 Q 95 50 85 60 Q 75 70 60 65 Q 45 70 35 60 Q 25 50 35 35 Q 45 20 60 30 Z"
          fill="none"
          stroke="#93C5FD"
          strokeWidth="1.5"
          opacity="0.4"
        />
        {/* Neural nodes */}
        <circle cx="60" cy="20" r="3" fill="#93C5FD" opacity="0.7" />
        <circle cx="110" cy="60" r="3" fill="#93C5FD" opacity="0.7" />
        <circle cx="10" cy="60" r="3" fill="#93C5FD" opacity="0.7" />
        <circle cx="60" cy="100" r="3" fill="#93C5FD" opacity="0.7" />
        {/* Node connections */}
        <line x1="60" y1="20" x2="110" y2="60" stroke="#F9A8D4" strokeWidth="0.8" opacity="0.4" />
        <line x1="60" y1="20" x2="10" y2="60" stroke="#F9A8D4" strokeWidth="0.8" opacity="0.4" />
        <line x1="110" y1="60" x2="60" y2="100" stroke="#F9A8D4" strokeWidth="0.8" opacity="0.4" />
        <line x1="10" y1="60" x2="60" y2="100" stroke="#F9A8D4" strokeWidth="0.8" opacity="0.4" />
        <line x1="110" y1="60" x2="60" y2="65" stroke="#F9A8D4" strokeWidth="0.5" opacity="0.3" />
        <line x1="10" y1="60" x2="60" y2="65" stroke="#F9A8D4" strokeWidth="0.5" opacity="0.3" />
        {/* Brain-resume merge line */}
        <line x1="120" y1="60" x2="180" y2="80" stroke="#93C5FD" strokeWidth="1" opacity="0.5" strokeDasharray="3 3" />
      </g>

      {/* AI Brain Icon - abstract geometric (right center) */}
      <g transform="translate(560, 200)">
        <path
          d="M 60 20 Q 80 0 100 20 Q 120 40 110 60 Q 120 80 100 100 Q 80 120 60 100 Q 40 120 20 100 Q 0 80 10 60 Q 0 40 20 20 Q 40 0 60 20 Z"
          fill="none"
          stroke="#93C5FD"
          strokeWidth="1.5"
          opacity="0.6"
        />
        <path
          d="M 60 30 Q 75 20 85 35 Q 95 50 85 60 Q 75 70 60 65 Q 45 70 35 60 Q 25 50 35 35 Q 45 20 60 30 Z"
          fill="none"
          stroke="#93C5FD"
          strokeWidth="1.5"
          opacity="0.4"
        />
        <circle cx="60" cy="20" r="3" fill="#93C5FD" opacity="0.7" />
        <circle cx="110" cy="60" r="3" fill="#93C5FD" opacity="0.7" />
        <circle cx="10" cy="60" r="3" fill="#93C5FD" opacity="0.7" />
        <circle cx="60" cy="100" r="3" fill="#93C5FD" opacity="0.7" />
        <line x1="60" y1="20" x2="110" y2="60" stroke="#F9A8D4" strokeWidth="0.8" opacity="0.4" />
        <line x1="60" y1="20" x2="10" y2="60" stroke="#F9A8D4" strokeWidth="0.8" opacity="0.4" />
        <line x1="110" y1="60" x2="60" y2="100" stroke="#F9A8D4" strokeWidth="0.8" opacity="0.4" />
        <line x1="10" y1="60" x2="60" y2="100" stroke="#F9A8D4" strokeWidth="0.8" opacity="0.4" />
        {/* Merge line to resume */}
        <line x1="-20" y1="60" x2="-80" y2="80" stroke="#93C5FD" strokeWidth="1" opacity="0.5" strokeDasharray="3 3" />
      </g>

      {/* Resume Document - Main Center */}
      <g transform="translate(400, 290)">
        <rect x="-100" y="-130" width="200" height="260" rx="8" fill="#FFFFFF" />
        {/* Resume header */}
        <rect x="-100" y="-130" width="200" height="36" rx="8" fill="#2563EB" />
        <rect x="-100" y="-94" width="200" height="2" fill="#2563EB" opacity="0.08" />
        <text x="0" y="-108" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="800" fontFamily="Inter, sans-serif">AI-GENERATED RESUME</text>
        {/* Resume content lines */}
        <rect x="-80" y="-78" width="160" height="5" rx="2.5" fill="#1e293b" opacity="0.15" />
        <rect x="-80" y="-65" width="100" height="5" rx="2.5" fill="#1e293b" opacity="0.08" />
        <rect x="-80" y="-48" width="160" height="2" rx="1" fill="#1e293b" opacity="0.06" />
        <rect x="-80" y="-42" width="140" height="2" rx="1" fill="#1e293b" opacity="0.06" />
        <rect x="-80" y="-36" width="120" height="2" rx="1" fill="#1e293b" opacity="0.06" />
        {/* Section: Skills */}
        <rect x="-80" y="-24" width="40" height="10" rx="3" fill="#2563EB" />
        <rect x="-80" y="-6" width="160" height="2" rx="1" fill="#1e293b" opacity="0.06" />
        <rect x="-80" y="0" width="140" height="2" rx="1" fill="#1e293b" opacity="0.06" />
        <rect x="-80" y="6" width="100" height="2" rx="1" fill="#1e293b" opacity="0.06" />
        {/* Section: Experience */}
        <rect x="-80" y="20" width="50" height="10" rx="3" fill="#3B82F6" />
        <rect x="-80" y="38" width="160" height="2" rx="1" fill="#1e293b" opacity="0.06" />
        <rect x="-80" y="44" width="130" height="2" rx="1" fill="#1e293b" opacity="0.06" />
        <rect x="-80" y="58" width="160" height="2" rx="1" fill="#1e293b" opacity="0.06" />
        <rect x="-80" y="64" width="120" height="2" rx="1" fill="#1e293b" opacity="0.06" />
        {/* Section: Education */}
        <rect x="-80" y="78" width="48" height="10" rx="3" fill="#F472B6" />
        <rect x="-80" y="96" width="160" height="2" rx="1" fill="#1e293b" opacity="0.06" />
        <rect x="-80" y="102" width="110" height="2" rx="1" fill="#1e293b" opacity="0.06" />
        {/* ATS Score badge */}
        <rect x="60" y="-120" width="32" height="18" rx="4" fill="#2563EB" />
        <text x="76" y="-108" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="800" fontFamily="Inter, sans-serif">96</text>
      </g>

      {/* White Card - Features (bottom center) */}
      <g transform="translate(260, 480)">
        <rect x="0" y="0" width="280" height="44" rx="10" fill="#FFFFFF" />
        {/* Feature pills */}
        <rect x="12" y="12" width="76" height="20" rx="10" fill="#EC4899" opacity="0.1" />
        <text x="28" y="25" fill="#EC4899" fontSize="10" fontWeight="700" fontFamily="Inter, sans-serif">ATS Scoring</text>
        <rect x="96" y="12" width="80" height="20" rx="10" fill="#2563EB" opacity="0.1" />
        <text x="114" y="25" fill="#2563EB" fontSize="10" fontWeight="700" fontFamily="Inter, sans-serif">AI Rewrite</text>
        <rect x="184" y="12" width="84" height="20" rx="10" fill="#F472B6" opacity="0.1" />
        <text x="202" y="25" fill="#EC4899" fontSize="10" fontWeight="700" fontFamily="Inter, sans-serif">Job Match</text>
      </g>

      {/* Decorative glowing dots */}
      <circle cx="50" cy="300" r="2" fill="#93C5FD" opacity="0.5" />
      <circle cx="750" cy="300" r="2" fill="#93C5FD" opacity="0.5" />
      <circle cx="50" cy="300" r="6" fill="#93C5FD" opacity="0.08" />
      <circle cx="750" cy="300" r="6" fill="#93C5FD" opacity="0.08" />

      {/* Geometric corner accents */}
      <path d="M 40 40 L 60 40 L 60 20" stroke="#93C5FD" strokeWidth="1.5" opacity="0.3" fill="none" />
      <path d="M 760 40 L 740 40 L 740 20" stroke="#93C5FD" strokeWidth="1.5" opacity="0.3" fill="none" />
      <path d="M 40 560 L 60 560 L 60 580" stroke="#93C5FD" strokeWidth="1.5" opacity="0.3" fill="none" />
      <path d="M 760 560 L 740 560 L 740 580" stroke="#93C5FD" strokeWidth="1.5" opacity="0.3" fill="none" />
    </svg>
  );
}
