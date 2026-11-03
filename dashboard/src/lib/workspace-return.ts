export function workspaceReturnPath(value: unknown) {
  if (typeof value !== "string" || !/^\/(director|portal|workbook|config|finance|hr|links)(?:[/?]|$)/.test(value)) return "/";
  const base = "https://workspace.invalid";
  const url = new URL(value, base);
  const allowedArea = /^\/(director|portal|workbook|finance|hr)(?:\/|$)/.test(url.pathname) || url.pathname === "/links";
  const allowedConfig = url.pathname === "/config" || /^\/config\/(?:users|permissions)(?:\/|$)/.test(url.pathname);
  if (url.origin !== base || (!allowedArea && !allowedConfig)) return "/";
  return url.pathname + url.search;
}
