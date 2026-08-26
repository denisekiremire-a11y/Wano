import {
  CalendarIcon,
  ChartIcon,
  ChatIcon,
  CompassIcon,
  FileIcon,
  FlagIcon,
  GaugeIcon,
  GridIcon,
  HomeIcon,
  MegaphoneIcon,
  StampIcon,
  TagIcon,
  TicketIcon,
  UserIcon,
  UsersIcon,
} from "@/components/icons";
import type { NavItem } from "@/lib/nav-items";

const map: Record<NavItem["icon"], (props: { className?: string }) => React.JSX.Element> = {
  home: HomeIcon,
  compass: CompassIcon,
  stamp: StampIcon,
  tag: TagIcon,
  flag: FlagIcon,
  grid: GridIcon,
  megaphone: MegaphoneIcon,
  chart: ChartIcon,
  users: UsersIcon,
  gauge: GaugeIcon,
  file: FileIcon,
  calendar: CalendarIcon,
  chat: ChatIcon,
  user: UserIcon,
  ticket: TicketIcon,
};

export function NavIcon({ icon, className }: { icon: NavItem["icon"]; className?: string }) {
  const Icon = map[icon];
  return <Icon className={className} />;
}
