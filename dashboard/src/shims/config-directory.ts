import * as base from "../../legacy/src/lib/config-directory";
import { cached } from "./cache";

export type { ConfigPerson } from "../../legacy/src/lib/config-directory";
export function getConfigDirectory() {
  return cached("settings:directory", () => base.getConfigDirectory());
}
