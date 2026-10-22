import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center p-5 text-center">
      <div>
        <p className="text-7xl font-black text-ember-500">404</p>
        <Link href="/" className={buttonClass("secondary", "mt-6")}>DIZURA</Link>
      </div>
    </main>
  );
}
