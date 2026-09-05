import type { MetadataRoute } from "next";
import { getUpcomingEvents } from "@/lib/data/events";
import { getPublishedJournalPosts } from "@/lib/data/journal";
import { getJourneys, searchListings } from "@/lib/data/journeys";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const STATIC_ROUTES = [
  "",
  "/explore",
  "/partners",
  "/journeys",
  "/events",
  "/journal",
  "/social",
  "/how-it-works",
  "/afcon",
  "/community-guidelines",
  "/privacy",
  "/terms",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [listings, journeys, events, journalPosts] = await Promise.all([
    searchListings(),
    getJourneys(),
    getUpcomingEvents(),
    getPublishedJournalPosts(200),
  ]);
  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${APP_URL}${path}`,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  for (const { listing } of listings) {
    entries.push({ url: `${APP_URL}/explore/${listing.id}`, changeFrequency: "weekly", priority: 0.6 });
  }
  for (const journey of journeys) {
    entries.push({ url: `${APP_URL}/journeys/${journey.slug}`, changeFrequency: "weekly", priority: 0.7 });
  }
  for (const { event } of events) {
    entries.push({ url: `${APP_URL}/events/${event.id}`, changeFrequency: "daily", priority: 0.5 });
  }
  for (const { post } of journalPosts) {
    entries.push({ url: `${APP_URL}/journal/${post.slug}`, changeFrequency: "monthly", priority: 0.5 });
  }

  return entries;
}
