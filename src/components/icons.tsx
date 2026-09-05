type IconProps = { className?: string };

const base = "h-5 w-5";

export function HomeIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path d="M3 11.5 12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a2 2 0 0 1 2-2 2 2 0 0 1 2 2v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CompassIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M14.5 9.5 13 13l-3.5 1.5L11 11l3.5-1.5Z" strokeLinejoin="round" />
    </svg>
  );
}

export function StampIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8 14.5c1-1.5 2-1.5 3 0s2 1.5 3 0 2-1.5 3 0" strokeLinecap="round" />
      <circle cx="12" cy="9.5" r="2" />
    </svg>
  );
}

export function TagIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path d="M11.5 4h-4A2.5 2.5 0 0 0 5 6.5v4a2 2 0 0 0 .6 1.4l7.5 7.5a2 2 0 0 0 2.8 0l4-4a2 2 0 0 0 0-2.8l-7.5-7.5A2 2 0 0 0 11.5 4Z" strokeLinejoin="round" />
      <circle cx="9" cy="9" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FlagIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path d="M6 3v18" strokeLinecap="round" />
      <path d="M6 4.5h11l-2.5 3.5L17 11.5H6" strokeLinejoin="round" />
    </svg>
  );
}

export function GridIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <rect x="4" y="4" width="7" height="7" rx="1.2" />
      <rect x="13" y="4" width="7" height="7" rx="1.2" />
      <rect x="4" y="13" width="7" height="7" rx="1.2" />
      <rect x="13" y="13" width="7" height="7" rx="1.2" />
    </svg>
  );
}

export function MegaphoneIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path d="M4 11v2a1 1 0 0 0 1 1h1.5l2.7 3.6a1 1 0 0 0 1.8-.6V7l-4.5 2.6H5a1 1 0 0 0-1 1Z" strokeLinejoin="round" />
      <path d="M14 6.5v11M17.5 8v8" strokeLinecap="round" />
    </svg>
  );
}

export function ChartIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path d="M4 20V10M11 20V4M18 20v-7" strokeLinecap="round" />
      <path d="M3 20h18" strokeLinecap="round" />
    </svg>
  );
}

export function UsersIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" strokeLinecap="round" />
      <circle cx="17" cy="9" r="2.3" />
      <path d="M15.5 19c0-2 1.2-3.7 3-4.3" strokeLinecap="round" />
    </svg>
  );
}

export function GaugeIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path d="M4 15a8 8 0 1 1 16 0" strokeLinecap="round" />
      <path d="M12 15 15.5 10" strokeLinecap="round" />
      <path d="M4 19h16" strokeLinecap="round" />
    </svg>
  );
}

export function LogOutIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path d="M9 4H6a1.5 1.5 0 0 0-1.5 1.5v13A1.5 1.5 0 0 0 6 20h3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 8l4 4-4 4M18 12H9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TrophyIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" strokeLinejoin="round" />
      <path d="M7 5.5H4.5a1 1 0 0 0-1 1V8a3 3 0 0 0 3 3M17 5.5h2.5a1 1 0 0 1 1 1V8a3 3 0 0 1-3 3" strokeLinecap="round" />
      <path d="M12 13v3M9 20h6M10 17h4v3h-4Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FileIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path d="M7 3.5h7L18.5 8v12a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-15.5a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
      <path d="M14 3.5V8h4.5" strokeLinejoin="round" />
      <path d="M9 13h6M9 16.5h6" strokeLinecap="round" />
    </svg>
  );
}

export function BedIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path d="M3 19v-8.5A1.5 1.5 0 0 1 4.5 9H12v6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 15h17a1 1 0 0 1 1 1v3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="7" cy="11.5" r="1.5" />
      <path d="M12 9h7.5A1.5 1.5 0 0 1 21 10.5V15" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function UtensilsIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path d="M7 3v7a1.5 1.5 0 0 0 3 0V3M8.5 10V21M5 3v5.5M11 3v5.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 3c-1.7 1.2-2.5 3-2.5 5.5 0 2 1 3.3 2 3.8V21" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function VanIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path d="M3 16V8a1 1 0 0 1 1-1h9l4 4h2a1 1 0 0 1 1 1v4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 16h1M13 16h5M20 16h1" strokeLinecap="round" />
      <circle cx="7.5" cy="17" r="2" />
      <circle cx="16.5" cy="17" r="2" />
    </svg>
  );
}

export function HeartIcon({ className = base, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.8}
      className={className}
    >
      <path
        d="M12 20.5s-7.5-4.6-9.8-9.2C.6 8 2 4.5 5.5 3.7 8 3.1 10.3 4.4 12 6.5c1.7-2.1 4-3.4 6.5-2.8 3.5.8 4.9 4.3 3.3 7.6-2.3 4.6-9.8 9.2-9.8 9.2Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BellIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path
        d="M6 9a6 6 0 1 1 12 0c0 3 1 5 1.8 6.2a1 1 0 0 1-.8 1.6H5a1 1 0 0 1-.8-1.6C5 14 6 12 6 9Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 19a2 2 0 0 0 4 0" strokeLinecap="round" />
    </svg>
  );
}

export function SpaIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path d="M12 21c-4-1-7-4-7-8.5C5 8 7.5 5 12 3c4.5 2 7 5 7 9.5 0 4.5-3 7.5-7 8.5Z" strokeLinejoin="round" />
      <path d="M12 21V9M12 9c0-2-1.5-3.5-3.5-4M12 9c0-2 1.5-3.5 3.5-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CalendarIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2" />
      <path d="M4 10h16M8 3.5v3.5M16 3.5v3.5" strokeLinecap="round" />
    </svg>
  );
}

export function ChatIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path
        d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5v-7Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MailIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="m4.5 7 7.5 6 7.5-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function UserIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M4.5 20c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6" strokeLinecap="round" />
    </svg>
  );
}

export function TicketIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path
        d="M4 9.5a2 2 0 0 0 0-4V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v.5a2 2 0 0 0 0 4v1a2 2 0 0 0 0 4v.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-.5a2 2 0 0 0 0-4Z"
        strokeLinejoin="round"
      />
      <path d="M14 4v16" strokeDasharray="2.5 2.5" strokeLinecap="round" />
    </svg>
  );
}

export function CheckCircleIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.5 2.5L16 9.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SearchIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M19.5 19.5 15 15" strokeLinecap="round" />
    </svg>
  );
}

export function CameraIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path d="M4 8.5a1.5 1.5 0 0 1 1.5-1.5h2l1-2h7l1 2h2A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5Z" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  );
}

export function LockIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <rect x="5" y="10.5" width="14" height="9" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" strokeLinecap="round" />
    </svg>
  );
}
