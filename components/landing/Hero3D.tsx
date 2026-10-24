"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";

// three.js is client-only and heavy — load lazily, never during SSR.
const Scene = dynamic(() => import("./Hero3DScene"), { ssr: false, loading: () => <Fallback /> });

function Fallback() {
  return <div className="size-full rounded-full bg-[radial-gradient(circle,var(--color-mint-500)_0%,transparent_62%)] opacity-25 blur-2xl" />;
}

const query = "(prefers-reduced-motion: reduce)";
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(query);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

export function Hero3D({ className = "max-w-[34rem]" }: { className?: string }) {
  const reduced = useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => true);
  return <div className={`relative aspect-square w-full ${className}`}>{reduced ? <Fallback /> : <Scene />}</div>;
}
