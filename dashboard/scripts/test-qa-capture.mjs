// Runs only against a disposable local PostgreSQL cluster. Never reads application credentials.
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = process.env.QA_TEST_PORT || "55439";
const user = process.env.QA_TEST_USER || "qa_test";
const database = `qa_capture_${Date.now()}`;
const psql = process.env.QA_TEST_PSQL || "C:/Program Files/PostgreSQL/18/bin/psql.exe";
function sql(source, db = database) {
  const result = spawnSync(psql, ["-X", "-h", "127.0.0.1", "-p", port, "-U", user, "-d", db, "-v", "ON_ERROR_STOP=1", "-q"], { input: source, encoding: "utf8", env: { ...process.env, PGCLIENTENCODING: "UTF8" } });
  if (result.status !== 0) throw new Error(`${result.stderr || result.error?.message || "PostgreSQL failed"}\n${result.stdout?.slice(-2500) || ""}`);
  return result.stdout;
}
sql(`CREATE DATABASE ${database};`, "postgres");
sql(`DO $$ BEGIN CREATE ROLE anon; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE service_role BYPASSRLS; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE SCHEMA auth; CREATE SCHEMA extensions; CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb DEFAULT '{}',encrypted_password text,updated_at timestamptz,last_sign_in_at timestamptz);
CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid REFERENCES auth.users(id),created_at timestamptz DEFAULT now());
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_user::text $$;
GRANT USAGE ON SCHEMA auth TO authenticated,anon;GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO authenticated,anon;
CREATE SCHEMA cron; CREATE TABLE cron.job(jobid bigint,jobname text);
CREATE FUNCTION cron.schedule(text,text,text) RETURNS bigint LANGUAGE sql AS $$SELECT 1::bigint$$;`);
for (const filename of readdirSync(path.join(root, "supabase/migrations")).filter(f => f.endsWith(".sql")).sort()) {
  const source = readFileSync(path.join(root, "supabase/migrations", filename), "utf8").replace("create extension if not exists pg_cron with schema pg_catalog;", "-- The local test cluster stubs the scheduler; scheduling is outside this test.");
  try { sql(source); } catch (e) { throw new Error(`${filename}: ${e.message}`); }
}
console.log(`All migrations installed in disposable localhost database ${database}.`);
const { caseDataSchema, monthlyMeasures } = await import("../legacy/src/lib/qa-capture.ts");
const home = "00000000-0000-4000-8000-000000000101";
const person = "00000000-0000-4000-8000-000000000201";
const risk = { id: "00000000-0000-4000-8000-000000000301", version: 0, kind: "risks", home_id: home, occurred_on: "2026-11-03", title: "Individual wellbeing risk", status: "Open", schema_version: 2, is_draft: false,
 data: caseDataSchema.parse({ category: "Health / wellbeing", description: "A fictional wellbeing concern", person_ids: [person], controls: "Daily support check", evaluator: "Manager A", initial_level: "High", priority: "Moderate", owner: "Manager A", due_on: "2026-11-10" }), actions: [], reviews: [] };
const incident = { ...risk, id: "00000000-0000-4000-8000-000000000302", kind: "incidents", title: "Fictional incident", status: "Follow up", data: caseDataSchema.parse({ category: "Fall / injury", description: "A fictional incident for testing", priority: "Moderate", person_ids: [person], involvement: "identified", occurred_local: "2026-11-03T10:00", reporter: "Manager A", action_taken: "Support provided", owner: "Manager A", due_on: "2026-11-05", notification: "done", notified_local: "2026-11-04T10:00", notified_to: "Director", linked_risk_ids: [risk.id] }) };
const maintenance = { ...risk, id: "00000000-0000-4000-8000-000000000303", kind: "maintenance", title: "Fictional window repair", status: "Reported", data: caseDataSchema.parse({ category: "Doors / windows", description: "Window needs repair", priority: "High", location: "Kitchen" }) };
const body = { answers: {}, occupied_beds: "2", records_confirmed: true, measurements: Object.fromEntries(monthlyMeasures.map(m => [m.code, { expected: "5", completed: "4", na: false, note: "" }])) };
sql(`CREATE TABLE public.qa_test_payload(name text PRIMARY KEY,body jsonb);GRANT SELECT ON public.qa_test_payload TO authenticated;`);
for (const [name, value] of Object.entries({ risk, incident, maintenance, report: body })) sql(`INSERT INTO public.qa_test_payload VALUES ('${name}', '${JSON.stringify(value).replaceAll("'", "''")}'::jsonb);`);
console.log(sql(readFileSync(path.join(root, "supabase/tests/individual_capture.sql"), "utf8")));
console.log("Individual capture database checks passed.");
