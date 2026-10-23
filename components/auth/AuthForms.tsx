"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, signIn, signInWithGoogle, signUp, updatePassword, type AuthState } from "@/app/actions/auth";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/Button";
import { PasswordField, TextField } from "./fields";
import { FormStatus } from "./FormStatus";

const idle: AuthState = { status: "idle" };
const keptEmail = (s: AuthState) => (s.status === "error" ? s.email : undefined);

/** "Continue with Google" (own form so it works alongside the email form) + "or" divider. */
function GoogleSignIn({ next }: { next: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(signInWithGoogle, idle);
  return (
    <form action={action} className="mb-2 flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      {state.status === "error" && <FormStatus state={state} />}
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="flex items-center justify-center gap-3 rounded-xl border border-ink-700 bg-ink-100 px-4 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-ink-100/90 disabled:opacity-60"
      >
        <GoogleMark />
        {pending ? t.auth.working : t.auth.google}
      </button>
      <p className="flex items-center gap-3 text-xs text-ink-500" aria-hidden>
        <span className="h-px flex-1 bg-ink-700" />
        {t.auth.or}
        <span className="h-px flex-1 bg-ink-700" />
      </p>
    </form>
  );
}

/** Google "G" mark (brand asset colours are part of the logo, not theme tokens). */
function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 48 48" className="size-5">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export function SignInForm({ next, linkError }: { next: string; linkError?: boolean }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(signIn, idle);
  return (
    <>
      <GoogleSignIn next={next} />
      <form action={action} className="flex flex-col gap-4" noValidate={false}>
        <input type="hidden" name="next" value={next} />
        <FormStatus state={state.status === "idle" && linkError ? { status: "error", code: "link" } : state} />
        <TextField label={t.auth.email} name="email" type="email" autoComplete="email" dir="ltr" required maxLength={254} autoFocus defaultValue={keptEmail(state)} />
        <PasswordField label={t.auth.password} name="password" autoComplete="current-password" required maxLength={72} />
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm text-mint-300 hover:text-mint-400">{t.auth.forgot}</Link>
        </div>
        <Button type="submit" disabled={pending} aria-busy={pending}>{pending ? t.auth.working : t.auth.signIn}</Button>
      </form>
    </>
  );
}

export function SignUpForm({ next }: { next: string }) {
  const { t, locale } = useI18n();
  const [state, action, pending] = useActionState(signUp, idle);
  if (state.status === "notice") return <FormStatus state={state} />;
  return (
    <>
      <GoogleSignIn next={next} />
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="locale" value={locale} />
        <FormStatus state={state} />
        <TextField label={t.auth.name} name="name" autoComplete="name" maxLength={80} dir="auto" />
        <TextField label={t.auth.email} name="email" type="email" autoComplete="email" dir="ltr" required maxLength={254} defaultValue={keptEmail(state)} />
        <PasswordField label={t.auth.password} name="password" autoComplete="new-password" required minLength={8} maxLength={72} hint={t.auth.passwordHint} />
        <PasswordField label={t.auth.confirmPassword} name="confirm" autoComplete="new-password" required minLength={8} maxLength={72} />
        <Button type="submit" disabled={pending} aria-busy={pending}>{pending ? t.auth.working : t.auth.signUp}</Button>
      </form>
    </>
  );
}

export function ForgotPasswordForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(requestPasswordReset, idle);
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormStatus state={state} />
      {state.status !== "notice" && (
        <>
          <TextField label={t.auth.email} name="email" type="email" autoComplete="email" dir="ltr" required maxLength={254} autoFocus defaultValue={keptEmail(state)} />
          <Button type="submit" disabled={pending} aria-busy={pending}>{pending ? t.auth.working : t.auth.sendLink}</Button>
        </>
      )}
      <Link href="/login" className="text-center text-sm text-mint-300 hover:text-mint-400">{t.auth.backToSignIn}</Link>
    </form>
  );
}

export function ResetPasswordForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(updatePassword, idle);
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormStatus state={state} />
      <PasswordField label={t.auth.password} name="password" autoComplete="new-password" required minLength={8} maxLength={72} hint={t.auth.passwordHint} autoFocus />
      <PasswordField label={t.auth.confirmPassword} name="confirm" autoComplete="new-password" required minLength={8} maxLength={72} />
      <Button type="submit" disabled={pending} aria-busy={pending}>{pending ? t.auth.working : t.auth.savePassword}</Button>
    </form>
  );
}
