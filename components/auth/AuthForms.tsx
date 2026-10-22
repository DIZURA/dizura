"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, signIn, signUp, updatePassword, type AuthState } from "@/app/actions/auth";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/Button";
import { PasswordField, TextField } from "./fields";
import { FormStatus } from "./FormStatus";

const idle: AuthState = { status: "idle" };
const keptEmail = (s: AuthState) => (s.status === "error" ? s.email : undefined);

export function SignInForm({ next, linkError }: { next: string; linkError?: boolean }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(signIn, idle);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate={false}>
      <input type="hidden" name="next" value={next} />
      <FormStatus state={state.status === "idle" && linkError ? { status: "error", code: "link" } : state} />
      <TextField label={t.auth.email} name="email" type="email" autoComplete="email" dir="ltr" required maxLength={254} autoFocus defaultValue={keptEmail(state)} />
      <PasswordField label={t.auth.password} name="password" autoComplete="current-password" required maxLength={72} />
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm text-ember-300 hover:text-ember-400">{t.auth.forgot}</Link>
      </div>
      <Button type="submit" disabled={pending} aria-busy={pending}>{pending ? t.auth.working : t.auth.signIn}</Button>
    </form>
  );
}

export function SignUpForm({ next }: { next: string }) {
  const { t, locale } = useI18n();
  const [state, action, pending] = useActionState(signUp, idle);
  if (state.status === "notice") return <FormStatus state={state} />;
  return (
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
      <Link href="/login" className="text-center text-sm text-ember-300 hover:text-ember-400">{t.auth.backToSignIn}</Link>
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
