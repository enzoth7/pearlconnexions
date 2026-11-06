import React from "react";
import { createRoot } from "react-dom/client";
import { Analytics, type BeforeSendEvent } from "@vercel/analytics/react";
import App from "./App";
import { preserveSubmittedForms } from "./shims/preserve-forms";
import "./globals.css";
import "./workspace.css";
import "./workbook.css";

preserveSubmittedForms(document);

function redactAnalyticsEvent(event: BeforeSendEvent): BeforeSendEvent {
  const url = new URL(event.url, window.location.origin);
  url.pathname = url.pathname.replace(
    /^(\/(?:qa\/monthly-reports|director\/reviews|portal\/submissions|workbook\/actions)\/)[^/]+$/,
    "$1[id]",
  );
  url.search = "";
  url.hash = "";
  return { ...event, url: url.toString() };
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <Analytics beforeSend={redactAnalyticsEvent} />
  </React.StrictMode>,
);
