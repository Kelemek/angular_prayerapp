import { describe, expect, it } from "vitest";
// @ts-expect-error plain ESM script without type declarations
import { findDeployGaps, parseNameStatus } from "../../scripts/supabase-deploy-gaps.mjs";

const config = (fns: string[], extra = "") =>
  `[auth]\nsite_url = "x"${extra}\n\n${fns.map((f) => `[functions.${f}]\nverify_jwt = true\n`).join("\n")}`;

const files = (fns: string[], migrations: string[] = []) => [
  ...fns.map((f) => `supabase/functions/${f}/index.ts`),
  "supabase/functions/shared/util.ts",
  "supabase/functions/shared/index.ts",
  ...migrations.map((m) => `supabase/migrations/${m}`),
];

type Gap = { kind: string; message: string };

function gaps(overrides: Record<string, unknown>): Gap[] {
  return findDeployGaps({
    changes: [],
    baseFiles: files(["send-push"], ["20261001000000_a.sql"]),
    headFiles: files(["send-push"], ["20261001000000_a.sql"]),
    baseConfig: config(["send-push"]),
    headConfig: config(["send-push"]),
    baseEnvSource: "Deno.env.get('SUPABASE_URL')",
    headEnvSource: "Deno.env.get('SUPABASE_URL')",
    ...overrides,
  });
}

const kinds = (list: Gap[]) => list.map((g) => g.kind);

describe("supabase-deploy-gaps", () => {
  it("reports nothing for a change the Integration fully handles", () => {
    expect(
      gaps({
        changes: [{ status: "A", path: "supabase/migrations/20261101000000_b.sql" }],
        headFiles: files(["send-push"], ["20261001000000_a.sql", "20261101000000_b.sql"]),
      })
    ).toEqual([]);
  });

  it("flags a new function missing from config.toml and a block without a function", () => {
    const result = gaps({
      headFiles: files(["send-push", "new-fn"]),
      headConfig: config(["send-push", "ghost"]),
    });
    expect(kinds(result)).toEqual(["function-not-in-config", "config-without-function"]);
    expect(result[0].message).toContain("[functions.new-fn]");
    expect(result[1].message).toContain("ghost");
  });

  it("flags a removed function because remote copies are not deleted", () => {
    const result = gaps({
      baseFiles: files(["send-push", "old-fn"]),
      baseConfig: config(["send-push", "old-fn"]),
    });
    expect(kinds(result)).toEqual(["function-deleted"]);
    expect(result[0].message).toContain("supabase functions delete old-fn");
  });

  it("flags new secrets but not platform-provided ones", () => {
    const result = gaps({
      headEnvSource: "Deno.env.get('SUPABASE_URL'); Deno.env.get(\"NEW_API_KEY\"); Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')",
    });
    expect(kinds(result)).toEqual(["new-secret"]);
    expect(result[0].message).toContain("NEW_API_KEY");
  });

  it("flags edited, renamed, and out-of-order migrations", () => {
    const result = gaps({
      changes: parseNameStatus(
        [
          "M\tsupabase/migrations/20261001000000_a.sql",
          "R100\tsupabase/migrations/20260901000000_x.sql\tsupabase/migrations/20260902000000_x.sql",
          "A\tsupabase/migrations/20260915000000_late.sql",
        ].join("\n")
      ),
    });
    expect(kinds(result)).toEqual(["migration-edited", "migration-edited", "migration-out-of-order"]);
    expect(result[1].message).toContain("renamed");
  });

  it("flags config.toml settings changes but ignores function block and comment edits", () => {
    expect(
      kinds(gaps({ headConfig: `# note\n${config(["send-push"])}`.replace("verify_jwt = true", "verify_jwt = false") }))
    ).toEqual([]);
    expect(kinds(gaps({ headConfig: config(["send-push"], "\njwt_expiry = 7200") }))).toEqual([
      "config-settings-changed",
    ]);
  });
});
