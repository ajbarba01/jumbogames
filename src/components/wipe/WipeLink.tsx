/**
 * A Next Link that routes its click through the slam wipe. Same children API
 * as Link, but `href` is narrowed to a plain string — Next's `UrlObject` form
 * is not supported. Stringifying a `UrlObject` produces `"[object Object]"`,
 * pushing a route that never commits and permanently traps the user under the
 * wipe (it has no force-reveal ceiling). An optional `wipeLabel` shows a
 * destination label on the panel (e.g. a round name). Modifier-clicks and
 * non-primary buttons fall through to the browser so open-in-new-tab still
 * works.
 */
"use client";

import Link from "next/link";
import { useWipeNav } from "./use-wipe-nav";

export function WipeLink({
  href,
  wipeLabel,
  onClick,
  children,
  ...rest
}: Omit<React.ComponentProps<typeof Link>, "href"> & {
  href: string;
  wipeLabel?: string;
}): React.JSX.Element {
  const { navigate } = useWipeNav();
  return (
    <Link
      href={href}
      onClick={(e) => {
        onClick?.(e);
        if (
          e.defaultPrevented ||
          e.metaKey ||
          e.ctrlKey ||
          e.shiftKey ||
          e.altKey ||
          e.button !== 0
        ) {
          return;
        }
        e.preventDefault();
        navigate(href, { label: wipeLabel });
      }}
      {...rest}
    >
      {children}
    </Link>
  );
}
