import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { SignInForm, SignUpForm } from "@/components/auth/AuthForms";
import { cn } from "@/components/ui/cn";
import { safeNext } from "@/lib/auth/redirect";
import { WELCOME_CREDITS } from "@/lib/credits/pricing";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

type Props = { searchParams: Promise<{ mode?: string; next?: string; error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { t, locale } = await getI18n();
  const sp = await searchParams;
  const mode = sp.mode === "signup" ? "signup" : "signin";
  const next = safeNext(sp.next);
  const tab = (m: "signin" | "signup") => `/login?${new URLSearchParams({ ...(m === "signup" && { mode: m }), ...(sp.next && { next }) })}`;

  return (
    <AuthCard
      title={mode === "signin" ? t.auth.welcomeBack : t.auth.createTitle}
      subtitle={t.auth.subtitle}
      footer={
        <>
          {mode === "signin" ? t.auth.noAccount : t.auth.haveAccount}{" "}
          <Link href={tab(mode === "signin" ? "signup" : "signin")} className="font-semibold text-mint-300 hover:text-mint-400">
            {mode === "signin" ? t.auth.signUp : t.auth.signIn}
          </Link>
        </>
      }
    >
      <nav aria-label={t.auth.signIn} className="mb-6 grid grid-cols-2 rounded-xl bg-ink-800 p-1 text-sm">
        {(["signin", "signup"] as const).map((m) => (
          <Link
            key={m}
            href={tab(m)}
            aria-current={mode === m ? "page" : undefined}
            className={cn(
              "rounded-lg py-2 text-center transition",
              mode === m ? "bg-ink-900 font-semibold text-ink-100 shadow ring-1 ring-ink-700" : "text-ink-300 hover:text-ink-100",
            )}
          >
            {m === "signin" ? t.auth.signIn : t.auth.signUp}
          </Link>
        ))}
      </nav>
      {mode === "signup" && (
        <p className="mb-5 flex items-center gap-2 rounded-xl border border-mint-500/30 bg-mint-500/10 px-3 py-2.5 text-sm text-mint-300">
          <span aria-hidden>◆</span>
          {t.auth.welcomeBonus.replace("{n}", WELCOME_CREDITS.toLocaleString(locale))}
        </p>
      )}
      {mode === "signin" ? <SignInForm next={next} linkError={sp.error === "link"} /> : <SignUpForm next={next} />}
    </AuthCard>
  );
}
