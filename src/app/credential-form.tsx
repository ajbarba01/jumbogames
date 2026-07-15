/**
 * Shared client credential form used by the login and signup pages. Posts the
 * email and password to the given auth endpoint and navigates home on success.
 * Validation is fully client-owned (no native browser bubbles): every field
 * reports its own error inline, and a rejected submission marks the credentials.
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, TextField, type TextFieldProps } from "@jumbo/ui";

type Props = {
  action: string;
  heading: string;
  submitLabel: string;
  passwordPlaceholder: string;
  minPasswordLength?: number;
  errorMessage: string;
  altHref: string;
  altLabel: string;
  /** Signup: require a matching confirm-password field before submitting. */
  confirmPassword?: boolean;
};

type FieldName = "email" | "password" | "confirm";
type Errors = Partial<Record<FieldName, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A labelled input that renders its own error beneath itself (kit contract:
 *  the invalid state is mirrored by caller text, not color alone). */
function Field({
  name,
  error,
  invalid,
  ...rest
}: TextFieldProps & { name: FieldName; error?: string; invalid?: boolean }) {
  const errorId = `${name}-error`;
  return (
    <div className="flex flex-col gap-1">
      <TextField
        name={name}
        invalid={invalid ?? error !== undefined}
        aria-invalid={invalid ?? error !== undefined}
        aria-describedby={error ? errorId : undefined}
        {...rest}
      />
      {error ? (
        <p id={errorId} className="text-meta text-crit">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function CredentialForm({
  action,
  heading,
  submitLabel,
  passwordPlaceholder,
  minPasswordLength,
  errorMessage,
  altHref,
  altLabel,
  confirmPassword = false,
}: Props) {
  const router = useRouter();
  const [errors, setErrors] = useState<Errors>({});
  const [credError, setCredError] = useState(false);
  const [pending, setPending] = useState(false);

  function validate(form: FormData): Errors {
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    const next: Errors = {};

    if (email === "") next.email = "Enter your email.";
    else if (!EMAIL_RE.test(email)) next.email = "Enter a valid email address.";

    if (password === "") next.password = "Enter your password.";
    else if (
      minPasswordLength !== undefined &&
      password.length < minPasswordLength
    )
      next.password = `Use at least ${minPasswordLength} characters.`;

    if (confirmPassword) {
      if (confirm === "") next.confirm = "Re-enter your password.";
      else if (confirm !== password) next.confirm = "Passwords do not match.";
    }

    return next;
  }

  /** Clear a field's error the moment the user edits it, so a fix reads as fixed. */
  function clearField(name: FieldName) {
    setCredError(false);
    setErrors((prev) => {
      if (prev[name] === undefined) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCredError(false);
    const form = new FormData(event.currentTarget);

    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setPending(true);
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
      setCredError(true);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 p-8">
      <div className="flex flex-col items-center gap-1.5 text-center">
        <p className="font-display text-3xl uppercase text-s12">
          Jumbo <span className="text-accent">minigames</span>
        </p>
        <p className="text-sec text-s9">Team tournament of co-op minigames.</p>
      </div>

      <Card className="flex flex-col gap-5 p-6">
        <h1 className="font-display text-xl uppercase text-s12">{heading}</h1>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <Field
            name="email"
            type="email"
            required
            placeholder="Email"
            error={errors.email}
            invalid={errors.email !== undefined || credError}
            onChange={() => clearField("email")}
          />
          <Field
            name="password"
            type="password"
            required
            minLength={minPasswordLength}
            placeholder={passwordPlaceholder}
            error={errors.password ?? (credError ? errorMessage : undefined)}
            invalid={errors.password !== undefined || credError}
            onChange={() => clearField("password")}
          />
          {confirmPassword ? (
            <Field
              name="confirm"
              type="password"
              required
              placeholder="Confirm password"
              error={errors.confirm}
              onChange={() => clearField("confirm")}
            />
          ) : null}
          <Button type="submit" variant="primary" disabled={pending}>
            {submitLabel}
          </Button>
        </form>
        <div className="border-t-2 border-s6 pt-4">
          <Link
            href={altHref}
            className="slip text-sec font-bold text-s9 underline-offset-4 hover:text-s11 hover:underline"
          >
            {altLabel}
          </Link>
        </div>
      </Card>
    </main>
  );
}
