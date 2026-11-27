import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { PostgrestClient } from "@supabase/postgrest-js";

function getServerSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    .replace(/\/(rest|auth)\/v1\/?$/i, "")
    .replace(/\/+$/, "");
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}

export async function hasServerAccount() {
  const config = getServerSupabaseConfig();
  if (!config) return false;
  const store = await cookies();
  const client = createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (values) =>
        values.forEach(({ name, value, options }) =>
          store.set(name, value, options),
        ),
    },
  });
  const { data, error } = await client.auth.getUser();
  return !error && Boolean(data.user);
}

export async function getAccountPostgrest(authorization: string | null) {
  if (!authorization?.startsWith("Bearer ") || authorization.length <= 7) return null;
  const config = getServerSupabaseConfig();
  if (!config) return null;
  const headers = { apikey: config.key, Authorization: authorization };
  const response = await fetch(`${config.url}/auth/v1/user`, {
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if ([400, 401, 403].includes(response.status)) return null;
  if (!response.ok) throw new Error("Could not verify the account.");
  const user = await response.json();
  if (typeof user.id !== "string" || !user.id) return null;
  const client = new PostgrestClient(`${config.url}/rest/v1`, {
    headers,
    schema: "public",
  });
  return { client, userId: user.id };
}
