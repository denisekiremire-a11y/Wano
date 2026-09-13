/** Normalizes a freeform Uganda phone number (vendor.contactPhone has no
 * enforced format) into the digits-only, country-code-prefixed form
 * wa.me links need. Returns null for anything too short to be a real
 * number, rather than guessing. */
export function toWhatsAppNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 9) return null;
  if (digits.startsWith("256")) return digits;
  if (digits.startsWith("0")) return `256${digits.slice(1)}`;
  return `256${digits}`;
}
