"use client";

import { useEffect, useRef, useState } from "react";
import {
  getBookingMessagesAction,
  postBookingMessageAction,
  type BookingMessage,
} from "@/lib/actions/booking-message-actions";

function labelFor(message: BookingMessage, viewerUserId: string) {
  if (message.senderUserId === viewerUserId) return "You";
  if (message.role === "admin") return "Wano team";
  return message.senderName;
}

export function BookingThread({ bookingId, heading = "Messages" }: { bookingId: string; heading?: string }) {
  const [messages, setMessages] = useState<BookingMessage[] | null>(null);
  const [viewerUserId, setViewerUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function load() {
    getBookingMessagesAction(bookingId).then((result) => {
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setMessages(result.messages);
      setViewerUserId(result.viewerUserId);
    });
  }

  useEffect(load, [bookingId]);

  async function handleSubmit(formData: FormData) {
    const content = String(formData.get("content") ?? "");
    if (!content.trim()) return;
    setSending(true);
    const result = await postBookingMessageAction(bookingId, content);
    setSending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setError(null);
    formRef.current?.reset();
    load();
  }

  if (error && messages === null) {
    return <p className="text-sm text-forest-800/60">{error}</p>;
  }

  return (
    <div className="rounded-2xl border border-forest-900/10 bg-white p-5">
      <h2 className="font-display text-lg font-semibold text-forest-900">{heading}</h2>

      <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
        {messages === null ? (
          <p className="text-sm text-forest-800/50">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-forest-800/60">
            No messages yet — this is just between you two (and Wano, if we need to step in).
          </p>
        ) : (
          messages.map((message) => {
            const own = viewerUserId === message.senderUserId;
            return (
              <div key={message.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] ${own ? "text-right" : "text-left"}`}>
                  <p className="text-[11px] font-medium text-forest-800/50">
                    {labelFor(message, viewerUserId ?? "")}
                  </p>
                  <div
                    className={`mt-0.5 inline-block rounded-2xl px-3.5 py-2 text-sm ${
                      own ? "bg-forest-800 text-white" : "bg-forest-50 text-forest-900"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form ref={formRef} action={handleSubmit} className="mt-3 flex gap-2 border-t border-forest-900/10 pt-3">
        <input
          name="content"
          placeholder="Message about this booking…"
          required
          maxLength={1000}
          autoComplete="off"
          disabled={sending}
          className="flex-1 rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={sending}
          className="rounded-lg bg-forest-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Send
        </button>
      </form>
      {error && messages !== null && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}
