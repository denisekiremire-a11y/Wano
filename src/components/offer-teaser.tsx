import Link from "next/link";
import { LockIcon } from "@/components/icons";

export function OfferTeaser({
  discountText,
  freebieText,
  unlocked,
  unlockHint,
  unlockHref = "/signup",
}: {
  discountText: string;
  freebieText?: string | null;
  unlocked: boolean;
  unlockHint: string;
  unlockHref?: string;
}) {
  if (unlocked) {
    return (
      <div className="rounded-lg bg-forest-50 px-3 py-2 text-sm text-forest-800">
        <p className="font-medium">{discountText}</p>
        {freebieText && <p className="text-forest-700/80">+ {freebieText}</p>}
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg bg-forest-50 px-3 py-2 text-sm">
      <p className="select-none font-medium text-forest-800 blur-[5px]">{discountText}</p>
      {freebieText && (
        <p className="select-none text-forest-700/80 blur-[5px]">+ {freebieText}</p>
      )}
      <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-forest-50/70 text-[11px] font-medium text-forest-800">
        <LockIcon className="h-3.5 w-3.5" />
        <Link href={unlockHref} className="underline-offset-2 hover:underline">
          {unlockHint}
        </Link>
      </div>
    </div>
  );
}
