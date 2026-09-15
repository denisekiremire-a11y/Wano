import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Fraunces } from "next/font/google";
import { Space_Grotesk } from "next/font/google";
import { JetBrains_Mono } from "next/font/google";
import { AnchorProvider } from "@/components/afcon/anchor-provider";
import { BottomNav } from "@/components/bottom-nav";
import { InstallPrompt } from "@/components/install-prompt";
import { LiteModeInit } from "@/components/lite-mode-init";
import { PreviewBanner } from "@/components/preview-banner";
import { SeasonDemoSwitch } from "@/components/season/season-demo-switch";
import { SeasonProvider } from "@/components/season/season-provider";
import { SeasonRibbon } from "@/components/season/season-ribbon";
import { ServiceWorkerInit } from "@/components/service-worker-init";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getPendingAccreditationCount } from "@/lib/data/admin";
import { getFixtures } from "@/lib/data/fixtures";
import { getOpenReportsCount } from "@/lib/data/moderation";
import { getPendingSubmissionsCount } from "@/lib/data/submissions";
import { getVendorPendingBookingsCount, getVendorProfileByUserId } from "@/lib/data/vendor";
import { AFCON_CLUB_ENABLED } from "@/lib/feature-flags";
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

// Editorial redesign typefaces — used only on the public marketing/discovery
// pages (home, journeys, afcon, verified, contact) via the .font-editorial
// and .eyebrow utilities in globals.css. Fraunces above stays the display
// font everywhere else (journal, existing headers) so this is additive, not
// a site-wide font swap.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-editorial-display",
  subsets: ["latin"],
  weight: ["500", "700"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-editorial-mono",
  subsets: ["latin"],
  weight: ["500"],
});

export const metadata: Metadata = {
  title: "Wano — Discover. Connect. Experience.",
  description:
    "Wano is the social discovery platform for Kampala and Uganda — places, events, experiences, restaurants, communities, and bookings, all in one app. Wano × AFCON 2027 is our launch campaign.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    // Without this, iOS "Add to Home Screen" still installs the icon, but
    // reopening it launches inside Safari's browser chrome instead of the
    // fullscreen standalone view manifest.display: "standalone" already
    // gives Android — this is the iOS-specific opt-in for the same thing.
    capable: true,
    statusBarStyle: "default",
    title: "Wano",
  },
};

export const viewport: Viewport = {
  // Browser chrome theme-color reads this from a static <meta> tag, so it
  // can't reference a CSS variable — mirrors --color-text-primary.
  themeColor: "#1B3A5C",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [session, fixtures] = await Promise.all([getSession(), getFixtures()]);
  // Never ships to regular users regardless of environment — only visible
  // locally (next dev) or to an admin, so it can be demoed on the deployed
  // site itself without ever reaching a real visitor. See SeasonDemoSwitch.
  const showSeasonDemoSwitch = process.env.NODE_ENV !== "production" || session?.role === "admin";

  const navBadges: Record<string, number> = {};
  if (session?.role === "vendor") {
    const vendorProfile = await getVendorProfileByUserId(session.userId);
    if (vendorProfile) {
      const pending = await getVendorPendingBookingsCount(vendorProfile.id);
      if (pending > 0) navBadges["/vendor/dashboard/bookings"] = pending;
    }
  } else if (session?.role === "admin") {
    const [pendingVendors, openReports, pendingSubmissions] = await Promise.all([
      getPendingAccreditationCount(),
      getOpenReportsCount(),
      getPendingSubmissionsCount(),
    ]);
    if (pendingVendors > 0) navBadges["/admin/vendors"] = pendingVendors;
    if (openReports > 0) navBadges["/admin/moderation"] = openReports;
    if (pendingSubmissions > 0) navBadges["/admin/submissions"] = pendingSubmissions;
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${fraunces.variable} ${spaceGrotesk.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col bg-background text-foreground"
        suppressHydrationWarning
      >
        <LiteModeInit />
        <ServiceWorkerInit />
        <SeasonProvider enabled={AFCON_CLUB_ENABLED} fixtures={fixtures}>
          <AnchorProvider>
            <PreviewBanner />
            <SiteHeader session={session} navBadges={navBadges} />
            <SeasonRibbon />
            <div className="has-bottom-nav flex-1">
              {children}
              <SiteFooter />
            </div>
            <BottomNav session={session} navBadges={navBadges} />
          </AnchorProvider>
          {showSeasonDemoSwitch && <SeasonDemoSwitch />}
        </SeasonProvider>
        <InstallPrompt />
      </body>
    </html>
  );
}
