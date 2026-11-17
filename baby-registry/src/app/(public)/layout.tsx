import { connection } from "next/server";
import { cookies } from "next/headers";
import { EMAIL_COOKIE, verifyEmailToken } from "@/lib/email-link";
import { LiveRegistryProvider } from "@/components/registry/LiveRegistryProvider";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { ErrorScreen, SetupNotice } from "@/components/site/StateScreens";
import { ConfigError, supabasePublicKey, supabaseUrl } from "@/lib/env";
import { getRegistry } from "@/lib/registry-cache";
import type { RegistryData } from "@/lib/types";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  await connection(); // always render per request: availability must never be stale
  let data: RegistryData;
  try {
    data = await getRegistry();
  } catch (e) {
    if (e instanceof ConfigError) return <SetupNotice />;
    console.error(e);
    return <ErrorScreen />;
  }
  return (
    <LiveRegistryProvider
      initial={data}
      supabaseUrl={supabaseUrl()!}
      supabaseKey={supabasePublicKey()!}
      signedInEmail={verifyEmailToken((await cookies()).get(EMAIL_COOKIE)?.value)}
    >
      <SiteHeader title={data.settings.registry_title} />
      {children}
      <SiteFooter tagline={data.settings.welcome_heading} />
    </LiveRegistryProvider>
  );
}
