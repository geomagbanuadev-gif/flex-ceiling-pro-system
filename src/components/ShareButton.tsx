"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getShareToken, disableShare } from "@/app/quotes/actions";
import { Spinner } from "./Spinner";
import { useToast } from "./Toast";

export function ShareButton({ docId, docType, initialToken }: { docId: string; docType: string; initialToken: string | null }) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(initialToken);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();
  const toast = useToast();

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = token ? `${origin}/share/${token}` : "";
  const label = docType === "invoice" ? "tax invoice" : "quotation";

  function openDialog() {
    setError("");
    setOpen(true);
    if (!token) {
      start(async () => {
        try {
          setToken(await getShareToken(docId));
        } catch (e) {
          setError(e instanceof Error ? e.message : "Could not create link");
        }
      });
    }
  }

  function copy() {
    navigator.clipboard?.writeText(url);
    toast("Link copied");
  }

  function stop() {
    start(async () => {
      try {
        await disableShare(docId);
        setToken(null);
        setOpen(false);
        toast("Sharing turned off");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  const waHref = `https://wa.me/?text=${encodeURIComponent(`Here is your ${label} from FlexCeiling Pro:\n${url}`)}`;
  const mailHref = `mailto:?subject=${encodeURIComponent(`Your ${label} from FlexCeiling Pro`)}&body=${encodeURIComponent(`Hello,\n\nPlease find your ${label} at the link below:\n${url}\n\nThank you,\nFlexCeiling Pro`)}`;

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></svg>
        Share
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => !pending && setOpen(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-slate-900">Share {label}</h3>
            <p className="mt-1 text-sm text-slate-500">Anyone with this link can view <span className="font-medium">only this {label}</span> — no login, no access to anything else.</p>

            {pending && !token ? (
              <div className="mt-5 flex items-center gap-2 text-sm text-slate-500"><Spinner className="h-4 w-4" /> Preparing link…</div>
            ) : error ? (
              <p className="mt-4 text-sm text-red-600">{error}</p>
            ) : (
              <>
                <div className="mt-4 flex gap-2">
                  <input readOnly value={url} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none" onFocus={(e) => e.currentTarget.select()} />
                  <button type="button" onClick={copy} className="shrink-0 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-700">Copy</button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <a href={waHref} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M.1 24l1.7-6.2A11.9 11.9 0 1112 24a12 12 0 01-5.9-1.6L.1 24zM6.8 20l.4.2A9.9 9.9 0 1012 22a9.9 9.9 0 01-5-1.4l-.4-.2-3.2.9.9-3.3zM17.5 14.4c-.3-.1-1.7-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.7 1-.9 1.1-.2.2-.3.2-.6.1a8 8 0 01-2.4-1.5 9 9 0 01-1.6-2c-.2-.3 0-.4.1-.6l.4-.5.3-.5v-.5l-1-2.3c-.2-.6-.4-.5-.6-.5h-.6a1 1 0 00-.8.4 3.3 3.3 0 00-1 2.4 5.7 5.7 0 001.2 3 13 13 0 005 4.4c.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3z" /></svg>
                    WhatsApp
                  </a>
                  <a href={mailHref} className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m2 7 10 6 10-6" /></svg>
                    Email
                  </a>
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                  <button type="button" onClick={stop} disabled={pending} className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50">Stop sharing</button>
                  <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Done</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
