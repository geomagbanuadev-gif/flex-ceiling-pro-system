"use client";

import { useRouter } from "next/navigation";

/**
 * A table row whose whole area navigates to `href` — without the fragile
 * "stretched link" CSS (an absolutely-positioned ::before on a relative <tr>),
 * which older iOS Safari mis-positions so the invisible overlay escapes the row
 * and intercepts taps on other elements (e.g. the "+ New Quotation" button).
 * Here the navigation is an explicit click handler, so it behaves identically on
 * every browser. Real links/buttons inside the row still handle their own clicks.
 */
export function LinkRow({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <tr
      className={className}
      onClick={(e) => {
        // let genuine interactive controls handle their own clicks
        if ((e.target as HTMLElement).closest("a, button, input, select, label, [role='button']")) return;
        // don't hijack a text selection
        if (typeof window !== "undefined" && window.getSelection()?.toString()) return;
        router.push(href);
      }}
    >
      {children}
    </tr>
  );
}
