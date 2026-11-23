const AFGHANISTAN_PATH =
  'M 135.2 159.9 L 129.8 182.5 L 123.3 207.9 L 112.1 221.8 L 113.8 246 L 122.7 268.5 L 121.3 299.2 L 124 330.4 L 151.9 334.9 L 151.5 356.6 L 123.7 397.2 L 180.7 416 L 214.7 411.9 L 245.3 409.4 L 265.7 407.8 L 307.1 397.6 L 310.8 353.7 L 323.4 341.4 L 358.7 337.3 L 379.4 332 L 405.9 317.7 L 410.7 291 L 431.1 269.3 L 444.6 255.4 L 429.7 231.6 L 458.2 229.2 L 471.8 223.4 L 484.7 207.9 L 488.1 181.7 L 477.9 162.8 L 486.4 139.5 L 510.2 117.7 L 551 107.9 L 588.3 103.8 L 599.9 94.8 L 588.7 87.4 L 559.5 85.8 L 524.1 102.6 L 486.4 116.9 L 484.7 90.3 L 476.2 61.6 L 462.7 44 L 439.9 57.5 L 417.5 82.1 L 394.7 99.7 L 359.1 97.3 L 330.2 90.3 L 292.8 83.3 L 257.2 100.5 L 235.1 127.2 L 202.8 148.9 L 170.6 174.3 L 150.2 164 Z';

const hubs = [
  {
    name: 'Herat',
    sublabel: 'Customs Hub',
    x: 168.9,
    y: 213.2,
    labelX: 168.9,
    labelY: 237,
    anchor: 'middle' as const,
    primary: true,
  },
  {
    name: 'Mazar-i-Sharif',
    x: 335.6,
    y: 116.5,
    labelX: 335.6,
    labelY: 136,
    anchor: 'middle' as const,
    primary: false,
  },
  {
    name: 'Kunduz',
    x: 395.1,
    y: 115.7,
    labelX: 407,
    labelY: 119,
    anchor: 'start' as const,
    primary: false,
  },
  {
    name: 'Kabul',
    x: 406.9,
    y: 204.6,
    labelX: 402,
    labelY: 192,
    anchor: 'end' as const,
    primary: false,
  },
  {
    name: 'Jalalabad',
    x: 449.1,
    y: 209.9,
    labelX: 449.1,
    labelY: 229,
    anchor: 'middle' as const,
    primary: false,
  },
  {
    name: 'Kandahar',
    x: 288.1,
    y: 324.6,
    labelX: 288.1,
    labelY: 344,
    anchor: 'middle' as const,
    primary: false,
  },
];

// Domestic distribution corridors radiating from Herat Customs Hub
const domesticRoutes = [
  'M 168.9 213.2 Q 252 148 335.6 116.5', // Herat -> Mazar-i-Sharif
  'M 335.6 116.5 Q 365 110 395.1 115.7', // Mazar-i-Sharif -> Kunduz
  'M 168.9 213.2 Q 290 198 406.9 204.6', // Herat -> Kabul
  'M 406.9 204.6 L 449.1 209.9', // Kabul -> Jalalabad
  'M 168.9 213.2 Q 212 288 288.1 324.6', // Herat -> Kandahar
  'M 288.1 324.6 Q 362 278 406.9 204.6', // Kandahar -> Kabul
];

export default function AfghanistanHeroMap() {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F9FAFB]">
      {/* Subtle top-left badge */}
      <div className="pointer-events-none absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white/90 px-3 py-1 text-[11px] font-medium text-[#5F6368] backdrop-blur-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" aria-hidden="true" />
        <span>Afghanistan delivery network</span>
      </div>

      <svg
        viewBox="0 0 640 460"
        className="h-full w-full"
        role="img"
        aria-label="Minimal map of Afghanistan showing JACXI Shipping entry routes via Mersin and UAE into Herat Customs Hub and delivery corridors to Kabul, Kandahar, Mazar-i-Sharif, Jalalabad, and Kunduz"
      >
        <defs>
          {/* Subtle architectural dot grid */}
          <pattern id="hero-map-dots" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="0.85" fill="#E5E7EB" />
          </pattern>

          {/* Soft warm radial highlight over Afghanistan */}
          <radialGradient id="afg-fill" cx="35%" cy="48%" r="65%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="70%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#FBF8EE" />
          </radialGradient>

          <filter id="afg-shadow" x="-6%" y="-6%" width="112%" height="112%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#0F172A" floodOpacity="0.06" />
          </filter>
        </defs>

        {/* Background subtle dot matrix */}
        <rect width="640" height="460" fill="url(#hero-map-dots)" />

        {/* Afghanistan country silhouette */}
        <path
          d={AFGHANISTAN_PATH}
          fill="url(#afg-fill)"
          stroke="#CBD5E1"
          strokeWidth="1.75"
          strokeLinejoin="round"
          filter="url(#afg-shadow)"
        />

        {/* Delicate inner gold hairline accent */}
        <path
          d={AFGHANISTAN_PATH}
          fill="none"
          stroke="#D4AF37"
          strokeOpacity="0.28"
          strokeWidth="0.9"
          strokeLinejoin="round"
        />

        {/* Inbound international entry curves connecting into Herat Customs Hub */}
        <g>
          {/* Via Mersin (Northwest entry) */}
          <path
            d="M 28 118 Q 92 142 168.9 213.2"
            fill="none"
            stroke="#D4AF37"
            strokeWidth="1.75"
            strokeDasharray="4 4"
            strokeLinecap="round"
          />
          <text
            x="30"
            y="108"
            fill="#6B5C17"
            fontSize="11"
            fontWeight="600"
            letterSpacing="0.02em"
          >
            Via Mersin
          </text>

          {/* Via UAE (Southwest entry) */}
          <path
            d="M 28 318 Q 88 286 168.9 213.2"
            fill="none"
            stroke="#D4AF37"
            strokeWidth="1.75"
            strokeDasharray="4 4"
            strokeLinecap="round"
          />
          <text
            x="30"
            y="336"
            fill="#6B5C17"
            fontSize="11"
            fontWeight="600"
            letterSpacing="0.02em"
          >
            Via UAE
          </text>
        </g>

        {/* Domestic delivery ring-road corridors */}
        <g fill="none" stroke="#D4AF37" strokeWidth="1.5" strokeOpacity="0.85" strokeLinecap="round">
          {domesticRoutes.map((d, i) => (
            <path key={`domestic-${i}`} d={d} />
          ))}
        </g>

        {/* Delivery hub nodes & labels */}
        {hubs.map((hub) => (
          <g key={hub.name}>
            {hub.primary ? (
              <>
                <circle
                  cx={hub.x}
                  cy={hub.y}
                  r="13"
                  fill="#D4AF37"
                  fillOpacity="0.16"
                />
                <circle
                  cx={hub.x}
                  cy={hub.y}
                  r="6"
                  fill="#D4AF37"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
                <text
                  x={hub.labelX}
                  y={hub.labelY}
                  textAnchor={hub.anchor}
                  fill="#1C1C1E"
                  fontSize="12.5"
                  fontWeight="700"
                  paintOrder="stroke"
                  stroke="#FFFFFF"
                  strokeWidth="4"
                  strokeLinejoin="round"
                >
                  {hub.name}
                </text>
                {hub.sublabel && (
                  <text
                    x={hub.labelX}
                    y={hub.labelY + 13}
                    textAnchor={hub.anchor}
                    fill="#6B5C17"
                    fontSize="10"
                    fontWeight="600"
                    paintOrder="stroke"
                    stroke="#FFFFFF"
                    strokeWidth="3.5"
                    strokeLinejoin="round"
                  >
                    {hub.sublabel}
                  </text>
                )}
              </>
            ) : (
              <>
                <circle
                  cx={hub.x}
                  cy={hub.y}
                  r="4"
                  fill="#1C1C1E"
                  stroke="#FFFFFF"
                  strokeWidth="1.75"
                />
                <text
                  x={hub.labelX}
                  y={hub.labelY}
                  textAnchor={hub.anchor}
                  fill="#1C1C1E"
                  fontSize="11.5"
                  fontWeight="600"
                  paintOrder="stroke"
                  stroke="#FFFFFF"
                  strokeWidth="3.5"
                  strokeLinejoin="round"
                >
                  {hub.name}
                </text>
              </>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
