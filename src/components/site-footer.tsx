import Link from "next/link";

const SUPPORT_EMAIL = "denisekiremire@gmail.com";

export function SiteFooter() {
  return (
    <footer className="border-t border-forest-900/10 px-4 py-6 text-center text-xs text-forest-800/50 md:px-6">
      <p>
        Need help? Email{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
          {SUPPORT_EMAIL}
        </a>
        .
      </p>
      <p className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <Link href="/community-guidelines" className="hover:underline">
          Community Guidelines
        </Link>
        <Link href="/privacy" className="hover:underline">
          Privacy Policy
        </Link>
        <Link href="/terms" className="hover:underline">
          Terms of Service
        </Link>
        <Link href="/how-it-works" className="hover:underline">
          How it works
        </Link>
      </p>
    </footer>
  );
}
