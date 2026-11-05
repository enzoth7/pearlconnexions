"use client";

import { useSyncExternalStore } from "react";

const query = "(prefers-reduced-motion: reduce)";

function subscribe(callback: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const media = window.matchMedia(query);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function snapshot() {
  return typeof window !== "undefined" && Boolean(window.matchMedia?.(query).matches);
}

export function useReducedMotion() {
  return useSyncExternalStore(subscribe, snapshot, () => true);
}
