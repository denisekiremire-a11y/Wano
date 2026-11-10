import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// A one-page "proof of booking" PDF, attached to the booking-confirmed
// email (see booking-notifications.ts) — the same genuinely useful piece of
// a booking.com-style confirmation (property, guest, dates, code, price) as
// a document worth keeping, not the marketing/upsell content around it.
// pdf-lib is pure JS with no native/browser dependency, so it runs fine in
// a Vercel serverless function — a real headless-browser PDF render isn't
// practical there.

const INK = rgb(0x1e / 255, 0x15 / 255, 0x0e / 255);
const INK_MUTED = rgb(0x84 / 255, 0x78 / 255, 0x6a / 255);
const BORDER = rgb(0xe7 / 255, 0xde / 255, 0xd0 / 255);

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;

export async function generateBookingPdf(opts: {
  propertyTitle: string;
  vendorName?: string | null;
  guestName: string;
  confirmationCode: string;
  visitDate?: string | null;
  visitTime?: string | null;
  endDate?: string | null;
  partySize?: number | null;
  location?: string | null;
  vendorPhone?: string | null;
  totalLabel?: string | null;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const rightEdge = PAGE_WIDTH - MARGIN;

  let y = PAGE_HEIGHT - 60;
  page.drawText("WANO", { x: MARGIN, y, size: 22, font: bold, color: INK });
  y -= 24;
  page.drawText("Booking confirmation", { x: MARGIN, y, size: 13, font, color: INK_MUTED });
  y -= 20;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: rightEdge, y }, thickness: 1, color: BORDER });
  y -= 36;

  page.drawText(opts.propertyTitle, { x: MARGIN, y, size: 17, font: bold, color: INK });
  y -= 20;
  if (opts.vendorName) {
    page.drawText(opts.vendorName, { x: MARGIN, y, size: 11, font, color: INK_MUTED });
    y -= 20;
  }
  y -= 10;

  // Confirmation code box
  const boxHeight = 50;
  page.drawRectangle({ x: MARGIN, y: y - boxHeight, width: 220, height: boxHeight, borderColor: BORDER, borderWidth: 1 });
  page.drawText("CONFIRMATION CODE", { x: MARGIN + 12, y: y - 18, size: 8, font, color: INK_MUTED });
  page.drawText(opts.confirmationCode, { x: MARGIN + 12, y: y - 36, size: 16, font: bold, color: INK });
  y -= boxHeight + 26;

  const rows: [string, string][] = [["Guest", opts.guestName]];
  if (opts.visitDate) rows.push(["Date", opts.visitDate + (opts.visitTime ? ` at ${opts.visitTime}` : "")]);
  if (opts.endDate) rows.push(["Until", opts.endDate]);
  if (opts.partySize) rows.push(["Party size", String(opts.partySize)]);
  if (opts.location) rows.push(["Location", opts.location]);
  if (opts.vendorPhone) rows.push(["Vendor phone", opts.vendorPhone]);
  if (opts.totalLabel) rows.push(["Total", opts.totalLabel]);

  for (const [label, value] of rows) {
    page.drawText(label, { x: MARGIN, y, size: 10, font, color: INK_MUTED });
    page.drawText(value, { x: MARGIN + 160, y, size: 11, font: bold, color: INK });
    y -= 14;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: rightEdge, y }, thickness: 0.5, color: BORDER });
    y -= 18;
  }

  page.drawText("Need help? Call or WhatsApp 0771013268 - Wano, Kampala, Uganda.", {
    x: MARGIN,
    y: 50,
    size: 9,
    font,
    color: INK_MUTED,
  });

  return doc.save();
}
