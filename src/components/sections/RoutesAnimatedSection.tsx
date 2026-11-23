import { Clock, Container, Ship } from 'lucide-react';

const corridors = [
  {
    name: 'Mersin, Turkey Route',
    duration: '35–45 days',
    summary: 'Ocean container sailing to Mersin port followed by controlled overland transit into Herat and onward Afghan provinces.',
    icon: Ship,
  },
  {
    name: 'UAE Route',
    duration: '30–40 days',
    summary: 'Container shipping through UAE hubs with fast onward dispatch and customs coordination into Afghanistan.',
    icon: Container,
  },
];

const hubs = [
  'Herat',
  'Kabul',
  'Kandahar',
  'Mazar-i-Sharif',
  'Jalalabad',
  'Kunduz',
  'Ghazni',
  'Khost',
];

const nodes = [
  { id: 'canada', x: 250, y: 168, label: 'Canada' },
  { id: 'usa', x: 230, y: 222, label: 'USA' },
  { id: 'mersin', x: 555, y: 230, label: 'Mersin' },
  { id: 'uae', x: 604, y: 306, label: 'UAE' },
  { id: 'afghanistan', x: 632, y: 250, label: 'Afghanistan' },
];

const paths = [
  'M 250 168 Q 390 92 555 230 Q 600 220 632 250',
  'M 230 222 Q 398 150 555 230 Q 600 220 632 250',
  'M 250 168 Q 430 178 604 306 Q 632 290 632 250',
  'M 230 222 Q 430 230 604 306 Q 632 290 632 250',
];

export default function RoutesAnimatedSection() {
  return (
    <section id="route" className="relative border-t border-[#E5E7EB] bg-[#F9FAFB] py-20 sm:py-24 scroll-mt-16">
      <div id="routes" className="absolute -top-16" aria-hidden="true" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.15fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B5C17]">
              Shipping corridors
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.025em] text-[#1C1C1E] sm:text-4xl">
              Two direct routes into Afghanistan.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#5F6368]">
              We coordinate pickups from across the USA and Canada and route each shipment through
              Mersin or UAE based on schedule, lane cost, and destination province.
            </p>

            <div className="mt-8 space-y-3">
              {corridors.map((corridor) => {
                const Icon = corridor.icon;
                return (
                  <div
                    key={corridor.name}
                    className="rounded-xl border border-[#E5E7EB] bg-white p-5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] text-[#1C1C1E]">
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </div>
                        <h3 className="text-base font-semibold text-[#1C1C1E]">{corridor.name}</h3>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#F9FAFB] border border-[#E5E7EB] px-2.5 py-1 text-xs font-medium text-[#5F6368] tabular-nums shrink-0">
                        <Clock className="h-3 w-3 text-[#6B5C17]" aria-hidden="true" />
                        {corridor.duration}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-[#5F6368]">
                      {corridor.summary}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-3">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-[#F9FAFB]">
              <div className="absolute inset-0 bg-[url('/world-map.svg')] bg-cover bg-center bg-no-repeat opacity-20" />

              <svg
                viewBox="0 0 950 620"
                className="absolute inset-0 h-full w-full"
                preserveAspectRatio="xMidYMid meet"
                role="img"
                aria-label="Shipping corridors from USA and Canada via Mersin and UAE to Afghanistan"
              >
                {paths.map((d, i) => (
                  <path
                    key={`route-${i}`}
                    d={d}
                    fill="none"
                    stroke="#D4AF37"
                    strokeOpacity={i < 2 ? 0.9 : 0.65}
                    strokeWidth="2.5"
                    strokeDasharray={i < 2 ? undefined : '6 6'}
                    strokeLinecap="round"
                  />
                ))}

                {nodes.map((node) => (
                  <g key={node.id}>
                    <circle cx={node.x} cy={node.y} r="5.5" fill="#1C1C1E" />
                    <circle cx={node.x} cy={node.y} r="10" fill="none" stroke="#D4AF37" strokeWidth="1.5" />
                    <text
                      x={node.x}
                      y={node.y - 16}
                      fill="#1C1C1E"
                      fontSize="14"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      {node.label}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[#E5E7EB] pt-6 text-sm text-[#5F6368]">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#1C1C1E]">
            Delivery hubs
          </span>
          {hubs.map((hub) => (
            <span key={hub}>{hub}</span>
          ))}
          <span className="font-medium text-[#6B5C17]">+ all 34 provinces</span>
        </div>
      </div>
    </section>
  );
}