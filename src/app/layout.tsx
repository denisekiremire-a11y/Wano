import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Fraunces } from "next/font/google";
import { BottomNav } from "@/components/bottom-nav";
import { LiteModeInit } from "@/components/lite-mode-init";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getPendingAccreditationCount } from "@/lib/data/admin";
import { getOpenReportsCount } from "@/lib/data/moderation";
import { getVendorPendingBookingsCount, getVendorProfileByUserId } from "@/lib/data/vendor";
import { getSession } from "@/lib/session";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Wano — Discover. Connect. Experience.",
  description:
    "Wano is the social discovery platform for Kampala and Uganda — places, events, experiences, restaurants, communities, and bookings, all in one app. Wano × AFCON 2027 is our launch campaign.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  // Browser chrome theme-color reads this from a static <meta> tag, so it
  // can't reference a CSS variable — mirrors --color-text-primary.
  themeColor: "#1B3A5C",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await getSession();

  const navBadges: Record<string, number> = {};
  if (session?.role === "vendor") {
    const vendorProfile = await getVendorProfileByUserId(session.userId);
    if (vendorProfile) {
      const pending = await getVendorPendingBookingsCount(vendorProfile.id);
      if (pending > 0) navBadges["/vendor/dashboard/bookings"] = pending;
    }
  } else if (session?.role === "admin") {
    const [pendingVendors, openReports] = await Promise.all([
      getPendingAccreditationCount(),
      getOpenReportsCount(),
    ]);
    if (pendingVendors > 0) navBadges["/admin/vendors"] = pendingVendors;
    if (openReports > 0) navBadges["/admin/moderation"] = openReports;
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col bg-background text-foreground"
        suppressHydrationWarning
      >
        <LiteModeInit />
        <SiteHeader session={session} navBadges={navBadges} />
        <div className="has-bottom-nav flex-1">
          {children}
          <SiteFooter />
        </div>
        <BottomNav session={session} navBadges={navBadges} />
      </body>
    </html>
  );
}
