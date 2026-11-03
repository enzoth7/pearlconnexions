import { useSyncExternalStore } from "react";
const notify = () => window.dispatchEvent(new Event("pearl:navigate"));
export function navigate(href: string, replace = false) {
  if (replace) history.replaceState(null, "", href); else history.pushState(null, "", href);
  notify();
  window.scrollTo(0, 0);
}
function subscribe(callback: () => void) {
  window.addEventListener("pearl:navigate", callback);
  window.addEventListener("popstate", callback);
  return () => { window.removeEventListener("pearl:navigate", callback); window.removeEventListener("popstate", callback); };
}
export function usePathname() { return useSyncExternalStore(subscribe, () => location.pathname, () => "/"); }
export function useSearchParams() { return new URLSearchParams(useSyncExternalStore(subscribe, () => location.search, () => "")); }
export function useRouter() { return { push: (href: string, _options?: { scroll?: boolean }) => navigate(href), replace: (href: string, _options?: { scroll?: boolean }) => navigate(href, true), refresh: () => window.dispatchEvent(new Event("pearl:refresh")), prefetch: async (_href: string) => {} }; }
export class RouteRedirect extends Error { constructor(public href: string) { super(`Redirect to ${href}`); } }
export function redirect(href: string): never { throw new RouteRedirect(href); }
export function notFound(): never { throw new Error("Page not found"); }
