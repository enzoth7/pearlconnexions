import { describe, expect, it } from "vitest";
import { workspaceReturnPath } from "./workspace-return";

describe("workspaceReturnPath", () => {
  it("keeps direct links to each workspace area after login", () => {
    for (const path of ["/qa/monthly-reports", "/qa/risks", "/maintenance", "/team", "/director/reviews", "/portal", "/workbook/actions", "/config/users", "/config/permissions", "/finance", "/hr", "/links"]) {
      expect(workspaceReturnPath(path)).toBe(path);
    }
  });

  it("rejects external and obsolete destinations", () => {
    for (const path of ["//outside.test", "/config/qa", "https://outside.test", "/director/../settings"]) {
      expect(workspaceReturnPath(path)).toBe("/");
    }
  });
});
