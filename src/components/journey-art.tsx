type ArtProps = { className?: string };

const wrap = (children: React.ReactNode, viewBox = "0 0 400 220") => (
  <svg
    viewBox={viewBox}
    preserveAspectRatio="xMidYMid slice"
    xmlns="http://www.w3.org/2000/svg"
    className="h-full w-full"
    aria-hidden="true"
  >
    {children}
  </svg>
);

type PersonProps = {
  x: number;
  y: number;
  scale?: number;
  pose?: "stand" | "walk" | "sit" | "lounge" | "point";
  skin?: string;
  shirt?: string;
  backpack?: boolean;
};

/** A small flat, faceless figure — deliberately stylized, not photoreal. */
function Person({ x, y, scale = 1, pose = "stand", skin = "var(--color-forest-950)", shirt, backpack }: PersonProps) {
  const body = shirt ?? skin;

  return (
    <g transform={`translate(${x},${y}) scale(${scale})`}>
      {pose === "lounge" ? (
        <>
          <ellipse cx="0" cy="0" rx="16" ry="4.5" fill={body} />
          <circle cx="-17" cy="-2" r="4.5" fill={skin} />
        </>
      ) : pose === "sit" ? (
        <>
          <circle cx="0" cy="-19" r="4" fill={skin} />
          <path d="M-6 -15 Q0 -8 6 -15 L6 -3 Q0 2 -6 -3 Z" fill={body} />
        </>
      ) : pose === "walk" ? (
        <>
          <circle cx="0" cy="-24" r="4" fill={skin} />
          <line x1="0" y1="-20" x2="0" y2="-6" stroke={body} strokeWidth="4" strokeLinecap="round" />
          <line x1="0" y1="-16" x2="-6" y2="-9" stroke={body} strokeWidth="3" strokeLinecap="round" />
          <line x1="0" y1="-16" x2="7" y2="-11" stroke={body} strokeWidth="3" strokeLinecap="round" />
          <line x1="0" y1="-6" x2="-6" y2="8" stroke={skin} strokeWidth="3" strokeLinecap="round" />
          <line x1="0" y1="-6" x2="6" y2="8" stroke={skin} strokeWidth="3" strokeLinecap="round" />
          {backpack && <rect x="-3" y="-19" width="7" height="10" rx="2" fill="var(--color-marigold-500)" />}
        </>
      ) : pose === "point" ? (
        <>
          <circle cx="0" cy="-24" r="4" fill={skin} />
          <line x1="0" y1="-20" x2="0" y2="-4" stroke={body} strokeWidth="4" strokeLinecap="round" />
          <line x1="0" y1="-17" x2="10" y2="-24" stroke={body} strokeWidth="3" strokeLinecap="round" />
          <line x1="0" y1="-17" x2="-6" y2="-10" stroke={body} strokeWidth="3" strokeLinecap="round" />
          <line x1="0" y1="-4" x2="-4" y2="10" stroke={skin} strokeWidth="3" strokeLinecap="round" />
          <line x1="0" y1="-4" x2="4" y2="10" stroke={skin} strokeWidth="3" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="0" cy="-24" r="4" fill={skin} />
          <line x1="0" y1="-20" x2="0" y2="-4" stroke={body} strokeWidth="4" strokeLinecap="round" />
          <line x1="0" y1="-17" x2="-6" y2="-8" stroke={body} strokeWidth="3" strokeLinecap="round" />
          <line x1="0" y1="-17" x2="6" y2="-8" stroke={body} strokeWidth="3" strokeLinecap="round" />
          <line x1="0" y1="-4" x2="-4" y2="10" stroke={skin} strokeWidth="3" strokeLinecap="round" />
          <line x1="0" y1="-4" x2="4" y2="10" stroke={skin} strokeWidth="3" strokeLinecap="round" />
          {backpack && <rect x="-3" y="-19" width="7" height="10" rx="2" fill="var(--color-marigold-500)" />}
        </>
      )}
    </g>
  );
}

function RelaxUnwindArt() {
  return wrap(
    <>
      <rect width="400" height="220" fill="var(--color-nile-100)" />
      <circle cx="330" cy="55" r="26" fill="var(--color-marigold-200)" />
      <path d="M0 150 Q60 130 130 148 T260 146 T400 150 V220 H0 Z" fill="var(--color-forest-600)" />
      <path d="M0 168 Q70 150 140 166 T280 164 T400 170 V220 H0 Z" fill="var(--color-nile-400)" />
      <path
        d="M0 190 Q60 180 130 190 T260 188 T400 192"
        stroke="var(--color-nile-200)"
        strokeWidth="3"
        fill="none"
        opacity="0.7"
      />
      <path
        d="M0 205 Q60 197 130 205 T260 203 T400 207"
        stroke="var(--color-nile-100)"
        strokeWidth="3"
        fill="none"
        opacity="0.6"
      />
      <rect x="38" y="128" width="46" height="30" fill="var(--color-forest-800)" />
      <polygon points="30,128 61,105 92,128" fill="var(--color-forest-900)" />
      <line x1="20" y1="158" x2="20" y2="185" stroke="var(--color-forest-800)" strokeWidth="4" />
      <line x1="20" y1="182" x2="70" y2="182" stroke="var(--color-forest-800)" strokeWidth="4" />
      {[300, 320, 345].map((x, i) => (
        <g key={x}>
          <line x1={x} y1={150 - i * 4} x2={x} y2={130 - i * 4} stroke="var(--color-forest-800)" strokeWidth="3" />
          <circle cx={x} cy={122 - i * 4} r="12" fill="var(--color-forest-500)" />
        </g>
      ))}
      <rect x="130" y="152" width="30" height="6" rx="3" fill="var(--color-sand-100)" />
      <Person x={135} y={152} scale={0.85} pose="lounge" skin="var(--color-forest-900)" shirt="var(--color-marigold-400)" />
      <Person x={45} y={158} scale={0.8} pose="sit" skin="var(--color-forest-900)" shirt="var(--color-nile-600)" />
    </>,
  );
}

function AdrenalineArt() {
  return wrap(
    <>
      <rect width="400" height="220" fill="var(--color-forest-900)" />
      <polygon points="0,0 90,0 40,220 0,220" fill="var(--color-forest-800)" opacity="0.8" />
      <polygon points="400,0 320,0 380,220 400,220" fill="var(--color-forest-800)" opacity="0.8" />
      <path d="M60 20 L60 78" stroke="var(--color-sand-100)" strokeWidth="2" strokeDasharray="4 5" />
      <g transform="translate(60,88)">
        <circle cx="0" cy="0" r="4.5" fill="var(--color-marigold-300)" />
        <line x1="0" y1="4" x2="0" y2="16" stroke="var(--color-marigold-400)" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="0" y1="8" x2="-9" y2="1" stroke="var(--color-marigold-400)" strokeWidth="3" strokeLinecap="round" />
        <line x1="0" y1="8" x2="9" y2="1" stroke="var(--color-marigold-400)" strokeWidth="3" strokeLinecap="round" />
        <line x1="0" y1="16" x2="-5" y2="26" stroke="var(--color-marigold-300)" strokeWidth="3" strokeLinecap="round" />
        <line x1="0" y1="16" x2="5" y2="26" stroke="var(--color-marigold-300)" strokeWidth="3" strokeLinecap="round" />
      </g>
      <path d="M80 130 Q140 100 200 135 T340 128" fill="var(--color-nile-600)" />
      <path d="M80 150 Q140 122 200 155 T340 148 V220 H80 Z" fill="var(--color-nile-700)" />
      <path
        d="M90 140 Q120 128 150 140 T210 138 T270 142 T330 136"
        stroke="var(--color-nile-100)"
        strokeWidth="3"
        fill="none"
        opacity="0.85"
      />
      <path
        d="M100 160 Q130 150 160 160 T220 158 T280 162"
        stroke="var(--color-nile-200)"
        strokeWidth="2.5"
        fill="none"
        opacity="0.7"
      />
      <g transform="translate(190,150) rotate(-8)">
        <rect x="-32" y="-8" width="64" height="16" rx="8" fill="var(--color-marigold-500)" />
        {[-14, 4, 20].map((cx) => (
          <g key={cx} transform={`translate(${cx},-11)`}>
            <circle cx="0" cy="0" r="4.5" fill="var(--color-forest-950)" />
            <line x1="-4" y1="4" x2="4" y2="4" stroke="var(--color-forest-950)" strokeWidth="4" strokeLinecap="round" />
          </g>
        ))}
      </g>
    </>,
  );
}

function BigFiveSafariArt() {
  return wrap(
    <>
      <rect width="400" height="220" fill="var(--color-marigold-100)" />
      <circle cx="90" cy="70" r="34" fill="var(--color-marigold-400)" />
      <path d="M0 150 Q100 120 200 148 T400 145 V220 H0 Z" fill="var(--color-marigold-300)" />
      <path d="M0 165 Q100 140 200 163 T400 160 V220 H0 Z" fill="var(--color-marigold-200)" />
      <g transform="translate(300,120)">
        <line x1="0" y1="0" x2="0" y2="40" stroke="var(--color-forest-800)" strokeWidth="4" />
        <ellipse cx="0" cy="-8" rx="26" ry="10" fill="var(--color-forest-700)" />
      </g>
      <g transform="translate(340,132)">
        <line x1="0" y1="0" x2="0" y2="28" stroke="var(--color-forest-800)" strokeWidth="3" />
        <ellipse cx="0" cy="-6" rx="18" ry="7" fill="var(--color-forest-700)" />
      </g>
      <g transform="translate(130,168)" fill="var(--color-forest-900)">
        <ellipse cx="20" cy="10" rx="34" ry="16" />
        <circle cx="-14" cy="-2" r="15" />
        <path d="M-26 -2 Q-40 4 -34 16 Q-26 10 -22 4 Z" />
        <path d="M-30 8 Q-46 4 -44 -8" stroke="var(--color-forest-900)" strokeWidth="5" fill="none" strokeLinecap="round" />
        <rect x="-2" y="20" width="6" height="16" />
        <rect x="14" y="22" width="6" height="16" />
        <rect x="32" y="22" width="6" height="16" />
        <rect x="46" y="20" width="6" height="16" />
      </g>
      {[60, 90, 120].map((x) => (
        <path
          key={x}
          d={`M${x} 40 q6 -6 12 0 q6 -6 12 0`}
          stroke="var(--color-forest-700)"
          strokeWidth="2"
          fill="none"
          opacity="0.6"
        />
      ))}
      <Person x={40} y={192} scale={0.9} pose="point" skin="var(--color-forest-950)" shirt="var(--color-nile-700)" />
      <Person x={58} y={194} scale={0.85} pose="stand" skin="var(--color-forest-950)" shirt="var(--color-marigold-600)" />
    </>,
  );
}

function GorillaTrekkingArt() {
  return wrap(
    <>
      <rect width="400" height="220" fill="var(--color-forest-950)" />
      <path d="M0 90 Q100 60 200 88 T400 80 V220 H0 Z" fill="var(--color-forest-800)" />
      <path d="M0 120 Q100 95 200 118 T400 112 V220 H0 Z" fill="var(--color-forest-700)" />
      <ellipse cx="120" cy="100" rx="150" ry="30" fill="var(--color-forest-100)" opacity="0.06" />
      <g transform="translate(150,150)" fill="var(--color-forest-950)">
        <ellipse cx="0" cy="35" rx="58" ry="38" />
        <circle cx="0" cy="-10" r="30" />
        <circle cx="-24" cy="-16" r="9" />
        <circle cx="24" cy="-16" r="9" />
        <ellipse cx="-40" cy="30" rx="14" ry="30" />
        <ellipse cx="40" cy="30" rx="14" ry="30" />
      </g>
      <ellipse cx="150" cy="-8" rx="16" ry="12" fill="var(--color-forest-700)" transform="translate(0,150)" />
      {[40, 300, 330].map((x, i) => (
        <path
          key={x}
          d={`M${x} 220 Q${x + 8} ${170 - i * 6} ${x + 18} 220 Z`}
          fill="var(--color-forest-600)"
        />
      ))}
      <Person x={255} y={205} scale={0.95} pose="walk" skin="var(--color-forest-100)" shirt="var(--color-marigold-500)" backpack />
      <Person x={280} y={208} scale={0.85} pose="walk" skin="var(--color-forest-200)" shirt="var(--color-nile-500)" backpack />
    </>,
  );
}

function KampalaCityArt() {
  return wrap(
    <>
      <defs>
        <linearGradient id="kampalaSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-nile-900)" />
          <stop offset="100%" stopColor="var(--color-marigold-400)" />
        </linearGradient>
      </defs>
      <rect width="400" height="220" fill="url(#kampalaSky)" />
      <circle cx="70" cy="50" r="20" fill="var(--color-marigold-100)" opacity="0.9" />
      {[[0, 60, 60], [70, 90, 40], [170, 50, 80], [230, 70, 55], [310, 55, 95], [370, 40, 65]].map(
        ([x, w, h], i) => (
          <rect key={i} x={x} y={220 - h} width={w} height={h} fill="var(--color-forest-950)" />
        ),
      )}
      {[[190, 150, "var(--color-marigold-200)"], [220, 170, "var(--color-marigold-200)"], [335, 140, "var(--color-marigold-200)"]].map(
        ([x, y, c], i) => (
          <rect key={i} x={Number(x)} y={Number(y)} width="6" height="8" fill={String(c)} opacity="0.8" />
        ),
      )}
      <g transform="translate(100,180)">
        <polygon points="-30,0 30,0 20,-26 -20,-26" fill="var(--color-marigold-500)" />
        <rect x="-22" y="0" width="44" height="26" fill="var(--color-forest-800)" />
      </g>
      <g transform="translate(20,205)" fill="var(--color-forest-950)">
        <circle cx="0" cy="6" r="7" />
        <circle cx="26" cy="6" r="7" />
        <path d="M0 6 L14 -8 L26 6 M14 -8 L14 -2" stroke="var(--color-forest-950)" strokeWidth="3" fill="none" />
      </g>
      <Person x={110} y={216} scale={0.95} pose="stand" skin="var(--color-sand-100)" shirt="var(--color-nile-600)" />
      <Person x={85} y={218} scale={0.85} pose="walk" skin="var(--color-sand-100)" shirt="var(--color-marigold-600)" />
    </>,
  );
}

const artBySlug: Record<string, () => React.ReactElement> = {
  "relax-unwind": RelaxUnwindArt,
  "adrenaline-on-the-nile": AdrenalineArt,
  "big-five-safari": BigFiveSafariArt,
  "gorilla-trekking": GorillaTrekkingArt,
  "kampala-city-experience": KampalaCityArt,
};

export function JourneyArt({ slug, className }: { slug: string } & ArtProps) {
  const Art = artBySlug[slug] ?? RelaxUnwindArt;
  return (
    <div className={className}>
      <Art />
    </div>
  );
}
