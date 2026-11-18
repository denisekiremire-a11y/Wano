"use client";

import { Modal } from "@/components/ui/Modal";
import type { Gift } from "@/lib/types";
import { useRegistry } from "./context";
import { WhereToBuyPanel } from "./WhereToBuyPanel";

export function WhereToBuyDialog({ gift, onClose }: { gift: Gift | null; onClose: () => void }) {
  const { giftRetailers, retailers, locations } = useRegistry();
  return (
    <Modal open={Boolean(gift)} onClose={onClose} title={gift ? `Where to buy ${gift.name}` : "Where to buy"}>
      {gift && (
        <>
          <p className="eyebrow">Where to buy</p>
          <h2 className="mb-5 mt-1 pr-8 text-2xl leading-tight">{gift.name}</h2>
          <WhereToBuyPanel gift={gift} giftRetailers={giftRetailers} retailers={retailers} locations={locations} />
        </>
      )}
    </Modal>
  );
}
