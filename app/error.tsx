"use client";

import { Button } from "@/components/ui/Button";
import { useI18n } from "@/components/i18n/I18nProvider";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  return (
    <main className="grid min-h-[60dvh] place-items-center p-5 text-center">
      <div>
        <p className="text-lg font-semibold">{t.common.error}</p>
        <Button variant="secondary" className="mt-4" onClick={reset}>↻</Button>
      </div>
    </main>
  );
}
