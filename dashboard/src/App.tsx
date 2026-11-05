import { useEffect, useRef, useState, type ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { firstWorkspacePath } from "@/lib/workspace-sections";
import { getAccessContext, clearAccessContext, type AccessContext } from "./shims/auth";
import { supabase } from "./shims/supabase";
import { navigate, RouteRedirect, usePathname, useSearchParams } from "./shims/navigation";
import { clearDataCache } from "./shims/cache";
import { canLoadRoute, matchRoute, preloadPaths } from "./routes";

type Entry = { node?: ReactNode; error?: string; promise?: Promise<void>; updatedAt?: number };
const pages = new Map<string, Entry>();
const listeners = new Set<() => void>();
let authVersion = 0;
function notify() { listeners.forEach(listener => listener()); }
function clearPages() { pages.clear(); notify(); }

function loadPage(path: string, background = false): Promise<void> {
  const url = new URL(path, location.origin);
  const match = matchRoute(url.pathname);
  if (!match) return Promise.resolve();
  const existing = pages.get(path);
  if (existing?.promise) return existing.promise;
  if (existing?.node && !background) return Promise.resolve();
  const entry = existing ?? {};
  const task = match.route.load(url.searchParams, match.id).then(node => {
    entry.node = node;
    entry.error = undefined;
    entry.updatedAt = Date.now();
  }).catch(error => {
    if (error instanceof RouteRedirect) { navigate(error.href, true); return; }
    entry.error = error instanceof Error ? error.message : "This page could not be loaded.";
  }).finally(() => { entry.promise = undefined; notify(); });
  entry.promise = task;
  pages.set(path, entry);
  notify();
  return task;
}

function usePages() {
  const [, redraw] = useState(0);
  useEffect(() => { const listener = () => redraw(n => n + 1); listeners.add(listener); return () => { listeners.delete(listener); }; }, []);
}

function Loading() { return <div className="space-y-5 py-4" aria-label="Loading section"><div className="h-10 w-64 animate-pulse rounded-xl bg-slate-200"/><div className="h-40 max-w-4xl animate-pulse rounded-2xl bg-slate-100"/></div>; }

export default function App() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const path = pathname + (search ? `?${search}` : "");
  const [context, setContext] = useState<AccessContext | null | undefined>(undefined);
  const currentUserId = useRef<string | null>(null);
  usePages();

  useEffect(() => {
    let active = true;
    const initialVersion = authVersion;
    getAccessContext().then(value => {
      if (!active || initialVersion !== authVersion) return;
      currentUserId.current = value?.userId ?? null;
      setContext(value);
    }).catch(() => { if (active && initialVersion === authVersion) setContext(null); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        authVersion += 1;
        currentUserId.current = null;
        clearAccessContext(); clearDataCache(); clearPages();
        if (active) setContext(null);
        return;
      }
      if (event !== "SIGNED_IN" || session?.user.id === currentUserId.current) return;
      authVersion += 1;
      const version = authVersion;
      currentUserId.current = session?.user.id ?? null;
      clearAccessContext(); clearDataCache(); clearPages();
      getAccessContext().then(value => {
        if (!active || version !== authVersion) return;
        currentUserId.current = value?.userId ?? null;
        setContext(value);
      }).catch(() => { if (active && version === authVersion) setContext(null); });
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (pathname === "/auth/callback") {
      const params = new URLSearchParams(location.search);
      const code = params.get("code");
      const requestedNext = params.get("next") || "/";
      const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/";
      if (code) void supabase.auth.exchangeCodeForSession(code).then(({error}) => navigate(error ? `/login?error=${encodeURIComponent(error.message)}` : next, true));
      return;
    }
    if (pathname === "/auth/confirm") {
      const params = new URLSearchParams(location.search);
      const token_hash = params.get("token_hash");
      const type = params.get("type") as "invite" | "recovery" | "email" | null;
      const requestedNext = params.get("next") || "/";
      const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/";
      if (token_hash && type) void supabase.auth.verifyOtp({ token_hash, type }).then(({error}) => navigate(error ? `/login?error=${encodeURIComponent(error.message)}` : next, true));
      return;
    }
    if (context === undefined) return;
    if (pathname === "/") { navigate(context ? firstWorkspacePath(context) : "/login", true); return; }
    if (pathname === "/director") { navigate("/qa", true); return; }
    if (pathname === "/portal") { navigate("/qa/monthly-reports", true); return; }
    if (pathname === "/director/reviews") { navigate("/qa/reviews", true); return; }
    if (pathname === "/director/homes") { navigate("/qa/homes", true); return; }
    if (pathname === "/director/finance") { navigate("/finance", true); return; }
    if (pathname === "/maintenance/dashboard") { navigate("/maintenance/overview", true); return; }
    if (pathname === "/director/hr") { navigate("/hr", true); return; }
    if (pathname === "/director/users") { navigate("/config/users", true); return; }
    if (pathname === "/workbook/team") { navigate(context?.canManageEmployees || context?.role === "director" ? "/config/users" : "/workbook", true); return; }
    if (pathname === "/config") { navigate(context && canLoadRoute(context, matchRoute("/config/users")!.route) ? "/config/users" : context && canLoadRoute(context, matchRoute("/config/houses")!.route) ? "/config/houses" : "/config/activity-log", true); return; }
    const match = matchRoute(pathname);
    if (!match) return;
    if (!match.route.ownShell && !context) { navigate("/login", true); return; }
    if (context && !canLoadRoute(context, match.route)) { navigate(firstWorkspacePath(context), true); return; }
    void loadPage(path);
  }, [context, path, pathname]);

  useEffect(() => {
    if (!context) return;
    const timer = window.setTimeout(() => {
      const queue = preloadPaths(context).filter(candidate => candidate !== pathname);
      const worker = async () => {
        while (queue.length) {
          const candidate = queue.shift();
          if (candidate) await loadPage(candidate);
        }
      };
      void Promise.all([worker(), worker(), worker()]);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [context, pathname]);

  useEffect(() => {
    const refresh = () => {
      const version = authVersion;
      clearAccessContext(); clearDataCache();
      void getAccessContext().then(next => {
        if (version !== authVersion) return;
        currentUserId.current = next?.userId ?? null;
        setContext(next);
        const opened = [...pages.keys()];
        if (!opened.includes(path)) opened.push(path);
        opened.forEach(openedPath => {
          const route = matchRoute(new URL(openedPath, location.origin).pathname)?.route;
          if (route && (route.ownShell || canLoadRoute(next, route))) void loadPage(openedPath, true);
          else pages.delete(openedPath);
        });
        notify();
      }).catch(() => {
        if (version !== authVersion) return;
        // Keep already loaded views when a background refresh cannot reach Supabase.
      });
    };
    window.addEventListener("pearl:refresh", refresh);
    return () => { window.removeEventListener("pearl:refresh", refresh); };
  }, [context, path]);

  useEffect(() => {
    const onSignOut = (event: SubmitEvent) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || !form.action.endsWith("/auth/sign-out")) return;
      event.preventDefault();
      void supabase.auth.signOut().then(({ error }) => { if (!error) navigate("/login", true); });
    };
    document.addEventListener("submit", onSignOut);
    return () => document.removeEventListener("submit", onSignOut);
  }, []);

  const match = matchRoute(pathname);
  const entry = pages.get(path);
  const content = entry?.node ?? (entry?.error ? <div className="rounded-2xl border border-rose-200 bg-white p-6 text-rose-900" role="alert">{entry.error}<button className="ml-4 underline" onClick={() => { pages.delete(path); void loadPage(path); }}>Try again</button></div> : <Loading />);
  if (context === undefined || pathname === "/auth/callback" || pathname === "/auth/confirm") return <Loading />;
  if (!match) return <div className="p-8">Page not found.</div>;
  if (match.route.ownShell || !context) return content;
  return <AppShell context={context}><div key={path} className={entry?.node ? "workspace-view-enter" : undefined}>{match.route.workbook ? <div className="workbook-content">{content}</div> : content}</div></AppShell>;
}
