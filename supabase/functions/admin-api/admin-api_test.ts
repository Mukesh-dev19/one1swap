// Deno tests for the admin-api edge function authorization & action routing.
// Run via: lovable supabase--test_edge_functions
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const FUNCTION_URL = Deno.env.get("ADMIN_API_URL") ||
  `${Deno.env.get("SUPABASE_URL")}/functions/v1/admin-api`;
const ANON = Deno.env.get("SUPABASE_ANON_KEY") || "";

async function call(body: Record<string, unknown>) {
  return await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ANON}`,
    },
    body: JSON.stringify(body),
  });
}

Deno.test("rejects wrong passcode", async () => {
  const res = await call({ action: "login", username: "admin", passcode: "wrong" });
  assertEquals(res.status, 401);
  await res.body?.cancel();
});

Deno.test("accepts valid credentials (admin / 2008)", async () => {
  const res = await call({ action: "login", username: "admin", passcode: "2008" });
  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(json.success, true);
});

Deno.test("rejects unknown action even with valid credentials", async () => {
  const res = await call({ action: "no_such_action", username: "admin", passcode: "2008" });
  assertEquals(res.status, 400);
  await res.body?.cancel();
});

Deno.test("returns overview metrics with valid credentials", async () => {
  const res = await call({ action: "getOverview", username: "admin", passcode: "2008" });
  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(typeof json.totalUsers, "number");
});
