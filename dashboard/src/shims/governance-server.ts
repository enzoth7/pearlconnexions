import { loadRegister as original } from "../../legacy/src/lib/governance-server";
import { cached } from "./cache";
import type { RecordKind } from "@/lib/governance";
export function loadRegister(kind: RecordKind) { return cached(`qa:register:${kind}`, () => original(kind)); }
