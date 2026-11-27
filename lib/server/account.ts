import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function hasServerAccount() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  const store = await cookies();
  const client = createServerClient(
    url
      .trim()
      .replace(/\/(rest|auth)\/v1\/?$/i, "")
      .replace(/\/+$/, ""),
    key,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (values) =>
          values.forEach(({ name, value, options }) =>
            store.set(name, value, options),
          ),
      },
    },
  );
  const { data, error } = await client.auth.getUser();
  return !error && Boolean(data.user);
}
