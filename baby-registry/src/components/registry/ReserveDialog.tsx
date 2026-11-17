"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Heart, Loader2 } from "lucide-react";
import { reserveGiftAction } from "@/app/actions/reserve";
import { Modal } from "@/components/ui/Modal";
import type { Gift } from "@/lib/types";
import { useRegistry } from "./context";
import { GiftImage } from "./GiftImage";
import { PriceBlock } from "./PriceBlock";
import { StatusBadge } from "./StatusBadge";

interface FormState {
  name: string;
  email: string;
  phone: string;
  message: string;
}

const EMPTY: FormState = { name: "", email: "", phone: "", message: "" };

export function ReserveDialog({ gift, onClose }: { gift: Gift | null; onClose: () => void }) {
  const { rate, setGiftStatus } = useRegistry();
  const router = useRouter();
  const [showMore, setShowMore] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lostRace, setLostRace] = useState(false);
  const [pending, startTransition] = useTransition();
  // The dialog is remounted (keyed by gift id) for each gift, so this is "when the form opened".
  const [openedAt] = useState(() => Date.now());
  const honeypot = useRef<HTMLInputElement>(null);

  // Someone else reserved it while this dialog was open (arrives via realtime) — derived, not stored.
  const takenByOther = lostRace || (gift !== null && gift.status !== "available" && !pending);

  if (!gift) return <Modal open={false} onClose={onClose} title="Reserve this gift">{null}</Modal>;

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = () => {
    setError(null);
    const fd = new FormData();
    fd.set("giftId", gift.id);
    fd.set("name", form.name);
    fd.set("email", form.email);
    fd.set("phone", form.phone);
    fd.set("message", form.message);
    fd.set("confirm", confirmed ? "yes" : "");
    fd.set("openedAt", String(openedAt));
    fd.set("hp_x", honeypot.current?.value ?? "");
    startTransition(async () => {
      const res = await reserveGiftAction(fd);
      if (res.ok) {
        setGiftStatus(gift.id, "reserved");
        setForm(EMPTY);
        onClose();
        router.push(`/reservation/${encodeURIComponent(res.reference)}?new=1`);
        return;
      }
      if (res.code === "unavailable") {
        setGiftStatus(gift.id, (res.giftStatus as Gift["status"]) ?? "reserved");
        setLostRace(true);
      }
      setError(res.message);
    });
  };

  return (
    <Modal open onClose={onClose} title={`Reserve ${gift.name}`}>
      <div className="mb-5 flex gap-4 pr-8">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl sm:size-24">
          <GiftImage gift={gift} sizes="96px" showKindTag={false} />
        </div>
        <div className="min-w-0">
          <p className="eyebrow">Reserve this gift</p>
          <h2 className="mt-1 text-2xl leading-tight text-ink">{gift.name}</h2>
          <div className="mt-1.5">
            <PriceBlock gift={gift} rate={rate} />
          </div>
        </div>
      </div>

      {takenByOther ? (
        <div className="space-y-4" role="alert">
          <div className="flex gap-3 rounded-2xl bg-blush p-4 text-clay-dark">
            <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden />
            <div>
              <p className="font-medium">This gift is no longer available</p>
              <p className="mt-1 text-sm">
                {error ?? "Someone has just reserved it. Thank you for thinking of it — please choose another gift from the list."}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <StatusBadge status={gift.status === "available" ? "reserved" : gift.status} />
            <button type="button" className="btn-primary" onClick={onClose}>
              Choose another gift
            </button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (form.name.trim().length < 2) return setError("Please enter your name.");
            if (!confirmed) return setError("Please tick the box to confirm.");
            submit();
          }}
          className="space-y-4"
          noValidate
        >
          <p className="text-sm text-ink-soft">
            Add your name so everyone else sees this gift is taken. You then buy it yourself, from any shop you like.
          </p>
          <div>
            <label htmlFor="r-name" className="field-label">
              Your name
            </label>
            <input
              id="r-name"
              className="field-input text-base"
              value={form.name}
              onChange={set("name")}
              required
              maxLength={100}
              autoComplete="name"
              autoFocus
              placeholder="e.g. Auntie Grace"
            />
          </div>

          <details className="group rounded-2xl border border-linen bg-white/60 px-4 py-3" open={showMore || undefined} onToggle={(e) => setShowMore(e.currentTarget.open)}>
            <summary className="cursor-pointer list-none text-sm font-medium text-sage-700 [&::-webkit-details-marker]:hidden">
              <span className="group-open:hidden">+ Add a message or contact details (optional)</span>
              <span className="hidden group-open:inline">Optional details</span>
            </summary>
            <div className="mt-3 space-y-4">
              <div>
                <label htmlFor="r-message" className="field-label">
                  A message for the family
                </label>
                <textarea id="r-message" className="field-input min-h-20" value={form.message} onChange={set("message")} maxLength={1000} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="r-email" className="field-label">
                    Email
                  </label>
                  <input id="r-email" type="email" className="field-input" value={form.email} onChange={set("email")} maxLength={254} autoComplete="email" inputMode="email" />
                </div>
                <div>
                  <label htmlFor="r-phone" className="field-label">
                    Phone
                  </label>
                  <input id="r-phone" type="tel" className="field-input" value={form.phone} onChange={set("phone")} maxLength={32} autoComplete="tel" inputMode="tel" />
                </div>
              </div>
              <p className="text-xs text-muted">Only the family can see these — never other guests.</p>
            </div>
          </details>

          {/* Honeypot — hidden from people, irresistible to bots. */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
            {/* Deliberately meaningless name/label so browser autofill and password managers never fill it
                (a field called "company" got autofilled and blocked real guests). */}
            <label htmlFor="r-hp">Leave this field empty</label>
            <input
              id="r-hp"
              ref={honeypot}
              name="hp_x"
              tabIndex={-1}
              autoComplete="off"
              data-lpignore="true"
              data-1p-ignore="true"
              data-form-type="other"
              data-testid="honeypot"
              defaultValue=""
            />
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-sage-50 p-4 text-sm text-ink">
            <input
              type="checkbox"
              className="mt-0.5 size-5 shrink-0 accent-[var(--color-sage-700)]"
              checked={confirmed}
              onChange={(e) => {
                setConfirmed(e.target.checked);
                setError(null);
              }}
              data-testid="confirm-checkbox"
            />
            <span>I’ll buy this gift myself. (Prices may have changed since the list was made.)</span>
          </label>

          {error && (
            <p className="text-sm text-rose-700" role="alert">
              {error}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={pending}>
              Cancel
            </button>
            <button type="submit" className="btn-primary py-3 text-[15px] sm:px-7" disabled={pending} data-testid="confirm-reserve">
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Heart className="size-4" aria-hidden />}
              {pending ? "Reserving…" : "Reserve this gift"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
