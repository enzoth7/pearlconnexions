import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.trimStart().startsWith("#") && line.includes("="))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
    }),
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const tableNames = [
  "qa_periods",
  "qa_submissions",
  "qa_metric_values",
  "qa_incident_details",
  "qa_imports",
  "qa_import_rows",
  "qa_period_runs",
];
const tables = {};

for (const tableName of tableNames) {
  const { data, error } = await supabase.from(tableName).select("*");
  if (error) throw error;
  tables[tableName] = data;
}

const outputDirectory = join(process.cwd(), "tmp");
const timestamp = new Date().toISOString().replaceAll(":", "-").replace(".", "-");
const outputPath = join(outputDirectory, `qa-backup-before-september-test-${timestamp}.json`);
mkdirSync(outputDirectory, { recursive: true });
writeFileSync(outputPath, JSON.stringify({ created_at: new Date().toISOString(), tables }, null, 2));

console.log(outputPath);
for (const tableName of tableNames) console.log(`${tableName}: ${tables[tableName].length}`);
