import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { preserveSubmittedForms } from "./shims/preserve-forms";
import "./globals.css";
import "./workspace.css";
import "./workbook.css";

preserveSubmittedForms(document);
createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
