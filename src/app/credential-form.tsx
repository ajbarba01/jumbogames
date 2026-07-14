/**
 * Shared client credential form used by the login and signup pages. Posts the
 * email and password to the given auth endpoint and navigates home on success.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  action: string;
  heading: string;
  submitLabel: string;
  passwordPlaceholder: string;
  minPasswordLength?: number;
  errorMessage: string;
  altHref: string;
  altLabel: string;
};

export function CredentialForm({
  action,
  heading,
  submitLabel,
  passwordPlaceholder,
  minPasswordLength,
  errorMessage,
  altHref,
  altLabel,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const res = await fetch(action, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    setPending(false);
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError(errorMessage);
    }
  }

  return (
    <main className="mx-auto flex max-w-sm flex-1 flex-col justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">{heading}</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className="rounded border p-2"
        />
        <input
          name="password"
          type="password"
          required
          minLength={minPasswordLength}
          placeholder={passwordPlaceholder}
          className="rounded border p-2"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-black p-2 text-white disabled:opacity-50"
        >
          {submitLabel}
        </button>
      </form>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <a href={altHref} className="text-sm underline">
        {altLabel}
      </a>
    </main>
  );
}
