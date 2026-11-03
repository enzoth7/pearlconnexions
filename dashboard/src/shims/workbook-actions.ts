import { privateCall } from "./private-call";
export * from "./workbook-actions-impl";
export function createManager(form: FormData) { return privateCall("create-manager", form); }
export function updateManagerCredentials(form: FormData) { return privateCall("update-manager", form); }
export function deleteManager(form: FormData) { return privateCall("delete-manager", form); }
