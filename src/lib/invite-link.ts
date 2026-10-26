const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/** The member's personal join link and a ready WhatsApp message for it. */
export function inviteLinks(referralCode: string, firstName: string) {
  const joinUrl = `${APP_URL}/join?ref=${encodeURIComponent(referralCode)}`;
  const message = `${firstName} invited you to Wano, where to go out in Kampala this week. Join here and we'll see each other's plans: ${joinUrl}`;
  return { joinUrl, whatsappUrl: `https://wa.me/?text=${encodeURIComponent(message)}` };
}
