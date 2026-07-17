/**
 * Route error boundary: shown when a server component or render throws below
 * the root layout. Generic copy plus the error digest for reporting — never
 * the raw message, which can leak internals (security floor, AGENTS.md).
 */
"use client";

import Link from "next/link";
import { Button, Card } from "@jumbo/ui";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 p-8">
      <div className="flex flex-col items-center gap-1.5 text-center">
        <p className="font-display text-3xl uppercase text-s12">
          Something <span className="text-accent">broke</span>
        </p>
        <p className="text-sec text-s9">
          The page failed to load. Try again, or head back home.
        </p>
      </div>

      <Card className="flex flex-col gap-4 p-6">
        <div className="flex items-center gap-4">
          <Button variant="primary" onClick={reset}>
            Try again
          </Button>
          <Link
            href="/"
            className="slip text-sec font-bold text-s9 underline-offset-4 hover:text-s11 hover:underline"
          >
            Back to home
          </Link>
        </div>
        {error.digest ? (
          <p className="border-t-2 border-s6 pt-4 font-mono text-s8 text-sec">
            Reference: {error.digest}
          </p>
        ) : null}
      </Card>
    </main>
  );
}
