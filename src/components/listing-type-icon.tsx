import { BedIcon, CompassIcon, SpaIcon, UtensilsIcon, VanIcon } from "@/components/icons";
import type { ListingType } from "@/lib/listing-type";

const map: Record<ListingType, (props: { className?: string }) => React.JSX.Element> = {
  hotel: BedIcon,
  restaurant: UtensilsIcon,
  experience: CompassIcon,
  transport: VanIcon,
  spa_salon: SpaIcon,
};

export function ListingTypeIcon({ type, className }: { type: ListingType; className?: string }) {
  const Icon = map[type];
  return <Icon className={className} />;
}
