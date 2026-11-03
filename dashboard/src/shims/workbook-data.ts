import * as base from "../../legacy/src/workbook/lib/data";
import { cached } from "./cache";
import type { ActionRecord } from "@/workbook/lib/utils";
export * from "../../legacy/src/workbook/lib/data";
export function requireAuth(options?: { allowWithoutWorkbook?: boolean }) { return cached(`workbook:auth:${Boolean(options?.allowWithoutWorkbook)}`, () => base.requireAuth(options)); }
export function getActions(managerIdFilter?: string): Promise<ActionRecord[]> {
  return cached("workbook:actions", () => base.getActions()).then(actions => managerIdFilter ? actions.filter(action => action.participants.some(p => p.manager.id === managerIdFilter)) : actions);
}
export function getActionById(id: string) { return getActions().then(actions => actions.find(action => action.id === id) ?? null); }
export function getManagers() { return cached("workbook:managers", () => base.getManagers()); }
export function getWorkstreams() { return cached("workbook:workstreams", () => base.getWorkstreams()); }
export function getManagersWithProfiles() { return cached("workbook:directory", () => base.getManagersWithProfiles()); }
