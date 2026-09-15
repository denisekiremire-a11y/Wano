"use client";

import { useState } from "react";

const INTENTS = ["Plan a journey", "Book AFCON travel", "Get verified as a business", "Something else"];

/** No backend contact-handling exists yet, so this builds a mailto: link
 * client-side rather than pretending to submit somewhere — honest for a
 * preview build. Swap for a real Server Action once there's an inbox to
 * receive it. */
export function ContactForm({ toEmail }: { toEmail: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [intent, setIntent] = useState(INTENTS[0]);
  const [message, setMessage] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const subject = `Wano — ${intent}`;
    const body = `${message}\n\n— ${name || "Anonymous"} (${email || "no email given"})`;
    window.location.href = `mailto:${toEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-ink/10 bg-white p-6">
      <label className="block text-sm">
        <span className="eyebrow text-ink/50">Your name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Adelaide K"
          className="mt-1.5 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-vermilion"
        />
      </label>
      <label className="mt-4 block text-sm">
        <span className="eyebrow text-ink/50">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="mt-1.5 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-vermilion"
        />
      </label>
      <label className="mt-4 block text-sm">
        <span className="eyebrow text-ink/50">I want to</span>
        <select
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-vermilion"
        >
          {INTENTS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-4 block text-sm">
        <span className="eyebrow text-ink/50">Message</span>
        <textarea
          required
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us about your plans, dates, group size or business..."
          className="mt-1.5 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-vermilion"
        />
      </label>
      <button
        type="submit"
        className="mt-5 rounded-full bg-vermilion px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
      >
        Send message
      </button>
      <p className="mt-2 text-xs text-ink/40">Opens your email app, addressed to the Wano team.</p>
    </form>
  );
}
